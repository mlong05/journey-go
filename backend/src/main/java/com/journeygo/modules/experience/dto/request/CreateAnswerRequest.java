package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

@Schema(description = "Yêu cầu tạo Answer cho Question")
public record CreateAnswerRequest(

        @Schema(description = "Nội dung đáp án")
        @NotBlank(message = "Nội dung đáp án không được để trống")
        String content,

        @Schema(description = "Đáp án đúng?")
        @NotNull(message = "isCorrect không được để trống")
        Boolean isCorrect,

        @Schema(description = "Thứ tự trong Question")
        @NotNull
        @Min(0)
        Integer sequenceOrder,

        @Schema(description = "Giải thích (chỉ trả cho CP/CM, ẩN với Tourist — BR-TASK-5)")
        String explanation
) {}
