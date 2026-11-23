package com.journeygo.modules.providerchat.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Trang tin nhắn của một cuộc trò chuyện (phân trang kiểu "cuộn lên để load thêm").
 *
 * <p>⚠️ Thiết kế:
 * <ul>
 *   <li>{@code items} — theo thứ tự thời gian TĂNG dần (tin cũ ở trên, tin mới ở dưới)
 *       ⇒ frontend render thẳng, không cần đảo.</li>
 *   <li>{@code hasMore} — còn tin cũ hơn nữa không? Khi {@code false} ⇒ đã tới
 *       đầu cuộc trò chuyện, frontend hiện "bạn đã xem hết lịch sử".</li>
 *   <li>{@code nextCursor} — id của tin CŨ NHẤT trong trang. Lần sau gọi với
 *       {@code beforeId = nextCursor} để lấy tin cũ hơn. Null khi đã hết dữ liệu.</li>
 * </ul>
 *
 * @param items      Tin nhắn trong trang này (cũ → mới)
 * @param hasMore    Còn tin cũ hơn nữa không
 * @param nextCursor Id tin cũ nhất trong trang (null = hết dữ liệu)
 * @param totalCount Tổng số tin nhắn của cuộc trò chuyện (để hiển thị "x / y tin")
 */
@Schema(description = "Trang tin nhắn của cuộc trò chuyện (cuộn lên để load thêm)")
public record ProviderMessagePageResponse(
        @Schema(description = "Tin nhắn trong trang này (cũ → mới)") List<ProviderMessageResponse> items,
        @Schema(description = "Còn tin cũ hơn nữa không") boolean hasMore,
        @Schema(description = "Id tin cũ nhất trong trang (null = hết dữ liệu)") Long nextCursor,
        @Schema(description = "Tổng số tin nhắn của cuộc trò chuyện") long totalCount
) {
}
