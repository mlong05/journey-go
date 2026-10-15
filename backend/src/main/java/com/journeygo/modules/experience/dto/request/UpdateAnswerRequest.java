package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

/**
 * Sửa Answer.
 */
@Schema(description = "Yêu cầu cập nhật Answer")
public record UpdateAnswerRequest(

        @Schema(description = "Nội dung đáp án")
        String content,

        @Schema(description = "Đáp án đúng?")
        Boolean isCorrect,

        @Schema(description = "Thứ tự hiển thị")
        @Min(0)
        Integer sequenceOrder,

        @Schema(description = "Giải thích (hiển thị sau khi trả lời)")
        String explanation
) {}