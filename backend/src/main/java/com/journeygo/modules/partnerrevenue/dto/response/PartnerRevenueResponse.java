package com.journeygo.modules.partnerrevenue.dto.response;

import com.journeygo.modules.partnerrevenue.entity.PartnerRevenue;
import com.journeygo.modules.partnerrevenue.entity.enums.DeferredReason;
import com.journeygo.modules.partnerrevenue.entity.enums.PartnerRevenueStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
@Schema(description = "Thông tin khoản doanh thu Partner")
public record PartnerRevenueResponse(

        @Schema(description = "ID bản ghi doanh thu") Long id,
        @Schema(description = "ID partner") Long partnerId,
        @Schema(description = "Tên partner") String partnerName,
        @Schema(description = "ID booking") Long bookingId,
        @Schema(description = "Mã đơn") String bookingCode,
        @Schema(description = "ID payment") Long paymentId,
        @Schema(description = "Mã giao dịch thanh toán") String txnRef,
        @Schema(description = "Kỳ doanh thu (yyyy-MM) — theo tháng hoàn thành trải nghiệm") String revenuePeriod,
        @Schema(description = "Ngày hoàn thành trải nghiệm") java.time.LocalDate completedDate,
        @Schema(description = "Số tiền thanh toán thành công ban đầu") BigDecimal grossAmount,
        @Schema(description = "Tổng refund đã hoàn thành thành công") BigDecimal refundAmount,
        @Schema(description = "Tỷ lệ hoa hồng đã áp dụng") BigDecimal commissionRate,
        @Schema(description = "Hoa hồng nền tảng") BigDecimal commissionAmount,
        @Schema(description = "Tổng điều chỉnh được duyệt") BigDecimal adjustmentAmount,
        @Schema(description = "Số tiền Partner được nhận") BigDecimal partnerNetAmount,
        @Schema(description = "Trạng thái đủ tư cách tất toán") PartnerRevenueStatus status,
        @Schema(description = "Lý do chưa đủ điều kiện") DeferredReason deferredReason,
        @Schema(description = "ID settlement đang giữ khoản doanh thu") Long settlementId,
        @Schema(description = "Thời điểm lần đầu đủ điều kiện") Instant eligibleAt,
        @Schema(description = "Thời điểm được tất toán") Instant settledAt,
        @Schema(description = "Thời điểm tạo") Instant createdAt
) {
    public static PartnerRevenueResponse fromEntity(PartnerRevenue r) {
        if (r == null) return null;
        return PartnerRevenueResponse.builder()
                .id(r.getId())
                .partnerId(r.getPartner() != null ? r.getPartner().getId() : null)
                .partnerName(r.getPartner() != null ? r.getPartner().getPartnerName() : null)
                .bookingId(r.getBooking() != null ? r.getBooking().getId() : null)
                .bookingCode(r.getBooking() != null ? r.getBooking().getBookingCode() : null)
                .paymentId(r.getPayment() != null ? r.getPayment().getId() : null)
                .txnRef(r.getPayment() != null ? r.getPayment().getTxnRef() : null)
                .revenuePeriod(r.getRevenuePeriod())
                .completedDate(r.getCompletedDate())
                .grossAmount(r.getGrossAmount())
                .refundAmount(r.getRefundAmount())
                .commissionRate(r.getCommissionRate())
                .commissionAmount(r.getCommissionAmount())
                .adjustmentAmount(r.getAdjustmentAmount())
                .partnerNetAmount(r.getPartnerNetAmount())
                .status(r.getStatus())
                .deferredReason(r.getDeferredReason())
                .settlementId(r.getSettlementId())
                .eligibleAt(r.getEligibleAt())
                .settledAt(r.getSettledAt())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
