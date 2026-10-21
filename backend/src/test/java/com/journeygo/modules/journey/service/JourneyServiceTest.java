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
        TourInfo.TourTaskInfo taskInfo = new TourInfo.TourTaskInfo(
                1001L, "Quiz Chùa Thiên Mụ", "QUIZ", 1, 10, "B"
        );

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

    @Test
    void submitTask_WhenCorrectAnswer_ShouldCompleteTaskAndAwardPoints() {
        SubmitTaskRequest req = new SubmitTaskRequest("B", null, null);
        sampleDestProgress.setCheckedIn(true);

        when(journeyRepository.findByIdWithDestinations(50L)).thenReturn(Optional.of(sampleJourney));
        when(taskProgressRepository.findByJourneyId(50L)).thenReturn(List.of(sampleTaskProgress));
        when(tourInfoProvider.getTourInfo(1L)).thenReturn(sampleTourInfo);

        JourneyTaskProgressResponse response = journeyService.submitTask(50L, 1001L, req, 10L);

        assertNotNull(response);
        assertEquals(TaskProgressStatus.COMPLETED, response.status());
        assertTrue(response.isCorrect());
        assertEquals(10, response.pointsEarned());
        verify(gamificationService).awardPoints(eq(10L), eq(10), any(), anyString(), anyString());
    }

    @Test
    void submitTask_WhenNotCheckedIn_ShouldThrowException() {
        SubmitTaskRequest req = new SubmitTaskRequest("B", null, null);
        sampleDestProgress.setCheckedIn(false);

        when(journeyRepository.findByIdWithDestinations(50L)).thenReturn(Optional.of(sampleJourney));
        when(taskProgressRepository.findByJourneyId(50L)).thenReturn(List.of(sampleTaskProgress));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                journeyService.submitTask(50L, 1001L, req, 10L)
        );

        assertEquals("DEST-NOT-CHECKED-IN", ex.getCode());
    }

    @Test
    void getPuzzleClue_WhenCheckedIn_ShouldReturnClueDetails() {
        sampleDestProgress.setCheckedIn(true);

        when(journeyRepository.findByIdWithDestinations(50L)).thenReturn(Optional.of(sampleJourney));
        when(taskProgressRepository.findByJourneyId(50L)).thenReturn(List.of(sampleTaskProgress));
        when(tourInfoProvider.getTourInfo(1L)).thenReturn(sampleTourInfo);

        PuzzleClueResponse response = journeyService.getPuzzleClue(50L, 1001L, 10L);

        assertNotNull(response);
        assertEquals(1001L, response.taskId());
        assertFalse(response.completed());
    }

    @Test
    void submitTask_WhenGPSPuzzleOutOfRange_ShouldThrowException() {
        TourInfo.TourTaskInfo puzzleTaskInfo = new TourInfo.TourTaskInfo(
                1002L, "Mật mã chuông đồng", "REAL_WORLD_INTERACTIVE", 2, 20, "PHUOC DUYEN",
                "Giải mật mã", new BigDecimal("16.4526000"), new BigDecimal("107.5458000"), 50, "Gợi ý"
        );

        TourInfo.TourDestinationInfo destInfoWithPuzzle = new TourInfo.TourDestinationInfo(
                101L, "Chùa Thiên Mụ", 1, 201L,
                new BigDecimal("16.4526000"), new BigDecimal("107.5458000"), 100, "QR",
                List.of(puzzleTaskInfo)
        );

        TourInfo puzzleTourInfo = new TourInfo(1L, "Huế", List.of(destInfoWithPuzzle));

        JourneyTaskProgress puzzleProgress = JourneyTaskProgress.builder()
                .id(301L)
                .journey(sampleJourney)
                .destinationProgress(sampleDestProgress)
                .taskId(1002L)
                .taskName("Mật mã chuông đồng")
                .taskType("REAL_WORLD_INTERACTIVE")
                .orderIndex(2)
                .status(TaskProgressStatus.NOT_STARTED)
                .attempts(0)
                .build();

        sampleDestProgress.setCheckedIn(true);

        // Khách ở Hà Nội thay vì ở Huế
        SubmitTaskRequest req = new SubmitTaskRequest("PHUOC DUYEN", new BigDecimal("21.0277000"), new BigDecimal("105.8351000"));

        when(journeyRepository.findByIdWithDestinations(50L)).thenReturn(Optional.of(sampleJourney));
        when(taskProgressRepository.findByJourneyId(50L)).thenReturn(List.of(puzzleProgress));
        when(tourInfoProvider.getTourInfo(1L)).thenReturn(puzzleTourInfo);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                journeyService.submitTask(50L, 1002L, req, 10L)
        );

        assertEquals("GPS-OUT-OF-PUZZLE-ZONE", ex.getCode());
    }

    @Test
    void submitTask_WhenGPSPuzzleWithinRangeAndCorrect_ShouldComplete() {
        TourInfo.TourTaskInfo puzzleTaskInfo = new TourInfo.TourTaskInfo(
                1002L, "Mật mã chuông đồng", "REAL_WORLD_INTERACTIVE", 2, 20, "PHUOC DUYEN",
                "Giải mật mã", new BigDecimal("16.4526000"), new BigDecimal("107.5458000"), 50, "Gợi ý"
        );

        TourInfo.TourDestinationInfo destInfoWithPuzzle = new TourInfo.TourDestinationInfo(
                101L, "Chùa Thiên Mụ", 1, 201L,
                new BigDecimal("16.4526000"), new BigDecimal("107.5458000"), 100, "QR",
                List.of(puzzleTaskInfo)
        );

        TourInfo puzzleTourInfo = new TourInfo(1L, "Huế", List.of(destInfoWithPuzzle));

        JourneyTaskProgress puzzleProgress = JourneyTaskProgress.builder()
                .id(301L)
                .journey(sampleJourney)
                .destinationProgress(sampleDestProgress)
                .taskId(1002L)
                .taskName("Mật mã chuông đồng")
                .taskType("REAL_WORLD_INTERACTIVE")
                .orderIndex(2)
                .status(TaskProgressStatus.NOT_STARTED)
                .attempts(0)
                .build();

        sampleDestProgress.setCheckedIn(true);

        // Khách đứng đúng tọa độ Chùa Thiên Mụ
        SubmitTaskRequest req = new SubmitTaskRequest("PHUOC DUYEN", new BigDecimal("16.4526000"), new BigDecimal("107.5458000"));

        when(journeyRepository.findByIdWithDestinations(50L)).thenReturn(Optional.of(sampleJourney));
        when(taskProgressRepository.findByJourneyId(50L)).thenReturn(List.of(puzzleProgress));
        when(tourInfoProvider.getTourInfo(1L)).thenReturn(puzzleTourInfo);

        JourneyTaskProgressResponse response = journeyService.submitTask(50L, 1002L, req, 10L);

        assertNotNull(response);
        assertEquals(TaskProgressStatus.COMPLETED, response.status());
        assertTrue(response.isCorrect());
        assertEquals(20, response.pointsEarned());
        verify(gamificationService).awardPoints(eq(10L), eq(20), any(), anyString(), anyString());
    }
}

