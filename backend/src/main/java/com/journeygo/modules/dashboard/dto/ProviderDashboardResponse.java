package com.journeygo.modules.dashboard.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Số liệu tổng quan của một đối tác.
 * "current" là kỳ lịch dương đang chọn (từ đầu kỳ tới thời điểm hiện tại),
 * "previous" là cùng khoảng thời gian đã trôi qua của kỳ liền trước để đối chiếu công bằng,
 * "allTime" là tổng lũy kế từ trước tới nay.
 */
public record ProviderDashboardResponse(
        String range,
        String compareMode,
        String currentLabel,
        String previousLabel,
        String previousTitle,
        DestinationStats destinations,
        PeriodCount checkIns,
        PeriodAmount revenue,
        OperationsStats operations,
        ForecastSummary forecast,
        MissionStats missions,
        List<TourPerformanceRow> tourPerformance,
        List<DestinationRow> destinationRows,
        List<RecentBookingRow> recentBookings,
        List<UpcomingDepartureRow> upcomingDepartures,
        List<ModerationUpdate> moderationUpdates,
        String seriesUnit,
        List<SeriesPoint> series
) {

    /**
     * Một mốc trên biểu đồ diễn biến cùng kỳ.
     * seriesUnit: "hour" (today) | "day" (week, month) | "week" (quarter) | "month" (year).
     * Khi xem trọn kỳ trước (full_prev) hoặc bật dự báo (forecast), các mốc tương lai của kỳ hiện tại
     * có revenue/bookings/guests/checkIns = null và có thể mang forecastRevenue/forecastGuests.
     */
    public record SeriesPoint(
            Instant start,
            Instant prevStart,
            BigDecimal revenue,
            Long bookings,
            Long guests,
            Long checkIns,
            BigDecimal prevRevenue,
            Long prevBookings,
            Long prevGuests,
            Long prevCheckIns,
            BigDecimal forecastRevenue,
            Long forecastGuests
    ) {}

    public record DestinationStats(long total, long published, long pending, long rejected, long draft) {}

    public record PeriodCount(long current, long previous, long allTime) {}

    public record PeriodAmount(
            BigDecimal current,
            BigDecimal previous,
            BigDecimal allTime,
            long currentBookings,
            long previousBookings
    ) {}

    /** Nhóm chỉ số đối chiếu vận hành kinh doanh giữa kỳ này và kỳ trước. */
    public record OperationsStats(
            long currentBookings,
            long previousBookings,
            long pendingBookings,
            long currentGuests,
            long previousGuests,
            BigDecimal currentAvgOrder,
            BigDecimal previousAvgOrder,
            long completedBookings,
            long previousCompletedBookings,
            long cancelledBookings,
            long previousCancelledBookings
    ) {}

    /**
     * Dự báo lượng khách & doanh thu đến cuối kỳ hiện tại:
     *   • actualGuests / actualRevenue: đã ghi nhận từ đầu kỳ tới hôm nay
     *   • confirmedFutureGuests / confirmedFutureRevenue: khách đã đặt lịch (CONFIRMED) cho phần còn lại của kỳ
     *   • estimatedNewGuests / estimatedNewRevenue: ước tính khách đặt cận ngày dựa trên tốc độ 14 ngày gần nhất
     *   • projectedTotalGuests / projectedTotalRevenue: tổng dự kiến đến hết kỳ
     *   • remainingCapacity: tổng số chỗ còn trống trên các ngày khởi hành còn lại trong kỳ (null nếu chưa cấu hình)
     */
    public record ForecastSummary(
            int remainingDays,
            long actualGuests,
            long confirmedFutureGuests,
            long estimatedNewGuests,
            long projectedTotalGuests,
            BigDecimal actualRevenue,
            BigDecimal confirmedFutureRevenue,
            BigDecimal estimatedNewRevenue,
            BigDecimal projectedTotalRevenue,
            Long remainingCapacity
    ) {}

    /** Thống kê nhiệm vụ thực địa & câu đố văn hóa (gộp cả Tour 5 bước và Điểm đến). */
    public record MissionStats(long tasks, long answered, long correct) {}

    /** Hiệu quả kinh doanh & tương tác của từng tour trong kỳ đang chọn so với kỳ trước. */
    public record TourPerformanceRow(
            Long tourId,
            String title,
            String status,
            int stopCount,
            int durationDays,
            BigDecimal currentRevenue,
            BigDecimal previousRevenue,
            BigDecimal allTimeRevenue,
            long currentBookings,
            long previousBookings,
            long currentGuests,
            long periodCheckIns
    ) {}

    /**
     * Dòng điểm dừng / điểm đến của đối tác.
     * source: "TOUR_STOP" (trạm thuộc Tour 5 bước) | "DESTINATION" (điểm đến độc lập).
     */
    public record DestinationRow(
            Long id,
            String name,
            String address,
            String status,
            BigDecimal latitude,
            BigDecimal longitude,
            boolean hasQr,
            String source,
            String tourTitle,
            long periodCheckIns,
            long checkIns
    ) {}

    /** Đơn đặt tour gần đây của đối tác. */
    public record RecentBookingRow(
            Long bookingId,
            String bookingCode,
            String touristName,
            Long tourId,
            String tourTitle,
            LocalDate experienceDate,
            int slotCount,
            BigDecimal totalAmount,
            String status,
            Instant createdAt,
            Instant paidAt
    ) {}

    /** Lịch đoàn sắp khởi hành (tổng hợp từ các đơn đã xác nhận có ngày đi từ hôm nay). */
    public record UpcomingDepartureRow(
            Long tourId,
            String tourTitle,
            LocalDate experienceDate,
            long bookingCount,
            long guestCount,
            Integer maxGuestsPerSlot
    ) {}

    /** type: DESTINATION | TOUR; action: SUBMITTED | APPROVED | CHANGES_REQUESTED | REJECTED. */
    public record ModerationUpdate(
            String type,
            Long targetId,
            String targetName,
            String action,
            String note,
            String reason,
            Instant createdAt
    ) {}
}
