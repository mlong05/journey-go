package com.journeygo.modules.journey.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.List;

@Schema(description = "Bài làm của cả nhiệm vụ: trả lời mọi câu hỏi trong một lần nộp")
public record SubmitTaskRequest(
        @Schema(description = "Câu trả lời cho từng câu hỏi của nhiệm vụ. Có thể để trống nếu nhiệm vụ không có câu hỏi")
        List<QuestionAnswer> answers,
        @Schema(description = "Vĩ độ hiện tại của du khách (nhiệm vụ cần vị trí)")
        BigDecimal latitude,
        @Schema(description = "Kinh độ hiện tại của du khách (nhiệm vụ cần vị trí)")
        BigDecimal longitude,
        @Schema(description = "Nội dung mã QR quét được tại trạm (thay cho GPS ở nhiệm vụ cần vị trí)")
        String qrValue
) {
    @Schema(description = "Trả lời một câu hỏi: trắc nghiệm gửi answerId, tự luận gửi text")
    public record QuestionAnswer(Long questionId, Long answerId, String text) {}
}
