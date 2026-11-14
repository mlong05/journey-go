package com.journeygo.modules.gamification.dto;

import com.journeygo.modules.gamification.entity.UserVoucher;
import com.journeygo.modules.gamification.entity.enums.UserVoucherStatus;
import lombok.Builder;

import java.time.Instant;
import java.time.LocalDate;

@Builder
public record UserVoucherResponse(
        Long id,
        Long userId,
        Long voucherId,
        String voucherCode,
        String voucherTitle,
        String userVoucherCode,
        Integer pointsSpent,
        UserVoucherStatus status,
        Instant redeemedAt,
        LocalDate expiryDate,
        Instant usedAt
) {
    public static UserVoucherResponse fromEntity(UserVoucher entity) {
        return UserVoucherResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .voucherId(entity.getVoucher().getId())
                .voucherCode(entity.getVoucher().getCode())
                .voucherTitle(entity.getVoucher().getTitle())
                .userVoucherCode(entity.getUserVoucherCode())
                .pointsSpent(entity.getPointsSpent())
                .status(entity.getStatus())
                .redeemedAt(entity.getRedeemedAt())
                .expiryDate(entity.getExpiryDate())
                .usedAt(entity.getUsedAt())
                .build();
    }
}
