package com.journeygo.modules.dashboard.service;

import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.community.entity.enums.PostStatus;
import com.journeygo.modules.community.entity.enums.ReportStatus;
import com.journeygo.modules.dashboard.dto.AdminDashboardResponse;
import com.journeygo.modules.dashboard.dto.ModeratorDashboardResponse;
import com.journeygo.modules.dashboard.dto.ProviderDashboardResponse;
import com.journeygo.modules.destination.entity.enums.DestinationStatus;
import com.journeygo.modules.moderation.entity.enums.ContentReviewStatus;
import com.journeygo.modules.moderation.entity.enums.DestinationReviewStatus;
import com.journeygo.modules.moderation.entity.enums.TourReviewStatus;
import com.journeygo.modules.payment.entity.enums.PaymentStatus;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.user.entity.Role;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Tổng hợp số liệu cho trang tổng quan của Admin, Provider và Moderator.
 * Chỉ đọc dữ liệu thật trong DB; mọi mốc "hôm nay / tháng này" tính theo giờ Việt Nam.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int RECENT_LIMIT = 8;
    private static final int TASK_LIMIT = 10;
    private static final int UPDATE_LIMIT = 6;
    private static final List<BookingStatus> PAID_BOOKING = List.of(BookingStatus.CONFIRMED, BookingStatus.COMPLETED);

    private final EntityManager em;
    private final ProviderAnalyticsService analytics;

    // ───────────────────────── ADMIN ─────────────────────────

    public AdminDashboardResponse admin() {
        Instant now = Instant.now();
        Instant startOfToday = startOfToday();
        Instant startOfMonth = startOfMonth();

        var users = new AdminDashboardResponse.UserStats(
                count("select count(u) from User u"),
                count("select count(u) from User u where u.active = true"),
                countUsersByRole(Role.TOURIST),
                countUsersByRole(Role.CONTENT_PROVIDER),
                countUsersByRole(Role.CONTENT_MODERATOR),
                count("select count(u) from User u where u.createdAt >= ?1", startOfMonth));

        var destinations = new AdminDashboardResponse.DestinationStats(
                count("select count(d) from Destination d where d.deleted = false and d.status = ?1",
                        DestinationStatus.PUBLISHED),
                count("select count(d) from Destination d where d.deleted = false"),
                count("select count(t) from Tour t where t.deleted = false and t.status = ?1", TourStatus.PUBLISHED));

        var checkIns = new AdminDashboardResponse.CheckInStats(
                count("select count(c) from UserCheckInPoint c where c.isValid = true"),
                count("select count(c) from UserCheckInPoint c where c.isValid = true and c.checkedInAt >= ?1",
                        startOfToday));

        var revenue = new AdminDashboardResponse.RevenueStats(
                sum("select sum(p.amount) from Payment p where p.status = ?1", PaymentStatus.SUCCESS),
                sum("select sum(p.amount) from Payment p where p.status = ?1 and p.paidAt >= ?2",
                        PaymentStatus.SUCCESS, startOfMonth),
                count("select count(p) from Payment p where p.status = ?1", PaymentStatus.SUCCESS));

        List<AdminDashboardResponse.RecentPayment> recentPayments = query(
                "select p.id, p.txnRef, b.bookingCode, u.fullName, t.title, p.method, p.bankCode, p.amount, "
                        + "p.status, p.createdAt, p.paidAt from Payment p join p.booking b join b.tourist u "
                        + "join b.tour t order by p.createdAt desc", Object[].class)
                .setMaxResults(RECENT_LIMIT).getResultList().stream()
                .map(r -> new AdminDashboardResponse.RecentPayment((Long) r[0], (String) r[1], (String) r[2],
                        (String) r[3], (String) r[4], name(r[5]), (String) r[6], (BigDecimal) r[7], name(r[8]),
                        (Instant) r[9], (Instant) r[10]))
                .toList();

        // Phạm vi Admin chỉ gồm cấu hình hệ thống, đối tác, người dùng và tất toán.
        // Việc thẩm định điểm đến / tour thuộc CONTENT_MODERATOR nên không xuất hiện ở đây.
        List<AdminDashboardResponse.PendingTask> tasks = new ArrayList<>();
        query("select r.id, r.refundCode, u.fullName, r.proposedAmount, r.declaredReason, r.reasonSummary, r.reasonDetail, r.createdAt "
                + "from RefundRequest r join r.tourist u where r.status = ?1 order by r.createdAt asc", Object[].class,
                RefundStatus.PENDING_REVIEW).setMaxResults(TASK_LIMIT).getResultList()
                .forEach(r -> tasks.add(new AdminDashboardResponse.PendingTask("REFUND", (Long) r[0], (String) r[1],
                        "Yêu cầu hoàn tiền " + r[1],
                        // ⚠️ Khách KHÔNG chọn nhóm lý do ⇒ `declaredReason` có thể
                        // null và `proposedAmount` = 0 ⇒ hiển thị cho đúng.
                        (BigDecimal) r[3] != null && ((BigDecimal) r[3]).signum() > 0
                                ? "Du khách: " + r[2] + " · Đề xuất " + formatVnd((BigDecimal) r[3])
                                : "Du khách: " + r[2] + " · Chờ phân loại nguyên nhân",
                        r[5] != null ? (String) r[5]
                                : (r[6] != null ? (String) r[6] : "Lý do: " + name(r[4])),
                        (Instant) r[7], "/admin/finance")));
        tasks.sort(Comparator.comparing(AdminDashboardResponse.PendingTask::submittedAt,
                Comparator.nullsLast(Comparator.naturalOrder())));

        long pendingTotal = count("select count(r) from RefundRequest r where r.status = ?1", RefundStatus.PENDING_REVIEW);

        return new AdminDashboardResponse(users, destinations, checkIns, revenue, recentPayments, pendingTotal,
                tasks.stream().limit(TASK_LIMIT).toList());
    }

    // ───────────────────────── PROVIDER ─────────────────────────

    /**
     * Danh sách tour rút gọn của đối tác — cho dropdown bộ lọc "Tour cụ thể".
     */
    public List<ProviderDashboardResponse.TourOption> providerTourOptions(Long userId) {
        return query("select t.tourId, t.title, t.status from Tour t "
                + "where t.deleted = false and t.createdBy.id = ?1 order by t.updatedAt desc",
                Object[].class, userId).getResultList().stream()
                .map(r -> new ProviderDashboardResponse.TourOption((Long) r[0], (String) r[1],
                        r[2] == null ? null : r[2].toString()))
                .toList();
    }

    /**
     * Số liệu tổng quan của đối tác.
     *
     * @param range   today | week | month | custom
     * @param from    ngày bắt đầu (chỉ dùng khi range = custom, yyyy-MM-dd)
     * @param to      ngày kết thúc (chỉ dùng khi range = custom, yyyy-MM-dd)
     * @param tourId  lọc theo một tour cụ thể (null = tất cả)
     * @param regionId lọc theo khu vực (null = tất cả)
     */
    public ProviderDashboardResponse provider(Long userId, String range, String from, String to,
            Long tourId, Long regionId) {
        Period period = Period.of(range, from, to, earliestProviderDataDate(userId));

        Map<DestinationStatus, Long> byStatus = new HashMap<>();
        query("select d.status, count(d) from Destination d where d.deleted = false and d.createdBy.id = ?1 "
                + "group by d.status", Object[].class, userId).getResultList()
                .forEach(r -> byStatus.put((DestinationStatus) r[0], (Long) r[1]));
        var destinations = new ProviderDashboardResponse.DestinationStats(
                byStatus.values().stream().mapToLong(Long::longValue).sum(),
                byStatus.getOrDefault(DestinationStatus.PUBLISHED, 0L),
                byStatus.getOrDefault(DestinationStatus.PENDING, 0L),
                byStatus.getOrDefault(DestinationStatus.REJECTED, 0L),
                byStatus.getOrDefault(DestinationStatus.DRAFT, 0L));

        String checkInBase = "select count(c) from UserCheckInPoint c where c.isValid = true "
                + "and c.experience.destination.createdBy.id = ?1";
        var checkIns = new ProviderDashboardResponse.PeriodCount(
                count(checkInBase + " and c.checkedInAt >= ?2 and c.checkedInAt < ?3", userId, period.from, period.to),
                count(checkInBase + " and c.checkedInAt >= ?2 and c.checkedInAt < ?3", userId, period.prevFrom, period.prevTo),
                count(checkInBase, userId));

        String revenueBase = " from Booking b where b.status in ?1 and b.tour.createdBy.id = ?2";
        // Bộ lọc tour/khu vực (tuỳ chọn) áp cho các ô KPI cơ bản.
        StringBuilder revenueFilter = new StringBuilder();
        List<Object> filterParams = new ArrayList<>();
        if (tourId != null) {
            filterParams.add(tourId);
            revenueFilter.append(" and b.tour.tourId = ?5");
        }
        if (regionId != null) {
            filterParams.add(regionId);
            revenueFilter.append(" and b.tour.region.id = ?").append(5 + filterParams.size() - 1);
        }
        Object[] revenueParams = new Object[4 + filterParams.size()];
        revenueParams[0] = PAID_BOOKING;
        revenueParams[1] = userId;
        revenueParams[2] = period.from;
        revenueParams[3] = period.to;
        for (int i = 0; i < filterParams.size(); i++) {
            revenueParams[4 + i] = filterParams.get(i);
        }
        // Cùng bộ lọc cho kỳ trước ⇒ so sánh % luôn cùng phạm vi.
        Object[] prevRevenueParams = new Object[4 + filterParams.size()];
        prevRevenueParams[0] = PAID_BOOKING;
        prevRevenueParams[1] = userId;
        prevRevenueParams[2] = period.prevFrom;
        prevRevenueParams[3] = period.prevTo;
        for (int i = 0; i < filterParams.size(); i++) {
            prevRevenueParams[4 + i] = filterParams.get(i);
        }
        var revenue = new ProviderDashboardResponse.PeriodAmount(
                sum("select sum(b.totalAmount)" + revenueBase + " and b.paidAt >= ?3 and b.paidAt < ?4"
                        + revenueFilter, revenueParams),
                sum("select sum(b.totalAmount)" + revenueBase + " and b.paidAt >= ?3 and b.paidAt < ?4"
                        + revenueFilter, prevRevenueParams),
                sum("select sum(b.totalAmount)" + revenueBase, PAID_BOOKING, userId),
                count("select count(b)" + revenueBase + " and b.paidAt >= ?3 and b.paidAt < ?4"
                        + revenueFilter, revenueParams));

        String ownTasks = "select t.id from Task t where t.experience.destination.createdBy.id = ?1";
        var missions = new ProviderDashboardResponse.MissionStats(
                count("select count(t) from Task t where t.experience.destination.createdBy.id = ?1", userId),
                count("select count(p) from JourneyTaskProgress p where p.isCorrect is not null and p.taskId in ("
                        + ownTasks + ")", userId),
                count("select count(p) from JourneyTaskProgress p where p.isCorrect = true and p.taskId in ("
                        + ownTasks + ")", userId));

        Map<Long, Long> checkInsByDestination = new HashMap<>();
        query("select c.experience.destination.id, count(c) from UserCheckInPoint c where c.isValid = true "
                + "and c.experience.destination.createdBy.id = ?1 group by c.experience.destination.id",
                Object[].class, userId).getResultList()
                .forEach(r -> checkInsByDestination.put((Long) r[0], (Long) r[1]));
        List<ProviderDashboardResponse.DestinationRow> rows = query(
                "select d.id, d.name, d.address, d.status, d.latitude, d.longitude from Destination d "
                        + "where d.deleted = false and d.createdBy.id = ?1 order by d.updatedAt desc", Object[].class, userId)
                .getResultList().stream()
                .map(r -> new ProviderDashboardResponse.DestinationRow((Long) r[0], (String) r[1], (String) r[2],
                        name(r[3]), (BigDecimal) r[4], (BigDecimal) r[5],
                        checkInsByDestination.getOrDefault((Long) r[0], 0L)))
                .toList();

        List<ProviderDashboardResponse.ModerationUpdate> updates = new ArrayList<>();
        query("select d.id, d.name, h.action, h.note, h.reason, h.createdAt from DestinationReviewHistory h "
                + "join h.review r join r.destination d where d.createdBy.id = ?1 order by h.createdAt desc",
                Object[].class, userId).setMaxResults(UPDATE_LIMIT).getResultList()
                .forEach(r -> updates.add(new ProviderDashboardResponse.ModerationUpdate("DESTINATION", (Long) r[0],
                        (String) r[1], name(r[2]), (String) r[3], (String) r[4], (Instant) r[5])));
        query("select t.tourId, t.title, h.action, h.note, h.reason, h.createdAt from TourReviewHistory h "
                + "join h.review r join r.tour t where t.createdBy.id = ?1 order by h.createdAt desc",
                Object[].class, userId).setMaxResults(UPDATE_LIMIT).getResultList()
                .forEach(r -> updates.add(new ProviderDashboardResponse.ModerationUpdate("TOUR", (Long) r[0],
                        (String) r[1], name(r[2]), (String) r[3], (String) r[4], (Instant) r[5])));
        updates.sort(Comparator.comparing(ProviderDashboardResponse.ModerationUpdate::createdAt,
                Comparator.nullsLast(Comparator.reverseOrder())));

        boolean hourly = "today".equals(period.key);
        boolean monthlySeries = "all".equals(period.key) || "year".equals(period.key);
        ProviderAnalyticsService.Filter filter = ProviderAnalyticsService.Filter.of(tourId, regionId);
        return new ProviderDashboardResponse(period.key, destinations, checkIns, revenue, missions, rows,
                updates.stream().limit(UPDATE_LIMIT).toList(), hourly ? "hour" : (monthlySeries ? "month" : "day"),
                providerSeries(userId, period, filter),
                analytics.revenueSummary(userId, period.from, period.to, filter),
                analytics.bookingSummary(userId, period.from, period.to, filter),
                new ProviderDashboardResponse.CheckInSummary(checkIns.current(), checkIns.previous(),
                        checkIns.allTime(), analytics.uniqueCheckInUsers(userId, period.from, period.to)),
                analytics.actionItems(userId),
                analytics.tourBreakdown(userId, period.from, period.to, filter),
                analytics.funnel(userId, period.from, period.to, filter),
                analytics.bookingStatusBreakdown(userId, period.from, period.to, filter),
                analytics.upcomingDepartures(userId, filter),
                Instant.now(),
                analytics.regionBreakdown(userId, period.from, period.to, filter),
                analytics.checkInByMethod(userId, period.from, period.to),
                analytics.tourPerformance(userId, period.from, period.to, filter));
    }

    /**
     * Ngày có dữ liệu ĐẦU TIÊN của đối tác — dùng cho khoảng "all".
     *
     * <p>⚠️ Lấy theo {@code Booking.createdAt} của các tour của đối tác ⇒ chuỗi
     * "Tất cả" bắt đầu đúng chỗ có dữ liệu thật (không phải 2020 cố định) ⇒
     * biểu đồ không có hàng loạt tháng trống và không cần mốc so sánh 2013.
     */
    private LocalDate earliestProviderDataDate(Long userId) {
        List<Instant> rows = query("select min(b.createdAt) from Booking b "
                + "where b.tour.createdBy.id = ?1", Instant.class, userId).getResultList();
        if (rows.isEmpty() || rows.get(0) == null) {
            return null;
        }
        return rows.get(0).atZone(VN_ZONE).toLocalDate();
    }

    /**
     * Chuỗi số liệu cho biểu đồ "diễn biến theo thời gian", kỳ này đặt cạnh kỳ trước:
     *   • today  : theo giờ, 0h → giờ hiện tại, so với cùng giờ hôm qua;
     *   • week   : 7 ngày gần nhất (theo ngày lịch), so với 7 ngày liền trước;
     *   • last30 : 30 ngày gần nhất, so với 30 ngày liền trước (cùng độ dài);
     *   • month  : ngày 1 → hôm nay, so với cùng ngày tháng trước (ngày không có ở tháng trước ⇒ null).
     * Doanh thu / lượt đặt tính theo thời điểm thanh toán (giống ô Doanh thu); check-in theo thời điểm check-in.
     *
     * @param filter bộ lọc tour/khu vực — phải KHỚP với bộ lọc của các ô KPI khác, nếu không
     *               biểu đồ và thẻ KPI sẽ nói về hai phạm vi khác nhau.
     */
    private List<ProviderDashboardResponse.SeriesPoint> providerSeries(Long userId, Period period,
            ProviderAnalyticsService.Filter filter) {
        ZonedDateTime now = ZonedDateTime.now(VN_ZONE);
        LocalDate today = now.toLocalDate();
        String rangeKey = period.key;
        boolean hourly = "today".equals(rangeKey);
        boolean monthly = "all".equals(rangeKey) || "year".equals(rangeKey);
        Duration step = hourly ? Duration.ofHours(1) : Duration.ofDays(1);

        List<ZonedDateTime> cur = new ArrayList<>();
        List<ZonedDateTime> prev = new ArrayList<>();
        if (hourly) {
            ZonedDateTime start = today.atStartOfDay(VN_ZONE);
            for (int h = 0; h <= now.getHour(); h++) {
                cur.add(start.plusHours(h));
                prev.add(start.minusDays(1).plusHours(h));
            }
        } else if ("week".equals(rangeKey)) {
            for (int i = 6; i >= 0; i--) {
                LocalDate d = today.minusDays(i);
                cur.add(d.atStartOfDay(VN_ZONE));
                prev.add(d.minusDays(7).atStartOfDay(VN_ZONE));
            }
        } else if ("last30".equals(rangeKey)) {
            for (int i = 29; i >= 0; i--) {
                LocalDate d = today.minusDays(i);
                cur.add(d.atStartOfDay(VN_ZONE));
                prev.add(d.minusDays(30).atStartOfDay(VN_ZONE));
            }
        } else if ("all".equals(rangeKey) || "year".equals(rangeKey)) {
            // Chia theo THÁNG — kỳ dài hàng năm ⇒ hàng nghìn bucket/ngày không đọc được.
            // Kỳ hiện tại: từ tháng đầu của khoảng → tháng hiện tại.
            // Kỳ trước: CÙNG số tháng, lùi lại đúng độ dài (công bằng khi so sánh).
            //
            // ⚠️ Khoảng "all" KHÔNG có kỳ trước (xem `Period.of`) ⇒ `prev` rỗng ⇒
            // biểu đồ chỉ hiển thị MỘT chuỗi liên tục từ tháng có dữ liệu đầu tiên.
            boolean allRange = "all".equals(rangeKey);
            // ⚠️ Khoảng "Năm" phải chia TRONG NĂM HIỆN TẠI (12 tháng) — dùng
            // `period.from` (đã là 01/01 của năm nay) chứ không phải tháng hiện tại,
            // nếu không chuỗi chỉ có 1–2 điểm và biểu đồ gần như trống.
            YearMonth firstMonth = YearMonth.from(period.from.atZone(VN_ZONE).toLocalDate());
            YearMonth lastMonth = YearMonth.from(today);
            int monthCount = (int) (ChronoUnit.MONTHS.between(firstMonth, lastMonth) + 1);
            for (int i = 0; i < monthCount; i++) {
                YearMonth m = firstMonth.plusMonths(i);
                cur.add(m.atDay(1).atStartOfDay(VN_ZONE));
                if (!allRange) {
                    prev.add(m.minusMonths(monthCount).atDay(1).atStartOfDay(VN_ZONE));
                }
            }
        } else {
            LocalDate first = today.withDayOfMonth(1);
            LocalDate prevFirst = first.minusMonths(1);
            for (int i = 0; i < today.getDayOfMonth(); i++) {
                cur.add(first.plusDays(i).atStartOfDay(VN_ZONE));
                LocalDate p = prevFirst.plusDays(i);
                prev.add(p.getMonth() == prevFirst.getMonth() ? p.atStartOfDay(VN_ZONE) : null);
            }
        }

        int n = cur.size();
        BigDecimal[] revenue = new BigDecimal[n];
        BigDecimal[] prevRevenue = new BigDecimal[n];
        long[] bookings = new long[n];
        long[] prevBookings = new long[n];
        long[] checkIns = new long[n];
        long[] prevCheckIns = new long[n];
        java.util.Arrays.fill(revenue, BigDecimal.ZERO);
        java.util.Arrays.fill(prevRevenue, BigDecimal.ZERO);

        // Một khoảng truy vấn bao cả kỳ trước lẫn kỳ này (kỳ trước luôn bắt đầu sớm hơn).
        // ⚠️ Khoảng "all" không có kỳ trước ⇒ `prev` rỗng ⇒ chỉ tải dữ liệu kỳ hiện tại.
        boolean hasPrevSeries = !prev.isEmpty();
        Instant from = hasPrevSeries && prev.get(0).toInstant().isBefore(cur.get(0).toInstant())
                ? prev.get(0).toInstant()
                : cur.get(0).toInstant();
        Instant to = monthly
                ? cur.get(n - 1).plusMonths(1).toInstant()
                : cur.get(n - 1).plus(step).toInstant();

        // Khách du khách KHÁC NHAU theo từng mốc — cần giữ danh sách id để loại trùng.
        List<Set<Long>> uniqueTourists = new ArrayList<>();
        List<Set<Long>> prevUniqueTourists = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            uniqueTourists.add(new HashSet<>());
            prevUniqueTourists.add(new HashSet<>());
        }

        // Bộ lọc tour/khu vực — dựng động để tham số JPQL luôn đánh số liên tục.
        StringBuilder seriesFilter = new StringBuilder();
        List<Object> seriesParams = new ArrayList<>(List.of(PAID_BOOKING, userId, from, to));
        if (filter != null && filter.tourId() != null) {
            seriesParams.add(filter.tourId());
            seriesFilter.append(" and b.tour.tourId = ?").append(seriesParams.size());
        }
        if (filter != null && filter.regionId() != null) {
            seriesParams.add(filter.regionId());
            seriesFilter.append(" and b.tour.region.id = ?").append(seriesParams.size());
        }

        query("select b.paidAt, b.totalAmount, b.tourist.id from Booking b where b.status in ?1 "
                + "and b.tour.createdBy.id = ?2 and b.paidAt >= ?3 and b.paidAt < ?4" + seriesFilter,
                Object[].class, seriesParams.toArray())
                .getResultList().forEach(r -> {
                    Instant at = (Instant) r[0];
                    BigDecimal amount = r[1] == null ? BigDecimal.ZERO : (BigDecimal) r[1];
                    Long touristId = r[2] == null ? null : ((Number) r[2]).longValue();
                    int i = monthly ? monthBucketOf(cur, at) : bucketOf(cur, at, step);
                    if (i >= 0) {
                        revenue[i] = revenue[i].add(amount);
                        bookings[i]++;
                        if (touristId != null) uniqueTourists.get(i).add(touristId);
                    }
                    int j = monthly ? monthBucketOf(prev, at) : bucketOf(prev, at, step);
                    if (j >= 0) {
                        prevRevenue[j] = prevRevenue[j].add(amount);
                        prevBookings[j]++;
                        if (touristId != null) prevUniqueTourists.get(j).add(touristId);
                    }
                });

        query("select c.checkedInAt from UserCheckInPoint c where c.isValid = true "
                + "and c.experience.destination.createdBy.id = ?1 and c.checkedInAt >= ?2 and c.checkedInAt < ?3",
                Instant.class, userId, from, to)
                .getResultList().forEach(at -> {
                    int i = monthly ? monthBucketOf(cur, at) : bucketOf(cur, at, step);
                    if (i >= 0) checkIns[i]++;
                    int j = monthly ? monthBucketOf(prev, at) : bucketOf(prev, at, step);
                    if (j >= 0) prevCheckIns[j]++;
                });

        List<ProviderDashboardResponse.SeriesPoint> points = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            boolean hasPrev = hasPrevSeries && prev.get(i) != null;
            points.add(new ProviderDashboardResponse.SeriesPoint(
                    cur.get(i).toInstant(), hasPrev ? prev.get(i).toInstant() : null,
                    revenue[i], bookings[i], checkIns[i],
                    hasPrev ? prevRevenue[i] : null, hasPrev ? prevBookings[i] : null, hasPrev ? prevCheckIns[i] : null,
                    (long) uniqueTourists.get(i).size(),
                    hasPrev ? (long) prevUniqueTourists.get(i).size() : null));
        }
        return points;
    }

    /** Vị trí mốc chứa thời điểm `at` (mốc = [start, start + step)); -1 nếu không thuộc mốc nào. */
    private static int bucketOf(List<ZonedDateTime> starts, Instant at, Duration step) {
        if (at == null) return -1;
        for (int i = 0; i < starts.size(); i++) {
            ZonedDateTime s = starts.get(i);
            if (s == null) continue;
            Instant begin = s.toInstant();
            if (!at.isBefore(begin) && at.isBefore(begin.plus(step))) return i;
        }
        return -1;
    }

    /**
     * Vị trí mốc THÁNG chứa thời điểm `at`.
     *
     * <p>Dùng cho các kỳ dài hàng năm ("Tất cả", "Năm") — chia theo ngày sẽ ra hàng
     * nghìn mốc ⇒ biểu đồ không đọc được.
     */
    private static int monthBucketOf(List<ZonedDateTime> starts, Instant at) {
        if (at == null) return -1;
        YearMonth target = YearMonth.from(at.atZone(VN_ZONE));
        for (int i = 0; i < starts.size(); i++) {
            ZonedDateTime s = starts.get(i);
            if (s == null) continue;
            if (YearMonth.from(s).equals(target)) return i;
        }
        return -1;
    }

    // ───────────────────────── MODERATOR ─────────────────────────

    public ModeratorDashboardResponse moderator(String range, String fromParam, String toParam) {
        Instant startOfToday = startOfToday();
        Instant now = Instant.now();

        // ── Khoảng thời gian đang xem ─────────────────────────────────────
        // all | last24h | last7d | last30d | custom
        String rangeKey = (range == null || range.isBlank()) ? "all" : range.trim().toLowerCase();
        Instant windowFrom;
        String rangeLabel;
        switch (rangeKey) {
            case "last24h" -> {
                windowFrom = now.minus(Duration.ofHours(24));
                rangeLabel = "24 giờ qua";
            }
            case "last7d" -> {
                windowFrom = now.minus(Duration.ofDays(7));
                rangeLabel = "7 ngày qua";
            }
            case "last30d" -> {
                windowFrom = now.minus(Duration.ofDays(30));
                rangeLabel = "30 ngày qua";
            }
            case "custom" -> {
                LocalDate today = now.atZone(VN_ZONE).toLocalDate();
                LocalDate fromDate = parseDateOrDefault(fromParam, today.minusDays(29));
                LocalDate toDate = parseDateOrDefault(toParam, today);
                if (toDate.isBefore(fromDate)) {
                    LocalDate tmp = fromDate;
                    fromDate = toDate;
                    toDate = tmp;
                }
                windowFrom = fromDate.atStartOfDay(VN_ZONE).toInstant();
                rangeLabel = "Khoảng tùy chọn";
            }
            default -> {
                rangeKey = "all";
                windowFrom = LocalDate.of(2020, 1, 1).atStartOfDay(VN_ZONE).toInstant();
                rangeLabel = "Tất cả";
            }
        }

        var pending = new ModeratorDashboardResponse.PendingStats(
                count("select count(r) from DestinationReview r where r.status = ?1", DestinationReviewStatus.PENDING),
                count("select count(r) from TourReview r where r.status = ?1", TourReviewStatus.PENDING),
                count("select count(r) from ContentReview r where r.status = ?1", ContentReviewStatus.PENDING));

        long approvedToday =
                count("select count(r) from DestinationReview r where r.status = ?1 and r.reviewedAt >= ?2",
                        DestinationReviewStatus.APPROVED, startOfToday)
                + count("select count(r) from TourReview r where r.status = ?1 and r.reviewedAt >= ?2",
                        TourReviewStatus.APPROVED, startOfToday)
                + count("select count(r) from ContentReview r where r.status = ?1 and r.reviewedAt >= ?2",
                        ContentReviewStatus.APPROVED, startOfToday);
        long decidedToday = count("select count(r) from DestinationReview r where r.reviewedAt >= ?1", startOfToday)
                + count("select count(r) from TourReview r where r.reviewedAt >= ?1", startOfToday)
                + count("select count(r) from ContentReview r where r.reviewedAt >= ?1", startOfToday);
        long rejectedTotal =
                count("select count(r) from DestinationReview r where r.status = ?1", DestinationReviewStatus.REJECTED)
                + count("select count(r) from TourReview r where r.status = ?1", TourReviewStatus.REJECTED)
                + count("select count(r) from ContentReview r where r.status = ?1", ContentReviewStatus.REJECTED);

        // ── Phân bổ tuổi hàng chờ theo SLA (áp lực công việc trước mắt) ─────
        // Mốc: <24h = Mới · 24-48h = Cần ưu tiên · >48h = Quá hạn.
        ModeratorDashboardResponse.QueueAge queueAge = buildQueueAge(now);

        // ── Số liệu xử lý TRONG khoảng đang xem ────────────────────────────
        long decidedInRange = countReviewsInRange("DestinationReview", windowFrom, now)
                + countReviewsInRange("TourReview", windowFrom, now)
                + countReviewsInRange("ContentReview", windowFrom, now);
        long approvedInRange = countReviewsInRange("DestinationReview", windowFrom, now, DestinationReviewStatus.APPROVED)
                + countReviewsInRange("TourReview", windowFrom, now, TourReviewStatus.APPROVED)
                + countReviewsInRange("ContentReview", windowFrom, now, ContentReviewStatus.APPROVED);
        long rejectedInRange = countReviewsInRange("DestinationReview", windowFrom, now, DestinationReviewStatus.REJECTED)
                + countReviewsInRange("TourReview", windowFrom, now, TourReviewStatus.REJECTED)
                + countReviewsInRange("ContentReview", windowFrom, now, ContentReviewStatus.REJECTED);

        // Thời gian xử lý tính trong Java vì JPQL không trừ trực tiếp hai Instant
        Instant since = Instant.now().minus(Duration.ofDays(30));
        List<Object[]> durations = new ArrayList<>();
        for (String entity : List.of("DestinationReview", "TourReview", "ContentReview")) {
            durations.addAll(query("select r.submittedAt, r.reviewedAt from " + entity + " r where r.reviewedAt >= ?1 "
                    + "and r.submittedAt is not null", Object[].class, since).getResultList());
        }
        Double avgHours = durations.isEmpty() ? null : durations.stream()
                .mapToLong(r -> Duration.between((Instant) r[0], (Instant) r[1]).toMinutes())
                .average().orElse(0) / 60.0;

        // Thời gian xử lý TRONG khoảng đang xem.
        List<Object[]> rangeDurations = new ArrayList<>();
        for (String entity : List.of("DestinationReview", "TourReview", "ContentReview")) {
            rangeDurations.addAll(query("select r.submittedAt, r.reviewedAt from " + entity + " r where r.reviewedAt >= ?1 "
                    + "and r.reviewedAt <= ?2 and r.submittedAt is not null", Object[].class, windowFrom, now)
                    .getResultList());
        }
        Double avgHoursInRange = rangeDurations.isEmpty() ? null : rangeDurations.stream()
                .mapToLong(r -> Duration.between((Instant) r[0], (Instant) r[1]).toMinutes())
                .average().orElse(0) / 60.0;

        // ── Cấu trúc hàng chờ theo loại mục ────────────────────────────────
        long pendingPostReports = count("select count(r) from PostReport r where r.status = ?1", ReportStatus.PENDING);
        long pendingCommentReports = count("select count(r) from CommentReport r where r.status = ?1", ReportStatus.PENDING);
        long pendingCommunityPosts = count("select count(p) from CommunityPost p where p.status = ?1", PostStatus.PENDING_REVIEW);
        List<ModeratorDashboardResponse.QueueComposition> composition = List.of(
                new ModeratorDashboardResponse.QueueComposition("Tour", pending.tours()),
                new ModeratorDashboardResponse.QueueComposition("Bài cộng đồng", pendingCommunityPosts),
                new ModeratorDashboardResponse.QueueComposition("Báo cáo bài viết", pendingPostReports),
                new ModeratorDashboardResponse.QueueComposition("Báo cáo bình luận", pendingCommentReports));

        // ── Top lý do từ chối trong khoảng đang xem ─────────────────────────
        Map<String, Long> reasonCounts = new LinkedHashMap<>();
        Map<String, Object> rejectedStatuses = new LinkedHashMap<>();
        rejectedStatuses.put("DestinationReview", DestinationReviewStatus.REJECTED);
        rejectedStatuses.put("TourReview", TourReviewStatus.REJECTED);
        rejectedStatuses.put("ContentReview", ContentReviewStatus.REJECTED);
        for (Map.Entry<String, Object> e : rejectedStatuses.entrySet()) {
            query("select r.reason from " + e.getKey() + " r where r.status = ?1 and r.reviewedAt >= ?2 and r.reason is not null",
                    Object[].class, e.getValue(), windowFrom).getResultList()
                    .forEach(r -> reasonCounts.merge(((String) r[0]).trim(), 1L, Long::sum));
        }
        List<ModeratorDashboardResponse.RejectionReason> topReasons = reasonCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> new ModeratorDashboardResponse.RejectionReason(e.getKey(), e.getValue()))
                .toList();

        return new ModeratorDashboardResponse(pending, decidedToday, approvedToday, rejectedTotal,
                pendingPostReports + pendingCommentReports, pendingCommunityPosts,
                avgHours, durations.size(),
                rangeKey, rangeLabel, queueAge, composition, topReasons,
                avgHoursInRange, decidedInRange, approvedInRange, rejectedInRange);
    }

    /**
     * Đếm số hồ sơ đã xử lý (có {@code reviewedAt}) trong khoảng [from, to].
     *
     * @param status khi có ⇒ chỉ đếm hồ sơ có quyết định đúng trạng thái này.
     */
    private long countReviewsInRange(String entity, Instant from, Instant to) {
        return countReviewsInRange(entity, from, to, null);
    }

    private long countReviewsInRange(String entity, Instant from, Instant to, Object status) {
        if (status == null) {
            return count("select count(r) from " + entity + " r where r.reviewedAt >= ?1 and r.reviewedAt <= ?2",
                    from, to);
        }
        return count("select count(r) from " + entity + " r where r.reviewedAt >= ?1 and r.reviewedAt <= ?2 "
                + "and r.status = ?3", from, to, status);
    }

    /**
     * Phân bổ tuổi hàng chờ theo SLA.
     *
     * <p>Ngưỡng: {@code <24h} = Mới · {@code 24-48h} = Cần ưu tiên · {@code >48h} = Quá hạn.
     * Tính trên TOÀN BỘ mục đang chờ (tour, điểm đến, nội dung, bài cộng đồng, báo cáo)
     * vì áp lực công việc là tổng của mọi nguồn việc.
     */
    private ModeratorDashboardResponse.QueueAge buildQueueAge(Instant now) {
        List<Instant> submitted = new ArrayList<>();
        submitted.addAll(query("select r.submittedAt from DestinationReview r where r.status = ?1 and r.submittedAt is not null",
                Object[].class, DestinationReviewStatus.PENDING).getResultList()
                .stream().map(r -> (Instant) r[0]).toList());
        submitted.addAll(query("select r.submittedAt from TourReview r where r.status = ?1 and r.submittedAt is not null",
                Object[].class, TourReviewStatus.PENDING).getResultList()
                .stream().map(r -> (Instant) r[0]).toList());
        submitted.addAll(query("select r.submittedAt from ContentReview r where r.status = ?1 and r.submittedAt is not null",
                Object[].class, ContentReviewStatus.PENDING).getResultList()
                .stream().map(r -> (Instant) r[0]).toList());
        submitted.addAll(query("select p.createdAt from CommunityPost p where p.status = ?1",
                Object[].class, PostStatus.PENDING_REVIEW).getResultList()
                .stream().map(r -> (Instant) r[0]).toList());
        submitted.addAll(query("select r.createdAt from PostReport r where r.status = ?1",
                Object[].class, ReportStatus.PENDING).getResultList()
                .stream().map(r -> (Instant) r[0]).toList());
        submitted.addAll(query("select r.createdAt from CommentReport r where r.status = ?1",
                Object[].class, ReportStatus.PENDING).getResultList()
                .stream().map(r -> (Instant) r[0]).toList());

        long fresh = 0;
        long dueSoon = 0;
        long overdue = 0;
        double oldestHours = 0;
        for (Instant at : submitted) {
            double hours = Duration.between(at, now).toMinutes() / 60.0;
            if (hours >= 48) {
                overdue++;
            } else if (hours >= 24) {
                dueSoon++;
            } else {
                fresh++;
            }
            oldestHours = Math.max(oldestHours, hours);
        }
        return new ModeratorDashboardResponse.QueueAge(fresh, dueSoon, overdue, submitted.size(), oldestHours);
    }

    /** Parse ngày yyyy-MM-dd, fallback về giá trị mặc định khi sai định dạng. */
    private static LocalDate parseDateOrDefault(String value, LocalDate fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return LocalDate.parse(value.trim().substring(0, Math.min(10, value.trim().length())));
        } catch (RuntimeException ex) {
            return fallback;
        }
    }

    // ───────────────────────── Helpers ─────────────────────────

    private long countUsersByRole(String role) {
        return count("select count(u) from User u where u.role.name = ?1", role);
    }

    private long count(String jpql, Object... params) {
        Long value = query(jpql, Long.class, params).getSingleResult();
        return value == null ? 0L : value;
    }

    private BigDecimal sum(String jpql, Object... params) {
        BigDecimal value = query(jpql, BigDecimal.class, params).getSingleResult();
        return value == null ? BigDecimal.ZERO : value;
    }

    private <T> TypedQuery<T> query(String jpql, Class<T> type, Object... params) {
        TypedQuery<T> q = em.createQuery(jpql, type);
        for (int i = 0; i < params.length; i++) q.setParameter(i + 1, params[i]);
        return q;
    }

    private static String name(Object enumValue) {
        return enumValue == null ? null : ((Enum<?>) enumValue).name();
    }

    private static String orDash(Object value) {
        return value == null ? "—" : value.toString();
    }

    private static String formatVnd(BigDecimal amount) {
        return amount == null ? "—" : String.format("%,d đ", amount.longValue()).replace(',', '.');
    }

    private static Instant startOfToday() {
        return LocalDate.now(VN_ZONE).atStartOfDay(VN_ZONE).toInstant();
    }

    private static Instant startOfMonth() {
        return LocalDate.now(VN_ZONE).withDayOfMonth(1).atStartOfDay(VN_ZONE).toInstant();
    }

    /**
     * Khoảng thời gian đang xem và khoảng liền trước có cùng độ dài để so sánh.
     *
     * <p>Các khoảng hỗ trợ: today | week | last30 | month | custom.
     */
    private record Period(String key, Instant from, Instant to, Instant prevFrom, Instant prevTo) {
        static Period of(String range, String fromParam, String toParam) {
            return of(range, fromParam, toParam, null);
        }

        /**
         * @param earliest ngày có dữ liệu đầu tiên — chỉ dùng cho khoảng "all" để
         *                 chuỗi bắt đầu đúng chỗ có dữ liệu thật.
         */
        static Period of(String range, String fromParam, String toParam, LocalDate earliest) {
            ZonedDateTime now = ZonedDateTime.now(VN_ZONE);
            ZonedDateTime today = now.toLocalDate().atStartOfDay(VN_ZONE);
            String key = range == null || range.isBlank() ? "all" : range.trim().toLowerCase();
            if ("custom".equals(key)) {
                LocalDate fromDate = parseDate(fromParam, today.toLocalDate().minusDays(29));
                LocalDate toDate = parseDate(toParam, today.toLocalDate());
                if (toDate.isBefore(fromDate)) {
                    LocalDate tmp = fromDate;
                    fromDate = toDate;
                    toDate = tmp;
                }
                ZonedDateTime currentFrom = fromDate.atStartOfDay(VN_ZONE);
                ZonedDateTime currentTo = toDate.plusDays(1).atStartOfDay(VN_ZONE);
                long days = Duration.between(currentFrom, currentTo).toDays();
                return new Period("custom", currentFrom.toInstant(), currentTo.toInstant(),
                        currentFrom.minus(Duration.ofDays(days)).toInstant(), currentFrom.toInstant());
            }
            return switch (key) {
                case "today" -> new Period("today", today.toInstant(), now.toInstant(),
                        today.minusDays(1).toInstant(), now.minusDays(1).toInstant());
                case "week" -> new Period("week", now.minusDays(7).toInstant(), now.toInstant(),
                        now.minusDays(14).toInstant(), now.minusDays(7).toInstant());
                case "last30" -> new Period("last30", now.minusDays(30).toInstant(), now.toInstant(),
                        now.minusDays(60).toInstant(), now.minusDays(30).toInstant());
                case "year" -> {
                    ZonedDateTime yearStart = today.withDayOfYear(1);
                    ZonedDateTime prevYearStart = yearStart.minusYears(1);
                    yield new Period("year", yearStart.toInstant(), now.toInstant(), prevYearStart.toInstant(),
                            prevYearStart.plus(Duration.between(yearStart, now)).toInstant());
                }
                case "all" -> {
                    // ⚠️ "Tất cả" = TOÀN BỘ lịch sử, KHÔNG có kỳ trước để so sánh.
                    // Bắt đầu từ tháng có dữ liệu đầu tiên ⇒ biểu đồ là MỘT chuỗi
                    // liên tục từ cái cũ nhất tới mới nhất (không đường nét đứt 2013).
                    ZonedDateTime allStart = (earliest != null && !earliest.isAfter(today.toLocalDate()))
                            ? earliest.withDayOfMonth(1).atStartOfDay(VN_ZONE)
                            : today.withYear(2020).withDayOfYear(1);
                    yield new Period("all", allStart.toInstant(), now.toInstant(),
                            // Khoảng trước RỖNG ⇒ mọi số liệu "kỳ trước" = 0, frontend
                            // sẽ bỏ badge % và đường nét đứt khi range = "all".
                            allStart.toInstant(), allStart.toInstant());
                }
                default -> {
                    ZonedDateTime monthStart = today.withDayOfMonth(1);
                    ZonedDateTime prevStart = monthStart.minusMonths(1);
                    yield new Period("month", monthStart.toInstant(), now.toInstant(), prevStart.toInstant(),
                            prevStart.plus(Duration.between(monthStart, now)).toInstant());
                }
            };
        }

        /** Parse ngày yyyy-MM-dd (fallback về giá trị mặc định khi sai định dạng). */
        private static LocalDate parseDate(String value, LocalDate fallback) {
            if (value == null || value.isBlank()) {
                return fallback;
            }
            try {
                return LocalDate.parse(value.trim().substring(0, Math.min(10, value.trim().length())));
            } catch (RuntimeException ex) {
                return fallback;
            }
        }
    }
}
