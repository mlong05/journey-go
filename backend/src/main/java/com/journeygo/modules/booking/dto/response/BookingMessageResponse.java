package com.journeygo.modules.booking.dto.response;

import com.journeygo.modules.booking.entity.BookingMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;

@Builder
@Schema(description = "Tin nhắn chat hỗ trợ của booking")
public record BookingMessageResponse(

        @Schema(description = "ID tin nhắn") Long id,
        @Schema(description = "ID người gửi") Long senderId,
        @Schema(description = "Họ tên người gửi") String senderName,
        @Schema(description = "Nội dung") String body,
        @Schema(description = "Thời điểm gửi") Instant createdAt,
        @Schema(description = "Đã đọc chưa") boolean read
) {

    public static BookingMessageResponse fromEntity(BookingMessage m, String senderName) {
        if (m == null) return null;
        return BookingMessageResponse.builder()
                .id(m.getId())
                .senderId(m.getSenderId())
                .senderName(senderName)
                .body(m.getBody())
                .createdAt(m.getCreatedAt())
                .read(m.isRead())
                .build();
    }

    /** Không có tên người gửi (dùng khi không cần tra cứu thêm). */
    public static BookingMessageResponse fromEntity(BookingMessage m) {
        return fromEntity(m, null);
    }
}
