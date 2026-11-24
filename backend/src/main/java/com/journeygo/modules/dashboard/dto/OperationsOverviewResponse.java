package com.journeygo.modules.dashboard.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Dữ liệu tổng quan vận hành cho trang Admin (read-only), theo kỳ đang xem.
 *
 * <p>Chỉ gồm số liệu vận hành chưa có trang riêng. Tài chính chi tiết nằm ở
 * {@code /admin/finance}, quyết toán ở {@code /admin/settlements}, người dùng/đối tác ở trang quản lý
 * tương ứng. Doanh thu theo tháng: xem {@link PlatformRevenueReportResponse}.
 */
public record OperationsOverviewResponse(
        PeriodInfo period,
        SystemHealth systemHealth,
        KpiSummary kpis,
        KpiSummary previousKpis,
        List<SparkPoint> revenueTrend,
        List<SparkPoint> gmvTrend,
        BookingBreakdown bookingBreakdown,
        List<BookingTrendPoint> bookingTrend,
        List<PendingAction> pendingActions,
        List<TopTourRow> topTours,
        ExperienceStats experience,
        List<DestinationVisitRow> topDestinations,
        Instant updatedAt) {

    /** Khoảng thời gian đang xem + khoảng liền trước (cùng độ dài) để so sánh tăng trưởng. */
    public record PeriodInfo(String key, String label, Instant from, Instant to,
            Instant previousFrom, Instant previousTo, int days) {}

    /** Tình trạng hệ thống theo số việc khẩn cấp đang chờ. */
    public record SystemHealth(String status, String label, boolean degraded,
            long criticalActions, long pendingActions) {}

    /** KPI tổng quan của kỳ (và của kỳ trước, cùng cấu trúc để so sánh). */
    public record KpiSummary(BigDecimal platformRevenue, BigDecimal gmv,
            long totalBookings, long successfulBookings, long activeTourists, long activeProviders) {}

    /** Một điểm của chuỗi xu hướng (doanh thu / GMV theo bucket thời gian). */
    public record SparkPoint(String label, BigDecimal value) {}

    /** Trạng thái booking theo bucket thời gian (dùng cho biểu đồ cột chồng). */
    public record BookingTrendPoint(String label, long success, long pendingPayment,
            long cancelled, long failed) {}

    /** Tổng hợp trạng thái booking của kỳ — tổng luôn khớp 4 trạng thái con. */
    public record BookingBreakdown(long success, long pendingPayment, long cancelled, long failed,
            long total, double successRatio) {}

    /**
     * Một việc Admin cần xử lý.
     *
     * @param severity    URGENT | SOON | NORMAL
     * @param href        đường dẫn xử lý; {@code null} = việc thuộc vai trò khác (chỉ theo dõi)
     * @param actionLabel nhãn nút hành động
     */
    public record PendingAction(String id, String title, String note, String severity, long count,
            String href, String actionLabel) {}

    /** Dòng bảng "Top tour phổ biến". */
    public record TopTourRow(int rank, Long tourId, String tourTitle, String providerName,
            long bookings, BigDecimal revenue, double completionRate) {}

    /** Thống kê trải nghiệm (mở khóa / check-in / hoàn thành). */
    public record ExperienceStats(long unlocks, long checkIns, long completed, double completionRate) {}

    /** Dòng bảng "Top địa điểm được ghé thăm". */
    public record DestinationVisitRow(Long destinationId, String name, long checkIns, long completions,
            double completionRate) {}

}
