package com.journeygo.modules.dashboard.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record AdminDashboardResponse(UserStats users, DestinationStats destinations, CheckInStats checkIns,
        RevenueStats revenue, List<RecentPayment> recentPayments, long pendingTaskTotal,
        List<PendingTask> pendingTasks) {

    public record UserStats(long total, long active, long tourists, long providers, long moderators,
            long newThisMonth) {}

    public record DestinationStats(long published, long total, long publishedTours) {}

    public record CheckInStats(long total, long today) {}

    public record RevenueStats(BigDecimal gross, BigDecimal thisMonth, long successfulPayments) {}

    public record RecentPayment(Long paymentId, String txnRef, String bookingCode, String touristName,
            String tourTitle, String method, String bankCode, BigDecimal amount, String status,
            Instant createdAt, Instant paidAt) {}

    /** type: REFUND | DESTINATION | TOUR; href là trang quản trị nơi xử lý tác vụ. */
    public record PendingTask(String type, Long id, String code, String title, String subtitle,
            String description, Instant submittedAt, String href) {}
}
