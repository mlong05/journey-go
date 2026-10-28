package com.journeygo.modules.settlement.dto.response;

import com.journeygo.modules.settlement.entity.FinancialAdjustment;
import com.journeygo.modules.settlement.entity.enums.FinancialAdjustmentStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
@Schema(description = "Khoản điều chỉnh tài chính")
public record FinancialAdjustmentResponse(

        @Schema(description = "ID điều chỉnh") Long id,
        @Schema(description = "ID đối tác") Long partnerId,
        @Schema(description = "Tên đối tác") String partnerName,
        @Schema(description = "ID refund gốc") Long refundRequestId,
        @Schema(description = "ID settlement gốc") Long sourceSettlementId,
        @Schema(description = "Số tiền điều chỉnh — dương = cộng, âm = trừ") BigDecimal amount,
        @Schema(description = "Loại tiền") String currency,
        @Schema(description = "Lý do") String reason,
        @Schema(description = "Trạng thái") FinancialAdjustmentStatus status,
        @Schema(description = "Người tạo") Long createdBy,
        @Schema(description = "Người duyệt") Long approvedBy,
        @Schema(description = "Thời điểm duyệt") Instant approvedAt,
        @Schema(description = "Thời điểm tạo") Instant createdAt
) {
    public static FinancialAdjustmentResponse fromEntity(FinancialAdjustment a) {
        if (a == null) return null;
        return FinancialAdjustmentResponse.builder()
                .id(a.getId())
                .partnerId(a.getPartner() != null ? a.getPartner().getId() : null)
                .partnerName(a.getPartner() != null ? a.getPartner().getPartnerName() : null)
                .refundRequestId(a.getRefundRequest() != null ? a.getRefundRequest().getId() : null)
                .sourceSettlementId(a.getSourceSettlementId())
                .amount(a.getAmount())
                .currency(a.getCurrency())
                .reason(a.getReason())
                .status(a.getStatus())
                .createdBy(a.getCreatedBy() != null ? a.getCreatedBy().getId() : null)
                .approvedBy(a.getApprovedBy() != null ? a.getApprovedBy().getId() : null)
                .approvedAt(a.getApprovedAt())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
