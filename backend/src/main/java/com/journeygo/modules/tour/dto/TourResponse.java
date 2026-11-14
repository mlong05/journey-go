package com.journeygo.modules.tour.dto;

import com.journeygo.modules.destination.dto.DestinationResponse;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourDepartureDate;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.entity.TourFormat;
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
        @Schema(description = "Trạng thái (DRAFT, PENDING_REVIEW, CHANGES_REQUESTED, REJECTED, PUBLISHED)") TourStatus status,
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
        @Schema(description = "ID nhà tour (người tạo) — dùng để mở chat hỗ trợ trước khi mua tour") Long providerId,
        @Schema(description = "Tour tạo theo luồng 5 bước (kiểm duyệt bằng màn hình thẩm định mới)") boolean wizardTour,
        @Schema(description = "Tour 5 bước: DAY_TRIP (trong ngày) hoặc MULTI_DAY; null với tour luồng cũ") TourFormat tourFormat,
        @Schema(description = "Tour trong ngày: thời lượng (phút)") Integer durationMinutes,
        @Schema(description = "Tour nhiều ngày: số đêm") Integer durationNights,
        @Schema(description = "Vùng miền (tour 5 bước)") Long regionId,
        @Schema(description = "Tên vùng miền") String regionName,
        @Schema(description = "Chủ đề (tour 5 bước)") Long themeId,
        @Schema(description = "Tên chủ đề") String themeName,
        @Schema(description = "Số điểm dừng của tour 5 bước (0 với tour luồng cũ)") int stopCount,
        @Schema(description = "Ngày khởi hành gần nhất tính từ hôm nay (null nếu không còn ngày nào)") LocalDate nextDepartureDate,
        @Schema(description = "Bảng giá theo loại khách (tour 5 bước)") List<TourPriceResponse> prices,
        @Schema(description = "Các ngày khởi hành đã công bố (tour 5 bước)") List<LocalDate> departureDates,
        @Schema(description = "Số chỗ tối đa mỗi slot (tour 5 bước)") Integer maxGuestsPerSlot,
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
                // Tour 5 bước: điểm đến riêng (bước 3); tour luồng cũ: điểm đến chọn từ danh mục chung.
                .destinationCount(t.isWizardTour() ? t.getStops().size() : t.getDestinationCount())
                .destinations(destResponses)
                .tourCoverImageUrl(t.getCoverImageUrl())
                .coverImageUrl(t.getCoverImageUrl() != null && !t.getCoverImageUrl().isBlank() ? t.getCoverImageUrl() : destResponses.stream()
                        .sorted(java.util.Comparator.comparingInt(TourDestinationResponse::sequenceOrder))
                        .map(TourDestinationResponse::coverImageUrl)
                        .filter(url -> url != null && !url.isBlank())
                        .findFirst().orElse(null))
                .createdBy(t.getCreatedBy() != null ? t.getCreatedBy().getFullName() : null)
                .providerId(t.getCreatedBy() != null ? t.getCreatedBy().getId() : null)
                .wizardTour(t.isWizardTour())
                .tourFormat(t.getTourFormat())
                .durationMinutes(t.getDurationMinutes())
                .durationNights(t.getDurationNights())
                .regionId(t.getRegion() != null ? t.getRegion().getId() : null)
                .regionName(t.getRegion() != null ? t.getRegion().getName() : null)
                .themeId(t.getTheme() != null ? t.getTheme().getId() : null)
                .themeName(t.getTheme() != null ? t.getTheme().getName() : null)
                .stopCount(t.isWizardTour() ? t.getStops().size() : 0)
                .prices(t.getPrices() == null ? Collections.emptyList()
                        : t.getPrices().stream().map(TourPriceResponse::fromEntity).toList())
                .departureDates(t.getDepartureDates() == null ? Collections.emptyList()
                        : t.getDepartureDates().stream()
                        .map(TourDepartureDate::getDepartureDate)
                        .filter(java.util.Objects::nonNull)
                        .toList())
                .maxGuestsPerSlot(t.getMaxGuestsPerSlot())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }
}
