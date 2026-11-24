package com.journeygo.modules.settlement.dto.response;

import com.journeygo.modules.settlement.entity.Settlement;
import com.journeygo.modules.settlement.entity.SettlementPeriod;
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
        @Schema(description = "ID providerProfile") Long providerProfileId,
        @Schema(description = "Tên providerProfile") String providerName,
        @Schema(description = "Phạm vi đợt (PROVIDER = một đối tác, BATCH = tổng cả sàn)")
        com.journeygo.modules.settlement.entity.enums.SettlementScope scope,
        @Schema(description = "Số đối tác có trong đợt (1 với đợt của một đối tác)")
        Integer partnerCount,
        @Schema(description = "Kỳ doanh thu — chu kỳ 10 ngày (yyyy-MM-D), VD: 2026-10-1 = 01/10 → 10/10/2026")
        String revenuePeriod,
        @Schema(description = "Nhãn kỳ tất toán đầy đủ, VD: '01/10 – 10/10/2026'") String periodLabel,
        @Schema(description = "Ngày bắt đầu kỳ") LocalDate periodStart,
        @Schema(description = "Ngày kết thúc kỳ") LocalDate periodEnd,
        @Schema(description = "Tổng thanh toán ban đầu") BigDecimal grossAmount,
        @Schema(description = "Tổng refund thành công") BigDecimal refundAmount,
        @Schema(description = "Tổng hoa hồng") BigDecimal commissionAmount,
        @Schema(description = "Tổng điều chỉnh") BigDecimal adjustmentAmount,
        @Schema(description = "Tổng tiền ProviderProfile được nhận") BigDecimal settlementAmount,
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
                .providerProfileId(s.getProviderProfile() != null ? s.getProviderProfile().getId() : null)
                .providerName(s.getProviderProfile() != null ? s.getProviderProfile().getProviderName() : null)
                .scope(s.getScope())
                .partnerCount(s.getPartnerCount())
                .revenuePeriod(s.getRevenuePeriod())
                .periodLabel(periodLabelOf(s))
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

    /**
     * Nhãn kỳ tất toán cho UI.
     *
     * <p>Ưu tiên dùng {@code periodStart}/{@code periodEnd} (nguồn chuẩn của đợt) vì đợt tổng
     * có thể gom khoản doanh thu chuyển tiếp từ kỳ trước ⇒ nhãn phải mô tả CHÍNH ĐỢT,
     * không phải kỳ gốc của từng khoản.
     */
    private static String periodLabelOf(Settlement s) {
        if (s.getPeriodStart() != null && s.getPeriodEnd() != null) {
            return String.format("%02d/%02d – %02d/%02d/%04d",
                    s.getPeriodStart().getDayOfMonth(), s.getPeriodStart().getMonthValue(),
                    s.getPeriodEnd().getDayOfMonth(), s.getPeriodEnd().getMonthValue(),
                    s.getPeriodEnd().getYear());
        }
        SettlementPeriod period = SettlementPeriod.parseOrNull(s.getRevenuePeriod());
        return period != null ? period.toDisplayLabel() : s.getRevenuePeriod();
    }
}
