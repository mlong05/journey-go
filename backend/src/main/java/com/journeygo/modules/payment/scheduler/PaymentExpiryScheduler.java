package com.journeygo.modules.payment.scheduler;

import com.journeygo.modules.finance.config.FinanceProperties;
import com.journeygo.modules.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Tác vụ nền đóng các giao dịch thanh toán ĐÃ QUÁ HẠN (UC-01 — Timeout).
 *
 * <p>── Vì sao cần tác vụ này? ──
 * Giao dịch VNPay có hạn thanh toán 10 phút (cố định theo {@code paymentDeadline}
 * của Booking — xem {@code PaymentService#initiatePayment}). Nếu khách mở trình
 * duyệt VNPay rồi bỏ đi (đóng tab, mất mạng, không quay lại app), giao dịch treo ở
 * {@code PENDING}/{@code PROCESSING} mãi mãi.
 *
 * <p>Trước đây KHÔNG có tác vụ nào đóng các giao dịch này:
 * <ul>
 *   <li>{@code BookingExpiryScheduler} chỉ chuyển BOOKING sang EXPIRED + giải phóng slot.</li>
 *   <li>{@code PaymentReconciliationScheduler} gọi QueryDR — nhưng QueryDR trên
 *       VNPay Sandbox LUÔN trả {@code vnp_ResponseCode=99} ⇒ không bao giờ xác minh
 *       được ⇒ không đóng được giao dịch treo.</li>
 * </ul>
 * ⇒ Giao dịch hiện "Đang xử lý" vô thời hạn trên trang Quản trị Tài chính dù hạn
 * thanh toán đã qua từ lâu (ví dụ: tạo lúc 20:15 ngày 15/11, hạn 20:25, nhưng tới
 * ngày 19/11 vẫn hiện "Đang xử lý").
 *
 * <p>⇒ Tác vụ này chuyển chúng sang {@code EXPIRED} — trạng thái đã có sẵn trong
 * enum {@code PaymentStatus} nhưng trước đây KHÔNG có code nào gọi tới.
 *
 * <p>⚠️ AN TOÀN TÀI CHÍNH: {@code EXPIRED} KHÔNG nằm trong
 * {@code PaymentStatus.isFinal()} ⇒ nếu callback/IPN của VNPay đến muộn (khách
 * thực tế đã thanh toán thành công ở cửa sổ trình duyệt cũ), kết quả vẫn được
 * áp dụng bình thường ⇒ KHÔNG mất tiền khách. Giao dịch đã bị đánh dấu EXPIRED
 * vẫn có thể được Admin "Truy vấn lại" với VNPay (nút trong modal chi tiết).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentExpiryScheduler {

    private final PaymentService paymentService;

    private final FinanceProperties financeProperties;

    /**
     * Quét & đóng giao dịch quá hạn thanh toán.
     *
     * <p>⚠️ Bắt buộc chỉ rõ {@code timeUnit = TimeUnit.SECONDS}. Nếu để mặc định,
     * Spring hiểu giá trị số thuần của {@code fixedDelayString} là **MILI-GIÂY**
     * ⇒ 60 nghĩa là 60ms ⇒ quét liên tục, gây tải DB.
     */
    @Scheduled(fixedDelayString = "${app.finance.payment-expiry-scan-interval-seconds:60}",
            initialDelayString = "${app.finance.payment-expiry-scan-interval-seconds:60}",
            timeUnit = TimeUnit.SECONDS)
    public void expireOverduePayments() {
        try {
            int expired = paymentService.expireOverduePayments();
            if (expired > 0) {
                log.info("[PaymentExpiry] Đã chuyển {} giao dịch quá hạn thanh toán sang EXPIRED", expired);
            }
        } catch (Exception e) {
            log.error("[PaymentExpiry] Lỗi khi quét giao dịch quá hạn: {}", e.getMessage(), e);
        }
    }

    /** Chu kỳ quét hiện tại (giây) — dùng cho mô tả/monitoring. */
    public long scanIntervalSeconds() {
        return financeProperties.getPaymentExpiryScanIntervalSeconds();
    }
}
