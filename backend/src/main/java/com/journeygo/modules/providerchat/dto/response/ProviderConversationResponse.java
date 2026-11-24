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
        @Schema(description = "ID đơn đặt tour liên quan (null = mới hỏi, chưa đặt)") Long bookingId,
        @Schema(description = "Mã đơn đặt tour liên quan") String bookingCode,
        @Schema(description = "Tiêu đề") String subject,
        @Schema(description = "Tin nhắn cuối cùng") String lastMessage,
        @Schema(description = "Thời điểm tin nhắn cuối") Instant lastMessageAt,
        @Schema(description = "Số tin nhắn chưa đọc") int unreadCount,
        @Schema(description = "Thời điểm tạo") Instant createdAt,
        @Schema(description = "Thời điểm cập nhật") Instant updatedAt,
        @Schema(description = "Nhà tour đang mở trang quản lý (kết nối thông báo thời gian thực)") boolean providerOnline,
        @Schema(description = "Thời gian nhà tour thường trả lời (phút, trung vị các lần trả lời gần đây; null = chưa đủ dữ liệu)") Integer providerReplyMinutes
) {

    public static ProviderConversationResponse fromEntity(ProviderConversation c,
                                                           String touristName,
                                                           String providerName,
                                                           String tourTitle,
                                                           String bookingCode,
                                                           String lastMessage,
                                                           int unreadCount,
                                                           boolean providerOnline,
                                                           Integer providerReplyMinutes) {
        if (c == null) return null;
        return ProviderConversationResponse.builder()
                .id(c.getId())
                .touristId(c.getTouristId())
                .touristName(touristName)
                .providerId(c.getProviderId())
                .providerName(providerName)
                .tourId(c.getTourId())
                .tourTitle(tourTitle)
                .bookingId(c.getBookingId())
                .bookingCode(bookingCode)
                .subject(c.getSubject())
                .lastMessage(lastMessage)
                .lastMessageAt(c.getLastMessageAt())
                .unreadCount(unreadCount)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .providerOnline(providerOnline)
                .providerReplyMinutes(providerReplyMinutes)
                .build();
    }
}