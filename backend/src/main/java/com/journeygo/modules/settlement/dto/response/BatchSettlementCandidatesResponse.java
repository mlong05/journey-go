package com.journeygo.modules.settlement.dto.response;

import com.journeygo.modules.providerrevenue.dto.response.ProviderRevenueResponse;
import com.journeygo.modules.providerrevenue.entity.enums.DeferredReason;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;

/**
 * Ứng viên tất toán TỔNG cho cả sàn — xem trước trước khi tạo đợt.
 *
 * <p>Khác với {@link SettlementCandidatesResponse} (ứng viên của MỘT đối tác), bản này gom
 * mọi đối tác lại. Mỗi khoản doanh thu vẫn giữ đối tác sở hữu để Admin thấy rõ tiền sẽ
 * cộng vào ví ai.
 *
 * @param eligible     Các khoản đủ điều kiện của TẤT CẢ đối tác
 * @param held         Các khoản bị giữ lại kèm lý do
 * @param totals       Tổng số tiền của các khoản đủ điều kiện
 * @param partnerCount Số đối tác có khoản đủ điều kiện trong kỳ
 */
@Builder
@Schema(description = "Ứng viên tất toán tổng cho toàn bộ đối tác theo kỳ")
public record BatchSettlementCandidatesResponse(

        @Schema(description = "Kỳ doanh thu (yyyy-MM)") String revenuePeriod,
        @Schema(description = "Các khoản đủ điều kiện của toàn bộ đối tác") List<ProviderRevenueResponse> eligible,
        @Schema(description = "Các khoản bị giữ lại kèm lý do") List<HeldItem> held,
        @Schema(description = "Tổng số tiền của các khoản đủ điều kiện") Totals totals,
        @Schema(description = "Số đối tác có khoản đủ điều kiện trong kỳ") int partnerCount,
        @Schema(description = "Đợt tất toán tổng ĐANG CHỜ DUYỆT của kỳ này (nếu có)")
        OpenSettlement openSettlement
) {

    /**
     * Đợt tất toán tổng đang chờ duyệt — giải thích cho UI vì sao danh sách ứng viên rỗng.
     */
    @Builder
    @Schema(description = "Đợt tất toán tổng đang chờ duyệt")
    public record OpenSettlement(
            @Schema(description = "ID đợt tất toán") Long id,
            @Schema(description = "Mã đợt tất toán") String settlementCode,
            @Schema(description = "Trạng thái") com.journeygo.modules.settlement.entity.enums.SettlementStatus status,
            @Schema(description = "Tổng tiền đối tác nhận") BigDecimal settlementAmount,
            @Schema(description = "Tổng thanh toán ban đầu (khớp cột \"Tổng DT\" trong danh sách đợt)")
            BigDecimal grossAmount,
            @Schema(description = "Số khoản doanh thu trong đợt") Integer detailCount,
            @Schema(description = "Thời điểm tạo") java.time.Instant createdAt
    ) {
    }

    /**
     * Khoản bị giữ lại — kèm đối tác sở hữu để Admin biết vì sao bị loại.
     */
    @Builder
    @Schema(description = "Khoản doanh thu bị giữ lại")
    public record HeldItem(
            @Schema(description = "ID khoản doanh thu") Long revenueId,
            @Schema(description = "ID đối tác") Long providerProfileId,
            @Schema(description = "Tên đối tác") String providerName,
            @Schema(description = "ID booking") Long bookingId,
            @Schema(description = "Mã đơn đặt tour") String bookingCode,
            @Schema(description = "Kỳ doanh thu gốc") String revenuePeriod,
            @Schema(description = "Số tiền ProviderProfile được nhận") BigDecimal providerNetAmount,
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
            @Schema(description = "Tổng tiền ProviderProfile được nhận") BigDecimal settlementAmount,
            @Schema(description = "Tổng giảm giá voucher do NỀN TẢNG chịu") BigDecimal voucherPlatformAmount,
            @Schema(description = "Tổng giảm giá voucher do ĐỐI TÁC chịu") BigDecimal voucherPartnerAmount
    ) {
    }
}
