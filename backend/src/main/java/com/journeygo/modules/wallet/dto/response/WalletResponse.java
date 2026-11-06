package com.journeygo.modules.wallet.dto.response;

import com.journeygo.modules.wallet.entity.Wallet;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
@Schema(description = "Thông tin ví nội bộ của ProviderProfile")
public record WalletResponse(

        @Schema(description = "ID ví") Long id,
        @Schema(description = "ID providerProfile") Long providerProfileId,
        @Schema(description = "Tên providerProfile") String providerName,
        @Schema(description = "Số dư đã được tất toán (VND)") BigDecimal balance,
        @Schema(description = "Loại tiền") String currency,
        @Schema(description = "Thời điểm tạo") Instant createdAt,
        @Schema(description = "Thời điểm cập nhật") Instant updatedAt
) {
    public static WalletResponse fromEntity(Wallet w) {
        if (w == null) return null;
        return WalletResponse.builder()
                .id(w.getId())
                .providerProfileId(w.getProviderProfile() != null ? w.getProviderProfile().getId() : null)
                .providerName(w.getProviderProfile() != null ? w.getProviderProfile().getProviderName() : null)
                .balance(w.getBalance())
                .currency(w.getCurrency())
                .createdAt(w.getCreatedAt())
                .updatedAt(w.getUpdatedAt())
                .build();
    }
}
