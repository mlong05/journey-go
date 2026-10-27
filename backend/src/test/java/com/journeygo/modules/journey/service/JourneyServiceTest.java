package com.journeygo.modules.journey.service;

import com.journeygo.modules.experience.entity.enums.CheckInVerificationMethod;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.gamification.entity.Badge;
import com.journeygo.modules.gamification.entity.UserBadge;
import com.journeygo.modules.gamification.entity.enums.BadgeType;
import com.journeygo.modules.gamification.service.GamificationService;
import com.journeygo.modules.journey.dto.*;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JourneyServiceTest {

    @Mock
    private JourneyRepository journeyRepository;

    @Mock
    private JourneyDestinationProgressRepository destinationProgressRepository;

    @Mock
    private JourneyTaskProgressRepository taskProgressRepository;

    @Mock
    private TourInfoProvider tourInfoProvider;

    @Mock
    private GamificationService gamificationService;

    @InjectMocks
    private JourneyService journeyService;

    private TourInfo sampleTourInfo;
    private Journey sampleJourney;
    private JourneyDestinationProgress sampleDestProgress;
    private JourneyTaskProgress sampleTaskProgress;

    @BeforeEach
    void setUp() {
        TourInfo.TourTaskInfo taskInfo = quizTask();

        TourInfo.TourDestinationInfo destInfo = new TourInfo.TourDestinationInfo(
                101L,
                "Chùa Thiên Mụ",
                1,
                201L,
                new BigDecimal("16.4526000"),
                new BigDecimal("107.5458000"),
                100,
                "QR_THIEN_MU",
                List.of(taskInfo)
        );

        sampleTourInfo = new TourInfo(1L, "Huế Thân Thương", List.of(destInfo));

        sampleJourney = Journey.builder()
                .id(50L)
                .userId(10L)
                .tourId(1L)
                .tourName("Huế Thân Thương")
                .status(JourneyStatus.IN_PROGRESS)
                .currentDestinationOrder(1)
                .totalDestinations(1)
                .destinations(new ArrayList<>())
                .build();

        sampleDestProgress = JourneyDestinationProgress.builder()
                .id(200L)
                .journey(sampleJourney)
                .destinationId(101L)
                .destinationName("Chùa Thiên Mụ")
                .orderIndex(1)
                .experienceId(201L)
                .status(DestinationProgressStatus.IN_PROGRESS)
                .checkedIn(false)
                .tasksCompleted(0)
                .totalTasks(1)
                .tasks(new ArrayList<>())
                .build();

        sampleTaskProgress = JourneyTaskProgress.builder()
                .id(300L)
                .journey(sampleJourney)
                .destinationProgress(sampleDestProgress)
                .taskId(1001L)
                .taskName("Quiz Chùa Thiên Mụ")
                .taskType("QUIZ")
                .orderIndex(1)
                .status(TaskProgressStatus.NOT_STARTED)
                .attempts(0)
                .pointsEarned(0)
                .build();

        sampleDestProgress.addTask(sampleTaskProgress);
        sampleJourney.addDestination(sampleDestProgress);
    }

    @Test
    void startJourney_WhenNoActive_ShouldCreateNewJourney() {
        StartJourneyRequest request = new StartJourneyRequest(999L, 1L);

        when(journeyRepository.findFirstByUserIdAndTourIdAndStatusInOrderByCreatedAtDesc(eq(10L), eq(1L), anyList()))
                .thenReturn(Optional.empty());
        when(tourInfoProvider.getTourInfo(1L)).thenReturn(sampleTourInfo);
        when(journeyRepository.save(any(Journey.class))).thenAnswer(invocation -> {
            Journey j = invocation.getArgument(0);
            j.setId(50L);
            return j;
        });

        JourneyResponse response = journeyService.startJourney(10L, request);

        assertNotNull(response);
        assertEquals("Huế Thân Thương", response.tourName());
        assertEquals(JourneyStatus.IN_PROGRESS, response.status());
        verify(journeyRepository).save(any(Journey.class));
    }

    @Test
    void startJourney_WhenActiveExists_ShouldResumeExisting() {
        StartJourneyRequest request = new StartJourneyRequest(999L, 1L);

        when(journeyRepository.findFirstByUserIdAndTourIdAndStatusInOrderByCreatedAtDesc(eq(10L), eq(1L), anyList()))
                .thenReturn(Optional.of(sampleJourney));

        JourneyResponse response = journeyService.startJourney(10L, request);

        assertNotNull(response);
        assertEquals(50L, response.id());
        verify(journeyRepository, never()).save(any(Journey.class));
    }

    @Test
    void checkInDestination_WhenValidGPS_ShouldSucceed() {
        CheckInJourneyRequest req = new CheckInJourneyRequest(
                CheckInVerificationMethod.GPS,
                new BigDecimal("16.4526000"), // đúng ngay tọa độ
                new BigDecimal("107.5458000"),
                null
        );

        Badge badge = Badge.builder().id(7L).code("BADGE_1").name("Dấu chân Thiên Mụ").iconUrl("url").build();
        UserBadge userBadge = UserBadge.builder().id(8L).userId(10L).badge(badge).build();

        when(journeyRepository.findByIdWithDestinations(50L)).thenReturn(Optional.of(sampleJourney));
        when(destinationProgressRepository.findByJourneyIdAndDestinationId(50L, 101L))
                .thenReturn(Optional.of(sampleDestProgress));
        when(tourInfoProvider.getTourInfo(1L)).thenReturn(sampleTourInfo);
        when(gamificationService.awardCheckInBadge(eq(10L), eq(101L), anyString(), eq(50L)))
                .thenReturn(userBadge);

        CheckInResultResponse result = journeyService.checkInDestination(50L, 101L, req, 10L);

        assertTrue(result.success());
        assertTrue(result.badgeAwarded());
        assertEquals(7L, result.badgeId());
        assertTrue(sampleDestProgress.isCheckedIn());
        verify(destinationProgressRepository).save(sampleDestProgress);
    }

    @Test
    void checkInDestination_WhenOutOfRange_ShouldThrowException() {
        CheckInJourneyRequest req = new CheckInJourneyRequest(
                CheckInVerificationMethod.GPS,
                new BigDecimal("21.0277000"), // Tọa độ Hà Nội trong khi điểm đến ở Huế
                new BigDecimal("105.8351000"),
                null
        );

        when(journeyRepository.findByIdWithDestinations(50L)).thenReturn(Optional.of(sampleJourney));
        when(destinationProgressRepository.findByJourneyIdAndDestinationId(50L, 101L))
                .thenReturn(Optional.of(sampleDestProgress));
        when(tourInfoProvider.getTourInfo(1L)).thenReturn(sampleTourInfo);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                journeyService.checkInDestination(50L, 101L, req, 10L)
        );

        assertEquals("GPS-OUT-OF-RANGE", ex.getCode());
        assertFalse(sampleDestProgress.isCheckedIn());
    }

    // ── Dữ liệu mẫu ──────────────────────────────────────────────────────────

    /** Nhiệm vụ quiz 10 điểm, 2 lần làm, gồm 1 câu trắc nghiệm (đáp án đúng id 12) và 1 câu tự luận. */
    private TourInfo.TourTaskInfo quizTask() {
        TourInfo.QuestionInfo mc = new TourInfo.QuestionInfo(11L, "Chùa Thiên Mụ nằm bên sông nào?", "MULTIPLE_CHOICE", 0, null,
                null, null, null, null, null,
                List.of(new TourInfo.AnswerInfo(13L, "Sông Hồng", false, 0),
                        new TourInfo.AnswerInfo(12L, "Sông Hương", true, 1)));
        TourInfo.QuestionInfo text = new TourInfo.QuestionInfo(21L, "Tên ngôi chùa là gì?", "TEXT", 1, "Thiên Mụ",
                null, null, null, null, null, List.of());
        return new TourInfo.TourTaskInfo(
                1001L, "Quiz Chùa Thiên Mụ", "QUIZ", 1, 10, 2,
                null, false,
                List.of(mc, text));
    }

    /** Nhiệm vụ tương tác ngoài thực tế: câu 1 ở địa điểm A, câu 2 ở địa điểm B (mỗi nơi bán kính 50m). */
    private TourInfo.TourTaskInfo fieldTask() {
        TourInfo.QuestionInfo atA = new TourInfo.QuestionInfo(31L, "Mật mã trên chuông là gì?", "TEXT", 0, "Phuoc Duyen",
                "Địa điểm A", new BigDecimal("16.4526000"), new BigDecimal("107.5458000"), 50, "QR_A", List.of());
        TourInfo.QuestionInfo atB = new TourInfo.QuestionInfo(32L, "Tên vị vua xây tháp là gì?", "TEXT", 1, "Truong Thi",
                "Địa điểm B", new BigDecimal("16.4600000"), new BigDecimal("107.5500000"), 50, "QR_B", List.of());
        return new TourInfo.TourTaskInfo(
                1002L, "Mật mã chuông đồng", "REAL_WORLD_INTERACTIVE", 2, 20, 3,
                "Giải mật mã", true,
                List.of(atA, atB));
    }

    private void tourWith(TourInfo.TourTaskInfo... tasks) {
        TourInfo.TourDestinationInfo dest = new TourInfo.TourDestinationInfo(
                101L, "Chùa Thiên Mụ", 1, 201L,
                new BigDecimal("16.4526000"), new BigDecimal("107.5458000"), 100, "QR_THIEN_MU",
                List.of(tasks));
        sampleTourInfo = new TourInfo(1L, "Huế", List.of(dest));
    }

    private JourneyTaskProgress fieldProgress() {
        return JourneyTaskProgress.builder()
                .id(301L).journey(sampleJourney).destinationProgress(sampleDestProgress)
                .taskId(1002L).taskName("Mật mã chuông đồng").taskType("REAL_WORLD_INTERACTIVE")
                .orderIndex(2).status(TaskProgressStatus.NOT_STARTED).attempts(0).pointsEarned(0)
                .build();
    }

    private SubmitTaskRequest answers(Long mcAnswerId, String text) {
        return new SubmitTaskRequest(
                List.of(new SubmitTaskRequest.QuestionAnswer(11L, mcAnswerId, null),
                        new SubmitTaskRequest.QuestionAnswer(21L, null, text)),
                null, null, null);
    }

    private void stubJourney(JourneyTaskProgress... progresses) {
        when(journeyRepository.findByIdWithDestinations(50L)).thenReturn(Optional.of(sampleJourney));
        when(taskProgressRepository.findByJourneyId(50L)).thenReturn(List.of(progresses));
        when(tourInfoProvider.getTourInfo(1L)).thenReturn(sampleTourInfo);
    }

    // ── Chấm bài cả nhiệm vụ ─────────────────────────────────────────────────

    @Test
    void submitTask_WhenAllQuestionsCorrect_ShouldCompleteAndAwardTaskPointsOnce() {
        sampleDestProgress.setCheckedIn(true);
        stubJourney(sampleTaskProgress);

        JourneyTaskProgressResponse response =
                journeyService.submitTask(50L, 1001L, answers(12L, "  thiên   mụ "), 10L);

        assertEquals(TaskProgressStatus.COMPLETED, response.status());
        assertTrue(response.isCorrect());
        assertEquals(10, response.pointsEarned());
        assertEquals(2, response.totalQuestions());
        assertEquals(2, response.correctCount());
        verify(gamificationService, times(1)).awardPoints(eq(10L), eq(10), any(), anyString(), anyString());
    }

    @Test
    void submitTask_WhenOneQuestionWrong_ShouldGiveNoPointsAndAllowRetryOfWholeTask() {
        sampleDestProgress.setCheckedIn(true);
        stubJourney(sampleTaskProgress);

        JourneyTaskProgressResponse response =
                journeyService.submitTask(50L, 1001L, answers(12L, "Sai rồi"), 10L);

        assertEquals(TaskProgressStatus.IN_PROGRESS, response.status());
        assertFalse(response.isCorrect());
        assertEquals(0, response.pointsEarned());
        assertEquals(1, response.correctCount());
        assertEquals(2, response.totalQuestions());
        assertEquals(1, response.attempts());
        assertEquals(1, response.attemptsRemaining());
        verify(gamificationService, never()).awardPoints(anyLong(), anyInt(), any(), anyString(), anyString());
    }

    @Test
    void submitTask_WhenQuestionLeftUnanswered_ShouldCountAsWrong() {
        sampleDestProgress.setCheckedIn(true);
        stubJourney(sampleTaskProgress);

        SubmitTaskRequest onlyFirst = new SubmitTaskRequest(
                List.of(new SubmitTaskRequest.QuestionAnswer(11L, 12L, null)), null, null, null);

        JourneyTaskProgressResponse response = journeyService.submitTask(50L, 1001L, onlyFirst, 10L);

        assertFalse(response.isCorrect());
        assertEquals(1, response.correctCount());
        verify(gamificationService, never()).awardPoints(anyLong(), anyInt(), any(), anyString(), anyString());
    }

    @Test
    void submitTask_WhenAttemptsExhausted_ShouldFailTaskAndRejectFurtherSubmissions() {
        sampleDestProgress.setCheckedIn(true);
        stubJourney(sampleTaskProgress);

        journeyService.submitTask(50L, 1001L, answers(13L, "x"), 10L);
        JourneyTaskProgressResponse second = journeyService.submitTask(50L, 1001L, answers(13L, "x"), 10L);

        assertEquals(TaskProgressStatus.FAILED, second.status());
        assertEquals(0, second.attemptsRemaining());
        assertEquals(0, second.pointsEarned());

        BusinessException ex = assertThrows(BusinessException.class, () ->
                journeyService.submitTask(50L, 1001L, answers(12L, "Thiên Mụ"), 10L));
        assertEquals("TASK-ATTEMPTS-EXHAUSTED", ex.getCode());
        verify(gamificationService, never()).awardPoints(eq(10L), eq(10), any(), anyString(), anyString());
    }

    @Test
    void submitTask_WhenAlreadyCompleted_ShouldNotAwardAgain() {
        sampleDestProgress.setCheckedIn(true);
        sampleTaskProgress.setStatus(TaskProgressStatus.COMPLETED);
        sampleTaskProgress.setPointsEarned(10);
        when(journeyRepository.findByIdWithDestinations(50L)).thenReturn(Optional.of(sampleJourney));
        when(taskProgressRepository.findByJourneyId(50L)).thenReturn(List.of(sampleTaskProgress));

        JourneyTaskProgressResponse response = journeyService.submitTask(50L, 1001L, answers(12L, "Thiên Mụ"), 10L);

        assertEquals(TaskProgressStatus.COMPLETED, response.status());
        verify(gamificationService, never()).awardPoints(anyLong(), anyInt(), any(), anyString(), anyString());
    }

    @Test
    void submitTask_WhenNotCheckedIn_ShouldThrowException() {
        sampleDestProgress.setCheckedIn(false);
        when(journeyRepository.findByIdWithDestinations(50L)).thenReturn(Optional.of(sampleJourney));
        when(taskProgressRepository.findByJourneyId(50L)).thenReturn(List.of(sampleTaskProgress));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                journeyService.submitTask(50L, 1001L, answers(12L, "Thiên Mụ"), 10L));

        assertEquals("DEST-NOT-CHECKED-IN", ex.getCode());
    }

    @Test
    void getPuzzleClue_WhenCheckedIn_ShouldReturnClueDetails() {
        sampleDestProgress.setCheckedIn(true);
        stubJourney(sampleTaskProgress);

        PuzzleClueResponse response = journeyService.getPuzzleClue(50L, 1001L, 10L);

        assertNotNull(response);
        assertEquals(1001L, response.taskId());
        assertFalse(response.completed());
    }

    // ── Nhiệm vụ tương tác ngoài thực tế: mỗi câu hỏi một địa điểm, đi lần lượt A rồi B ──────

    private SubmitTaskRequest fieldAnswer(Long questionId, String text, String lat, String lng, String qr) {
        return new SubmitTaskRequest(
                List.of(new SubmitTaskRequest.QuestionAnswer(questionId, null, text)),
                lat == null ? null : new BigDecimal(lat), lng == null ? null : new BigDecimal(lng), qr);
    }

    @Test
    void submitTask_WhenFieldTaskNotAtCurrentQuestionPlace_ShouldThrowException() {
        tourWith(fieldTask());
        sampleDestProgress.setCheckedIn(true);
        stubJourney(fieldProgress());

        // Đứng ở Hà Nội, xa địa điểm A
        BusinessException ex = assertThrows(BusinessException.class, () ->
                journeyService.submitTask(50L, 1002L, fieldAnswer(31L, "Phuoc Duyen", "21.0277000", "105.8351000", null), 10L));

        assertEquals("GPS-OUT-OF-PUZZLE-ZONE", ex.getCode());
    }

    @Test
    void submitTask_WhenAnswerAtPlaceA_ShouldMoveOnToPlaceBWithoutPoints() {
        tourWith(fieldTask());
        sampleDestProgress.setCheckedIn(true);
        JourneyTaskProgress progress = fieldProgress();
        stubJourney(progress);

        JourneyTaskProgressResponse response = journeyService.submitTask(
                50L, 1002L, fieldAnswer(31L, "phuoc duyen", "16.4526000", "107.5458000", null), 10L);

        assertEquals(TaskProgressStatus.IN_PROGRESS, response.status());
        assertTrue(response.lastAnswerCorrect());
        assertEquals(1, response.questionIndex());
        assertEquals(2, response.totalQuestions());
        assertEquals(1, progress.getCurrentQuestionIndex());
        verify(gamificationService, never()).awardPoints(anyLong(), anyInt(), any(), anyString(), anyString());
    }

    @Test
    void submitTask_WhenAnsweringQuestionOfPlaceBBeforeA_ShouldBeRejected() {
        tourWith(fieldTask());
        sampleDestProgress.setCheckedIn(true);
        stubJourney(fieldProgress());

        // Đang ở câu A (31) nhưng gửi câu B (32) dù đã đứng đúng địa điểm B
        BusinessException ex = assertThrows(BusinessException.class, () ->
                journeyService.submitTask(50L, 1002L, fieldAnswer(32L, "Truong Thi", "16.4600000", "107.5500000", null), 10L));

        assertEquals("ANSWER-MISSING", ex.getCode());
    }

    @Test
    void submitTask_WhenBothPlacesAnsweredInOrder_ShouldCompleteAndAwardTaskPointsOnce() {
        tourWith(fieldTask());
        sampleDestProgress.setCheckedIn(true);
        stubJourney(fieldProgress());

        journeyService.submitTask(50L, 1002L, fieldAnswer(31L, "Phuoc Duyen", "16.4526000", "107.5458000", null), 10L);
        JourneyTaskProgressResponse done = journeyService.submitTask(
                50L, 1002L, fieldAnswer(32L, "Truong Thi", "16.4600000", "107.5500000", null), 10L);

        assertEquals(TaskProgressStatus.COMPLETED, done.status());
        assertEquals(20, done.pointsEarned());
        verify(gamificationService, times(1)).awardPoints(eq(10L), eq(20), any(), anyString(), anyString());
    }

    @Test
    void submitTask_WhenWrongAtPlaceB_ShouldRestartWholeTaskFromPlaceA() {
        tourWith(fieldTask());
        sampleDestProgress.setCheckedIn(true);
        JourneyTaskProgress progress = fieldProgress();
        stubJourney(progress);

        journeyService.submitTask(50L, 1002L, fieldAnswer(31L, "Phuoc Duyen", "16.4526000", "107.5458000", null), 10L);
        JourneyTaskProgressResponse failed = journeyService.submitTask(
                50L, 1002L, fieldAnswer(32L, "sai", "16.4600000", "107.5500000", null), 10L);

        assertEquals(TaskProgressStatus.IN_PROGRESS, failed.status());
        assertFalse(failed.lastAnswerCorrect());
        assertEquals(0, failed.questionIndex());
        assertEquals(0, progress.getCurrentQuestionIndex());
        assertEquals(1, failed.attempts());
        assertEquals(2, failed.attemptsRemaining());
        verify(gamificationService, never()).awardPoints(anyLong(), anyInt(), any(), anyString(), anyString());
    }

    @Test
    void submitTask_WhenScannedQrOfCurrentPlace_ShouldUnlockWithoutGps() {
        tourWith(fieldTask());
        sampleDestProgress.setCheckedIn(true);
        stubJourney(fieldProgress());

        JourneyTaskProgressResponse response = journeyService.submitTask(
                50L, 1002L, fieldAnswer(31L, "Phuoc Duyen", null, null, "qr_a"), 10L);

        assertTrue(response.lastAnswerCorrect());
        assertEquals(1, response.questionIndex());
    }

    @Test
    void submitTask_WhenScannedQrOfAnotherPlace_ShouldThrowException() {
        tourWith(fieldTask());
        sampleDestProgress.setCheckedIn(true);
        stubJourney(fieldProgress());

        // Đang ở câu A nhưng quét mã của địa điểm B
        BusinessException ex = assertThrows(BusinessException.class, () ->
                journeyService.submitTask(50L, 1002L, fieldAnswer(31L, "Phuoc Duyen", null, null, "QR_B"), 10L));

        assertEquals("QR-INVALID", ex.getCode());
    }

    @Test
    void getTaskQuestions_WhenFieldTaskNotAtCurrentPlace_ShouldHideQuestionAndShowNextPlace() {
        tourWith(fieldTask());
        sampleDestProgress.setCheckedIn(true);
        stubJourney(fieldProgress());

        TaskQuestionsResponse response = journeyService.getTaskQuestions(
                50L, 1002L, 10L, new BigDecimal("21.0277000"), new BigDecimal("105.8351000"), null);

        assertTrue(response.sequential());
        assertFalse(response.unlocked());
        assertNull(response.questions());
        assertEquals("Địa điểm A", response.station().name());
        assertEquals(0, response.questionIndex());
        assertEquals(2, response.totalQuestions());
    }

    @Test
    void getTaskQuestions_WhenAtCurrentPlace_ShouldShowOnlyThatQuestion() {
        tourWith(fieldTask());
        sampleDestProgress.setCheckedIn(true);
        stubJourney(fieldProgress());

        TaskQuestionsResponse response = journeyService.getTaskQuestions(
                50L, 1002L, 10L, new BigDecimal("16.4526000"), new BigDecimal("107.5458000"), null);

        assertTrue(response.unlocked());
        assertEquals(1, response.questions().size());
        assertEquals(31L, response.questions().get(0).id());
    }

    @Test
    void getTaskQuestions_WhenNoLocationRequired_ShouldShowAllQuestionsWithoutAnswerKey() {
        tourWith(quizTask());
        sampleDestProgress.setCheckedIn(true);
        stubJourney(sampleTaskProgress);

        TaskQuestionsResponse response = journeyService.getTaskQuestions(50L, 1001L, 10L, null, null, null);

        assertFalse(response.sequential());
        assertTrue(response.unlocked());
        assertEquals(2, response.questions().size());
        assertEquals(2, response.questions().get(0).options().size());
        assertTrue(response.questions().get(1).options().isEmpty());
        assertEquals(2, response.attemptsRemaining());
    }
}
