package com.journeygo.modules.wallet.dto.response;

import com.journeygo.modules.wallet.entity.Wallet;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
@Schema(description = "Thông tin ví nội bộ của Partner")
public record WalletResponse(

        @Schema(description = "ID ví") Long id,
        @Schema(description = "ID partner") Long partnerId,
        @Schema(description = "Tên partner") String partnerName,
        @Schema(description = "Số dư đã được tất toán (VND)") BigDecimal balance,
        @Schema(description = "Loại tiền") String currency,
        @Schema(description = "Thời điểm tạo") Instant createdAt,
        @Schema(description = "Thời điểm cập nhật") Instant updatedAt
) {
    public static WalletResponse fromEntity(Wallet w) {
        if (w == null) return null;
        return WalletResponse.builder()
                .id(w.getId())
                .partnerId(w.getPartner() != null ? w.getPartner().getId() : null)
                .partnerName(w.getPartner() != null ? w.getPartner().getPartnerName() : null)
                .balance(w.getBalance())
                .currency(w.getCurrency())
                .createdAt(w.getCreatedAt())
                .updatedAt(w.getUpdatedAt())
                .build();
    }
}
