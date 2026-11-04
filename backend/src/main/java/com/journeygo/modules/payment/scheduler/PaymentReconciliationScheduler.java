package com.journeygo.modules.payment.scheduler;

import com.journeygo.modules.finance.config.FinanceProperties;
import com.journeygo.modules.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Tác vụ nền đối soát lại các giao dịch thanh toán còn "kẹt" (PENDING / PROCESSING).
 *
 * <p>── Vì sao cần? ──
 * Giao dịch có thể kẹt ở PROCESSING vô thời hạn khi khách ĐÃ thanh toán thành công
 * nhưng backend không nhận được kết quả:
 * <ul>
 *   <li>IPN không tới (tunnel/ngrok chết, hoặc chưa khai báo IPN URL trong VNPay Admin),</li>
 *   <li>app bị kill nên deep link không mở được ⇒ {@code /payments/return-result}
 *       không được gọi tới backend,</li>
 *   <li>request gửi lên backend bị từ chối (415 Unsupported Media Type, timeout…).</li>
 * </ul>
 * Khi đó đơn vẫn hiện nút "Thanh toán" dù tiền ĐÃ vào tài khoản — khách bấm lại sẽ
 * bị báo "chưa xác minh được kết quả giao dịch trước".
 *
 * <p>Tác vụ này quét lại các giao dịch kẹt và hỏi VNPay (QueryDR) để xác minh.
 *
 * <p>⚠️ Lưu ý quan trọng: trên <b>VNPay Sandbox</b>, lệnh QueryDR luôn trả
 * {@code vnp_ResponseCode=99} ("Unexpected error") ⇒ tác vụ này KHÔNG giải quyết được
 * gốc rễ trên Sandbox. Nguyên nhân gốc rễ đã được xử lý ở tầng giao thức:
 * Return URL của MOBILE giờ trỏ về {@code /payments/return-page} (HTTPS) để backend
 * xác minh + ghi nhận SUCCESS TRƯỚC khi chuyển hướng về app.
 *
 * <p>Tác vụ này là "lướt an toàn" cho môi trường thật (nơi QueryDR hoạt động) và
 * giúp phát hiện sớm các giao dịch cần Admin đối soát thủ công.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentReconciliationScheduler {

    private final PaymentService paymentService;

    private final FinanceProperties financeProperties;

    /**
     * Quét & đối soát giao dịch kẹt.
     *
     * <p>⚠️ Bắt buộc chỉ rõ {@code timeUnit = TimeUnit.SECONDS}. Nếu để mặc định,
     * Spring hiểu giá trị số thuần của {@code fixedDelayString} là **MILI-GIÂY**
     * ⇒ 300 nghĩa là 300ms ⇒ gọi VNPay liên tục, dồn dòng log trùng lặp và có thể
     * làm cạn quota merchant API.
     */
    @Scheduled(fixedDelayString = "${app.finance.payment-reconcile-interval-seconds:300}",
            initialDelayString = "${app.finance.payment-reconcile-interval-seconds:300}",
            timeUnit = TimeUnit.SECONDS)
    public void reconcileStuckPayments() {
        try {
            int resolved = paymentService.reconcileStuckPayments(
                    financeProperties.getPaymentReconcileBatchSize());
            if (resolved > 0) {
                log.info("[PaymentReconcile] Đã xác minh lại {} giao dịch thành công.", resolved);
            }
        } catch (Exception e) {
            log.error("[PaymentReconcile] Lỗi khi đối soát giao dịch kẹt: {}", e.getMessage(), e);
        }
    }
}
