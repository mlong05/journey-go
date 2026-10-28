package com.journeygo.modules.settlement.dto.response;

import com.journeygo.modules.partnerrevenue.dto.response.PartnerRevenueResponse;
import com.journeygo.modules.partnerrevenue.entity.enums.DeferredReason;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;

/**
 * Kết quả lọc ứng viên tất toán (Mục 7.4 bước 2 & 3 — chức năng "View Settlement Candidates").
 *
 * @param eligible  Các khoản đủ điều kiện — sẽ được đưa vào Settlement
 * @param held      Các khoản bị giữ lại kèm lý do rõ ràng
 * @param totals    Tổng số tiền của các khoản đủ điều kiện
 */
@Builder
@Schema(description = "Ứng viên tất toán của một đối tác theo kỳ")
public record SettlementCandidatesResponse(

        @Schema(description = "ID đối tác") Long partnerId,
        @Schema(description = "Kỳ doanh thu (yyyy-MM)") String revenuePeriod,
        @Schema(description = "Các khoản đủ điều kiện") List<PartnerRevenueResponse> eligible,
        @Schema(description = "Các khoản bị giữ lại kèm lý do") List<HeldItem> held,
        @Schema(description = "Tổng số tiền của các khoản đủ điều kiện") Totals totals
) {

    @Builder
    @Schema(description = "Khoản doanh thu bị giữ lại")
    public record HeldItem(
            @Schema(description = "ID khoản doanh thu") Long revenueId,
            @Schema(description = "ID booking") Long bookingId,
            @Schema(description = "Kỳ doanh thu gốc") String revenuePeriod,
            @Schema(description = "Số tiền Partner được nhận") BigDecimal partnerNetAmount,
            @Schema(description = "Lý do bị giữ lại") DeferredReason deferredReason
    ) {
    }

    @Builder
    @Schema(description = "Tổng số tiền")
    public record Totals(
            @Schema(description = "Tổng thanh toán ban đầu") BigDecimal grossAmount,
            @Schema(description = "Tổng refund thành công") BigDecimal refundAmount,
            @Schema(description = "Tổng hoa hồng") BigDecimal commissionAmount,
            @Schema(description = "Tổng điều chỉnh") BigDecimal adjustmentAmount,
            @Schema(description = "Tổng tiền Partner được nhận") BigDecimal settlementAmount
    ) {
    }
}
