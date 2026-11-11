package com.journeygo.modules.booking.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Gửi tin nhắn trong khung chat hỗ trợ của Booking.
 */
@Schema(description = "Nội dung tin nhắn hỗ trợ trong booking")
public record SendMessageRequest(

        @Schema(description = "Nội dung tin nhắn", example = "Tôi muốn đổi hành khách thứ 5 sang người khác")
        @NotBlank(message = "Nội dung tin nhắn không được để trống")
        @Size(max = 2000, message = "Nội dung tin nhắn không được vượt quá 2000 ký tự")
        String body
) {
}
