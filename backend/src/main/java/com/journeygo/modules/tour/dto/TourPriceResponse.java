package com.journeygo.modules.tour.dto;

import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.TourPrice;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;

/**
 * Giá vé của một tour theo loại khách.
 *
 * <p>Tour luồng 5 bước định nghĩa giá theo loại khách (người lớn / trẻ em / trẻ nhỏ / em bé)
 * thay vì theo trải nghiệm. Giá (kể cả 0đ) và việc tính chỗ do đối tác khai báo.
 */
@Builder
@Schema(description = "Giá vé theo loại khách")
public record TourPriceResponse(

        @Schema(description = "Loại khách: ADULT | CHILD | TODDLER | INFANT") GuestType guestType,
        @Schema(description = "Nhãn loại khách (tiếng Việt)") String guestTypeLabel,
        @Schema(description = "Khoảng tuổi áp dụng") String ageRange,
        @Schema(description = "Giá vé (VND)") BigDecimal price,
        @Schema(description = "Loại khách này có chiếm 1 chỗ trong slot hay không") boolean countsTowardSlot,
        @Schema(description = "Miễn phí (đối tác đặt giá 0đ)") boolean alwaysFree
) {

    public static TourPriceResponse fromEntity(TourPrice p) {
        if (p == null) {
            return null;
        }
        GuestType g = p.getGuestType();
        return TourPriceResponse.builder()
                .guestType(g)
                .guestTypeLabel(g != null ? g.getLabel() : null)
                .ageRange(g != null ? g.getAgeRange() : null)
                .price(p.getPrice())
                .countsTowardSlot(p.isCountsTowardSlot())
                .alwaysFree(p.getPrice() != null && p.getPrice().signum() == 0)
                .build();
    }
}
