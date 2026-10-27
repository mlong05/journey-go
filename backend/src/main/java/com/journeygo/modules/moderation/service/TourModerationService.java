package com.journeygo.modules.moderation.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.moderation.dto.TourReviewResponse;
import com.journeygo.modules.moderation.entity.TourReview;
import com.journeygo.modules.moderation.entity.TourReviewHistory;
import com.journeygo.modules.moderation.entity.enums.TourRejectionReason;
import com.journeygo.modules.moderation.entity.enums.TourReviewAction;
import com.journeygo.modules.moderation.entity.enums.TourReviewStatus;
import com.journeygo.modules.moderation.repository.TourReviewHistoryRepository;
import com.journeygo.modules.moderation.repository.TourReviewRepository;
import com.journeygo.modules.tour.dto.TourResponse;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.repository.TourRepository;
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
public class TourModerationService {
    private final TourRepository tourRepository;
    private final TourReviewRepository reviewRepository;
    private final TourReviewHistoryRepository historyRepository;
    private final UserRepository userRepository;

    @Transactional
    public TourReviewResponse submit(Long tourId, Long actorId, Role role) {
        return submit(tourId, actorId, role, false);
    }

    @Transactional
    public TourReviewResponse submitAfterEdit(Long tourId, Long actorId, Role role) {
        return submit(tourId, actorId, role, true);
    }

    private TourReviewResponse submit(Long tourId, Long actorId, Role role, boolean edited) {
        Tour tour = findTourOrThrow(tourId);
        checkOwnership(tour, actorId, role);
        TourReview review = reviewRepository.findByTour_TourId(tourId).orElse(null);
        if (review != null && !edited && review.getStatus() != TourReviewStatus.REJECTED)
            throw new AppException(ErrorCode.INVALID_TOUR_STATUS, "Chỉ có thể gửi mới hoặc gửi lại tour đã bị từ chối");
        if (review != null && edited && review.getStatus() == TourReviewStatus.PENDING)
            throw new AppException(ErrorCode.INVALID_TOUR_STATUS, "Tour đang chờ kiểm duyệt, không thể chỉnh sửa");
        if (review == null) review = TourReview.builder().tour(tour).build();

        tour.setStatus(TourStatus.PENDING);
        tour.setApproved(false);
        tour.setRejectionReason(null);
        review.setStatus(TourReviewStatus.PENDING);
        review.setReviewer(null);
        review.setReviewedAt(null);
        review.setDecisionNote(null);
        review.setReason(null);
        review.setOtherReason(null);
        review.setSubmittedAt(Instant.now());
        TourReview saved = reviewRepository.save(review);
        tourRepository.save(tour);
        addHistory(saved, TourReviewAction.SUBMITTED, actorId, null, null, null);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<TourReviewResponse> getQueue(Pageable pageable) {
        return PageResponse.from(reviewRepository.findByStatusAndTour_DeletedFalse(TourReviewStatus.PENDING, pageable), this::toResponse);
    }

    @Transactional(readOnly = true)
    public PageResponse<TourReviewResponse> getByStatus(TourReviewStatus status, Pageable pageable) {
        return PageResponse.from(reviewRepository.findByStatusAndTour_DeletedFalse(status, pageable), this::toResponse);
    }

    @Transactional(readOnly = true)
    public TourReviewResponse getHistory(Long tourId, Long actorId, Role role) {
        TourReview review = findReviewOrThrow(tourId);
        checkOwnership(review.getTour(), actorId, role);
        return toResponse(review);
    }

    @Transactional
    public TourReviewResponse approve(Long tourId, Long reviewerId, String note) {
        TourReview review = findReviewOrThrow(tourId);
        requirePending(review);
        Tour tour = review.getTour();
        tour.setStatus(TourStatus.PUBLISHED);
        tour.setApproved(true);
        tour.setRejectionReason(null);
        review.setStatus(TourReviewStatus.APPROVED);
        review.setReviewer(findUserOrThrow(reviewerId));
        review.setDecisionNote(note == null ? null : note.trim());
        review.setReason(null);
        review.setOtherReason(null);
        review.setReviewedAt(Instant.now());
        reviewRepository.save(review);
        tourRepository.save(tour);
        addHistory(review, TourReviewAction.APPROVED, reviewerId, review.getDecisionNote(), null, null);
        return toResponse(review);
    }

    @Transactional
    public TourReviewResponse reject(Long tourId, Long reviewerId, String note, String reason, String otherReason) {
        String normalizedReason = normalizeReason(reason);
        if (normalizedReason == null) throw new AppException(ErrorCode.TOUR_REJECTION_REASON_REQUIRED);
        boolean hasOther = java.util.Arrays.asList(normalizedReason.split(",")).contains(TourRejectionReason.OTHER.name());
        if (hasOther && (otherReason == null || otherReason.isBlank()))
            throw new AppException(ErrorCode.TOUR_REJECTION_REASON_REQUIRED, "Vui lòng nhập nội dung cho lý do OTHER");
        if (!hasOther && otherReason != null && !otherReason.isBlank())
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Chỉ gửi otherReason khi đã chọn lý do OTHER");

        TourReview review = findReviewOrThrow(tourId);
        requirePending(review);
        Tour tour = review.getTour();
        tour.setStatus(TourStatus.REJECTED);
        tour.setApproved(false);
        tour.setRejectionReason(normalizedReason);
        review.setStatus(TourReviewStatus.REJECTED);
        review.setReviewer(findUserOrThrow(reviewerId));
        review.setDecisionNote(note == null ? null : note.trim());
        review.setReason(normalizedReason);
        review.setOtherReason(hasOther ? otherReason.trim() : null);
        review.setReviewedAt(Instant.now());
        reviewRepository.save(review);
        tourRepository.save(tour);
        addHistory(review, TourReviewAction.REJECTED, reviewerId, review.getDecisionNote(), review.getReason(), review.getOtherReason());
        return toResponse(review);
    }

    @Transactional
    public void assertCanEdit(Long tourId, Long actorId, Role role) {
        Tour tour = findTourOrThrow(tourId);
        checkOwnership(tour, actorId, role);
        TourReview review = reviewRepository.findByTour_TourId(tourId).orElse(null);
        if (review != null && review.getStatus() == TourReviewStatus.PENDING)
            throw new AppException(ErrorCode.INVALID_TOUR_STATUS, "Tour đang chờ kiểm duyệt, không thể chỉnh sửa");
    }

    @Transactional(readOnly = true)
    public void requireApproved(Long tourId) {
        Tour tour = findTourOrThrow(tourId);
        TourReviewStatus reviewStatus = reviewRepository.findByTour_TourId(tourId)
                .map(TourReview::getStatus).orElse(null);
        if (!tour.isApproved() || (reviewStatus != null && reviewStatus != TourReviewStatus.APPROVED))
            throw new AppException(ErrorCode.TOUR_NOT_FOUND);
    }

    @Transactional
    public void resetAfterRestore(Long tourId) {
        Tour tour = findTourOrThrow(tourId);
        tour.setStatus(TourStatus.DRAFT);
        tour.setApproved(false);
        tour.setRejectionReason(null);
        TourReview review = reviewRepository.findByTour_TourId(tourId).orElse(null);
        if (review != null) {
            review.setStatus(TourReviewStatus.DRAFT);
            review.setReviewer(null);
            review.setReviewedAt(null);
            review.setDecisionNote(null);
            review.setReason(null);
            review.setOtherReason(null);
            reviewRepository.save(review);
        }
        tourRepository.save(tour);
    }

    private Tour findTourOrThrow(Long id) {
        return tourRepository.findByTourId(id).orElseThrow(() -> new AppException(ErrorCode.TOUR_NOT_FOUND));
    }

    private TourReview findReviewOrThrow(Long id) {
        return reviewRepository.findByTour_TourId(id).orElseThrow(() -> new AppException(ErrorCode.TOUR_NOT_FOUND, "Không tìm thấy lịch sử kiểm duyệt tour"));
    }

    private void requirePending(TourReview review) {
        if (review.getStatus() != TourReviewStatus.PENDING)
            throw new AppException(ErrorCode.INVALID_TOUR_STATUS, "Tour không còn trong hàng chờ kiểm duyệt");
    }

    private User findUserOrThrow(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private void addHistory(TourReview review, TourReviewAction action, Long actorId, String note, String reason, String otherReason) {
        historyRepository.save(TourReviewHistory.builder().review(review).action(action).actor(findUserOrThrow(actorId))
                .note(note).reason(reason).otherReason(otherReason).build());
    }

    private TourReviewResponse toResponse(TourReview review) {
        var history = historyRepository.findByReview_IdOrderByCreatedAtAsc(review.getId()).stream()
                .map(item -> new TourReviewResponse.HistoryItem(item.getAction().name(),
                        item.getActor() == null ? null : item.getActor().getId(),
                        item.getActor() == null ? null : item.getActor().getFullName(), item.getNote(),
                        item.getReason(), item.getOtherReason(), item.getCreatedAt())).toList();
        Tour tour = review.getTour();
        return new TourReviewResponse(review.getId(), tour.getTourId(), tour.getTitle(), review.getStatus(),
                review.getReviewer() == null ? null : review.getReviewer().getId(),
                review.getReviewer() == null ? null : review.getReviewer().getFullName(), review.getDecisionNote(),
                review.getReason(), review.getOtherReason(), review.getSubmittedAt(), review.getReviewedAt(),
                TourResponse.fromEntity(tour), history);
    }

    private String normalizeReason(String reason) {
        if (reason == null || reason.isBlank()) return null;
        java.util.LinkedHashSet<TourRejectionReason> selected = new java.util.LinkedHashSet<>();
        try {
            for (String value : reason.split(",")) {
                String code = value.trim();
                if (!code.isEmpty()) selected.add(TourRejectionReason.valueOf(code));
            }
        } catch (IllegalArgumentException exception) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "reason chỉ được chứa mã hợp lệ; xem GET /api/v1/moderation/tours/rejection-reasons");
        }
        return selected.isEmpty() ? null : selected.stream().map(Enum::name)
                .collect(java.util.stream.Collectors.joining(","));
    }

    private void checkOwnership(Tour tour, Long actorId, Role role) {
        if (role != null && role.isProvider()) {
            Long ownerId = tour.getCreatedBy() == null ? null : tour.getCreatedBy().getId();
            if (ownerId == null || !ownerId.equals(actorId)) throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }
}
