package com.journeygo.modules.wallet.dto.response;

import com.journeygo.modules.wallet.entity.WalletTransaction;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
@Schema(description = "Lịch sử giao dịch ví")
public record WalletTransactionResponse(

        @Schema(description = "ID giao dịch") Long id,
        @Schema(description = "ID ví") Long walletId,
        @Schema(description = "Loại giao dịch") WalletTransactionTypeValue transactionType,
        @Schema(description = "Chiều biến động") WalletDirectionValue direction,
        @Schema(description = "Số tiền (luôn dương)") BigDecimal amount,
        @Schema(description = "Số dư trước giao dịch") BigDecimal balanceBefore,
        @Schema(description = "Số dư sau giao dịch") BigDecimal balanceAfter,
        @Schema(description = "Loại nguồn phát sinh") String sourceType,
        @Schema(description = "ID nguồn phát sinh") Long sourceId,
        @Schema(description = "Trạng thái") String status,
        @Schema(description = "Người tạo") Long createdBy,
        @Schema(description = "Ghi chú") String note,
        @Schema(description = "Thời điểm tạo") Instant createdAt
) {
    /** Enum cục bộ để Swagger hiển thị rõ các giá trị hợp lệ. */
    public enum WalletTransactionTypeValue {
        SETTLEMENT_CREDIT,
        REFUND_ADJUSTMENT,
        MANUAL_ADJUSTMENT
    }

    /** Enum cục bộ để Swagger hiển thị rõ các giá trị hợp lệ. */
    public enum WalletDirectionValue {
        CREDIT,
        DEBIT
    }

    public static WalletTransactionResponse fromEntity(WalletTransaction t) {
        if (t == null) return null;
        return WalletTransactionResponse.builder()
                .id(t.getId())
                .walletId(t.getWallet() != null ? t.getWallet().getId() : null)
                .transactionType(t.getTransactionType() != null
                        ? WalletTransactionTypeValue.valueOf(t.getTransactionType().name()) : null)
                .direction(t.getDirection() != null
                        ? WalletDirectionValue.valueOf(t.getDirection().name()) : null)
                .amount(t.getAmount())
                .balanceBefore(t.getBalanceBefore())
                .balanceAfter(t.getBalanceAfter())
                .sourceType(t.getSourceType() != null ? t.getSourceType().name() : null)
                .sourceId(t.getSourceId())
                .status(t.getStatus() != null ? t.getStatus().name() : null)
                .createdBy(t.getCreatedBy() != null ? t.getCreatedBy().getId() : null)
                .note(t.getNote())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
