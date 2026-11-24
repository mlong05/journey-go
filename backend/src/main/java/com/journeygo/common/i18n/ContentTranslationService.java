package com.journeygo.common.i18n;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import com.journeygo.modules.aiguide.service.GeminiChatClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Dịch vụ dịch tự động + cache bền vững trong DB ({@code content_translations})
 * dùng chung cho Vùng miền, Chủ đề, Danh sách tour, Câu chuyện văn hóa, Quiz và Nhiệm vụ thực địa.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContentTranslationService {

    private static final Set<String> TARGET_LOCALES = Set.of("en", "ja");

    private final ContentTranslationRepository repository;
    private final GeminiChatClient geminiChatClient;
    private final GeminiAiProperties geminiProperties;
    private final ObjectMapper objectMapper;

    private final ConcurrentHashMap<String, Object> inFlightLocks = new ConcurrentHashMap<>();

    /** Trả về mã ngôn ngữ mục tiêu ("en" / "ja") nếu cần dịch, ngược lại trả null. */
    public String resolveTargetLang(Locale locale) {
        if (locale == null || locale.getLanguage() == null) return null;
        String lang = locale.getLanguage().toLowerCase(Locale.ROOT);
        return TARGET_LOCALES.contains(lang) ? lang : null;
    }

    /** Kiểm tra Gemini API key thật đã được cấu hình chưa (loại trừ rỗng / mock / test / placeholder). */
    public boolean isAiTranslationReady() {
        String apiKey = geminiProperties.getApiKey();
        if (!StringUtils.hasText(apiKey)) return false;
        String lower = apiKey.trim().toLowerCase(Locale.ROOT);
        return !lower.equals("mock")
                && !lower.equals("test")
                && !lower.contains("your-gemini")
                && !lower.contains("placeholder");
    }

    /**
     * Dịch một đối tượng JSON theo (entityType, entityId, lang), có cache SHA-256 trong DB.
     * Nếu không dịch được (chưa có key / lỗi mạng / JSON hỏng) ⇒ trả về null để caller giữ nguyên bản gốc.
     */
    public JsonNode translateObject(String entityType, Long entityId, String lang, ObjectNode sourcePayload) {
        if (entityId == null || !TARGET_LOCALES.contains(lang) || sourcePayload == null || sourcePayload.isEmpty()) {
            return null;
        }
        try {
            String sourceJson = objectMapper.writeValueAsString(sourcePayload);
            String sourceHash = sha256Hex(sourceJson);

            Optional<ContentTranslation> cached = repository
                    .findByEntityTypeAndEntityIdAndLocale(entityType, entityId, lang);
            if (cached.isPresent() && sourceHash.equals(cached.get().getSourceHash())) {
                return objectMapper.readTree(cached.get().getTranslatedJson());
            }

            if (!isAiTranslationReady()) {
                return null;
            }

            Object lock = inFlightLocks.computeIfAbsent(entityType + ":" + entityId + ":" + lang, k -> new Object());
            synchronized (lock) {
                Optional<ContentTranslation> rechecked = repository
                        .findByEntityTypeAndEntityIdAndLocale(entityType, entityId, lang);
                if (rechecked.isPresent() && sourceHash.equals(rechecked.get().getSourceHash())) {
                    return objectMapper.readTree(rechecked.get().getTranslatedJson());
                }

                JsonNode translated = callGeminiForJson(sourceJson, lang, 4096);
                if (translated == null || !translated.isObject()) {
                    return null;
                }

                ContentTranslation entity = rechecked.orElseGet(() -> ContentTranslation.builder()
                        .entityType(entityType)
                        .entityId(entityId)
                        .locale(lang)
                        .build());
                entity.setSourceHash(sourceHash);
                entity.setTranslatedJson(objectMapper.writeValueAsString(translated));
                repository.save(entity);
                return translated;
            }
        } catch (Exception e) {
            log.warn("Không thể dịch {}#{} sang '{}': {}", entityType, entityId, lang, e.getMessage());
            return null;
        }
    }

    /**
     * Dịch hàng loạt danh sách nhãn ngắn (VD: Vùng miền, Chủ đề, Tiêu đề tour trên danh sách)
     * bằng 1 lượt gọi Gemini cho tất cả mục chưa có trong cache, sau đó lưu từng mục vào DB.
     *
     * @param entityType loại thực thể (REGION, THEME, TOUR_TITLE)
     * @param idToText   map entityId -> chuỗi tiếng Việt gốc
     * @param lang       "en" hoặc "ja"
     * @return map entityId -> chuỗi đã dịch (chỉ chứa những mục dịch thành công)
     */
    public Map<Long, String> translateBatchLabels(String entityType, Map<Long, String> idToText, String lang) {
        if (idToText == null || idToText.isEmpty() || !TARGET_LOCALES.contains(lang)) {
            return Collections.emptyMap();
        }

        Map<Long, String> result = new HashMap<>();
        Map<Long, String> hashes = new HashMap<>();
        Map<Long, String> missing = new LinkedHashMap<>();

        List<ContentTranslation> existing = repository
                .findByEntityTypeAndLocaleAndEntityIdIn(entityType, lang, idToText.keySet());
        Map<Long, ContentTranslation> existingById = new HashMap<>();
        for (ContentTranslation ct : existing) {
            existingById.put(ct.getEntityId(), ct);
        }

        for (Map.Entry<Long, String> entry : idToText.entrySet()) {
            Long id = entry.getKey();
            String text = entry.getValue();
            if (id == null || !StringUtils.hasText(text)) continue;

            String hash = sha256Hex(text);
            hashes.put(id, hash);
            ContentTranslation cached = existingById.get(id);
            if (cached != null && hash.equals(cached.getSourceHash())) {
                try {
                    JsonNode node = objectMapper.readTree(cached.getTranslatedJson());
                    String val = node.path("text").asText("");
                    if (StringUtils.hasText(val)) {
                        result.put(id, val);
                        continue;
                    }
                } catch (Exception ignored) {
                    // cache hỏng ⇒ dịch lại
                }
            }
            missing.put(id, text);
        }

        if (missing.isEmpty() || !isAiTranslationReady()) {
            return result;
        }

        Object lock = inFlightLocks.computeIfAbsent("BATCH:" + entityType + ":" + lang, k -> new Object());
        synchronized (lock) {
            try {
                // Gửi tối đa 40 mục/lượt để tránh vượt giới hạn token đầu ra
                List<Map.Entry<Long, String>> entries = new ArrayList<>(missing.entrySet());
                for (int start = 0; start < entries.size(); start += 40) {
                    List<Map.Entry<Long, String>> chunk = entries.subList(start, Math.min(start + 40, entries.size()));
                    ObjectNode payload = objectMapper.createObjectNode();
                    for (Map.Entry<Long, String> e : chunk) {
                        payload.put(String.valueOf(e.getKey()), e.getValue());
                    }

                    JsonNode translated = callGeminiForJson(objectMapper.writeValueAsString(payload), lang, 2048);
                    if (translated == null || !translated.isObject()) continue;

                    List<ContentTranslation> toSave = new ArrayList<>();
                    for (Map.Entry<Long, String> e : chunk) {
                        Long id = e.getKey();
                        String translatedText = translated.path(String.valueOf(id)).asText("");
                        if (!StringUtils.hasText(translatedText)) continue;

                        result.put(id, translatedText);
                        ObjectNode stored = objectMapper.createObjectNode();
                        stored.put("text", translatedText);

                        ContentTranslation row = existingById.getOrDefault(id, ContentTranslation.builder()
                                .entityType(entityType)
                                .entityId(id)
                                .locale(lang)
                                .build());
                        row.setSourceHash(hashes.get(id));
                        row.setTranslatedJson(objectMapper.writeValueAsString(stored));
                        toSave.add(row);
                    }
                    if (!toSave.isEmpty()) {
                        repository.saveAll(toSave);
                    }
                }
            } catch (Exception e) {
                log.warn("Không thể dịch hàng loạt {} sang '{}': {}", entityType, lang, e.getMessage());
            }
        }
        return result;
    }

    private JsonNode callGeminiForJson(String sourceJson, String lang, int maxTokens) {
        String targetLanguageName = "ja".equals(lang)
                ? "natural, polite Japanese (日本語)"
                : "natural, concise English";

        String systemPrompt = """
                You are a professional Vietnamese-to-target-language travel translator for JourneyGo (Vietnam cultural & heritage tours).
                Translate ONLY the Vietnamese string values in the input JSON into %s.
                Rules:
                - Preserve the EXACT JSON structure, keys, array lengths, order, and all numeric/id fields untouched.
                - Keep times (e.g., 08:00), currency amounts, phone numbers, emails, and URLs unchanged.
                - For Vietnamese places and heritage names, use standard recognizable names in the target language (e.g., Hanoi / ハノイ, Hoi An / ホイアン, Hue / フエ).
                - Return ONLY raw valid JSON with no markdown fences, no commentary, and no extra keys.
                """.formatted(targetLanguageName);

        String raw = geminiChatClient.generateReply(systemPrompt, List.of(), sourceJson, 0.2, maxTokens);
        if (!StringUtils.hasText(raw)) return null;

        String cleaned = stripCodeFences(raw.trim());
        try {
            return objectMapper.readTree(cleaned);
        } catch (Exception e) {
            log.warn("Gemini trả về JSON dịch không hợp lệ cho lang='{}': {}", lang, e.getMessage());
            return null;
        }
    }

    private String stripCodeFences(String text) {
        if (text.startsWith("```")) {
            int firstNewline = text.indexOf('\n');
            if (firstNewline > 0) text = text.substring(firstNewline + 1);
            if (text.endsWith("```")) text = text.substring(0, text.length() - 3);
        }
        return text.trim();
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
