package com.journeygo.modules.dashboard.dto;

/**
 * avgReviewHours: thời gian trung bình từ lúc gửi tới lúc có quyết định của các hồ sơ được xử lý
 * trong 30 ngày gần nhất; null khi chưa có hồ sơ nào để tính.
 */
public record ModeratorDashboardResponse(PendingStats pending, long decidedToday, long approvedToday,
        long rejectedTotal, long pendingReports, long pendingPosts, Double avgReviewHours,
        long reviewedLast30Days) {

    public record PendingStats(long destinations, long tours, long contents) {}
}
