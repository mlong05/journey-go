package com.journeygo.modules.moderation.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.moderation.dto.TourReviewDecisionRequest;
import com.journeygo.modules.moderation.dto.TourReviewResponse;
import com.journeygo.modules.moderation.entity.TourReview;
import com.journeygo.modules.moderation.entity.TourReviewHistory;
import com.journeygo.modules.moderation.entity.TourReviewNote;
import com.journeygo.modules.moderation.entity.enums.TourRejectionReason;
import com.journeygo.modules.moderation.entity.enums.TourReviewAction;
import com.journeygo.modules.moderation.entity.enums.TourReviewStatus;
import com.journeygo.modules.moderation.repository.TourReviewHistoryRepository;
import com.journeygo.modules.moderation.repository.TourReviewRepository;
import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.service.NotificationPublisher;
import com.journeygo.modules.reward.entity.RewardSettingCode;
import com.journeygo.modules.reward.service.RewardSettingService;
import com.journeygo.modules.tour.dto.wizard.TourDetailResponse;
import com.journeygo.modules.tour.dto.wizard.TourValidationIssue;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourStop;
import com.journeygo.modules.tour.entity.TourStopExperience;
import com.journeygo.modules.tour.entity.TourStopQuestion;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.exception.TourValidationException;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.tour.service.TourDetailMapper;
import com.journeygo.modules.tour.service.TourPricingService;
import com.journeygo.modules.tour.service.TourSlotService;
import com.journeygo.modules.tour.service.TourSubmissionValidator;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Kiểm duyệt tour (BR-02: chỉ Moderator duyệt nội dung tour).
 *
 * <p>Mỗi lần gửi duyệt là một {@link TourReview} mới; lần mới nhất là lần hiện hành.
 * Hỗ trợ cả tour cũ (chọn điểm đến từ danh mục chung) lẫn tour tạo theo luồng 5 bước —
 * với tour 5 bước, việc duyệt đòi hỏi tick 5 tiêu chí, kiểm tra lại dữ liệu, chốt điểm thưởng
 * và sinh slot theo lịch khởi hành.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TourModerationService {
    private static final int CRITERIA_MIN_TO_APPROVE = 3;

    private final TourRepository tourRepository;
    private final TourReviewRepository reviewRepository;
    private final TourPricingService pricingService;
    private final TourReviewHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final NotificationPublisher notifications;
    private final TourSubmissionValidator validator;
    private final TourDetailMapper detailMapper;
    private final TourSlotService slotService;
    private final RewardSettingService rewardSettingService;
    private final TourModerationMailer mailer;

    // ── Gửi duyệt ────────────────────────────────────────────────────────────

    /** Luồng cũ: gửi mới / gửi lại tour bị từ chối. */
    @Transactional
    public TourReviewResponse submit(Long tourId, Long actorId, Role role) {
        return submitLegacy(tourId, actorId, role, false);
    }

    /** Luồng cũ: gửi lại sau khi sửa. */
    @Transactional
    public TourReviewResponse submitAfterEdit(Long tourId, Long actorId, Role role) {
        return submitLegacy(tourId, actorId, role, true);
    }

    private TourReviewResponse submitLegacy(Long tourId, Long actorId, Role role, boolean edited) {
        Tour tour = findTourOrThrow(tourId);
        checkOwnership(tour, actorId, role);
        TourReview latest = reviewRepository.findByTour_TourId(tourId).orElse(null);
        if (latest != null && !edited && latest.getStatus() != TourReviewStatus.REJECTED
                && latest.getStatus() != TourReviewStatus.CHANGES_REQUESTED)
            throw new AppException(ErrorCode.INVALID_TOUR_STATUS, "Chỉ có thể gửi mới hoặc gửi lại tour đã bị từ chối");
        if (latest != null && edited && latest.getStatus() == TourReviewStatus.PENDING)
            throw new AppException(ErrorCode.INVALID_TOUR_STATUS, "Tour đang chờ kiểm duyệt, không thể chỉnh sửa");
        TourReview review = openReview(tour, actorId, latest != null);
        notifyModerators(tour, latest != null);
        return toResponse(review);
    }

    /**
     * Luồng 5 bước: nơi gọi (TourDraftService) đã kiểm tra trạng thái và dữ liệu.
     * Chặn trường hợp tour đã có một bản đang chờ duyệt.
     */
    @Transactional
    public TourReviewResponse submitWizardTour(Tour tour, Long actorId) {
        if (reviewRepository.existsByTour_TourIdAndStatus(tour.getTourId(), TourReviewStatus.PENDING)) {
            throw new AppException(ErrorCode.INVALID_TOUR_STATUS, "Tour đang có một bản chờ duyệt");
        }
        boolean resubmit = reviewRepository.findByTour_TourId(tour.getTourId()).isPresent();
        if (resubmit) tour.setVersionNumber(tour.getVersionNumber() + 1);
        TourReview review = openReview(tour, actorId, resubmit);
        notifyModerators(tour, resubmit);
        return toResponse(review);
    }

    /** Tạo lần gửi duyệt mới và chuyển tour sang PENDING_REVIEW. */
    private TourReview openReview(Tour tour, Long actorId, boolean resubmit) {
        TourStatus from = tour.getStatus();
        tour.setStatus(TourStatus.PENDING_REVIEW);
        tour.setApproved(false);
        tour.setRejectionReason(null);
        tour.setSubmittedAt(Instant.now());
        tourRepository.save(tour);

        TourReview review = reviewRepository.save(TourReview.builder()
                .tour(tour)
                .tourVersion(tour.getVersionNumber())
                .status(TourReviewStatus.PENDING)
                .submittedAt(Instant.now())
                .build());
        addHistory(review, TourReviewAction.SUBMITTED, actorId, from, TourStatus.PENDING_REVIEW,
                resubmit ? "Gửi lại sau chỉnh sửa" : null, null, null);
        return review;
    }

    private void notifyModerators(Tour tour, boolean resubmit) {
        String sender = tour.getCreatedBy() == null ? "đối tác" : tour.getCreatedBy().getFullName();
        notifications.send(NotificationType.TOUR_PENDING)
                .toRole(Role.CONTENT_MODERATOR)
                .title(resubmit ? "Tour được gửi lại sau chỉnh sửa" : "Tour mới chờ thẩm định")
                .body(NotificationPublisher.quote(tour.getTitle()) + " do " + sender + " gửi, đang chờ bạn thẩm định.")
                .link("/moderator/tours")
                .ref("TOUR", tour.getTourId())
                .queue(NotificationPublisher.Queue.TOUR_REVIEW)
                .publish();
    }

    // ── Đọc ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<TourReviewResponse> getQueue(Pageable pageable) {
        return PageResponse.from(reviewRepository.findByStatusAndTour_DeletedFalse(TourReviewStatus.PENDING, pageable), this::toResponse);
    }

    @Transactional(readOnly = true)
    public PageResponse<TourReviewResponse> getByStatus(TourReviewStatus status, Pageable pageable) {
        return PageResponse.from(reviewRepository.findByStatusAndTour_DeletedFalse(status, pageable), this::toResponse);
    }

    /** Lần kiểm duyệt hiện hành kèm toàn bộ lịch sử của tour. */
    @Transactional(readOnly = true)
    public TourReviewResponse getHistory(Long tourId, Long actorId, Role role) {
        TourReview review = findReviewOrThrow(tourId);
        checkOwnership(review.getTour(), actorId, role);
        return toResponse(review);
    }

    /** Moderator xem toàn bộ nội dung tour 5 bước (giống trang Xem lại của đối tác). */
    @Transactional(readOnly = true)
    public TourDetailResponse getDetail(Long tourId) {
        Tour tour = findTourOrThrow(tourId);
        if (!tour.isWizardTour()) {
            throw new AppException(ErrorCode.INVALID_TOUR_STATUS, "Tour tạo theo luồng cũ, xem qua GET /api/v1/tours/{id}");
        }
        return detailMapper.toResponse(tour);
    }

    // ── Quyết định ───────────────────────────────────────────────────────────

    @Transactional
    public TourReviewResponse approve(Long tourId, Long reviewerId, TourReviewDecisionRequest request) {
        TourReview review = findReviewOrThrow(tourId);
        requirePending(review);
        Tour tour = review.getTour();
        String note = request == null ? null : trimToNull(request.note());

        if (tour.isWizardTour()) {
            TourReviewDecisionRequest.ReviewCriteria criteria = requireCriteria(request);
            if (request.notes() != null && !request.notes().isEmpty()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR,
                        "Tour còn ghi chú lỗi — hãy gửi yêu cầu chỉnh sửa thay vì duyệt");
            }
            if (criteria.passedCount() < CRITERIA_MIN_TO_APPROVE) {
                throw new AppException(ErrorCode.TOUR_REVIEW_CRITERIA_NOT_MET);
            }
            List<TourValidationIssue> issues = validator.validate(tour);
            if (!issues.isEmpty()) throw new TourValidationException(issues);
            applyCriteria(review, criteria);
            snapshotRewardPoints(tour);
        }

        TourStatus from = tour.getStatus();
        tour.setStatus(TourStatus.PUBLISHED);
        tour.setApproved(true);
        tour.setRejectionReason(null);
        if (tour.isWizardTour()) tour.setPublishedAt(Instant.now());
        review.setStatus(TourReviewStatus.APPROVED);
        review.setReviewer(findUserOrThrow(reviewerId));
        review.setDecisionNote(note);
        review.setReason(null);
        review.setOtherReason(null);
        review.setReviewedAt(Instant.now());
        reviewRepository.save(review);
        tourRepository.save(tour);
        if (tour.isWizardTour()) slotService.syncSlots(tour);
        addHistory(review, TourReviewAction.APPROVED, reviewerId, from, TourStatus.PUBLISHED, note, null, null);

        notifications.send(NotificationType.TOUR_APPROVED)
                .to(NotificationPublisher.idOf(tour.getCreatedBy()))
                .except(reviewerId)
                .title("Tour đã được phê duyệt")
                .body(NotificationPublisher.withNote(NotificationPublisher.quote(tour.getTitle())
                        + " đã mở bán, du khách có thể đặt chỗ ngay.", note))
                .link(NotificationPublisher.dashboardPath(tour.getCreatedBy(), "/tours"))
                .ref("TOUR", tourId)
                .queue(NotificationPublisher.Queue.MY_CONTENT)
                .publish();
        notifications.queueChanged(Role.CONTENT_MODERATOR, NotificationPublisher.Queue.TOUR_REVIEW);
        if (tour.isWizardTour()) mailer.sendApproved(tour);
        log.info("[TourModeration] reviewer={} duyệt tour={} v{}", reviewerId, tourId, tour.getVersionNumber());
        return toResponse(review);
    }

    /** Yêu cầu chỉnh sửa: bắt buộc ít nhất 1 ghi chú (BR-09). */
    @Transactional
    public TourReviewResponse requestChanges(Long tourId, Long reviewerId, TourReviewDecisionRequest request) {
        if (request == null || request.notes() == null || request.notes().isEmpty()) {
            throw new AppException(ErrorCode.TOUR_REVIEW_NOTES_REQUIRED);
        }
        TourReview review = findReviewOrThrow(tourId);
        requirePending(review);
        Tour tour = review.getTour();
        if (tour.isWizardTour()) applyCriteria(review, requireCriteria(request));

        String note = trimToNull(request.note());
        List<TourReviewNote> notes = attachNotes(review, request.notes());
        TourStatus from = tour.getStatus();
        tour.setStatus(TourStatus.CHANGES_REQUESTED);
        tour.setApproved(false);
        review.setStatus(TourReviewStatus.CHANGES_REQUESTED);
        review.setReviewer(findUserOrThrow(reviewerId));
        review.setDecisionNote(note);
        review.setReviewedAt(Instant.now());
        reviewRepository.save(review);
        tourRepository.save(tour);
        addHistory(review, TourReviewAction.CHANGES_REQUESTED, reviewerId, from, TourStatus.CHANGES_REQUESTED,
                summarizeNotes(note, notes), null, null);

        notifications.send(NotificationType.TOUR_REJECTED)
                .to(NotificationPublisher.idOf(tour.getCreatedBy()))
                .except(reviewerId)
                .title("Tour cần chỉnh sửa")
                .body(NotificationPublisher.quote(tour.getTitle()) + " có " + notes.size()
                        + " ghi chú cần chỉnh sửa. Vui lòng sửa theo ghi chú rồi gửi lại.")
                .link(NotificationPublisher.dashboardPath(tour.getCreatedBy(), "/tours"))
                .ref("TOUR", tourId)
                .queue(NotificationPublisher.Queue.MY_CONTENT)
                .publish();
        notifications.queueChanged(Role.CONTENT_MODERATOR, NotificationPublisher.Queue.TOUR_REVIEW);
        mailer.sendChangesRequested(tour, note, notes);
        log.info("[TourModeration] reviewer={} yêu cầu sửa tour={} ({} ghi chú)", reviewerId, tourId, notes.size());
        return toResponse(review);
    }

    /** Từ chối: bắt buộc mã lý do hoặc ghi chú (BR-09). */
    @Transactional
    public TourReviewResponse reject(Long tourId, Long reviewerId, TourReviewDecisionRequest request) {
        String note = request == null ? null : trimToNull(request.note());
        String normalizedReason = request == null ? null : normalizeReason(request.reason());
        String otherReason = request == null ? null : request.otherReason();
        if (normalizedReason == null && note == null) throw new AppException(ErrorCode.TOUR_REJECTION_REASON_REQUIRED);
        boolean hasOther = normalizedReason != null
                && Arrays.asList(normalizedReason.split(",")).contains(TourRejectionReason.OTHER.name());
        if (hasOther && (otherReason == null || otherReason.isBlank()))
            throw new AppException(ErrorCode.TOUR_REJECTION_REASON_REQUIRED, "Vui lòng nhập nội dung cho lý do OTHER");
        if (!hasOther && otherReason != null && !otherReason.isBlank())
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Chỉ gửi otherReason khi đã chọn lý do OTHER");

        TourReview review = findReviewOrThrow(tourId);
        requirePending(review);
        Tour tour = review.getTour();
        if (tour.isWizardTour()) applyCriteria(review, requireCriteria(request));
        if (request != null && request.notes() != null) attachNotes(review, request.notes());

        TourStatus from = tour.getStatus();
        tour.setStatus(TourStatus.REJECTED);
        tour.setApproved(false);
        tour.setRejectionReason(normalizedReason != null ? normalizedReason : note);
        review.setStatus(TourReviewStatus.REJECTED);
        review.setReviewer(findUserOrThrow(reviewerId));
        review.setDecisionNote(note);
        review.setReason(normalizedReason);
        review.setOtherReason(hasOther ? otherReason.trim() : null);
        review.setReviewedAt(Instant.now());
        reviewRepository.save(review);
        tourRepository.save(tour);
        addHistory(review, TourReviewAction.REJECTED, reviewerId, from, TourStatus.REJECTED,
                note, review.getReason(), review.getOtherReason());

        notifications.send(NotificationType.TOUR_REJECTED)
                .to(NotificationPublisher.idOf(tour.getCreatedBy()))
                .except(reviewerId)
                .title("Tour không được duyệt")
                .body(NotificationPublisher.withNote(NotificationPublisher.quote(tour.getTitle())
                        + " không được duyệt. Vui lòng xem lý do.", note))
                .link(NotificationPublisher.dashboardPath(tour.getCreatedBy(), "/tours"))
                .ref("TOUR", tourId)
                .queue(NotificationPublisher.Queue.MY_CONTENT)
                .publish();
        notifications.queueChanged(Role.CONTENT_MODERATOR, NotificationPublisher.Queue.TOUR_REVIEW);
        if (tour.isWizardTour()) mailer.sendRejected(tour, rejectionText(review));
        log.info("[TourModeration] reviewer={} từ chối tour={}", reviewerId, tourId);
        return toResponse(review);
    }

    // ── Dùng bởi luồng tour cũ (TourService) ────────────────────────────────

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

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static TourReviewDecisionRequest.ReviewCriteria requireCriteria(TourReviewDecisionRequest request) {
        TourReviewDecisionRequest.ReviewCriteria criteria = request == null ? null : request.criteria();
        if (criteria == null || criteria.interactive() == null || criteria.localExpertise() == null
                || criteria.storytelling() == null || criteria.culturalRatio() == null
                || criteria.authenticMedia() == null) {
            throw new AppException(ErrorCode.TOUR_REVIEW_CRITERIA_REQUIRED);
        }
        return criteria;
    }

    private static void applyCriteria(TourReview review, TourReviewDecisionRequest.ReviewCriteria criteria) {
        review.setCritInteractive(criteria.interactive());
        review.setCritLocalExpertise(criteria.localExpertise());
        review.setCritStorytelling(criteria.storytelling());
        review.setCritCulturalRatio(criteria.culturalRatio());
        review.setCritAuthenticMedia(criteria.authenticMedia());
    }

    private List<TourReviewNote> attachNotes(TourReview review, List<TourReviewDecisionRequest.NoteItem> items) {
        List<TourReviewNote> created = new ArrayList<>();
        for (TourReviewDecisionRequest.NoteItem item : items) {
            TourReviewNote note = TourReviewNote.builder()
                    .review(review)
                    .step(item.step())
                    .stopId(item.stopId())
                    .field(trimToNull(item.field()))
                    .note(item.note().trim())
                    .build();
            review.getNotes().add(note);
            created.add(note);
        }
        return created;
    }

    /** Chốt điểm thưởng hiện hành của Admin vào quiz và trải nghiệm thực tế (đối tác không sửa được). */
    private void snapshotRewardPoints(Tour tour) {
        int quizPoints = rewardSettingService.pointsFor(RewardSettingCode.QUIZ_QUESTION);
        int experiencePoints = rewardSettingService.pointsFor(RewardSettingCode.REAL_WORLD_EXPERIENCE);
        for (TourStop stop : tour.getStops()) {
            for (TourStopQuestion question : stop.getQuizQuestions()) question.setPointsReward(quizPoints);
            for (TourStopExperience experience : stop.getExperiences()) experience.setPointsReward(experiencePoints);
        }
    }

    private static String summarizeNotes(String general, List<TourReviewNote> notes) {
        String joined = notes.stream()
                .map(n -> n.getStep().name() + (n.getField() == null ? "" : " " + n.getField()) + ": " + n.getNote())
                .collect(Collectors.joining("; "));
        String text = general == null ? joined : general + " | " + joined;
        return text.length() > 1000 ? text.substring(0, 997) + "..." : text;
    }

    private static String rejectionText(TourReview review) {
        List<String> parts = new ArrayList<>();
        if (review.getReason() != null) {
            for (String code : review.getReason().split(",")) {
                TourRejectionReason reason = TourRejectionReason.valueOf(code);
                parts.add(reason == TourRejectionReason.OTHER && review.getOtherReason() != null
                        ? review.getOtherReason() : reason.getLabel());
            }
        }
        if (review.getDecisionNote() != null) parts.add(review.getDecisionNote());
        return String.join("; ", parts);
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

    private void addHistory(TourReview review, TourReviewAction action, Long actorId, TourStatus from, TourStatus to,
                            String note, String reason, String otherReason) {
        historyRepository.save(TourReviewHistory.builder().review(review).action(action).actor(findUserOrThrow(actorId))
                .note(note).reason(reason).otherReason(otherReason)
                .fromStatus(from == null ? null : from.name())
                .toStatus(to == null ? null : to.name())
                .tourVersion(review.getTourVersion())
                .build());
    }

    private TourReviewResponse toResponse(TourReview review) {
        Tour tour = review.getTour();
        // Lịch sử của mọi lần gửi duyệt, từ cũ đến mới.
        List<TourReview> all = new ArrayList<>(reviewRepository.findByTour_TourIdOrderByIdDesc(tour.getTourId()));
        java.util.Collections.reverse(all);
        List<TourReviewResponse.HistoryItem> history = new ArrayList<>();
        for (TourReview item : all) {
            historyRepository.findByReview_IdOrderByCreatedAtAsc(item.getId()).forEach(h -> history.add(
                    new TourReviewResponse.HistoryItem(h.getAction().name(),
                            h.getActor() == null ? null : h.getActor().getId(),
                            h.getActor() == null ? null : h.getActor().getFullName(), h.getNote(),
                            h.getReason(), h.getOtherReason(), h.getCreatedAt(),
                            h.getFromStatus(), h.getToStatus(), h.getTourVersion())));
        }
        TourReviewResponse.Criteria criteria = review.getCritInteractive() == null ? null
                : new TourReviewResponse.Criteria(review.getCritInteractive(), review.getCritLocalExpertise(),
                review.getCritStorytelling(), review.getCritCulturalRatio(), review.getCritAuthenticMedia(),
                review.criteriaPassedCount());
        List<TourReviewResponse.Note> notes = review.getNotes().stream()
                .map(n -> new TourReviewResponse.Note(n.getId(), n.getStep().name(), n.getStopId(), n.getField(),
                        n.getNote(), n.getCreatedAt()))
                .toList();
        return new TourReviewResponse(review.getId(), tour.getTourId(), tour.getTitle(), review.getStatus(),
                review.getReviewer() == null ? null : review.getReviewer().getId(),
                review.getReviewer() == null ? null : review.getReviewer().getFullName(), review.getDecisionNote(),
                review.getReason(), review.getOtherReason(), review.getSubmittedAt(), review.getReviewedAt(),
                pricingService.toResponse(tour), history, review.getTourVersion(), criteria, notes, tour.isWizardTour());
    }

    private String normalizeReason(String reason) {
        if (reason == null || reason.isBlank()) return null;
        LinkedHashSet<TourRejectionReason> selected = new LinkedHashSet<>();
        try {
            for (String value : reason.split(",")) {
                String code = value.trim();
                if (!code.isEmpty()) selected.add(TourRejectionReason.valueOf(code));
            }
        } catch (IllegalArgumentException exception) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "reason chỉ được chứa mã hợp lệ; xem GET /api/v1/moderation/tours/rejection-reasons");
        }
        return selected.isEmpty() ? null : selected.stream().map(Enum::name).collect(Collectors.joining(","));
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void checkOwnership(Tour tour, Long actorId, Role role) {
        if (role != null && role.isContentProvider()) {
            Long ownerId = tour.getCreatedBy() == null ? null : tour.getCreatedBy().getId();
            if (ownerId == null || !ownerId.equals(actorId)) throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }
}
