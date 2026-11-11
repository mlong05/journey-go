package com.journeygo.modules.tour.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

/**
 * Số chỗ còn theo từng ngày trải nghiệm của một tour.
 *
 * <p>Dùng cho màn "Đặt tour" của du khách (web + mobile) để hiển thị
 * {@code Số chỗ còn — Còn N chỗ} và chặn chọn vượt sức chứa thực tế.
 *
 * <p>Khái niệm "chỗ" theo tài liệu "Đặt - Thanh toán tour":
 * <ul>
 *   <li>Mỗi hành khách có {@code countsTowardSlot = TRUE} mới chiếm 1 chỗ
 *       (em bé theo cấu hình đối tác thường đi cùng và không tính slot).</li>
 *   <li>Số chỗ còn = {@code capacity - bookedCount} của slot của ngày đó.</li>
 * </ul>
 */
@Builder
@Schema(description = "Số chỗ còn theo ngày trải nghiệm của tour")
public record TourSlotAvailabilityResponse(

        @Schema(description = "ID tour") Long tourId,
        @Schema(description = "true = tour luồng 5 bước (slot theo ngày khởi hành)")
        boolean wizardTour,
        @Schema(description = "Danh sách ngày kèm số chỗ còn") List<DateAvailability> dates
) {

    /**
     * Số chỗ còn của một ngày.
     *
     * @param date        ngày trải nghiệm
     * @param capacity    tổng số chỗ của ngày đó (null nếu ngày không mở bán)
     * @param bookedCount số chỗ đã được giữ
     * @param remaining   số chỗ còn = capacity - bookedCount
     * @param available   có đặt được ngày này không (còn chỗ && ngày trong tương lai)
     */
    @Builder
    @Schema(description = "Số chỗ còn của một ngày")
    public record DateAvailability(
            LocalDate date,
            Integer capacity,
            Integer bookedCount,
            Integer remaining,
            boolean available
    ) {
    }
}
