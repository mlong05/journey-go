package com.journeygo.modules.refund.scheduler;

import com.journeygo.modules.refund.entity.RefundRequest;
import com.journeygo.modules.refund.entity.enums.RefundMethod;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import com.journeygo.modules.refund.repository.RefundRequestRepository;
import com.journeygo.modules.refund.service.RefundService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Tác vụ nền kiểm tra trạng thái các yêu cầu Refund đang chờ kết quả từ VNPay.
 *
 * <p>UC-04 — "Backend kiểm tra kết quả tiếp theo qua cơ chế truy vấn hoặc thông báo mà VNPay hỗ trợ."
 *
 * <p>Nguyên tắc: KHÔNG tự động gửi lại yêu cầu hoàn tiền và KHÔNG tự động chuyển sang phương
 * thức thủ công. Nếu chưa xác minh được kết quả → giữ {@code REFUND_PROCESSING}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RefundStatusScheduler {

    /**
     * Khoảng thời gian tối thiểu giữa hai lần quét cùng một yêu cầu hoàn tiền.
     *
     * <p>Lớp bảo vệ thứ hai: kể cả khi cấu hình chu kỳ quét bị đặt sai (quá nhỏ) thì
     * mỗi yêu cầu hoàn tiền cũng không bị hỏi VNPay liên tục. Giá trị này là "sàn"
     * an toàn, độc lập với {@code app.finance.refund-status-check-interval-seconds}.
     */
    private static final Duration MIN_INTERVAL_BETWEEN_CHECKS = Duration.ofMinutes(1);

    private final RefundRequestRepository refundRepository;
    private final RefundService refundService;

    /** Thời điểm gần nhất đã quét từng yêu cầu hoàn tiền (id → thời điểm). */
    private final Map<Long, Instant> lastCheckedAt = new ConcurrentHashMap<>();

    /**
     * Chu kỳ quét trạng thái Refund đang chờ kết quả từ VNPay.
     *
     * <p>⚠️ Bắt buộc chỉ rõ {@code timeUnit = TimeUnit.SECONDS}. Nếu để mặc định,
     * Spring hiểu giá trị số thuần của {@code fixedDelayString} là **MILI-GIÂY**
     * ⇒ 300 nghĩa là 300ms ⇒ gọi VNPay liên tục, dồn dòng audit log trùng lặp
     * và làm cạn quota merchant API.
     */
    @Scheduled(fixedDelayString = "${app.finance.refund-status-check-interval-seconds:300}",
            initialDelayString = "${app.finance.refund-status-check-interval-seconds:300}",
            timeUnit = TimeUnit.SECONDS)
    public void refreshPendingRefunds() {
        try {
            List<RefundRequest> pending = refundRepository.findByStatusAndMethod(
                    RefundStatus.REFUND_PROCESSING, RefundMethod.VNPAY_API);
            if (pending.isEmpty()) {
                return;
            }

            int resolved = 0;
            for (RefundRequest refund : pending) {
                if (!shouldCheck(refund.getId())) {
                    continue;
                }
                try {
                    var response = refundService.refreshStatus(refund.getId());
                    if (response != null && response.status() == RefundStatus.REFUNDED) {
                        resolved++;
                    }
                } catch (Exception e) {
                    log.warn("[RefundStatus] Không kiểm tra được refund id={}: {}",
                            refund.getId(), e.getMessage());
                }
            }

            if (resolved > 0) {
                log.info("[RefundStatus] Đã xác minh {} yêu cầu hoàn tiền thành công", resolved);
            }
        } catch (Exception e) {
            log.error("[RefundStatus] Lỗi khi quét trạng thái refund: {}", e.getMessage(), e);
        }
    }

    /**
     * Kiểm tra có đủ thời gian giữa hai lần hỏi VNPay cho cùng một yêu cầu không.
     *
     * <p>Trả về {@code true} và đánh dấu thời điểm nếu được phép kiểm tra.
     */
    private boolean shouldCheck(Long refundId) {
        Instant now = Instant.now();
        Instant last = lastCheckedAt.get(refundId);
        if (last != null && last.plus(MIN_INTERVAL_BETWEEN_CHECKS).isAfter(now)) {
            return false;
        }
        lastCheckedAt.put(refundId, now);
        // Dọn bản ghi cũ để bản đồ không phình vô hạn.
        lastCheckedAt.entrySet().removeIf(e -> e.getValue().plus(MIN_INTERVAL_BETWEEN_CHECKS).isBefore(now));
        return true;
    }
}
