package com.journeygo.modules.dashboard.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Số liệu của một đối tác. "current" là khoảng thời gian đang chọn (range), "previous" là khoảng
 * liền trước có cùng độ dài để so sánh tăng/giảm, "allTime" là tổng từ trước tới nay.
 *
 * <p>Trang Tổng quan của đối tác chia làm 6 tầng:
 * <ol>
 *   <li>KPI cốt lõi — {@link RevenueSummary}, {@link BookingSummary}, {@link CheckInSummary}</li>
 *   <li>Trung tâm hành động — {@link ActionItem}</li>
 *   <li>Diễn biến — {@link SeriesPoint}</li>
 *   <li>Phân rã và chẩn đoán — {@link TourBreakdown}, {@link Funnel}, {@link BookingStatusBreakdown},
 *       {@link RegionBreakdown}, {@link VerificationBreakdown}</li>
 *   <li>Bảng vận hành — {@link TourPerformance}, {@link UpcomingDeparture}</li>
 *   <li>Chân trang — {@code updatedAt}</li>
 * </ol>
 */
public record ProviderDashboardResponse(String range, DestinationStats destinations, PeriodCount checkIns,
        PeriodAmount revenue, MissionStats missions, List<DestinationRow> destinationRows,
        List<ModerationUpdate> moderationUpdates, String seriesUnit, List<SeriesPoint> series,
        RevenueSummary revenueSummary, BookingSummary bookings, CheckInSummary checkInSummary,
        List<ActionItem> actions, List<TourBreakdown> tourBreakdown, Funnel funnel,
        List<BookingStatusBreakdown> bookingStatusBreakdown, List<UpcomingDeparture> upcomingDepartures,
        Instant updatedAt,
        List<RegionBreakdown> regionBreakdown,
        List<VerificationBreakdown> checkInByMethod,
        List<TourPerformance> tourPerformance) {

    /**
     * Một mốc của biểu đồ diễn biến (seriesUnit = "hour" cho range today, "day" cho các kỳ khác).
     * start = đầu mốc kỳ này; prevStart = mốc tương ứng của kỳ trước (null khi kỳ trước ngắn hơn,
     * vd. ngày 31 so với tháng trước chỉ có 30 ngày) — khi đó các giá trị prev* cũng là null.
     */
    public record SeriesPoint(Instant start, Instant prevStart, BigDecimal revenue, long bookings, long checkIns,
            BigDecimal prevRevenue, Long prevBookings, Long prevCheckIns,
            Long uniqueTourists, Long prevUniqueTourists) {}

    public record DestinationStats(long total, long published, long pending, long rejected, long draft) {}

    public record PeriodCount(long current, long previous, long allTime) {}

    public record PeriodAmount(BigDecimal current, BigDecimal previous, BigDecimal allTime, long currentBookings) {}

    /** answered/correct đếm các câu trả lời đố vui của du khách trên nhiệm vụ thuộc điểm đến của đối tác. */
    public record MissionStats(long tasks, long answered, long correct) {}

    public record DestinationRow(Long id, String name, String address, String status, BigDecimal latitude,
            BigDecimal longitude, long checkIns) {}

    /** type: DESTINATION | TOUR; action: SUBMITTED | APPROVED | REJECTED. */
    public record ModerationUpdate(String type, Long targetId, String targetName, String action, String note,
            String reason, Instant createdAt) {}

    /**
     * Một tour trong danh sách rút gọn — dùng cho dropdown bộ lọc "Tour cụ thể".
     */
    public record TourOption(Long tourId, String title, String status) {}

    /**
     * Tổng hợp doanh thu của đối tác trong kỳ — TÁCH rõ "giá trị đơn" và "tiền thực nhận".
     *
     * <p>⚠️ `grossAmount` là TỔNG TIỀN DU KHÁCH trả (GMV của đơn). `netAmount` là TIỀN ĐỐI TÁC
     * thực nhận sau hoa hồng nền tảng, voucher và hoàn tiền. Trộn hai khái niệm này làm đối tác
     * hiểu nhầm số tiền sắp về ví ⇒ hai ô phải hiển thị RIÊNG.
     *
     * <p>`heldAmount` = số tiền đang bị GIỮ vì chưa đủ điều kiện tất toán (chưa hoàn thành trải nghiệm).
     */
    public record RevenueSummary(BigDecimal grossAmount, BigDecimal netAmount, BigDecimal commissionAmount,
            BigDecimal refundAmount, BigDecimal pendingSettlementAmount, BigDecimal walletBalance,
            BigDecimal heldAmount, long bookingCount, long uniqueTourists, BigDecimal avgBookingValue) {}

    /** Số đơn trong kỳ: tổng, đã thanh toán, đã hoàn thành, đang chờ thanh toán, đã hủy/hết hạn. */
    public record BookingSummary(long total, long paid, long completed, long pendingPayment, long cancelled,
            double completionRate, double refundRate, long uniqueTourists, BigDecimal avgBookingValue) {}

    /** Lượt check-in hợp lệ trong kỳ + số khách du khách khác nhau đã check-in. */
    public record CheckInSummary(long current, long previous, long allTime, long uniqueCheckInUsers) {}

    /**
     * Một việc đối tác cần xử lý — "hướng tới hành động".
     *
     * <p>severity: URGENT | SOON | NORMAL. `amountAtStake` là số tiền đang bị giữ (nếu có).
     * `href` null ⇒ chỉ theo dõi, không điều hướng (tránh link chết).
     */
    public record ActionItem(String id, String title, String note, String severity, long count,
            String actionLabel, String href, long oldestWaitingHours, BigDecimal amountAtStake) {}

    /** Doanh thu và lượt đặt của một tour trong kỳ — phân rã theo tour. */
    public record TourBreakdown(Long tourId, String title, String status, long bookings, long completed,
            BigDecimal grossAmount, BigDecimal netAmount, long checkIns) {}

    /**
     * Phễu chuyển đổi của du khách trong kỳ.
     *
     * <p>created = đơn đã tạo; paid = đã thanh toán; completed = đã hoàn thành trải nghiệm;
     * refunded = đã hoàn tiền. `conversionRate` = paid / created (%).
     */
    public record Funnel(long created, long paid, long completed, long refunded, double conversionRate,
            double completionRate) {}

    /** Một dòng trong biểu đồ cột trạng thái đơn. */
    public record BookingStatusBreakdown(String status, String label, long count, BigDecimal amount) {}

    /** Lịch khởi hành sắp tới kèm sức chứa — bảng vận hành. */
    public record UpcomingDeparture(Long tourId, String tourTitle, LocalDate date, Integer capacity,
            int confirmedGuests, int pendingGuests, int reservedSeats, String slotStatus, boolean past,
            BigDecimal revenue) {}

    /** Doanh thu theo khu vực của tour. */
    public record RegionBreakdown(Long regionId, String regionName, long bookings, BigDecimal grossAmount) {}

    /** Lượt check-in theo phương thức xác minh (GPS / QR / MANUAL / BEACON). */
    public record VerificationBreakdown(String method, String label, long count) {}

    /**
     * Một dòng trong bảng vận hành "Tour".
     *
     * <p>`bookings`/`completed`/`grossAmount` tính theo kỳ đang xem (đơn đã thanh toán);
     * `minPrice` = giá thấp nhất trong bảng giá của tour; `updatedAt` = mốc sửa nội dung gần nhất.
     */
    public record TourPerformance(Long tourId, String title, String status, Long regionId, String regionName,
            long stopCount, long bookings, long completed, BigDecimal grossAmount, BigDecimal minPrice,
            Instant updatedAt, Instant publishedAt) {}
}
