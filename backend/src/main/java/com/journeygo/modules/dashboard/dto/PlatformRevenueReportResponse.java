package com.journeygo.modules.dashboard.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Báo cáo doanh thu nền tảng theo THÁNG DƯƠNG LỊCH (giờ Việt Nam) — trang Tổng quan vận hành Admin.
 *
 * <p>Định nghĩa số liệu:
 * <ul>
 *   <li><b>Doanh thu nền tảng</b> = tổng {@code ProviderRevenue.commissionAmount}. Hoa hồng được tính
 *       trên số tiền SAU HOÀN ({@code (gross − refund) × rate}, trừ voucher nền tảng) ⇒ đã phản ánh hoàn tiền.</li>
 *   <li><b>GMV</b> = tổng {@code Booking.totalAmount} của booking đã thanh toán (CONFIRMED/COMPLETED).</li>
 *   <li>Mọi số liệu gom theo tháng của {@code Booking.paidAt}. Hoàn tiền phát sinh sau làm giảm
 *       doanh thu của tháng khách THANH TOÁN, không phải tháng hoàn.</li>
 * </ul>
 *
 * @param currentMonth          tháng hiện tại, dạng yyyy-MM
 * @param daysElapsed           số ngày đã qua của tháng hiện tại (tính cả hôm nay)
 * @param daysInMonth           số ngày của tháng hiện tại
 * @param monthToDate           từ đầu tháng tới hiện tại
 * @param previousSameDays      cùng khoảng thời gian của tháng trước (so sánh công bằng)
 * @param previousMonthFull     cả tháng trước
 * @param projectedRevenue      dự kiến doanh thu hết tháng theo tốc độ hiện tại
 * @param months                N tháng gần nhất (cũ → mới), tháng cuối là tháng hiện tại (chưa trọn)
 * @param dailyCumulative       doanh thu lũy kế theo ngày: tháng này vs tháng trước
 * @param valueSplit            phân bổ giá trị đơn hàng của tháng hiện tại
 * @param topProviders          doanh thu nền tảng theo đối tác trong tháng hiện tại (top 5 + "Khác")
 */
public record PlatformRevenueReportResponse(
        String currentMonth,
        int daysElapsed,
        int daysInMonth,
        MonthSummary monthToDate,
        MonthSummary previousSameDays,
        MonthSummary previousMonthFull,
        BigDecimal projectedRevenue,
        List<MonthPoint> months,
        List<DailyPoint> dailyCumulative,
        ValueSplit valueSplit,
        List<ProviderShare> topProviders,
        Instant updatedAt) {

    /**
     * @param takeRate doanh thu nền tảng / GMV (%), 0 khi chưa có GMV
     */
    public record MonthSummary(String from, String to, BigDecimal revenue, BigDecimal gmv,
            BigDecimal refund, long bookings, double takeRate) {}

    /**
     * @param lastYearRevenue doanh thu cùng tháng năm trước (để vẽ đường so sánh)
     * @param partial         true = tháng chưa kết thúc
     */
    public record MonthPoint(String month, String label, BigDecimal revenue, BigDecimal gmv,
            BigDecimal refund, long bookings, BigDecimal lastYearRevenue, boolean partial) {}

    /** {@code current} = null với những ngày chưa tới; {@code previous} = null nếu tháng trước ngắn hơn. */
    public record DailyPoint(int day, BigDecimal current, BigDecimal previous) {}

    /**
     * Giá trị đơn hàng gốc (trước voucher) của tháng hiện tại được chia thành:
     * đối tác nhận + hoa hồng nền tảng + voucher giảm + hoàn cho khách.
     */
    public record ValueSplit(BigDecimal grossAmount, BigDecimal providerNet, BigDecimal commission,
            BigDecimal voucherDiscount, BigDecimal refund) {}

    /** {@code providerId} = null cho nhóm "Khác". */
    public record ProviderShare(Long providerId, String providerName, BigDecimal revenue, long bookings) {}
}
