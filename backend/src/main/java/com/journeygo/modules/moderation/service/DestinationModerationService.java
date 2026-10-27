package com.journeygo.modules.moderation.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.destination.dto.DestinationResponse;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.entity.enums.DestinationStatus;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.moderation.dto.DestinationReviewResponse;
import com.journeygo.modules.moderation.entity.enums.DestinationReviewAction;
import com.journeygo.modules.moderation.entity.enums.DestinationReviewStatus;
import com.journeygo.modules.moderation.entity.enums.DestinationRejectionReason;
import com.journeygo.modules.moderation.entity.DestinationReview;
import com.journeygo.modules.moderation.entity.DestinationReviewHistory;
import com.journeygo.modules.moderation.repository.DestinationReviewHistoryRepository;
import com.journeygo.modules.moderation.repository.DestinationReviewRepository;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class DestinationModerationService {
    private final DestinationRepository destinationRepository;
    private final DestinationReviewRepository reviewRepository;
    private final DestinationReviewHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final ExperienceRepository experienceRepository;

    @Transactional
    public DestinationReviewResponse submit(Long id, Long callerId, Role callerRole) {
        return submit(id, callerId, callerRole, false);
    }

    @Transactional
    public DestinationReviewResponse submitAfterEdit(Long id, Long callerId, Role callerRole) {
        return submit(id, callerId, callerRole, true);
    }

    private DestinationReviewResponse submit(Long id, Long callerId, Role callerRole, boolean edited) {
        Destination destination = findOrThrow(id);
        checkOwnership(destination, callerId, callerRole);
        DestinationReview review = reviewRepository.findByDestination_Id(id).orElse(null);
        if (review != null && !edited && review.getStatus() != DestinationReviewStatus.REJECTED)
            throw new AppException(ErrorCode.INVALID_CONTENT_REVIEW_STATUS, "Chỉ có thể gửi mới hoặc gửi lại điểm đến đã bị từ chối");
        if (review != null && edited && review.getStatus() == DestinationReviewStatus.PENDING)
            throw new AppException(ErrorCode.INVALID_CONTENT_REVIEW_STATUS, "Điểm đến đang chờ kiểm duyệt, không thể chỉnh sửa");
        if (review == null) review = DestinationReview.builder().destination(destination).build();
        destination.setStatus(DestinationStatus.PENDING);
        destination.setApproved(false);
        if (edited) updateExperienceStatuses(id, ExperienceStatus.DRAFT);
        review.setStatus(DestinationReviewStatus.PENDING);
        review.setReviewer(null);
        review.setReviewedAt(null);
        review.setDecisionNote(null);
        review.setReason(null);
        review.setOtherReason(null);
        review.setSubmittedAt(Instant.now());
        DestinationReview saved = reviewRepository.save(review);
        addHistory(saved, DestinationReviewAction.SUBMITTED, callerId, null, null, null);
        destinationRepository.save(destination);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<DestinationReviewResponse> getQueue(Pageable pageable) {
        return PageResponse.from(reviewRepository.findByStatusAndDestination_DeletedFalse(DestinationReviewStatus.PENDING, pageable), this::toResponse);
    }

    @Transactional(readOnly = true)
    public PageResponse<DestinationReviewResponse> getByStatus(DestinationReviewStatus status, Pageable pageable) {
        return PageResponse.from(reviewRepository.findByStatusAndDestination_DeletedFalse(status, pageable), this::toResponse);
    }

    @Transactional(readOnly = true)
    public PageResponse<DestinationResponse> getApproved(Pageable pageable) {
        return PageResponse.from(destinationRepository.findByApprovedTrueAndDeletedFalse(pageable), DestinationResponse::fromEntity);
    }

    @Transactional
    public DestinationReviewResponse approve(Long id, Long reviewerId, String note) {
        DestinationReview review = findReviewOrThrow(id);
        requirePending(review);
        Destination destination = review.getDestination();
        destination.setStatus(DestinationStatus.PUBLISHED);
        destination.setApproved(true);
        updateExperienceStatuses(id, ExperienceStatus.PUBLISHED);
        review.setStatus(DestinationReviewStatus.APPROVED);
        review.setReviewer(findUserOrThrow(reviewerId));
        review.setDecisionNote(note);
        review.setReason(null);
        review.setOtherReason(null);
        review.setReviewedAt(Instant.now());
        reviewRepository.save(review);
        destinationRepository.save(destination);
        addHistory(review, DestinationReviewAction.APPROVED, reviewerId, note, null, null);
        log.info("Approved destination id={}", id);
        return toResponse(review);
    }

    @Transactional
    public DestinationReviewResponse reject(Long id, Long reviewerId, String note, String reason, String otherReason) {
        String normalizedReason = normalizeReason(reason);
        if (normalizedReason == null) throw new AppException(ErrorCode.CONTENT_REVIEW_REASON_REQUIRED);
        boolean hasOther = java.util.Arrays.asList(normalizedReason.split(",")).contains(DestinationRejectionReason.OTHER.name());
        if (hasOther && (otherReason == null || otherReason.isBlank()))
            throw new AppException(ErrorCode.CONTENT_REVIEW_REASON_REQUIRED, "Vui lòng nhập nội dung cho lý do OTHER");
        if (!hasOther && otherReason != null && !otherReason.isBlank())
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Chỉ gửi otherReason khi đã chọn lý do OTHER");
        DestinationReview review = findReviewOrThrow(id);
        requirePending(review);
        Destination destination = review.getDestination();
        destination.setStatus(DestinationStatus.REJECTED);
        destination.setApproved(false);
        updateExperienceStatuses(id, ExperienceStatus.DRAFT);
        review.setStatus(DestinationReviewStatus.REJECTED);
        review.setReviewer(findUserOrThrow(reviewerId));
        review.setDecisionNote(note == null ? null : note.trim());
        review.setReason(normalizedReason);
        review.setOtherReason(hasOther ? otherReason.trim() : null);
        review.setReviewedAt(Instant.now());
        reviewRepository.save(review);
        destinationRepository.save(destination);
        addHistory(review, DestinationReviewAction.REJECTED, reviewerId, review.getDecisionNote(), review.getReason(), review.getOtherReason());
        log.info("Rejected destination id={}", id);
        return toResponse(review);
    }

    @Transactional
    public void assertCanEdit(Long id, Long callerId, Role role) {
        Destination destination = findOrThrow(id);
        checkOwnership(destination, callerId, role);
        DestinationReview review = reviewRepository.findByDestination_Id(id).orElse(null);
        if (review != null && review.getStatus() == DestinationReviewStatus.PENDING)
            throw new AppException(ErrorCode.INVALID_CONTENT_REVIEW_STATUS, "Điểm đến đang chờ kiểm duyệt, không thể chỉnh sửa");
    }

    @Transactional(readOnly = true)
    public DestinationReviewResponse getHistory(Long id, Long callerId, Role callerRole) {
        DestinationReview review = findReviewOrThrow(id);
        checkOwnership(review.getDestination(), callerId, callerRole);
        return toResponse(review);
    }

    @Transactional
    public void resetAfterRestore(Long id) {
        Destination destination = findOrThrow(id);
        destination.setApproved(false);
        destination.setStatus(DestinationStatus.DRAFT);
        DestinationReview review = reviewRepository.findByDestination_Id(id).orElse(null);
        if (review != null) {
            review.setStatus(DestinationReviewStatus.DRAFT);
            review.setReviewer(null);
            review.setReviewedAt(null);
            review.setDecisionNote(null);
            review.setReason(null);
            review.setOtherReason(null);
            reviewRepository.save(review);
        }
        destinationRepository.save(destination);
    }

    private Destination findOrThrow(Long id) {
        return destinationRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.DESTINATION_NOT_FOUND));
    }

    private DestinationReview findReviewOrThrow(Long id) {
        return reviewRepository.findByDestination_Id(id)
                .orElseThrow(() -> new AppException(ErrorCode.DESTINATION_NOT_FOUND, "Không tìm thấy lịch sử kiểm duyệt điểm đến"));
    }

    private void requirePending(DestinationReview review) {
        if (review.getStatus() != DestinationReviewStatus.PENDING)
            throw new AppException(ErrorCode.INVALID_CONTENT_REVIEW_STATUS, "Điểm đến không còn trong hàng chờ kiểm duyệt");
    }

    private String normalizeReason(String reason) {
        if (reason == null || reason.isBlank()) return null;
        java.util.LinkedHashSet<DestinationRejectionReason> selected = new java.util.LinkedHashSet<>();
        try {
            for (String value : reason.split(",")) {
                String code = value.trim();
                if (!code.isEmpty()) selected.add(DestinationRejectionReason.valueOf(code));
            }
        } catch (IllegalArgumentException exception) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "reason chỉ được chứa mã hợp lệ; xem GET /api/v1/moderation/destinations/rejection-reasons");
        }
        return selected.isEmpty() ? null : selected.stream().map(Enum::name)
                .collect(java.util.stream.Collectors.joining(","));
    }

    private User findUserOrThrow(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private void updateExperienceStatuses(Long destinationId, ExperienceStatus status) {
        for (Experience experience : experienceRepository.findByDestination_Id(destinationId)) {
            if (experience.getStatus() != ExperienceStatus.INACTIVE) {
                experience.setStatus(status);
                experienceRepository.save(experience);
            }
        }
    }

    private void addHistory(DestinationReview review, DestinationReviewAction action, Long actorId,
                            String note, String reason, String otherReason) {
        historyRepository.save(DestinationReviewHistory.builder().review(review).action(action)
                .actor(findUserOrThrow(actorId)).note(note).reason(reason).otherReason(otherReason).build());
    }

    private DestinationReviewResponse toResponse(DestinationReview review) {
        var history = historyRepository.findByReview_IdOrderByCreatedAtAsc(review.getId()).stream()
                .map(item -> new DestinationReviewResponse.HistoryItem(item.getAction().name(),
                        item.getActor() == null ? null : item.getActor().getId(),
                        item.getActor() == null ? null : item.getActor().getFullName(), item.getNote(),
                        item.getReason(), item.getOtherReason(), item.getCreatedAt())).toList();
        Destination destination = review.getDestination();
        return new DestinationReviewResponse(review.getId(), destination.getId(), destination.getName(),
                review.getStatus(), review.getReviewer() == null ? null : review.getReviewer().getId(),
                review.getReviewer() == null ? null : review.getReviewer().getFullName(), review.getDecisionNote(),
                review.getReason(), review.getOtherReason(), review.getSubmittedAt(), review.getReviewedAt(),
                DestinationResponse.fromEntity(destination), history);
    }

    private void checkOwnership(Destination destination, Long callerId, Role callerRole) {
        if (callerRole != null && callerRole.isProvider()) {
            Long ownerId = destination.getCreatedBy() == null ? null : destination.getCreatedBy().getId();
            if (ownerId == null || !ownerId.equals(callerId)) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
        }
    }
}
