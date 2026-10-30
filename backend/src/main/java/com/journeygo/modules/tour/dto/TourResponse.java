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

@Builder(toBuilder = true)
@Schema(description = "Thông tin tour du lịch")
public record TourResponse(

        @Schema(description = "ID tour") Long tourId,
        @Schema(description = "Tên tour") String title,
        @Schema(description = "Loại hình tour") TourType tourType,
        @Schema(description = "Giá tour (VND) = tổng giá các Experience PUBLISHED của các điểm đến trong tour") BigDecimal price,
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
        @Schema(description = "Ảnh bìa hiển thị: ảnh riêng của tour, nếu chưa có thì lấy ảnh điểm đến đầu tiên có ảnh") String coverImageUrl,
        @Schema(description = "Ảnh bìa riêng do người tạo tour tải lên (null nếu chưa có)") String tourCoverImageUrl,
        @Schema(description = "Số nhiệm vụ đang mở trong các trải nghiệm của tour") int taskCount,
        @Schema(description = "Tổng điểm thưởng tối đa từ các nhiệm vụ") int totalTaskPoints,
        @Schema(description = "Số huy hiệu check-in có thể nhận (mỗi điểm đến một huy hiệu, trừ huy hiệu đã tắt)") int badgeCount,
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
                .tourCoverImageUrl(t.getCoverImageUrl())
                .coverImageUrl(t.getCoverImageUrl() != null && !t.getCoverImageUrl().isBlank() ? t.getCoverImageUrl() : destResponses.stream()
                        .sorted(java.util.Comparator.comparingInt(TourDestinationResponse::sequenceOrder))
                        .map(TourDestinationResponse::coverImageUrl)
                        .filter(url -> url != null && !url.isBlank())
                        .findFirst().orElse(null))
                .createdBy(t.getCreatedBy() != null ? t.getCreatedBy().getFullName() : null)
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }
}
