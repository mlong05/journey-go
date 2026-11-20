package com.journeygo.modules.finance.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Cấu hình nghiệp vụ tài chính của JourneyGo.
 *
 * <p>Tất cả giá trị đều đọc từ biến môi trường / application.yml — KHÔNG hardcode.
 *
 * <p>Tham chiếu tài liệu "Booking - Payment - Refund - Wallet &amp; Settlement":
 * <ul>
 *   <li>Thời hạn gửi yêu cầu Refund: 24 giờ kể từ thời điểm thanh toán thành công đã xác minh.</li>
 *   <li>Tỷ lệ hoa hồng nền tảng mặc định khi ProviderProfile chưa có cấu hình riêng.</li>
 *   <li>Số phút cho phép tạo một đợt tất toán sau khi kỳ doanh thu kết thúc.</li>
 * </ul>
 */
@Component
@Getter
@Setter
@ConfigurationProperties(prefix = "app.finance")
public class FinanceProperties {

    /**
     * Thời hạn (giờ) để Tourist gửi yêu cầu Refund kể từ thời điểm thanh toán thành công
     * đã được xác minh. Mặc định 24 giờ theo tài liệu.
     */
    private int refundWindowHours = 24;

    /**
     * Số giờ trước ngày trải nghiệm mà yêu cầu hoàn tiền của nhóm cá nhân bị tính
     * tỷ lệ 0% (khách hủy quá muộn hoặc không xuất hiện — no-show).
     *
     * <p>Chính sách: "Hủy trong vòng 48 giờ hoặc không xuất hiện thì hoàn 0%".
     */
    private int refundNoShowWindowHours = 48;

    /**
     * Số giờ trước ngày trải nghiệm mà Tourist được gửi lại yêu cầu hoàn tiền
     * sau khi yêu cầu trước bị từ chối.
     *
     * <p>0 = KHÔNG cho gửi lại (chặt chẽ, an toàn tài chính).
     */
    private int refundResubmitHoursBeforeStart = 0;

    /**
     * Tỷ lệ hoa hồng nền tảng mặc định (0.20 = 20%) — dùng khi ProviderProfile chưa có cấu hình riêng.
     */
    private BigDecimal defaultCommissionRate = new BigDecimal("0.2000");

    /**
     * Tỷ lệ hoàn tiền cho lỗi từ Tourist / lý do cá nhân (0.50 = 50%).
     */
    private BigDecimal touristFaultRefundRate = new BigDecimal("0.50");

    /**
     * Tỷ lệ hoàn tiền cho lỗi từ nền tảng (1.00 = 100%).
     */
    private BigDecimal platformFaultRefundRate = BigDecimal.ONE;

    /**
     * Số phút sau khi kỳ doanh thu kết thúc mới được tạo đợt tất toán chính thức.
     * Mặc định 0 — cho phép tất toán ngay khi kỳ đã kết thúc.
     */
    private int settlementGraceMinutes = 0;

    /**
     * Có cho phép Admin tạo Settlement cho kỳ doanh thu chưa kết thúc hay không.
     * Mặc định false — theo tài liệu: "Chỉ cho phép tạo đợt tất toán chính thức cho kỳ đã kết thúc."
     */
    private boolean allowOpenPeriodSettlement = false;

    /**
     * Đặt tour vào ngày Provider chưa mở slot: true = tự mở slot với sức chứa
     * {@link #autoOpenSlotCapacity}; false = báo "chưa mở bán" như quy trình chặt chẽ.
     */
    private boolean autoOpenSlots = true;

    /** Sức chứa (số tour mỗi ngày) của slot được tự mở. */
    private int autoOpenSlotCapacity = 50;

    /**
     * Số giây giữa các lần quét hết hạn Booking (giây).
     */
    private long bookingExpiryScanIntervalSeconds = 60;

    /**
     * Số giây giữa các lần quét hết hạn Payment (giây).
     *
     * <p>Xem {@code PaymentExpiryScheduler}. Mặc định 60 giây.
     */
    private long paymentExpiryScanIntervalSeconds = 60;

    /**
     * Số giây "lướt an toàn" sau khi hạn thanh toán đã qua, trước khi đóng giao dịch
     * sang {@code EXPIRED} (giây). Mặc định 900 giây (15 phút).
     *
     * <p>── Vì sao cần khoảng lướt này? ──
     * Có thể khách ĐÃ thanh toán thành công ở VNPay trước hạn, nhưng callback/IPN
     * bị mất (tunnel chết, app bị kill…) ⇒ giao dịch treo ở PROCESSING dù tiền đã
     * vào tài khoản. Trong khoảng lướt này, tác vụ đối soá (QueryDR) có cơ hội xác
     * minh và chuyển giao dịch sang SUCCESS.
     *
     * <p>⚠️ Dù sao thì {@code EXPIRED} KHÔNG phải trạng thái cuối ⇒ callback đến
     * muộn vẫn được áp dụng bình thường ⇒ KHÔNG mất tiền khách.
     */
    private long paymentExpiryGraceSeconds = 900;

    /**
     * Số giây giữa các lần kiểm tra trạng thái Refund đang chờ kết quả từ VNPay (giây).
     */
    private long refundStatusCheckIntervalSeconds = 300;

    /**
     * Số giây giữa các lần đối soát lại giao dịch thanh toán còn "kẹt" (PENDING / PROCESSING).
     *
     * <p>Xem {@code PaymentReconciliationScheduler}. Mặc định 300 giây (5 phút).
     */
    private long paymentReconcileIntervalSeconds = 300;

    /**
     * Số giao dịch tối đa xử lý trong một lượt đối soát — giới hạn tải lên VNPay merchant API.
     */
    private int paymentReconcileBatchSize = 50;

    /**
     * Số giờ cho phép gửi lại yêu cầu Refund sau khi yêu cầu trước bị từ chối.
     *
     * <p>Tài liệu để ngỏ ("Quy tắc đề xuất: ... cần chốt liệu Tourist có được gửi lại
     * trong thời hạn 24 giờ còn lại hay không"). Mặc định 0 = KHÔNG cho gửi lại
     * (chặt chẽ, an toàn tài chính). Admin có thể cấu hình giá trị khác qua biến môi trường.
     */
    private int refundResubmitWindowHours = 0;

    /** Số giờ tối đa cho phép âm thầm dùng {@link #refundResubmitWindowHours}. */
    public int effectiveRefundResubmitWindowHours() {
        return Math.max(0, refundResubmitWindowHours);
    }

    /** Số giờ cửa sổ no-show — không bao giờ âm thầm. */
    public int effectiveRefundNoShowWindowHours() {
        return Math.max(0, refundNoShowWindowHours);
    }

    /** Số giờ cho phép gửi lại yêu cầu trước ngày trải nghiệm — không bao giờ âm thầm. */
    public int effectiveRefundResubmitHoursBeforeStart() {
        return Math.max(0, refundResubmitHoursBeforeStart);
    }
}
