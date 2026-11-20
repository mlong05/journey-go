package com.journeygo.modules.dashboard.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Dữ liệu tổng quan vận hành cho trang Admin (read-only).
 *
 * <p>⚠️ Ba lớp số liệu tài chính được TÁCH BIỆT có chủ đích
 * (xem {@code OperationsOverviewService#buildFinance}):
 * <ol>
 *   <li><b>Dòng tiền khách hàng</b> — theo kỳ đang xem ({@code Booking.paidAt}).</li>
 *   <li><b>Quyết toán</b> — theo đợt tất toán ({@code Settlement.revenuePeriod} yyyy-MM).</li>
 *   <li><b>Doanh thu ghi nhận</b> — từ {@code ProviderRevenue}.</li>
 * </ol>
 * Trộn 3 lớp này khiến Admin hiểu nhầm (VD: tưởng "tiền đã quyết toán" là tiền của
 * riêng một đối tác, trong khi đợt BATCH gom N đối tác).
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
        List<PendingAction> pendingActions,
        FinanceSnapshot finance,
        List<TopTourRow> topTours,
        ExperienceStats experience,
        List<DestinationVisitRow> topDestinations,
        TouristStats tourists,
        PartnerStats partners,
        List<SettlementRow> recentSettlements,
        List<ActivityRow> recentActivities,
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

    /**
     * Số liệu tài chính — TÁCH 3 LỚP, không trộn lẫn.
     *
     * <p><b>Lớp 1 — dòng tiền khách hàng (theo kỳ đang xem).</b>
     * <ul>
     *   <li>{@code grossPaid} — tổng tiền khách thực trả (GMV của kỳ).</li>
     *   <li>{@code voucherDiscount} — tổng tiền voucher giảm (vẫn nằm trong tiền khách trả).</li>
     *   <li>{@code refundAmount} — tổng tiền đã hoàn (theo thời điểm hoàn tiền hoàn tất).</li>
     *   <li>{@code netCollected} = {@code grossPaid − refundAmount} (khớp /admin/finance).</li>
     * </ul>
     *
     * <p><b>Lớp 2 — quyết toán (theo đợt tất toán, KHÔNG lọc theo kỳ đang xem).</b>
     * <ul>
     *   <li>{@code settledAmount} — tổng tiền đã quyết toán cho đối tác.</li>
     *   <li>{@code settledPartnerCount} — SỐ ĐỐI TÁC thực sự nhận tiền (đợt BATCH gom N đối tác).</li>
     *   <li>{@code settledPeriod} — kỳ doanh thu (yyyy-MM) của đợt tất toán mới nhất.</li>
     * </ul>
     *
     * <p><b>Lớp 3 — doanh thu ghi nhận (từ {@code ProviderRevenue}).</b>
     * Chỉ gồm tour có đối tác được gán đều đức trải nghiệm ⇒ có thể nhỏ hơn nhiều so với GMV.
     */
    public record FinanceSnapshot(
            // ── Lớp 1: dòng tiền khách hàng (theo kỳ) ──
            BigDecimal grossPaid,
            BigDecimal voucherDiscount,
            BigDecimal refundAmount,
            BigDecimal netCollected,
            long paidTransactionCount,
            // ── Lớp 2: quyết toán (theo đợt tất toán) ──
            BigDecimal settledAmount,
            long settledSettlementCount,
            long settledPartnerCount,
            String settledPeriod,
            BigDecimal pendingSettleAmount,
            BigDecimal eligibleRevenueAmount,
            long eligibleRevenueCount,
            long draftSettlementCount,
            BigDecimal draftSettlementAmount,
            // ── Doanh thu ghi nhận (theo kỳ, từ ProviderRevenue) ──
            BigDecimal accruedCommission,
            BigDecimal accruedPartnerNet,
            long accruedRevenueCount) {}

    /** Dòng bảng "Top tour phổ biến". */
    public record TopTourRow(int rank, Long tourId, String tourTitle, String providerName,
            long bookings, BigDecimal revenue, double completionRate) {}

    /** Thống kê trải nghiệm (mở khóa / check-in / hoàn thành). */
    public record ExperienceStats(long unlocks, long checkIns, long completed, double completionRate) {}

    /** Dòng bảng "Top địa điểm được ghé thăm". */
    public record DestinationVisitRow(Long destinationId, String name, long checkIns, long completions,
            double completionRate) {}

    /** Thống kê khách du lịch. */
    public record TouristStats(long total, long newInPeriod, long active, long completedAtLeastOne,
            double returningRate, double returningRateDelta) {}

    /** Thống kê đối tác — "Tổng" luôn = "Đang hoạt động" + "Không hoạt động". */
    public record PartnerStats(long total, long active, long withPublishedTours, long newInPeriod,
            long inactive, long pendingApproval) {}

    /** Dòng bảng "Quyết toán gần đây". */
    public record SettlementRow(Long id, String code, String providerName, String revenuePeriod,
            BigDecimal totalAmount, String status, String scope, Integer partnerCount) {}

    /** Dòng nhật ký hoạt động gần đây. */
    public record ActivityRow(Instant timestamp, String type, String actor, String action, String target) {}
}
