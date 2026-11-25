package com.journeygo.modules.dashboard.service;

import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.dashboard.dto.OperationsOverviewResponse;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Kiểm thử tích hợp {@link OperationsOverviewService} — chạy JPQL thật trên DB.
 *
 * <p>Mục tiêu: bảo đảm các câu truy vấn JPQL (gom booking, doanh thu, hành động
 * chờ, phân rã khu vực, top tour) là hợp lệ với schema hiện tại — lỗi cú pháp
 * JPQL chỉ lộ ra khi chạy, không lộ ra lúc compile.
 *
 * <p>⚠️ CI dựng PostgreSQL TRẮNG (chỉ chạy Flyway, KHÔNG nạp thư mục
 * {@code resources/seed}) ⇒ {@code bookings} rỗng khi test bắt đầu. Vì vậy test
 * nào cần dữ liệu booking phải TỰ TẠO trong chính nó (và {@link Transactional}
 * để rollback), không được giả định DB đã có sẵn bản ghi.
 */
@SpringBootTest
@ActiveProfiles("dev")
class OperationsOverviewServiceTest {

    @Autowired
    private OperationsOverviewService service;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TourRepository tourRepository;

    @PersistenceContext
    private EntityManager entityManager;

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
    @Transactional
    @DisplayName("Khung 'Tất cả': điểm đầu BÁM theo bản ghi đầu tiên trong DB, KHÔNG hard-code")
    void all_startsFromActualEarliestBookingRow() {
        // ⚠️ CI có DB TRẮNG (Flyway KHÔNG nạp thư mục seed) ⇒ phải TỰ tạo booking.
        // Chọn mốc cố định trong quá khứ để khẳng định điểm đầu KHÔNG phải mốc
        // mặc định 2020-01-01 mà là đầu tháng của bản ghi thật.
        ZoneId vn = ZoneId.of("Asia/Ho_Chi_Minh");
        Instant seededCreatedAt = LocalDate.of(2022, 7, 15)
                .atTime(9, 0).atZone(vn).toInstant();
        seedBooking(seededCreatedAt, "SEED-ALL-" + UUID.randomUUID().toString().substring(0, 8));
        entityManager.flush();

        // Đọc trực tiếp bản ghi đầu tiên từ DB (không qua service) ⇒ nguồn sự thật.
        Instant earliestRow = service.earliestBookingDateForTest();
        OperationsOverviewResponse res = service.overview("all", null, null, null);

        assertNotNull(earliestRow, "Sau khi tự seed, DB phải có ít nhất 1 booking");
        // Bản ghi vừa seed phải là bản ghi CŨ NHẤT (mốc 2022) — không có dữ liệu nào
        // cũ hơn trong DB đã được reset, nên min(createdAt) chính là mốc này.
        assertEquals(seededCreatedAt, earliestRow,
                "min(createdAt) phải trỏ đúng bản ghi seed (2022-07-15) — chứng minh không hard-code");
        LocalDate earliestDay = earliestRow.atZone(vn).toLocalDate();
        LocalDate actualStart = res.period().from().atZone(vn).toLocalDate();

        // Điểm đầu = ĐẦU THÁNG chứa bản ghi đầu tiên (lùi về đầu tháng cho gọn trục ngang).
        assertEquals(earliestDay.withDayOfMonth(1), actualStart,
                "Điểm đầu kỳ 'Tất cả' phải bám theo dữ liệu thật, không phải ngày cố định 2020-01-01");

        // Điểm cuối = hôm nay.
        LocalDate today = LocalDate.now(vn);
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
        // ⚠️ Dữ liệu seed tự xoá khi transaction rollback (không cần delete thủ công).
    }

    @Test
    @Transactional
    @DisplayName("Khung 'Tất cả' khi DB TRẮNG: lùi về mốc dự phòng 2020-01-01, không nổ")
    void all_emptyDatabase_fallsBackToDefault() {
        // CI mặc định rỗng ⇒ nhánh này phải chạy được (không NPE) và dùng mốc mặc định.
        // (Nếu máy dev có sẵn booking cũ hơn 2020 thì bỏ qua — chỉ kiểm tra khi thực sự rỗng.)
        if (service.earliestBookingDateForTest() != null) {
            return;
        }
        OperationsOverviewResponse res = service.overview("all", null, null, null);
        ZoneId vn = ZoneId.of("Asia/Ho_Chi_Minh");
        assertEquals(LocalDate.of(2020, 1, 1), res.period().from().atZone(vn).toLocalDate());
        assertTrue(res.revenueTrend().size() > 0);
        assertTrue(res.previousRevenueTrend().isEmpty());
    }

    /** Tạo 1 booking tối thiểu hợp lệ (User + Tour) với {@code createdAt} cho trước. */
    private Booking seedBooking(Instant createdAt, String bookingCode) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User tourist = userRepository.save(User.builder()
                .email("seed-tourist-" + suffix + "@example.com")
                .fullName("Seed Tourist")
                .build());
        Tour tour = tourRepository.save(Tour.builder()
                .title("Seed Tour " + suffix)
                .durationDays(1)
                .createdBy(tourist)
                .build());

        Booking booking = Booking.builder()
                .bookingCode(bookingCode)
                .tourist(tourist)
                .tour(tour)
                .experienceDate(createdAt.atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate())
                .totalAmount(BigDecimal.valueOf(1_000_000))
                .status(BookingStatus.CONFIRMED)
                .paymentDeadline(createdAt.plusSeconds(600))
                .build();
        Booking saved = bookingRepository.save(booking);
        entityManager.flush();

        // ⚠️ createdAt là cột updatable=false + @PrePersist ghi đè ⇒ phải UPDATE thủ công
        // bằng JPQL để cố định mốc lịch sử (2022) thay vì "now".
        // ⚠️ KHÔNG gọi entityManager.clear() ở đây: clear() detach entity ⇒ transaction
        // rollback KHÔNG còn xoá được bản ghi ⇒ để lại rác trong DB (làm các test sau
        // khác đọc được dữ liệu "bẩn"). Thay vào đó chỉ refresh bản ghi.
        entityManager.createQuery(
                        "UPDATE Booking b SET b.createdAt = :ts WHERE b.id = :id")
                .setParameter("ts", createdAt)
                .setParameter("id", saved.getId())
                .executeUpdate();
        entityManager.refresh(saved);
        return saved;
    }
}
