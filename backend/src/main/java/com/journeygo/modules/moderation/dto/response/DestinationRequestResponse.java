package com.journeygo.modules.moderation.dto.response;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.journeygo.modules.moderation.entity.PartnerDestinationRequest;
import com.journeygo.modules.moderation.entity.enums.DestinationRequestStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

@Schema(description = "Phản hồi chi tiết về yêu cầu đề xuất điểm đến của đối tác")
@Builder
public record DestinationRequestResponse(
        Long id,

        // Thông tin Partner
        Long partnerId,
        String partnerName,
        String partnerEmail,

        // Thông tin đề xuất
        String destinationName,
        String location,
        String address,
        String description,
        List<String> images,
        String supportingDocuments,
        String contactName,
        String contactPhone,
        String contactEmail,
        String contactInfo,
        String note,

        // Trạng thái hiện tại
        DestinationRequestStatus status,

        // Lần 1: Moderator kiểm tra tính hợp lệ & phù hợp
        Long moderatorId,
        String moderatorName,
        String initialReviewNote,
        String rejectionReason,
        String rejectionNote,
        Instant initialReviewedAt,

        // Admin phân công CP
        Long assignedById,
        String assignedByName,
        Long assignedCpId,
        String assignedCpName,
        Instant assignedAt,
        String assignmentNote,

        // Destination được tạo/liên kết
        Long destinationId,
        String linkedDestinationName,
        Instant contentSubmittedAt,

        // Lần 2: Moderator kiểm duyệt nội dung hoàn chỉnh
        Long contentModeratorId,
        String contentModeratorName,
        String contentReviewNote,
        String contentRejectionReason,
        Instant contentReviewedAt,

        // Hoàn tất / Hủy
        Instant completedAt,
        Instant cancelledAt,
        String cancellationReason,

        Instant createdAt,
        Instant updatedAt,

        List<DestinationRequestHistoryResponse> histories
) {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public static DestinationRequestResponse fromEntity(PartnerDestinationRequest entity) {
        if (entity == null) return null;

        var partner = entity.getPartner();
        var moderator = entity.getModerator();
        var assignedBy = entity.getAssignedBy();
        var assignedCp = entity.getAssignedCp();
        var destination = entity.getDestination();
        var contentModerator = entity.getContentModerator();

        List<String> imageList = Collections.emptyList();
        if (entity.getImages() != null && !entity.getImages().isBlank()) {
            try {
                if (entity.getImages().startsWith("[")) {
                    imageList = OBJECT_MAPPER.readValue(entity.getImages(), new TypeReference<List<String>>() {});
                } else {
                    imageList = List.of(entity.getImages().split(","));
                }
            } catch (Exception e) {
                imageList = List.of(entity.getImages());
            }
        }

        List<DestinationRequestHistoryResponse> historyResponses = null;
        if (entity.getHistories() != null) {
            historyResponses = entity.getHistories().stream()
                    .map(DestinationRequestHistoryResponse::fromEntity)
                    .toList();
        }

        return DestinationRequestResponse.builder()
                .id(entity.getId())
                .partnerId(partner != null ? partner.getId() : null)
                .partnerName(partner != null ? partner.getFullName() : null)
                .partnerEmail(partner != null ? partner.getEmail() : null)
                .destinationName(entity.getDestinationName())
                .location(entity.getLocation())
                .address(entity.getAddress())
                .description(entity.getDescription())
                .images(imageList)
                .supportingDocuments(entity.getSupportingDocuments())
                .contactName(entity.getContactName())
                .contactPhone(entity.getContactPhone())
                .contactEmail(entity.getContactEmail())
                .contactInfo(entity.getContactInfo())
                .note(entity.getNote())
                .status(entity.getStatus())
                .moderatorId(moderator != null ? moderator.getId() : null)
                .moderatorName(moderator != null ? moderator.getFullName() : null)
                .initialReviewNote(entity.getInitialReviewNote())
                .rejectionReason(entity.getRejectionReason())
                .rejectionNote(entity.getRejectionNote())
                .initialReviewedAt(entity.getInitialReviewedAt())
                .assignedById(assignedBy != null ? assignedBy.getId() : null)
                .assignedByName(assignedBy != null ? assignedBy.getFullName() : null)
                .assignedCpId(assignedCp != null ? assignedCp.getId() : null)
                .assignedCpName(assignedCp != null ? assignedCp.getFullName() : null)
                .assignedAt(entity.getAssignedAt())
                .assignmentNote(entity.getAssignmentNote())
                .destinationId(destination != null ? destination.getId() : null)
                .linkedDestinationName(destination != null ? destination.getName() : null)
                .contentSubmittedAt(entity.getContentSubmittedAt())
                .contentModeratorId(contentModerator != null ? contentModerator.getId() : null)
                .contentModeratorName(contentModerator != null ? contentModerator.getFullName() : null)
                .contentReviewNote(entity.getContentReviewNote())
                .contentRejectionReason(entity.getContentRejectionReason())
                .contentReviewedAt(entity.getContentReviewedAt())
                .completedAt(entity.getCompletedAt())
                .cancelledAt(entity.getCancelledAt())
                .cancellationReason(entity.getCancellationReason())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .histories(historyResponses)
                .build();
    }
}
