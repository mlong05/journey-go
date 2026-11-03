package com.journeygo.modules.dashboard.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Số liệu của một đối tác. "current" là khoảng thời gian đang chọn (range), "previous" là khoảng
 * liền trước có cùng độ dài để so sánh tăng/giảm, "allTime" là tổng từ trước tới nay.
 */
public record ProviderDashboardResponse(String range, DestinationStats destinations, PeriodCount checkIns,
        PeriodAmount revenue, MissionStats missions, List<DestinationRow> destinationRows,
        List<ModerationUpdate> moderationUpdates) {

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
}
