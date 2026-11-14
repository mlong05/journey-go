package com.journeygo.modules.providerchat.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Mở cuộc trò chuyện với nhà tour")
public record StartProviderConversationRequest(

        @Schema(description = "ID tour du khách đang xem (dùng để biết đối tác nào)", example = "1")
        Long tourId,

        @Schema(description = "ID nhà tour (bỏ trống nếu đã có tourId)", example = "5")
        Long providerId
) {
}
