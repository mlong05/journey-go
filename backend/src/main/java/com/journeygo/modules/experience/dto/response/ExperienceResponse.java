package com.journeygo.modules.experience.dto.response;

import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
@Schema(description = "Response chi tiết Experience (không có experienceType — phân biệt qua Task)")
public record ExperienceResponse(

        @Schema(description = "ID Experience") Long id,
        @Schema(description = "ID Destination (UNIQUE — BR-EXP-1)") Long destinationId,
        @Schema(description = "Tiêu đề") String title,
        @Schema(description = "Mô tả") String description,
        @Schema(description = "Giá") BigDecimal price,
        @Schema(description = "Currency") String currency,
        @Schema(description = "Thời lượng (phút)") Integer durationMinutes,
        @Schema(description = "Trạng thái") ExperienceStatus status,
        @Schema(description = "Người tạo") String createdBy,
        @Schema(description = "Số Task con") Integer taskCount,
        @Schema(description = "Số CheckInPoint") Integer checkInPointCount,
        @Schema(description = "Ngày tạo") Instant createdAt,
        @Schema(description = "Ngày cập nhật") Instant updatedAt
) {

    public static ExperienceResponse fromEntity(Experience e, int taskCount, int checkInPointCount) {
        return ExperienceResponse.builder()
                .id(e.getId())
                .destinationId(e.getDestinationId())
                .title(e.getTitle())
                .description(e.getDescription())
                .price(e.getPrice())
                .currency(e.getCurrency())
                .durationMinutes(e.getDurationMinutes())
                .status(e.getStatus())
                .createdBy(e.getCreatedBy() != null ? e.getCreatedBy().getFullName() : null)
                .taskCount(taskCount)
                .checkInPointCount(checkInPointCount)
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }


    public static ExperienceResponse fromEntity(Experience e) {
        return ExperienceResponse.builder()
                .id(e.getId())
                .destinationId(e.getDestinationId())
                .title(e.getTitle())
                .description(e.getDescription())
                .price(e.getPrice())
                .currency(e.getCurrency())
                .durationMinutes(e.getDurationMinutes())
                .status(e.getStatus())
                .createdBy(e.getCreatedBy() != null ? e.getCreatedBy().getFullName() : null)
                .taskCount(e.getTasks() != null ? e.getTasks().size() : 0)
                .checkInPointCount(e.getCheckInPoints() != null ? e.getCheckInPoints().size() : 0)
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
