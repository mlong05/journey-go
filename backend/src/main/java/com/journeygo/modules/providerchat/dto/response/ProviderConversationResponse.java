package com.journeygo.modules.providerchat.dto.response;

import com.journeygo.modules.providerchat.entity.ProviderConversation;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;

@Builder
@Schema(description = "Cuộc trò chuyện với nhà tour")
public record ProviderConversationResponse(

        @Schema(description = "ID cuộc trò chuyện") Long id,
        @Schema(description = "ID du khách") Long touristId,
        @Schema(description = "Tên du khách") String touristName,
        @Schema(description = "ID nhà tour") Long providerId,
        @Schema(description = "Tên nhà tour") String providerName,
        @Schema(description = "ID tour liên quan") Long tourId,
        @Schema(description = "Tên tour liên quan") String tourTitle,
        @Schema(description = "Tiêu đề") String subject,
        @Schema(description = "Tin nhắn cuối cùng") String lastMessage,
        @Schema(description = "Thời điểm tin nhắn cuối") Instant lastMessageAt,
        @Schema(description = "Số tin nhắn chưa đọc") int unreadCount,
        @Schema(description = "Thời điểm tạo") Instant createdAt,
        @Schema(description = "Thời điểm cập nhật") Instant updatedAt
) {

    public static ProviderConversationResponse fromEntity(ProviderConversation c,
                                                           String touristName,
                                                           String providerName,
                                                           String tourTitle,
                                                           String lastMessage,
                                                           int unreadCount) {
        if (c == null) return null;
        return ProviderConversationResponse.builder()
                .id(c.getId())
                .touristId(c.getTouristId())
                .touristName(touristName)
                .providerId(c.getProviderId())
                .providerName(providerName)
                .tourId(c.getTourId())
                .tourTitle(tourTitle)
                .subject(c.getSubject())
                .lastMessage(lastMessage)
                .lastMessageAt(c.getLastMessageAt())
                .unreadCount(unreadCount)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
