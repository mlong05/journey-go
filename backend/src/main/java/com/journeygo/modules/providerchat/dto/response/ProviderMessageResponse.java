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
        @Schema(description = "Đã đọc hay chưa") boolean read,
        @Schema(description = "Tour mà tin nhắn hỏi về (null với tin nhắn cũ)") Long tourId,
        @Schema(description = "Tên tour mà tin nhắn hỏi về") String tourTitle,
        @Schema(description = "Ảnh bìa tour mà tin nhắn hỏi về") String tourCoverImageUrl
) {

    public static ProviderMessageResponse fromEntity(ProviderMessage m) {
        return fromEntity(m, null, null);
    }

    public static ProviderMessageResponse fromEntity(ProviderMessage m, String tourTitle, String tourCoverImageUrl) {
        if (m == null) return null;
        return ProviderMessageResponse.builder()
                .id(m.getId())
                .conversationId(m.getConversation() != null ? m.getConversation().getId() : null)
                .senderId(m.getSenderId())
                .body(m.getBody())
                .createdAt(m.getCreatedAt())
                .read(m.isRead())
                .tourId(m.getTourId())
                .tourTitle(tourTitle)
                .tourCoverImageUrl(tourCoverImageUrl)
                .build();
    }
}
