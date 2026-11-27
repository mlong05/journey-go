package com.journeygo.modules.tourfeedback.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.enums.BookingPassengerStatus;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.repository.BookingPassengerRepository;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.service.NotificationPublisher;
import com.journeygo.modules.refund.entity.RefundRequest;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import com.journeygo.modules.refund.repository.RefundRequestRepository;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.enums.TourVisibility;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.tourfeedback.dto.request.CreateTourCustomerReviewRequest;
import com.journeygo.modules.tourfeedback.dto.request.ReplyTourCustomerReviewRequest;
import com.journeygo.modules.tourfeedback.dto.request.ToggleReviewVisibilityRequest;
import com.journeygo.modules.tourfeedback.dto.request.UpdateTourCustomerReviewRequest;
import com.journeygo.modules.tourfeedback.dto.response.ProviderReviewSummaryResponse;
import com.journeygo.modules.tourfeedback.dto.response.ReviewHistoryEntryResponse;
import com.journeygo.modules.tourfeedback.dto.response.ReviewModerationHistoryResponse;
import com.journeygo.modules.tourfeedback.dto.response.ReviewReplyResponse;
import com.journeygo.modules.tourfeedback.dto.response.ReviewReportResponse;
import com.journeygo.modules.tourfeedback.dto.response.TourCustomerReviewResponse;
import com.journeygo.modules.tourfeedback.dto.response.TourRatingSummaryResponse;
import com.journeygo.modules.tourfeedback.dto.response.TourReviewEligibilityResponse;
import com.journeygo.modules.tourfeedback.entity.TourCustomerReview;
import com.journeygo.modules.tourfeedback.entity.TourCustomerReviewModerationHistory;
import com.journeygo.modules.tourfeedback.entity.TourCustomerReviewReply;
import com.journeygo.modules.tourfeedback.entity.TourCustomerReviewReport;
import com.journeygo.modules.tourfeedback.repository.TourCustomerReviewModerationHistoryRepository;
import com.journeygo.modules.tourfeedback.repository.TourCustomerReviewReplyRepository;
import com.journeygo.modules.tourfeedback.repository.TourCustomerReviewReportRepository;
import com.journeygo.modules.tourfeedback.repository.TourCustomerReviewRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class TourCustomerReviewService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int EDIT_WINDOW_DAYS = 7;
    private static final int MAX_IMAGES = 5;
    private static final Set<RefundStatus> BLOCKING_REFUND_STATUSES = EnumSet.of(
            RefundStatus.APPROVED,
            RefundStatus.VNPAY_PROCESSING,
            RefundStatus.MANUAL_TRANSFER_PENDING,
            RefundStatus.REFUNDED,
            RefundStatus.REFUND_PROCESSING
    );

    private final TourCustomerReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final BookingPassengerRepository bookingPassengerRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final TourRepository tourRepository;
    private final UserRepository userRepository;
    private final NotificationPublisher notifications;
    private final TourCustomerReviewModerationHistoryRepository moderationHistoryRepository;
    private final TourCustomerReviewReplyRepository replyRepository;
    private final TourCustomerReviewReportRepository reportRepository;

    // ── Tourist: Kiểm tra điều kiện & CRUD đánh giá ───────────────────────────

    @Transactional(readOnly = true)
    public TourReviewEligibilityResponse checkEligibility(Long bookingId, Long userId) {
        Booking booking = bookingRepository.findByIdWithRelations(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        Optional<TourCustomerReview> existing = reviewRepository.findByBooking_IdAndReviewer_Id(bookingId, userId);
        if (existing.isPresent()) {
            return new TourReviewEligibilityResponse(
                    bookingId,
                    booking.getTour().getTourId(),
                    false,
                    ErrorCode.TOUR_CUSTOMER_REVIEW_ALREADY_EXISTS.name(),
                    ErrorCode.TOUR_CUSTOMER_REVIEW_ALREADY_EXISTS.getLocalizedMessage(),
                    toResponse(existing.get(), userId)
            );
        }

        ErrorCode failure = evaluateEligibilityFailure(booking, userId);
        if (failure != null) {
            return new TourReviewEligibilityResponse(
                    bookingId,
                    booking.getTour().getTourId(),
                    false,
                    failure.name(),
                    failure.getLocalizedMessage(),
                    null
            );
        }

        return new TourReviewEligibilityResponse(
                bookingId,
                booking.getTour().getTourId(),
                true,
                null,
                null,
                null
        );
    }

    @Transactional
    public TourCustomerReviewResponse createReview(CreateTourCustomerReviewRequest request, Long userId) {
        Booking booking = bookingRepository.findByIdWithRelations(request.bookingId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        ErrorCode failure = evaluateEligibilityFailure(booking, userId);
        if (failure != null) {
            throw new AppException(failure);
        }

        if (reviewRepository.existsByBooking_IdAndReviewer_Id(booking.getId(), userId)) {
            throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_ALREADY_EXISTS);
        }

        User reviewer = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        List<String> images = normalizeImages(request.imageUrls());

        Tour tour = booking.getTour();
        TourCustomerReview review = TourCustomerReview.builder()
                .booking(booking)
                .tour(tour)
                .reviewer(reviewer)
                .overallRating(request.overallRating())
                .guideRating(request.guideRating())
                .cultureRating(request.cultureRating())
                .scheduleRating(request.scheduleRating())
                .valueRating(request.valueRating())
                .title(cleanOptionalText(request.title()))
                .comment(request.comment().trim())
                .imageUrls(images)
                .verifiedPurchase(true)
                .experienceDate(booking.getExperienceDate())
                .hidden(false)
                .build();

        TourCustomerReview saved = reviewRepository.save(review);
        log.info("Created verified tour review id={} tourId={} bookingId={} reviewerId={} rating={}",
                saved.getId(), tour.getTourId(), booking.getId(), userId, saved.getOverallRating());

        if (tour.getCreatedBy() != null && !Objects.equals(tour.getCreatedBy().getId(), userId)) {
            notifications.send(NotificationType.TOUR_REVIEW_RECEIVED)
                    .to(tour.getCreatedBy().getId())
                    .title("Tour nhận được đánh giá mới")
                    .body(displayName(reviewer) + " vừa đánh giá " + saved.getOverallRating()
                            + " sao cho tour " + NotificationPublisher.quote(tour.getTitle()) + ".")
                    // ⚠️ Link phải trỏ tới trang CÓ THẬT. Trước đây dùng
                    // `dashboardPath(owner, "/reviews")` ⇒ admin nhận link "/admin/reviews"
                    // nhưng route đó KHÔNG tồn tại (404). Đối tác thì có "/provider/reviews".
                    .link(resolveReviewInboxPath(tour.getCreatedBy()))
                    .ref("TOUR_REVIEW", saved.getId())
                    .publish();
        }

        return toResponse(saved, userId);
    }

    @Transactional
    public TourCustomerReviewResponse updateReview(Long reviewId, UpdateTourCustomerReviewRequest request, Long userId) {
        TourCustomerReview review = reviewRepository.findByIdWithRelations(reviewId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_NOT_FOUND));

        if (!Objects.equals(review.getReviewer().getId(), userId)) {
            throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_FORBIDDEN);
        }
        if (review.isHidden()) {
            throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_HIDDEN);
        }
        if (!isWithinEditWindow(review.getCreatedAt(), Instant.now())) {
            throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_EDIT_WINDOW_EXPIRED);
        }

        List<String> images = normalizeImages(request.imageUrls());
        review.setOverallRating(request.overallRating());
        review.setGuideRating(request.guideRating());
        review.setCultureRating(request.cultureRating());
        review.setScheduleRating(request.scheduleRating());
        review.setValueRating(request.valueRating());
        review.setTitle(cleanOptionalText(request.title()));
        review.setComment(request.comment().trim());
        review.getImageUrls().clear();
        review.getImageUrls().addAll(images);
        review.setEditedAt(Instant.now());

        TourCustomerReview saved = reviewRepository.save(review);
        return toResponse(saved, userId);
    }

    @Transactional
    public void deleteReview(Long reviewId, Long actorId, boolean isAdmin) {
        TourCustomerReview review = reviewRepository.findByIdWithRelations(reviewId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_NOT_FOUND));

        if (!isAdmin && !Objects.equals(review.getReviewer().getId(), actorId)) {
            throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_FORBIDDEN);
        }
        // ⚠️ Cửa sổ xoá = 7 ngày kể từ khi đánh giá được tạo (giống cửa sổ sửa).
        // Trước đây KHÔNG có giới hạn ⇒ du khách có thể xoá đánh giá bất cứ lúc nào
        // (kể cả sau khi đối tác đã phản hồi) ⇒ mất dữ liệu phản hồi & doanh thu ảo.
        if (!isWithinEditWindow(review.getCreatedAt(), Instant.now())) {
            throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_EDIT_WINDOW_EXPIRED);
        }
        reviewRepository.delete(review);
        log.info("Deleted tour review id={} by actorId={} isAdmin={}", reviewId, actorId, isAdmin);
    }

    @Transactional(readOnly = true)
    public PageResponse<TourCustomerReviewResponse> getMyReviews(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), clampSize(size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<TourCustomerReview> result = reviewRepository.findByReviewer_IdOrderByCreatedAtDesc(userId, pageable);
        return PageResponse.from(result, r -> toResponse(r, userId));
    }

    // ── Public: Xem đánh giá & thống kê sao của tour ──────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<TourCustomerReviewResponse> getPublicReviews(
            Long tourId,
            Integer rating,
            Boolean hasPhotos,
            String sort,
            int page,
            int size,
            String viewerEmail,
            boolean isStaff
    ) {
        Tour tour = findReadableTourOrThrow(tourId, viewerEmail, isStaff);
        Integer validRating = (rating != null && rating >= 1 && rating <= 5) ? rating : null;
        boolean onlyPhotos = Boolean.TRUE.equals(hasPhotos);

        Pageable pageable = PageRequest.of(Math.max(0, page), clampSize(size), resolvePublicSort(sort));
        Page<TourCustomerReview> result = reviewRepository.findPublicByTourId(
                tour.getTourId(), validRating, onlyPhotos, pageable);
        return PageResponse.from(result, r -> toResponse(r, null));
    }

    @Transactional(readOnly = true)
    public TourRatingSummaryResponse getTourRatingSummary(Long tourId, String viewerEmail, boolean isStaff) {
        Tour tour = findReadableTourOrThrow(tourId, viewerEmail, isStaff);
        List<Object[]> rows = reviewRepository.aggregateTourSummary(tour.getTourId());
        Object[] row = rows.isEmpty() ? null : rows.get(0);

        long total = toLong(row != null ? row[0] : null);
        double avgOverall = round1(toDouble(row != null ? row[1] : null));
        Double avgGuide = roundNullable1(row != null ? row[2] : null);
        Double avgCulture = roundNullable1(row != null ? row[3] : null);
        Double avgSchedule = roundNullable1(row != null ? row[4] : null);
        Double avgValue = roundNullable1(row != null ? row[5] : null);
        long photoCount = toLong(row != null ? row[6] : null);
        long repliedCount = toLong(row != null ? row[7] : null);
        double replyRate = total > 0 ? round1((repliedCount * 100.0) / total) : 0.0;

        Map<Integer, Long> dist = initStarDistribution();
        for (Object[] starRow : reviewRepository.countStarsByTourId(tour.getTourId())) {
            Integer star = starRow[0] instanceof Number n ? n.intValue() : null;
            if (star != null && dist.containsKey(star)) {
                dist.put(star, toLong(starRow[1]));
            }
        }

        return new TourRatingSummaryResponse(
                tour.getTourId(),
                total,
                avgOverall,
                avgGuide,
                avgCulture,
                avgSchedule,
                avgValue,
                dist,
                photoCount,
                repliedCount,
                replyRate
        );
    }

    // ── Provider: Xem & phản hồi đánh giá tour của mình ───────────────────────

    @Transactional(readOnly = true)
    public PageResponse<TourCustomerReviewResponse> listForProvider(
            Long providerId,
            Long tourId,
            Integer rating,
            Boolean replied,
            int page,
            int size
    ) {
        String repliedFilter = replied == null ? "ALL" : (replied ? "REPLIED" : "UNREPLIED");
        Integer validRating = (rating != null && rating >= 1 && rating <= 5) ? rating : null;
        Pageable pageable = PageRequest.of(Math.max(0, page), clampSize(size), Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<TourCustomerReview> result = reviewRepository.findForProvider(
                providerId, tourId, validRating, repliedFilter, pageable);
        return PageResponse.from(result, r -> toResponse(r, providerId));
    }

    @Transactional(readOnly = true)
    public ProviderReviewSummaryResponse getProviderSummary(Long providerId) {
        List<Object[]> rows = reviewRepository.aggregateProviderSummary(providerId);
        Object[] row = rows.isEmpty() ? null : rows.get(0);

        long total = toLong(row != null ? row[0] : null);
        double avgOverall = round1(toDouble(row != null ? row[1] : null));
        long unreplied = toLong(row != null ? row[2] : null);
        Double avgGuide = roundNullable1(row != null ? row[3] : null);
        Double avgCulture = roundNullable1(row != null ? row[4] : null);
        Double avgSchedule = roundNullable1(row != null ? row[5] : null);
        Double avgValue = roundNullable1(row != null ? row[6] : null);

        Map<Integer, Long> dist = initStarDistribution();
        for (Object[] starRow : reviewRepository.countStarsByProviderId(providerId)) {
            Integer star = starRow[0] instanceof Number n ? n.intValue() : null;
            if (star != null && dist.containsKey(star)) {
                dist.put(star, toLong(starRow[1]));
            }
        }

        return new ProviderReviewSummaryResponse(
                total,
                avgOverall,
                unreplied,
                avgGuide,
                avgCulture,
                avgSchedule,
                avgValue,
                dist
        );
    }

    /**
     * Đối tác phản hồi đánh giá — PHẢI QUA KIỂM DUYỆT (E2c).
     *
     * <p>Phản hồi được lưu với trạng thái {@code PENDING} ⇒ CHƯA hiển thị công khai.
     * Chỉ khi kiểm duyệt viên duyệt ({@link #approveReply}) thì phản hồi mới được
     * ghi vào {@code providerReply} và hiển thị công khai.
     *
     * <p>⚠️ Trước đây phản hồi được ghi thẳng vào {@code providerReply} và hiển thị
     * ngay ⇒ đối tác có thể đăng nội dung vi phạm (xúc phạm, quảng cáo, thông tin
     * sai lệch) mà không qua bất kỳ bước duyệt nào.
     */
    @Transactional
    public ReviewReplyResponse replyToReview(Long reviewId, ReplyTourCustomerReviewRequest request, Long providerId) {
        TourCustomerReview review = reviewRepository.findByIdWithRelations(reviewId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_NOT_FOUND));

        Long ownerId = review.getTour().getCreatedBy() != null ? review.getTour().getCreatedBy().getId() : null;
        if (!Objects.equals(ownerId, providerId)) {
            throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_FORBIDDEN);
        }
        if (review.isHidden()) {
            throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_HIDDEN);
        }

        User provider = userRepository.findById(providerId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        String content = request.reply().trim();

        // Đối tác đã có phản hồi đang chờ duyệt ⇒ không cho tạo thêm (tránh spam
        // hàng đợi kiểm duyệt).
        replyRepository.findFirstByReview_IdAndAuthor_IdOrderByCreatedAtDesc(reviewId, providerId)
                .filter(r -> r.getStatus() == TourCustomerReviewReply.Status.PENDING)
                .ifPresent(r -> {
                    throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_REPLY_ALREADY_PENDING);
                });

        TourCustomerReviewReply reply = replyRepository.save(TourCustomerReviewReply.builder()
                .review(review)
                .content(content)
                .status(TourCustomerReviewReply.Status.PENDING)
                .author(provider)
                .authorName(displayName(provider))
                .build());

        log.info("Provider id={} submitted reply for review id={} — awaiting moderation",
                providerId, reviewId);

        return ReviewReplyResponse.fromEntity(reply);
    }

    // ── Moderator / Admin: Kiểm duyệt ẩn / khôi phục đánh giá ────────────────

    @Transactional(readOnly = true)
    public PageResponse<TourCustomerReviewResponse> listForModeration(
            Boolean hidden,
            Integer rating,
            String keyword,
            int page,
            int size
    ) {
        String visibilityFilter = hidden == null ? "ALL" : (hidden ? "HIDDEN" : "VISIBLE");
        Integer validRating = (rating != null && rating >= 1 && rating <= 5) ? rating : null;
        String cleanKeyword = keyword == null ? "" : keyword.trim();

        Pageable pageable = PageRequest.of(Math.max(0, page), clampSize(size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<TourCustomerReview> result = reviewRepository.findForModeration(
                visibilityFilter, validRating, cleanKeyword, pageable);
        return PageResponse.from(result, r -> toResponse(r, null));
    }

    @Transactional
    public TourCustomerReviewResponse toggleVisibility(
            Long reviewId,
            ToggleReviewVisibilityRequest request,
            Long actorId,
            boolean isAdmin
    ) {
        TourCustomerReview review = reviewRepository.findByIdWithRelations(reviewId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_NOT_FOUND));

        Long tourOwnerId = review.getTour().getCreatedBy() != null ? review.getTour().getCreatedBy().getId() : null;
        Long reviewerId = review.getReviewer().getId();
        if (!isAdmin && (Objects.equals(actorId, tourOwnerId) || Objects.equals(actorId, reviewerId))) {
            throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_SELF_MODERATION_FORBIDDEN);
        }

        boolean nextHidden = Boolean.TRUE.equals(request.hidden());
        String cleanReason = cleanOptionalText(request.reason());
        if (nextHidden && cleanReason == null) {
            throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_HIDE_REASON_REQUIRED);
        }

        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        boolean wasHidden = review.isHidden();

        review.setHidden(nextHidden);
        if (nextHidden) {
            review.setHiddenReason(cleanReason);
            review.setHiddenBy(actor);
            review.setHiddenAt(Instant.now());
        } else {
            review.setHiddenReason(null);
            review.setHiddenBy(null);
            review.setHiddenAt(null);
        }

        TourCustomerReview saved = reviewRepository.save(review);

        // Ghi lịch sử kiểm duyệt (E2d) — append-only, để tra cứu được đầy đủ
        // dòng thời gian "ai ẩn/khôi phục, lúc nào, vì lý do gì".
        moderationHistoryRepository.save(TourCustomerReviewModerationHistory.builder()
                .review(saved)
                .action(nextHidden
                        ? TourCustomerReviewModerationHistory.Action.HIDDEN
                        : TourCustomerReviewModerationHistory.Action.RESTORED)
                .fromStatus(wasHidden ? "HIDDEN" : "VISIBLE")
                .toStatus(nextHidden ? "HIDDEN" : "VISIBLE")
                .actor(actor)
                .actorName(displayName(actor))
                .reason(cleanReason)
                .build());

        if (nextHidden) {
            notifications.send(NotificationType.TOUR_REVIEW_HIDDEN)
                    .to(reviewerId)
                    .title("Đánh giá tour của bạn đã bị ẩn")
                    .body(NotificationPublisher.withNote(
                            "Đánh giá cho tour " + NotificationPublisher.quote(review.getTour().getTitle())
                                    + " đã bị ẩn bởi kiểm duyệt viên.",
                            cleanReason))
                    .link("/trips/" + review.getBooking().getId())
                    .ref("TOUR_REVIEW", saved.getId())
                    .publish();
        }

        return toResponse(saved, actorId);
    }

    /**
     * Lịch sử kiểm duyệt một đánh giá (E2d).
     *
     * <p>Mỗi lần ẩn / khôi phục đều được ghi lại ⇒ trang "/moderator/history" hiển thị
     * được đầy đủ dòng thời gian kiểm duyệt của từng đánh giá.
     */
    @Transactional(readOnly = true)
    public List<ReviewModerationHistoryResponse> getModerationHistory(Long reviewId) {
        reviewRepository.findByIdWithRelations(reviewId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_NOT_FOUND));
        return moderationHistoryRepository.findByReview_IdOrderByCreatedAtDesc(reviewId).stream()
                .map(ReviewModerationHistoryResponse::fromEntity)
                .toList();
    }

    /**
     * Lịch sử kiểm duyệt đánh giá toàn hệ thống (C4) — dùng cho trang
     * "/moderator/history" để moderator thấy được ai ẩn/khôi phục đánh giá nào.
     */
    @Transactional(readOnly = true)
    public PageResponse<ReviewHistoryEntryResponse> listAllModerationHistory(String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), clampSize(size),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<TourCustomerReviewModerationHistory> result = moderationHistoryRepository
                .findAllForHistory(keyword == null ? "" : keyword.trim(), pageable);
        return PageResponse.from(result, ReviewHistoryEntryResponse::fromEntity);
    }

    // ── Moderator / Admin: Duyệt phản hồi của đối tác (E2c) ─────────────────

    /** Hàng đợi phản hồi của đối tác đang chờ kiểm duyệt. */
    @Transactional(readOnly = true)
    public PageResponse<ReviewReplyResponse> listPendingReplies(int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), clampSize(size),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<TourCustomerReviewReply> result = replyRepository
                .findByStatusOrderByCreatedAtDesc(TourCustomerReviewReply.Status.PENDING, pageable);
        return PageResponse.from(result, ReviewReplyResponse::fromEntity);
    }

    /** Duyệt phản hồi của đối tác ⇒ hiển thị công khai + thông báo cho du khách. */
    @Transactional
    public ReviewReplyResponse approveReply(Long replyId, Long actorId) {
        TourCustomerReviewReply reply = replyRepository.findById(replyId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_REPLY_NOT_FOUND));
        if (reply.getStatus() != TourCustomerReviewReply.Status.PENDING) {
            throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_REPLY_ALREADY_HANDLED);
        }

        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        reply.setStatus(TourCustomerReviewReply.Status.APPROVED);
        reply.setModerator(actor);
        reply.setModeratorName(displayName(actor));
        reply.setDecisionReason(null);
        reply.setDecidedAt(Instant.now());
        TourCustomerReviewReply saved = replyRepository.save(reply);

        // Áp dụng vào đánh giá để hiển thị công khai.
        TourCustomerReview review = saved.getReview();
        if (review != null) {
            review.setProviderReply(saved.getContent());
            review.setProviderRepliedBy(saved.getAuthor());
            review.setProviderRepliedAt(Instant.now());
            reviewRepository.save(review);

            notifications.send(NotificationType.TOUR_REVIEW_REPLIED)
                    .to(review.getReviewer().getId())
                    .title("Nhà tour đã phản hồi đánh giá của bạn")
                    .body("Đối tác đã phản hồi đánh giá của bạn về tour "
                            + NotificationPublisher.quote(review.getTour().getTitle()) + ".")
                    .link("/tours/" + review.getTour().getTourId())
                    .ref("TOUR_REVIEW", review.getId())
                    .publish();
        }
        return ReviewReplyResponse.fromEntity(saved);
    }

    /** Từ chối phản hồi của đối tác ⇒ không hiển thị, đối tác có thể viết lại. */
    @Transactional
    public ReviewReplyResponse rejectReply(Long replyId, Long actorId, String reason) {
        TourCustomerReviewReply reply = replyRepository.findById(replyId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_REPLY_NOT_FOUND));
        if (reply.getStatus() != TourCustomerReviewReply.Status.PENDING) {
            throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_REPLY_ALREADY_HANDLED);
        }

        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        reply.setStatus(TourCustomerReviewReply.Status.REJECTED);
        reply.setModerator(actor);
        reply.setModeratorName(displayName(actor));
        reply.setDecisionReason(cleanOptionalText(reason));
        reply.setDecidedAt(Instant.now());
        return ReviewReplyResponse.fromEntity(replyRepository.save(reply));
    }

    // ── Du khách: Báo cáo đánh giá vi phạm (E2e / D1) ───────────────────────

    /** Du khách báo cáo một đánh giá vi phạm. */
    @Transactional
    public ReviewReportResponse reportReview(Long reviewId, String reason, Long reporterId) {
        TourCustomerReview review = reviewRepository.findByIdWithRelations(reviewId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_NOT_FOUND));

        if (Objects.equals(review.getReviewer().getId(), reporterId)) {
            throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_REPORT_SELF_FORBIDDEN);
        }
        if (reportRepository.existsByReview_IdAndReporter_Id(reviewId, reporterId)) {
            throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_REPORT_DUPLICATED);
        }

        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        TourCustomerReviewReport report = reportRepository.save(TourCustomerReviewReport.builder()
                .review(review)
                .reporter(reporter)
                .reporterName(displayName(reporter))
                .reason(reason.trim())
                .status(TourCustomerReviewReport.Status.PENDING)
                .build());

        log.info("User id={} reported review id={}", reporterId, reviewId);
        return ReviewReportResponse.fromEntity(report);
    }

    /** Hàng đợi báo cáo đánh giá vi phạm (kiểm duyệt viên / admin). */
    @Transactional(readOnly = true)
    public PageResponse<ReviewReportResponse> listReports(String status, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), clampSize(size),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        TourCustomerReviewReport.Status parsed = status == null || status.isBlank()
                ? TourCustomerReviewReport.Status.PENDING
                : TourCustomerReviewReport.Status.valueOf(status);
        Page<TourCustomerReviewReport> result = reportRepository
                .findByStatusOrderByCreatedAtDesc(parsed, pageable);
        return PageResponse.from(result, ReviewReportResponse::fromEntity);
    }

    /** Xử lý báo cáo: RESOLVED (đã xử lý) hoặc DISMISSED (báo cáo không có cơ sở). */
    @Transactional
    public ReviewReportResponse resolveReport(Long reportId, Long actorId, String resolution,
                                              boolean dismiss) {
        TourCustomerReviewReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_REPORT_NOT_FOUND));
        if (report.getStatus() != TourCustomerReviewReport.Status.PENDING) {
            throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_REPORT_ALREADY_HANDLED);
        }

        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        report.setStatus(dismiss
                ? TourCustomerReviewReport.Status.DISMISSED
                : TourCustomerReviewReport.Status.RESOLVED);
        report.setResolution(cleanOptionalText(resolution));
        report.setHandledBy(actor);
        report.setHandledAt(Instant.now());
        return ReviewReportResponse.fromEntity(reportRepository.save(report));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Đường dẫn trang quản lý đánh giá theo vai trò của chủ hồ sơ.
     *
     * <p>Admin → {@code /admin/reviews} (trang quản lý đánh giá dành cho Admin).
     * Đối tác → {@code /provider/reviews}.
     * Kiểm duyệt viên → {@code /moderator/reviews}.
     */
    private static String resolveReviewInboxPath(User owner) {
        if (owner == null || owner.getRole() == null) {
            return "/provider/reviews";
        }
        String roleName = owner.getRole().getName();
        if (roleName == null) {
            return "/provider/reviews";
        }
        return switch (roleName) {
            case "ADMIN" -> "/admin/reviews";
            case "CONTENT_MODERATOR" -> "/moderator/reviews";
            default -> "/provider/reviews";
        };
    }

    private ErrorCode evaluateEligibilityFailure(Booking booking, Long userId) {
        boolean isOwner = booking.getTourist() != null && Objects.equals(booking.getTourist().getId(), userId);
        boolean isActivePassenger = isOwner || bookingPassengerRepository.existsByBooking_IdAndLinkedUserIdAndStatus(
                booking.getId(), userId, BookingPassengerStatus.ACTIVE);
        if (!isActivePassenger) {
            return ErrorCode.TOUR_CUSTOMER_REVIEW_NOT_ELIGIBLE;
        }

        Tour tour = booking.getTour();
        Long tourOwnerId = tour.getCreatedBy() != null ? tour.getCreatedBy().getId() : null;
        if (Objects.equals(tourOwnerId, userId)) {
            return ErrorCode.TOUR_CUSTOMER_REVIEW_SELF_FORBIDDEN;
        }

        LocalDate today = LocalDate.now(VN_ZONE);
        // ⚠️ Tour nhiều ngày: ngày KẾT THÚC trải nghiệm mới là mốc "đã đi xong".
        // Trước đây chỉ so sánh `experienceDate` (ngày khởi hành) ⇒ khách của tour
        // 3 ngày bị chặn đánh giá suốt 2 ngày còn lại, và cũng cho phép đánh giá
        // sớm khi tour còn đang diễn ra.
        LocalDate endDate = booking.experienceEndDate();
        boolean completed = booking.getStatus() == BookingStatus.COMPLETED
                || (booking.getStatus() == BookingStatus.CONFIRMED
                && endDate != null
                && endDate.isBefore(today));
        if (!completed) {
            return ErrorCode.TOUR_CUSTOMER_REVIEW_BOOKING_NOT_COMPLETED;
        }

        List<RefundRequest> refunds = refundRequestRepository.findByBooking_IdOrderByCreatedAtDesc(booking.getId());
        boolean hasBlockingRefund = refunds.stream()
                .anyMatch(rr -> rr.getStatus() != null && BLOCKING_REFUND_STATUSES.contains(rr.getStatus()));
        if (hasBlockingRefund) {
            return ErrorCode.TOUR_CUSTOMER_REVIEW_BOOKING_REFUNDED;
        }

        return null;
    }

    private Tour findReadableTourOrThrow(Long tourId, String viewerEmail, boolean isStaff) {
        Tour tour = tourRepository.findByTourId(tourId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_NOT_FOUND));
        if (!tour.isApproved()) {
            throw new AppException(ErrorCode.TOUR_NOT_FOUND);
        }
        if (tour.getVisibility() == TourVisibility.SPECIFIC_USER && !isStaff) {
            String targetEmail = tour.getSpecificUserEmail();
            String normalizedViewer = viewerEmail == null ? null : viewerEmail.trim().toLowerCase(Locale.ROOT);
            if (targetEmail == null || normalizedViewer == null
                    || !targetEmail.equalsIgnoreCase(normalizedViewer)) {
                throw new AppException(ErrorCode.TOUR_ACCESS_DENIED);
            }
        }
        return tour;
    }

    private List<String> normalizeImages(List<String> raw) {
        if (raw == null || raw.isEmpty()) {
            return new ArrayList<>();
        }
        List<String> cleaned = new ArrayList<>();
        for (String item : raw) {
            if (item == null || item.isBlank()) continue;
            String url = item.trim();
            boolean validScheme = url.regionMatches(true, 0, "https://", 0, 8)
                    || url.regionMatches(true, 0, "http://", 0, 7);
            if (!validScheme || url.length() > 1000) {
                throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_INVALID_IMAGES);
            }
            if (!cleaned.contains(url)) {
                cleaned.add(url);
            }
        }
        if (cleaned.size() > MAX_IMAGES) {
            throw new AppException(ErrorCode.TOUR_CUSTOMER_REVIEW_INVALID_IMAGES);
        }
        return cleaned;
    }

    private boolean isWithinEditWindow(Instant createdAt, Instant now) {
        return createdAt != null && !now.isAfter(createdAt.plus(EDIT_WINDOW_DAYS, ChronoUnit.DAYS));
    }

    private TourCustomerReviewResponse toResponse(TourCustomerReview r, Long viewerUserId) {
        boolean isAuthor = viewerUserId != null && r.getReviewer() != null
                && Objects.equals(r.getReviewer().getId(), viewerUserId);
        boolean canEdit = isAuthor && !r.isHidden() && isWithinEditWindow(r.getCreatedAt(), Instant.now());

        List<String> images = r.getImageUrls() == null ? List.of() : List.copyOf(r.getImageUrls());

        // Phản hồi của đối tác: chỉ phản hồi ĐÃ DUYỆT mới hiển thị công khai
        // (r.getProviderReply()). Phản hồi đang chờ duyệt chỉ hiện cho chính đối tác
        // (người viết) — du khách & khách công khai KHÔNG thấy nội dung chưa duyệt.
        boolean isTourOwner = viewerUserId != null && r.getTour() != null
                && r.getTour().getCreatedBy() != null
                && Objects.equals(r.getTour().getCreatedBy().getId(), viewerUserId);
        TourCustomerReviewReply pendingReply = isTourOwner
                ? replyRepository.findFirstByReview_IdAndAuthor_IdOrderByCreatedAtDesc(
                        r.getId(), viewerUserId)
                .filter(reply -> reply.getStatus() == TourCustomerReviewReply.Status.PENDING)
                .orElse(null)
                : null;

        return new TourCustomerReviewResponse(
                r.getId(),
                r.getBooking().getId(),
                r.getBooking().getBookingCode(),
                r.getTour().getTourId(),
                r.getTour().getTitle(),
                r.getTour().getCoverImageUrl(),
                r.getReviewer().getId(),
                displayName(r.getReviewer()),
                r.getReviewer().getAvatarUrl(),
                r.getOverallRating(),
                r.getGuideRating(),
                r.getCultureRating(),
                r.getScheduleRating(),
                r.getValueRating(),
                r.getTitle(),
                r.getComment(),
                images,
                r.isVerifiedPurchase(),
                r.getExperienceDate(),
                r.getProviderReply(),
                r.getProviderRepliedBy() != null ? displayName(r.getProviderRepliedBy()) : null,
                r.getProviderRepliedAt(),
                r.getProviderReply() != null && !r.getProviderReply().isBlank()
                        ? TourCustomerReviewReply.Status.APPROVED.name()
                        : (pendingReply != null ? TourCustomerReviewReply.Status.PENDING.name() : null),
                (pendingReply != null) ? pendingReply.getContent() : null,
                r.isHidden(),
                r.getHiddenReason(),
                r.getHiddenAt(),
                canEdit,
                r.getEditedAt(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }

    private static Sort resolvePublicSort(String sort) {
        if ("highest".equalsIgnoreCase(sort)) {
            return Sort.by(Sort.Order.desc("overallRating"), Sort.Order.desc("createdAt"));
        }
        if ("lowest".equalsIgnoreCase(sort)) {
            return Sort.by(Sort.Order.asc("overallRating"), Sort.Order.desc("createdAt"));
        }
        return Sort.by(Sort.Direction.DESC, "createdAt");
    }

    private static int clampSize(int size) {
        if (size < 1) return 10;
        return Math.min(size, 50);
    }

    private static String cleanOptionalText(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String displayName(User user) {
        if (user == null) return "Du khách";
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName().trim();
        }
        return user.getEmail() != null ? user.getEmail() : "Du khách";
    }

    private static Map<Integer, Long> initStarDistribution() {
        Map<Integer, Long> map = new LinkedHashMap<>();
        for (int star = 5; star >= 1; star--) {
            map.put(star, 0L);
        }
        return map;
    }

    private static long toLong(Object val) {
        return val instanceof Number n ? n.longValue() : 0L;
    }

    private static double toDouble(Object val) {
        return val instanceof Number n ? n.doubleValue() : 0.0;
    }

    private static double round1(double val) {
        return Math.round(val * 10.0) / 10.0;
    }

    private static Double roundNullable1(Object val) {
        return val instanceof Number n ? round1(n.doubleValue()) : null;
    }
}
