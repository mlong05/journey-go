package com.journeygo.modules.settlement.repository;

import java.math.BigDecimal;

/**
 * Projection tổng hợp số tiền theo kỳ doanh thu cho các đợt tất toán đã duyệt.
 *
 * <p>Dùng cho bảng "Doanh thu nền tảng": gom theo {@code revenuePeriod} để biết
 * nền tảng thu được bao nhiêu trong từng kỳ tất toán.
 *
 * <p>Tên các getter (bỏ tiền tố {@code get}) PHẢI khớp với alias trong
 * {@link SettlementRepository#aggregateApprovedByPeriod()}.
 */
public interface ApprovedSettlementAggregate {

    /** Kỳ doanh thu (yyyy-MM). */
    String getRevenuePeriod();

    /** Tổng tiền khách đã thanh toán. */
    BigDecimal getGrossAmount();

    /** Tổng tiền đã hoàn khách. */
    BigDecimal getRefundAmount();

    /** Tổng hoa hồng nền tảng giữ lại. */
    BigDecimal getCommissionAmount();

    /** Tổng khoản điều chỉnh tài chính. */
    BigDecimal getAdjustmentAmount();

    /** Tổng tiền đã chi trả cho đối tác. */
    BigDecimal getSettlementAmount();

    /** Số đợt tất toán đã duyệt trong kỳ. */
    Long getSettlementCount();
}
