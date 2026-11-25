package com.journeygo.modules.dashboard.service;

import com.journeygo.modules.dashboard.dto.OperationsOverviewResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Kiểm thử tích hợp {@link OperationsOverviewService} — chạy JPQL thật trên DB.
 *
 * <p>Mục tiêu: bảo đảm các câu truy vấn JPQL (gom booking, doanh thu, hành động
 * chờ, phân rã khu vực, top tour) là hợp lệ với schema hiện tại — lỗi cú pháp
 * JPQL chỉ lộ ra khi chạy, không lộ ra lúc compile.
 */
@SpringBootTest
@ActiveProfiles("dev")
class OperationsOverviewServiceTest {

    @Autowired
    private OperationsOverviewService service;

    @Test
    @DisplayName("Khung kỳ động trả về đủ dữ liệu và 2 chuỗi xu hướng cùng số điểm")
    void rolling_returnsConsistentShape() {
        OperationsOverviewResponse res = service.overview("rolling", null, null, null);
        assertNotNull(res);
        assertNotNull(res.period());
        assertNotNull(res.kpis());
        assertNotNull(res.previousKpis());
        // 2 chuỗi xu hướng phải cùng số điểm để 2 đường chồng khít trên biểu đồ.
        assertEquals(res.revenueTrend().size(), res.previousRevenueTrend().size());
        assertEquals(res.gmvTrend().size(), res.previousGmvTrend().size());
        assertNotNull(res.funnel());
        assertNotNull(res.regions());
        assertNotNull(res.pendingActions());
        assertNotNull(res.updatedAt());
    }

    @Test
    @DisplayName("Khung tháng: chuỗi xu hướng chia theo NGÀY và hai kỳ có cùng số bucket")
    void monthly_usesDailyBuckets() {
        OperationsOverviewResponse res = service.overview("monthly", null, null, null);
        assertNotNull(res.period());
        // ⚠️ Khung tháng dùng lưới NGÀY CỐ ĐỊNH 31 ô (số ngày tối đa của 1 tháng) để
        // kỳ hiện tại và kỳ baseline chồng khít nhau — nên số điểm KHÔNG bằng số ngày
        // đã qua (period.days()). Chỉ cần 2 chuỗi cùng số điểm là so sánh được.
        assertEquals(res.revenueTrend().size(), res.previousRevenueTrend().size());
        assertEquals(31, res.revenueTrend().size());
        // Số ngày đã qua phải khớp giữa kỳ hiện tại và mốc so sánh (cùng số ngày).
        assertEquals(res.period().days(), res.period().previousDays());
        assertTrue(res.period().previousDays() > 0);
    }

    @Test
    @DisplayName("Khung năm: chuỗi xu hướng chia theo THÁNG (12 điểm)")
    void yearly_usesMonthlyBuckets() {
        OperationsOverviewResponse res = service.overview("yearly", null, null, null);
        assertEquals(12, res.revenueTrend().size());
        assertEquals(12, res.previousRevenueTrend().size());
    }

    @Test
    @DisplayName("Lọc theo khu vực tour: tổng doanh thu không vượt quá tổng toàn sàn")
    void regionFilter_narrowsResult() {
        OperationsOverviewResponse all = service.overview("rolling", null, null, null);
        OperationsOverviewResponse filtered =
                service.overview("rolling", null, null, 999_999L);
        // Khu vực không tồn tại ⇒ không có booking nào khớp.
        assertTrue(filtered.kpis().gmv().compareTo(all.kpis().gmv()) <= 0);
        assertEquals(0, filtered.kpis().totalBookings());
    }

    @Test
    @DisplayName("Khung 'Tất cả': điểm đầu BÁM theo bản ghi đầu tiên trong DB, KHÔNG hard-code")
    void all_startsFromActualEarliestBookingRow() {
        // Đọc trực tiếp bản ghi đầu tiên từ DB (không qua service) ⇒ nguồn sự thật.
        var earliestRow = service.earliestBookingDateForTest();
        OperationsOverviewResponse res = service.overview("all", null, null, null);

        assertNotNull(earliestRow, "DB phải có ít nhất 1 booking");
        java.time.ZoneId vn = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.LocalDate earliestDay = earliestRow.atZone(vn).toLocalDate();
        java.time.LocalDate actualStart = res.period().from().atZone(vn).toLocalDate();

        // Điểm đầu = ĐẦU THÁNG chứa bản ghi đầu tiên (lùi về đầu tháng cho gọn trục ngang).
        assertEquals(earliestDay.withDayOfMonth(1), actualStart,
                "Điểm đầu kỳ 'Tất cả' phải bám theo dữ liệu thật, không phải ngày cố định");

        // Điểm cuối = hôm nay.
        java.time.LocalDate today = java.time.LocalDate.now(vn);
        assertEquals(today, res.period().to().atZone(vn).toLocalDate().minusDays(1));

        // Không có mốc so sánh ⇒ không có chuỗi "kỳ trước" (không có năm 2013).
        assertTrue(res.previousRevenueTrend().isEmpty());
        assertTrue(res.previousGmvTrend().isEmpty());
        assertTrue(res.period().baselineLabel() == null || res.period().baselineLabel().isEmpty());

        // Số điểm = số tháng từ mốc đầu tới tháng hiện tại.
        int expected = (int) java.time.temporal.ChronoUnit.MONTHS.between(
                java.time.YearMonth.from(earliestDay.withDayOfMonth(1)),
                java.time.YearMonth.from(today)) + 1;
        assertEquals(expected, res.revenueTrend().size());
    }
}



