package com.journeygo.modules.tourfeedback.service;

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
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.entity.enums.TourVisibility;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.tourfeedback.dto.request.CreateTourCustomerReviewRequest;
import com.journeygo.modules.tourfeedback.dto.request.ReplyTourCustomerReviewRequest;
import com.journeygo.modules.tourfeedback.dto.request.ToggleReviewVisibilityRequest;
import com.journeygo.modules.tourfeedback.dto.request.UpdateTourCustomerReviewRequest;
import com.journeygo.modules.tourfeedback.dto.response.ReviewReplyResponse;
import com.journeygo.modules.tourfeedback.dto.response.TourCustomerReviewResponse;
import com.journeygo.modules.tourfeedback.dto.response.TourRatingSummaryResponse;
import com.journeygo.modules.tourfeedback.dto.response.TourReviewEligibilityResponse;
import com.journeygo.modules.tourfeedback.entity.TourCustomerReview;
import com.journeygo.modules.tourfeedback.entity.TourCustomerReviewReply;
import com.journeygo.modules.tourfeedback.repository.TourCustomerReviewModerationHistoryRepository;
import com.journeygo.modules.tourfeedback.repository.TourCustomerReviewReplyRepository;
import com.journeygo.modules.tourfeedback.repository.TourCustomerReviewRepository;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TourCustomerReviewServiceTest {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Mock private TourCustomerReviewRepository reviewRepository;
    @Mock private TourCustomerReviewReplyRepository replyRepository;
    @Mock private TourCustomerReviewModerationHistoryRepository moderationHistoryRepository;
    @Mock private BookingRepository bookingRepository;
    @Mock private BookingPassengerRepository bookingPassengerRepository;
    @Mock private RefundRequestRepository refundRequestRepository;
    @Mock private TourRepository tourRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationPublisher notifications;

    @InjectMocks
    private TourCustomerReviewService service;

    private User provider;
    private User tourist;
    private User passenger;
    private Tour tour;
    private Booking completedBooking;

    @BeforeEach
    void setUp() {
        provider = User.builder()
                .id(10L)
                .email("provider@test.com")
                .fullName("Đối tác Di Sản")
                .role(Role.of(Role.CONTENT_PROVIDER))
                .build();
        tourist = User.builder()
                .id(20L)
                .email("tourist@test.com")
                .fullName("Nguyễn Du Khách")
                .role(Role.of(Role.TOURIST))
                .build();
        passenger = User.builder()
                .id(30L)
                .email("friend@test.com")
                .fullName("Bạn Đồng Hành")
                .role(Role.of(Role.TOURIST))
                .build();

        tour = Tour.builder()
                .tourId(100L)
                .title("Khám phá Tràng An")
                .status(TourStatus.PUBLISHED)
                .approved(true)
                .visibility(TourVisibility.ALL)
                .createdBy(provider)
                .build();

        completedBooking = Booking.builder()
                .id(200L)
                .bookingCode("BK-200")
                .tourist(tourist)
                .tour(tour)
                .experienceDate(LocalDate.now(VN_ZONE).minusDays(2))
                .status(BookingStatus.COMPLETED)
                .build();

        NotificationPublisher.Builder mockBuilder = mock(NotificationPublisher.Builder.class, RETURNS_SELF);
        lenient().when(notifications.send(any())).thenReturn(mockBuilder);
    }

    @Test
    void createReview_completedBookingByOwner_succeedsAndNotifiesProvider() {
        when(bookingRepository.findByIdWithRelations(200L)).thenReturn(Optional.of(completedBooking));
        when(refundRequestRepository.findByBooking_IdOrderByCreatedAtDesc(200L)).thenReturn(List.of());
        when(reviewRepository.existsByBooking_IdAndReviewer_Id(200L, 20L)).thenReturn(false);
        when(userRepository.findById(20L)).thenReturn(Optional.of(tourist));
        when(reviewRepository.save(any(TourCustomerReview.class))).thenAnswer(inv -> {
            TourCustomerReview r = inv.getArgument(0);
            r.setId(500L);
            r.setCreatedAt(Instant.now());
            r.setUpdatedAt(Instant.now());
            return r;
        });

        CreateTourCustomerReviewRequest req = new CreateTourCustomerReviewRequest(
                200L, 5, 5, 5, 4, 5,
                "Trải nghiệm tuyệt vời",
                "Hướng dẫn viên nhiệt tình, thuyết minh lịch sử rất cuốn hút.",
                List.of("https://res.cloudinary.com/demo/image/upload/v1/review.jpg")
        );

        TourCustomerReviewResponse res = service.createReview(req, 20L);
        assertEquals(500L, res.id());
        assertEquals(5, res.overallRating());
        assertTrue(res.verifiedPurchase());
        assertTrue(res.canEdit());
        assertEquals(1, res.imageUrls().size());

        verify(notifications).send(NotificationType.TOUR_REVIEW_RECEIVED);
    }

    @Test
    void createReview_activeLinkedPassengerPastConfirmed_succeeds() {
        Booking pastConfirmed = Booking.builder()
                .id(201L)
                .bookingCode("BK-201")
                .tourist(tourist)
                .tour(tour)
                .experienceDate(LocalDate.now(VN_ZONE).minusDays(1))
                .status(BookingStatus.CONFIRMED)
                .build();

        when(bookingRepository.findByIdWithRelations(201L)).thenReturn(Optional.of(pastConfirmed));
        when(bookingPassengerRepository.existsByBooking_IdAndLinkedUserIdAndStatus(201L, 30L, BookingPassengerStatus.ACTIVE))
                .thenReturn(true);
        when(refundRequestRepository.findByBooking_IdOrderByCreatedAtDesc(201L)).thenReturn(List.of());
        when(reviewRepository.existsByBooking_IdAndReviewer_Id(201L, 30L)).thenReturn(false);
        when(userRepository.findById(30L)).thenReturn(Optional.of(passenger));
        when(reviewRepository.save(any(TourCustomerReview.class))).thenAnswer(inv -> {
            TourCustomerReview r = inv.getArgument(0);
            r.setId(501L);
            r.setCreatedAt(Instant.now());
            r.setUpdatedAt(Instant.now());
            return r;
        });

        TourCustomerReviewResponse res = service.createReview(
                new CreateTourCustomerReviewRequest(201L, 4, null, null, null, null, null,
                        "Chuyến đi rất đáng nhớ cùng gia đình.", null),
                30L);

        assertEquals(501L, res.id());
        assertEquals(4, res.overallRating());
    }

    @Test
    void eligibilityAndCreate_rejectsUncompletedRefundedReplacedAndSelfReview() {
        // 1. Future CONFIRMED -> NOT_COMPLETED
        Booking futureConfirmed = Booking.builder()
                .id(202L).tourist(tourist).tour(tour)
                .experienceDate(LocalDate.now(VN_ZONE).plusDays(2))
                .status(BookingStatus.CONFIRMED)
                .build();
        when(bookingRepository.findByIdWithRelations(202L)).thenReturn(Optional.of(futureConfirmed));
        when(reviewRepository.findByBooking_IdAndReviewer_Id(202L, 20L)).thenReturn(Optional.empty());
        TourReviewEligibilityResponse futureRes = service.checkEligibility(202L, 20L);
        assertFalse(futureRes.eligible());
        assertEquals(ErrorCode.TOUR_CUSTOMER_REVIEW_BOOKING_NOT_COMPLETED.name(), futureRes.reasonCode());

        // 2. Refunded -> BOOKING_REFUNDED
        when(bookingRepository.findByIdWithRelations(200L)).thenReturn(Optional.of(completedBooking));
        when(refundRequestRepository.findByBooking_IdOrderByCreatedAtDesc(200L))
                .thenReturn(List.of(RefundRequest.builder().status(RefundStatus.REFUNDED).build()));
        AppException refundEx = assertThrows(AppException.class, () -> service.createReview(
                new CreateTourCustomerReviewRequest(200L, 5, null, null, null, null, null,
                        "Nội dung đánh giá hợp lệ dài hơn 10 ký tự.", null),
                20L));
        assertEquals(ErrorCode.TOUR_CUSTOMER_REVIEW_BOOKING_REFUNDED, refundEx.getErrorCode());

        // 3. Replaced passenger (not active) -> NOT_ELIGIBLE
        when(bookingPassengerRepository.existsByBooking_IdAndLinkedUserIdAndStatus(200L, 30L, BookingPassengerStatus.ACTIVE))
                .thenReturn(false);
        AppException passengerEx = assertThrows(AppException.class, () -> service.createReview(
                new CreateTourCustomerReviewRequest(200L, 5, null, null, null, null, null,
                        "Nội dung đánh giá hợp lệ dài hơn 10 ký tự.", null),
                30L));
        assertEquals(ErrorCode.TOUR_CUSTOMER_REVIEW_NOT_ELIGIBLE, passengerEx.getErrorCode());

        // 4. Self review (provider books own tour) -> SELF_FORBIDDEN
        Booking selfBooking = Booking.builder()
                .id(203L).tourist(provider).tour(tour)
                .experienceDate(LocalDate.now(VN_ZONE).minusDays(1))
                .status(BookingStatus.COMPLETED)
                .build();
        when(bookingRepository.findByIdWithRelations(203L)).thenReturn(Optional.of(selfBooking));
        AppException selfEx = assertThrows(AppException.class, () -> service.createReview(
                new CreateTourCustomerReviewRequest(203L, 5, null, null, null, null, null,
                        "Tự khen tour của mình để tăng điểm.", null),
                10L));
        assertEquals(ErrorCode.TOUR_CUSTOMER_REVIEW_SELF_FORBIDDEN, selfEx.getErrorCode());
    }

    @Test
    void editReview_enforcesWindowAndHiddenState() {
        TourCustomerReview recent = TourCustomerReview.builder()
                .id(600L).booking(completedBooking).tour(tour).reviewer(tourist)
                .overallRating(4).comment("Cũ nhưng hợp lệ").experienceDate(completedBooking.getExperienceDate())
                .createdAt(Instant.now().minus(2, ChronoUnit.DAYS))
                .updatedAt(Instant.now().minus(2, ChronoUnit.DAYS))
                .build();
        when(reviewRepository.findByIdWithRelations(600L)).thenReturn(Optional.of(recent));
        when(reviewRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TourCustomerReviewResponse updated = service.updateReview(600L,
                new UpdateTourCustomerReviewRequest(5, 5, 5, 5, 5, "Cập nhật", "Trải nghiệm rất hài lòng!", List.of()),
                20L);
        assertEquals(5, updated.overallRating());
        assertNotNull(updated.editedAt());

        // Expired (> 7 days)
        recent.setCreatedAt(Instant.now().minus(8, ChronoUnit.DAYS));
        AppException expiredEx = assertThrows(AppException.class, () -> service.updateReview(600L,
                new UpdateTourCustomerReviewRequest(5, null, null, null, null, null, "Quá hạn chỉnh sửa rồi", null),
                20L));
        assertEquals(ErrorCode.TOUR_CUSTOMER_REVIEW_EDIT_WINDOW_EXPIRED, expiredEx.getErrorCode());

        // Hidden
        recent.setCreatedAt(Instant.now().minus(1, ChronoUnit.DAYS));
        recent.setHidden(true);
        AppException hiddenEx = assertThrows(AppException.class, () -> service.updateReview(600L,
                new UpdateTourCustomerReviewRequest(5, null, null, null, null, null, "Đang bị ẩn không sửa được", null),
                20L));
        assertEquals(ErrorCode.TOUR_CUSTOMER_REVIEW_HIDDEN, hiddenEx.getErrorCode());
    }

    @Test
    void replyAndModerationVisibility_enforceOwnershipAndSelfModerationRules() {
        TourCustomerReview review = TourCustomerReview.builder()
                .id(700L).booking(completedBooking).tour(tour).reviewer(tourist)
                .overallRating(5).comment("Rất tuyệt vời!").experienceDate(completedBooking.getExperienceDate())
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
        when(reviewRepository.findByIdWithRelations(700L)).thenReturn(Optional.of(review));
        when(userRepository.findById(10L)).thenReturn(Optional.of(provider));
        when(reviewRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(replyRepository.findFirstByReview_IdAndAuthor_IdOrderByCreatedAtDesc(700L, 10L))
                .thenReturn(Optional.empty());

        // Other provider cannot reply
        AppException otherReply = assertThrows(AppException.class,
                () -> service.replyToReview(700L, new ReplyTourCustomerReviewRequest("Cảm ơn bạn"), 999L));
        assertEquals(ErrorCode.TOUR_CUSTOMER_REVIEW_FORBIDDEN, otherReply.getErrorCode());

        // Owner replies → phản hồi được lưu với trạng thái PENDING (chờ kiểm duyệt),
        // CHƯA hiển thị công khai ⇒ providerReply của đánh giá vẫn null.
        TourCustomerReviewReply pendingReply = TourCustomerReviewReply.builder()
                .id(900L).review(review).content("Cảm ơn bạn đã đồng hành cùng chúng tôi!")
                .status(TourCustomerReviewReply.Status.PENDING)
                .author(provider).authorName("Đối tác Di Sản")
                .createdAt(Instant.now())
                .build();
        when(replyRepository.save(any(TourCustomerReviewReply.class))).thenAnswer(inv -> inv.getArgument(0));

        ReviewReplyResponse replied = service.replyToReview(700L,
                new ReplyTourCustomerReviewRequest("Cảm ơn bạn đã đồng hành cùng chúng tôi!"), 10L);
        assertEquals(TourCustomerReviewReply.Status.PENDING.name(), replied.getStatus());
        assertEquals("Cảm ơn bạn đã đồng hành cùng chúng tôi!", replied.getContent());
        assertNull(review.getProviderReply());
        assertEquals(pendingReply.getContent(), replied.getContent());

        // Self-moderation blocked for non-admin
        AppException selfMod = assertThrows(AppException.class,
                () -> service.toggleVisibility(700L, new ToggleReviewVisibilityRequest(true, "Spam"), 10L, false));
        assertEquals(ErrorCode.TOUR_CUSTOMER_REVIEW_SELF_MODERATION_FORBIDDEN, selfMod.getErrorCode());

        // Hide without reason -> error
        AppException noReason = assertThrows(AppException.class,
                () -> service.toggleVisibility(700L, new ToggleReviewVisibilityRequest(true, "  "), 888L, false));
        assertEquals(ErrorCode.TOUR_CUSTOMER_REVIEW_HIDE_REASON_REQUIRED, noReason.getErrorCode());

        // Valid moderator hide -> hidden & notified
        User mod = User.builder().id(888L).fullName("Mod A").role(Role.of(Role.CONTENT_MODERATOR)).build();
        when(userRepository.findById(888L)).thenReturn(Optional.of(mod));
        TourCustomerReviewResponse hiddenRes = service.toggleVisibility(
                700L, new ToggleReviewVisibilityRequest(true, "Ngôn từ không phù hợp"), 888L, false);
        assertTrue(hiddenRes.hidden());
        assertEquals("Ngôn từ không phù hợp", hiddenRes.hiddenReason());
        verify(notifications).send(NotificationType.TOUR_REVIEW_HIDDEN);
    }

    @Test
    void approveReply_publishesToReviewAndNotifiesReviewer() {
        TourCustomerReview review = TourCustomerReview.builder()
                .id(700L).booking(completedBooking).tour(tour).reviewer(tourist)
                .overallRating(5).comment("Rất tuyệt vời!").experienceDate(completedBooking.getExperienceDate())
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
        TourCustomerReviewReply reply = TourCustomerReviewReply.builder()
                .id(900L).review(review).content("Cảm ơn bạn!")
                .status(TourCustomerReviewReply.Status.PENDING)
                .author(provider).authorName("Đối tác Di Sản")
                .createdAt(Instant.now())
                .build();

        when(replyRepository.findById(900L)).thenReturn(Optional.of(reply));
        when(replyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(reviewRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        User mod = User.builder().id(888L).fullName("Mod A").role(Role.of(Role.CONTENT_MODERATOR)).build();
        when(userRepository.findById(888L)).thenReturn(Optional.of(mod));

        ReviewReplyResponse approved = service.approveReply(900L, 888L);
        assertEquals(TourCustomerReviewReply.Status.APPROVED.name(), approved.getStatus());
        assertEquals("Mod A", approved.getModeratorName());
        // Phản hồi mới được ghi vào đánh giá khi DUYỆT xong.
        assertEquals("Cảm ơn bạn!", review.getProviderReply());
        verify(notifications).send(NotificationType.TOUR_REVIEW_REPLIED);
    }

    @Test
    void getTourRatingSummary_computesDistributionsAndAverages() {
        when(tourRepository.findByTourId(100L)).thenReturn(Optional.of(tour));
        when(reviewRepository.aggregateTourSummary(100L)).thenReturn(List.<Object[]>of(
                new Object[]{4L, 4.5, 4.75, 4.5, 4.25, 4.5, 2L, 3L}
        ));
        when(reviewRepository.countStarsByTourId(100L)).thenReturn(List.of(
                new Object[]{5, 3L},
                new Object[]{3, 1L}
        ));

        TourRatingSummaryResponse summary = service.getTourRatingSummary(100L, null, false);
        assertEquals(4L, summary.totalReviews());
        assertEquals(4.5, summary.averageRating());
        assertEquals(4.8, summary.avgGuideRating());
        assertEquals(3L, summary.starDistribution().get(5));
        assertEquals(0L, summary.starDistribution().get(4));
        assertEquals(1L, summary.starDistribution().get(3));
        assertEquals(2L, summary.photoReviewCount());
        assertEquals(3L, summary.repliedCount());
        assertEquals(75.0, summary.replyRate());
    }
}
