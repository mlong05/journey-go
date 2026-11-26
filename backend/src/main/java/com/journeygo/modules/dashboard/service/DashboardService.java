package com.journeygo.modules.dashboard.service;

import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.community.entity.enums.PostStatus;
import com.journeygo.modules.community.entity.enums.ReportStatus;
import com.journeygo.modules.dashboard.dto.AdminDashboardResponse;
import com.journeygo.modules.dashboard.dto.ModeratorDashboardResponse;
import com.journeygo.modules.dashboard.dto.ProviderDashboardResponse;
import com.journeygo.modules.destination.entity.enums.DestinationStatus;
import com.journeygo.modules.experience.entity.enums.TaskStatus;
import com.journeygo.modules.journey.entity.enums.TaskProgressStatus;
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
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Tổng hợp số liệu cho trang tổng quan của Admin, Provider và Moderator.
 * Chỉ đọc dữ liệu thật trong DB; mọi mốc thời gian tính theo múi giờ Việt Nam (Asia/Ho_Chi_Minh).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DM_FMT = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter DMY_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter HM_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private static final int RECENT_LIMIT = 8;
    private static final int TASK_LIMIT = 10;
    private static final int UPDATE_LIMIT = 8;
    private static final int UPCOMING_DAYS = 14;
    private static final List<BookingStatus> PAID_BOOKING = List.of(BookingStatus.CONFIRMED, BookingStatus.COMPLETED);

    private final EntityManager em;

    // ───────────────────────── ADMIN ─────────────────────────

    public AdminDashboardResponse admin() {
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

        List<AdminDashboardResponse.PendingTask> tasks = new ArrayList<>();
        query("select r.id, r.refundCode, u.fullName, r.proposedAmount, r.declaredReason, r.reasonSummary, r.reasonDetail, r.createdAt "
                + "from RefundRequest r join r.tourist u where r.status = ?1 order by r.createdAt asc", Object[].class,
                RefundStatus.PENDING_REVIEW).setMaxResults(TASK_LIMIT).getResultList()
                .forEach(r -> tasks.add(new AdminDashboardResponse.PendingTask("REFUND", (Long) r[0], (String) r[1],
                        "Yêu cầu hoàn tiền " + r[1],
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

    public ProviderDashboardResponse provider(Long userId, String range) {
        return provider(userId, range, "same_span", "prev_1", false);
    }

    public ProviderDashboardResponse provider(Long userId, String range, String compareScope) {
        return provider(userId, range, compareScope, "prev_1", false);
    }

    public ProviderDashboardResponse provider(Long userId, String range, String compareScope,
                                              String compareMode, boolean includeForecast) {
        ProviderPeriod period = ProviderPeriod.of(range, compareScope, compareMode, includeForecast);

        // 1. Thống kê Điểm dừng / Điểm đến (gộp cả Destination độc lập và TourStop thuộc Tour 5 bước)
        Map<DestinationStatus, Long> destByStatus = new HashMap<>();
        query("select d.status, count(d) from Destination d where d.deleted = false and d.createdBy.id = ?1 "
                + "group by d.status", Object[].class, userId).getResultList()
                .forEach(r -> destByStatus.put((DestinationStatus) r[0], (Long) r[1]));

        Map<TourStatus, Long> stopByTourStatus = new HashMap<>();
        query("select t.status, count(s) from TourStop s join s.tour t "
                + "where t.deleted = false and t.tourFormat is not null and t.createdBy.id = ?1 group by t.status",
                Object[].class, userId).getResultList()
                .forEach(r -> stopByTourStatus.put((TourStatus) r[0], (Long) r[1]));

        long destPublished = destByStatus.getOrDefault(DestinationStatus.PUBLISHED, 0L)
                + stopByTourStatus.getOrDefault(TourStatus.PUBLISHED, 0L);
        long destPending = destByStatus.getOrDefault(DestinationStatus.PENDING, 0L)
                + stopByTourStatus.getOrDefault(TourStatus.PENDING_REVIEW, 0L);
        long destRejected = destByStatus.getOrDefault(DestinationStatus.REJECTED, 0L)
                + stopByTourStatus.getOrDefault(TourStatus.REJECTED, 0L)
                + stopByTourStatus.getOrDefault(TourStatus.CHANGES_REQUESTED, 0L);
        long destDraft = destByStatus.getOrDefault(DestinationStatus.DRAFT, 0L)
                + stopByTourStatus.getOrDefault(TourStatus.DRAFT, 0L);
        long destTotal = destPublished + destPending + destRejected + destDraft;

        var destinations = new ProviderDashboardResponse.DestinationStats(
                destTotal, destPublished, destPending, destRejected, destDraft);

        // 2. Thống kê Lượt check-in (UserCheckInPoint luồng cũ + JourneyDestinationProgress của Tour 5 bước)
        String legacyCheckInBase = "select count(c) from UserCheckInPoint c where c.isValid = true "
                + "and c.experience.destination.createdBy.id = ?1";
        String wizardCheckInBase = "select count(jdp) from JourneyDestinationProgress jdp join jdp.journey j, Tour t "
                + "where j.tourId = t.tourId and t.deleted = false and t.tourFormat is not null "
                + "and t.createdBy.id = ?1 and jdp.checkedIn = true";
        String wizardCheckInTimeExpr = "coalesce(jdp.checkedInAt, jdp.completedAt, j.startedAt, j.createdAt)";

        long curCheckIns = count(legacyCheckInBase + " and c.checkedInAt >= ?2 and c.checkedInAt < ?3",
                userId, period.from, period.to)
                + count(wizardCheckInBase + " and " + wizardCheckInTimeExpr + " >= ?2 and " + wizardCheckInTimeExpr + " < ?3",
                userId, period.from, period.to);
        long prevCheckIns = count(legacyCheckInBase + " and c.checkedInAt >= ?2 and c.checkedInAt < ?3",
                userId, period.prevFrom, period.prevTo)
                + count(wizardCheckInBase + " and " + wizardCheckInTimeExpr + " >= ?2 and " + wizardCheckInTimeExpr + " < ?3",
                userId, period.prevFrom, period.prevTo);
        long allTimeCheckIns = count(legacyCheckInBase, userId) + count(wizardCheckInBase, userId);

        var checkIns = new ProviderDashboardResponse.PeriodCount(curCheckIns, prevCheckIns, allTimeCheckIns);

        // 3. Doanh thu & Chỉ số vận hành đặt chỗ (Kỳ này vs Kỳ trước)
        String paidBase = " from Booking b where b.status in ?1 and b.tour.createdBy.id = ?2";
        BigDecimal curRev = sum("select sum(b.totalAmount)" + paidBase + " and b.paidAt >= ?3 and b.paidAt < ?4",
                PAID_BOOKING, userId, period.from, period.to);
        BigDecimal prevRev = sum("select sum(b.totalAmount)" + paidBase + " and b.paidAt >= ?3 and b.paidAt < ?4",
                PAID_BOOKING, userId, period.prevFrom, period.prevTo);
        BigDecimal allTimeRev = sum("select sum(b.totalAmount)" + paidBase, PAID_BOOKING, userId);

        long curBookings = count("select count(b)" + paidBase + " and b.paidAt >= ?3 and b.paidAt < ?4",
                PAID_BOOKING, userId, period.from, period.to);
        long prevBookings = count("select count(b)" + paidBase + " and b.paidAt >= ?3 and b.paidAt < ?4",
                PAID_BOOKING, userId, period.prevFrom, period.prevTo);

        var revenue = new ProviderDashboardResponse.PeriodAmount(
                curRev, prevRev, allTimeRev, curBookings, prevBookings);

        long pendingBookings = count(
                "select count(b) from Booking b where b.status = ?1 and b.tour.createdBy.id = ?2",
                BookingStatus.PENDING_PAYMENT, userId);
        long curGuests = sumLong(
                "select sum(b.slotCount)" + paidBase + " and b.paidAt >= ?3 and b.paidAt < ?4",
                PAID_BOOKING, userId, period.from, period.to);
        long prevGuests = sumLong(
                "select sum(b.slotCount)" + paidBase + " and b.paidAt >= ?3 and b.paidAt < ?4",
                PAID_BOOKING, userId, period.prevFrom, period.prevTo);

        BigDecimal curAov = curBookings > 0
                ? curRev.divide(BigDecimal.valueOf(curBookings), 0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal prevAov = prevBookings > 0
                ? prevRev.divide(BigDecimal.valueOf(prevBookings), 0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        String completedTimeExpr = "coalesce(b.completedAt, b.paidAt, b.updatedAt)";
        long curCompleted = count(
                "select count(b) from Booking b where b.status = ?1 and b.tour.createdBy.id = ?2 "
                        + "and " + completedTimeExpr + " >= ?3 and " + completedTimeExpr + " < ?4",
                BookingStatus.COMPLETED, userId, period.from, period.to);
        long prevCompleted = count(
                "select count(b) from Booking b where b.status = ?1 and b.tour.createdBy.id = ?2 "
                        + "and " + completedTimeExpr + " >= ?3 and " + completedTimeExpr + " < ?4",
                BookingStatus.COMPLETED, userId, period.prevFrom, period.prevTo);

        long curCancelled = count(
                "select count(b) from Booking b where b.status = ?1 and b.tour.createdBy.id = ?2 "
                        + "and b.updatedAt >= ?3 and b.updatedAt < ?4",
                BookingStatus.CANCELLED, userId, period.from, period.to);
        long prevCancelled = count(
                "select count(b) from Booking b where b.status = ?1 and b.tour.createdBy.id = ?2 "
                        + "and b.updatedAt >= ?3 and b.updatedAt < ?4",
                BookingStatus.CANCELLED, userId, period.prevFrom, period.prevTo);

        var operations = new ProviderDashboardResponse.OperationsStats(
                curBookings, prevBookings, pendingBookings,
                curGuests, prevGuests,
                curAov, prevAov,
                curCompleted, prevCompleted,
                curCancelled, prevCancelled);

        // 4. Thống kê Nhiệm vụ & Đố vui văn hóa (cả luồng cũ lẫn Tour 5 bước)
        var missions = computeMissionStats(userId);

        // 5. Hiệu quả theo từng Tour (Doanh thu / Đơn / Khách / Check-in kỳ này vs kỳ trước)
        List<ProviderDashboardResponse.TourPerformanceRow> tourPerformance = computeTourPerformance(userId, period);

        // 6. Danh sách Điểm dừng & Điểm đến kèm số lượt check-in trong kỳ & lũy kế
        List<ProviderDashboardResponse.DestinationRow> rows = computeDestinationRows(userId, period);

        // 7. Đơn đặt gần đây & Lịch khởi hành sắp tới
        List<ProviderDashboardResponse.RecentBookingRow> recentBookings = query(
                "select b.id, b.bookingCode, u.fullName, t.tourId, t.title, b.experienceDate, b.slotCount, "
                        + "b.totalAmount, b.status, b.createdAt, b.paidAt "
                        + "from Booking b join b.tourist u join b.tour t "
                        + "where t.createdBy.id = ?1 order by b.createdAt desc",
                Object[].class, userId)
                .setMaxResults(RECENT_LIMIT).getResultList().stream()
                .map(r -> new ProviderDashboardResponse.RecentBookingRow(
                        (Long) r[0], (String) r[1], (String) r[2], (Long) r[3], (String) r[4],
                        (LocalDate) r[5], ((Number) r[6]).intValue(), (BigDecimal) r[7],
                        name(r[8]), (Instant) r[9], (Instant) r[10]))
                .toList();

        LocalDate today = LocalDate.now(VN_ZONE);
        List<ProviderDashboardResponse.UpcomingDepartureRow> upcomingDepartures = query(
                "select t.tourId, t.title, b.experienceDate, count(b), sum(b.slotCount), t.maxGuestsPerSlot "
                        + "from Booking b join b.tour t "
                        + "where b.status = ?1 and t.createdBy.id = ?2 and b.experienceDate >= ?3 and b.experienceDate <= ?4 "
                        + "group by t.tourId, t.title, b.experienceDate, t.maxGuestsPerSlot "
                        + "order by b.experienceDate asc",
                Object[].class, BookingStatus.CONFIRMED, userId, today, today.plusDays(UPCOMING_DAYS))
                .setMaxResults(RECENT_LIMIT).getResultList().stream()
                .map(r -> new ProviderDashboardResponse.UpcomingDepartureRow(
                        (Long) r[0], (String) r[1], (LocalDate) r[2],
                        ((Number) r[3]).longValue(),
                        r[4] == null ? 0L : ((Number) r[4]).longValue(),
                        (Integer) r[5]))
                .toList();

        // 8. Kết quả thẩm định gần đây
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

        var forecast = computeForecast(userId, period, curGuests, curRev);

        return new ProviderDashboardResponse(
                period.key,
                period.compareMode,
                period.currentLabel,
                period.previousLabel,
                period.previousTitle,
                destinations,
                checkIns,
                revenue,
                operations,
                forecast,
                missions,
                tourPerformance,
                rows,
                recentBookings,
                upcomingDepartures,
                updates.stream().limit(UPDATE_LIMIT).toList(),
                period.seriesUnit,
                providerSeries(userId, period, forecast, includeForecast));
    }

    private ProviderDashboardResponse.ForecastSummary computeForecast(
            Long userId, ProviderPeriod period, long actualGuests, BigDecimal actualRevenue) {
        LocalDate today = LocalDate.now(VN_ZONE);
        LocalDate endDate = period.currentEndDate;
        int remainingDays = endDate.isAfter(today)
                ? (int) ChronoUnit.DAYS.between(today, endDate)
                : 0;

        long confirmedFutureGuests = 0L;
        BigDecimal confirmedFutureRevenue = BigDecimal.ZERO;
        if (remainingDays > 0) {
            Object[] futureRow = query(
                    "select coalesce(sum(b.slotCount), 0L), coalesce(sum(b.totalAmount), 0) "
                            + "from Booking b where b.status = ?1 and b.tour.createdBy.id = ?2 "
                            + "and b.experienceDate > ?3 and b.experienceDate <= ?4",
                    Object[].class, BookingStatus.CONFIRMED, userId, today, endDate)
                    .getSingleResult();
            if (futureRow != null) {
                confirmedFutureGuests = futureRow[0] == null ? 0L : ((Number) futureRow[0]).longValue();
                confirmedFutureRevenue = futureRow[1] == null ? BigDecimal.ZERO : (BigDecimal) futureRow[1];
            }
        }

        // Tốc độ trung bình mỗi ngày trong 14 ngày gần nhất để ước lượng khách đặt cận ngày
        Instant recentFrom = today.minusDays(13).atStartOfDay(VN_ZONE).toInstant();
        Instant nowInstant = Instant.now();
        long recent14Guests = sumLong(
                "select sum(b.slotCount) from Booking b where b.status in ?1 and b.tour.createdBy.id = ?2 "
                        + "and b.paidAt >= ?3 and b.paidAt < ?4",
                PAID_BOOKING, userId, recentFrom, nowInstant);
        BigDecimal recent14Rev = sum(
                "select sum(b.totalAmount) from Booking b where b.status in ?1 and b.tour.createdBy.id = ?2 "
                        + "and b.paidAt >= ?3 and b.paidAt < ?4",
                PAID_BOOKING, userId, recentFrom, nowInstant);

        double avgDailyGuests = recent14Guests / 14.0;
        double avgDailyRev = recent14Rev.doubleValue() / 14.0;
        long estimatedNewGuests = remainingDays > 0 ? Math.round(avgDailyGuests * remainingDays * 0.65) : 0L;
        BigDecimal estimatedNewRevenue = remainingDays > 0
                ? BigDecimal.valueOf(Math.round(avgDailyRev * remainingDays * 0.65))
                : BigDecimal.ZERO;

        long projectedGuests = actualGuests + confirmedFutureGuests + estimatedNewGuests;
        BigDecimal projectedRevenue = actualRevenue.add(confirmedFutureRevenue).add(estimatedNewRevenue);

        // Sức chứa còn trống trên các ngày khởi hành đã công bố trong phần còn lại của kỳ
        Long remainingCapacity = null;
        if (remainingDays > 0) {
            List<Object[]> depSlots = query(
                    "select t.tourId, d.departureDate, t.maxGuestsPerSlot "
                            + "from TourDepartureDate d join d.tour t "
                            + "where t.deleted = false and t.status = ?1 and t.createdBy.id = ?2 "
                            + "and t.maxGuestsPerSlot is not null and d.departureDate > ?3 and d.departureDate <= ?4",
                    Object[].class, TourStatus.PUBLISHED, userId, today, endDate)
                    .getResultList();
            if (!depSlots.isEmpty()) {
                Map<String, Long> heldByTourDate = new HashMap<>();
                query("select b.tour.tourId, b.experienceDate, coalesce(sum(b.slotCount), 0L) "
                                + "from Booking b where b.status in ?1 and b.tour.createdBy.id = ?2 "
                                + "and b.experienceDate > ?3 and b.experienceDate <= ?4 "
                                + "group by b.tour.tourId, b.experienceDate",
                        Object[].class, List.of(BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT),
                        userId, today, endDate)
                        .getResultList().forEach(r -> heldByTourDate.put(r[0] + ":" + r[1],
                                ((Number) r[2]).longValue()));
                long totalRemain = 0L;
                for (Object[] ds : depSlots) {
                    long maxSlot = ((Number) ds[2]).longValue();
                    long held = heldByTourDate.getOrDefault(ds[0] + ":" + ds[1], 0L);
                    totalRemain += Math.max(0L, maxSlot - held);
                }
                remainingCapacity = totalRemain;
            }
        }

        return new ProviderDashboardResponse.ForecastSummary(
                remainingDays,
                actualGuests,
                confirmedFutureGuests,
                estimatedNewGuests,
                projectedGuests,
                actualRevenue,
                confirmedFutureRevenue,
                estimatedNewRevenue,
                projectedRevenue,
                remainingCapacity);
    }

    private ProviderDashboardResponse.MissionStats computeMissionStats(Long userId) {
        long legacyTasks = count(
                "select count(tk) from Task tk where tk.experience.destination.createdBy.id = ?1 and tk.status <> ?2",
                userId, TaskStatus.INACTIVE);
        long wizardQuizQuestions = count(
                "select count(q) from TourStopQuestion q join q.stop s join s.tour t "
                        + "where t.deleted = false and t.tourFormat is not null and t.createdBy.id = ?1",
                userId);
        long wizardExperiences = count(
                "select count(e) from TourStopExperience e join e.stop s join s.tour t "
                        + "where t.deleted = false and t.tourFormat is not null and t.createdBy.id = ?1",
                userId);
        long totalTasks = legacyTasks + wizardQuizQuestions + wizardExperiences;

        long answered = 0L;
        long correct = 0L;

        // Tiến độ trên tất cả các hành trình thuộc tour của đối tác
        List<Object[]> progresses = query(
                "select p.isCorrect, p.correctCount, p.currentQuestionIndex, p.status "
                        + "from JourneyTaskProgress p join p.journey j, Tour t "
                        + "where j.tourId = t.tourId and t.deleted = false and t.createdBy.id = ?1",
                Object[].class, userId).getResultList();

        for (Object[] r : progresses) {
            Boolean isCorrect = (Boolean) r[0];
            Integer correctCount = (Integer) r[1];
            Integer qIdx = (Integer) r[2];
            TaskProgressStatus st = (TaskProgressStatus) r[3];

            if (correctCount != null) {
                int ans = qIdx != null ? qIdx : 0;
                if (ans == 0 && st == TaskProgressStatus.COMPLETED) {
                    ans = Math.max(1, correctCount);
                }
                answered += ans;
                correct += Math.min(ans, Math.max(0, correctCount));
            } else if (isCorrect != null) {
                answered += 1;
                if (Boolean.TRUE.equals(isCorrect)) correct += 1;
            }
        }

        // Cộng thêm các lượt trên nhiệm vụ thuộc điểm đến độc lập mà không đi qua tour của chính đối tác này
        String ownLegacyTasksNotInOwnTour = "select p.isCorrect from JourneyTaskProgress p join p.journey j "
                + "where p.isCorrect is not null "
                + "and p.taskId in (select tk.id from Task tk where tk.experience.destination.createdBy.id = ?1) "
                + "and j.tourId not in (select t.tourId from Tour t where t.createdBy.id = ?1)";
        for (Boolean ok : query(ownLegacyTasksNotInOwnTour, Boolean.class, userId).getResultList()) {
            answered += 1;
            if (Boolean.TRUE.equals(ok)) correct += 1;
        }

        return new ProviderDashboardResponse.MissionStats(totalTasks, answered, correct);
    }

    private List<ProviderDashboardResponse.TourPerformanceRow> computeTourPerformance(Long userId, ProviderPeriod period) {
        List<Object[]> tours = query(
                "select t.tourId, t.title, t.status, t.durationDays, t.tourFormat, "
                        + "(select count(s) from TourStop s where s.tour = t), "
                        + "(select count(td) from TourDestination td where td.tour = t) "
                        + "from Tour t where t.deleted = false and t.createdBy.id = ?1 order by t.updatedAt desc",
                Object[].class, userId).getResultList();
        if (tours.isEmpty()) return List.of();

        Map<Long, BigDecimal> curRevMap = new HashMap<>();
        Map<Long, Long> curBookingMap = new HashMap<>();
        Map<Long, Long> curGuestMap = new HashMap<>();
        query("select b.tour.tourId, sum(b.totalAmount), count(b), sum(b.slotCount) "
                + "from Booking b where b.status in ?1 and b.tour.createdBy.id = ?2 "
                + "and b.paidAt >= ?3 and b.paidAt < ?4 group by b.tour.tourId",
                Object[].class, PAID_BOOKING, userId, period.from, period.to)
                .getResultList().forEach(r -> {
                    Long tid = (Long) r[0];
                    curRevMap.put(tid, r[1] == null ? BigDecimal.ZERO : (BigDecimal) r[1]);
                    curBookingMap.put(tid, ((Number) r[2]).longValue());
                    curGuestMap.put(tid, r[3] == null ? 0L : ((Number) r[3]).longValue());
                });

        Map<Long, BigDecimal> prevRevMap = new HashMap<>();
        Map<Long, Long> prevBookingMap = new HashMap<>();
        query("select b.tour.tourId, sum(b.totalAmount), count(b) "
                + "from Booking b where b.status in ?1 and b.tour.createdBy.id = ?2 "
                + "and b.paidAt >= ?3 and b.paidAt < ?4 group by b.tour.tourId",
                Object[].class, PAID_BOOKING, userId, period.prevFrom, period.prevTo)
                .getResultList().forEach(r -> {
                    Long tid = (Long) r[0];
                    prevRevMap.put(tid, r[1] == null ? BigDecimal.ZERO : (BigDecimal) r[1]);
                    prevBookingMap.put(tid, ((Number) r[2]).longValue());
                });

        Map<Long, BigDecimal> allRevMap = new HashMap<>();
        query("select b.tour.tourId, sum(b.totalAmount) "
                + "from Booking b where b.status in ?1 and b.tour.createdBy.id = ?2 group by b.tour.tourId",
                Object[].class, PAID_BOOKING, userId)
                .getResultList().forEach(r -> allRevMap.put((Long) r[0], r[1] == null ? BigDecimal.ZERO : (BigDecimal) r[1]));

        Map<Long, Long> periodCheckInByTour = new HashMap<>();
        String timeExpr = "coalesce(jdp.checkedInAt, jdp.completedAt, j.startedAt, j.createdAt)";
        query("select j.tourId, count(jdp) from JourneyDestinationProgress jdp join jdp.journey j, Tour t "
                + "where j.tourId = t.tourId and t.deleted = false and t.createdBy.id = ?1 "
                + "and jdp.checkedIn = true and " + timeExpr + " >= ?2 and " + timeExpr + " < ?3 group by j.tourId",
                Object[].class, userId, period.from, period.to)
                .getResultList().forEach(r -> periodCheckInByTour.put((Long) r[0], ((Number) r[1]).longValue()));

        List<ProviderDashboardResponse.TourPerformanceRow> result = new ArrayList<>(tours.size());
        for (Object[] r : tours) {
            Long tid = (Long) r[0];
            String title = (String) r[1];
            String status = name(r[2]);
            int durationDays = ((Number) r[3]).intValue();
            boolean isWizard = r[4] != null;
            int stopCount = isWizard ? ((Number) r[5]).intValue() : ((Number) r[6]).intValue();

            result.add(new ProviderDashboardResponse.TourPerformanceRow(
                    tid,
                    title,
                    status,
                    stopCount,
                    durationDays,
                    curRevMap.getOrDefault(tid, BigDecimal.ZERO),
                    prevRevMap.getOrDefault(tid, BigDecimal.ZERO),
                    allRevMap.getOrDefault(tid, BigDecimal.ZERO),
                    curBookingMap.getOrDefault(tid, 0L),
                    prevBookingMap.getOrDefault(tid, 0L),
                    curGuestMap.getOrDefault(tid, 0L),
                    periodCheckInByTour.getOrDefault(tid, 0L)));
        }
        result.sort(Comparator
                .comparing(ProviderDashboardResponse.TourPerformanceRow::currentRevenue).reversed()
                .thenComparing(Comparator.comparing(ProviderDashboardResponse.TourPerformanceRow::allTimeRevenue).reversed()));
        return result;
    }

    private List<ProviderDashboardResponse.DestinationRow> computeDestinationRows(Long userId, ProviderPeriod period) {
        List<ProviderDashboardResponse.DestinationRow> rows = new ArrayList<>();

        // 1. Trạm dừng thuộc các Tour 5 bước của đối tác
        Map<Long, Long> allStopCheckIns = new HashMap<>();
        query("select jdp.destinationId, count(jdp) from JourneyDestinationProgress jdp join jdp.journey j, Tour t "
                + "where j.tourId = t.tourId and t.deleted = false and t.tourFormat is not null "
                + "and t.createdBy.id = ?1 and jdp.checkedIn = true group by jdp.destinationId",
                Object[].class, userId)
                .getResultList().forEach(r -> allStopCheckIns.put((Long) r[0], ((Number) r[1]).longValue()));

        Map<Long, Long> periodStopCheckIns = new HashMap<>();
        String timeExpr = "coalesce(jdp.checkedInAt, jdp.completedAt, j.startedAt, j.createdAt)";
        query("select jdp.destinationId, count(jdp) from JourneyDestinationProgress jdp join jdp.journey j, Tour t "
                + "where j.tourId = t.tourId and t.deleted = false and t.tourFormat is not null "
                + "and t.createdBy.id = ?1 and jdp.checkedIn = true "
                + "and " + timeExpr + " >= ?2 and " + timeExpr + " < ?3 group by jdp.destinationId",
                Object[].class, userId, period.from, period.to)
                .getResultList().forEach(r -> periodStopCheckIns.put((Long) r[0], ((Number) r[1]).longValue()));

        query("select s.id, s.name, s.shortDescription, t.status, s.latitude, s.longitude, s.qrToken, t.title "
                + "from TourStop s join s.tour t "
                + "where t.deleted = false and t.tourFormat is not null and t.createdBy.id = ?1 "
                + "order by t.updatedAt desc, s.sequenceOrder asc",
                Object[].class, userId)
                .getResultList().forEach(r -> {
                    Long stopId = (Long) r[0];
                    String stopName = r[1] != null && !((String) r[1]).isBlank() ? (String) r[1] : "Điểm dừng chưa đặt tên";
                    String tourTitle = (String) r[7];
                    String subtitle = tourTitle != null && !tourTitle.isBlank()
                            ? "Thuộc tour: " + tourTitle
                            : (String) r[2];
                    TourStatus ts = (TourStatus) r[3];
                    String mappedStatus = switch (ts == null ? TourStatus.DRAFT : ts) {
                        case PUBLISHED -> "PUBLISHED";
                        case PENDING_REVIEW -> "PENDING";
                        case REJECTED, CHANGES_REQUESTED -> "REJECTED";
                        case DRAFT -> "DRAFT";
                    };
                    String qr = (String) r[6];
                    rows.add(new ProviderDashboardResponse.DestinationRow(
                            stopId,
                            stopName,
                            subtitle,
                            mappedStatus,
                            (BigDecimal) r[4],
                            (BigDecimal) r[5],
                            qr != null && !qr.isBlank(),
                            "TOUR_STOP",
                            tourTitle,
                            periodStopCheckIns.getOrDefault(stopId, 0L),
                            allStopCheckIns.getOrDefault(stopId, 0L)));
                });

        // 2. Điểm đến độc lập (luồng cũ, nếu có)
        Map<Long, Long> allDestCheckIns = new HashMap<>();
        query("select c.experience.destination.id, count(c) from UserCheckInPoint c where c.isValid = true "
                + "and c.experience.destination.createdBy.id = ?1 group by c.experience.destination.id",
                Object[].class, userId)
                .getResultList().forEach(r -> allDestCheckIns.put((Long) r[0], ((Number) r[1]).longValue()));

        Map<Long, Long> periodDestCheckIns = new HashMap<>();
        query("select c.experience.destination.id, count(c) from UserCheckInPoint c where c.isValid = true "
                + "and c.experience.destination.createdBy.id = ?1 and c.checkedInAt >= ?2 and c.checkedInAt < ?3 "
                + "group by c.experience.destination.id",
                Object[].class, userId, period.from, period.to)
                .getResultList().forEach(r -> periodDestCheckIns.put((Long) r[0], ((Number) r[1]).longValue()));

        query("select d.id, d.name, d.address, d.status, d.latitude, d.longitude, d.qrToken from Destination d "
                + "where d.deleted = false and d.createdBy.id = ?1 order by d.updatedAt desc",
                Object[].class, userId)
                .getResultList().forEach(r -> {
                    Long destId = (Long) r[0];
                    String qr = (String) r[6];
                    rows.add(new ProviderDashboardResponse.DestinationRow(
                            destId,
                            (String) r[1],
                            (String) r[2],
                            name(r[3]),
                            (BigDecimal) r[4],
                            (BigDecimal) r[5],
                            qr != null && !qr.isBlank(),
                            "DESTINATION",
                            null,
                            periodDestCheckIns.getOrDefault(destId, 0L),
                            allDestCheckIns.getOrDefault(destId, 0L)));
                });

        return rows;
    }

    /**
     * Chuỗi số liệu cho biểu đồ "Diễn biến theo thời gian" (kỳ này đặt cạnh kỳ trước trên cùng hệ mốc):
     *   • today  (hour) : 00h → giờ hiện tại, so với cùng giờ hôm qua
     *   • week   (day)  : Thứ 2 tuần này → hôm nay, so với Thứ 2 → cùng thứ tuần trước
     *   • month  (day)  : Ngày 01 tháng này → hôm nay, so với cùng ngày tháng trước
     *   • quarter(week) : Tuần 1 đầu quý → tuần hiện tại, so với tuần tương ứng quý trước
     *   • year   (month): Tháng 01 → tháng hiện tại, so với tháng tương ứng năm trước
     * Mốc cuối cùng luôn cắt theo thời điểm hiện tại / prevTo để tổng trên biểu đồ khớp 100% với ô KPI đầu trang.
     */
    private List<ProviderDashboardResponse.SeriesPoint> providerSeries(
            Long userId,
            ProviderPeriod period,
            ProviderDashboardResponse.ForecastSummary forecast,
            boolean includeForecast) {
        List<BucketWindow> buckets = period.buckets;
        int n = buckets.size();
        if (n == 0) return List.of();

        BigDecimal[] revenue = new BigDecimal[n];
        BigDecimal[] prevRevenue = new BigDecimal[n];
        long[] bookings = new long[n];
        long[] prevBookings = new long[n];
        long[] guests = new long[n];
        long[] prevGuests = new long[n];
        long[] checkIns = new long[n];
        long[] prevCheckIns = new long[n];
        java.util.Arrays.fill(revenue, BigDecimal.ZERO);
        java.util.Arrays.fill(prevRevenue, BigDecimal.ZERO);

        Instant minFrom = period.prevFrom.isBefore(period.from) ? period.prevFrom : period.from;
        Instant maxTo = period.to;

        query("select b.paidAt, b.totalAmount, b.slotCount from Booking b "
                + "where b.status in ?1 and b.tour.createdBy.id = ?2 and b.paidAt >= ?3 and b.paidAt < ?4",
                Object[].class, PAID_BOOKING, userId, minFrom, maxTo)
                .getResultList().forEach(r -> {
                    Instant at = (Instant) r[0];
                    BigDecimal amount = r[1] == null ? BigDecimal.ZERO : (BigDecimal) r[1];
                    long slotCount = r[2] == null ? 1L : ((Number) r[2]).longValue();
                    int i = findCurrentBucket(buckets, at);
                    if (i >= 0) {
                        revenue[i] = revenue[i].add(amount);
                        bookings[i]++;
                        guests[i] += slotCount;
                    }
                    int j = findPreviousBucket(buckets, at);
                    if (j >= 0) {
                        prevRevenue[j] = prevRevenue[j].add(amount);
                        prevBookings[j]++;
                        prevGuests[j] += slotCount;
                    }
                });

        query("select c.checkedInAt from UserCheckInPoint c where c.isValid = true "
                + "and c.experience.destination.createdBy.id = ?1 and c.checkedInAt >= ?2 and c.checkedInAt < ?3",
                Instant.class, userId, minFrom, maxTo)
                .getResultList().forEach(at -> {
                    int i = findCurrentBucket(buckets, at);
                    if (i >= 0) checkIns[i]++;
                    int j = findPreviousBucket(buckets, at);
                    if (j >= 0) prevCheckIns[j]++;
                });

        String wizardTimeExpr = "coalesce(jdp.checkedInAt, jdp.completedAt, j.startedAt, j.createdAt)";
        query("select " + wizardTimeExpr + " from JourneyDestinationProgress jdp join jdp.journey j, Tour t "
                + "where j.tourId = t.tourId and t.deleted = false and t.tourFormat is not null "
                + "and t.createdBy.id = ?1 and jdp.checkedIn = true "
                + "and " + wizardTimeExpr + " >= ?2 and " + wizardTimeExpr + " < ?3",
                Instant.class, userId, minFrom, maxTo)
                .getResultList().forEach(at -> {
                    int i = findCurrentBucket(buckets, at);
                    if (i >= 0) checkIns[i]++;
                    int j = findPreviousBucket(buckets, at);
                    if (j >= 0) prevCheckIns[j]++;
                });

        // Tính đường dự báo cho các mốc tương lai trong kỳ (neo vào mốc thực tế cuối cùng để đường nối liền mạch)
        BigDecimal[] forecastRevenue = new BigDecimal[n];
        Long[] forecastGuests = new Long[n];
        if (includeForecast && forecast != null && forecast.remainingDays() > 0) {
            int lastActualIdx = -1;
            List<Integer> futureIndices = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                BucketWindow bw = buckets.get(i);
                if (bw.curStart != null && bw.curEnd != null) {
                    lastActualIdx = i;
                } else if (bw.curStart != null && bw.curEnd == null) {
                    futureIndices.add(i);
                }
            }
            if (lastActualIdx >= 0 && !futureIndices.isEmpty()) {
                // Neo điểm đầu tiên tại ngày/tuần hiện tại để nối liền mạch
                forecastRevenue[lastActualIdx] = revenue[lastActualIdx];
                forecastGuests[lastActualIdx] = guests[lastActualIdx];

                // Phân bổ phần khách đã đặt theo đúng ngày khởi hành + phần ước tính cận ngày chia đều
                Map<Integer, Long> confirmedGuestBucket = new HashMap<>();
                Map<Integer, BigDecimal> confirmedRevBucket = new HashMap<>();
                LocalDate today = LocalDate.now(VN_ZONE);
                if (period.currentEndDate.isAfter(today)) {
                    query("select b.experienceDate, coalesce(sum(b.slotCount), 0L), coalesce(sum(b.totalAmount), 0) "
                                    + "from Booking b where b.status = ?1 and b.tour.createdBy.id = ?2 "
                                    + "and b.experienceDate > ?3 and b.experienceDate <= ?4 group by b.experienceDate",
                            Object[].class, BookingStatus.CONFIRMED, userId, today, period.currentEndDate)
                            .getResultList().forEach(r -> {
                                LocalDate expDate = (LocalDate) r[0];
                                Instant expAt = expDate.atStartOfDay(VN_ZONE).plusHours(12).toInstant();
                                int idx = findBucketByStartWindow(buckets, expAt, period.seriesUnit);
                                if (idx >= 0) {
                                    confirmedGuestBucket.merge(idx, ((Number) r[1]).longValue(), Long::sum);
                                    confirmedRevBucket.merge(idx, (BigDecimal) r[2], BigDecimal::add);
                                }
                            });
                }

                int fCount = futureIndices.size();
                long estGuestsPerBucket = Math.round((double) forecast.estimatedNewGuests() / fCount);
                BigDecimal estRevPerBucket = forecast.estimatedNewRevenue()
                        .divide(BigDecimal.valueOf(fCount), 0, RoundingMode.HALF_UP);

                for (int idx : futureIndices) {
                    long fg = confirmedGuestBucket.getOrDefault(idx, 0L) + estGuestsPerBucket;
                    BigDecimal fr = confirmedRevBucket.getOrDefault(idx, BigDecimal.ZERO).add(estRevPerBucket);
                    forecastGuests[idx] = fg;
                    forecastRevenue[idx] = fr;
                }
            }
        }

        List<ProviderDashboardResponse.SeriesPoint> points = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            BucketWindow bw = buckets.get(i);
            boolean hasCur = bw.curStart != null && bw.curEnd != null;
            boolean hasPrev = bw.prevStart != null && bw.prevEnd != null;
            points.add(new ProviderDashboardResponse.SeriesPoint(
                    bw.curStart,
                    hasPrev ? bw.prevStart : null,
                    hasCur ? revenue[i] : null,
                    hasCur ? bookings[i] : null,
                    hasCur ? guests[i] : null,
                    hasCur ? checkIns[i] : null,
                    hasPrev ? prevRevenue[i] : null,
                    hasPrev ? prevBookings[i] : null,
                    hasPrev ? prevGuests[i] : null,
                    hasPrev ? prevCheckIns[i] : null,
                    forecastRevenue[i],
                    forecastGuests[i]));
        }
        return points;
    }

    private static int findBucketByStartWindow(List<BucketWindow> buckets, Instant at, String unit) {
        if (at == null) return -1;
        long spanSeconds = "week".equals(unit) ? 7L * 86400L : ("month".equals(unit) ? 31L * 86400L : 86400L);
        for (int i = 0; i < buckets.size(); i++) {
            Instant start = buckets.get(i).curStart;
            if (start == null) continue;
            Instant end = (i + 1 < buckets.size() && buckets.get(i + 1).curStart != null)
                    ? buckets.get(i + 1).curStart
                    : start.plusSeconds(spanSeconds);
            if (!at.isBefore(start) && at.isBefore(end)) return i;
        }
        return -1;
    }

    private static int findCurrentBucket(List<BucketWindow> buckets, Instant at) {
        if (at == null) return -1;
        for (int i = 0; i < buckets.size(); i++) {
            BucketWindow bw = buckets.get(i);
            if (bw.curStart != null && bw.curEnd != null
                    && !at.isBefore(bw.curStart) && at.isBefore(bw.curEnd)) {
                return i;
            }
        }
        return -1;
    }

    private static int findPreviousBucket(List<BucketWindow> buckets, Instant at) {
        if (at == null) return -1;
        for (int i = 0; i < buckets.size(); i++) {
            BucketWindow bw = buckets.get(i);
            if (bw.prevStart != null && bw.prevEnd != null
                    && !at.isBefore(bw.prevStart) && at.isBefore(bw.prevEnd)) {
                return i;
            }
        }
        return -1;
    }

    // ───────────────────────── MODERATOR ─────────────────────────

    public ModeratorDashboardResponse moderator() {
        Instant startOfToday = startOfToday();

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

        Instant since = Instant.now().minus(Duration.ofDays(30));
        List<Object[]> durations = new ArrayList<>();
        for (String entity : List.of("DestinationReview", "TourReview", "ContentReview")) {
            durations.addAll(query("select r.submittedAt, r.reviewedAt from " + entity + " r where r.reviewedAt >= ?1 "
                    + "and r.submittedAt is not null", Object[].class, since).getResultList());
        }
        Double avgHours = durations.isEmpty() ? null : durations.stream()
                .mapToLong(r -> Duration.between((Instant) r[0], (Instant) r[1]).toMinutes())
                .average().orElse(0) / 60.0;

        return new ModeratorDashboardResponse(pending, decidedToday, approvedToday, rejectedTotal,
                count("select count(r) from PostReport r where r.status = ?1", ReportStatus.PENDING),
                count("select count(p) from CommunityPost p where p.status = ?1", PostStatus.PENDING_REVIEW),
                avgHours, durations.size());
    }

    // ───────────────────────── Helpers ─────────────────────────

    private long countUsersByRole(String role) {
        return count("select count(u) from User u where u.role.name = ?1", role);
    }

    private long count(String jpql, Object... params) {
        Long value = query(jpql, Long.class, params).getSingleResult();
        return value == null ? 0L : value;
    }

    private long sumLong(String jpql, Object... params) {
        Number value = query(jpql, Number.class, params).getSingleResult();
        return value == null ? 0L : value.longValue();
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

    private static String formatVnd(BigDecimal amount) {
        return amount == null ? "—" : String.format("%,d đ", amount.longValue()).replace(',', '.');
    }

    private static Instant startOfToday() {
        return LocalDate.now(VN_ZONE).atStartOfDay(VN_ZONE).toInstant();
    }

    private static Instant startOfMonth() {
        return LocalDate.now(VN_ZONE).withDayOfMonth(1).atStartOfDay(VN_ZONE).toInstant();
    }

    private record BucketWindow(Instant curStart, Instant curEnd, Instant prevStart, Instant prevEnd) {}

    /**
     * Năm khung lịch dương đồng bộ của Đối tác (today | week | month | quarter | year).
     * compareScope = "same_span" (cùng thời lượng đã qua) | "full_prev" (trọn kỳ đối chiếu).
     * compareMode  = "prev_1" | "prev_2" | "prev_4" | "prev_7" | "yoy".
     */
    private record ProviderPeriod(
            String key,
            String compareMode,
            String seriesUnit,
            String currentLabel,
            String previousLabel,
            String previousTitle,
            LocalDate currentEndDate,
            Instant from,
            Instant to,
            Instant prevFrom,
            Instant prevTo,
            List<BucketWindow> buckets
    ) {
        static ProviderPeriod of(String rawRange, String rawCompareScope, String rawCompareMode, boolean includeForecast) {
            ZonedDateTime now = ZonedDateTime.now(VN_ZONE);
            LocalDate today = now.toLocalDate();
            String key = rawRange == null ? "month" : rawRange.trim().toLowerCase();
            boolean fullPrev = rawCompareScope != null && "full_prev".equalsIgnoreCase(rawCompareScope.trim());
            String mode = rawCompareMode == null ? "prev_1" : rawCompareMode.trim().toLowerCase();

            return switch (key) {
                case "today", "day" -> buildToday(now, today, fullPrev, mode);
                case "week" -> buildWeek(now, today, fullPrev, mode, includeForecast);
                case "quarter" -> buildQuarter(now, today, fullPrev, mode, includeForecast);
                case "year" -> buildYear(now, today, fullPrev, mode);
                default -> buildMonth(now, today, fullPrev, mode, includeForecast);
            };
        }

        private static ProviderPeriod buildToday(ZonedDateTime now, LocalDate today, boolean fullPrev, String rawMode) {
            int offsetDays = switch (rawMode) {
                case "prev_2" -> 2;
                case "prev_7", "prev_4" -> 7;
                default -> 1;
            };
            String normMode = offsetDays == 2 ? "prev_2" : (offsetDays == 7 ? "prev_7" : "prev_1");
            String prevTitle = switch (offsetDays) {
                case 2 -> "2 ngày trước";
                case 7 -> "Cùng thứ tuần trước";
                default -> "Hôm qua";
            };
            if ("yoy".equals(rawMode)) {
                normMode = "yoy";
                prevTitle = "Cùng ngày năm trước";
            }

            LocalDate prevDate = "yoy".equals(normMode) ? today.minusYears(1) : today.minusDays(offsetDays);
            ZonedDateTime start = today.atStartOfDay(VN_ZONE);
            ZonedDateTime prevStart = prevDate.atStartOfDay(VN_ZONE);
            ZonedDateTime prevDayEnd = prevDate.plusDays(1).atStartOfDay(VN_ZONE);
            ZonedDateTime prevSameHourEnd = prevStart.plus(Duration.between(start, now));
            ZonedDateTime prevEnd = fullPrev ? prevDayEnd : minTime(prevSameHourEnd, prevDayEnd);

            int maxHour = fullPrev ? 23 : now.getHour();
            List<BucketWindow> buckets = new ArrayList<>(maxHour + 1);
            for (int h = 0; h <= maxHour; h++) {
                ZonedDateTime cs = start.plusHours(h);
                ZonedDateTime ce = h <= now.getHour() ? minTime(cs.plusHours(1), now) : null;
                ZonedDateTime ps = prevStart.plusHours(h);
                ZonedDateTime pe = minTime(ps.plusHours(1), prevEnd);
                buckets.add(new BucketWindow(cs.toInstant(), ce == null ? null : ce.toInstant(),
                        ps.toInstant(), pe.toInstant()));
            }
            String timeStr = now.format(HM_FMT);
            String prevSpan = fullPrev
                    ? prevDate.format(DM_FMT) + " (00:00 – 24:00)"
                    : prevDate.format(DM_FMT) + " (00:00 – " + timeStr + ")";
            return new ProviderPeriod(
                    "today", normMode, "hour",
                    today.format(DM_FMT) + " (00:00 – " + timeStr + ")",
                    prevSpan,
                    prevTitle,
                    today,
                    start.toInstant(), now.toInstant(),
                    prevStart.toInstant(), prevEnd.toInstant(),
                    buckets);
        }

        private static ProviderPeriod buildWeek(ZonedDateTime now, LocalDate today, boolean fullPrev,
                                                String rawMode, boolean includeForecast) {
            LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            LocalDate sunday = monday.plusDays(6);

            String normMode;
            String prevTitle;
            LocalDate prevMonday;
            if ("yoy".equals(rawMode)) {
                normMode = "yoy";
                prevTitle = "Cùng tuần năm trước";
                prevMonday = monday.minusWeeks(52);
            } else if ("prev_4".equals(rawMode)) {
                normMode = "prev_4";
                prevTitle = "4 tuần trước";
                prevMonday = monday.minusWeeks(4);
            } else if ("prev_2".equals(rawMode)) {
                normMode = "prev_2";
                prevTitle = "2 tuần trước";
                prevMonday = monday.minusWeeks(2);
            } else {
                normMode = "prev_1";
                prevTitle = "Tuần trước";
                prevMonday = monday.minusWeeks(1);
            }

            ZonedDateTime start = monday.atStartOfDay(VN_ZONE);
            ZonedDateTime prevStart = prevMonday.atStartOfDay(VN_ZONE);
            ZonedDateTime prevMaxEnd = prevMonday.plusDays(7).atStartOfDay(VN_ZONE);
            ZonedDateTime prevEnd = fullPrev ? prevMaxEnd : minTime(prevStart.plus(Duration.between(start, now)), prevMaxEnd);

            int daysElapsed = (int) ChronoUnit.DAYS.between(monday, today) + 1;
            int totalSlots = (fullPrev || includeForecast) ? 7 : daysElapsed;
            List<BucketWindow> buckets = new ArrayList<>(totalSlots);
            for (int i = 0; i < totalSlots; i++) {
                ZonedDateTime cs = monday.plusDays(i).atStartOfDay(VN_ZONE);
                ZonedDateTime ce = i < daysElapsed ? minTime(cs.plusDays(1), now) : null;
                ZonedDateTime ps = prevMonday.plusDays(i).atStartOfDay(VN_ZONE);
                ZonedDateTime pe = ps.isBefore(prevEnd) ? minTime(ps.plusDays(1), prevEnd) : null;
                buckets.add(new BucketWindow(cs.toInstant(), ce == null ? null : ce.toInstant(),
                        ps.toInstant(), pe == null ? null : pe.toInstant()));
            }
            LocalDate prevLastDay = fullPrev ? prevMonday.plusDays(6) : prevMonday.plusDays(daysElapsed - 1L);
            return new ProviderPeriod(
                    "week", normMode, "day",
                    fmtSpan(monday, today, false),
                    fmtSpan(prevMonday, prevLastDay, false),
                    prevTitle,
                    sunday,
                    start.toInstant(), now.toInstant(),
                    prevStart.toInstant(), prevEnd.toInstant(),
                    buckets);
        }

        private static ProviderPeriod buildMonth(ZonedDateTime now, LocalDate today, boolean fullPrev,
                                                 String rawMode, boolean includeForecast) {
            LocalDate first = today.withDayOfMonth(1);
            LocalDate monthEnd = first.withDayOfMonth(first.lengthOfMonth());

            String normMode;
            String prevTitle;
            LocalDate prevFirst;
            if ("yoy".equals(rawMode)) {
                normMode = "yoy";
                prevTitle = "Cùng tháng năm trước";
                prevFirst = first.minusYears(1);
            } else if ("prev_3".equals(rawMode)) {
                normMode = "prev_3";
                prevTitle = "3 tháng trước";
                prevFirst = first.minusMonths(3);
            } else if ("prev_2".equals(rawMode)) {
                normMode = "prev_2";
                prevTitle = "2 tháng trước";
                prevFirst = first.minusMonths(2);
            } else {
                normMode = "prev_1";
                prevTitle = "1 tháng trước";
                prevFirst = first.minusMonths(1);
            }

            ZonedDateTime start = first.atStartOfDay(VN_ZONE);
            ZonedDateTime prevStart = prevFirst.atStartOfDay(VN_ZONE);
            ZonedDateTime maxPrevEnd = prevFirst.plusMonths(1).atStartOfDay(VN_ZONE);
            ZonedDateTime rawPrevEnd = prevStart.plus(Duration.between(start, now));
            ZonedDateTime prevEnd = fullPrev ? maxPrevEnd : (rawPrevEnd.isAfter(maxPrevEnd) ? maxPrevEnd : rawPrevEnd);

            int daysElapsed = today.getDayOfMonth();
            int curMonthLen = first.lengthOfMonth();
            int totalSlots = includeForecast
                    ? Math.max(curMonthLen, fullPrev ? prevFirst.lengthOfMonth() : daysElapsed)
                    : (fullPrev ? Math.max(daysElapsed, prevFirst.lengthOfMonth()) : daysElapsed);

            List<BucketWindow> buckets = new ArrayList<>(totalSlots);
            for (int i = 0; i < totalSlots; i++) {
                LocalDate cDate = first.plusDays(i);
                ZonedDateTime cs = cDate.getMonth() == first.getMonth() ? cDate.atStartOfDay(VN_ZONE) : null;
                ZonedDateTime ce = (cs != null && i < daysElapsed) ? minTime(cs.plusDays(1), now) : null;

                LocalDate pDate = prevFirst.plusDays(i);
                ZonedDateTime ps = pDate.getMonth() == prevFirst.getMonth() ? pDate.atStartOfDay(VN_ZONE) : null;
                ZonedDateTime pe = (ps != null && ps.isBefore(prevEnd)) ? minTime(ps.plusDays(1), prevEnd) : null;

                buckets.add(new BucketWindow(
                        cs == null ? null : cs.toInstant(),
                        ce == null ? null : ce.toInstant(),
                        ps == null ? null : ps.toInstant(),
                        pe == null ? null : pe.toInstant()));
            }
            int prevLastDom = fullPrev ? prevFirst.lengthOfMonth() : Math.min(daysElapsed, prevFirst.lengthOfMonth());
            LocalDate prevLastDay = prevFirst.withDayOfMonth(prevLastDom);
            return new ProviderPeriod(
                    "month", normMode, "day",
                    fmtSpan(first, today, false),
                    fmtSpan(prevFirst, prevLastDay, false),
                    prevTitle,
                    monthEnd,
                    start.toInstant(), now.toInstant(),
                    prevStart.toInstant(), prevEnd.toInstant(),
                    buckets);
        }

        private static ProviderPeriod buildQuarter(ZonedDateTime now, LocalDate today, boolean fullPrev,
                                                   String rawMode, boolean includeForecast) {
            int qIndex = (today.getMonthValue() - 1) / 3;
            LocalDate qStart = LocalDate.of(today.getYear(), qIndex * 3 + 1, 1);
            LocalDate qEndLimit = qStart.plusMonths(3);
            LocalDate qEndDate = qEndLimit.minusDays(1);

            String normMode;
            String prevTitle;
            LocalDate prevQStart;
            if ("yoy".equals(rawMode)) {
                normMode = "yoy";
                prevTitle = "Cùng quý năm trước";
                prevQStart = qStart.minusYears(1);
            } else if ("prev_2".equals(rawMode)) {
                normMode = "prev_2";
                prevTitle = "2 quý trước";
                prevQStart = qStart.minusMonths(6);
            } else {
                normMode = "prev_1";
                prevTitle = "Quý trước";
                prevQStart = qStart.minusMonths(3);
            }
            LocalDate prevQEndLimit = prevQStart.plusMonths(3);

            ZonedDateTime start = qStart.atStartOfDay(VN_ZONE);
            ZonedDateTime curQuarterMax = qEndLimit.atStartOfDay(VN_ZONE);
            ZonedDateTime prevStart = prevQStart.atStartOfDay(VN_ZONE);
            ZonedDateTime maxPrevEnd = prevQEndLimit.atStartOfDay(VN_ZONE);
            ZonedDateTime rawPrevEnd = prevStart.plus(Duration.between(start, now));
            ZonedDateTime prevEnd = fullPrev ? maxPrevEnd : (rawPrevEnd.isAfter(maxPrevEnd) ? maxPrevEnd : rawPrevEnd);

            long daysElapsed = ChronoUnit.DAYS.between(qStart, today) + 1;
            int curWeekCount = (int) ((daysElapsed + 6) / 7);
            long curQuarterDays = ChronoUnit.DAYS.between(qStart, qEndLimit);
            int curFullWeekCount = (int) ((curQuarterDays + 6) / 7);
            long prevQuarterDays = ChronoUnit.DAYS.between(prevQStart, prevQEndLimit);
            int prevFullWeekCount = (int) ((prevQuarterDays + 6) / 7);

            int totalWeeks = includeForecast
                    ? Math.max(curFullWeekCount, fullPrev ? prevFullWeekCount : curWeekCount)
                    : (fullPrev ? Math.max(curWeekCount, prevFullWeekCount) : curWeekCount);

            List<BucketWindow> buckets = new ArrayList<>(totalWeeks);
            for (int w = 0; w < totalWeeks; w++) {
                ZonedDateTime rawCs = qStart.plusDays(w * 7L).atStartOfDay(VN_ZONE);
                ZonedDateTime cs = rawCs.isBefore(curQuarterMax) ? rawCs : null;
                ZonedDateTime ce = (cs != null && w < curWeekCount) ? minTime(cs.plusDays(7), now) : null;

                ZonedDateTime rawPs = prevQStart.plusDays(w * 7L).atStartOfDay(VN_ZONE);
                ZonedDateTime ps = rawPs.isBefore(maxPrevEnd) ? rawPs : null;
                ZonedDateTime pe = (ps != null && ps.isBefore(prevEnd))
                        ? minTime(minTime(ps.plusDays(7), maxPrevEnd), prevEnd)
                        : null;

                buckets.add(new BucketWindow(
                        cs == null ? null : cs.toInstant(),
                        ce == null ? null : ce.toInstant(),
                        ps == null ? null : ps.toInstant(),
                        pe == null ? null : pe.toInstant()));
            }
            int curQuarterNum = qIndex + 1;
            int prevQuarterNum = ((prevQStart.getMonthValue() - 1) / 3) + 1;
            LocalDate prevLastDay = prevEnd.minusNanos(1).toLocalDate();
            return new ProviderPeriod(
                    "quarter", normMode, "week",
                    "Q" + curQuarterNum + "/" + today.getYear() + " (" + fmtSpan(qStart, today, false) + ")",
                    "Q" + prevQuarterNum + "/" + prevQStart.getYear() + " (" + fmtSpan(prevQStart, prevLastDay, false) + ")",
                    prevTitle,
                    qEndDate,
                    start.toInstant(), now.toInstant(),
                    prevStart.toInstant(), prevEnd.toInstant(),
                    buckets);
        }

        private static ProviderPeriod buildYear(ZonedDateTime now, LocalDate today, boolean fullPrev, String rawMode) {
            int offsetYears = "prev_2".equals(rawMode) ? 2 : 1;
            String normMode = offsetYears == 2 ? "prev_2" : "prev_1";
            String prevTitle = offsetYears == 2 ? "2 năm trước" : "Năm trước";

            LocalDate yStart = LocalDate.of(today.getYear(), 1, 1);
            LocalDate prevYStart = yStart.minusYears(offsetYears);
            ZonedDateTime start = yStart.atStartOfDay(VN_ZONE);
            ZonedDateTime prevStart = prevYStart.atStartOfDay(VN_ZONE);
            ZonedDateTime prevMaxEnd = prevYStart.plusYears(1).atStartOfDay(VN_ZONE);
            ZonedDateTime prevEnd = fullPrev ? prevMaxEnd : minTime(now.minusYears(offsetYears), prevMaxEnd);

            int monthsElapsed = today.getMonthValue();
            int totalMonths = fullPrev ? 12 : monthsElapsed;
            List<BucketWindow> buckets = new ArrayList<>(totalMonths);
            for (int m = 0; m < totalMonths; m++) {
                ZonedDateTime cs = yStart.plusMonths(m).atStartOfDay(VN_ZONE);
                ZonedDateTime ce = m < monthsElapsed ? minTime(cs.plusMonths(1), now) : null;
                ZonedDateTime ps = prevYStart.plusMonths(m).atStartOfDay(VN_ZONE);
                ZonedDateTime pe = ps.isBefore(prevEnd) ? minTime(ps.plusMonths(1), prevEnd) : null;
                buckets.add(new BucketWindow(
                        cs.toInstant(),
                        ce == null ? null : ce.toInstant(),
                        ps.toInstant(),
                        pe == null ? null : pe.toInstant()));
            }
            LocalDate prevLastDay = fullPrev ? prevYStart.withMonth(12).withDayOfMonth(31) : prevEnd.minusNanos(1).toLocalDate();
            return new ProviderPeriod(
                    "year", normMode, "month",
                    fmtSpan(yStart, today, true),
                    fmtSpan(prevYStart, prevLastDay, true),
                    prevTitle,
                    LocalDate.of(today.getYear(), 12, 31),
                    start.toInstant(), now.toInstant(),
                    prevStart.toInstant(), prevEnd.toInstant(),
                    buckets);
        }

        private static ZonedDateTime minTime(ZonedDateTime a, ZonedDateTime b) {
            return a.isBefore(b) ? a : b;
        }

        private static String fmtSpan(LocalDate from, LocalDate to, boolean withYear) {
            DateTimeFormatter f = withYear ? DMY_FMT : DM_FMT;
            if (from.equals(to)) return from.format(f);
            return from.format(f) + " – " + to.format(f);
        }
    }
}
