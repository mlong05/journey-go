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
}



