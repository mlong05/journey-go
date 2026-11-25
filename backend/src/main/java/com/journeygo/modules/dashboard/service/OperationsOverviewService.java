package com.journeygo.modules.dashboard.service;

import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.dashboard.dto.OperationsOverviewResponse;
import com.journeygo.modules.dashboard.dto.OperationsOverviewResponse.BookingFunnel;
import com.journeygo.modules.dashboard.dto.OperationsOverviewResponse.PendingAction;
import com.journeygo.modules.dashboard.dto.OperationsOverviewResponse.RegionRow;
import com.journeygo.modules.journey.entity.enums.JourneyStatus;
import com.journeygo.modules.partnerapplication.entity.enums.PartnerApplicationStatus;
import com.journeygo.modules.partnerprofileupdate.entity.enums.PartnerProfileUpdateStatus;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import com.journeygo.modules.settlement.entity.enums.FinancialAdjustmentStatus;
import com.journeygo.modules.settlement.entity.enums.SettlementStatus;
import com.journeygo.modules.tour.entity.enums.TourStatus;
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
import java.util.ArrayList;
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
 * </ul>
 *
 * <p><b>⚠️ Kiến trúc tải dữ liệu: "LÁT CẮT RỒI GOM TRONG BỘ NHỚ".</b>
 * Trước đây mỗi chỉ số một truy vấn JPQL riêng (~30 truy vấn cho một lần tải trang).
 * Nay chỉ cần <b>4 truy vấn</b> lấy dữ liệu thô trong khoảng [kỳ hiện tại ∪ kỳ baseline],
 * rồi gom trong bộ nhớ thành mọi chỉ số, mọi chuỗi xu hướng, mọi phân rã khu vực.
 * Lợi ích:
 * <ul>
 *   <li>Nhanh hơn rõ rệt (ít round-trip hơn, không phải query lại cho từng KPI).</li>
 *   <li>Dễ mở rộng thêm chiều lọc / thêm khung so sánh mà không nhân số truy vấn.</li>
 *   <li>Tính tỷ lệ (take rate, tỷ lệ hoàn, tỷ lệ thành công) CHÍNH XÁC vì cùng một
 *       tập dữ liệu, không lo lệch số liệu giữa các KPI (tiêu chí "dữ liệu nhất quán").</li>
 * </ul>
 *
 * <p><b>⚠️ Ba lớp số liệu có 3 mốc thời gian khác nhau</b> — phải phân biệt rõ khi
 * đọc số liệu, nếu không sẽ hiểu nhầm:
 * <ol>
 *   <li><b>Dòng tiền khách hàng</b> — theo {@code Booking.paidAt} (lúc khách thanh toán).</li>
 *   <li><b>Lượt đặt tour</b> — theo {@code Booking.createdAt} (lúc tạo đơn).</li>
 *   <li><b>Quyết toán</b> — theo {@code ProviderRevenue.revenuePeriod} (kỳ 10 ngày).</li>
 * </ol>
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

    private static final int TOP_LIMIT = 5;

    /** Ngưỡng "việc chờ quá lâu" (giờ) — dùng để cảnh báo tồn đọng. */
    private static final long STALE_THRESHOLD_HOURS = 24;

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
     */
    public java.util.Map<String, Long> sidebarBadges() {
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

    /**
     * Số liệu tổng quan vận hành theo khung so sánh đang chọn.
     *
     * @param range    rolling | monthly | yearly | custom
     * @param from     ngày bắt đầu (chỉ dùng khi range = custom)
     * @param to       ngày kết thúc (chỉ dùng khi range = custom)
     * @param regionId lọc theo khu vực của TOUR (null = toàn sàn)
     */
    public OperationsOverviewResponse overview(String range, String fromParam, String toParam,
            Long regionId) {
        // ⚠️ Khung "Tất cả" bắt đầu từ bản ghi CŨ NHẤT có thật trong DB (không cố định
        // 2020-01-01) ⇒ chuỗi chỉ chứa dữ liệu thật, không có khoảng trống "ảo".
        ComparisonPeriod.Frame period = ComparisonPeriod.resolve(range, fromParam, toParam,
                earliestDataDate());

        // ── 1. Tải dữ liệu thô 1 lần cho cả kỳ hiện tại lẫn kỳ baseline ──
        Slice slice = loadSlice(period, regionId);

        // ── 2. Gom thành KPI của kỳ hiện tại ──
        var kpis = buildKpis(slice, period.currentFrom(), period.currentTo());

        // ── KPI của baseline — dùng CÙNG SỐ NGÀY ĐÃ QUA để tính % công bằng ──
        // Nếu kỳ hiện tại = 01/11 00:00 – 26/11 00:00 (25 ngày data)
        // Thì baseline = 01/10 00:00 – 26/10 00:00 (cùng 25 ngày), không phải 01/10 – 31/10
        //
        // ⚠️ Khung "Hôm nay" (bucket theo GIỜ) dùng công thức riêng: baseline đã được
        // dựng sẵn trong ComparisonPeriod là "hôm qua 00:00 → cùng giờ hiện tại"
        // ⇒ 2 kỳ dài bằng nhau, công bằng tuyệt đối.
        //
        // ⚠️ Khung "Tất cả" KHÔNG có mốc so sánh ⇒ không tính KPI/chuỗi baseline,
        // frontend sẽ hiển thị MỘT chuỗi liên tục (không badge %, không đường nét đứt).
        boolean hasBaseline = period.hasBaseline();
        Instant baselineToForCurrentDays = period.baselineTo();
        var previousKpis = kpis;
        if (hasBaseline) {
            if (!period.isHourlyBucket()) {
                Duration currentDuration = Duration.between(period.currentFrom(), period.currentTo());
                // Duration đã include ngày cuối (vì [from, to) và to là exclusive)
                // Nên trừ 1 ngày để lấy được ngày cuối inclusive
                Duration currentDurationExclusive = currentDuration.minusDays(1);
                baselineToForCurrentDays = period.baselineFrom()
                        .plus(currentDurationExclusive).plus(Duration.ofDays(1));
            }
            previousKpis = buildKpis(slice, period.baselineFrom(), baselineToForCurrentDays);
        }

        // ── 3. Chuỗi xu hướng (đường hiện tại + đường baseline, cùng số điểm) ──
        var revenueTrend = buildTrend(slice, period, true, true);
        var previousRevenueTrend = hasBaseline ? buildTrend(slice, period, false, true)
                : List.<OperationsOverviewResponse.SparkPoint>of();
        var gmvTrend = buildTrend(slice, period, true, false);
        var previousGmvTrend = hasBaseline ? buildTrend(slice, period, false, false)
                : List.<OperationsOverviewResponse.SparkPoint>of();

        // ── 4. Thành phần vận hành ──
        var bookingBreakdown = buildBookingBreakdown(slice, period.currentFrom(), period.currentTo());
        var bookingTrend = buildBookingTrend(slice, period);
        var funnel = buildFunnel(slice, period.currentFrom(), period.currentTo());

        // ── 5. Hành động + phân rã ──
        var pendingActions = buildPendingActions();
        var regions = buildRegions(slice, period.currentFrom(), period.currentTo());
        var topTours = buildTopTours(slice, period.currentFrom(), period.currentTo());
        var experience = buildExperienceStats(period.currentFrom(), period.currentTo());
        var topDestinations = buildTopDestinations(period.currentFrom(), period.currentTo());

        long critical = pendingActions.stream().filter(a -> "URGENT".equals(a.severity()))
                .mapToLong(PendingAction::count).sum();
        long pendingTotal = pendingActions.stream()
                .mapToLong(PendingAction::count).sum();
        var health = new OperationsOverviewResponse.SystemHealth(
                critical > 0 ? "DEGRADED" : "STABLE",
                critical > 0 ? "Có việc khẩn cấp" : "Hệ thống ổn định",
                critical > 0, critical, pendingTotal);

        return new OperationsOverviewResponse(
                new OperationsOverviewResponse.PeriodInfo(
                        period.key().name().toLowerCase(), period.label(), period.currentLabel(), period.baselineLabel(),
                        period.currentFrom(), period.currentTo(),
                        period.baselineFrom(), period.baselineTo(),
                        period.currentDays(), hasBaseline ? period.baselineDays() : 0,
                        hasBaseline ? getBaselineLabelForCurrentDays(period, baselineToForCurrentDays) : ""),
                health, kpis, previousKpis,
                revenueTrend, previousRevenueTrend,
                gmvTrend, previousGmvTrend,
                bookingBreakdown, bookingTrend,
                funnel,
                pendingActions, regions,
                topTours, experience, topDestinations,
                Instant.now());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Tải lát cắt — 4 truy vấn, gom trong bộ nhớ
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Một dòng booking đã gom sẵn các trường cần dùng.
     *
     * @param tourId      tour đặt (dùng gom "top tour")
     * @param tourTitle   tên tour (dùng gom "top tour" — tránh truy vấn phụ)
     * @param providerName tên đối tác của tour
     */
    private record BookingRow(Instant createdAt, Instant paidAt, Instant completedAt,
            BookingStatus status, BigDecimal amount, BigDecimal discountAmount,
            Long touristId, Long tourId, String tourTitle, String providerName,
            Long regionId, String regionName) {}

    /** Một dòng doanh thu nền tảng. */
    private record RevenueRow(Instant paidAt, BigDecimal commission, BigDecimal refund,
            Long regionId, String regionName) {}

    /** Toàn bộ dữ liệu thô của 2 kỳ (hiện tại + baseline). */
    private record Slice(List<BookingRow> bookings, List<RevenueRow> revenues) {}

    /**
     * Tải dữ liệu thô của CẢ kỳ hiện tại lẫn kỳ baseline trong 1 lần.
     *
     * <p>Khoảng tải = [min(baselineFrom, currentFrom) .. max(currentTo, baselineTo)].
     * Với khung "Năm" thì đây là ~2 năm dữ liệu — chấp nhận được vì chỉ 2 truy vấn.
     */
    private Slice loadSlice(ComparisonPeriod.Frame period, Long regionId) {
        Instant from = period.baselineFrom().isBefore(period.currentFrom())
                ? period.baselineFrom() : period.currentFrom();
        Instant to = period.currentTo().isAfter(period.baselineTo())
                ? period.currentTo() : period.baselineTo();

        // ⚠️ Khung "Tháng": cần dữ liệu của CẢ THÁNG TRƯỚC (không chỉ tới "cùng ngày")
        // để đường nét đứt vẽ tới hết tháng trước (VD: 31/10 trong khi tháng 11 chỉ
        // có 30 ngày). Mở rộng mốc cuối về hết tháng trước ⇒ thêm tối đa 1-2 ngày
        // dữ liệu, không tốn kém gì.
        if (period.key() == ComparisonPeriod.FrameKey.MONTHLY) {
            LocalDate prevMonthEnd = period.baselineFrom().atZone(VN_ZONE).toLocalDate()
                    .withDayOfMonth(period.baselineFrom().atZone(VN_ZONE).toLocalDate()
                            .lengthOfMonth());
            Instant prevMonthEndExclusive = prevMonthEnd.plusDays(1).atStartOfDay(VN_ZONE).toInstant();
            if (to.isBefore(prevMonthEndExclusive)) {
                to = prevMonthEndExclusive;
            }
        }

        // ⚠️ Lọc khu vực: dựng câu truy vấn RIÊNG cho có lọc / không lọc.
        // Cách này tránh việc truyền tham số null cho điều kiện không dùng tới
        // (Hibernate sẽ ném lỗi khi bind tham số không tồn tại trong câu truy vấn).
        String bookingSelect = "select b.createdAt, b.paidAt, b.completedAt, b.status, b.totalAmount, "
                + "b.discountAmount, b.tourist.id, t.id, t.title, t.createdBy.fullName, "
                + "t.region.id, r.name "
                + "from Booking b join b.tour t left join t.region r "
                + "where ((b.createdAt >= :from and b.createdAt < :to) "
                + "   or (b.paidAt >= :from and b.paidAt < :to) "
                + "   or (b.completedAt >= :from and b.completedAt < :to))";

        TypedQuery<Object[]> bookingQ = em.createQuery(
                regionId == null ? bookingSelect : bookingSelect + " and t.region.id = :regionId",
                Object[].class);
        bookingQ.setParameter("from", from);
        bookingQ.setParameter("to", to);
        if (regionId != null) {
            bookingQ.setParameter("regionId", regionId);
        }
        List<Object[]> bookingRows = bookingQ.getResultList();

        List<BookingRow> bookings = new ArrayList<>(bookingRows.size());
        for (Object[] row : bookingRows) {
            bookings.add(new BookingRow(
                    (Instant) row[0], (Instant) row[1], (Instant) row[2],
                    (BookingStatus) row[3], toDecimal(row[4]), toDecimal(row[5]),
                    (Long) row[6], (Long) row[7], (String) row[8], (String) row[9],
                    (Long) row[10], (String) row[11]));
        }

        // Doanh thu gắn với tour ⇒ cùng bộ lọc khu vực.
        String revenueSelect = "select pr.booking.paidAt, pr.commissionAmount, pr.refundAmount, "
                + "pr.booking.tour.region.id, r.name "
                + "from ProviderRevenue pr join pr.booking b join b.tour t left join t.region r "
                + "where pr.booking.paidAt >= :from and pr.booking.paidAt < :to";

        TypedQuery<Object[]> revenueQ = em.createQuery(
                regionId == null ? revenueSelect : revenueSelect + " and t.region.id = :regionId",
                Object[].class);
        revenueQ.setParameter("from", from);
        revenueQ.setParameter("to", to);
        if (regionId != null) {
            revenueQ.setParameter("regionId", regionId);
        }
        List<Object[]> revenueRows = revenueQ.getResultList();

        List<RevenueRow> revenues = new ArrayList<>(revenueRows.size());
        for (Object[] row : revenueRows) {
            revenues.add(new RevenueRow(
                    (Instant) row[0], toDecimal(row[1]), toDecimal(row[2]),
                    (Long) row[3], (String) row[4]));
        }

        return new Slice(bookings, revenues);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  KPI
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Gom KPI của MỘT khoảng thời gian từ dữ liệu thô đã tải.
     *
     * @param from mốc bắt đầu (inclusive)
     * @param to   mốc kết thúc (exclusive)
     */
    private OperationsOverviewResponse.KpiSummary buildKpis(Slice slice, Instant from, Instant to) {
        BigDecimal gmv = BigDecimal.ZERO;
        BigDecimal commission = BigDecimal.ZERO;
        BigDecimal refund = BigDecimal.ZERO;
        long totalBookings = 0;
        long successfulBookings = 0;
        long completedBookings = 0;
        long paidBookingCount = 0;
        java.util.Set<Long> tourists = new java.util.HashSet<>();
        java.util.Set<Long> providers = new java.util.HashSet<>();

        for (BookingRow b : slice.bookings()) {
            // ⚠️ Số lượng booking dùng MỐC TẠO BOOKING (createdAt) và phân loại theo
            // trạng thái HIỆN TẠI ⇒ tổng luôn khớp với "Tổng lượt đặt tour" và với
            // biểu đồ trạng thái booking (cùng một cửa sổ thời gian, cùng một cách đếm).
            if (within(b.createdAt(), from, to)) {
                totalBookings++;
                if (b.touristId() != null) {
                    tourists.add(b.touristId());
                }
                // ⚠️ "Booking thành công" phải dùng CÙNG cơ sở với `breakdown`
                // (mốc createdAt) — nếu lấy theo paidAt thì tử số và mẫu số của
                // thẻ KPI lệch nhau ⇒ hiển thị "24 / 54 · 56%" (24/54 = 44%, sai).
                if (b.status() == BookingStatus.CONFIRMED || b.status() == BookingStatus.COMPLETED) {
                    successfulBookings++;
                }
                if (b.status() == BookingStatus.COMPLETED) {
                    completedBookings++;
                }
            }
            // GMV & doanh thu dùng MỐC THANH TOÁN (paidAt) — đây là dòng tiền thật.
            if (b.paidAt() != null && within(b.paidAt(), from, to)
                    && PAID_BOOKINGS.contains(b.status())) {
                gmv = gmv.add(b.amount());
                paidBookingCount++;
                if (b.touristId() != null) {
                    tourists.add(b.touristId());
                }
            }
        }

        for (RevenueRow r : slice.revenues()) {
            if (within(r.paidAt(), from, to)) {
                commission = commission.add(r.commission());
                refund = refund.add(r.refund());
            }
        }

        // Số đối tác có tour đang publish trong kỳ — dùng truy vấn riêng vì Tour không
        // nằm trong lát cắt booking (một tour có thể chưa có booking nào).
        long activeProviders = count(
                "select count(distinct t.createdBy.id) from Tour t "
                        + "where t.deleted = false and t.status = ?1 and t.publishedAt >= ?2 and t.publishedAt < ?3",
                TourStatus.PUBLISHED, from, to);

        double refundRate = gmv.signum() == 0 ? 0
                : refund.multiply(BigDecimal.valueOf(100)).divide(gmv, 2, RoundingMode.HALF_UP).doubleValue();
        double successRate = totalBookings == 0 ? 0
                : round2(successfulBookings * 100.0 / totalBookings);
        // ⚠️ "Giá trị đơn trung bình" = GMV ÷ SỐ ĐƠN ĐÃ THANH TOÁN (cùng cơ sở paidAt
        // với GMV). Không dùng `successfulBookings` (cơ sở createdAt) ở đây, nếu không
        // trung bình sẽ bị lệch.
        BigDecimal avgBookingValue = paidBookingCount == 0 ? BigDecimal.ZERO
                : gmv.divide(BigDecimal.valueOf(paidBookingCount), 0, RoundingMode.HALF_UP);

        return new OperationsOverviewResponse.KpiSummary(
                commission, gmv, totalBookings, successfulBookings,
                tourists.size(), activeProviders,
                refund, refundRate, successRate, avgBookingValue);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Xu hướng
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Chuỗi điểm theo bucket thời gian (ngày hoặc tháng) cho biểu đồ xu hướng.
     *
     * @param isCurrent   true = lấy dữ liệu kỳ hiện tại, false = kỳ baseline
     * @param isRevenue   true = doanh thu nền tảng, false = GMV
     */
    private List<OperationsOverviewResponse.SparkPoint> buildTrend(Slice slice,
            ComparisonPeriod.Frame period, boolean isCurrent, boolean isRevenue) {
        BigDecimal[] buckets = new BigDecimal[period.bucketCount()];
        java.util.Arrays.fill(buckets, BigDecimal.ZERO);

        if (isRevenue) {
            for (RevenueRow r : slice.revenues()) {
                int index = isCurrent
                        ? period.bucketIndex(r.paidAt())
                        : period.baselineBucketIndex(r.paidAt());
                if (index < 0) continue;
                buckets[index] = buckets[index].add(r.commission());
            }
        } else {
            for (BookingRow b : slice.bookings()) {
                if (b.paidAt() == null || !PAID_BOOKINGS.contains(b.status())) continue;
                int index = isCurrent
                        ? period.bucketIndex(b.paidAt())
                        : period.baselineBucketIndex(b.paidAt());
                if (index < 0) continue;
                buckets[index] = buckets[index].add(b.amount());
            }
        }

        List<OperationsOverviewResponse.SparkPoint> points = new ArrayList<>(buckets.length);
        
        // ⚠️ Khi isCurrent=true (kỳ hiện tại): các bucket sau "hôm nay" nên là NULL
        // để biểu đồ không vẽ 0 ở các ngày chưa diễn ra.
        Instant now = Instant.now();
        boolean isYearly = period.key() == ComparisonPeriod.FrameKey.YEARLY;
        int currentMonth = isYearly ? java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).getMonthValue() : -1;
        
        for (int index = 0; index < buckets.length; index++) {
            BigDecimal value = buckets[index];
            // ⚠️ Nhãn của 2 đường KHÁC NHAU: kỳ hiện tại và baseline nằm ở 2 khoảng
            // thời gian khác nhau (VD: tháng 11 vs tháng 10) ⇒ cùng vị trí trục ngang
            // là 2 ngày khác nhau. Dùng chung nhãn sẽ khiến tooltip báo nhầm.
            String label = isCurrent ? period.bucketLabel(index) : period.baselineBucketLabel(index);
            // ⚠️ Ô này KHÔNG có ngày tương ứng trong kỳ của mình
            // (VD: ô 31 — tháng 11 không có ngày 31) ⇒ UI hiển thị "-" thay vì null.
            boolean noSuchDay = isCurrent
                    ? !period.currentBucketExists(index)
                    : !period.baselineBucketExists(index);

            // Nếu là kỳ hiện tại yearly và index ≥ tháng hiện tại → gán null
            if (isCurrent && isYearly && index >= currentMonth) {
                points.add(new OperationsOverviewResponse.SparkPoint(label, null, false));
            }
            // ⚠️ Khung "Tháng": ô KHÔNG TỒN TẠI trong tháng hiện tại (VD: ô 31 khi
            // tháng 11 chỉ có 30 ngày) ⇒ không có dữ liệu kỳ này ⇒ null.
            // Đường nét liền sẽ tự dừng ở ô trước đó, còn đường nét đứt vẫn vẽ tới
            // ô 31 (31/10) ⇒ người đọc thấy rõ tháng trước dài hơn tháng này.
            else if (isCurrent && !period.currentBucketExists(index)) {
                points.add(new OperationsOverviewResponse.SparkPoint(label, null, true));
            }
            // Nếu là kỳ hiện tại (rolling/monthly/today) và bucket này ở sau hôm nay → gán null
            else if (isCurrent && !isYearly) {
                Instant bucketStart = period.bucketStart(index);
                if (bucketStart.isAfter(now)) {
                    points.add(new OperationsOverviewResponse.SparkPoint(label, null, false));
                } else {
                    points.add(new OperationsOverviewResponse.SparkPoint(label, value, false));
                }
            }
            // ⚠️ Khung "Hôm nay": giờ thứ i của HÔM QUA chỉ tồn tại trong lát cắt
            // tới baselineTo (= hôm qua 00:00 + thời gian đã trôi qua của hôm nay)
            // ⇒ các giờ chưa "đã qua" vẽ null cho CẢ 2 đường để 2 đường bám nhau.
            else if (!isCurrent && period.isHourlyBucket()
                    && !period.baselineBucketStart(index).isBefore(period.baselineTo())) {
                points.add(new OperationsOverviewResponse.SparkPoint(label, null, false));
            }
            // ⚠️ Khung "Tháng": ô KHÔNG TỒN TẠI trong tháng trước (VD: ô 31 khi
            // tháng 10 chỉ có 30 ngày) ⇒ không có dữ liệu mốc so sánh ⇒ null.
            else if (!isCurrent && !period.baselineBucketExists(index)) {
                points.add(new OperationsOverviewResponse.SparkPoint(label, null, true));
            }
            // ⚠️ Khung "Tháng": baseline (tháng trước) có THÊM ngày mà tháng hiện tại
            // không có (VD: 31/10 trong khi tháng 11 chỉ có 30 ngày).
            // ⇒ ĐỂ NGUYÊN giá trị của baseline ở các ô này để đường nét đứt vẽ
            // tới 31/10, còn đường nét liền dừng ở 30/11 (ô đó current = null).
            else {
                points.add(new OperationsOverviewResponse.SparkPoint(label, value, false));
            }
        }
        return points;
    }

    /** Chuỗi trạng thái booking theo bucket thời gian (cho biểu đồ cột chồng). */
    private List<OperationsOverviewResponse.BookingTrendPoint> buildBookingTrend(
            Slice slice, ComparisonPeriod.Frame period) {
        long[][] buckets = new long[period.bucketCount()][4];

        for (BookingRow b : slice.bookings()) {
            int index = period.bucketIndex(b.createdAt());
            if (index < 0 || b.status() == null) continue;
            switch (b.status()) {
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
                    period.bucketLabel(index), slot[0], slot[1], slot[2], slot[3]));
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
    private OperationsOverviewResponse.BookingBreakdown buildBookingBreakdown(
            Slice slice, Instant from, Instant to) {
        long success = 0;
        long pending = 0;
        long cancelled = 0;
        long failed = 0;

        for (BookingRow b : slice.bookings()) {
            if (!within(b.createdAt(), from, to) || b.status() == null) continue;
            switch (b.status()) {
                case CONFIRMED, COMPLETED -> success++;
                case PENDING_PAYMENT -> pending++;
                case CANCELLED -> cancelled++;
                case EXPIRED -> failed++;
                default -> failed++;
            }
        }

        long total = success + pending + cancelled + failed;
        double ratio = total == 0 ? 0 : round2(success * 100.0 / total);
        return new OperationsOverviewResponse.BookingBreakdown(
                success, pending, cancelled, failed, total, ratio);
    }

    /**
     * Phễu chuyển đổi booking — 3 bậc: đã tạo → đã thanh toán → đã trải nghiệm xong.
     *
     * <p>⚠️ Mỗi bậc dùng MỐC RIÊNG (createdAt cho bậc 1, paidAt cho bậc 2, completedAt
     * cho bậc 3) vì bản chất của 3 mốc khác nhau: tạo đơn / trả tiền / đi xong.
     * Cùng một cửa sổ thời gian cho cả 3 bậc để so sánh được.
     */
    private BookingFunnel buildFunnel(Slice slice, Instant from, Instant to) {
        long created = 0;
        long paid = 0;
        long completed = 0;

        for (BookingRow b : slice.bookings()) {
            if (within(b.createdAt(), from, to)) {
                created++;
            }
            if (b.paidAt() != null && within(b.paidAt(), from, to)
                    && PAID_BOOKINGS.contains(b.status())) {
                paid++;
            }
            if (b.completedAt() != null && within(b.completedAt(), from, to)
                    && b.status() == BookingStatus.COMPLETED) {
                completed++;
            }
        }

        double paidRate = created == 0 ? 0 : round2(paid * 100.0 / created);
        double completedRate = created == 0 ? 0 : round2(completed * 100.0 / created);
        return new BookingFunnel(created, paid, completed, paidRate, completedRate);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Phân rã theo khu vực
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Doanh thu & lượt đặt theo KHU VỰC CỦA TOUR.
     *
     * <p>⚠️ Tour chưa gán khu vực vẫn được tính vào nhóm "Chưa gán khu vực" ⇒ tổng
     * luôn khớp với KPI tổng, không "thất lạc" tiền.
     */
    private List<RegionRow> buildRegions(Slice slice, Instant from, Instant to) {
        Map<Long, long[]> counts = new LinkedHashMap<>();
        Map<Long, BigDecimal> revenue = new LinkedHashMap<>();
        Map<Long, String> names = new LinkedHashMap<>();
        Map<Long, java.util.Set<Long>> tourists = new LinkedHashMap<>();

        // Khóa null cho "chưa gán khu vực" — dùng 0L làm khoá thay thế.
        for (BookingRow b : slice.bookings()) {
            if (b.paidAt() == null || !PAID_BOOKINGS.contains(b.status())) continue;
            if (!within(b.paidAt(), from, to)) continue;
            long key = b.regionId() == null ? 0L : b.regionId();
            counts.computeIfAbsent(key, k -> new long[1])[0]++;
            revenue.merge(key, b.amount(), BigDecimal::add);
            names.putIfAbsent(key, b.regionName());
            if (b.touristId() != null) {
                tourists.computeIfAbsent(key, k -> new java.util.HashSet<>()).add(b.touristId());
            }
        }

        List<RegionRow> rows = new ArrayList<>();
        for (Map.Entry<Long, long[]> entry : counts.entrySet()) {
            Long key = entry.getKey();
            String name = (key == 0L) ? "Chưa gán khu vực" : names.getOrDefault(key, "Khu vực " + key);
            rows.add(new RegionRow(
                    key == 0L ? null : key,
                    name,
                    entry.getValue()[0],
                    revenue.getOrDefault(key, BigDecimal.ZERO),
                    tourists.getOrDefault(key, java.util.Set.of()).size()));
        }

        // Sắp xếp theo doanh thu giảm dần — đưa khu vực lớn nhất lên đầu.
        rows.sort((a, b) -> b.revenue().compareTo(a.revenue()));
        return rows;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Action Center
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Action Center — chỉ gồm việc thuộc phạm vi quản trị của Admin.
     *
     * <p>Admin là vai trò giám sát: duyệt hồ sơ đối tác, duyệt quyết toán, duyệt hoàn tiền,
     * duyệt điều chỉnh tài chính, duyệt yêu cầu đổi thông tin đối tác.
     * Việc thẩm định tour/bài viết thuộc vai trò Kiểm duyệt viên nên ở đây chỉ hiển thị
     * SỐ LƯỢNG chờ để Admin nắm quy mô tải việc, không điều hướng tới mô-đun của role khác.
     *
     * <p>⚠️ Mỗi việc kèm <b>tuổi chờ</b> (giờ) và <b>số tiền đang đứng</b> ⇒ Admin biết
     * việc nào cần làm TRƯỚC, không chỉ biết việc nào nhiều nhất.
     */
    private List<PendingAction> buildPendingActions() {
        List<PendingAction> actions = new ArrayList<>();

        // ── Khẩn cấp (đỏ) ──
        // ⚠️ Khiếu nại bài viết thuộc phạm vi Kiểm duyệt viên ⇒ Admin chỉ nắm quy mô
        // tải việc, KHÔNG điều hướng (href = null ⇒ UI hiển thị dạng badge, không link chết).
        long disputes = count("select count(r) from PostReport r where r.status = ?1",
                com.journeygo.modules.community.entity.enums.ReportStatus.PENDING);
        if (disputes > 0) {
            actions.add(new PendingAction("DISPUTES",
                    "Khiếu nại chưa xử lý", "Kiểm duyệt viên đang xử lý", "URGENT", disputes,
                    null, "Kiểm duyệt", 0, null));
        }

        // Yêu cầu hoàn tiền — kèm số tiền đang "đứng" và tuổi chờ của việc cũ nhất.
        long refundPending = count("select count(r) from RefundRequest r where r.status = ?1",
                RefundStatus.PENDING_REVIEW);
        if (refundPending > 0) {
            BigDecimal refundAtStake = sum(
                    "select coalesce(sum(r.proposedAmount), 0.0) from RefundRequest r where r.status = ?1",
                    RefundStatus.PENDING_REVIEW);
            long oldest = oldestWaitingHours(
                    "select min(r.createdAt) from RefundRequest r where r.status = ?1",
                    RefundStatus.PENDING_REVIEW);
            actions.add(new PendingAction("REFUNDS",
                    "Yêu cầu hoàn tiền chờ duyệt", "Cần quyết định hoàn hay từ chối", "URGENT", refundPending,
                    "/admin/refunds", "Xử lý", oldest, refundAtStake));
        }

        // ── Xử lý sớm (cam) ──
        long settlementPending = count("select count(s) from Settlement s where s.status = ?1",
                SettlementStatus.DRAFT);
        if (settlementPending > 0) {
            BigDecimal amountAtStake = sum(
                    "select coalesce(sum(s.settlementAmount), 0.0) from Settlement s where s.status = ?1",
                    SettlementStatus.DRAFT);
            long oldest = oldestWaitingHours(
                    "select min(s.createdAt) from Settlement s where s.status = ?1",
                    SettlementStatus.DRAFT);
            actions.add(new PendingAction("SETTLEMENTS",
                    "Quyết toán chờ phê duyệt", "Đợt tất toán của đối tác", "SOON", settlementPending,
                    "/admin/settlements", "Phê duyệt", oldest, amountAtStake));
        }

        long adjustmentsPending = count("select count(a) from FinancialAdjustment a where a.status = ?1",
                FinancialAdjustmentStatus.PENDING);
        if (adjustmentsPending > 0) {
            long oldest = oldestWaitingHours(
                    "select min(a.createdAt) from FinancialAdjustment a where a.status = ?1",
                    FinancialAdjustmentStatus.PENDING);
            actions.add(new PendingAction("ADJUSTMENTS",
                    "Điều chỉnh tài chính chờ duyệt", "Khoản điều chỉnh có căn cứ", "SOON", adjustmentsPending,
                    "/admin/finance", "Phê duyệt", oldest, null));
        }

        // ── Bình thường (xanh) ──
        long partnerPending = count("select count(a) from PartnerApplication a where a.status = ?1",
                PartnerApplicationStatus.PENDING);
        if (partnerPending > 0) {
            long oldest = oldestWaitingHours(
                    "select min(a.createdAt) from PartnerApplication a where a.status = ?1",
                    PartnerApplicationStatus.PENDING);
            actions.add(new PendingAction("PARTNERS",
                    "Đối tác đăng ký chờ xét duyệt", "Hồ sơ đối tác mới", "NORMAL", partnerPending,
                    "/admin/partners", "Xem hồ sơ", oldest, null));
        }

        long profileUpdatePending = count("select count(u) from PartnerProfileUpdateRequest u where u.status = ?1",
                PartnerProfileUpdateStatus.PENDING);
        if (profileUpdatePending > 0) {
            long oldest = oldestWaitingHours(
                    "select min(u.createdAt) from PartnerProfileUpdateRequest u where u.status = ?1",
                    PartnerProfileUpdateStatus.PENDING);
            actions.add(new PendingAction("PROFILE_UPDATES",
                    "Yêu cầu đổi thông tin đối tác", "Chờ phê duyệt cập nhật hồ sơ", "NORMAL", profileUpdatePending,
                    "/admin/partner-profile-updates", "Xem hồ sơ", oldest, null));
        }

        // Tải việc thuộc vai trò Kiểm duyệt viên — hiển thị số lượng, không điều hướng.
        long toursPending = count("select count(t) from Tour t where t.deleted = false and t.status = ?1",
                TourStatus.PENDING_REVIEW);
        if (toursPending > 0) {
            actions.add(new PendingAction("TOUR_REVIEWS",
                    "Tour chờ kiểm duyệt", "Kiểm duyệt viên đang xử lý", "NORMAL", toursPending,
                    null, "Theo dõi", 0, null));
        }

        return actions;
    }

    /**
     * Số giờ chờ của việc CŨ NHẤT trong nhóm — giúp Admin ưu tiên việc bị bỏ quên.
     *
     * @return số giờ (0 nếu không có việc nào hoặc không lấy được mốc thời gian)
     */
    private long oldestWaitingHours(String jpql, Object... params) {
        // `select min(...)` luôn trả về ĐÚNG 1 hàng (null nếu không có bản ghi) —
        // nhưng dùng getResultList cho chắc chắn, tránh NoResultException.
        List<Instant> rows = query(jpql, Instant.class, params).getResultList();
        if (rows.isEmpty() || rows.get(0) == null) {
            return 0;
        }
        Instant oldest = rows.get(0);
        return Math.max(0, Duration.between(oldest, Instant.now()).toHours());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Tour & Experience
    // ═══════════════════════════════════════════════════════════════════════

    private List<OperationsOverviewResponse.TopTourRow> buildTopTours(
            Slice slice, Instant from, Instant to) {
        // Gom trong bộ nhớ từ lát cắt đã tải (tourId / title / provider đã có sẵn).
        record TourAgg(Long tourId, String title, String provider, long bookings, BigDecimal revenue,
                long completed) {}

        Map<Long, long[]> counters = new LinkedHashMap<>();
        Map<Long, BigDecimal> sums = new LinkedHashMap<>();
        Map<Long, String> titles = new LinkedHashMap<>();
        Map<Long, String> providers = new LinkedHashMap<>();

        for (BookingRow b : slice.bookings()) {
            if (b.paidAt() == null || !PAID_BOOKINGS.contains(b.status())) continue;
            if (!within(b.paidAt(), from, to)) continue;
            Long tourId = b.tourId();
            if (tourId == null) continue;
            counters.computeIfAbsent(tourId, k -> new long[2])[0]++;
            sums.merge(tourId, b.amount(), BigDecimal::add);
            if (b.completedAt() != null && b.status() == BookingStatus.COMPLETED) {
                counters.get(tourId)[1]++;
            }
            titles.putIfAbsent(tourId, b.tourTitle());
            providers.putIfAbsent(tourId, b.providerName());
        }

        if (counters.isEmpty()) {
            return List.of();
        }

        List<TourAgg> sorted = new ArrayList<>();
        for (Map.Entry<Long, long[]> entry : counters.entrySet()) {
            long[] slot = entry.getValue();
            BigDecimal revenue = sums.getOrDefault(entry.getKey(), BigDecimal.ZERO);
            sorted.add(new TourAgg(entry.getKey(),
                    titles.getOrDefault(entry.getKey(), "Tour đã xoá"),
                    providers.getOrDefault(entry.getKey(), "—"),
                    slot[0], revenue, slot[1]));
        }
        // Xếp hạng theo lượt đặt, tie-break theo doanh thu — đúng như bảng "Top tour".
        sorted.sort((a, b) -> {
            int byBookings = Long.compare(b.bookings(), a.bookings());
            return byBookings != 0 ? byBookings : b.revenue().compareTo(a.revenue());
        });

        List<OperationsOverviewResponse.TopTourRow> result = new ArrayList<>();
        int rank = 1;
        for (TourAgg t : sorted) {
            if (rank > TOP_LIMIT) break;
            double completionRate = t.bookings() == 0 ? 0 : round2(t.completed() * 100.0 / t.bookings());
            result.add(new OperationsOverviewResponse.TopTourRow(
                    rank++, t.tourId(), t.title(), t.provider(),
                    t.bookings(), t.revenue(), completionRate));
        }
        return result;
    }

    private OperationsOverviewResponse.ExperienceStats buildExperienceStats(Instant from, Instant to) {
        long unlocks = count("select count(j) from Journey j where j.createdAt >= ?1 and j.createdAt < ?2",
                from, to);
        long checkIns = count("select count(c) from UserCheckInPoint c where c.isValid = true "
                + "and c.checkedInAt >= ?1 and c.checkedInAt < ?2", from, to);
        long completed = count("select count(j) from Journey j where j.status = ?1 "
                + "and j.completedAt >= ?2 and j.completedAt < ?3", JourneyStatus.COMPLETED, from, to);
        double rate = unlocks == 0 ? 0 : round2(completed * 100.0 / unlocks);
        return new OperationsOverviewResponse.ExperienceStats(unlocks, checkIns, completed, rate);
    }

    private List<OperationsOverviewResponse.DestinationVisitRow> buildTopDestinations(
            Instant from, Instant to) {
        List<Object[]> rows = query(
                "select c.experience.destination.id, c.experience.destination.name, count(c.id) "
                        + "from UserCheckInPoint c where c.isValid = true "
                        + "and c.checkedInAt >= ?1 and c.checkedInAt < ?2 "
                        + "group by c.experience.destination.id, c.experience.destination.name "
                        + "order by count(c.id) desc",
                Object[].class, from, to).setMaxResults(TOP_LIMIT).getResultList();

        List<OperationsOverviewResponse.DestinationVisitRow> result = new ArrayList<>();
        for (Object[] row : rows) {
            Long destinationId = (Long) row[0];
            long checkIns = toLong(row[2]);
            long completions = count("select count(d) from JourneyDestinationProgress d "
                    + "where d.destinationId = ?1 and d.status = ?2 and d.completedAt >= ?3 and d.completedAt < ?4",
                    destinationId,
                    com.journeygo.modules.journey.entity.enums.DestinationProgressStatus.COMPLETED,
                    from, to);
            double rate = checkIns == 0 ? 0 : round2(completions * 100.0 / checkIns);
            result.add(new OperationsOverviewResponse.DestinationVisitRow(
                    destinationId, (String) row[1], checkIns, completions, rate));
        }
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Ngày có dữ liệu ĐẦU TIÊN trong DB — dùng cho khung "Tất cả".
     *
     * <p>⚠️ Lấy theo MỐC TẠO BOOKING (createdAt) — mốc sớm nhất mà hệ thống ghi
     * nhận. Nhờ vậy chuỗi "Tất cả" bắt đầu đúng chỗ có dữ liệu thật, không phải
     * một mốc cố định (2020) khiến biểu đồ có hàng loạt tháng trống rỗng.
     *
     * @return ngày đầu tiên, null nếu DB chưa có booking nào
     */
    private LocalDate earliestDataDate() {
        List<Instant> rows = query("select min(b.createdAt) from Booking b", Instant.class)
                .getResultList();
        if (rows.isEmpty() || rows.get(0) == null) {
            return null;
        }
        return rows.get(0).atZone(VN_ZONE).toLocalDate();
    }

    /**
     * Bản ghi đầu tiên trong DB — chỉ dùng cho kiểm thử (đối chiếu điểm đầu
     * khung "Tất cả" với dữ liệu thật, chứng minh KHÔNG hard-code).
     */
    public Instant earliestBookingDateForTest() {
        List<Instant> rows = query("select min(b.createdAt) from Booking b", Instant.class)
                .getResultList();
        return (rows.isEmpty() ? null : rows.get(0));
    }

    private static String getBaselineLabelForCurrentDays(ComparisonPeriod.Frame period, Instant baselineToForCurrentDays) {
        LocalDate fromDate = period.baselineFrom().atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
        LocalDate toDate = baselineToForCurrentDays.atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate().minusDays(1);
        
        // Nếu yearly, thêm năm vào
        if (period.key() == ComparisonPeriod.FrameKey.YEARLY) {
            return String.format("%02d/%02d/%d – %02d/%02d/%d",
                    fromDate.getDayOfMonth(), fromDate.getMonthValue(), fromDate.getYear(),
                    toDate.getDayOfMonth(), toDate.getMonthValue(), toDate.getYear());
        }

        // Khung "Hôm nay": baseline là "hôm qua" ⇒ ghi rõ giờ để so sánh được.
        if (period.isHourlyBucket()) {
            java.time.LocalDateTime baseStart = period.baselineFrom()
                    .atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDateTime();
            java.time.LocalDateTime baseEnd = baselineToForCurrentDays
                    .atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDateTime();
            return String.format("%02d/%02d %02d:%02d – %02d/%02d %02d:%02d",
                    baseStart.getDayOfMonth(), baseStart.getMonthValue(), baseStart.getHour(), baseStart.getMinute(),
                    baseEnd.getDayOfMonth(), baseEnd.getMonthValue(), baseEnd.getHour(), baseEnd.getMinute());
        }
        
        // Monthly, rolling, custom: không thêm năm (đã có trong baselineLabel)
        // ⚠️ Khoảng 1 ngày ⇒ hiển thị 1 ngày thay vì "25/11 – 25/11".
        if (fromDate.equals(toDate)) {
            return String.format("%02d/%02d", fromDate.getDayOfMonth(), fromDate.getMonthValue());
        }
        return String.format("%02d/%02d – %02d/%02d",
                fromDate.getDayOfMonth(), fromDate.getMonthValue(),
                toDate.getDayOfMonth(), toDate.getMonthValue());
    }

    private long count(String jpql, Object... params) {
        List<Long> rows = query(jpql, Long.class, params).getResultList();
        return rows.isEmpty() || rows.get(0) == null ? 0L : rows.get(0);
    }

    private BigDecimal sum(String jpql, Object... params) {
        List<BigDecimal> rows = query(jpql, BigDecimal.class, params).getResultList();
        return rows.isEmpty() || rows.get(0) == null ? BigDecimal.ZERO : rows.get(0);
    }

    private <T> TypedQuery<T> query(String jpql, Class<T> type, Object... params) {
        TypedQuery<T> q = em.createQuery(jpql, type);
        for (int i = 0; i < params.length; i++) {
            q.setParameter(i + 1, params[i]);
        }
        return q;
    }

    /** Kiểm tra thời điểm có nằm trong [from, to) hay không. */
    private static boolean within(Instant at, Instant from, Instant to) {
        return at != null && !at.isBefore(from) && at.isBefore(to);
    }

    /** Format "01/10 – 24/10" từ [from, to) range. */
    private static String dateRange(Instant from, Instant to) {
        java.time.LocalDate fromDate = from.atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
        java.time.LocalDate toDate = to.atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate().minusDays(1);
        return String.format("%02d/%02d – %02d/%02d",
                fromDate.getDayOfMonth(), fromDate.getMonthValue(),
                toDate.getDayOfMonth(), toDate.getMonthValue());
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
}
