package com.journeygo.modules.dashboard.dto;

import java.util.List;

/**
 * So lieu tong quan cua trang "Tong quan" cho kiem duyet vien (/moderator).
 *
 * <p>Trang nay la DASHBOARD VAT HANH (Operational dashboard):
 *   - Tap trung ap luc hien tai: hang cho con bao nhieu, trong do bao nhieu qua han.
 *   - Chi so SLA de moderator thay ngay ap luc cong viec truoc mat.
 *   - Moi chi so deu kem Y HANH DONG (link sang man hinh xu ly tuong ung).
 */
public record ModeratorDashboardResponse(
        PendingStats pending,
        long decidedToday,
        long approvedToday,
        long rejectedTotal,
        long pendingReports,
        long pendingPosts,
        Double avgReviewHours,
        long reviewedLast30Days,
        String rangeKey,
        String rangeLabel,
        QueueAge queueAge,
        List<QueueComposition> queueComposition,
        List<RejectionReason> topRejectionReasons,
        Double avgReviewHoursInRange,
        long reviewedInRange,
        long approvedInRange,
        long rejectedInRange) {

    /** So luoc dem theo tung loai muc cho. */
    public record PendingStats(long destinations, long tours, long contents) {}

    /**
     * Phan bo tuoi hang cho theo SLA.
     *
     * @param fresh       moi (duoi 24 gio)
     * @param dueSoon     can uu tien (24 - 48 gio)
     * @param overdue     qua han ( tren 48 gio)
     * @param total       tong so muc dang cho
     * @param oldestHours tuoi cua muc cho lau nhat (gio)
     */
    public record QueueAge(long fresh, long dueSoon, long overdue, long total, double oldestHours) {}

    /** Mot dong cau truc hang cho. */
    public record QueueComposition(String label, long value) {}

    /** Ly do tu choi + so lan xuat hien. */
    public record RejectionReason(String reason, long count) {}
}
