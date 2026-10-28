package com.journeygo.modules.partner.dto.response;

import com.journeygo.modules.partner.entity.Partner;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
@Schema(description = "Thông tin đối tác")
public record PartnerResponse(

        @Schema(description = "ID đối tác") Long id,
        @Schema(description = "ID user") Long userId,
        @Schema(description = "Email user") String email,
        @Schema(description = "Tên hiển thị") String fullName,
        @Schema(description = "Tên đối tác") String partnerName,
        @Schema(description = "Tỷ lệ hoa hồng nền tảng") BigDecimal commissionRate,
        @Schema(description = "Đang hoạt động") boolean active,
        @Schema(description = "Đã có Wallet chưa") boolean hasWallet,
        @Schema(description = "Thời điểm tạo") Instant createdAt
) {
    public static PartnerResponse fromEntity(Partner p, boolean hasWallet) {
        if (p == null) return null;
        return PartnerResponse.builder()
                .id(p.getId())
                .userId(p.getUser() != null ? p.getUser().getId() : null)
                .email(p.getUser() != null ? p.getUser().getEmail() : null)
                .fullName(p.getUser() != null ? p.getUser().getFullName() : null)
                .partnerName(p.getPartnerName())
                .commissionRate(p.getCommissionRate())
                .active(p.isActive())
                .hasWallet(hasWallet)
                .createdAt(p.getCreatedAt())
                .build();
    }
}
