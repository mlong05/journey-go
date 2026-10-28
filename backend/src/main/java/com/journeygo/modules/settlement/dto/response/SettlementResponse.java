package com.journeygo.modules.settlement.dto.response;

import com.journeygo.modules.settlement.entity.Settlement;
import com.journeygo.modules.settlement.entity.enums.SettlementStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Builder
@Schema(description = "Thông tin đợt tất toán")
public record SettlementResponse(

        @Schema(description = "ID settlement") Long id,
        @Schema(description = "Mã settlement") String settlementCode,
        @Schema(description = "ID partner") Long partnerId,
        @Schema(description = "Tên partner") String partnerName,
        @Schema(description = "Kỳ doanh thu (yyyy-MM)") String revenuePeriod,
        @Schema(description = "Ngày bắt đầu kỳ") LocalDate periodStart,
        @Schema(description = "Ngày kết thúc kỳ") LocalDate periodEnd,
        @Schema(description = "Tổng thanh toán ban đầu") BigDecimal grossAmount,
        @Schema(description = "Tổng refund thành công") BigDecimal refundAmount,
        @Schema(description = "Tổng hoa hồng") BigDecimal commissionAmount,
        @Schema(description = "Tổng điều chỉnh") BigDecimal adjustmentAmount,
        @Schema(description = "Tổng tiền Partner được nhận") BigDecimal settlementAmount,
        @Schema(description = "Trạng thái") SettlementStatus status,
        @Schema(description = "Admin tạo") Long createdBy,
        @Schema(description = "Admin duyệt") Long approvedBy,
        @Schema(description = "Thời điểm tạo") Instant createdAt,
        @Schema(description = "Thời điểm duyệt") Instant approvedAt,
        @Schema(description = "Lý do từ chối / hủy") String rejectionReason,
        @Schema(description = "Ghi chú đối soát") String note,
        @Schema(description = "Số khoản doanh thu được chọn") Integer detailCount
) {
    public static SettlementResponse fromEntity(Settlement s) {
        if (s == null) return null;
        return SettlementResponse.builder()
                .id(s.getId())
                .settlementCode(s.getSettlementCode())
                .partnerId(s.getPartner() != null ? s.getPartner().getId() : null)
                .partnerName(s.getPartner() != null ? s.getPartner().getPartnerName() : null)
                .revenuePeriod(s.getRevenuePeriod())
                .periodStart(s.getPeriodStart())
                .periodEnd(s.getPeriodEnd())
                .grossAmount(s.getGrossAmount())
                .refundAmount(s.getRefundAmount())
                .commissionAmount(s.getCommissionAmount())
                .adjustmentAmount(s.getAdjustmentAmount())
                .settlementAmount(s.getSettlementAmount())
                .status(s.getStatus())
                .createdBy(s.getCreatedBy() != null ? s.getCreatedBy().getId() : null)
                .approvedBy(s.getApprovedBy() != null ? s.getApprovedBy().getId() : null)
                .createdAt(s.getCreatedAt())
                .approvedAt(s.getApprovedAt())
                .rejectionReason(s.getRejectionReason())
                .note(s.getNote())
                .build();
    }
}
