package com.journeygo.modules.settlement.dto.response;

import com.journeygo.modules.providerrevenue.entity.enums.DeferredReason;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;

/**
 * Khoản doanh thu BỊ GIỮ LẠI trong một kỳ tất toán — chưa đủ điều kiện nên không vào đợt.
 *
 * <p>Đây là phần Admin cần để "không bị mù" khi đợt được TỰ ĐỘNG tạo: mở đợt ra là thấy
 * ngay những khoản của chính kỳ đó đang bị đọng, kèm lý do cụ thể.
 *
 * <p><b>Vòng đời của khoản bị giữ:</b>
 * <ol>
 *   <li>Khoản thuộc kỳ K, chưa đủ điều kiện (VD: booking chưa hoàn thành trải nghiệm)
 *       ⇒ KHÔNG vào đợt của K, được ghi nhận ở đây với lý do.</li>
 *   <li>Khi kỳ K+1 (kỳ kế tiếp) đóng, hệ thống XÉT LẠI khoản này: nếu đã đủ điều kiện
 *       ⇒ gom vào đợt của K+1 và trả tiền cho đối tác. Nếu vẫn chưa đủ ⇒ giữ lại tiếp,
 *       chuyển sang kỳ K+2, ... cho tới khi đủ điều kiện.</li>
 * </ol>
 *
 * @param revenuePeriod Kỳ doanh thu mà các khoản này thuộc về
 * @param periodLabel   Nhãn kỳ cho hiển thị, VD: "01/10 – 10/10/2026"
 * @param held          Các khoản bị giữ lại kèm lý do
 * @param totalAmount   Tổng số tiền đối tác sẽ nhận nếu các khoản này đủ điều kiện
 * @param partnerCount  Số đối tác có khoản bị giữ lại
 * @param carriedTo     Kỳ kế tiếp mà các khoản này sẽ được xét lại (null ⇒ chưa xác định)
 */
@Builder
@Schema(description = "Khoản doanh thu bị giữ lại trong kỳ (chưa đủ điều kiện tất toán)")
public record SettlementHeldResponse(

        @Schema(description = "Kỳ doanh thu (yyyy-MM-D)") String revenuePeriod,
        @Schema(description = "Nhãn kỳ tất toán, VD: '01/10 – 10/10/2026'") String periodLabel,
        @Schema(description = "Các khoản bị giữ lại kèm lý do") List<HeldItem> held,
        @Schema(description = "Tổng số tiền đối tác sẽ nhận nếu các khoản này đủ điều kiện")
        BigDecimal totalAmount,
        @Schema(description = "Số đối tác có khoản bị giữ lại") int partnerCount,
        @Schema(description = "Kỳ kế tiếp sẽ xét lại các khoản này (yyyy-MM-D)") String carriedTo
) {

    /**
     * Một khoản bị giữ lại — kèm đối tác sở hữu và lý do cụ thể.
     *
     * @param carriedOver {@code true} ⇒ khoản thuộc Kỳ TRƯỚC, đã được đẩy sang kỳ này
     *                    để xét lại nhưng vẫn chưa đủ điều kiện ⇒ tiếp tục chờ.
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
            @Schema(description = "Tổng thanh toán ban đầu") BigDecimal grossAmount,
            @Schema(description = "Số tiền đối tác sẽ nhận") BigDecimal providerNetAmount,
            @Schema(description = "Lý do bị giữ lại") DeferredReason deferredReason,
            @Schema(description = "Chi tiết các điều kiện CHƯA đạt") List<String> failedChecks,
            @Schema(description = "Khoản được đẩy từ kỳ trước sang kỳ này và vẫn chưa đủ điều kiện")
            Boolean carriedOver
    ) {
    }
}
