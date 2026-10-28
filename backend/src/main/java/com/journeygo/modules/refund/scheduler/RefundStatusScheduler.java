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

import java.util.List;

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

    private final RefundRequestRepository refundRepository;
    private final RefundService refundService;

    @Scheduled(fixedDelayString = "${app.finance.refund-status-check-interval-seconds:300}",
            initialDelayString = "${app.finance.refund-status-check-interval-seconds:300}")
    public void refreshPendingRefunds() {
        try {
            List<RefundRequest> pending = refundRepository.findByStatusAndMethod(
                    RefundStatus.REFUND_PROCESSING, RefundMethod.VNPAY_API);
            if (pending.isEmpty()) {
                return;
            }

            int resolved = 0;
            for (RefundRequest refund : pending) {
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
}
