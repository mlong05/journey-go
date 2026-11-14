package com.journeygo.modules.voucher.dto.response;

import com.journeygo.modules.voucher.entity.Voucher;
import com.journeygo.modules.voucher.entity.enums.DiscountType;
import com.journeygo.modules.voucher.entity.enums.VoucherScope;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
public record VoucherResponse(
        Long id,
        String code,
        String title,
        String description,
        VoucherScope voucherScope,
        Long partnerId,
        String partnerName,
        DiscountType discountType,
        BigDecimal discountValue,
        BigDecimal minOrderAmount,
        BigDecimal maxDiscountAmount,
        Integer pointsRequired,
        Integer totalQuantity,
        Integer remainingQuantity,
        Integer validDays,
        Instant startDate,
        Instant endDate,
        boolean active,
        Instant createdAt
) {
    public static VoucherResponse fromEntity(Voucher entity) {
        Long pId = null;
        String pName = null;
        if (entity.getPartner() != null) {
            pId = entity.getPartner().getId();
            pName = entity.getPartner().getProviderName();
        }

        return VoucherResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .voucherScope(entity.getVoucherScope())
                .partnerId(pId)
                .partnerName(pName)
                .discountType(entity.getDiscountType())
                .discountValue(entity.getDiscountValue())
                .minOrderAmount(entity.getMinOrderAmount())
                .maxDiscountAmount(entity.getMaxDiscountAmount())
                .pointsRequired(entity.getPointsRequired())
                .totalQuantity(entity.getTotalQuantity())
                .remainingQuantity(entity.getRemainingQuantity())
                .validDays(entity.getValidDays())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .active(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
