package com.journeygo.modules.refund.service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * Chính sách hoàn tiền cho nhóm "Lỗi khách hàng (huỷ tour)" — theo 3 BẬC thời gian.
 *
 * <p>Chính sách hiện hành:
 * <ul>
 *   <li>Từ 7 ngày trở lên trước khởi hành → hoàn <b>80%</b>.</li>
 *   <li>Từ 3 đến 6 ngày (72 giờ – 6 ngày) trước khởi hành → hoàn <b>50%</b>.</li>
 *   <li>Dưới 72 giờ (3 ngày) trước khởi hành → hoàn <b>0%</b>.</li>
 * </ul>
 *
 * <p><b>⚠️ Các bậc được tính theo SỐ GIỜ còn lại tính từ thời điểm bắt đầu ngày
 * trải nghiệm</b> (00:00 giờ Việt Nam của ngày trải nghiệm), KHÔNG phải theo
 * giờ khởi hành thực tế — khớp với cách backend tính cửa sổ no-show.
 *
 * <p><b>Vì sao tách riêng class này?</b> Tỷ lệ theo bậc là QUY TẮC NGHIỆP VỤ cố định
 * (không sửa được từ giao diện Admin) — tách ra để:
 * <ul>
 *   <li>Chỗ tính tiền ({@link RefundService}) và chỗ hiển thị cho khách
 *       (web + mobile) dùng CHUNG một nguồn sự thật.</li>
 *   <li>Tránh rải rác các hằng số 80/50/0 rải rác nhiều nơi.</li>
 * </ul>
 */
public final class PersonalRefundPolicy {

    /** Zone giờ dùng để xác định "ngày trải nghiệm" — khớp backend. */
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /** Mốc bậc cao nhất: từ 7 ngày trở lên trước khởi hành. */
    public static final int EARLY_CANCEL_DAYS = 7;

    /** Mốc bậc trung gian: từ 3 ngày (72 giờ) đến 6 ngày trước khởi hành. */
    public static final int MID_CANCEL_DAYS = 3;

    /** Mốc bậc thấp nhất: dưới 72 giờ (3 ngày) trước khởi hành → không hoàn. */
    public static final int LATE_CANCEL_HOURS = MID_CANCEL_DAYS * 24;

    /** Tỷ lệ hoàn khi hủy từ 7 ngày trở lên trước khởi hành. */
    public static final BigDecimal EARLY_RATE = new BigDecimal("0.80");

    /** Tỷ lệ hoàn khi hủy trong khoảng 72 giờ – 6 ngày trước khởi hành. */
    public static final BigDecimal MID_RATE = new BigDecimal("0.50");

    /** Tỷ lệ hoàn khi hủy quá muộn (< 72 giờ) hoặc không đến. */
    public static final BigDecimal LATE_RATE = BigDecimal.ZERO;

    private PersonalRefundPolicy() {
    }

    /**
     * Bậc chính sách áp dụng cho một thời điểm gửi yêu cầu.
     */
    public enum Tier {

        /** Từ 7 ngày trở lên trước khởi hành → hoàn 80%. */
        EARLY(7, EARLY_RATE, "Từ 7 ngày trở lên"),

        /** Từ 3 đến 6 ngày (72 giờ – 6 ngày) trước khởi hành → hoàn 50%. */
        MID(3, MID_RATE, "Từ 3 đến 6 ngày (72 giờ – 6 ngày)"),

        /** Dưới 72 giờ (3 ngày) trước khởi hành → hoàn 0%. */
        LATE(0, LATE_RATE, "Dưới 72 giờ (3 ngày)");

        /** Số ngày tối thiểu trước khởi hành để thuộc bậc này. */
        private final int minDays;

        /** Tỷ lệ hoàn của bậc. */
        private final BigDecimal rate;

        /** Nhãn điều kiện (tiếng Việt) — hiển thị cho khách. */
        private final String conditionLabel;

        Tier(int minDays, BigDecimal rate, String conditionLabel) {
            this.minDays = minDays;
            this.rate = rate;
            this.conditionLabel = conditionLabel;
        }

        public int getMinDays() {
            return minDays;
        }

        public BigDecimal getRate() {
            return rate;
        }

        public String getConditionLabel() {
            return conditionLabel;
        }
    }

    /**
     * Số giờ còn lại từ {@code requestTime} tới khi bắt đầu ngày trải nghiệm.
     *
     * @return số giờ (có thể âm nếu đã qua ngày trải nghiệm)
     */
    public static long hoursUntilExperience(LocalDate experienceDate, Instant requestTime) {
        if (experienceDate == null) {
            return Long.MAX_VALUE;
        }
        Instant startOfExperience = experienceDate.atStartOfDay(VIETNAM_ZONE).toInstant();
        Instant when = requestTime != null ? requestTime : Instant.now();
        return Duration.between(when, startOfExperience).toHours();
    }

    /**
     * Xác định bậc chính sách áp dụng cho nhóm cá nhân.
     *
     * <p>⚠️ Mốc so sánh là THỜI ĐIỂM KHÁCH GỞI YÊU CẦU ({@code requestTime}), KHÔNG phải
     * thời điểm Admin duyệt — nếu dùng "now" thì một yêu cầu hợp lệ gửi từ 7 ngày
     * trước sẽ bị tính thành 0% chỉ vì Admin duyệt chậm.
     *
     * @param experienceDate ngày trải nghiệm của tour
     * @param requestTime    thời điểm khách gửi yêu cầu (null = hiện tại)
     * @return bậc chính sách; nếu thiếu ngày trải nghiệm thì trả {@link Tier#EARLY}
     *         (bậc cao nhất — hành động bảo thủ về phía khách, Admin duyệt lại)
     */
    public static Tier tierOf(LocalDate experienceDate, Instant requestTime) {
        return tierOf(experienceDate, requestTime, LATE_CANCEL_HOURS);
    }

    /**
     * Xác định bậc chính sách — cho phép cấu hình mốc "không hoàn".
     *
     * <p>⚠️ Mốc {@code lateCancelHours} PHẢI khớp với
     * {@code FinanceProperties.effectiveRefundNoShowWindowHours()} (72 giờ mặc định)
     * — nếu không, số tiền backend tính sẽ lệch với bảng chính sách hiển thị cho
     * khách.
     *
     * @param experienceDate  ngày trải nghiệm của tour
     * @param requestTime     thời điểm khách gửi yêu cầu (null = hiện tại)
     * @param lateCancelHours số giờ trước khởi hành dưới đó ⇒ không hoàn
     * @return bậc chính sách
     */
    public static Tier tierOf(LocalDate experienceDate, Instant requestTime, int lateCancelHours) {
        if (experienceDate == null) {
            return Tier.EARLY;
        }
        long hoursLeft = hoursUntilExperience(experienceDate, requestTime);
        int lateThreshold = lateCancelHours > 0 ? lateCancelHours : LATE_CANCEL_HOURS;

        // Đã qua ngày trải nghiệm hoặc sắp tới dưới mốc "không hoàn" → bậc 0%.
        if (hoursLeft < lateThreshold) {
            return Tier.LATE;
        }
        // Từ mốc "không hoàn" tới dưới 7 ngày → bậc 50%.
        if (hoursLeft < EARLY_CANCEL_DAYS * 24) {
            return Tier.MID;
        }
        // Từ 7 ngày trở lên → bậc 80%.
        return Tier.EARLY;
    }

    /**
     * Tỷ lệ hoàn của nhóm cá nhân tại thời điểm gửi yêu cầu.
     */
    public static BigDecimal rateOf(LocalDate experienceDate, Instant requestTime) {
        return tierOf(experienceDate, requestTime).getRate();
    }

    /**
     * Tỷ lệ hoàn của nhóm cá nhân — cho phép cấu hình mốc "không hoàn".
     *
     * @param experienceDate  ngày trải nghiệm của tour
     * @param requestTime     thời điểm khách gửi yêu cầu (null = hiện tại)
     * @param lateCancelHours số giờ trước khởi hành dưới đó ⇒ không hoàn
     */
    public static BigDecimal rateOf(LocalDate experienceDate, Instant requestTime, int lateCancelHours) {
        return tierOf(experienceDate, requestTime, lateCancelHours).getRate();
    }

    /**
     * Danh sách 3 bậc (kèm nhãn + tỷ lệ) để hiển thị cho khách trên web/mobile.
     *
     * @return danh sách bậc theo thứ tự từ cao xuống thấp
     */
    public static List<Tier> tiers() {
        return List.of(Tier.EARLY, Tier.MID, Tier.LATE);
    }
}
