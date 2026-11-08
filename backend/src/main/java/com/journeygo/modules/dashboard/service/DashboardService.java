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
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
        query("select r.id, r.refundCode, u.fullName, r.proposedAmount, r.declaredReason, r.reasonDetail, r.createdAt "
                + "from RefundRequest r join r.tourist u where r.status = ?1 order by r.createdAt asc", Object[].class,
                RefundStatus.PENDING_REVIEW).setMaxResults(TASK_LIMIT).getResultList()
                .forEach(r -> tasks.add(new AdminDashboardResponse.PendingTask("REFUND", (Long) r[0], (String) r[1],
                        "Yêu cầu hoàn tiền " + r[1],
                        "Du khách: " + r[2] + " · Đề xuất " + formatVnd((BigDecimal) r[3]),
                        r[5] != null ? (String) r[5] : "Lý do: " + name(r[4]),
                        (Instant) r[6], "/admin/finance")));
        tasks.sort(Comparator.comparing(AdminDashboardResponse.PendingTask::submittedAt,
                Comparator.nullsLast(Comparator.naturalOrder())));

        long pendingTotal = count("select count(r) from RefundRequest r where r.status = ?1", RefundStatus.PENDING_REVIEW);

        return new AdminDashboardResponse(users, destinations, checkIns, revenue, recentPayments, pendingTotal,
                tasks.stream().limit(TASK_LIMIT).toList());
    }

    // ───────────────────────── PROVIDER ─────────────────────────

    public ProviderDashboardResponse provider(Long userId, String range) {
        Period period = Period.of(range);

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
        var revenue = new ProviderDashboardResponse.PeriodAmount(
                sum("select sum(b.totalAmount)" + revenueBase + " and b.paidAt >= ?3 and b.paidAt < ?4",
                        PAID_BOOKING, userId, period.from, period.to),
                sum("select sum(b.totalAmount)" + revenueBase + " and b.paidAt >= ?3 and b.paidAt < ?4",
                        PAID_BOOKING, userId, period.prevFrom, period.prevTo),
                sum("select sum(b.totalAmount)" + revenueBase, PAID_BOOKING, userId),
                count("select count(b)" + revenueBase + " and b.paidAt >= ?3 and b.paidAt < ?4",
                        PAID_BOOKING, userId, period.from, period.to));

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

        return new ProviderDashboardResponse(period.key, destinations, checkIns, revenue, missions, rows,
                updates.stream().limit(UPDATE_LIMIT).toList());
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

    /** Khoảng thời gian đang xem và khoảng liền trước có cùng độ dài để so sánh. */
    private record Period(String key, Instant from, Instant to, Instant prevFrom, Instant prevTo) {
        static Period of(String range) {
            ZonedDateTime now = ZonedDateTime.now(VN_ZONE);
            ZonedDateTime today = now.toLocalDate().atStartOfDay(VN_ZONE);
            return switch (range == null ? "month" : range) {
                case "today" -> new Period("today", today.toInstant(), now.toInstant(),
                        today.minusDays(1).toInstant(), now.minusDays(1).toInstant());
                case "week" -> new Period("week", now.minusDays(7).toInstant(), now.toInstant(),
                        now.minusDays(14).toInstant(), now.minusDays(7).toInstant());
                default -> {
                    ZonedDateTime monthStart = today.withDayOfMonth(1);
                    ZonedDateTime prevStart = monthStart.minusMonths(1);
                    yield new Period("month", monthStart.toInstant(), now.toInstant(), prevStart.toInstant(),
                            prevStart.plus(Duration.between(monthStart, now)).toInstant());
                }
            };
        }
    }
}
