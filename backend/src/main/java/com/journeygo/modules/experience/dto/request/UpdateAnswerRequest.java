package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

@Schema(description = "Yêu cầu cập nhật Answer")
public record UpdateAnswerRequest(

        @Schema(description = "Nội dung đáp án")
        String content,

        @Schema(description = "URL ảnh của phương án; null = giữ nguyên, chuỗi rỗng = gỡ ảnh")
        @Size(max = 1000)
        @Pattern(regexp = "^$|^https://.*", message = "URL ảnh phải bắt đầu bằng https://")
        String imageUrl,

        @Schema(description = "Đáp án đúng?")
        Boolean isCorrect,

        @Schema(description = "Thứ tự hiển thị")
        @Min(0)
        Integer sequenceOrder,

        @Schema(description = "Giải thích (hiển thị sau khi trả lời)")
        String explanation
) {}
