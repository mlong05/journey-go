package com.journeygo.modules.providerchat.dto.response;

import com.journeygo.modules.providerchat.entity.ProviderMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;

@Builder
@Schema(description = "Tin nhắn trong cuộc trò chuyện với nhà tour")
public record ProviderMessageResponse(

        @Schema(description = "ID tin nhắn") Long id,
        @Schema(description = "ID cuộc trò chuyện") Long conversationId,
        @Schema(description = "Người gửi") Long senderId,
        @Schema(description = "Nội dung") String body,
        @Schema(description = "Thời điểm gửi") Instant createdAt,
        @Schema(description = "Đã đọc hay chưa") boolean read
) {

    public static ProviderMessageResponse fromEntity(ProviderMessage m) {
        if (m == null) return null;
        return ProviderMessageResponse.builder()
                .id(m.getId())
                .conversationId(m.getConversation() != null ? m.getConversation().getId() : null)
                .senderId(m.getSenderId())
                .body(m.getBody())
                .createdAt(m.getCreatedAt())
                .read(m.isRead())
                .build();
    }
}
