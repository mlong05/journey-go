package com.journeygo.modules.tour.dto;

import com.journeygo.modules.destination.dto.DestinationResponse;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.entity.TourType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

@Builder
@Schema(description = "Thông tin tour du lịch")
public record TourResponse(

        @Schema(description = "ID tour") Long tourId,
        @Schema(description = "Tên tour") String title,
        @Schema(description = "Loại hình tour") TourType tourType,
        @Schema(description = "Giá tour cho mỗi người (VND)") BigDecimal price,
        @Schema(description = "Số ngày") int durationDays,
        @Schema(description = "Ngày bắt đầu tour") LocalDate startDate,
        @Schema(description = "Ngày kết thúc tour") LocalDate endDate,
        @Schema(description = "Đã được phê duyệt") boolean approved,
        @Schema(description = "Trạng thái quy trình (DRAFT, PENDING, PUBLISHED, REJECTED)") TourStatus status,
        @Schema(description = "Lý do từ chối (nếu có)") String rejectionReason,
        @Schema(description = "Đã xóa") boolean deleted,
        @Schema(description = "Thời điểm xóa mềm (null nếu còn hoạt động)") Instant deletedAt,
        @Schema(description = "Số lượng điểm đến") int destinationCount,
        @Schema(description = "Danh sách điểm đến theo thứ tự hành trình") List<TourDestinationResponse> destinations,
        @Schema(description = "Người tạo") String createdBy,
        @Schema(description = "Thời gian tạo") Instant createdAt,
        @Schema(description = "Thời gian cập nhật") Instant updatedAt
) {
    public static TourResponse fromEntity(Tour t) {
        if (t == null) return null;

        List<TourDestinationResponse> destResponses = (t.getTourDestinations() == null)
                ? Collections.emptyList()
                : t.getTourDestinations().stream()
                        .map(TourDestinationResponse::fromEntity)
                        .toList();

        return TourResponse.builder()
                .tourId(t.getTourId())
                .title(t.getTitle())
                .tourType(t.getTourType())
                .price(t.getPrice())
                .durationDays(t.getDurationDays())
                .startDate(t.getStartDate())
                .endDate(t.getEndDate())
                .approved(t.isApproved())
                .status(t.getStatus())
                .rejectionReason(t.getRejectionReason())
                .deleted(t.isDeleted())
                .deletedAt(t.getDeletedAt())
                .destinationCount(t.getDestinationCount())
                .destinations(destResponses)
                .createdBy(t.getCreatedBy() != null ? t.getCreatedBy().getFullName() : null)
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }
}
