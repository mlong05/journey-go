package com.journeygo.modules.dashboard.service;

import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.dashboard.dto.OperationsOverviewResponse;
import com.journeygo.modules.destination.entity.enums.DestinationStatus;
import com.journeygo.modules.journey.entity.enums.JourneyStatus;
import com.journeygo.modules.partnerapplication.entity.enums.PartnerApplicationStatus;
import com.journeygo.modules.partnerprofileupdate.entity.enums.PartnerProfileUpdateStatus;
import com.journeygo.modules.providerrevenue.entity.enums.ProviderRevenueStatus;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import com.journeygo.modules.settlement.entity.enums.FinancialAdjustmentStatus;
import com.journeygo.modules.settlement.entity.enums.SettlementStatus;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.user.entity.Role;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tính toàn bộ số liệu cho Trang Tổng quan vận hành của Admin.
 *
 * <p>Nguyên tắc nghiệp vụ áp dụng xuyên suốt:
 * <ul>
 *   <li><b>GMV</b> = tổng {@code Booking.totalAmount} của các booking ĐÃ thanh toán
 *       (CONFIRMED + COMPLETED). Booking {@code PENDING_PAYMENT} KHÔNG được tính.</li>
 *   <li><b>Doanh thu nền tảng</b> = tổng {@code ProviderRevenue.commissionAmount}
 *       (hoa hồng JourneyGo thu được) — KHÔNG phải toàn bộ tiền khách trả.</li>
 *   <li><b>Hoàn tiền</b> luôn hiển thị riêng, không gộp vào doanh thu.</li>
 *   <li>Mọi số liệu đều có "kỳ trước" cùng độ dài để so sánh tăng trưởng.</li>
 * </ul>
 *
 * <p>⚠️ <b>Tab "Tình hình tài chính &amp; Thanh toán" cố ý TÁCH 3 lớp số liệu</b>
 * (xem {@link #buildFinance}) vì chúng khác nhau cả về mốc thời gian lẫn bản chất tiền:
 * <ol>
 *   <li><b>Dòng tiền khách hàng</b> — theo kỳ đang xem ({@code paid_at} / thời điểm hoàn tiền).</li>
 *   <li><b>Quyết toán</b> — theo đợt tất toán ({@code revenue_period} yyyy-MM).</li>
 *   <li><b>Doanh thu ghi nhận</b> — từ {@code ProviderRevenue}, chỉ gồm tour có đối tác gán.</li>
 * </ol>
 * Trộn 3 lớp này vào cùng một danh sách ô số khiến Admin hiểu nhầm (VD: tưởng
 * "tiền đã quyết toán" là tiền của riêng một đối tác, trong khi đợt BATCH gom N đối tác).
 *
 * <p>Trang này là <b>giao diện giám sát (read-only)</b> — không có thao tác ghi dữ liệu.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OperationsOverviewService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /** Booking đã thu tiền thành công ⇒ được tính vào GMV. */
    private static final List<BookingStatus> PAID_BOOKINGS =
            List.of(BookingStatus.CONFIRMED, BookingStatus.COMPLETED);

    /** Refund đã hoàn thành ⇒ tính vào "Tổng tiền hoàn". */
    private static final List<RefundStatus> REFUNDED_STATUSES = List.of(RefundStatus.REFUNDED);

    private static final int TOP_LIMIT = 5;
    private static final int SETTLEMENT_LIMIT = 6;
    private static final int ACTIVITY_LIMIT = 12;

    private final EntityManager em;

    // ───────────────────────── Entry point ─────────────────────────

    /**
     * Số lượng việc đang chờ theo từng mô-đun — dùng cho badge trên Sidebar Admin.
     *
     * <p>Chỉ tính việc thuộc phạm vi quản trị của Admin (đối tác, quyết toán, hoàn tiền,
     * điều chỉnh tài chính, hồ sơ đối tác). Tour/bài viết thuộc vai trò Kiểm duyệt viên
     * nên không gắn badge điều hướng cho Admin.
     *
     * @return map {@code moduleId -> số lượng đang chờ}
     */    public java.util.Map<String, Long> sidebarBadges() {
        java.util.Map<String, Long> badges = new java.util.LinkedHashMap<>();
        badges.put("partners", count("select count(a) from PartnerApplication a where a.status = ?1",
                PartnerApplicationStatus.PENDING));
        badges.put("partner-profile-updates",
                count("select count(u) from PartnerProfileUpdateRequest u where u.status = ?1",
                        PartnerProfileUpdateStatus.PENDING));
        badges.put("settlements", count("select count(s) from Settlement s where s.status = ?1",
                SettlementStatus.DRAFT));
        badges.put("refunds", count("select count(r) from RefundRequest r where r.status = ?1",
                RefundStatus.PENDING_REVIEW));
        badges.put("finance", count("select count(a) from FinancialAdjustment a where a.status = ?1",
                FinancialAdjustmentStatus.PENDING));
        return badges;
    }

    public OperationsOverviewResponse overview(String range, String fromParam, String toParam) {
        Period period = Period.resolve(range, fromParam, toParam);

        var kpis = buildKpis(period);
        var previousKpis = buildKpis(period.previous());

        List<OperationsOverviewResponse.SparkPoint> revenueTrend = buildTrend(period, "commission");
        List<OperationsOverviewResponse.SparkPoint> previousRevenueTrend = buildTrend(period.previous(), "commission");
        List<OperationsOverviewResponse.SparkPoint> gmvTrend = buildTrend(period, "gmv");
        List<OperationsOverviewResponse.SparkPoint> previousGmvTrend = buildTrend(period.previous(), "gmv");
        List<OperationsOverviewResponse.BookingTrendPoint> bookingTrend = buildBookingTrend(period);

        var bookingBreakdown = buildBookingBreakdown(period);
        var pendingActions = buildPendingActions();
        var finance = buildFinance(period);
        var topTours = buildTopTours(period);
        var experience = buildExperienceStats(period);
        var topDestinations = buildTopDestinations(period);
        var tourists = buildTouristStats(period);
        var partners = buildPartnerStats(period);
        var recentSettlements = buildRecentSettlements();
        var recentActivities = buildRecentActivities();

        long critical = pendingActions.stream().filter(a -> "URGENT".equals(a.severity()))
                .mapToLong(OperationsOverviewResponse.PendingAction::count).sum();
        long pendingTotal = pendingActions.stream()
                .mapToLong(OperationsOverviewResponse.PendingAction::count).sum();
        var health = new OperationsOverviewResponse.SystemHealth(
                critical > 0 ? "DEGRADED" : "STABLE",
                critical > 0 ? "Có việc khẩn cấp" : "Hệ thống ổn định",
                critical > 0, critical, pendingTotal);

        return new OperationsOverviewResponse(
                new OperationsOverviewResponse.PeriodInfo(period.key, period.label, period.from, period.to,
                        period.previousFrom, period.previousTo, period.days()),
                health, kpis, previousKpis,
                revenueTrend, previousRevenueTrend, gmvTrend, previousGmvTrend,
                bookingBreakdown, bookingTrend,
                pendingActions, finance,
                topTours, experience, topDestinations,
                tourists, partners,
                recentSettlements, recentActivities,
                Instant.now());
    }

    // ───────────────────────── KPI ─────────────────────────

    private OperationsOverviewResponse.KpiSummary buildKpis(Period p) {
        BigDecimal gmv = sum("select sum(b.totalAmount) from Booking b where b.status in ?1 "
                + "and b.paidAt >= ?2 and b.paidAt < ?3", PAID_BOOKINGS, p.from, p.to);

        BigDecimal commission = sum("select sum(r.commissionAmount) from ProviderRevenue r "
                + "where r.booking.paidAt >= ?1 and r.booking.paidAt < ?2", p.from, p.to);

        // ⚠️ Số lượng booking dùng MỐC TẠO BOOKING (createdAt) và phân loại theo
        // trạng thái HIỆN TẠI ⇒ tổng luôn khớp với "Tổng lượt đặt tour" và với
        // biểu đồ trạng thái booking (cùng một cửa sổ thời gian, cùng một cách đếm).
        long totalBookings = count("select count(b) from Booking b where b.createdAt >= ?1 and b.createdAt < ?2",
                p.from, p.to);
        long successfulBookings = count("select count(b) from Booking b where b.status in ?1 "
                + "and b.createdAt >= ?2 and b.createdAt < ?3", PAID_BOOKINGS, p.from, p.to);
        long activeTourists = count("select count(distinct b.tourist.id) from Booking b "
                + "where b.createdAt >= ?1 and b.createdAt < ?2", p.from, p.to);
        long activeProviders = count("select count(distinct t.createdBy.id) from Tour t "
                + "where t.deleted = false and t.status = ?1 and t.publishedAt >= ?2 and t.publishedAt < ?3",
                TourStatus.PUBLISHED, p.from, p.to);

        return new OperationsOverviewResponse.KpiSummary(
                commission, gmv, totalBookings, successfulBookings, activeTourists, activeProviders);
    }

    // ───────────────────────── Xu hướng ─────────────────────────

    /**
     * Chuỗi điểm theo ngày (hoặc theo giờ/tháng tùy kỳ) cho biểu đồ xu hướng.
     *
     * @param metric "commission" (doanh thu nền tảng) | "gmv" (giá trị giao dịch)
     */
    private List<OperationsOverviewResponse.SparkPoint> buildTrend(Period p, String metric) {
        Map<String, BigDecimal> commissionByBucket = new LinkedHashMap<>();
        Map<String, BigDecimal> gmvByBucket = new LinkedHashMap<>();

        // Gom doanh thu nền tảng theo vị trí bucket.
        List<Object[]> commissionRows = query(
                "select r.booking.paidAt, r.commissionAmount from ProviderRevenue r "
                        + "where r.booking.paidAt >= ?1 and r.booking.paidAt < ?2", Object[].class, p.from, p.to)
                .getResultList();
        for (Object[] row : commissionRows) {
            if (row[0] == null) continue;
            int index = p.bucketIndex((Instant) row[0]);
            if (index < 0) continue;
            commissionByBucket.merge(String.valueOf(index), toDecimal(row[1]), BigDecimal::add);
        }

        // Gom GMV theo vị trí bucket.
        List<Object[]> gmvRows = query(
                "select b.paidAt, b.totalAmount from Booking b where b.status in ?1 "
                        + "and b.paidAt >= ?2 and b.paidAt < ?3", Object[].class, PAID_BOOKINGS, p.from, p.to)
                .getResultList();
        for (Object[] row : gmvRows) {
            if (row[0] == null) continue;
            int index = p.bucketIndex((Instant) row[0]);
            if (index < 0) continue;
            gmvByBucket.merge(String.valueOf(index), toDecimal(row[1]), BigDecimal::add);
        }

        Map<String, BigDecimal> source = "gmv".equals(metric) ? gmvByBucket : commissionByBucket;
        List<OperationsOverviewResponse.SparkPoint> points = new ArrayList<>();
        for (int index = 0; index < p.bucketCount(); index++) {
            points.add(new OperationsOverviewResponse.SparkPoint(
                    p.bucketLabel(index), source.getOrDefault(String.valueOf(index), BigDecimal.ZERO)));
        }
        return points;
    }

    /** Chuỗi trạng thái booking theo mốc thời gian (cho biểu đồ cột chồng). */
    private List<OperationsOverviewResponse.BookingTrendPoint> buildBookingTrend(Period p) {
        long[][] buckets = new long[p.bucketCount()][4];

        List<Object[]> rows = query(
                "select b.createdAt, b.status from Booking b where b.createdAt >= ?1 and b.createdAt < ?2",
                Object[].class, p.from, p.to).getResultList();
        for (Object[] row : rows) {
            if (row[0] == null || row[1] == null) continue;
            int index = p.bucketIndex((Instant) row[0]);
            if (index < 0) continue;
            BookingStatus status = (BookingStatus) row[1];
            switch (status) {
                case CONFIRMED, COMPLETED -> buckets[index][0]++;
                case PENDING_PAYMENT -> buckets[index][1]++;
                case CANCELLED -> buckets[index][2]++;
                case EXPIRED -> buckets[index][3]++;
                default -> buckets[index][3]++;
            }
        }

        List<OperationsOverviewResponse.BookingTrendPoint> points = new ArrayList<>();
        for (int index = 0; index < buckets.length; index++) {
            long[] slot = buckets[index];
            points.add(new OperationsOverviewResponse.BookingTrendPoint(
                    p.bucketLabel(index), slot[0], slot[1], slot[2], slot[3]));
        }
        return points;
    }

    /**
     * Tổng hợp trạng thái booking trong kỳ.
     *
     * <p>⚠️ Dùng MỐC TẠO BOOKING (createdAt) + trạng thái HIỆN TẠI ⇒ tổng luôn khớp
     * chính xác với biểu đồ trạng thái booking và với KPI "Tổng lượt đặt tour":
     * <pre>thành công + chờ thanh toán + đã hủy + thất bại === tổng booking</pre>
     *
     * <p>"Thất bại" = booking {@code EXPIRED} (quá hạn thanh toán 10 phút).
     */
    private OperationsOverviewResponse.BookingBreakdown buildBookingBreakdown(Period p) {
        long success = count("select count(b) from Booking b where b.status in ?1 "
                + "and b.createdAt >= ?2 and b.createdAt < ?3", PAID_BOOKINGS, p.from, p.to);
        long pending = count("select count(b) from Booking b where b.status = ?1 "
                + "and b.createdAt >= ?2 and b.createdAt < ?3", BookingStatus.PENDING_PAYMENT, p.from, p.to);
        long cancelled = count("select count(b) from Booking b where b.status = ?1 "
                + "and b.createdAt >= ?2 and b.createdAt < ?3", BookingStatus.CANCELLED, p.from, p.to);
        long failed = count("select count(b) from Booking b where b.status = ?1 "
                + "and b.createdAt >= ?2 and b.createdAt < ?3", BookingStatus.EXPIRED, p.from, p.to);

        long total = success + pending + cancelled + failed;
        double ratio = total == 0 ? 0 : round2(success * 100.0 / total);
        return new OperationsOverviewResponse.BookingBreakdown(success, pending, cancelled, failed, total, ratio);
    }

    // ───────────────────────── Action Center ─────────────────────────

    /**
     * Action Center — chỉ gồm việc thuộc phạm vi quản trị của Admin.
     *
     * <p>Admin là vai trò giám sát: duyệt hồ sơ đối tác, duyệt quyết toán, duyệt hoàn tiền,
     * duyệt điều chỉnh tài chính, duyệt yêu cầu đổi thông tin đối tác.
     * Việc thẩm định tour/bài viết thuộc vai trò Kiểm duyệt viên nên ở đây chỉ hiển thị
     * SỐ LƯỢNG chờ để Admin nắm quy mô tải việc, không điều hướng tới mô-đun của role khác.
     */
    private List<OperationsOverviewResponse.PendingAction> buildPendingActions() {
        List<OperationsOverviewResponse.PendingAction> actions = new ArrayList<>();

        // ── Khẩn cấp (đỏ) ──
        // ⚠️ Khiếu nại bài viết thuộc phạm vi Kiểm duyệt viên ⇒ Admin chỉ nắm quy mô
        // tải việc, KHÔNG điều hướng (href = null ⇒ UI hiển thị dạng badge, không link chết).
        long disputes = count("select count(r) from PostReport r where r.status = ?1",
                com.journeygo.modules.community.entity.enums.ReportStatus.PENDING);
        if (disputes > 0) {
            actions.add(new OperationsOverviewResponse.PendingAction("DISPUTES",
                    "Khiếu nại chưa xử lý", "Kiểm duyệt viên đang xử lý", "URGENT", disputes,
                    null, "Kiểm duyệt"));
        }

        long refundPending = count("select count(r) from RefundRequest r where r.status = ?1",
                RefundStatus.PENDING_REVIEW);
        if (refundPending > 0) {
            actions.add(new OperationsOverviewResponse.PendingAction("REFUNDS",
                    "Yêu cầu hoàn tiền chờ duyệt", "Cần quyết định hoàn hay từ chối", "URGENT", refundPending,
                    "/admin/refunds", "Xử lý"));
        }

        // ── Xử lý sớm (cam) ──
        long settlementPending = count("select count(s) from Settlement s where s.status = ?1",
                SettlementStatus.DRAFT);
        if (settlementPending > 0) {
            actions.add(new OperationsOverviewResponse.PendingAction("SETTLEMENTS",
                    "Quyết toán chờ phê duyệt", "Đợt tất toán của đối tác", "SOON", settlementPending,
                    "/admin/settlements", "Phê duyệt"));
        }

        long adjustmentsPending = count("select count(a) from FinancialAdjustment a where a.status = ?1",
                FinancialAdjustmentStatus.PENDING);
        if (adjustmentsPending > 0) {
            actions.add(new OperationsOverviewResponse.PendingAction("ADJUSTMENTS",
                    "Điều chỉnh tài chính chờ duyệt", "Khoản điều chỉnh có căn cứ", "SOON", adjustmentsPending,
                    "/admin/finance", "Phê duyệt"));
        }

        // ── Bình thường (xanh) ──
        long partnerPending = count("select count(a) from PartnerApplication a where a.status = ?1",
                PartnerApplicationStatus.PENDING);
        if (partnerPending > 0) {
            actions.add(new OperationsOverviewResponse.PendingAction("PARTNERS",
                    "Đối tác đăng ký chờ xét duyệt", "Hồ sơ đối tác mới", "NORMAL", partnerPending,
                    "/admin/partners", "Xem hồ sơ"));
        }

        long profileUpdatePending = count("select count(u) from PartnerProfileUpdateRequest u where u.status = ?1",
                PartnerProfileUpdateStatus.PENDING);
        if (profileUpdatePending > 0) {
            actions.add(new OperationsOverviewResponse.PendingAction("PROFILE_UPDATES",
                    "Yêu cầu đổi thông tin đối tác", "Chờ phê duyệt cập nhật hồ sơ", "NORMAL", profileUpdatePending,
                    "/admin/partner-profile-updates", "Xem hồ sơ"));
        }

        // Tải việc thuộc vai trò Kiểm duyệt viên — hiển thị số lượng, không điều hướng.
        long toursPending = count("select count(t) from Tour t where t.deleted = false and t.status = ?1",
                TourStatus.PENDING_REVIEW);
        if (toursPending > 0) {
            actions.add(new OperationsOverviewResponse.PendingAction("TOUR_REVIEWS",
                    "Tour chờ kiểm duyệt", "Kiểm duyệt viên đang xử lý", "NORMAL", toursPending,
                    null, "Theo dõi"));
        }

        return actions;
    }

    // ───────────────────────── Tài chính ─────────────────────────

    private OperationsOverviewResponse.FinanceSnapshot buildFinance(Period p) {
        // LỚP 1 — DÒNG TIỀN KHÁCH HÀNG (theo kỳ đang xem).
        // Tổng tiền khách thực trả = Booking.totalAmount (sau voucher).
        BigDecimal grossPaid = sum("select sum(b.totalAmount) from Booking b where b.status in ?1 "
                + "and b.paidAt >= ?2 and b.paidAt < ?3", PAID_BOOKINGS, p.from, p.to);

        long paidCount = count("select count(b) from Booking b where b.status in ?1 "
                + "and b.paidAt >= ?2 and b.paidAt < ?3", PAID_BOOKINGS, p.from, p.to);

        BigDecimal voucherDiscount = sum("select sum(b.discountAmount) from Booking b "
                + "where b.status in ?1 and b.paidAt >= ?2 and b.paidAt < ?3",
                PAID_BOOKINGS, p.from, p.to);

        // Hoàn tiền: gắn theo thời điểm HOÀN TIỀN HOÀN TẤT (vnpResolvedAt) — đúng thời điểm
        // tiền thực sự chảy ngược ra khách, không dùng updatedAt (bị đổi mỗi lần sửa).
        // Dùng coalesce(vnpResolvedAt, updatedAt) cho các bản ghi cũ chưa có vnpResolvedAt.
        BigDecimal refundAmount = sum("select sum(r.refundedAmount) from RefundRequest r "
                + "where r.status in ?1 and coalesce(r.vnpResolvedAt, r.updatedAt) >= ?2 "
                + "and coalesce(r.vnpResolvedAt, r.updatedAt) < ?3",
                REFUNDED_STATUSES, p.from, p.to);

        // Thực thu = tiền khách trả − tiền đã hoàn. KHÔNG trừ phần chia đối tác
        // (đó là chi phí vận hành, thuộc LỚP 2) ⇒ khớp với /admin/finance.
        BigDecimal netCollected = grossPaid.subtract(refundAmount);

        // LỚP 2 — QUYẾT TOÁN (theo đợt tất toán, KHÔNG lọc theo kỳ đang xem).
        List<Object[]> settledRows = query(
                "select s.settlementAmount, s.partnerCount, s.revenuePeriod from Settlement s "
                        + "where s.status = ?1 order by s.approvedAt desc",
                Object[].class, SettlementStatus.APPROVED).getResultList();
        BigDecimal settledAmount = BigDecimal.ZERO;
        long settledPartnerCount = 0;
        String settledPeriod = null;
        for (Object[] row : settledRows) {
            settledAmount = settledAmount.add(toDecimal(row[0]));
            // Đợt BATCH gom N đối tác ⇒ partnerCount là số đối tác thực sự nhận tiền.
            settledPartnerCount += Math.max(1L, toLong(row[1]));
            if (settledPeriod == null && row[2] != null) {
                settledPeriod = String.valueOf(row[2]);
            }
        }
        long settledSettlementCount = settledRows.size();

        // Tiền đối tác đã đủ điều kiện nhưng CHƯA vào đợt tất toán nào (trong kỳ).
        BigDecimal pendingSettleAmount = sum("select sum(r.providerNetAmount) from ProviderRevenue r "
                + "where r.status = ?1 and r.booking.paidAt >= ?2 and r.booking.paidAt < ?3",
                ProviderRevenueStatus.ELIGIBLE, p.from, p.to);

        // Tổng bộ khoản đủ điều kiện chưa gom vào đợt — TOÀN HỆ THỐNG.
        BigDecimal eligibleRevenueAmount = sum("select sum(r.providerNetAmount) from ProviderRevenue r "
                + "where r.status = ?1", ProviderRevenueStatus.ELIGIBLE);
        long eligibleRevenueCount = count("select count(r) from ProviderRevenue r where r.status = ?1",
                ProviderRevenueStatus.ELIGIBLE);

        // Đợt tất toán nháp (DRAFT) — Admin chưa duyệt ⇒ tiền CHƯA về ví đối tác.
        long draftSettlementCount = count("select count(s) from Settlement s where s.status = ?1",
                SettlementStatus.DRAFT);
        BigDecimal draftSettlementAmount = sum("select sum(s.settlementAmount) from Settlement s "
                + "where s.status = ?1", SettlementStatus.DRAFT);

        // LỚP 3 — DOANH THU GHI NHẬN (từ ProviderRevenue).
        // ⚠️ Chỉ gồm những tour có đối tác được gán đều đức trải nghiệm ⇒ có thể nhỏ hơn
        // nhiều so với GMV. Tối thiểu phải nêu rõ số khoản để Admin tự đối chiếu.
        BigDecimal accruedCommission = sum("select sum(r.commissionAmount) from ProviderRevenue r "
                + "where r.booking.paidAt >= ?1 and r.booking.paidAt < ?2", p.from, p.to);
        BigDecimal accruedPartnerNet = sum("select sum(r.providerNetAmount) from ProviderRevenue r "
                + "where r.booking.paidAt >= ?1 and r.booking.paidAt < ?2", p.from, p.to);
        long accruedRevenueCount = count("select count(r) from ProviderRevenue r "
                + "where r.booking.paidAt >= ?1 and r.booking.paidAt < ?2", p.from, p.to);

        return new OperationsOverviewResponse.FinanceSnapshot(
                grossPaid, voucherDiscount, refundAmount, netCollected, paidCount,
                settledAmount, settledSettlementCount, settledPartnerCount, settledPeriod,
                pendingSettleAmount, eligibleRevenueAmount, eligibleRevenueCount,
                draftSettlementCount, draftSettlementAmount,
                accruedCommission, accruedPartnerNet, accruedRevenueCount);
    }

    // ───────────────────────── Tour & Experience ─────────────────────────

    private List<OperationsOverviewResponse.TopTourRow> buildTopTours(Period p) {
        // Booking giữ ManyToOne tới Tour (Tour KHÔNG có collection bookings) ⇒ join ngược từ Booking.
        List<Object[]> rows = query(
                "select t.id, t.title, t.createdBy.fullName, count(b.id), sum(b.totalAmount) "
                        + "from Booking b join b.tour t "
                        + "where b.status in ?1 and b.paidAt >= ?2 and b.paidAt < ?3 "
                        + "and t.deleted = false "
                        + "group by t.id, t.title, t.createdBy.fullName "
                        + "order by count(b.id) desc, sum(b.totalAmount) desc", Object[].class,
                PAID_BOOKINGS, p.from, p.to).setMaxResults(TOP_LIMIT).getResultList();

        List<OperationsOverviewResponse.TopTourRow> result = new ArrayList<>();
        int rank = 1;
        for (Object[] row : rows) {
            Long tourId = (Long) row[0];
            long bookings = toLong(row[3]);
            BigDecimal revenue = toDecimal(row[4]);

            // Tỷ lệ hoàn thành: booking đã hoàn thành trải nghiệm / tổng booking đã thanh toán.
            long completed = count("select count(b) from Booking b where b.tour.id = ?1 "
                    + "and b.status = ?2 and b.paidAt >= ?3 and b.paidAt < ?4",
                    tourId, BookingStatus.COMPLETED, p.from, p.to);
            double completionRate = bookings == 0 ? 0 : round2(completed * 100.0 / bookings);

            result.add(new OperationsOverviewResponse.TopTourRow(
                    rank++, tourId, (String) row[1], (String) row[2], bookings, revenue, completionRate));
        }
        return result;
    }

    private OperationsOverviewResponse.ExperienceStats buildExperienceStats(Period p) {
        long unlocks = count("select count(j) from Journey j where j.createdAt >= ?1 and j.createdAt < ?2",
                p.from, p.to);
        long checkIns = count("select count(c) from UserCheckInPoint c where c.isValid = true "
                + "and c.checkedInAt >= ?1 and c.checkedInAt < ?2", p.from, p.to);
        long completed = count("select count(j) from Journey j where j.status = ?1 "
                + "and j.completedAt >= ?2 and j.completedAt < ?3", JourneyStatus.COMPLETED, p.from, p.to);
        double rate = unlocks == 0 ? 0 : round2(completed * 100.0 / unlocks);
        return new OperationsOverviewResponse.ExperienceStats(unlocks, checkIns, completed, rate);
    }

    private List<OperationsOverviewResponse.DestinationVisitRow> buildTopDestinations(Period p) {
        List<Object[]> rows = query(
                "select c.experience.destination.id, c.experience.destination.name, count(c.id) "
                        + "from UserCheckInPoint c where c.isValid = true "
                        + "and c.checkedInAt >= ?1 and c.checkedInAt < ?2 "
                        + "group by c.experience.destination.id, c.experience.destination.name "
                        + "order by count(c.id) desc", Object[].class, p.from, p.to)
                .setMaxResults(TOP_LIMIT).getResultList();

        List<OperationsOverviewResponse.DestinationVisitRow> result = new ArrayList<>();
        for (Object[] row : rows) {
            Long destinationId = (Long) row[0];
            long checkIns = toLong(row[2]);
            long completions = count("select count(d) from JourneyDestinationProgress d "
                    + "where d.destinationId = ?1 and d.status = ?2 and d.completedAt >= ?3 and d.completedAt < ?4",
                    destinationId,
                    com.journeygo.modules.journey.entity.enums.DestinationProgressStatus.COMPLETED,
                    p.from, p.to);
            double rate = checkIns == 0 ? 0 : round2(completions * 100.0 / checkIns);
            result.add(new OperationsOverviewResponse.DestinationVisitRow(
                    destinationId, (String) row[1], checkIns, completions, rate));
        }
        return result;
    }

    // ───────────────────────── Khách & Đối tác ─────────────────────────

    private OperationsOverviewResponse.TouristStats buildTouristStats(Period p) {
        long total = countUsersByRole(Role.TOURIST);
        long newInPeriod = count("select count(u) from User u where u.role.name = ?1 "
                + "and u.createdAt >= ?2 and u.createdAt < ?3", Role.TOURIST, p.from, p.to);
        long active = count("select count(distinct b.tourist.id) from Booking b "
                + "where b.createdAt >= ?1 and b.createdAt < ?2", p.from, p.to);
        long completedOne = count("select count(distinct b.tourist.id) from Booking b "
                + "where b.status = ?1 and b.completedAt >= ?2 and b.completedAt < ?3",
                BookingStatus.COMPLETED, p.from, p.to);

        // Tỷ lệ khách quay lại: khách đặt ≥2 lần trong kỳ / tổng khách có đặt trong kỳ.
        long repeat = count("select count(t.userId) from (select b.tourist.id as userId from Booking b "
                + "where b.createdAt >= ?1 and b.createdAt < ?2 group by b.tourist.id "
                + "having count(b.id) > 1) t", p.from, p.to);
        double returningRate = active == 0 ? 0 : round2(repeat * 100.0 / active);

        long repeatPrev = count("select count(t.userId) from (select b.tourist.id as userId from Booking b "
                + "where b.createdAt >= ?1 and b.createdAt < ?2 group by b.tourist.id "
                + "having count(b.id) > 1) t", p.previousFrom, p.previousTo);
        long activePrev = count("select count(distinct b.tourist.id) from Booking b "
                + "where b.createdAt >= ?1 and b.createdAt < ?2", p.previousFrom, p.previousTo);
        double returningPrev = activePrev == 0 ? 0 : round2(repeatPrev * 100.0 / activePrev);

        return new OperationsOverviewResponse.TouristStats(total, newInPeriod, active, completedOne,
                returningRate, round2(returningRate - returningPrev));
    }

    /**
     * Thống kê đối tác.
     *
     * <p>⚠️ Tất cả chỉ số lấy từ cùng một nguồn {@code ProviderProfile} ⇒
     * "Tổng đối tác" luôn = "Đang hoạt động" + "Không hoạt động" (không lệch nhau).
     */
    private OperationsOverviewResponse.PartnerStats buildPartnerStats(Period p) {
        long total = count("select count(pp) from ProviderProfile pp");
        long active = count("select count(pp) from ProviderProfile pp where pp.active = true");
        long inactive = count("select count(pp) from ProviderProfile pp where pp.active = false");
        long withPublished = count("select count(distinct t.createdBy.id) from Tour t "
                + "where t.deleted = false and t.status = ?1", TourStatus.PUBLISHED);
        long newInPeriod = count("select count(pp) from ProviderProfile pp "
                + "where pp.createdAt >= ?1 and pp.createdAt < ?2", p.from, p.to);
        long pendingApproval = count("select count(a) from PartnerApplication a where a.status = ?1",
                PartnerApplicationStatus.PENDING);

        return new OperationsOverviewResponse.PartnerStats(total, active, withPublished, newInPeriod,
                inactive, pendingApproval);
    }

    // ───────────────────────── Quyết toán & Nhật ký ─────────────────────────

    /**
     * Bảng "Quyết toán gần đây" — đợt tất toán mới nhất (mọi trạng thái).
     *
     * <p>⚠️ Bắt buộc dùng {@code LEFT JOIN} tường minh cho {@code providerProfile}:
     * đợt TỔNG (scope = BATCH) có {@code provider_profile_id = NULL} (gom tiền của
     * NHIỀU đối tác). Nếu dùng {@code s.providerProfile.providerName} trực tiếp trong
     * SELECT, JPA sinh {@code INNER JOIN} ⇒ các đợt tổng bị LOẠI KHỎI kết quả im lặng,
     * khiến bảng trống dù nhật ký hoạt động vẫn ghi nhận "đã phê duyệt quyết toán".
     */
    private List<OperationsOverviewResponse.SettlementRow> buildRecentSettlements() {
        List<Object[]> rows = query(
                "select s.id, s.settlementCode, pp.providerName, s.revenuePeriod, "
                        + "s.settlementAmount, s.status, s.scope, s.partnerCount "
                        + "from Settlement s left join s.providerProfile pp "
                        + "order by s.createdAt desc",
                Object[].class).setMaxResults(SETTLEMENT_LIMIT).getResultList();

        List<OperationsOverviewResponse.SettlementRow> result = new ArrayList<>();
        for (Object[] row : rows) {
            Integer partnerCount = row[7] == null ? null : (int) toLong(row[7]);
            result.add(new OperationsOverviewResponse.SettlementRow(
                    (Long) row[0], (String) row[1], (String) row[2], (String) row[3],
                    toDecimal(row[4]), name(row[5]), name(row[6]), partnerCount));
        }
        return result;
    }

    /**
     * Nhật ký hoạt động gần đây — gom từ nhiều nguồn rồi sắp xếp theo thời gian giảm dần.
     *
     * <p>Chỉ hiển thị sự kiện liên quan vận hành nền tảng, không phải log kỹ thuật.
     */
    private List<OperationsOverviewResponse.ActivityRow> buildRecentActivities() {
        List<OperationsOverviewResponse.ActivityRow> rows = new ArrayList<>();

        // Đối tác gửi tour mới.
        query("select t.submittedAt, t.createdBy.fullName, t.title from Tour t "
                        + "where t.deleted = false and t.submittedAt is not null "
                        + "order by t.submittedAt desc", Object[].class)
                .setMaxResults(4).getResultList()
                .forEach(r -> rows.add(new OperationsOverviewResponse.ActivityRow(
                        (Instant) r[0], "TOUR_SUBMITTED", (String) r[1], "đã gửi tour", (String) r[2])));

        // Khách thanh toán booking.
        query("select b.paidAt, b.tourist.fullName, b.bookingCode from Booking b "
                        + "where b.paidAt is not null order by b.paidAt desc", Object[].class)
                .setMaxResults(4).getResultList()
                .forEach(r -> rows.add(new OperationsOverviewResponse.ActivityRow(
                        (Instant) r[0], "BOOKING_PAID", (String) r[1], "đã thanh toán booking", (String) r[2])));

        // Yêu cầu hoàn tiền mới.
        query("select r.createdAt, r.tourist.fullName, r.refundCode from RefundRequest r "
                        + "order by r.createdAt desc", Object[].class)
                .setMaxResults(4).getResultList()
                .forEach(r -> rows.add(new OperationsOverviewResponse.ActivityRow(
                        (Instant) r[0], "REFUND_REQUESTED", (String) r[1], "đã gửi yêu cầu hoàn tiền",
                        (String) r[2])));

        // Quyết toán được phê duyệt (dùng LEFT JOIN để không rơi dòng nếu approvedBy = null).
        query("select s.approvedAt, u.fullName, s.settlementCode from Settlement s "
                        + "left join s.approvedBy u "
                        + "where s.approvedAt is not null order by s.approvedAt desc", Object[].class)
                .setMaxResults(4).getResultList()
                .forEach(r -> rows.add(new OperationsOverviewResponse.ActivityRow(
                        (Instant) r[0], "SETTLEMENT_APPROVED", (String) r[1], "đã phê duyệt quyết toán",
                        (String) r[2])));

        // Đối tác đăng ký mới.
        query("select a.submittedAt, a.businessName, a.email from PartnerApplication a "
                        + "where a.submittedAt is not null order by a.submittedAt desc", Object[].class)
                .setMaxResults(4).getResultList()
                .forEach(r -> rows.add(new OperationsOverviewResponse.ActivityRow(
                        (Instant) r[0], "PARTNER_REGISTERED", (String) r[1], "đã gửi hồ sơ đối tác",
                        (String) r[2])));

        rows.sort(Comparator.comparing(OperationsOverviewResponse.ActivityRow::timestamp,
                Comparator.nullsLast(Comparator.reverseOrder())));
        return rows.stream().limit(ACTIVITY_LIMIT).toList();
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

    private static BigDecimal toDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal decimal) return decimal;
        if (value instanceof Number number) return BigDecimal.valueOf(number.doubleValue());
        return BigDecimal.ZERO;
    }

    private static long toLong(Object value) {
        if (value == null) return 0L;
        if (value instanceof Number number) return number.longValue();
        return 0L;
    }

    private static double round2(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    // ───────────────────────── Kỳ thời gian ─────────────────────────

    /**
     * Khoảng thời gian đang xem + khoảng liền trước có CÙNG đỘ DÀI để so sánh tăng trưởng.
     *
     * <p>Hỗ trợ: today · week (7 ngày) · month (30 ngày) · prevMonth (tháng trước) ·
     * custom (from/to dạng yyyy-MM-dd).
     */
    private record Period(String key, String label, Instant from, Instant to, Instant previousFrom,
            Instant previousTo, int bucketCount) {

        static Period resolve(String range, String fromParam, String toParam) {
            ZonedDateTime now = ZonedDateTime.now(VN_ZONE);
            ZonedDateTime today = now.toLocalDate().atStartOfDay(VN_ZONE);

            String key = range == null || range.isBlank() ? "month" : range;
            return switch (key) {
                case "today" -> {
                    Instant from = today.toInstant();
                    Instant to = now.toInstant();
                    yield new Period("today", "Hôm nay", from, to,
                            today.minusDays(1).toInstant(), today.toInstant(), 6);
                }
                case "week" -> {
                    Instant from = now.minusDays(7).toInstant();
                    Instant to = now.toInstant();
                    yield new Period("week", "7 ngày qua", from, to,
                            now.minusDays(14).toInstant(), now.minusDays(7).toInstant(), 7);
                }
                case "thisMonth" -> {
                    ZonedDateTime start = today.withDayOfMonth(1);
                    Instant from = start.toInstant();
                    Instant to = now.toInstant();
                    long days = Math.max(1, Duration.between(from, to).toDays());
                    yield new Period("thisMonth", "Tháng này", from, to,
                            start.minus(Duration.ofDays(days)).toInstant(), from, (int) days);
                }
                case "prevMonth" -> {
                    ZonedDateTime start = today.withDayOfMonth(1).minusMonths(1);
                    ZonedDateTime end = today.withDayOfMonth(1);
                    // ⚠️ Số ngày thực tế của tháng trước (28/29/30/31) ⇒ bucketCount
                    // dùng CHUNG cho cả kỳ hiện tại & kỳ trước để 2 đường biểu đồ
                    // luôn cùng số điểm và so sánh đúng theo vị trí.
                    int days = (int) Duration.between(start.toInstant(), end.toInstant()).toDays();
                    yield new Period("prevMonth", "Tháng trước", start.toInstant(), end.toInstant(),
                            start.minusMonths(1).toInstant(), start.toInstant(), days);
                }
                case "custom" -> {
                    Instant from = parseDate(fromParam, today.minusDays(29));
                    // "Đến ngày" là ngày CUỐI ⇒ mốc kết thúc exclusive = ngày đó + 1 ngày.
                    Instant to = parseDate(toParam, now).plus(Duration.ofDays(1));
                    long days = Math.max(1, Duration.between(from, to).toDays());
                    yield new Period("custom", "Tùy chỉnh", from, to,
                            from.minus(Duration.ofDays(days)), from,
                            days > 62 ? 12 : (int) days);
                }
                default -> {
                    // "month" = 30 ngày gần nhất (đặc tả: "30 ngày qua" là mặc định).
                    Instant from = now.minusDays(30).toInstant();
                    Instant to = now.toInstant();
                    yield new Period("month", "30 ngày qua", from, to,
                            now.minusDays(60).toInstant(), now.minusDays(30).toInstant(), 30);
                }
            };
        }

        private static Instant parseDate(String value, ZonedDateTime fallback) {
            if (value == null || value.isBlank()) return fallback.toInstant();
            try {
                LocalDate date = LocalDate.parse(value.trim().substring(0, Math.min(10, value.trim().length())));
                return date.atStartOfDay(VN_ZONE).toInstant();
            } catch (RuntimeException ex) {
                return fallback.toInstant();
            }
        }

        /**
         * Khoảng liền trước — CÙNG hình dạng (bucket) với kỳ hiện tại để 2 đường
         * trên biểu đồ so sánh được.
         *
         * <p>Giữ nguyên `key` để cơ chế chia nhóm (giờ / ngày / tháng) không đổi.
         */
        Period previous() {
            return new Period(key, label, previousFrom, previousTo, previousFrom, previousTo, bucketCount);
        }

        /** Số ngày của kỳ (dùng cho nhãn & chia nhóm theo ngày). */
        int days() {
            return (int) Math.max(1, Duration.between(from, to).toDays());
        }


        /** Kỳ "Hôm nay" ⇒ chia theo giờ. */
        boolean isHourly() {
            return "today".equals(key);
        }

        /** Kỳ tùy chỉnh dài (> 62 ngày) ⇒ chia theo tháng. */
        boolean isMonthly() {
            return days() > 62;
        }

        /**
         * Vị trí bucket của một thời điểm bất kỳ trong kỳ.
         *
         * <p>Dùng VỊ TRÍ (index) thay vì chuỗi khoá ⇒ 2 kỳ (hiện tại & liền trước)
         * luôn có cùng số điểm và cùng vị trí ⇒ biểu đồ so sánh được chính xác.
         *
         * @return index bucket, hoặc -1 nếu nằm ngoài kỳ.
         */
        int bucketIndex(Instant instant) {
            ZonedDateTime zoned = instant.atZone(VN_ZONE);
            if (isHourly()) {
                int index = zoned.getHour() / 4;
                return index >= 0 && index < 6 ? index : -1;
            }
            if (isMonthly()) {
                ZonedDateTime start = from.atZone(VN_ZONE);
                int index = (zoned.getYear() - start.getYear()) * 12 + (zoned.getMonthValue() - start.getMonthValue());
                return index >= 0 && index < bucketCount() ? index : -1;
            }
            LocalDate startDate = from.atZone(VN_ZONE).toLocalDate();
            long index = ChronoUnit.DAYS.between(startDate, zoned.toLocalDate());
            return index >= 0 && index < bucketCount() ? (int) index : -1;
        }

        /** Nhãn hiển thị cho bucket thứ {@code index}. */
        String bucketLabel(int index) {
            if (isHourly()) {
                return String.format("%02d:00", index * 4);
            }
            if (isMonthly()) {
                ZonedDateTime m = from.atZone(VN_ZONE).plusMonths(index);
                return String.format("T%02d/%02d", m.getMonthValue(), m.getYear() % 100);
            }
            LocalDate date = from.atZone(VN_ZONE).toLocalDate().plusDays(index);
            return String.format("%02d/%02d", date.getDayOfMonth(), date.getMonthValue());
        }
    }
}
