package com.journeygo.modules.moderation.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.content.dto.CulturalContentResponse;
import com.journeygo.modules.content.entity.CulturalContent;
import com.journeygo.modules.content.repository.CulturalContentRepository;
import com.journeygo.modules.moderation.dto.ContentReviewResponse;
import com.journeygo.modules.moderation.entity.ContentReview;
import com.journeygo.modules.moderation.entity.ContentReviewStatus;
import com.journeygo.modules.moderation.entity.ContentReviewAction;
import com.journeygo.modules.moderation.entity.ContentReviewHistory;
import com.journeygo.modules.moderation.repository.ContentReviewRepository;
import com.journeygo.modules.moderation.repository.ContentReviewHistoryRepository;
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

    @Transactional
    public ContentReviewResponse submit(Long contentId, Long callerId, Role role) {
        CulturalContent content = contentRepository.findByIdAndDeletedFalseAndDestinationDeletedFalse(contentId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTENT_NOT_FOUND));
        checkOwner(content, callerId, role);
        ContentReview review = reviewRepository.findByContent_Id(contentId).orElseGet(() ->
                ContentReview.builder().content(content).build());
        review.setStatus(ContentReviewStatus.PENDING);
        review.setReviewer(null);
        review.setReviewedAt(null);
        review.setDecisionNote(null);
        review.setSubmittedAt(Instant.now());
        ContentReview saved = reviewRepository.save(review);
        User actor = userRepository.findById(callerId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        historyRepository.save(ContentReviewHistory.builder().review(saved).action(ContentReviewAction.SUBMITTED).actor(actor).build());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<ContentReviewResponse> getQueue(Pageable pageable) {
        return reviewRepository.findByStatusAndContent_DeletedFalseAndContent_Destination_DeletedFalse(ContentReviewStatus.PENDING, pageable)
                .map(this::toResponse);
    }

    @Transactional
    public ContentReviewResponse approve(Long contentId, Long reviewerId, String note) {
        return decide(contentId, reviewerId, ContentReviewStatus.APPROVED, note);
    }

    @Transactional
    public ContentReviewResponse reject(Long contentId, Long reviewerId, String note) {
        if (note == null || note.isBlank()) throw new AppException(ErrorCode.CONTENT_REVIEW_REASON_REQUIRED);
        return decide(contentId, reviewerId, ContentReviewStatus.REJECTED, note.trim());
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

    private ContentReviewResponse decide(Long contentId, Long reviewerId, ContentReviewStatus status, String note) {
        ContentReview review = reviewRepository.findByContent_Id(contentId)
                .orElseThrow(() -> new AppException(ErrorCode.CONTENT_NOT_FOUND));
        if (review.getStatus() != ContentReviewStatus.PENDING)
            throw new AppException(ErrorCode.INVALID_CONTENT_REVIEW_STATUS, "Nội dung không còn trong hàng chờ kiểm duyệt");
        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        review.setStatus(status);
        review.setReviewer(reviewer);
        review.setDecisionNote(note);
        review.setReviewedAt(Instant.now());
        ContentReview saved = reviewRepository.save(review);
        historyRepository.save(ContentReviewHistory.builder().review(saved)
                .action(status == ContentReviewStatus.APPROVED ? ContentReviewAction.APPROVED : ContentReviewAction.REJECTED)
                .actor(reviewer).note(note).build());
        return toResponse(saved);
    }

    private ContentReviewResponse toResponse(ContentReview review) {
        var history = historyRepository.findByReview_IdOrderByCreatedAtAsc(review.getId()).stream()
                .map(item -> new ContentReviewResponse.HistoryItem(item.getAction().name(),
                        item.getActor() == null ? null : item.getActor().getId(),
                        item.getActor() == null ? null : item.getActor().getFullName(),
                        item.getNote(), item.getCreatedAt())).toList();
        return new ContentReviewResponse(review.getId(), review.getContent().getId(),
                review.getContent().getDestination().getId(), review.getContent().getDestination().getName(),
                review.getContent().getTitle(), review.getStatus(),
                review.getReviewer() == null ? null : review.getReviewer().getId(),
                review.getReviewer() == null ? null : review.getReviewer().getFullName(),
                review.getDecisionNote(), review.getSubmittedAt(), review.getReviewedAt(),
                CulturalContentResponse.fromEntity(review.getContent()), history);
    }

    private void checkOwner(CulturalContent content, Long callerId, Role role) {
        if (role != null && role.isProvider()) {
            Long ownerId = content.getDestination().getCreatedBy() == null ? null : content.getDestination().getCreatedBy().getId();
            if (ownerId == null || !ownerId.equals(callerId)) throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }
}
