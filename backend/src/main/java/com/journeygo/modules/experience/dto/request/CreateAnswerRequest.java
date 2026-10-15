package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

/**
 * Tạo Answer.
 *
 * BR-TASK-6:
 *   - MULTIPLE_CHOICE: đúng 1 isCorrect=true trong các answer.
 *   - TEXT: tất cả isCorrect=true (mỗi answer là 1 cách viết được chấp nhận).
 */
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