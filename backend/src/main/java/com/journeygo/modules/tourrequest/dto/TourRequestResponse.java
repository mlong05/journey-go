package com.journeygo.modules.tourrequest.dto;

import com.journeygo.modules.tourrequest.entity.TourRequest;
import com.journeygo.modules.tourrequest.entity.enums.TourRequestStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Builder(toBuilder = true)
@Schema(description = "Thông tin yêu cầu tạo tour riêng")
public record TourRequestResponse(
        @Schema(description = "ID yêu cầu")
        Long id,

        @Schema(description = "ID người yêu cầu (Tourist)")
        Long requesterId,

        @Schema(description = "Tên người yêu cầu")
        String requesterName,

        @Schema(description = "Email người yêu cầu")
        String requesterEmail,

        @Schema(description = "Ảnh đại diện người yêu cầu")
        String requesterAvatarUrl,

        @Schema(description = "Tiêu đề yêu cầu")
        String title,

        @Schema(description = "Mô tả chi tiết")
        String description,

        @Schema(description = "Địa điểm mong muốn")
        String preferredDestination,

        @Schema(description = "Ngày bắt đầu mong muốn")
        LocalDate preferredDateFrom,

        @Schema(description = "Ngày kết thúc mong muốn")
        LocalDate preferredDateTo,

        @Schema(description = "Số lượng khách dự kiến")
        Integer guestCount,

        @Schema(description = "Ngân sách tối thiểu (VND)")
        BigDecimal budgetMin,

        @Schema(description = "Ngân sách tối đa (VND)")
        BigDecimal budgetMax,

        @Schema(description = "Yêu cầu đặc biệt")
        String specialRequirements,

        @Schema(description = "Trạng thái (OPEN, ACCEPTED, FULFILLED, CANCELLED, EXPIRED)")
        TourRequestStatus status,

        @Schema(description = "ID đối tác nhận yêu cầu")
        Long acceptedById,

        @Schema(description = "Tên đối tác nhận yêu cầu")
        String acceptedByName,

        @Schema(description = "Thời điểm đối tác nhận yêu cầu")
        Instant acceptedAt,

        @Schema(description = "ID tour đã được tạo theo yêu cầu")
        Long fulfilledTourId,

        @Schema(description = "Thời gian tạo")
        Instant createdAt,

        @Schema(description = "Thời gian cập nhật")
        Instant updatedAt
) {
    public static TourRequestResponse fromEntity(TourRequest tr) {
        if (tr == null) return null;

        return TourRequestResponse.builder()
                .id(tr.getId())
                .requesterId(tr.getRequester() != null ? tr.getRequester().getId() : null)
                .requesterName(tr.getRequester() != null ? tr.getRequester().getFullName() : null)
                .requesterEmail(tr.getRequester() != null ? tr.getRequester().getEmail() : null)
                .requesterAvatarUrl(tr.getRequester() != null ? tr.getRequester().getAvatarUrl() : null)
                .title(tr.getTitle())
                .description(tr.getDescription())
                .preferredDestination(tr.getPreferredDestination())
                .preferredDateFrom(tr.getPreferredDateFrom())
                .preferredDateTo(tr.getPreferredDateTo())
                .guestCount(tr.getGuestCount())
                .budgetMin(tr.getBudgetMin())
                .budgetMax(tr.getBudgetMax())
                .specialRequirements(tr.getSpecialRequirements())
                .status(tr.getStatus())
                .acceptedById(tr.getAcceptedBy() != null ? tr.getAcceptedBy().getId() : null)
                .acceptedByName(tr.getAcceptedBy() != null ? tr.getAcceptedBy().getFullName() : null)
                .acceptedAt(tr.getAcceptedAt())
                .fulfilledTourId(tr.getFulfilledTour() != null ? tr.getFulfilledTour().getTourId() : null)
                .createdAt(tr.getCreatedAt())
                .updatedAt(tr.getUpdatedAt())
                .build();
    }
}
