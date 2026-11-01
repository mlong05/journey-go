package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

@Schema(description = "Yêu cầu tạo Answer cho Question")
public record CreateAnswerRequest(

        @Schema(description = "Nội dung đáp án. Được để trống nếu phương án có ảnh")
        String content,

        @Schema(description = "URL ảnh của phương án (tải lên qua /api/v1/upload/image). Không bắt buộc")
        @Size(max = 1000)
        @Pattern(regexp = "^https://.*", message = "URL ảnh phải bắt đầu bằng https://")
        String imageUrl,

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
