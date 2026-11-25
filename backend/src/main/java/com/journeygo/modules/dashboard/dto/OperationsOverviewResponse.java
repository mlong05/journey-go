package com.journeygo.modules.dashboard.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Dữ liệu tổng quan vận hành cho trang Admin (read-only), theo KHUNG SO SÁNH đang chọn.
 *
 * <p>Chỉ gồm số liệu vận hành chưa có trang riêng. Tài chính chi tiết nằm ở
 * {@code /admin/finance}, quyết toán ở {@code /admin/settlements}, người dùng/đối tác ở trang quản lý
 * tương ứng. Doanh thu theo tháng: xem {@link PlatformRevenueReportResponse}.
 *
 * <p><b>⚠️ Về 3 tầng so sánh (Kỳ động / Tháng / Năm):</b>
 * Trang hiển thị <b>01 khung tại một thời điểm</b> (chuyển qua tab). Mỗi khung có:
 * <ul>
 *   <li>{@link #kpis} — số liệu của kỳ hiện tại trong khung.</li>
 *   <li>{@link #previousKpis} — số liệu của mốc so sánh (baseline) trong cùng khung.</li>
 * </ul>
 * Mốc so sánh LUÔN là <b>cùng số ngày đã qua</b> của kỳ trước (xem
 * {@link com.journeygo.modules.dashboard.service.ComparisonPeriod}) — tránh so 24 ngày
 * với 31 ngày gây giảm giả.
 */
public record OperationsOverviewResponse(
        PeriodInfo period,
        SystemHealth systemHealth,
        KpiSummary kpis,
        KpiSummary previousKpis,
        List<SparkPoint> revenueTrend,
        List<SparkPoint> previousRevenueTrend,
        List<SparkPoint> gmvTrend,
        List<SparkPoint> previousGmvTrend,
        BookingBreakdown bookingBreakdown,
        List<BookingTrendPoint> bookingTrend,
        BookingFunnel funnel,
        List<PendingAction> pendingActions,
        List<RegionRow> regions,
        List<TopTourRow> topTours,
        ExperienceStats experience,
        List<DestinationVisitRow> topDestinations,
        Instant updatedAt) {

    /**
     * Khoảng thời gian đang xem + mốc so sánh.
     *
     * @param key           khung so sánh: weekly | monthly | yearly | custom
     * @param label         nhãn kỳ hiện tại (VD: "Tháng 11/2026")
     * @param currentLabel  khoảng ngày/tháng kỳ hiện tại (VD: "1/11 – 24/11")
     * @param baselineLabel nhãn khoảng ngày/tháng mốc so sánh (VD: "1/10 – 24/10")
     * @param baselineLabelForCurrentDays nhãn baseline với cùng số ngày (dùng cho tooltip %)
     */
    public record PeriodInfo(String key, String label, String currentLabel, String baselineLabel,
            Instant from, Instant to, Instant previousFrom, Instant previousTo,
            int days, int previousDays, String baselineLabelForCurrentDays) {}

    /** Tình trạng hệ thống theo số việc khẩn cấp đang chờ. */
    public record SystemHealth(String status, String label, boolean degraded,
            long criticalActions, long pendingActions) {}

    /**
     * KPI tổng quan của một kỳ (và của mốc so sánh, cùng cấu trúc để so sánh).
     *
     * @param refundAmount     tiền đã hoàn khách trong kỳ
     * @param refundRate       refundAmount / gmv (%)
     * @param successRate      successfulBookings / totalBookings (%)
     * @param avgBookingValue  GMV / số booking thành công
     */
    public record KpiSummary(BigDecimal platformRevenue, BigDecimal gmv,
            long totalBookings, long successfulBookings, long activeTourists, long activeProviders,
            BigDecimal refundAmount, double refundRate, double successRate,
            BigDecimal avgBookingValue) {}

    /** Một điểm của chuỗi xu hướng (doanh thu / GMV theo bucket thời gian). */
    public record SparkPoint(String label, BigDecimal value) {}

    /** Trạng thái booking theo bucket thời gian (dùng cho biểu đồ cột chồng). */
    public record BookingTrendPoint(String label, long success, long pendingPayment,
            long cancelled, long failed) {}

    /** Tổng hợp trạng thái booking của kỳ — tổng luôn khớp 4 trạng thái con. */
    public record BookingBreakdown(long success, long pendingPayment, long cancelled, long failed,
            long total, double successRatio) {}

    /**
     * Phễu chuyển đổi booking — chỉ số "hướng tới hành động".
     *
     * <p>Mỗi bậc cho biết bao nhiêu khách rơi ra khỏi phễu ⇒ lộ ra vấn đề (VD: đặt tour
     * nhiều nhưng không đi trải nghiệm ⇒ chất lượng tour hoặc vấn đề check-in).
     */
    public record BookingFunnel(long created, long paid, long completed,
            double paidRate, double completedRate) {}

    /**
     * Một việc Admin cần xử lý.
     *
     * @param severity            URGENT | SOON | NORMAL
     * @param href                đường dẫn xử lý; {@code null} = việc thuộc vai trò khác (chỉ theo dõi)
     * @param actionLabel         nhãn nút hành động
     * @param oldestWaitingHours  việc chờ lâu nhất đã chờ bao nhiêu giờ (0 = không có dữ liệu)
     * @param amountAtStake       số tiền đang "đứng" (tiền hoàn / giá trị đợt tất toán); null = không áp dụng
     */
    public record PendingAction(String id, String title, String note, String severity, long count,
            String href, String actionLabel, long oldestWaitingHours, BigDecimal amountAtStake) {}

    /**
     * Một dòng phân rã theo khu vực của TOUR.
     *
     * @param regionId  null = tour chưa gán khu vực (vẫn tính để tổng khớp)
     */
    public record RegionRow(Long regionId, String name, long bookings, BigDecimal revenue,
            long tourists) {}

    /** Dòng bảng "Top tour phổ biến". */
    public record TopTourRow(int rank, Long tourId, String tourTitle, String providerName,
            long bookings, BigDecimal revenue, double completionRate) {}

    /** Thống kê trải nghiệm (mở khóa / check-in / hoàn thành). */
    public record ExperienceStats(long unlocks, long checkIns, long completed, double completionRate) {}

    /** Dòng bảng "Top địa điểm được ghé thăm". */
    public record DestinationVisitRow(Long destinationId, String name, long checkIns, long completions,
            double completionRate) {}

}
