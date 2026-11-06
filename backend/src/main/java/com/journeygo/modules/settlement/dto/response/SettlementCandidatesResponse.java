package com.journeygo.modules.settlement.dto.response;

import com.journeygo.modules.providerrevenue.dto.response.ProviderRevenueResponse;
import com.journeygo.modules.providerrevenue.entity.enums.DeferredReason;
import com.journeygo.modules.settlement.entity.enums.SettlementStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Kết quả lọc ứng viên tất toán (Mục 7.4 bước 2 & 3 — chức năng "View Settlement Candidates").
 *
 * @param eligible       Các khoản đủ điều kiện — sẽ được đưa vào Settlement
 * @param held           Các khoản bị giữ lại kèm lý do rõ ràng
 * @param totals         Tổng số tiền của các khoản đủ điều kiện
 * @param openSettlement Đợt tất toán ĐANG MỞ (DRAFT) của cùng đối tác + kỳ.
 *                       Khi đợt này tồn tại, các khoản doanh thu đã bị chuyển sang
 *                       {@code IN_SETTLEMENT} nên {@code eligible} sẽ rỗng — UI cần
 *                       thông báo này để giải thích vì sao không có ứng viên.
 */
@Builder
@Schema(description = "Ứng viên tất toán của một đối tác theo kỳ")
public record SettlementCandidatesResponse(

        @Schema(description = "ID đối tác") Long providerProfileId,
        @Schema(description = "Kỳ doanh thu (yyyy-MM)") String revenuePeriod,
        @Schema(description = "Các khoản đủ điều kiện") List<ProviderRevenueResponse> eligible,
        @Schema(description = "Các khoản bị giữ lại kèm lý do") List<HeldItem> held,
        @Schema(description = "Tổng số tiền của các khoản đủ điều kiện") Totals totals,
        @Schema(description = "Đợt tất toán đang chờ duyệt của cùng đối tác + kỳ (nếu có)")
        OpenSettlement openSettlement
) {

    /**
     * Đợt tất toán đang mở — giải thích cho UI vì sao danh sách ứng viên rỗng.
     */
    @Builder
    @Schema(description = "Đợt tất toán đang chờ duyệt")
    public record OpenSettlement(
            @Schema(description = "ID đợt tất toán") Long id,
            @Schema(description = "Mã đợt tất toán") String settlementCode,
            @Schema(description = "Trạng thái") SettlementStatus status,
            @Schema(description = "Tổng tiền đối tác nhận") BigDecimal settlementAmount,
            @Schema(description = "Số khoản doanh thu trong đợt") Integer detailCount,
            @Schema(description = "Thời điểm tạo") Instant createdAt
    ) {
    }

    @Builder
    @Schema(description = "Khoản doanh thu bị giữ lại")
    public record HeldItem(
            @Schema(description = "ID khoản doanh thu") Long revenueId,
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
            @Schema(description = "Tổng tiền ProviderProfile được nhận") BigDecimal settlementAmount
    ) {
    }
}
