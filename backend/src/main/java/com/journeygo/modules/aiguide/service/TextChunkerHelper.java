package com.journeygo.modules.aiguide.service;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Tiện ích băm nhỏ văn bản (Chunking Strategy) tuân thủ Quy tắc 2 trong tài liệu kỹ thuật AI RAG:
 * - Ưu tiên chia theo đoạn văn (\n\n, \n) hoặc dấu câu (.!?) thay vì cắt thô theo ký tự.
 * - Kích thước chuẩn: 300 - 500 từ, độ gối (overlap) 50 từ.
 * - Tự động làm sạch mã HTML và gắn Context Prefix.
 */
@Component
public class TextChunkerHelper {

    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("<[^>]*>");
    private static final Pattern MULTIPLE_SPACES_PATTERN = Pattern.compile("[ \\t]+");
    private static final Pattern MULTIPLE_NEWLINES_PATTERN = Pattern.compile("\\n{3,}");

    /**
     * Làm sạch văn bản thô (loại bỏ thẻ HTML, chuẩn hóa ngắt dòng và khoảng trắng).
     */
    public String cleanText(String rawText) {
        if (!StringUtils.hasText(rawText)) {
            return "";
        }
        // Loại bỏ HTML tags nếu có
        String cleaned = HTML_TAG_PATTERN.matcher(rawText).replaceAll(" ");
        // Chuẩn hóa ký tự xuống dòng
        cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n");
        // Giảm khoảng trắng thừa
        cleaned = MULTIPLE_SPACES_PATTERN.matcher(cleaned).replaceAll(" ");
        cleaned = MULTIPLE_NEWLINES_PATTERN.matcher(cleaned).replaceAll("\n\n");
        return cleaned.trim();
    }

    /**
     * Gắn Context Prefix vào đầu mỗi chunk:
     * "[Địa điểm: {destinationName} - Danh mục: {category}] {chunkContent}"
     */
    public String applyContextPrefix(String chunk, String destinationName, String category) {
        StringBuilder sb = new StringBuilder();
        sb.append("[Địa điểm: ");
        sb.append(StringUtils.hasText(destinationName) ? destinationName : "Không xác định");
        sb.append(" - Danh mục: ");
        sb.append(StringUtils.hasText(category) ? category : "Thông tin chung");
        sb.append("]\n");
        sb.append(chunk);
        return sb.toString();
    }

    /**
     * Chia nhỏ văn bản thành các chunks có kích thước targetWords (khoảng 300-500 từ)
     * với độ gối overlapWords (khoảng 50 từ).
     *
     * @param rawText      Văn bản thô
     * @param targetWords  Số từ mục tiêu mỗi chunk (VD: 400)
     * @param overlapWords Số từ gối đầu giữa 2 chunk liên tiếp (VD: 50)
     * @return Danh sách các chunks đã làm sạch
     */
    public List<String> splitIntoChunks(String rawText, int targetWords, int overlapWords) {
        String cleaned = cleanText(rawText);
        if (!StringUtils.hasText(cleaned)) {
            return Collections.emptyList();
        }

        // Tách theo đoạn văn trước
        String[] paragraphs = cleaned.split("\\n\\n+");
        List<String> chunks = new ArrayList<>();
        List<String> currentChunkWords = new ArrayList<>();

        for (String paragraph : paragraphs) {
            String trimmedPara = paragraph.trim();
            if (trimmedPara.isEmpty()) {
                continue;
            }

            String[] words = trimmedPara.split("\\s+");

            // Nếu đoạn văn hiện tại quá dài (vượt quá targetWords), ta chia nhỏ theo câu hoặc từ
            if (words.length > targetWords) {
                // Đóng chunk hiện tại nếu đang có từ dở dang
                if (!currentChunkWords.isEmpty()) {
                    chunks.add(String.join(" ", currentChunkWords));
                    currentChunkWords = extractOverlap(currentChunkWords, overlapWords);
                }

                // Cắt đoạn văn dài này thành các sub-chunks
                for (int i = 0; i < words.length; i += (targetWords - overlapWords)) {
                    int end = Math.min(i + targetWords, words.length);
                    String[] subChunk = Arrays.copyOfRange(words, i, end);
                    chunks.add(String.join(" ", subChunk));
                    if (end == words.length) {
                        break;
                    }
                }
                continue;
            }

            // Nếu gộp đoạn này vào chunk hiện tại mà không vượt targetWords
            if (currentChunkWords.size() + words.length <= targetWords) {
                currentChunkWords.addAll(Arrays.asList(words));
            } else {
                // Đã đủ kích thước chunk
                if (!currentChunkWords.isEmpty()) {
                    chunks.add(String.join(" ", currentChunkWords));
                    currentChunkWords = extractOverlap(currentChunkWords, overlapWords);
                }
                currentChunkWords.addAll(Arrays.asList(words));
            }
        }

        // Thêm phần dư còn lại
        if (!currentChunkWords.isEmpty()) {
            chunks.add(String.join(" ", currentChunkWords));
        }

        return chunks;
    }

    private List<String> extractOverlap(List<String> words, int overlapWords) {
        if (overlapWords <= 0 || words.size() <= overlapWords) {
            return new ArrayList<>();
        }
        int fromIndex = words.size() - overlapWords;
        return new ArrayList<>(words.subList(fromIndex, words.size()));
    }
}

