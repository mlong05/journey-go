package com.journeygo.modules.experience.dto.response;

import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Response chi tiết Experience.
 *
 * Theo CONTEXT §3 mới: KHÔNG trả experienceType vì Experience luôn gồm cả Quiz + Real-world
 * (phân biệt qua các Task con).
 *
 * Lưu ý: KHÔNG có moderatedBy/moderationReason vì moderation workflow chờ content
 * cultural từ module destination. Sẽ thêm lại sau.
 */
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
    /**
     * Map từ entity với count đã được truyền vào sẵn — DÙNG Ở LISTING.
     *
     * <p>Tránh N+1: KHÔNG gọi {@code e.getTasks().size()} vì sẽ trigger lazy load
     * cho mỗi Experience trong page.</p>
     */
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

    /**
     * Map từ entity (single record, đã fetch EAGER) — DÙNG Ở getById / getByDestinationId.
     */
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
