package com.journeygo.modules.dashboard.service;

import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.dashboard.dto.ProviderDashboardResponse;
import com.journeygo.modules.destination.entity.enums.DestinationStatus;
import com.journeygo.modules.partnerprofileupdate.entity.enums.PartnerProfileUpdateStatus;
import com.journeygo.modules.providerprofile.repository.ProviderProfileRepository;
import com.journeygo.modules.providerrevenue.entity.enums.ProviderRevenueStatus;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.wallet.repository.WalletRepository;
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
 * PHẦN MỞ RỘNG cho trang Tổng quan của Đối tác.
 *
 * <p>Cung cấp: KPI doanh thu chi tiết, phễu chuyển đổi, phân rã theo tour, trung tâm
 * hành động và lịch khởi hành sắp tới.
 *
 * <p>Tách khỏi {@link DashboardService} để file gốc không phình to; cùng nguồn dữ liệu,
 * cùng quy ước mốc thời gian (giờ Việt Nam).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProviderAnalyticsService {

    static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /** Số tour hiển thị trong bảng phân rã. */
    private static final int TOP_TOUR_LIMIT = 8;

    /** Số lịch khởi hành sắp tới hiển thị trong bảng vận hành. */
    private static final int DEPARTURE_LIMIT = 6;

    /** Số ngày nhìn trước cho lịch khởi hành sắp tới. */
    private static final int DEPARTURE_WINDOW_DAYS = 45;

    /** Số tour hiển thị trong bảng vận hành "Tour". */
    private static final int TOUR_TABLE_LIMIT = 12;

    /** Số khu vực hiển thị trong biểu đồ phân rã theo khu vực. */
    private static final int REGION_LIMIT = 8;

    private final EntityManager em;
    private final ProviderProfileRepository providerProfileRepository;
    private final WalletRepository walletRepository;

    /** Trạng thái đơn được tính là "đã thiết bị" (khách thực sự tham gia). */
    private static final List<BookingStatus> PAID_BOOKING =
            List.of(BookingStatus.CONFIRMED, BookingStatus.COMPLETED);

    /**
     * Bộ lọc tùy chọn của trang Tổng quan — lọc theo tour và/hoặc khu vực.
     *
     * @param tourId   ID tour (null = tất cả)
     * @param regionId ID khu vực (null = tất cả)
     */
    public record Filter(Long tourId, Long regionId) {
        public static Filter of(Long tourId, Long regionId) {
            return new Filter(tourId, regionId);
        }
    }

    /**
     * Thêm điều kiện lọc tour/khu vực vào một đoạn JPQL.
     *
     * <p>⚠️ Dùng cách này (dựng chuỗi + đẩy tham số) thay vì `?n is null` — JPQL không
     * đảm bảo so sánh với null hoạt động giống nhau giữa các dialect, và điều kiện
     * `x is null OR x = ?n` làm mất index trên cột lọc.
     *
     * @param alias  alias của entity gốc trong truy vấn (vd "b" cho Booking)
     * @param params danh sách tham số — tham số mới được thêm vào CUỐI danh sách
     * @return đoạn điều kiện (có dấu "and" ở đầu) hoặc chuỗi rỗng
     */
    private static String tourAndRegionClause(String alias, Filter filter, List<Object> params) {
        StringBuilder clause = new StringBuilder();
        if (filter != null && filter.tourId() != null) {
            params.add(filter.tourId());
            clause.append(" and ").append(alias).append(".tour.tourId = ?").append(params.size());
        }
        if (filter != null && filter.regionId() != null) {
            params.add(filter.regionId());
            clause.append(" and ").append(alias).append(".tour.region.id = ?").append(params.size());
        }
        return clause.toString();
    }

    // ── Doanh thu ────────────────────────────────────────────────────────────

    /**
     * Doanh thu + đơn của đối tác trong kỳ, tách "giá trị đơn" và "tiền thực nhận".
     *
     * <p>⚠️ `grossAmount` là TỔNG TIỀN DU KHÁCH trả. `netAmount` là TIỀN ĐỐI TÁC thực
     * nhận sau hoa hồng, voucher và hoàn tiền — hai khái niệm phải hiển thị RIÊNG.
     */
    public ProviderDashboardResponse.RevenueSummary revenueSummary(Long userId, Instant from, Instant to,
            Filter filter) {
        List<Object> params = new ArrayList<>(List.of(PAID_BOOKING, userId, from, to));
        String clause = tourAndRegionClause("b", filter, params);
        String base = " from Booking b where b.status in ?1 and b.tour.createdBy.id = ?2 "
                + "and b.paidAt >= ?3 and b.paidAt < ?4" + clause;

        BigDecimal gross = sum("select sum(b.totalAmount)" + base, params.toArray());
        long bookings = count("select count(b)" + base, params.toArray());
        long uniqueTourists = count("select count(distinct b.tourist.id)" + base, params.toArray());

        // Doanh thu thực nhận lấy từ bảng provider_revenues (đã trừ hoa hồng + hoàn tiền).
        BigDecimal net = BigDecimal.ZERO;
        BigDecimal commission = BigDecimal.ZERO;
        BigDecimal refund = BigDecimal.ZERO;
        Long profileId = resolveProfileId(userId);
        if (profileId != null) {
            List<Object[]> rows = query("select coalesce(sum(r.providerNetAmount), 0), "
                    + "coalesce(sum(r.commissionAmount), 0), coalesce(sum(r.refundAmount), 0) "
                    + "from ProviderRevenue r "
                    + "where r.providerProfile.id = ?1 and r.createdAt >= ?2 and r.createdAt < ?3",
                    Object[].class, profileId, from, to).getResultList();
            if (!rows.isEmpty() && rows.get(0)[0] != null) {
                net = toDecimal(rows.get(0)[0]);
                commission = toDecimal(rows.get(0)[1]);
                refund = toDecimal(rows.get(0)[2]);
            }
        }

        BigDecimal walletBalance = BigDecimal.ZERO;
        if (profileId != null) {
            walletBalance = walletRepository.findByProviderProfile_Id(profileId)
                    .map(w -> w.getBalance() != null ? w.getBalance() : BigDecimal.ZERO)
                    .orElse(BigDecimal.ZERO);
        }

        BigDecimal pendingSettlement = BigDecimal.ZERO;
        BigDecimal heldAmount = BigDecimal.ZERO;
        if (profileId != null) {
            pendingSettlement = sum("select coalesce(sum(r.providerNetAmount), 0) from ProviderRevenue r "
                    + "where r.providerProfile.id = ?1 and r.status in ?2",
                    profileId, List.of(ProviderRevenueStatus.ELIGIBLE, ProviderRevenueStatus.IN_SETTLEMENT));
            // Số tiền đang bị GIỮ: chưa đủ điều kiện tất toán (chưa hoàn thành trải nghiệm).
            heldAmount = sum("select coalesce(sum(r.providerNetAmount), 0) from ProviderRevenue r "
                    + "where r.providerProfile.id = ?1 and r.status = ?2",
                    profileId, ProviderRevenueStatus.PENDING);
        }

        BigDecimal avg = bookings > 0
                ? gross.divide(BigDecimal.valueOf(bookings), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return new ProviderDashboardResponse.RevenueSummary(gross, net, commission, refund,
                pendingSettlement, walletBalance, heldAmount, bookings, uniqueTourists, avg);
    }

    // ── Đơn / phễu ───────────────────────────────────────────────────────────

    /**
     * Tổng số đơn của đối tác trong kỳ, tách theo trạng thái.
     */
    public ProviderDashboardResponse.BookingSummary bookingSummary(Long userId, Instant from, Instant to,
            Filter filter) {
        List<Object> params = new ArrayList<>(List.of(userId, from, to));
        String clause = tourAndRegionClause("b", filter, params);
        String base = " from Booking b where b.tour.createdBy.id = ?1 and b.createdAt >= ?2 and b.createdAt < ?3"
                + clause;

        long created = count("select count(b)" + base, params.toArray());
        int next = params.size() + 1;
        long pending = count("select count(b)" + base + " and b.status = ?" + next,
                concat(params, BookingStatus.PENDING_PAYMENT));
        long paid = count("select count(b)" + base + " and b.status in ?" + next,
                concat(params, PAID_BOOKING));
        long completed = count("select count(b)" + base + " and b.status = ?" + next,
                concat(params, BookingStatus.COMPLETED));
        long cancelled = count("select count(b)" + base + " and b.status in ?" + next,
                concat(params, List.of(BookingStatus.CANCELLED, BookingStatus.EXPIRED)));
        long uniqueTourists = count("select count(distinct b.tourist.id)" + base, params.toArray());

        double completionRate = created > 0 ? (completed * 100.0) / created : 0;
        double refundRate = paid > 0 ? (refundedCount(userId, from, to, filter) * 100.0) / paid : 0;

        // ⚠️ Tham số thứ `next` là danh sách trạng thái PAID_BOOKING — phải đánh số liên tục
        // với các tham số đã có (tránh lỗ "ordinal parameter labels" của Hibernate).
        // Tử số và mẫu cùng tập trạng thái (đã thanh toán) ⇒ AOV nhất quán với doanh thu.
        BigDecimal avg = paid > 0
                ? sum("select sum(b.totalAmount)" + base + " and b.status in ?" + next,
                        concat(params, PAID_BOOKING))
                    .divide(BigDecimal.valueOf(paid), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return new ProviderDashboardResponse.BookingSummary(created, paid, completed, pending, cancelled,
                round(completionRate), round(refundRate), uniqueTourists, avg);
    }

    /** Nối thêm tham số vào danh sách (trả về bản sao — không sửa danh sách gốc). */
    private static Object[] concat(List<Object> params, Object extra) {
        List<Object> merged = new ArrayList<>(params);
        merged.add(extra);
        return merged.toArray();
    }

    /** Số đơn đã được hoàn tiền trong kỳ. */
    private long refundedCount(Long userId, Instant from, Instant to, Filter filter) {
        List<Object> params = new ArrayList<>(List.of(userId, RefundStatus.REFUNDED, from, to));
        String clause = tourAndRegionClause("rr.payment.booking", filter, params);
        return count("select count(distinct rr.payment.booking.id) from RefundRequest rr "
                + "where rr.payment.booking.tour.createdBy.id = ?1 "
                + "and rr.status = ?2 and rr.createdAt >= ?3 and rr.createdAt < ?4" + clause,
                params.toArray());
    }

    /**
     * Phễu chuyển đổi của du khách trong kỳ.
     */
    public ProviderDashboardResponse.Funnel funnel(Long userId, Instant from, Instant to, Filter filter) {
        ProviderDashboardResponse.BookingSummary summary = bookingSummary(userId, from, to, filter);
        long refunded = refundedCount(userId, from, to, filter);
        double conversion = summary.total() > 0 ? (summary.paid() * 100.0) / summary.total() : 0;
        return new ProviderDashboardResponse.Funnel(summary.total(), summary.paid(), summary.completed(),
                refunded, round(conversion), summary.completionRate());
    }

    /** Thay đổi trạng thái đơn trong kỳ — biểu cột. */
    public List<ProviderDashboardResponse.BookingStatusBreakdown> bookingStatusBreakdown(
            Long userId, Instant from, Instant to, Filter filter) {
        List<Object> params = new ArrayList<>(List.of(userId, from, to));
        String clause = tourAndRegionClause("b", filter, params);

        Map<BookingStatus, Long> counts = new LinkedHashMap<>();
        query("select b.status, count(b) from Booking b "
                + "where b.tour.createdBy.id = ?1 and b.createdAt >= ?2 and b.createdAt < ?3" + clause
                + " group by b.status", Object[].class, params.toArray()).getResultList()
                .forEach(r -> counts.put((BookingStatus) r[0], (Long) r[1]));

        Map<BookingStatus, BigDecimal> amounts = new LinkedHashMap<>();
        query("select b.status, coalesce(sum(b.totalAmount), 0) from Booking b "
                + "where b.tour.createdBy.id = ?1 and b.createdAt >= ?2 and b.createdAt < ?3" + clause
                + " group by b.status", Object[].class, params.toArray()).getResultList()
                .forEach(r -> amounts.put((BookingStatus) r[0], toDecimal(r[1])));

        List<ProviderDashboardResponse.BookingStatusBreakdown> rows = new ArrayList<>();
        for (BookingStatus status : BookingStatus.values()) {
            Long c = counts.get(status);
            if (c == null) continue;
            rows.add(new ProviderDashboardResponse.BookingStatusBreakdown(status.name(),
                    statusLabel(status), c, amounts.getOrDefault(status, BigDecimal.ZERO)));
        }
        return rows;
    }

    /** Nhãn trạng thái đơn tiếng Việt cho người đọc. */
    private static String statusLabel(BookingStatus status) {
        return switch (status) {
            case PENDING_PAYMENT -> "Chờ thanh toán";
            case CONFIRMED -> "Đã xác nhận";
            case COMPLETED -> "Đã hoàn thành";
            case EXPIRED -> "Đã hết hạn";
            case CANCELLED -> "Đã hủy";
        };
    }

    // ── Phân rã theo tour ────────────────────────────────────────────────────

    /**
     * Doanh thu và lượt đặt của từng tour trong kỳ — sắp xếp theo doanh thu giảm dần.
     */
    public List<ProviderDashboardResponse.TourBreakdown> tourBreakdown(
            Long userId, Instant from, Instant to, Filter filter) {
        List<Object> params = new ArrayList<>(List.of(userId, from, to, PAID_BOOKING));
        String clause = tourAndRegionClause("b", filter, params);
        String jpql = "select t.tourId, t.title, t.status, count(b), "
                + "coalesce(sum(b.totalAmount), 0), "
                + "coalesce(sum(case when b.status = com.journeygo.modules.booking.entity.enums.BookingStatus.COMPLETED then 1 else 0 end), 0) "
                + "from Booking b join b.tour t "
                + "where b.tour.createdBy.id = ?1 and b.paidAt >= ?2 and b.paidAt < ?3 "
                + "and b.status in ?4" + clause
                + " group by t.tourId, t.title, t.status order by 5 desc";

        return query(jpql, Object[].class, params.toArray()).getResultList().stream()
                .map(r -> new ProviderDashboardResponse.TourBreakdown(
                        (Long) r[0], (String) r[1], r[2] == null ? null : r[2].toString(),
                        ((Number) r[3]).longValue(), ((Number) r[5]).longValue(),
                        toDecimal(r[4]), BigDecimal.ZERO, 0L))
                .limit(TOP_TOUR_LIMIT)
                .toList();
    }

    // ── Phân rã theo khu vực ────────────────────────────────────────────────

    /**
     * Doanh thu theo khu vực của tour — sắp xếp theo doanh thu giảm dần.
     *
     * <p>Tour không gán khu vực được gom vào nhóm "Chưa phân khu vực" (regionId = null).
     */
    public List<ProviderDashboardResponse.RegionBreakdown> regionBreakdown(
            Long userId, Instant from, Instant to, Filter filter) {
        List<Object> params = new ArrayList<>(List.of(userId, from, to, PAID_BOOKING));
        String clause = tourAndRegionClause("b", filter, params);
        String jpql = "select t.region.id, t.region.name, count(b), coalesce(sum(b.totalAmount), 0) "
                + "from Booking b join b.tour t "
                + "where b.tour.createdBy.id = ?1 and b.paidAt >= ?2 and b.paidAt < ?3 "
                + "and b.status in ?4" + clause
                + " group by t.region.id, t.region.name order by 4 desc";

        return query(jpql, Object[].class, params.toArray()).getResultList().stream()
                .map(r -> new ProviderDashboardResponse.RegionBreakdown(
                        r[0] == null ? null : ((Number) r[0]).longValue(),
                        r[1] == null ? "Chưa phân khu vực" : (String) r[1],
                        ((Number) r[2]).longValue(),
                        toDecimal(r[3])))
                .limit(REGION_LIMIT)
                .toList();
    }

    // ── Check-in theo phương thức xác minh ───────────────────────────────────

    /**
     * Số khách du khách KHÁC NHAU đã check-in trong kỳ.
     */
    public long uniqueCheckInUsers(Long userId, Instant from, Instant to) {
        return count("select count(distinct c.userId) from UserCheckInPoint c "
                + "where c.isValid = true and c.experience.destination.createdBy.id = ?1 "
                + "and c.checkedInAt >= ?2 and c.checkedInAt < ?3", userId, from, to);
    }

    /**
     * Lượt check-in trong kỳ, gom theo phương thức xác minh (GPS / QR / MANUAL / BEACON).
     *
     * <p>Giúp đối tác biết du khách chủ yếu check-in bằng cách nào — nếu phần lớn là GPS
     * mà điểm đến thiếu tọa độ thì du khách không thể check-in được.
     */
    public List<ProviderDashboardResponse.VerificationBreakdown> checkInByMethod(
            Long userId, Instant from, Instant to) {
        List<Object[]> rows = query(
                "select c.verificationMethod, count(c) from UserCheckInPoint c "
                        + "where c.isValid = true and c.experience.destination.createdBy.id = ?1 "
                        + "and c.checkedInAt >= ?2 and c.checkedInAt < ?3 group by c.verificationMethod",
                Object[].class, userId, from, to).getResultList();

        List<ProviderDashboardResponse.VerificationBreakdown> result = new ArrayList<>();
        for (Object[] row : rows) {
            String method = row[0] == null ? "UNKNOWN" : row[0].toString();
            result.add(new ProviderDashboardResponse.VerificationBreakdown(method,
                    verificationLabel(method), ((Number) row[1]).longValue()));
        }
        // Sắp xếp theo số lượt giảm dần; GPS trước QR để thứ tự quen thuộc khi bằng nhau.
        result.sort((a, b) -> {
            int byCount = Long.compare(b.count(), a.count());
            if (byCount != 0) return byCount;
            return Integer.compare(verificationOrder(a.method()), verificationOrder(b.method()));
        });
        return result;
    }

    private static String verificationLabel(String method) {
        return switch (method) {
            case "GPS" -> "GPS";
            case "QR" -> "Quét QR";
            case "MANUAL" -> "Xác minh thủ công";
            case "BEACON" -> "Beacon";
            default -> "Khác";
        };
    }

    private static int verificationOrder(String method) {
        return switch (method) {
            case "GPS" -> 0;
            case "QR" -> 1;
            case "BEACON" -> 2;
            case "MANUAL" -> 3;
            default -> 4;
        };
    }

    // ── Bảng vận hành: Tour ────────────────────────────────────────────────

    /**
     * Danh sách tour của đối tác kèm số liệu vận hành trong kỳ.
     *
     * <p>Cột số liệu (đơn / hoàn thành / doanh thu) tính theo đơn ĐÃ THANH TOÁN có
     * `paidAt` trong kỳ. Tour chưa có đơn nào vẫn hiện (số liệu = 0) để đối tác thấy
     * toàn bộ danh mục tour của mình.
     */
    public List<ProviderDashboardResponse.TourPerformance> tourPerformance(
            Long userId, Instant from, Instant to, Filter filter) {
        // Số liệu theo tour trong kỳ.
        Map<Long, long[]> counts = new LinkedHashMap<>();
        Map<Long, BigDecimal> revenue = new LinkedHashMap<>();
        List<Object> params = new ArrayList<>(List.of(userId, from, to, PAID_BOOKING));
        String clause = tourAndRegionClause("b", filter, params);
        query("select b.tour.tourId, count(b), "
                        + "coalesce(sum(case when b.status = "
                        + "com.journeygo.modules.booking.entity.enums.BookingStatus.COMPLETED then 1 else 0 end), 0), "
                        + "coalesce(sum(b.totalAmount), 0) from Booking b "
                        + "where b.tour.createdBy.id = ?1 and b.paidAt >= ?2 and b.paidAt < ?3 "
                        + "and b.status in ?4" + clause
                        + " group by b.tour.tourId",
                Object[].class, params.toArray()).getResultList().forEach(r -> {
            Long tourId = ((Number) r[0]).longValue();
            counts.put(tourId, new long[]{((Number) r[1]).longValue(), ((Number) r[2]).longValue()});
            revenue.put(tourId, toDecimal(r[3]));
        });

        // Danh sách tour của đối tác.
        List<Object> tourParams = new ArrayList<>(List.of(userId));
        String tourClause = "";
        if (filter != null && filter.tourId() != null) {
            tourParams.add(filter.tourId());
            tourClause = " and t.tourId = ?" + tourParams.size();
        }
        if (filter != null && filter.regionId() != null) {
            tourParams.add(filter.regionId());
            tourClause += " and t.region.id = ?" + tourParams.size();
        }
        List<Object[]> tours = query("select t.tourId, t.title, t.status, t.region.id, t.region.name, "
                        + "t.updatedAt, t.publishedAt, "
                        + "(select count(s) from TourStop s where s.tour.tourId = t.tourId), "
                        + "(select min(p.price) from TourPrice p where p.tour.tourId = t.tourId) "
                        + "from Tour t where t.deleted = false and t.createdBy.id = ?1" + tourClause
                        + " order by t.updatedAt desc",
                Object[].class, tourParams.toArray()).getResultList();

        List<ProviderDashboardResponse.TourPerformance> result = new ArrayList<>();
        for (Object[] row : tours) {
            Long tourId = ((Number) row[0]).longValue();
            long[] c = counts.getOrDefault(tourId, new long[]{0L, 0L});
            result.add(new ProviderDashboardResponse.TourPerformance(
                    tourId, (String) row[1], row[2] == null ? null : row[2].toString(),
                    row[3] == null ? null : ((Number) row[3]).longValue(),
                    row[4] == null ? null : (String) row[4],
                    row[7] == null ? 0L : ((Number) row[7]).longValue(),
                    c[0], c[1], revenue.getOrDefault(tourId, BigDecimal.ZERO),
                    row[8] == null ? null : toDecimal(row[8]),
                    (Instant) row[5], (Instant) row[6]));
            if (result.size() >= TOUR_TABLE_LIMIT) break;
        }
        return result;
    }

    // ── Trung tâm hành động ──────────────────────────────────────────────────

    /**
     * Các việc đối tác cần xử lý — ưu tiên theo mức độ (URGENT > SOON > NORMAL).
     */
    public List<ProviderDashboardResponse.ActionItem> actionItems(Long userId) {
        List<ProviderDashboardResponse.ActionItem> actions = new ArrayList<>();

        long toursRejected = count("select count(t) from Tour t "
                + "where t.deleted = false and t.createdBy.id = ?1 and t.status in ?2",
                userId, List.of(TourStatus.REJECTED, TourStatus.CHANGES_REQUESTED));
        if (toursRejected > 0) {
            actions.add(new ProviderDashboardResponse.ActionItem("TOUR_FIX",
                    "Tour cần chỉnh sửa", "Bị từ chối hoặc được yêu cầu sửa nội dung", "URGENT",
                    toursRejected, "Sửa tour", "/provider/tours",
                    oldestWaitingHours("select min(t.updatedAt) from Tour t "
                            + "where t.deleted = false and t.createdBy.id = ?1 and t.status in ?2",
                            userId, List.of(TourStatus.REJECTED, TourStatus.CHANGES_REQUESTED)),
                    null));
        }

        long destRejected = count("select count(d) from Destination d "
                + "where d.deleted = false and d.createdBy.id = ?1 and d.status = ?2",
                userId, DestinationStatus.REJECTED);
        if (destRejected > 0) {
            actions.add(new ProviderDashboardResponse.ActionItem("DEST_FIX",
                    "Điểm đến bị từ chối", "Cần chỉnh sửa thông tin điểm đến", "URGENT",
                    destRejected, "Xem điểm đến", null,
                    oldestWaitingHours("select min(d.updatedAt) from Destination d "
                            + "where d.deleted = false and d.createdBy.id = ?1 and d.status = ?2",
                            userId, DestinationStatus.REJECTED),
                    null));
        }

        long toursPending = count("select count(t) from Tour t "
                + "where t.deleted = false and t.createdBy.id = ?1 and t.status = ?2",
                userId, TourStatus.PENDING_REVIEW);
        if (toursPending > 0) {
            actions.add(new ProviderDashboardResponse.ActionItem("TOUR_PENDING",
                    "Tour đang chờ duyệt", "Kiểm duyệt viên đang xử lý", "SOON",
                    toursPending, "Theo dõi", "/provider/tours",
                    oldestWaitingHours("select min(t.updatedAt) from Tour t "
                            + "where t.deleted = false and t.createdBy.id = ?1 and t.status = ?2",
                            userId, TourStatus.PENDING_REVIEW),
                    null));
        }

        // Doanh thu đang bị giữ vì chưa đủ điều kiện tất toán.
        Long profileId = resolveProfileId(userId);
        if (profileId != null) {
            List<Object[]> deferred = query("select r.deferredReason, count(r), "
                    + "coalesce(sum(r.providerNetAmount), 0) from ProviderRevenue r "
                    + "where r.providerProfile.id = ?1 and r.status = ?2 group by r.deferredReason",
                    Object[].class, profileId, ProviderRevenueStatus.PENDING).getResultList();
            long deferredCount = 0;
            BigDecimal deferredAmount = BigDecimal.ZERO;
            for (Object[] row : deferred) {
                deferredCount += ((Number) row[1]).longValue();
                deferredAmount = deferredAmount.add(toDecimal(row[2]));
            }
            if (deferredCount > 0) {
                actions.add(new ProviderDashboardResponse.ActionItem("REVENUE_PENDING",
                        "Doanh thu đang chờ tất toán", "Bị giữ do chưa đủ điều kiện", "SOON",
                        deferredCount, "Xem doanh thu", "/provider/finance/settlements",
                        0L, deferredAmount));
            }
        }

        // Điểm đến thiếu tọa độ ⇒ du khách không check-in được bằng GPS.
        long missingGps = count("select count(d) from Destination d "
                + "where d.deleted = false and d.createdBy.id = ?1 "
                + "and (d.latitude is null or d.longitude is null)", userId);
        if (missingGps > 0) {
            actions.add(new ProviderDashboardResponse.ActionItem("DEST_GPS",
                    "Điểm đến thiếu tọa độ", "Du khách không check-in được bằng GPS", "NORMAL",
                    missingGps, "Bổ sung tọa độ", null, 0L, null));
        }

        // Tin nhắn khách chưa đọc.
        long unreadMessages = count("select count(m) from ProviderMessage m "
                + "where m.senderId <> ?1 and m.readAt is null and m.conversation.providerId = ?1", userId);
        if (unreadMessages > 0) {
            actions.add(new ProviderDashboardResponse.ActionItem("CHAT_UNREAD",
                    "Tin nhắn khách chưa đọc", "Khách đang chờ phản hồi", "NORMAL",
                    unreadMessages, "Trả lời", "/provider/support", 0L, null));
        }

        // Yêu cầu đổi thông tin hồ sơ đang chờ duyệt.
        long profileUpdates = count("select count(u) from PartnerProfileUpdateRequest u "
                + "where u.partner.id = ?1 and u.status = ?2", userId, PartnerProfileUpdateStatus.PENDING);
        if (profileUpdates > 0) {
            actions.add(new ProviderDashboardResponse.ActionItem("PROFILE_UPDATE",
                    "Yêu cầu đổi hồ sơ đang chờ", "Đang chờ quản trị viên duyệt", "NORMAL",
                    profileUpdates, "Xem hồ sơ", "/provider/partner-info", 0L, null));
        }

        // Slot sắp đầy trong 14 ngày tới ⇒ cần mở thêm lịch hoặc điều chỉnh sức chứa.
        LocalDate today = LocalDate.now(VN_ZONE);
        List<Object[]> nearFull = query("select s.tour.title, s.slotDate, s.capacity, s.bookedCount "
                        + "from TourSlot s where s.tour.createdBy.id = ?1 and s.slotDate >= ?2 "
                        + "and s.slotDate <= ?3 and s.capacity > 0 and s.bookedCount > 0 "
                        + "and s.bookedCount * 5 >= s.capacity * 4 "
                        + "order by s.slotDate asc",
                Object[].class, userId, today, today.plusDays(14)).getResultList();
        if (!nearFull.isEmpty()) {
            Object[] first = nearFull.get(0);
            String detail = first[0] + " — " + first[1] + ": "
                    + first[3] + "/" + first[2] + " chỗ";
            actions.add(new ProviderDashboardResponse.ActionItem("SLOT_NEAR_FULL",
                    "Lịch khởi hành sắp đầy", detail, "SOON",
                    nearFull.size(), "Xem lịch", "/provider/bookings",
                    0L, null));
        }

        // Lịch khởi hành sắp tới chưa có khách ⇒ cân nhắc mở thêm slot.
        long emptySlots = count("select count(s) from TourSlot s "
                + "where s.tour.createdBy.id = ?1 and s.slotDate >= ?2 and s.slotDate <= ?3 "
                + "and s.bookedCount = 0 and s.status = com.journeygo.modules.tour.entity.TourSlotStatus.OPEN",
                userId, today, today.plusDays(30));
        if (emptySlots > 0) {
            actions.add(new ProviderDashboardResponse.ActionItem("SLOT_EMPTY",
                    "Lịch khởi hành chưa có khách", "Trong 30 ngày tới có lịch mở bán nhưng chưa có ai đặt", "NORMAL",
                    emptySlots, "Xem lịch", "/provider/bookings", 0L, null));
        }

        return actions;
    }

    // ── Lịch khởi hành sắp tới ──────────────────────────────────────────────

    /**
     * Lịch khởi hành sắp tới kèm sức chứa — bảng vận hành của đối tác.
     */
    public List<ProviderDashboardResponse.UpcomingDeparture> upcomingDepartures(
            Long userId, Filter filter) {
        LocalDate today = LocalDate.now(VN_ZONE);
        LocalDate upper = today.plusDays(DEPARTURE_WINDOW_DAYS);

        List<Object> params = new ArrayList<>(List.of(userId, today, upper));
        String clause = filter != null && filter.tourId() != null
                ? " and s.tour.tourId = ?4" : "";
        if (!clause.isEmpty()) {
            params.add(filter.tourId());
        }
        String jpql = "select s.tour.tourId, s.tour.title, s.slotDate, s.capacity, s.bookedCount, s.status "
                + "from TourSlot s where s.tour.createdBy.id = ?1 "
                + "and s.slotDate >= ?2 and s.slotDate <= ?3" + clause
                + " order by s.slotDate asc";

        List<Object[]> slots = query(jpql, Object[].class, params.toArray()).getResultList();
        if (slots.isEmpty()) {
            return List.of();
        }

        // Số khách đã xác nhận + số chỗ đang giữ, gom theo tour × ngày.
        // ⚠️ Đếm theo HÀNH KHÁCH (BookingPassenger) chứ không theo số đơn — một đơn có thể
        //    có nhiều hành khách ⇒ đếm đơn sẽ báo thấp số khách thực tế.
        Map<String, int[]> guests = new LinkedHashMap<>();
        Map<String, Integer> pending = new LinkedHashMap<>();
        Map<String, BigDecimal> revenue = new LinkedHashMap<>();

        query("select p.booking.tour.tourId, p.booking.experienceDate, count(p), "
                + "coalesce(sum(case when p.countsTowardSlot = true then 1 else 0 end), 0) "
                + "from BookingPassenger p "
                + "where p.booking.tour.createdBy.id = ?1 "
                + "and p.booking.experienceDate >= ?2 and p.booking.experienceDate <= ?3 "
                + "and p.booking.status in ?4 "
                + "and p.status = com.journeygo.modules.booking.entity.enums.BookingPassengerStatus.ACTIVE "
                + "group by p.booking.tour.tourId, p.booking.experienceDate",
                Object[].class, userId, today, upper, PAID_BOOKING).getResultList()
                .forEach(r -> {
                    String key = key((Long) r[0], (LocalDate) r[1]);
                    int[] agg = guests.computeIfAbsent(key, k -> new int[2]);
                    agg[0] += ((Number) r[2]).intValue();
                    agg[1] += ((Number) r[3]).intValue();
                });

        query("select p.booking.tour.tourId, p.booking.experienceDate, count(p) from BookingPassenger p "
                + "where p.booking.tour.createdBy.id = ?1 "
                + "and p.booking.experienceDate >= ?2 and p.booking.experienceDate <= ?3 "
                + "and p.booking.status = com.journeygo.modules.booking.entity.enums.BookingStatus.PENDING_PAYMENT "
                + "and p.status = com.journeygo.modules.booking.entity.enums.BookingPassengerStatus.ACTIVE "
                + "group by p.booking.tour.tourId, p.booking.experienceDate",
                Object[].class, userId, today, upper).getResultList()
                .forEach(r -> pending.merge(key((Long) r[0], (LocalDate) r[1]),
                        ((Number) r[2]).intValue(), Integer::sum));

        query("select b.tour.tourId, b.experienceDate, coalesce(sum(b.totalAmount), 0) from Booking b "
                + "where b.tour.createdBy.id = ?1 and b.experienceDate >= ?2 and b.experienceDate <= ?3 "
                + "and b.status in ?4 group by b.tour.tourId, b.experienceDate",
                Object[].class, userId, today, upper, PAID_BOOKING).getResultList()
                .forEach(r -> revenue.merge(key((Long) r[0], (LocalDate) r[1]), toDecimal(r[2]), BigDecimal::add));

        List<ProviderDashboardResponse.UpcomingDeparture> rows = new ArrayList<>();
        for (Object[] row : slots) {
            Long tId = (Long) row[0];
            LocalDate date = (LocalDate) row[2];
            String key = key(tId, date);
            int[] agg = guests.getOrDefault(key, new int[2]);
            Integer capacity = row[3] == null ? null : ((Number) row[3]).intValue();
            Integer booked = row[4] == null ? null : ((Number) row[4]).intValue();
            rows.add(new ProviderDashboardResponse.UpcomingDeparture(tId, (String) row[1], date, capacity,
                    agg[0], pending.getOrDefault(key, 0), agg[1],
                    row[5] == null ? null : row[5].toString(), false,
                    revenue.getOrDefault(key, BigDecimal.ZERO)));
            if (rows.size() >= DEPARTURE_LIMIT) break;
        }
        return rows;
    }

    private static String key(Long tourId, LocalDate date) {
        return tourId + "|" + date;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /** ProviderProfile của đối tác (null nếu chưa được duyệt đăng ký). */
    private Long resolveProfileId(Long userId) {
        return providerProfileRepository.findByUser_Id(userId)
                .map(com.journeygo.modules.providerprofile.entity.ProviderProfile::getId)
                .orElse(null);
    }

    /** Số giờ chờ của bản ghi cũ nhất trong nhóm việc (0 nếu không có). */
    private long oldestWaitingHours(String jpql, Object... params) {
        List<Instant> rows = query(jpql, Instant.class, params).getResultList();
        if (rows.isEmpty() || rows.get(0) == null) {
            return 0;
        }
        return Math.max(0, Duration.between(rows.get(0), Instant.now()).toHours());
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

    private static BigDecimal toDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd) return bd;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return new BigDecimal(value.toString());
    }

    private static double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
