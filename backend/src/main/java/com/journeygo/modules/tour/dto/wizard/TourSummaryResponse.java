package com.journeygo.modules.tour.dto.wizard;

import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourFormat;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "Dòng tour trong danh sách Quản lý tour của đối tác")
public record TourSummaryResponse(
        Long tourId,
        String title,
        TourStatus status,
        TourFormat tourFormat,
        String coverImageUrl,
        String regionName,
        String themeName,
        int stopCount,
        int versionNumber,
        Instant updatedAt,
        Instant submittedAt,
        Instant publishedAt
) {
    public static TourSummaryResponse fromEntity(Tour t) {
        return new TourSummaryResponse(t.getTourId(), t.getTitle(), t.getStatus(), t.getTourFormat(),
                t.getCoverImageUrl(),
                t.getRegion() != null ? t.getRegion().getName() : null,
                t.getTheme() != null ? t.getTheme().getName() : null,
                t.getStops().size(), t.getVersionNumber(), t.getUpdatedAt(), t.getSubmittedAt(), t.getPublishedAt());
    }
}
