package com.journeygo.modules.tour.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.i18n.ContentTranslationService;
import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import com.journeygo.modules.aiguide.service.GeminiChatClient;
import com.journeygo.modules.destination.dto.RegionResponse;
import com.journeygo.modules.destination.dto.ThemeResponse;
import com.journeygo.modules.tour.dto.TourPriceResponse;
import com.journeygo.modules.tour.dto.TourPublicDetailResponse;
import com.journeygo.modules.tour.dto.TourResponse;
import com.journeygo.modules.tour.dto.wizard.TourDetailResponse;
import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.TourTranslation;
import com.journeygo.modules.tour.repository.TourTranslationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Tự động dịch nội dung công khai của tour sang tiếng Anh (en) / tiếng Nhật (ja)
 * theo header {@code Accept-Language}, kèm cache bền vững trong bảng {@code tour_translations}.
 *
 * <ul>
 *   <li>Nhãn loại khách ({@code ADULT/CHILD/TODDLER/INFANT}) và khoảng tuổi được dịch xác định ngay (không tốn AI).</li>
 *   <li>Nội dung do đối tác nhập (tên, mô tả, lịch trình, điểm dừng, chính sách) được dịch 1 lần qua Gemini rồi lưu DB.</li>
 *   <li>Nếu Gemini chưa cấu hình, đang ở chế độ mock/test hoặc gặp lỗi mạng ⇒ trả về bản gốc + nhãn loại khách đã dịch.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TourTranslationService {

    private static final Set<String> TARGET_LOCALES = Set.of("en", "ja");
    private static final Pattern NUMBER_PATTERN = Pattern.compile("\\d+");

    private final TourTranslationRepository translationRepository;
    private final ContentTranslationService contentTranslationService;
    private final GeminiChatClient geminiChatClient;
    private final GeminiAiProperties geminiProperties;
    private final ObjectMapper objectMapper;

    /** Khóa theo (tourId:locale) để tránh 2 request đồng thời gọi Gemini dịch trùng 1 tour. */
    private final ConcurrentHashMap<String, Object> inFlightLocks = new ConcurrentHashMap<>();

    /** Dịch danh sách tour công khai trên Trang chủ (tên tour, vùng miền, chủ đề, nhãn giá). */
    public PageResponse<TourResponse> localizePublishedTours(PageResponse<TourResponse> page, Locale locale) {
        if (page == null || page.getContent() == null || page.getContent().isEmpty()) return page;
        String lang = contentTranslationService.resolveTargetLang(locale);
        if (lang == null) return page;

        Map<Long, String> tourTitles = new LinkedHashMap<>();
        Map<Long, String> regionNames = new LinkedHashMap<>();
        Map<Long, String> themeNames = new LinkedHashMap<>();
        for (TourResponse t : page.getContent()) {
            if (t.tourId() != null && StringUtils.hasText(t.title())) tourTitles.put(t.tourId(), t.title());
            if (t.regionId() != null && StringUtils.hasText(t.regionName())) regionNames.put(t.regionId(), t.regionName());
            if (t.themeId() != null && StringUtils.hasText(t.themeName())) themeNames.put(t.themeId(), t.themeName());
        }

        // Ưu tiên lấy title đã dịch trong bảng tour_translations (nếu tour đã từng dịch chi tiết)
        Map<Long, String> translatedTitles = new HashMap<>();
        if (!tourTitles.isEmpty()) {
            for (TourTranslation tt : translationRepository.findByLocaleAndTourIdIn(lang, tourTitles.keySet())) {
                try {
                    String title = objectMapper.readTree(tt.getTranslatedJson()).path("title").asText("");
                    if (StringUtils.hasText(title)) translatedTitles.put(tt.getTourId(), title);
                } catch (Exception ignored) {
                    // bỏ qua nếu cache hỏng
                }
            }
            Map<Long, String> missingTitles = new LinkedHashMap<>();
            tourTitles.forEach((id, title) -> {
                if (!translatedTitles.containsKey(id)) missingTitles.put(id, title);
            });
            if (!missingTitles.isEmpty()) {
                translatedTitles.putAll(contentTranslationService.translateBatchLabels("TOUR_TITLE", missingTitles, lang));
            }
        }

        Map<Long, String> translatedRegions = contentTranslationService.translateBatchLabels("REGION", regionNames, lang);
        Map<Long, String> translatedThemes = contentTranslationService.translateBatchLabels("THEME", themeNames, lang);

        List<TourResponse> localizedContent = page.getContent().stream().map(t -> {
            List<TourPriceResponse> localizedPrices = t.prices() == null ? null : t.prices().stream()
                    .map(p -> new TourPriceResponse(
                            p.guestType(),
                            localizeGuestTypeLabel(p.guestType(), p.guestTypeLabel(), lang),
                            localizeAgeRange(p.guestType(), p.ageRange(), lang),
                            p.price(),
                            p.countsTowardSlot(),
                            p.alwaysFree()
                    ))
                    .toList();
            return t.toBuilder()
                    .title(translatedTitles.getOrDefault(t.tourId(), t.title()))
                    .regionName(t.regionId() != null ? translatedRegions.getOrDefault(t.regionId(), t.regionName()) : t.regionName())
                    .themeName(t.themeId() != null ? translatedThemes.getOrDefault(t.themeId(), t.themeName()) : t.themeName())
                    .prices(localizedPrices)
                    .build();
        }).toList();

        return PageResponse.<TourResponse>builder()
                .content(localizedContent)
                .page(page.getPage())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .build();
    }

    /** Dịch danh sách Vùng miền theo Accept-Language (cache DB). */
    public List<RegionResponse> localizeRegions(List<RegionResponse> regions, Locale locale) {
        if (regions == null || regions.isEmpty()) return regions;
        String lang = contentTranslationService.resolveTargetLang(locale);
        if (lang == null) return regions;

        Map<Long, String> idToName = new LinkedHashMap<>();
        for (RegionResponse r : regions) {
            if (r.id() != null && StringUtils.hasText(r.name())) idToName.put(r.id(), r.name());
        }
        Map<Long, String> translated = contentTranslationService.translateBatchLabels("REGION", idToName, lang);
        return regions.stream()
                .map(r -> RegionResponse.builder()
                        .id(r.id())
                        .name(translated.getOrDefault(r.id(), r.name()))
                        .slug(r.slug())
                        .imageUrl(r.imageUrl())
                        .imageCredit(r.imageCredit())
                        .deleted(r.deleted())
                        .createdAt(r.createdAt())
                        .updatedAt(r.updatedAt())
                        .build())
                .toList();
    }

    public RegionResponse localizeRegion(RegionResponse region, Locale locale) {
        if (region == null) return null;
        return localizeRegions(List.of(region), locale).get(0);
    }

    /** Dịch danh sách Chủ đề du lịch theo Accept-Language (cache DB). */
    public List<ThemeResponse> localizeThemes(List<ThemeResponse> themes, Locale locale) {
        if (themes == null || themes.isEmpty()) return themes;
        String lang = contentTranslationService.resolveTargetLang(locale);
        if (lang == null) return themes;

        Map<Long, String> idToName = new LinkedHashMap<>();
        for (ThemeResponse t : themes) {
            if (t.id() != null && StringUtils.hasText(t.name())) idToName.put(t.id(), t.name());
        }
        Map<Long, String> translated = contentTranslationService.translateBatchLabels("THEME", idToName, lang);
        return themes.stream()
                .map(t -> ThemeResponse.builder()
                        .id(t.id())
                        .name(translated.getOrDefault(t.id(), t.name()))
                        .slug(t.slug())
                        .imageUrl(t.imageUrl())
                        .imageCredit(t.imageCredit())
                        .deleted(t.deleted())
                        .createdAt(t.createdAt())
                        .updatedAt(t.updatedAt())
                        .build())
                .toList();
    }

    public ThemeResponse localizeTheme(ThemeResponse theme, Locale locale) {
        if (theme == null) return null;
        return localizeThemes(List.of(theme), locale).get(0);
    }

    public TourPublicDetailResponse localizePublicDetail(TourPublicDetailResponse detail, Locale locale) {
        if (detail == null || locale == null) return detail;
        String lang = locale.getLanguage() == null ? "vi" : locale.getLanguage().toLowerCase(Locale.ROOT);
        if (!TARGET_LOCALES.contains(lang)) return detail;

        // 1. Luôn dịch nhãn loại khách & độ tuổi (nhanh, xác định, không phụ thuộc Gemini)
        TourPublicDetailResponse withLocalizedPrices = localizePrices(detail, lang);

        // 2. Nếu chưa có Gemini key thật (hoặc mock/test) ⇒ trả về luôn với giá đã dịch
        String apiKey = geminiProperties.getApiKey();
        if (!StringUtils.hasText(apiKey)
                || "mock".equalsIgnoreCase(apiKey.trim())
                || "test".equalsIgnoreCase(apiKey.trim())) {
            return withLocalizedPrices;
        }

        try {
            ObjectNode sourcePayload = buildSourcePayload(withLocalizedPrices);
            String sourceJson = objectMapper.writeValueAsString(sourcePayload);
            String sourceHash = sha256Hex(sourceJson);

            Optional<TourTranslation> cached = translationRepository.findByTourIdAndLocale(detail.tourId(), lang);
            if (cached.isPresent() && sourceHash.equals(cached.get().getSourceHash())) {
                JsonNode translatedNode = objectMapper.readTree(cached.get().getTranslatedJson());
                return applyTranslation(withLocalizedPrices, translatedNode);
            }

            // Cache miss hoặc tour vừa sửa ⇒ khóa theo (tourId:lang) rồi gọi Gemini 1 lần
            Object lock = inFlightLocks.computeIfAbsent(detail.tourId() + ":" + lang, k -> new Object());
            synchronized (lock) {
                Optional<TourTranslation> rechecked = translationRepository.findByTourIdAndLocale(detail.tourId(), lang);
                if (rechecked.isPresent() && sourceHash.equals(rechecked.get().getSourceHash())) {
                    JsonNode translatedNode = objectMapper.readTree(rechecked.get().getTranslatedJson());
                    return applyTranslation(withLocalizedPrices, translatedNode);
                }

                JsonNode translatedNode = translateViaGemini(sourceJson, lang);
                if (translatedNode == null || !translatedNode.isObject()) {
                    return withLocalizedPrices;
                }

                TourTranslation entity = rechecked.orElseGet(() -> TourTranslation.builder()
                        .tourId(detail.tourId())
                        .locale(lang)
                        .build());
                entity.setSourceHash(sourceHash);
                entity.setTranslatedJson(objectMapper.writeValueAsString(translatedNode));
                translationRepository.save(entity);

                return applyTranslation(withLocalizedPrices, translatedNode);
            }
        } catch (Exception e) {
            log.warn("Không thể dịch tự động tourId={} sang '{}': {}", detail.tourId(), lang, e.getMessage());
            return withLocalizedPrices;
        }
    }

    private JsonNode translateViaGemini(String sourceJson, String lang) {
        String targetLanguageName = "ja".equals(lang)
                ? "natural, polite Japanese (日本語)"
                : "natural, concise English";

        String systemPrompt = """
                You are a professional Vietnamese-to-target-language travel translator for JourneyGo (Vietnam cultural & heritage tours).
                Translate ONLY the Vietnamese string values in the input JSON into %s.
                Rules:
                - Preserve the EXACT JSON structure, keys, array lengths, order, and all numeric/id fields untouched.
                - Keep times (e.g., 08:00, 13:30), currency amounts, phone numbers, emails, and URLs unchanged.
                - For Vietnamese landmarks and heritage proper nouns, keep recognizable names (e.g., Hoan Kiem Lake, Ngoc Son Temple, One Pillar Pagoda, Temple of Literature / ホアンキエム湖, 玉山祠, 一柱寺, 文廟).
                - Return ONLY raw valid JSON with no markdown fences, no commentary, and no extra keys.
                """.formatted(targetLanguageName);

        String raw = geminiChatClient.generateReply(systemPrompt, List.of(), sourceJson, 0.2, 4096);
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
            if (firstNewline > 0) {
                text = text.substring(firstNewline + 1);
            }
            if (text.endsWith("```")) {
                text = text.substring(0, text.length() - 3);
            }
        }
        return text.trim();
    }

    private ObjectNode buildSourcePayload(TourPublicDetailResponse d) {
        ObjectNode root = objectMapper.createObjectNode();
        putIfText(root, "title", d.title());
        putIfText(root, "description", d.description());
        putIfText(root, "regionName", d.region() != null ? d.region().name() : null);
        putIfText(root, "themeName", d.theme() != null ? d.theme().name() : null);
        putIfText(root, "priceIncludes", d.priceIncludes());
        putIfText(root, "priceExcludes", d.priceExcludes());
        putIfText(root, "forceMajeure", d.forceMajeure());
        putIfText(root, "refundPolicy", d.refundPolicy());
        putIfText(root, "cancellationPolicy", d.cancellationPolicy());
        putIfText(root, "contactInfo", d.contactInfo());
        putIfText(root, "departureTime", d.departureTime());
        putIfText(root, "meetingPoint", d.meetingPoint());
        putIfText(root, "pickupInfo", d.pickupInfo());

        if (d.highlights() != null && !d.highlights().isEmpty()) {
            ArrayNode arr = root.putArray("highlights");
            d.highlights().forEach(arr::add);
        }
        if (d.itinerary() != null && !d.itinerary().isEmpty()) {
            ArrayNode arr = root.putArray("itinerary");
            for (TourDetailResponse.ItineraryDay day : d.itinerary()) {
                ObjectNode item = arr.addObject();
                item.put("dayNumber", day.dayNumber());
                putIfText(item, "title", day.title());
                putIfText(item, "mainActivity", day.mainActivity());
                putIfText(item, "content", day.content());
            }
        }
        if (d.stops() != null && !d.stops().isEmpty()) {
            ArrayNode arr = root.putArray("stops");
            for (TourPublicDetailResponse.Stop s : d.stops()) {
                ObjectNode item = arr.addObject();
                if (s.id() != null) item.put("id", s.id());
                putIfText(item, "name", s.name());
                putIfText(item, "shortDescription", s.shortDescription());
                putIfText(item, "guestNote", s.guestNote());
                if (s.activities() != null && !s.activities().isEmpty()) {
                    ArrayNode acts = item.putArray("activities");
                    for (TourPublicDetailResponse.Activity a : s.activities()) {
                        acts.add(a.activityName() != null ? a.activityName() : "");
                    }
                }
            }
        }
        return root;
    }

    private TourPublicDetailResponse applyTranslation(TourPublicDetailResponse d, JsonNode t) {
        TourDetailResponse.Ref region = d.region() == null ? null
                : new TourDetailResponse.Ref(d.region().id(), textOr(t, "regionName", d.region().name()));
        TourDetailResponse.Ref theme = d.theme() == null ? null
                : new TourDetailResponse.Ref(d.theme().id(), textOr(t, "themeName", d.theme().name()));

        List<String> highlights = d.highlights();
        if (highlights != null && t.has("highlights") && t.get("highlights").isArray()
                && t.get("highlights").size() == highlights.size()) {
            List<String> next = new ArrayList<>(highlights.size());
            for (int i = 0; i < highlights.size(); i++) {
                String v = t.get("highlights").get(i).asText("");
                next.add(StringUtils.hasText(v) ? v : highlights.get(i));
            }
            highlights = next;
        }

        List<TourDetailResponse.ItineraryDay> itinerary = d.itinerary();
        if (itinerary != null && t.has("itinerary") && t.get("itinerary").isArray()
                && t.get("itinerary").size() == itinerary.size()) {
            List<TourDetailResponse.ItineraryDay> next = new ArrayList<>(itinerary.size());
            for (int i = 0; i < itinerary.size(); i++) {
                TourDetailResponse.ItineraryDay orig = itinerary.get(i);
                JsonNode tn = t.get("itinerary").get(i);
                next.add(new TourDetailResponse.ItineraryDay(
                        orig.dayNumber(),
                        textOr(tn, "title", orig.title()),
                        textOr(tn, "mainActivity", orig.mainActivity()),
                        textOr(tn, "content", orig.content())
                ));
            }
            itinerary = next;
        }

        List<TourPublicDetailResponse.Stop> stops = d.stops();
        if (stops != null && t.has("stops") && t.get("stops").isArray()
                && t.get("stops").size() == stops.size()) {
            List<TourPublicDetailResponse.Stop> nextStops = new ArrayList<>(stops.size());
            for (int i = 0; i < stops.size(); i++) {
                TourPublicDetailResponse.Stop orig = stops.get(i);
                JsonNode sn = t.get("stops").get(i);
                List<TourPublicDetailResponse.Activity> acts = orig.activities();
                if (acts != null && sn.has("activities") && sn.get("activities").isArray()
                        && sn.get("activities").size() == acts.size()) {
                    List<TourPublicDetailResponse.Activity> nextActs = new ArrayList<>(acts.size());
                    for (int j = 0; j < acts.size(); j++) {
                        TourPublicDetailResponse.Activity oa = acts.get(j);
                        String translatedName = sn.get("activities").get(j).asText("");
                        nextActs.add(new TourPublicDetailResponse.Activity(
                                StringUtils.hasText(translatedName) ? translatedName : oa.activityName(),
                                oa.durationSeconds(),
                                oa.points()
                        ));
                    }
                    acts = nextActs;
                }
                nextStops.add(new TourPublicDetailResponse.Stop(
                        orig.id(),
                        orig.sequenceOrder(),
                        textOr(sn, "name", orig.name()),
                        textOr(sn, "shortDescription", orig.shortDescription()),
                        textOr(sn, "guestNote", orig.guestNote()),
                        orig.imageUrl(),
                        orig.videoUrl(),
                        orig.videoSource(),
                        orig.hasCulturalStory(),
                        orig.culturalImageCount(),
                        orig.artifactCount(),
                        orig.quizCount(),
                        acts,
                        orig.latitude(),
                        orig.longitude(),
                        orig.maxPoints(),
                        orig.checkInRadiusMeters()
                ));
            }
            stops = nextStops;
        }

        return TourPublicDetailResponse.builder()
                .tourId(d.tourId())
                .title(textOr(t, "title", d.title()))
                .wizardTour(d.wizardTour())
                .tourFormat(d.tourFormat())
                .durationMinutes(d.durationMinutes())
                .durationDays(d.durationDays())
                .durationNights(d.durationNights())
                .region(region)
                .theme(theme)
                .providerName(d.providerName())
                .providerId(d.providerId())
                .description(textOr(t, "description", d.description()))
                .highlights(highlights)
                .images(d.images())
                .coverImageUrl(d.coverImageUrl())
                .itinerary(itinerary)
                .priceIncludes(textOr(t, "priceIncludes", d.priceIncludes()))
                .priceExcludes(textOr(t, "priceExcludes", d.priceExcludes()))
                .forceMajeure(textOr(t, "forceMajeure", d.forceMajeure()))
                .refundPolicy(textOr(t, "refundPolicy", d.refundPolicy()))
                .cancellationPolicy(textOr(t, "cancellationPolicy", d.cancellationPolicy()))
                .contactInfo(textOr(t, "contactInfo", d.contactInfo()))
                .price(d.price())
                .prices(d.prices())
                .maxGuestsPerSlot(d.maxGuestsPerSlot())
                .upcomingDepartureDates(d.upcomingDepartureDates())
                .departureTime(textOr(t, "departureTime", d.departureTime()))
                .meetingPoint(textOr(t, "meetingPoint", d.meetingPoint()))
                .pickupInfo(textOr(t, "pickupInfo", d.pickupInfo()))
                .stops(stops)
                .taskCount(d.taskCount())
                .totalPoints(d.totalPoints())
                .build();
    }

    private TourPublicDetailResponse localizePrices(TourPublicDetailResponse d, String lang) {
        if (d.prices() == null || d.prices().isEmpty()) return d;
        List<TourPublicDetailResponse.Price> localized = d.prices().stream()
                .map(p -> new TourPublicDetailResponse.Price(
                        p.guestType(),
                        localizeGuestTypeLabel(p.guestType(), p.label(), lang),
                        localizeAgeRange(p.guestType(), p.ageRange(), lang),
                        p.price(),
                        p.alwaysFree(),
                        p.countsTowardSlot()
                ))
                .toList();
        return TourPublicDetailResponse.builder()
                .tourId(d.tourId())
                .title(d.title())
                .wizardTour(d.wizardTour())
                .tourFormat(d.tourFormat())
                .durationMinutes(d.durationMinutes())
                .durationDays(d.durationDays())
                .durationNights(d.durationNights())
                .region(d.region())
                .theme(d.theme())
                .providerName(d.providerName())
                .providerId(d.providerId())
                .description(d.description())
                .highlights(d.highlights())
                .images(d.images())
                .coverImageUrl(d.coverImageUrl())
                .itinerary(d.itinerary())
                .priceIncludes(d.priceIncludes())
                .priceExcludes(d.priceExcludes())
                .forceMajeure(d.forceMajeure())
                .refundPolicy(d.refundPolicy())
                .cancellationPolicy(d.cancellationPolicy())
                .contactInfo(d.contactInfo())
                .price(d.price())
                .prices(localized)
                .maxGuestsPerSlot(d.maxGuestsPerSlot())
                .upcomingDepartureDates(d.upcomingDepartureDates())
                .departureTime(d.departureTime())
                .meetingPoint(d.meetingPoint())
                .pickupInfo(d.pickupInfo())
                .stops(d.stops())
                .taskCount(d.taskCount())
                .totalPoints(d.totalPoints())
                .build();
    }

    public static String localizeGuestTypeLabel(GuestType type, String fallback, String lang) {
        if (type == null) return fallback;
        if ("ja".equals(lang)) {
            return switch (type) {
                case ADULT -> "大人";
                case CHILD -> "子ども";
                case TODDLER -> "幼児";
                case INFANT -> "乳児";
            };
        }
        if ("en".equals(lang)) {
            return switch (type) {
                case ADULT -> "Adult";
                case CHILD -> "Child";
                case TODDLER -> "Toddler";
                case INFANT -> "Infant";
            };
        }
        return fallback;
    }

    public static String localizeAgeRange(GuestType type, String ageRange, String lang) {
        if (!StringUtils.hasText(ageRange)) return ageRange;
        List<String> nums = new ArrayList<>();
        Matcher m = NUMBER_PATTERN.matcher(ageRange);
        while (m.find()) nums.add(m.group());
        String lower = ageRange.toLowerCase(Locale.ROOT);

        if ("ja".equals(lang)) {
            if (nums.size() >= 2) return nums.get(0) + "〜" + nums.get(1) + "歳";
            if (nums.size() == 1) {
                if (lower.contains("dưới") || lower.contains("under") || type == GuestType.INFANT) {
                    return nums.get(0) + "歳未満";
                }
                return nums.get(0) + "歳以上";
            }
            return ageRange;
        }
        if ("en".equals(lang)) {
            if (nums.size() >= 2) return nums.get(0) + "–" + nums.get(1) + " years";
            if (nums.size() == 1) {
                if (lower.contains("dưới") || lower.contains("under") || type == GuestType.INFANT) {
                    return "Under " + nums.get(0);
                }
                return nums.get(0) + "+ years";
            }
            return ageRange;
        }
        return ageRange;
    }

    private void putIfText(ObjectNode node, String field, String value) {
        if (StringUtils.hasText(value)) {
            node.put(field, value);
        }
    }

    private String textOr(JsonNode node, String field, String fallback) {
        if (node == null || !node.has(field) || node.get(field).isNull()) return fallback;
        String v = node.get(field).asText("");
        return StringUtils.hasText(v) ? v : fallback;
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
