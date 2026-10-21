package com.journeygo.modules.gamification.dto;

import com.journeygo.modules.gamification.entity.Voucher;
import com.journeygo.modules.gamification.entity.enums.DiscountType;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
public record VoucherResponse(
        Long id,
        String code,
        String title,
        String description,
        DiscountType discountType,
        BigDecimal discountValue,
        BigDecimal minOrderAmount,
        BigDecimal maxDiscountAmount,
        Integer pointsRequired,
        Integer remainingQuantity,
        Integer validDays,
        Instant startDate,
        Instant endDate,
        boolean active
) {
    public static VoucherResponse fromEntity(Voucher entity) {
        return VoucherResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .discountType(entity.getDiscountType())
                .discountValue(entity.getDiscountValue())
                .minOrderAmount(entity.getMinOrderAmount())
                .maxDiscountAmount(entity.getMaxDiscountAmount())
                .pointsRequired(entity.getPointsRequired())
                .remainingQuantity(entity.getRemainingQuantity())
                .validDays(entity.getValidDays())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .active(entity.isActive())
                .build();
    }
}
