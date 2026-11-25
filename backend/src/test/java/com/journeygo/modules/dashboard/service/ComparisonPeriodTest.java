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
import static org.junit.jupiter.api.Assertions.assertFalse;
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
    @DisplayName("Khung 'Tất cả': chia theo tháng và KHÔNG có mốc so sánh")
    void all_hasMonthlyBucketsAndNoBaseline() {
        Frame frame = ComparisonPeriod.resolve("all", null, null);
        assertEquals(FrameKey.ALL, frame.key());
        assertTrue(frame.isMonthlyBucket());
        // ⚠️ "Tất cả" KHÔNG có kỳ trước ⇒ không vẽ mốc so sánh (không có năm 2013).
        assertFalse(frame.hasBaseline());
        assertTrue(frame.baselineLabel() == null || frame.baselineLabel().isEmpty(),
                "Khung 'Tất cả' không được có nhãn mốc so sánh: " + frame.baselineLabel());
        // Bucket theo tháng ⇒ số bucket = số tháng từ tháng đầu tới nay.
        assertTrue(frame.bucketCount() >= 12, "Phải có ít nhất 12 tháng: " + frame.bucketCount());
    }

    @Test
    @DisplayName("Khung 'Tất cả': bắt đầu từ tháng có dữ liệu đầu tiên trong DB")
    void all_startsFromEarliestData() {
        LocalDate earliest = LocalDate.of(2026, 1, 15);
        Frame frame = ComparisonPeriod.resolve("all", null, null, earliest);
        // Mốc bắt đầu = ĐẦU THÁNG có dữ liệu đầu tiên (lùi về đầu tháng cho gọn).
        assertEquals(LocalDate.of(2026, 1, 1), frame.currentFrom().atZone(VN).toLocalDate());
        // Không có mốc so sánh ⇒ lát cắt dữ liệu KHÔNG mở rộng về trước.
        assertEquals(frame.currentFrom(), frame.baselineFrom());
    }

    @Test
    @DisplayName("Khung 'Tất cả': điểm đầu BÁM theo dữ liệu, KHÔNG hard-code 1/1/2026")
    void all_startFollowsDataNotHardCodedDate() {
        // 3 ngày dữ liệu đầu tiên nằm ở các tháng/năm khác nhau ⇒ mốc bắt đầu
        // phải dịch theo, không được cố định vào một ngày bất kỳ.
        LocalDate earliest2023 = LocalDate.of(2023, 5, 17);
        Frame f2023 = ComparisonPeriod.resolve("all", null, null, earliest2023);
        assertEquals(LocalDate.of(2023, 5, 1), f2023.currentFrom().atZone(VN).toLocalDate());

        LocalDate earliest2025 = LocalDate.of(2025, 9, 2);
        Frame f2025 = ComparisonPeriod.resolve("all", null, null, earliest2025);
        assertEquals(LocalDate.of(2025, 9, 1), f2025.currentFrom().atZone(VN).toLocalDate());

        // Mỗi ngày dữ liệu đầu tiên khác nhau ⇒ mốc bắt đầu khác nhau
        // ⇒ KHÔNG thể là một ngày hard-code.
        assertNotEquals(f2023.currentFrom(), f2025.currentFrom());

        // Điểm cuối LUÔN là hôm nay (khoảng hiện tại), không phụ thuộc dữ liệu.
        LocalDate today = LocalDate.now(VN);
        assertEquals(today, f2023.currentTo().atZone(VN).toLocalDate().minusDays(1));
        assertEquals(today, f2025.currentTo().atZone(VN).toLocalDate().minusDays(1));

        // Số bucket = số tháng từ mốc bắt đầu tới tháng hiện tại.
        int expectedMonths = (int) java.time.temporal.ChronoUnit.MONTHS.between(
                java.time.YearMonth.of(2025, 9), java.time.YearMonth.from(today)) + 1;
        assertEquals(expectedMonths, f2025.bucketCount());
    }

    @Test
    @DisplayName("Khung 'Tất cả': DB rỗng ⇒ lùi về mốc dự phòng, KHÔNG lỗi")
    void all_emptyDataFallsBackToDefault() {
        Frame frame = ComparisonPeriod.resolve("all", null, null, null);
        assertEquals(FrameKey.ALL, frame.key());
        assertEquals(LocalDate.of(2020, 1, 1), frame.currentFrom().atZone(VN).toLocalDate());
        assertFalse(frame.hasBaseline());
    }

    @Test
    @DisplayName("Range lạ ⇒ mặc định an toàn ('Tất cả')")
    void unknownRangeFallsBackToAll() {
        Frame frame = ComparisonPeriod.resolve("khong-ton-tai", null, null);
        assertEquals(FrameKey.ALL, frame.key());
    }

    @Test
    @DisplayName("Range rỗng ⇒ mặc định 'Tất cả'")
    void blankRangeFallsBackToAll() {
        Frame frame = ComparisonPeriod.resolve(null, null, null);
        assertEquals(FrameKey.ALL, frame.key());
    }
}




