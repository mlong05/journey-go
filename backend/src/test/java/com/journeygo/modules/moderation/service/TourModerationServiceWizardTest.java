package com.journeygo.modules.moderation.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.moderation.dto.TourReviewDecisionRequest;
import com.journeygo.modules.moderation.entity.TourReview;
import com.journeygo.modules.moderation.entity.enums.TourReviewStatus;
import com.journeygo.modules.moderation.entity.enums.TourReviewStep;
import com.journeygo.modules.moderation.repository.TourReviewHistoryRepository;
import com.journeygo.modules.moderation.repository.TourReviewRepository;
import com.journeygo.modules.notification.service.NotificationPublisher;
import com.journeygo.modules.reward.service.RewardSettingService;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourFormat;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.tour.service.TourDetailMapper;
import com.journeygo.modules.tour.service.TourPricingService;
import com.journeygo.modules.tour.service.TourSlotService;
import com.journeygo.modules.tour.service.TourSubmissionValidator;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TourModerationServiceWizardTest {

    @Mock private TourRepository tourRepository;
    @Mock private TourReviewRepository reviewRepository;
    @Mock private TourPricingService pricingService;
    @Mock private TourReviewHistoryRepository historyRepository;
    @Mock private UserRepository userRepository;
    @Mock(answer = Answers.RETURNS_SELF) private NotificationPublisher notifications;
    @Mock private TourSubmissionValidator validator;
    @Mock private TourDetailMapper detailMapper;
    @Mock private TourSlotService slotService;
    @Mock private RewardSettingService rewardSettingService;
    @Mock private TourModerationMailer mailer;

    @InjectMocks
    private TourModerationService service;

    private Tour tour;
    private TourReview review;

    @BeforeEach
    void setUp() {
        tour = Tour.builder().tourId(1L).title("Tour Hội An").tourFormat(TourFormat.DAY_TRIP)
                .status(TourStatus.PENDING_REVIEW).createdBy(User.builder().id(7L).build()).build();
        review = TourReview.builder().id(10L).tour(tour).tourVersion(1).status(TourReviewStatus.PENDING).build();
        when(reviewRepository.findByTour_TourId(1L)).thenReturn(Optional.of(review));
        when(reviewRepository.findByTour_TourIdOrderByIdDesc(1L)).thenReturn(List.of(review));
        when(userRepository.findById(any())).thenReturn(Optional.of(User.builder().id(99L).fullName("Mod").build()));
        when(validator.validate(any())).thenReturn(List.of());
        when(notifications.send(any())).thenAnswer(i -> mock(NotificationPublisher.Builder.class, Answers.RETURNS_SELF));
    }

    private static TourReviewDecisionRequest.ReviewCriteria criteria(int passed) {
        boolean[] v = new boolean[5];
        for (int i = 0; i < passed; i++) v[i] = true;
        return new TourReviewDecisionRequest.ReviewCriteria(v[0], v[1], v[2], v[3], v[4]);
    }

    @Test
    @DisplayName("Duyệt: đạt dưới 3/5 tiêu chí thì bị chặn")
    void approveRequiresThreeCriteria() {
        var request = new TourReviewDecisionRequest(null, null, null, criteria(2), null);
        AppException ex = assertThrows(AppException.class, () -> service.approve(1L, 99L, request));
        assertEquals(ErrorCode.TOUR_REVIEW_CRITERIA_NOT_MET, ex.getErrorCode());
        assertEquals(TourStatus.PENDING_REVIEW, tour.getStatus());
    }

    @Test
    @DisplayName("Duyệt: thiếu tiêu chí thì bị chặn")
    void approveRequiresCriteria() {
        AppException ex = assertThrows(AppException.class, () -> service.approve(1L, 99L, null));
        assertEquals(ErrorCode.TOUR_REVIEW_CRITERIA_REQUIRED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Duyệt: đạt 3/5 tiêu chí thì PUBLISHED, sinh slot, gửi email")
    void approvePublishesTour() {
        var request = new TourReviewDecisionRequest("OK", null, null, criteria(3), null);
        service.approve(1L, 99L, request);
        assertEquals(TourStatus.PUBLISHED, tour.getStatus());
        assertTrue(tour.isApproved());
        assertNotNull(tour.getPublishedAt());
        assertEquals(TourReviewStatus.APPROVED, review.getStatus());
        assertEquals(3, review.criteriaPassedCount());
        verify(slotService).syncSlots(tour);
        verify(mailer).sendApproved(tour);
    }

    @Test
    @DisplayName("Duyệt: còn ghi chú lỗi thì phải gửi yêu cầu chỉnh sửa")
    void approveBlockedWhenNotesPresent() {
        var note = new TourReviewDecisionRequest.NoteItem(TourReviewStep.STOPS, 5L, "quiz[1]", "Hai đáp án đúng");
        var request = new TourReviewDecisionRequest(null, null, null, criteria(5), List.of(note));
        assertThrows(AppException.class, () -> service.approve(1L, 99L, request));
        assertEquals(TourStatus.PENDING_REVIEW, tour.getStatus());
    }

    @Test
    @DisplayName("Yêu cầu chỉnh sửa: bắt buộc có ghi chú (BR-09)")
    void requestChangesRequiresNotes() {
        var request = new TourReviewDecisionRequest("Sửa giúp", null, null, criteria(2), List.of());
        AppException ex = assertThrows(AppException.class, () -> service.requestChanges(1L, 99L, request));
        assertEquals(ErrorCode.TOUR_REVIEW_NOTES_REQUIRED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Yêu cầu chỉnh sửa: lưu ghi chú theo vị trí và chuyển CHANGES_REQUESTED")
    void requestChangesStoresNotes() {
        var note = new TourReviewDecisionRequest.NoteItem(TourReviewStep.STOPS, 5L, "quiz[1]", "Hai đáp án đúng");
        var request = new TourReviewDecisionRequest(null, null, null, criteria(2), List.of(note));
        service.requestChanges(1L, 99L, request);
        assertEquals(TourStatus.CHANGES_REQUESTED, tour.getStatus());
        assertEquals(1, review.getNotes().size());
        assertEquals(5L, review.getNotes().get(0).getStopId());
        verify(mailer).sendChangesRequested(eq(tour), any(), anyList());
    }

    @Test
    @DisplayName("Từ chối: bắt buộc lý do hoặc ghi chú (BR-09)")
    void rejectRequiresReason() {
        var request = new TourReviewDecisionRequest(null, null, null, criteria(1), null);
        AppException ex = assertThrows(AppException.class, () -> service.reject(1L, 99L, request));
        assertEquals(ErrorCode.TOUR_REJECTION_REASON_REQUIRED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Từ chối với ghi chú: REJECTED và gửi email")
    void rejectWithNote() {
        var request = new TourReviewDecisionRequest("Hình ảnh không phải ảnh thật của tour", null, null, criteria(1), null);
        service.reject(1L, 99L, request);
        assertEquals(TourStatus.REJECTED, tour.getStatus());
        verify(mailer).sendRejected(eq(tour), contains("Hình ảnh"));
    }
}
