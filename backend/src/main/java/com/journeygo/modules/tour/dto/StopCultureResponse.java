package com.journeygo.modules.tour.dto;

import com.journeygo.modules.tour.dto.wizard.TourDetailResponse;
import com.journeygo.modules.tour.entity.VideoSource;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/** Nội dung văn hoá của một điểm dừng, chỉ trả cho du khách đã check-in tại điểm đó. */
@Schema(description = "Nội dung văn hoá của điểm dừng (mở khoá sau check-in)")
public record StopCultureResponse(
        Long stopId,
        int sequenceOrder,
        String name,
        String shortDescription,
        String imageUrl,
        String videoUrl,
        VideoSource videoSource,
        String culturalContent,
        List<String> culturalImages,
        List<TourDetailResponse.Artifact> artifacts
) {
    public static StopCultureResponse from(TourDetailResponse.Stop s) {
        return new StopCultureResponse(s.id(), s.sequenceOrder(), s.name(), s.shortDescription(), s.imageUrl(),
                s.videoUrl(), s.videoSource(), s.culturalContent(),
                s.culturalImages() == null ? List.of() : s.culturalImages(),
                s.artifacts() == null ? List.of() : s.artifacts());
    }
}
