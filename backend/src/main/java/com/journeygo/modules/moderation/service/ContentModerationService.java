package com.journeygo.modules.moderation.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.content.dto.CulturalContentResponse;
import com.journeygo.modules.content.entity.CulturalContent;
import com.journeygo.modules.content.repository.CulturalContentRepository;
import com.journeygo.modules.moderation.dto.ContentReviewResponse;
import com.journeygo.modules.moderation.entity.ContentReview;
import com.journeygo.modules.moderation.entity.enums.ContentReviewStatus;
import com.journeygo.modules.moderation.entity.enums.ContentReviewAction;
import com.journeygo.modules.moderation.entity.ContentReviewHistory;
import com.journeygo.modules.moderation.entity.enums.ContentRejectionReason;
import com.journeygo.modules.moderation.repository.ContentReviewRepository;
import com.journeygo.modules.moderation.repository.ContentReviewHistoryRepository;
import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.service.NotificationPublisher;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ContentModerationService {
    private final ContentReviewRepository reviewRepository;
    private final ContentReviewHistoryRepository historyRepository;
    private final CulturalContentRepository contentRepository;
    private final UserRepository userRepository;
    private final NotificationPublisher notifications;

    @Transactional
    public ContentReviewResponse submit(Long contentId, Long callerId, Role role) {
        return submit(contentId, callerId, role, false);
    }

    /** Re-submit after an edit; editing content also returns an approved item to moderation. */
    @Transactional
    public ContentReviewResponse submitAfterEdit(Long contentId, Long callerId, Role role) {
        return submit(contentId, callerId, role, true);
    }

    private ContentReviewResponse submit(Long contentId, Long callerId, Role role, boolean contentWasEdited) {
        CulturalContent content = contentRepository.findByIdAndDeletedFalseAndDestinationDeletedFalse(contentId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTENT_NOT_FOUND));
        checkOwner(content, callerId, role);
        ContentReview review = reviewRepository.findByContent_Id(contentId).orElse(null);
        if (review != null && !contentWasEdited && review.getStatus() != ContentReviewStatus.REJECTED) {
            throw new AppException(ErrorCode.INVALID_CONTENT_REVIEW_STATUS,
                    "Chỉ có thể gửi mới hoặc gửi lại nội dung đã bị từ chối");
        }
        if (review != null && contentWasEdited && review.getStatus() == ContentReviewStatus.PENDING) {
            throw new AppException(ErrorCode.INVALID_CONTENT_REVIEW_STATUS,
                    "Nội dung đang chờ kiểm duyệt, không thể chỉnh sửa");
        }
        if (review == null) review = ContentReview.builder().content(content).build();
        review.setStatus(ContentReviewStatus.PENDING);
        review.setReviewer(null);
        review.setReviewedAt(null);
        review.setDecisionNote(null);
        review.setReason(null);
        review.setOtherReason(null);
        review.setSubmittedAt(Instant.now());
        ContentReview saved = reviewRepository.save(review);
        User actor = userRepository.findById(callerId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        historyRepository.save(ContentReviewHistory.builder().review(saved).action(ContentReviewAction.SUBMITTED).actor(actor).build());

        var destination = content.getDestination();
        notifications.send(NotificationType.CONTENT_PENDING)
                .toRole(Role.CONTENT_MODERATOR)
                .except(callerId)
                .title(contentWasEdited ? "Nội dung văn hóa được cập nhật" : "Nội dung văn hóa mới chờ duyệt")
                .body(NotificationPublisher.quote(content.getTitle()) + " thuộc điểm đến "
                        + NotificationPublisher.quote(destination.getName()) + " đang chờ bạn thẩm định.")
                .link("/moderator/destinations/" + destination.getId())
                .ref("CONTENT", contentId)
                .queue(NotificationPublisher.Queue.CONTENT_REVIEW)
                .publish();
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ContentReviewResponse getHistory(Long contentId, Long callerId, Role callerRole) {
        ContentReview review = reviewRepository.findByContent_Id(contentId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTENT_NOT_FOUND));
        checkOwner(review.getContent(), callerId, callerRole);
        return toResponse(review);
    }

    @Transactional(readOnly = true)
    public Page<ContentReviewResponse> getQueue(Pageable pageable) {
        return reviewRepository.findByStatusAndContent_DeletedFalseAndContent_Destination_DeletedFalse(ContentReviewStatus.PENDING, pageable)
                .map(this::toResponse);
    }

    @Transactional
    public ContentReviewResponse approve(Long contentId, Long reviewerId, String note) {
        return decide(contentId, reviewerId, ContentReviewStatus.APPROVED, note, null, null);
    }

    @Transactional
    public ContentReviewResponse reject(Long contentId, Long reviewerId, String note, String reason, String otherReason) {
        String normalizedReason = normalizeReason(reason);
        if (normalizedReason == null) throw new AppException(ErrorCode.CONTENT_REVIEW_REASON_REQUIRED);
        boolean hasOther = java.util.Arrays.asList(normalizedReason.split(",")).contains(ContentRejectionReason.OTHER.name());
        String normalizedOtherReason = otherReason == null ? null : otherReason.trim();
        if (hasOther && (normalizedOtherReason == null || normalizedOtherReason.isBlank())) {
            throw new AppException(ErrorCode.CONTENT_REVIEW_REASON_REQUIRED, "Vui lòng nhập nội dung cho lý do OTHER");
        }
        if (!hasOther && normalizedOtherReason != null && !normalizedOtherReason.isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Chỉ gửi otherReason khi đã chọn lý do OTHER");
        }
        return decide(contentId, reviewerId, ContentReviewStatus.REJECTED,
                note == null ? null : note.trim(), normalizedReason,
                hasOther ? normalizedOtherReason : null);
    }

    /** Trạng thái duyệt theo contentId; nội dung cũ chưa có bản ghi kiểm duyệt sẽ không có trong map. */
    @Transactional(readOnly = true)
    public java.util.Map<Long, ContentReviewStatus> getStatuses(java.util.Collection<Long> contentIds) {
        if (contentIds.isEmpty()) return java.util.Map.of();
        return reviewRepository.findByContent_IdIn(contentIds).stream()
                .collect(java.util.stream.Collectors.toMap(r -> r.getContent().getId(), ContentReview::getStatus));
    }

    @Transactional(readOnly = true)
    public List<CulturalContentResponse> getApprovedByDestination(Long destinationId) {
        return reviewRepository.findPublicContentByDestination(destinationId, ContentReviewStatus.APPROVED)
                .stream().map(CulturalContentResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public List<CulturalContentResponse> getAllApproved() {
        return reviewRepository.findAllPublicContent(ContentReviewStatus.APPROVED)
                .stream().map(CulturalContentResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public void requireApproved(Long contentId) {
        ContentReviewStatus status = reviewRepository.findByContent_Id(contentId).map(ContentReview::getStatus).orElse(null);
        // Existing content created before the moderation module has no review row and remains public.
        if (status != null && status != ContentReviewStatus.APPROVED)
            throw new AppException(ErrorCode.CONTENT_NOT_FOUND);
    }

    private ContentReviewResponse decide(Long contentId, Long reviewerId, ContentReviewStatus status,
                                         String note, String reason, String otherReason) {
        ContentReview review = reviewRepository.findByContent_Id(contentId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTENT_NOT_FOUND));
        if (review.getStatus() != ContentReviewStatus.PENDING)
            throw new AppException(ErrorCode.INVALID_CONTENT_REVIEW_STATUS, "Nội dung không còn trong hàng chờ kiểm duyệt");
        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        review.setStatus(status);
        review.setReviewer(reviewer);
        review.setDecisionNote(note);
        review.setReason(status == ContentReviewStatus.APPROVED ? null : reason);
        review.setOtherReason(status == ContentReviewStatus.APPROVED ? null : otherReason);
        review.setReviewedAt(Instant.now());
        ContentReview saved = reviewRepository.save(review);
        historyRepository.save(ContentReviewHistory.builder().review(saved)
                .action(status == ContentReviewStatus.APPROVED ? ContentReviewAction.APPROVED : ContentReviewAction.REJECTED)
                .actor(reviewer).note(note).reason(review.getReason()).otherReason(review.getOtherReason()).build());

        boolean approved = status == ContentReviewStatus.APPROVED;
        var destination = review.getContent().getDestination();
        notifications.send(approved ? NotificationType.CONTENT_APPROVED : NotificationType.CONTENT_REJECTED)
                .to(NotificationPublisher.idOf(destination.getCreatedBy()))
                .except(reviewerId)
                .title(approved ? "Nội dung văn hóa đã được duyệt" : "Nội dung văn hóa cần chỉnh sửa")
                .body(NotificationPublisher.withNote(NotificationPublisher.quote(review.getContent().getTitle())
                        + (approved ? " đã hiển thị cho du khách tại " : " chưa được duyệt tại ")
                        + NotificationPublisher.quote(destination.getName()) + ".", note))
                .link(NotificationPublisher.dashboardPath(destination.getCreatedBy(), "/destinations"))
                .ref("CONTENT", contentId)
                .queue(NotificationPublisher.Queue.MY_CONTENT)
                .publish();
        notifications.queueChanged(Role.CONTENT_MODERATOR, NotificationPublisher.Queue.CONTENT_REVIEW);
        return toResponse(saved);
    }

    private ContentReviewResponse toResponse(ContentReview review) {
        var history = historyRepository.findByReview_IdOrderByCreatedAtAsc(review.getId()).stream()
                .map(item -> new ContentReviewResponse.HistoryItem(item.getAction().name(),
                        item.getActor() == null ? null : item.getActor().getId(),
                        item.getActor() == null ? null : item.getActor().getFullName(),
                        item.getNote(), item.getReason(), item.getOtherReason(), item.getCreatedAt())).toList();
        return new ContentReviewResponse(review.getId(), review.getContent().getId(),
                review.getContent().getDestination().getId(), review.getContent().getDestination().getName(),
                review.getContent().getTitle(), review.getStatus(),
                review.getReviewer() == null ? null : review.getReviewer().getId(),
                review.getReviewer() == null ? null : review.getReviewer().getFullName(),
                review.getDecisionNote(), review.getReason(), review.getOtherReason(),
                review.getSubmittedAt(), review.getReviewedAt(),
                CulturalContentResponse.fromEntity(review.getContent()), history);
    }

    private String normalizeReason(String reason) {
        if (reason == null || reason.isBlank()) return null;
        java.util.LinkedHashSet<ContentRejectionReason> selected = new java.util.LinkedHashSet<>();
        try {
            for (String value : reason.split(",")) {
                String code = value.trim();
                if (!code.isEmpty()) selected.add(ContentRejectionReason.valueOf(code));
            }
        } catch (IllegalArgumentException exception) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "reason chỉ được chứa mã hợp lệ; xem GET /api/v1/moderation/contents/rejection-reasons");
        }
        return selected.isEmpty() ? null : selected.stream().map(Enum::name)
                .collect(java.util.stream.Collectors.joining(","));
    }

    private void checkOwner(CulturalContent content, Long callerId, Role role) {
        if (role != null && role.isContentProvider()) {
            Long ownerId = content.getDestination().getCreatedBy() == null ? null : content.getDestination().getCreatedBy().getId();
            if (ownerId == null || !ownerId.equals(callerId)) throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }
}
