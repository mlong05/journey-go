package com.journeygo.modules.settlement.service;

import com.journeygo.modules.payment.entity.enums.PaymentStatus;
import com.journeygo.modules.payment.repository.PaymentRepository;
import com.journeygo.modules.refund.repository.RefundRequestRepository;
import com.journeygo.modules.settlement.dto.response.FinanceSummaryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Tổng hợp số liệu tài chính cho tab "Tài chính &amp; Thanh toán" (ADMIN).
 *
 * <p>4 ô chỉ số:
 * <ul>
 *   <li><b>Giao dịch thành công</b> — số lượng đơn đã thanh toán (Payment SUCCESS).</li>
 *   <li><b>Tổng tiền giao dịch</b> — giá trị gốc ban đầu của các giao dịch thành công
 *       (= số tiền khách trả + phần voucher đã giảm).</li>
 *   <li><b>Tổng tiền đã hoàn</b> — tổng số tiền đã hoàn trả cho khách (Refund REFUNDED).</li>
 *   <li><b>Thực thu nền tảng</b> — dòng tiền thực tế nền tảng nhận được
 *       (= tổng tiền giao dịch − tổng tiền đã hoàn).</li>
 * </ul>
 *
 * <p>⚠️ <b>Thực thu nền tảng KHÔNG trừ phần % chia cho đối tác.</b>
 * Đây là dòng tiền nền tảng thực sự thu được từ khách; phần chia cho đối tác là
 * chi phí vận hành, được thể hiện ở tab "Tất toán doanh thu" (ô "Doanh thu đối tác").
 * Nếu trừ cả ở đây thì số liệu ở hai tab mâu thuẫn nhau và Admin không còn
 * đối chiếu được dòng tiền thực tế của sàn.
 *
 * <p>⚠️ Số liệu là TOÀN HỆ THỐNG — không phụ thuộc bộ lọc/phân trang đang xem.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FinanceSummaryService {

    private final PaymentRepository paymentRepository;
    private final RefundRequestRepository refundRepository;

    @Transactional(readOnly = true)
    public FinanceSummaryResponse getSummary() {
        // 1 — Giao dịch thành công: số lượng đơn đã thanh toán.
        long successCount = paymentRepository.countByStatus(PaymentStatus.SUCCESS);

        // 2 — Tổng tiền giao dịch: giá trị GỐC BAN ĐẦU (trước khi trừ voucher).
        //    paidTotal = số tiền khách THỰC TRẢ (đã trừ voucher).
        BigDecimal paidTotal = nz(paymentRepository.sumAmountByStatus(PaymentStatus.SUCCESS));
        BigDecimal voucherTotal = nz(paymentRepository.sumVoucherDiscountByStatus(PaymentStatus.SUCCESS));
        BigDecimal totalTransaction = paidTotal.add(voucherTotal);

        // 3 — Tổng tiền đã hoàn trả cho khách.
        BigDecimal totalRefunded = nz(refundRepository.sumTotalRefundedAmount());

        // 4 — Thực thu nền tảng = dòng tiền khách trả − voucher − đã hoàn.
        //    (Tổng tiền giao dịch đã bao gồm voucher ⇒ trừ thêm voucher sẽ
        //     tính trùng. Công thức tương đương: paidTotal − totalRefunded.)
        //
        //    ⚠️ KHÔNG trừ phần % chia cho đối tác — đó là chi phí vận hành,
        //    thuộc về tab "Tất toán doanh thu", không phải dòng tiền thực thu.
        BigDecimal netPlatform = totalTransaction.subtract(voucherTotal).subtract(totalRefunded);

        return FinanceSummaryResponse.builder()
                .successCount(successCount)
                .totalTransactionAmount(totalTransaction)
                .totalDiscountAmount(voucherTotal)
                .totalRefundedAmount(totalRefunded)
                .netPlatformRevenue(netPlatform)
                .build();
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
