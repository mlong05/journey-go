package com.journeygo.modules.refund.event;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Sự kiện Refund đã hoàn tất thành công (đã xác minh).
 *
 * <p>Được phát ra khi:
 * <ul>
 *   <li>VNPay xác nhận giao dịch hoàn tiền thành công, hoặc</li>
 *   <li>Admin xác nhận đã chuyển khoản thủ công kèm bằng chứng.</li>
 * </ul>
 *
 * <p>Người nhận (Partner Revenue / Settlement) dùng sự kiện này để:
 * <ul>
 *   <li>Tính lại doanh thu Partner trước khi xét tất toán.</li>
 *   <li>Nếu Settlement đã được duyệt → tạo khoản điều chỉnh tài chính riêng
 *       (không sửa lịch sử đã duyệt).</li>
 * </ul>
 *
 * @param refundId      ID yêu cầu hoàn tiền
 * @param paymentId     ID payment gốc
 * @param bookingId     ID booking gốc
 * @param refundedAmount Số tiền đã hoàn thành thành công
 * @param resolvedAt    Thời điểm xác minh kết quả cuối cùng
 */
public record RefundCompletedEvent(Long refundId, Long paymentId, Long bookingId,
                                    BigDecimal refundedAmount, Instant resolvedAt) {
}
