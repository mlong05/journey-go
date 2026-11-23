package com.journeygo.modules.settlement.scheduler;

import com.journeygo.modules.finance.config.FinanceProperties;
import com.journeygo.modules.settlement.service.BatchSettlementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Tác vụ nền TỰ ĐỘNG TẠO đợt tất toán khi kỳ 10 ngày vừa kết thúc.
 *
 * <p><b>Vì sao cần?</b>
 * Yêu cầu: "tự động tạo đợt tất toán — admin chỉ việc xem xét rồi duyệt".
 * Trước đây Admin phải TỰ chọn kỳ & bấm "Tạo đợt" cho từng tháng ⇒ chậm, dễ sót.
 * Nay tác vụ này tự quét các kỳ 10 ngày đã kết thúc và tạo bản nháp (trạng thái
 * {@code DRAFT}) ⇒ Admin mở màn "Tất toán doanh thu" là thấy đợt đã sẵn sàng, chỉ cần
 * đối chiếu rồi bấm Duyệt.
 *
 * <p><b>Chu kỳ tất toán (10 ngày):</b>
 * <ul>
 *   <li>Kỳ 1 — ngày 01 → 10 của tháng.</li>
 *   <li>Kỳ 2 — ngày 11 → 20 của tháng.</li>
 *   <li>Kỳ 3 — ngày 21 → ngày cuối tháng (8/9/10/11 ngày tuỳ tháng).</li>
 * </ul>
 *
 * <p><b>Quét theo lịch:</b> mỗi giờ (cron {@code 0 5 * * * *}) — đủ sớm để tiền về
 * đối tác trong ngày kế tiếp mà không dồn tải. Bên trong, tác vụ chỉ tạo đợt cho kỳ
 * ĐÃ KẾT THÚC và chỉ cho kỳ CHƯA CÓ đợt ⇒ chạy lại nhiều lần vẫn an toàn (idempotent).
 *
 * <p><b>Tắt/bật:</b> qua {@code app.finance.settlement-auto-create-enabled}
 * (mặc định {@code true}). Tắt ⇒ Admin vẫn tạo đợt thủ công như trước.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(
        prefix = "app.finance",
        name = "settlement-auto-create-enabled",
        havingValue = "true",
        matchIfMissing = true)
public class SettlementAutoCreateScheduler {

    private final BatchSettlementService batchSettlementService;
    private final FinanceProperties financeProperties;

    /**
     * Quét & tự động tạo đợt tất toán cho các kỳ 10 ngày đã kết thúc.
     *
     * <p>Cron {@code 0 5 * * * *} — chạy mỗi giờ, lệch 5 phút để không dồn vào phút 0
     * (thời điểm nhiều tác vụ nền khác cùng chạy).
     *
     * <p>Số kỳ tối đa xét lùi lấy từ {@code app.finance.settlement-auto-create-lookback-periods}
     * (mặc định 6 — đủ để bù cho trường hợp server tắt vài giờ).
     */
    @Scheduled(cron = "${app.finance.settlement-auto-create-cron:0 5 * * * *}")
    public void autoCreateSettlementBatches() {
        try {
            int lookback = financeProperties.getSettlementAutoCreateLookbackPeriods();
            int created = batchSettlementService.autoCreateBatchSettlements(lookback);
            if (created > 0) {
                log.info("[SettlementAutoCreate] Đã tự động tạo {} đợt tất toán — chờ Admin duyệt", created);
            }
        } catch (Exception e) {
            // Không để lỗi làm hỏng cả scheduler ⇒ chỉ log, lượt sau sẽ thử lại.
            log.error("[SettlementAutoCreate] Lỗi khi tự động tạo đợt tất toán: {}", e.getMessage(), e);
        }
    }

    /**
     * Chu kỳ quét hiện tại (giây) — dùng cho mô tả/monitoring.
     */
    public long scanIntervalSeconds() {
        return TimeUnit.HOURS.toSeconds(1);
    }
}
