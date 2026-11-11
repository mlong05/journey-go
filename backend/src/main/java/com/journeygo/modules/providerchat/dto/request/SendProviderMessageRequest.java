package com.journeygo.modules.providerchat.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Gửi tin nhắn cho nhà tour")
public record SendProviderMessageRequest(

        @Schema(description = "Nội dung tin nhắn", example = "Tour này có phù hợp với người lớn tuổi không?")
        @NotBlank(message = "Nội dung tin nhắn không được để trống")
        @Size(max = 2000, message = "Nội dung tin nhắn quá dài")
        String body
) {
}
