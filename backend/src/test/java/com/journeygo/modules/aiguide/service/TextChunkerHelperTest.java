package com.journeygo.modules.aiguide.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TextChunkerHelperTest {

    private TextChunkerHelper chunkerHelper;

    @BeforeEach
    void setUp() {
        chunkerHelper = new TextChunkerHelper();
    }

    @Test
    @DisplayName("Làm sạch văn bản: Loại bỏ thẻ HTML và khoảng trắng thừa")
    void testCleanText_removesHtmlAndNormalizesSpaces() {
        String raw = "<p>Chùa <b>Thiên Mụ</b> là ngôi chùa cổ kính.</p><br/><div>Nằm bên bờ sông Hương.</div>";
        String cleaned = chunkerHelper.cleanText(raw);

        assertThat(cleaned).doesNotContain("<p>", "<b>", "</b>", "</p>", "<br/>", "<div>", "</div>");
        assertThat(cleaned).contains("Chùa Thiên Mụ là ngôi chùa cổ kính.");
        assertThat(cleaned).contains("Nằm bên bờ sông Hương.");
    }

    @Test
    @DisplayName("Gắn Context Prefix: Định dạng chuẩn [Địa điểm: ... - Danh mục: ...]")
    void testApplyContextPrefix() {
        String chunk = "Chùa được xây dựng từ năm 1601 bởi chúa Nguyễn Hoàng.";
        String result = chunkerHelper.applyContextPrefix(chunk, "Chùa Thiên Mụ", "Lịch sử & Kiến trúc");

        assertThat(result).startsWith("[Địa điểm: Chùa Thiên Mụ - Danh mục: Lịch sử & Kiến trúc]\n");
        assertThat(result).contains(chunk);
    }

    @Test
    @DisplayName("Cắt đoạn văn: Tách các đoạn nhỏ theo targetWords và overlap")
    void testSplitIntoChunks_shortText() {
        String text = "Đoạn văn ngắn về di tích lịch sử.";
        List<String> chunks = chunkerHelper.splitIntoChunks(text, 100, 20);

        assertThat(chunks).hasSize(1);
        assertThat(chunks.get(0)).isEqualTo(text);
    }

    @Test
    @DisplayName("Cắt văn bản dài: Tạo nhiều chunks có gối đầu (overlap)")
    void testSplitIntoChunks_longText() {
        // Tạo đoạn văn 300 từ
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= 300; i++) {
            sb.append("từ").append(i).append(" ");
            if (i % 50 == 0) {
                sb.append("\n\n");
            }
        }

        List<String> chunks = chunkerHelper.splitIntoChunks(sb.toString(), 100, 20);

        assertThat(chunks.size()).isGreaterThanOrEqualTo(3);
    }
}
