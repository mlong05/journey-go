package com.journeygo.modules.dashboard.service;

import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.dashboard.dto.PlatformRevenueReportResponse;
import com.journeygo.modules.dashboard.dto.PlatformRevenueReportResponse.DailyPoint;
import com.journeygo.modules.dashboard.dto.PlatformRevenueReportResponse.MonthPoint;
import com.journeygo.modules.dashboard.dto.PlatformRevenueReportResponse.MonthSummary;
import com.journeygo.modules.dashboard.dto.PlatformRevenueReportResponse.ProviderShare;
import com.journeygo.modules.dashboard.dto.PlatformRevenueReportResponse.ValueSplit;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Báo cáo doanh thu nền tảng theo tháng dương lịch (giờ Việt Nam).
 *
 * <p>Tách khỏi {@link OperationsOverviewService} vì KHÔNG phụ thuộc bộ lọc kỳ của trang:
 * luôn là "tháng này vs tháng trước" + chuỗi N tháng gần nhất.
 *
 * <p>Toàn bộ dữ liệu đọc bằng 2 truy vấn (ProviderRevenue + Booking) rồi gom trong bộ nhớ ⇒
 * một lần gọi bất kể số tháng.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlatformRevenueReportService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final List<BookingStatus> PAID_BOOKINGS =
            List.of(BookingStatus.CONFIRMED, BookingStatus.COMPLETED);
    private static final int TOP_PROVIDERS = 5;
    private static final int MIN_MONTHS = 3;
    private static final int MAX_MONTHS = 24;

    private final EntityManager em;

    /** Một khoản doanh thu (ProviderRevenue) — đã quy về thời điểm khách thanh toán. */
    private record RevenueRow(Instant paidAt, BigDecimal commission, BigDecimal refund, BigDecimal gross,
            BigDecimal voucher, BigDecimal providerNet, Long providerId, String providerName, Long bookingId) {}

    /** Một booking đã thanh toán — dùng cho GMV & số booking. */
    private record BookingRow(Instant paidAt, BigDecimal amount) {}

    public PlatformRevenueReportResponse report(int requestedMonths) {
        int monthCount = Math.max(MIN_MONTHS, Math.min(MAX_MONTHS, requestedMonths));

        ZonedDateTime now = ZonedDateTime.now(VN_ZONE);
        YearMonth current = YearMonth.from(now);
        YearMonth previous = current.minusMonths(1);
        YearMonth firstShown = current.minusMonths(monthCount - 1L);
        // Lấy thêm 12 tháng trước đó để vẽ đường "cùng kỳ năm trước".
        YearMonth firstFetched = firstShown.minusMonths(12);

        Instant fetchFrom = startOf(firstFetched);
        Instant nowInstant = now.toInstant();

        List<RevenueRow> revenues = loadRevenues(fetchFrom, nowInstant);
        List<BookingRow> bookings = loadBookings(startOf(firstShown), nowInstant);

        // ── Chuỗi N tháng ──
        Map<YearMonth, BigDecimal> revenueByMonth = new HashMap<>();
        Map<YearMonth, BigDecimal> refundByMonth = new HashMap<>();
        for (RevenueRow r : revenues) {
            YearMonth ym = monthOf(r.paidAt);
            revenueByMonth.merge(ym, r.commission, BigDecimal::add);
            refundByMonth.merge(ym, r.refund, BigDecimal::add);
        }
        Map<YearMonth, BigDecimal> gmvByMonth = new HashMap<>();
        Map<YearMonth, Long> bookingsByMonth = new HashMap<>();
        for (BookingRow b : bookings) {
            YearMonth ym = monthOf(b.paidAt);
            gmvByMonth.merge(ym, b.amount, BigDecimal::add);
            bookingsByMonth.merge(ym, 1L, Long::sum);
        }

        List<MonthPoint> months = new ArrayList<>();
        for (YearMonth ym = firstShown; !ym.isAfter(current); ym = ym.plusMonths(1)) {
            months.add(new MonthPoint(
                    ym.toString(),
                    "T" + ym.getMonthValue() + "/" + ym.getYear(),
                    revenueByMonth.getOrDefault(ym, BigDecimal.ZERO),
                    gmvByMonth.getOrDefault(ym, BigDecimal.ZERO),
                    refundByMonth.getOrDefault(ym, BigDecimal.ZERO),
                    bookingsByMonth.getOrDefault(ym, 0L),
                    revenueByMonth.getOrDefault(ym.minusYears(1), BigDecimal.ZERO),
                    ym.equals(current)));
        }

        // ── So sánh tháng ──
        Instant currentStart = startOf(current);
        Instant previousStart = startOf(previous);
        Duration elapsed = Duration.between(currentStart, nowInstant);
        // Cùng kỳ tháng trước: cùng độ dài thời gian, không vượt quá hết tháng trước.
        Instant sameDaysEnd = previousStart.plus(elapsed);
        if (sameDaysEnd.isAfter(currentStart)) sameDaysEnd = currentStart;

        MonthSummary monthToDate = summarize(revenues, bookings, currentStart, nowInstant);
        MonthSummary previousSameDays = summarize(revenues, bookings, previousStart, sameDaysEnd);
        MonthSummary previousFull = summarize(revenues, bookings, previousStart, currentStart);

        Duration monthLength = Duration.between(currentStart, startOf(current.plusMonths(1)));
        BigDecimal projected = BigDecimal.ZERO;
        if (!elapsed.isZero() && !elapsed.isNegative()) {
            projected = monthToDate.revenue()
                    .multiply(BigDecimal.valueOf(monthLength.getSeconds()))
                    .divide(BigDecimal.valueOf(elapsed.getSeconds()), 0, RoundingMode.HALF_UP);
        }

        return new PlatformRevenueReportResponse(
                current.toString(),
                now.getDayOfMonth(),
                current.lengthOfMonth(),
                monthToDate,
                previousSameDays,
                previousFull,
                projected,
                months,
                buildDailyCumulative(revenues, current, previous, now.getDayOfMonth()),
                buildValueSplit(revenues, currentStart, nowInstant),
                buildTopProviders(revenues, currentStart, nowInstant),
                Instant.now());
    }

    // ───────────────────────── Tải dữ liệu ─────────────────────────

    private List<RevenueRow> loadRevenues(Instant from, Instant to) {
        List<Object[]> rows = em.createQuery(
                        "select b.paidAt, r.commissionAmount, r.refundAmount, r.grossAmount, r.voucherDiscount, "
                                + "r.providerNetAmount, pp.id, pp.providerName, b.id "
                                + "from ProviderRevenue r join r.booking b join r.providerProfile pp "
                                + "where b.paidAt >= ?1 and b.paidAt < ?2", Object[].class)
                .setParameter(1, from).setParameter(2, to).getResultList();
        List<RevenueRow> result = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            if (row[0] == null) continue;
            result.add(new RevenueRow((Instant) row[0], dec(row[1]), dec(row[2]), dec(row[3]), dec(row[4]),
                    dec(row[5]), (Long) row[6], (String) row[7], (Long) row[8]));
        }
        return result;
    }

    private List<BookingRow> loadBookings(Instant from, Instant to) {
        List<Object[]> rows = em.createQuery(
                        "select b.paidAt, b.totalAmount from Booking b "
                                + "where b.status in ?1 and b.paidAt >= ?2 and b.paidAt < ?3", Object[].class)
                .setParameter(1, PAID_BOOKINGS).setParameter(2, from).setParameter(3, to).getResultList();
        List<BookingRow> result = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            if (row[0] == null) continue;
            result.add(new BookingRow((Instant) row[0], dec(row[1])));
        }
        return result;
    }

    // ───────────────────────── Tổng hợp ─────────────────────────

    private MonthSummary summarize(List<RevenueRow> revenues, List<BookingRow> bookings, Instant from, Instant to) {
        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal refund = BigDecimal.ZERO;
        for (RevenueRow r : revenues) {
            if (within(r.paidAt, from, to)) {
                revenue = revenue.add(r.commission);
                refund = refund.add(r.refund);
            }
        }
        BigDecimal gmv = BigDecimal.ZERO;
        long count = 0;
        for (BookingRow b : bookings) {
            if (within(b.paidAt, from, to)) {
                gmv = gmv.add(b.amount);
                count++;
            }
        }
        double takeRate = gmv.signum() == 0 ? 0
                : revenue.multiply(BigDecimal.valueOf(100)).divide(gmv, 2, RoundingMode.HALF_UP).doubleValue();
        // "to" là mốc exclusive ⇒ ngày cuối hiển thị = to − 1 giây.
        LocalDate fromDate = from.atZone(VN_ZONE).toLocalDate();
        LocalDate toDate = to.isAfter(from) ? to.minusSeconds(1).atZone(VN_ZONE).toLocalDate() : fromDate;
        return new MonthSummary(fromDate.toString(), toDate.toString(), revenue, gmv, refund, count, takeRate);
    }

    private List<DailyPoint> buildDailyCumulative(List<RevenueRow> revenues, YearMonth current, YearMonth previous,
            int today) {
        BigDecimal[] currentDaily = new BigDecimal[current.lengthOfMonth() + 1];
        BigDecimal[] previousDaily = new BigDecimal[previous.lengthOfMonth() + 1];
        java.util.Arrays.fill(currentDaily, BigDecimal.ZERO);
        java.util.Arrays.fill(previousDaily, BigDecimal.ZERO);

        for (RevenueRow r : revenues) {
            ZonedDateTime at = r.paidAt.atZone(VN_ZONE);
            YearMonth ym = YearMonth.from(at);
            if (ym.equals(current)) {
                currentDaily[at.getDayOfMonth()] = currentDaily[at.getDayOfMonth()].add(r.commission);
            } else if (ym.equals(previous)) {
                previousDaily[at.getDayOfMonth()] = previousDaily[at.getDayOfMonth()].add(r.commission);
            }
        }

        int maxDay = Math.max(current.lengthOfMonth(), previous.lengthOfMonth());
        List<DailyPoint> points = new ArrayList<>(maxDay);
        BigDecimal curSum = BigDecimal.ZERO;
        BigDecimal prevSum = BigDecimal.ZERO;
        for (int day = 1; day <= maxDay; day++) {
            BigDecimal cur = null;
            if (day <= current.lengthOfMonth() && day <= today) {
                curSum = curSum.add(currentDaily[day]);
                cur = curSum;
            }
            BigDecimal prev = null;
            if (day <= previous.lengthOfMonth()) {
                prevSum = prevSum.add(previousDaily[day]);
                prev = prevSum;
            }
            points.add(new DailyPoint(day, cur, prev));
        }
        return points;
    }

    private ValueSplit buildValueSplit(List<RevenueRow> revenues, Instant from, Instant to) {
        BigDecimal gross = BigDecimal.ZERO;
        BigDecimal providerNet = BigDecimal.ZERO;
        BigDecimal commission = BigDecimal.ZERO;
        BigDecimal voucher = BigDecimal.ZERO;
        BigDecimal refund = BigDecimal.ZERO;
        for (RevenueRow r : revenues) {
            if (!within(r.paidAt, from, to)) continue;
            gross = gross.add(r.gross);
            providerNet = providerNet.add(r.providerNet);
            commission = commission.add(r.commission);
            voucher = voucher.add(r.voucher);
            refund = refund.add(r.refund);
        }
        return new ValueSplit(gross, providerNet, commission, voucher, refund);
    }

    private List<ProviderShare> buildTopProviders(List<RevenueRow> revenues, Instant from, Instant to) {
        Map<Long, String> names = new HashMap<>();
        Map<Long, BigDecimal> revenueByProvider = new LinkedHashMap<>();
        Map<Long, java.util.Set<Long>> bookingsByProvider = new HashMap<>();
        for (RevenueRow r : revenues) {
            if (!within(r.paidAt, from, to) || r.providerId == null) continue;
            names.putIfAbsent(r.providerId, r.providerName);
            revenueByProvider.merge(r.providerId, r.commission, BigDecimal::add);
            bookingsByProvider.computeIfAbsent(r.providerId, k -> new java.util.HashSet<>()).add(r.bookingId);
        }

        List<Map.Entry<Long, BigDecimal>> sorted = new ArrayList<>(revenueByProvider.entrySet());
        sorted.sort(Map.Entry.<Long, BigDecimal>comparingByValue(Comparator.reverseOrder()));

        List<ProviderShare> result = new ArrayList<>();
        BigDecimal otherRevenue = BigDecimal.ZERO;
        long otherBookings = 0;
        for (int i = 0; i < sorted.size(); i++) {
            Map.Entry<Long, BigDecimal> entry = sorted.get(i);
            long count = bookingsByProvider.getOrDefault(entry.getKey(), java.util.Set.of()).size();
            if (i < TOP_PROVIDERS) {
                result.add(new ProviderShare(entry.getKey(), names.get(entry.getKey()), entry.getValue(), count));
            } else {
                otherRevenue = otherRevenue.add(entry.getValue());
                otherBookings += count;
            }
        }
        if (otherRevenue.signum() > 0) {
            result.add(new ProviderShare(null, "Khác", otherRevenue, otherBookings));
        }
        return result;
    }

    // ───────────────────────── Helpers ─────────────────────────

    private static Instant startOf(YearMonth ym) {
        return ym.atDay(1).atStartOfDay(VN_ZONE).toInstant();
    }

    private static YearMonth monthOf(Instant instant) {
        return YearMonth.from(instant.atZone(VN_ZONE));
    }

    private static boolean within(Instant at, Instant from, Instant to) {
        return !at.isBefore(from) && at.isBefore(to);
    }

    private static BigDecimal dec(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal decimal) return decimal;
        if (value instanceof Number number) return BigDecimal.valueOf(number.doubleValue());
        return BigDecimal.ZERO;
    }
}
