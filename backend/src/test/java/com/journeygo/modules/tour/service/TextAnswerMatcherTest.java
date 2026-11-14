package com.journeygo.modules.tour.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TextAnswerMatcherTest {

    @Test
    @DisplayName("Không phân biệt hoa thường, dấu tiếng Việt và khoảng trắng thừa")
    void ignoresCaseMarksAndSpaces() {
        assertTrue(TextAnswerMatcher.matches("  ly   thai TO ", "Lý Thái Tổ"));
        assertTrue(TextAnswerMatcher.matches("Dinh Doc Lap", "Dinh Độc Lập"));
        assertTrue(TextAnswerMatcher.matches("đền hùng", "DEN HUNG"));
    }

    @Test
    @DisplayName("Nhiều đáp án chấp nhận cách nhau bằng dấu ;")
    void acceptsAnyListedAnswer() {
        assertTrue(TextAnswerMatcher.matches("Lý Công Uẩn", "Lý Thái Tổ; Lý Công Uẩn"));
        assertFalse(TextAnswerMatcher.matches("Lý Thường Kiệt", "Lý Thái Tổ; Lý Công Uẩn"));
    }

    @Test
    @DisplayName("Câu trả lời rỗng hoặc đáp án đúng rỗng thì không khớp")
    void blankNeverMatches() {
        assertFalse(TextAnswerMatcher.matches("   ", "Sen"));
        assertFalse(TextAnswerMatcher.matches("Sen", " ; "));
        assertTrue(TextAnswerMatcher.acceptedAnswers(" ; ").isEmpty());
    }
}
