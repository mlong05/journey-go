package com.journeygo.modules.providerchat.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Mở cuộc trò chuyện với nhà tour")
public record StartProviderConversationRequest(

        @Schema(description = "ID tour du khách đang xem (dùng để biết đối tác nào)", example = "1")
        Long tourId,

        @Schema(description = "ID nhà tour (bỏ trống nếu đã có tourId)", example = "5")
        Long providerId,

        @Schema(description = "ID đơn đặt tour liên quan (bỏ trống = mới hỏi, chưa đặt). "
                + "Dùng cho khung 'Hỗ trợ trong đơn này' để gắn hội thoại với đơn.")
        Long bookingId
) {
}