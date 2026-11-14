package com.journeygo.modules.tour.service;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Chấm câu trả lời nhập chữ của khách so với "đáp án đúng" của đối tác.
 * <ul>
 *   <li>Không phân biệt hoa thường, dấu tiếng Việt (kể cả đ/Đ) và khoảng trắng thừa.</li>
 *   <li>Đáp án đúng có thể gồm nhiều đáp án chấp nhận, cách nhau bằng dấu {@code ;}
 *       (vd. "Lý Thái Tổ; Lý Công Uẩn").</li>
 * </ul>
 */
public final class TextAnswerMatcher {

    public static final String SEPARATOR = ";";

    private TextAnswerMatcher() {}

    public static boolean matches(String answer, String expected) {
        String given = normalize(answer);
        if (given.isEmpty()) return false;
        return acceptedAnswers(expected).stream().anyMatch(given::equals);
    }

    /** Các đáp án chấp nhận (đã chuẩn hóa, bỏ mục rỗng). */
    public static List<String> acceptedAnswers(String expected) {
        if (expected == null) return List.of();
        return Arrays.stream(expected.split(SEPARATOR))
                .map(TextAnswerMatcher::normalize)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    static String normalize(String value) {
        if (value == null) return "";
        String noMarks = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');
        return noMarks.toLowerCase(Locale.ROOT).trim().replaceAll("\\s+", " ");
    }
}
