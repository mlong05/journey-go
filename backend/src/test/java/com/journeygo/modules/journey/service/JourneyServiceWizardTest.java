package com.journeygo.modules.journey.service;

import com.journeygo.modules.experience.entity.enums.CheckInVerificationMethod;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.gamification.service.GamificationService;
import com.journeygo.modules.journey.dto.CheckInJourneyRequest;
import com.journeygo.modules.journey.dto.CheckInResultResponse;
import com.journeygo.modules.journey.dto.JourneyTaskProgressResponse;
import com.journeygo.modules.journey.dto.SubmitTaskRequest;
import com.journeygo.modules.journey.dto.TaskQuestionsResponse;
import com.journeygo.modules.journey.entity.Journey;
import com.journeygo.modules.journey.entity.JourneyDestinationProgress;
import com.journeygo.modules.journey.entity.JourneyTaskProgress;
import com.journeygo.modules.journey.entity.enums.DestinationProgressStatus;
import com.journeygo.modules.journey.entity.enums.JourneyStatus;
import com.journeygo.modules.journey.entity.enums.TaskProgressStatus;
import com.journeygo.modules.journey.provider.TourInfo;
import com.journeygo.modules.journey.provider.TourInfoProvider;
import com.journeygo.modules.journey.repository.JourneyDestinationProgressRepository;
import com.journeygo.modules.journey.repository.JourneyRepository;
import com.journeygo.modules.journey.repository.JourneyTaskProgressRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Hành trình của tour 5 bước: check-in điểm dừng, câu đố chấm theo câu, hoạt động thực địa bắt buộc QR. */
@ExtendWith(MockitoExtension.class)
class JourneyServiceWizardTest {

    private static final BigDecimal LAT = new BigDecimal("21.0293000");
    private static final BigDecimal LNG = new BigDecimal("105.8356000");
    private static final String QR = "JGE-0123456789ABCDEF";

    @Mock private JourneyRepository journeyRepository;
    @Mock private JourneyDestinationProgressRepository destinationProgressRepository;
    @Mock private JourneyTaskProgressRepository taskProgressRepository;
    @Mock private TourInfoProvider tourInfoProvider;
    @Mock private GamificationService gamificationService;

    @InjectMocks private JourneyService journeyService;

    private Journey journey;
    private JourneyDestinationProgress stop;
    private JourneyTaskProgress quizProgress;
    private JourneyTaskProgress activityProgress;

    /** Câu đố 2 câu (10 điểm và 15 điểm). */
    private TourInfo.TourTaskInfo quizTask() {
        var q1 = new TourInfo.QuestionInfo(1L, "Văn Miếu xây năm nào?", "MULTIPLE_CHOICE", 1, null,
                null, null, null, null, null,
                List.of(new TourInfo.AnswerInfo(11L, "1070", true, 1), new TourInfo.AnswerInfo(12L, "1010", false, 2)),
                10, true);
        var q2 = new TourInfo.QuestionInfo(2L, "Thờ ai?", "MULTIPLE_CHOICE", 2, null,
                null, null, null, null, null,
                List.of(new TourInfo.AnswerInfo(21L, "Khổng Tử", true, 1), new TourInfo.AnswerInfo(22L, "Lão Tử", false, 2)),
                15, true);
        return new TourInfo.TourTaskInfo(-7L, "Câu đố tại Văn Miếu", "QUIZ", 1, 25, 1, null, false,
                List.of(q1, q2), null, false, true);
    }

    /** Hoạt động thực địa 20 điểm: checkpoint bán kính 50m, đếm ngược 300s, câu tự luận nhiều đáp án. */
    private TourInfo.TourTaskInfo activityTask() {
        var post = new TourInfo.QuestionInfo(3L, "Ai dời đô về Thăng Long?", "TEXT", 1, "Lý Thái Tổ; Lý Công Uẩn",
                "Tìm bia tiến sĩ", LAT, LNG, 50, QR, List.of(), null, true);
        return new TourInfo.TourTaskInfo(5L, "Tìm bia tiến sĩ", "REAL_WORLD", 2, 20, 3, null, true,
                List.of(post), 300, true, false);
    }

    private TourInfo tourInfo(BigDecimal lat, BigDecimal lng) {
        return new TourInfo(1L, "Hà Nội ngàn năm", List.of(new TourInfo.TourDestinationInfo(
                7L, "Văn Miếu", 1, null, lat, lng, 300, null, List.of(quizTask(), activityTask()))), true);
    }

    @BeforeEach
    void setUp() {
        journey = Journey.builder().id(50L).userId(10L).tourId(1L).tourName("Hà Nội ngàn năm")
                .status(JourneyStatus.IN_PROGRESS).currentDestinationOrder(1).totalDestinations(1)
                .destinations(new ArrayList<>()).build();
        stop = JourneyDestinationProgress.builder().id(200L).journey(journey).destinationId(7L)
                .destinationName("Văn Miếu").orderIndex(1).status(DestinationProgressStatus.IN_PROGRESS)
                .checkedIn(false).tasksCompleted(0).totalTasks(2).tasks(new ArrayList<>()).build();
        quizProgress = JourneyTaskProgress.builder().id(300L).journey(journey).destinationProgress(stop)
                .taskId(-7L).taskName("Câu đố").taskType("QUIZ").orderIndex(1)
                .status(TaskProgressStatus.NOT_STARTED).attempts(0).pointsEarned(0).build();
        activityProgress = JourneyTaskProgress.builder().id(301L).journey(journey).destinationProgress(stop)
                .taskId(5L).taskName("Tìm bia tiến sĩ").taskType("REAL_WORLD").orderIndex(2)
                .status(TaskProgressStatus.NOT_STARTED).attempts(0).pointsEarned(0).build();
        stop.addTask(quizProgress);
        stop.addTask(activityProgress);
        journey.addDestination(stop);
    }

    private void stubTasks(TourInfo info) {
        when(journeyRepository.findByIdWithDestinations(50L)).thenReturn(Optional.of(journey));
        when(taskProgressRepository.findByJourneyId(50L)).thenReturn(List.of(quizProgress, activityProgress));
        when(tourInfoProvider.getTourInfo(1L)).thenReturn(info);
    }

    private void stubCheckIn(TourInfo info) {
        when(journeyRepository.findByIdWithDestinations(50L)).thenReturn(Optional.of(journey));
        when(destinationProgressRepository.findByJourneyIdAndDestinationId(50L, 7L)).thenReturn(Optional.of(stop));
        when(tourInfoProvider.getTourInfo(1L)).thenReturn(info);
    }

    // ── Check-in điểm dừng ────────────────────────────────────────────────────

    @Test
    void checkIn_WithinStopRadius_ShouldSucceedWithoutBadge() {
        stubCheckIn(tourInfo(LAT, LNG));
        // cách checkpoint khoảng 200m, trong bán kính 300m của điểm dừng
        var req = new CheckInJourneyRequest(CheckInVerificationMethod.GPS, new BigDecimal("21.0311000"), LNG, null);

        CheckInResultResponse result = journeyService.checkInDestination(50L, 7L, req, 10L);

        assertTrue(result.success());
        assertTrue(stop.isCheckedIn());
        assertFalse(result.badgeAwarded());
        verify(gamificationService, never()).awardCheckInBadge(anyLong(), anyLong(), anyString(), anyLong());
    }

    @Test
    void checkIn_StopWithoutCoordinates_ShouldCheckInDirectly() {
        stubCheckIn(tourInfo(null, null));
        var req = new CheckInJourneyRequest(CheckInVerificationMethod.GPS, null, null, null);

        assertTrue(journeyService.checkInDestination(50L, 7L, req, 10L).success());
        assertTrue(stop.isCheckedIn());
    }

    @Test
    void checkIn_FarAway_ShouldFailUnlessDevSkipIsOn() {
        stubCheckIn(tourInfo(LAT, LNG));
        var far = new CheckInJourneyRequest(CheckInVerificationMethod.GPS, new BigDecimal("10.7769"), new BigDecimal("106.7009"), null);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> journeyService.checkInDestination(50L, 7L, far, 10L));
        assertEquals("GPS-OUT-OF-RANGE", ex.getCode());

        ReflectionTestUtils.setField(journeyService, "skipLocationCheck", true);
        assertTrue(journeyService.checkInDestination(50L, 7L, far, 10L).success());
    }

    // ── Câu đố: đúng câu nào cộng điểm câu đó ─────────────────────────────────

    @Test
    void quiz_OneOfTwoCorrect_ShouldCompleteWithPointsOfThatQuestionOnly() {
        stop.setCheckedIn(true);
        stubTasks(tourInfo(LAT, LNG));
        var answers = new SubmitTaskRequest(List.of(
                new SubmitTaskRequest.QuestionAnswer(1L, 11L, null),
                new SubmitTaskRequest.QuestionAnswer(2L, 22L, null)), null, null, null);

        JourneyTaskProgressResponse r = journeyService.submitTask(50L, -7L, answers, 10L);

        assertEquals(TaskProgressStatus.COMPLETED, r.status());
        assertEquals(10, r.pointsEarned());
        assertEquals(1, r.correctCount());
        verify(gamificationService).awardPoints(eq(10L), eq(10), any(), anyString(), anyString());
    }

    @Test
    void quiz_AllWrong_ShouldCompleteWithZeroPoints() {
        stop.setCheckedIn(true);
        stubTasks(tourInfo(LAT, LNG));
        var answers = new SubmitTaskRequest(List.of(
                new SubmitTaskRequest.QuestionAnswer(1L, 12L, null),
                new SubmitTaskRequest.QuestionAnswer(2L, 22L, null)), null, null, null);

        JourneyTaskProgressResponse r = journeyService.submitTask(50L, -7L, answers, 10L);

        assertEquals(TaskProgressStatus.COMPLETED, r.status());
        assertEquals(0, r.pointsEarned());
        verify(gamificationService, never()).awardPoints(anyLong(), anyInt(), any(), anyString(), anyString());
    }

    // ── Hoạt động thực địa: bắt buộc QR, chấm tự luận không dấu ────────────────

    @Test
    void activity_AtCheckpointWithoutQr_ShouldStayLocked() {
        stop.setCheckedIn(true);
        stubTasks(tourInfo(LAT, LNG));

        TaskQuestionsResponse content = journeyService.getTaskQuestions(50L, 5L, 10L, LAT, LNG, null);

        assertFalse(content.unlocked());
        assertTrue(content.qrRequired());
        assertEquals(300, content.durationSeconds());
        assertNull(content.questions());
        assertEquals(0, content.distanceMeters());
    }

    @Test
    void activity_WithQrAndAnswerWithoutAccents_ShouldCompleteAndAwardPoints() {
        stop.setCheckedIn(true);
        stubTasks(tourInfo(LAT, LNG));
        var submit = new SubmitTaskRequest(List.of(new SubmitTaskRequest.QuestionAnswer(3L, null, "  ly cong uan ")),
                null, null, QR.toLowerCase());

        JourneyTaskProgressResponse r = journeyService.submitTask(50L, 5L, submit, 10L);

        assertEquals(TaskProgressStatus.COMPLETED, r.status());
        assertEquals(20, r.pointsEarned());
        verify(gamificationService).awardPoints(eq(10L), eq(20), any(), anyString(), anyString());
    }

    @Test
    void activity_SubmitWithoutQr_ShouldBeRejectedEvenAtCheckpoint() {
        stop.setCheckedIn(true);
        stubTasks(tourInfo(LAT, LNG));
        var submit = new SubmitTaskRequest(List.of(new SubmitTaskRequest.QuestionAnswer(3L, null, "Lý Thái Tổ")),
                LAT, LNG, null);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> journeyService.submitTask(50L, 5L, submit, 10L));
        assertEquals("QR-REQUIRED", ex.getCode());
    }

    @Test
    void activity_WrongQr_ShouldBeRejected() {
        stop.setCheckedIn(true);
        stubTasks(tourInfo(LAT, LNG));
        var submit = new SubmitTaskRequest(List.of(new SubmitTaskRequest.QuestionAnswer(3L, null, "Lý Thái Tổ")),
                null, null, "JGE-FFFFFFFFFFFFFFFF");

        BusinessException ex = assertThrows(BusinessException.class,
                () -> journeyService.submitTask(50L, 5L, submit, 10L));
        assertEquals("QR-INVALID", ex.getCode());
    }

    // ── Hoàn thành hành trình ─────────────────────────────────────────────────

    private void finishActivityLast(boolean quizAllCorrect) {
        stop.setCheckedIn(true);
        quizProgress.setStatus(TaskProgressStatus.COMPLETED);
        quizProgress.setIsCorrect(quizAllCorrect);
        stop.setTasksCompleted(1);
        stubTasks(tourInfo(LAT, LNG));
        var submit = new SubmitTaskRequest(List.of(new SubmitTaskRequest.QuestionAnswer(3L, null, "Lý Thái Tổ")),
                null, null, QR);
        journeyService.submitTask(50L, 5L, submit, 10L);
    }

    @Test
    void lastTask_AllCorrect_ShouldCompleteJourneyAsPerfectWithBonus() {
        finishActivityLast(true);

        assertEquals(JourneyStatus.COMPLETED, journey.getStatus());
        assertEquals("PERFECT", journey.completionRank());
        assertEquals(Journey.COMPLETION_BONUS_POINTS, journey.completionBonusPoints());
        verify(gamificationService).awardPoints(eq(10L), eq(Journey.COMPLETION_BONUS_POINTS), any(),
                eq("TOUR_COMPLETION_50"), anyString());
    }

    @Test
    void lastTask_QuizHadWrongAnswers_ShouldCompleteWithBonusButNotPerfect() {
        finishActivityLast(false);

        assertEquals(JourneyStatus.COMPLETED, journey.getStatus());
        assertEquals("COMPLETED", journey.completionRank());
        verify(gamificationService).awardPoints(eq(10L), eq(Journey.COMPLETION_BONUS_POINTS), any(),
                eq("TOUR_COMPLETION_50"), anyString());
    }

    @Test
    void skipLastDestination_ShouldCompleteJourneyWithoutBonus() {
        when(journeyRepository.findByIdWithDestinations(50L)).thenReturn(Optional.of(journey));
        when(destinationProgressRepository.findByJourneyIdAndDestinationId(50L, 7L)).thenReturn(Optional.of(stop));

        journeyService.skipDestination(50L, 7L, 10L);

        assertEquals(JourneyStatus.COMPLETED, journey.getStatus());
        assertEquals("PARTIAL", journey.completionRank());
        assertEquals(0, journey.completionBonusPoints());
        verify(gamificationService, never()).awardPoints(anyLong(), anyInt(), any(), anyString(), anyString());
    }
}
