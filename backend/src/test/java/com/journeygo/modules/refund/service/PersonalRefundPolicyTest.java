package com.journeygo.modules.refund.service;

import com.journeygo.modules.refund.entity.enums.RefundReason;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test chính sách hoàn tiền nhóm "Lỗi khách hàng (huỷ tour)" — 3 BẬC.
 *
 * <p>Chính sách:
 * <ul>
 *   <li>Từ 7 ngày trở lên                  → 80%</li>
 *   <li>Từ 3 đến 6 ngày (72 giờ – 6 ngày) → 50%</li>
 *   <li>Dưới 72 giờ (3 ngày)               → 0%</li>
 * </ul>
 */
class PersonalRefundPolicyTest {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /** Ngày trải nghiệm dùng chung cho các test. */
    private static final LocalDate EXPERIENCE_DATE = LocalDate.of(2026, 12, 20);

    /** Thời điểm gửi yêu cầu cách ngày trải nghiệm đúng {@code hours} giờ. */
    private static Instant requestHoursBeforeExperience(long hours) {
        return EXPERIENCE_DATE.atStartOfDay(VIETNAM_ZONE).toInstant().minusSeconds(hours * 3600);
    }

    // ── Bậc EARLY: từ 7 ngày trở lên → 80% ───────────────────────────────

    @Test
    void tierEarly_whenCancelAtLeast7DaysBefore_returns80Percent() {
        Instant requestTime = requestHoursBeforeExperience(7 * 24);

        assertEquals(PersonalRefundPolicy.Tier.EARLY,
                PersonalRefundPolicy.tierOf(EXPERIENCE_DATE, requestTime));
        assertEquals(0, new BigDecimal("0.80")
                .compareTo(PersonalRefundPolicy.rateOf(EXPERIENCE_DATE, requestTime)));
    }

    @Test
    void tierEarly_whenCancel30DaysBefore_returns80Percent() {
        Instant requestTime = requestHoursBeforeExperience(30 * 24);

        assertEquals(PersonalRefundPolicy.Tier.EARLY,
                PersonalRefundPolicy.tierOf(EXPERIENCE_DATE, requestTime));
        assertEquals(0, new BigDecimal("0.80")
                .compareTo(PersonalRefundPolicy.rateOf(EXPERIENCE_DATE, requestTime)));
    }

    // ── Bậc MID: từ 72 giờ tới dưới 7 ngày → 50% ─────────────────────────

    @Test
    void tierMid_whenCancel6DaysBefore_returns50Percent() {
        Instant requestTime = requestHoursBeforeExperience(6 * 24);

        assertEquals(PersonalRefundPolicy.Tier.MID,
                PersonalRefundPolicy.tierOf(EXPERIENCE_DATE, requestTime));
        assertEquals(0, new BigDecimal("0.50")
                .compareTo(PersonalRefundPolicy.rateOf(EXPERIENCE_DATE, requestTime)));
    }

    @Test
    void tierMid_whenCancelExactly72HoursBefore_returns50Percent() {
        // Mốc 72 giờ là ranh giới: đúng 72 giờ vẫn thuộc bậc 50%, dưới 72 giờ là 0%.
        Instant requestTime = requestHoursBeforeExperience(72);

        assertEquals(PersonalRefundPolicy.Tier.MID,
                PersonalRefundPolicy.tierOf(EXPERIENCE_DATE, requestTime));
        assertEquals(0, new BigDecimal("0.50")
                .compareTo(PersonalRefundPolicy.rateOf(EXPERIENCE_DATE, requestTime)));
    }

    @Test
    void tierMid_whenCancel3DaysBefore_returns50Percent() {
        Instant requestTime = requestHoursBeforeExperience(3 * 24);

        assertEquals(PersonalRefundPolicy.Tier.MID,
                PersonalRefundPolicy.tierOf(EXPERIENCE_DATE, requestTime));
    }

    // ── Bậc LATE: dưới 72 giờ hoặc không đến → 0% ─────────────────────────

    @Test
    void tierLate_whenCancelUnder72HoursBefore_returns0Percent() {
        Instant requestTime = requestHoursBeforeExperience(71);

        assertEquals(PersonalRefundPolicy.Tier.LATE,
                PersonalRefundPolicy.tierOf(EXPERIENCE_DATE, requestTime));
        assertEquals(0, BigDecimal.ZERO
                .compareTo(PersonalRefundPolicy.rateOf(EXPERIENCE_DATE, requestTime)));
    }

    @Test
    void tierLate_whenCancel48HoursBefore_returns0Percent() {
        // Trước đây cửa sổ no-show là 48h — nay gộp vào bậc "dưới 72 giờ".
        Instant requestTime = requestHoursBeforeExperience(48);

        assertEquals(PersonalRefundPolicy.Tier.LATE,
                PersonalRefundPolicy.tierOf(EXPERIENCE_DATE, requestTime));
        assertEquals(0, BigDecimal.ZERO
                .compareTo(PersonalRefundPolicy.rateOf(EXPERIENCE_DATE, requestTime)));
    }

    @Test
    void tierLate_whenAfterExperienceDate_returns0Percent() {
        // Không xuất hiện (no-show) — gửi yêu cầu sau ngày trải nghiệm.
        Instant requestTime = EXPERIENCE_DATE.atStartOfDay(VIETNAM_ZONE).toInstant().plusSeconds(3600);

        assertEquals(PersonalRefundPolicy.Tier.LATE,
                PersonalRefundPolicy.tierOf(EXPERIENCE_DATE, requestTime));
    }

    // ── Thiếu ngày trải nghiệm → bậc cao nhất (bảo thủ về phía khách) ────────

    @Test
    void tierOf_whenNoExperienceDate_returnsEarly() {
        assertEquals(PersonalRefundPolicy.Tier.EARLY,
                PersonalRefundPolicy.tierOf(null, Instant.now()));
    }

    // ── Mốc "không hoàn" cấu hình được (khớp FinanceProperties) ───────────

    @Test
    void tierOf_withConfiguredLateWindow_movesBoundary() {
        Instant requestTime = requestHoursBeforeExperience(60);

        // Mặc định 72 giờ ⇒ 60 giờ còn lại → bậc 0%.
        assertEquals(PersonalRefundPolicy.Tier.LATE,
                PersonalRefundPolicy.tierOf(EXPERIENCE_DATE, requestTime, 72));

        // Nếu Admin đổi mốc sang 48 giờ ⇒ 60 giờ còn lại → bậc 50%.
        assertEquals(PersonalRefundPolicy.Tier.MID,
                PersonalRefundPolicy.tierOf(EXPERIENCE_DATE, requestTime, 48));
    }

    @Test
    void tierOf_withNonPositiveWindow_fallsBackToDefault() {
        Instant requestTime = requestHoursBeforeExperience(60);

        // Mốc <= 0 không hợp lệ ⇒ dùng mặc định 72 giờ ⇒ bậc 0%.
        assertEquals(PersonalRefundPolicy.Tier.LATE,
                PersonalRefundPolicy.tierOf(EXPERIENCE_DATE, requestTime, 0));
    }

    // ── Danh sách bậc cho web/mobile ───────────────────────────────────────

    @Test
    void tiers_exposesThreeTiersInDescendingOrder() {
        assertEquals(3, PersonalRefundPolicy.tiers().size());
        assertEquals(PersonalRefundPolicy.Tier.EARLY, PersonalRefundPolicy.tiers().get(0));
        assertEquals(PersonalRefundPolicy.Tier.MID, PersonalRefundPolicy.tiers().get(1));
        assertEquals(PersonalRefundPolicy.Tier.LATE, PersonalRefundPolicy.tiers().get(2));
    }

    @Test
    void tierRates_matchPolicy() {
        assertEquals(0, new BigDecimal("0.80")
                .compareTo(PersonalRefundPolicy.Tier.EARLY.getRate()));
        assertEquals(0, new BigDecimal("0.50")
                .compareTo(PersonalRefundPolicy.Tier.MID.getRate()));
        assertEquals(0, BigDecimal.ZERO
                .compareTo(PersonalRefundPolicy.Tier.LATE.getRate()));
    }

    // ── Nhóm bất khả kháng → 0% (fallback của enum) ─────────────────────────

    @Test
    void forceMajeure_defaultRateIsZero() {
        assertTrue(RefundReason.FORCE_MAJEURE.isForceMajeure());
        assertEquals(0, BigDecimal.ZERO
                .compareTo(RefundReason.FORCE_MAJEURE.defaultRefundRate()));
    }
}
