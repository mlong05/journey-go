package com.journeygo.modules.gamification.dto;

import com.journeygo.modules.gamification.entity.PointTransaction;
import com.journeygo.modules.gamification.entity.enums.PointTransactionType;
import lombok.Builder;

import java.time.Instant;

@Builder
public record PointTransactionResponse(
        Long id,
        Long userId,
        Integer amount,
        PointTransactionType transactionType,
        String referenceId,
        String description,
        Integer balanceAfter,
        Instant createdAt
) {
    public static PointTransactionResponse fromEntity(PointTransaction entity) {
        return PointTransactionResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .amount(entity.getAmount())
                .transactionType(entity.getTransactionType())
                .referenceId(entity.getReferenceId())
                .description(entity.getDescription())
                .balanceAfter(entity.getBalanceAfter())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
