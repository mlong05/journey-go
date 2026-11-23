package com.journeygo.modules.booking.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Trang tin nhắn hỗ trợ của một booking (phân trang kiểu "cuộn lên để load thêm").
 *
 * <p>⚠️ Cùng ngữ nghĩa với {@code ProviderMessagePageResponse} của module
 * provider-chat — đây là cùng một kênh liên lạc, chỉ khác lớp vỏ DTO.
 *
 * @param items      Tin nhắn trong trang này (cũ → mới)
 * @param hasMore    Còn tin cũ hơn nữa không
 * @param nextCursor Id tin cũ nhất trong trang (null = hết dữ liệu)
 * @param totalCount Tổng số tin nhắn của booking
 */
@Schema(description = "Trang tin nhắn hỗ trợ của booking (cuộn lên để load thêm)")
public record BookingMessagePageResponse(
        @Schema(description = "Tin nhắn trong trang này (cũ → mới)") List<BookingMessageResponse> items,
        @Schema(description = "Còn tin cũ hơn nữa không") boolean hasMore,
        @Schema(description = "Id tin cũ nhất trong trang (null = hết dữ liệu)") Long nextCursor,
        @Schema(description = "Tổng số tin nhắn của booking") long totalCount
) {
}
