package com.journeygo.modules.dashboard.service;

import com.journeygo.modules.dashboard.service.ComparisonPeriod.Frame;
import com.journeygo.modules.dashboard.service.ComparisonPeriod.FrameKey;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Khung so sánh của trang Tổng quan vận hành (Admin).
 *
 * <p>Trọng tâm kiểm thử: mốc so sánh PHẢI là "cùng số ngày đã qua" để không
 * tạo ra giảm giả khi kỳ hiện tại chưa kết thúc.
 */
class ComparisonPeriodTest {

    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    @Test
    @DisplayName("Khung tuần: hai kỳ dài BẰNG NHAU")
    void weekly_hasEqualLengthPeriods() {
        Frame frame = ComparisonPeriod.resolve("weekly", null, null);
        assertEquals(FrameKey.WEEKLY, frame.key());
        assertEquals(7, frame.currentDays());
        assertEquals(7, frame.baselineDays());
        // Mốc so sánh nằm ngay trước kỳ hiện tại, không chồng lấn.
        assertEquals(frame.currentFrom(), frame.baselineTo());
        // Cả hai kỳ đều căn theo nửa đêm ⇒ số ngày lịch luôn = 7, không nhảy.
        assertEquals(7, frame.bucketCount());
    }

    @Test
    @DisplayName("Khung tháng: so cùng số ngày, KHÔNG so cả tháng trước")
    void monthly_baselineUsesSameDayCount() {
        Frame frame = ComparisonPeriod.resolve("monthly", null, null);
        assertEquals(FrameKey.MONTHLY, frame.key());
        assertEquals(frame.currentDays(), frame.baselineDays());
        // Baseline nằm ở tháng TRƯỚC.
        assertTrue(frame.baselineFrom().atZone(VN).getMonthValue()
                != frame.currentFrom().atZone(VN).getMonthValue());
    }

    @Test
    @DisplayName("Số ngày tính theo NGÀY LỊCH (không bị tròn xuống khi thiếu 24 giờ)")
    void dayCountUsesCalendarDays() {
        Frame frame = ComparisonPeriod.resolve("monthly", null, null);
        // ⚠️ Không hard-code "24" — hôm nay là ngày nào thì số ngày là ngày đó.
        // Ngày 1 của tháng = ngày 1 ⇒ số ngày đã qua = ngày hôm nay.
        int today = LocalDate.now(VN).getDayOfMonth();
        assertEquals(today, frame.currentDays());
        // Baseline cũng đúng số ngày (cùng ngày tháng trước) ⇒ so sánh công bằng.
        assertEquals(frame.currentDays(), frame.baselineDays());
        // bucketCount = max(30, 31) = 31 để hiển thị đủ cả 2 tháng
        assertEquals(31, frame.bucketCount());
    }

    @Test
    @DisplayName("Khung năm: chia 12 tháng, baseline cùng số ngày của năm trước")
    void yearly_hasTwelveMonthlyBuckets() {
        Frame frame = ComparisonPeriod.resolve("yearly", null, null);
        assertEquals(FrameKey.YEARLY, frame.key());
        assertEquals(12, frame.bucketCount());
        assertTrue(frame.isMonthlyBucket());
        int currentYear = frame.currentFrom().atZone(VN).getYear();
        int baselineYear = frame.baselineFrom().atZone(VN).getYear();
        assertEquals(currentYear - 1, baselineYear);
    }

    @Test
    @DisplayName("Bucket của kỳ hiện tại và baseline dùng CHUNG hệ tọa độ")
    void bucketIndexAlignsAcrossPeriods() {
        Frame frame = ComparisonPeriod.resolve("monthly", null, null);
        // Mốc đầu kỳ hiện tại và mốc đầu baseline đều là bucket 0.
        assertEquals(0, frame.bucketIndex(frame.currentFrom()));
        assertEquals(0, frame.baselineBucketIndex(frame.baselineFrom()));
        // Ngoài khoảng ⇒ -1 (không gán nhầm vào bucket nào).
        assertEquals(-1, frame.bucketIndex(frame.currentFrom().minusSeconds(86400)));
    }

    @Test
    @DisplayName("Khung tùy chỉnh: mốc so sánh = khoảng liền trước cùng độ dài")
    void custom_baselineIsPrecedingEqualLengthWindow() {
        Frame frame = ComparisonPeriod.resolve("custom", "2026-01-10", "2026-01-20");
        assertEquals(11, frame.currentDays());
        assertEquals(11, frame.baselineDays());
        assertEquals(frame.currentFrom(), frame.baselineTo());
        // Mốc bắt đầu baseline lùi đúng 11 ngày.
        assertEquals(frame.currentFrom().minus(Duration.ofDays(11)), frame.baselineFrom());
    }

    @Test
    @DisplayName("Nhãn mốc so sánh ghi rõ mốc thời gian cụ thể")
    void baselineLabelIsConcrete() {
        Frame frame = ComparisonPeriod.resolve("monthly", null, null);
        // Dạng "dd/MM – dd/MM" ⇒ người đọc không phải suy nghĩ "tháng trước" là lúc nào.
        assertTrue(frame.baselineLabel().matches("\\d{2}/\\d{2} – \\d{2}/\\d{2}"),
                "Nhãn mốc so sánh phải là khoảng ngày cụ thể: " + frame.baselineLabel());
    }

    @Test
    @DisplayName("Range lạ ⇒ mặc định an toàn (tuần)")
    void unknownRangeFallsBackToWeekly() {
        Frame frame = ComparisonPeriod.resolve("khong-ton-tai", null, null);
        assertEquals(FrameKey.WEEKLY, frame.key());
    }
}




