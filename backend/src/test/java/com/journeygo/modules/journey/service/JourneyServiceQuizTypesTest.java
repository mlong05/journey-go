package com.journeygo.modules.journey.service;

import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.gamification.service.GamificationService;
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
import com.journeygo.modules.tour.service.TourService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Dạng câu đố văn hóa mới (xếp thứ tự, đoán số) và chế độ trả lời từng câu. */
@ExtendWith(MockitoExtension.class)
class JourneyServiceQuizTypesTest {

    private static final BigDecimal LAT = new BigDecimal("10.7769000");
    private static final BigDecimal LNG = new BigDecimal("106.6953000");
    /** Cách trạm khoảng 3 km. */
    private static final BigDecimal FAR_LAT = new BigDecimal("10.8040000");
    private static final String STOP_QR = "JGS-FEDCBA9876543210";

    @Mock private JourneyRepository journeyRepository;
    @Mock private JourneyDestinationProgressRepository destinationProgressRepository;
    @Mock private JourneyTaskProgressRepository taskProgressRepository;
    @Mock private TourInfoProvider tourInfoProvider;
    @Mock private GamificationService gamificationService;
    @Mock private TourService tourService;

    @InjectMocks private JourneyService journeyService;

    private Journey journey;
    private JourneyDestinationProgress stop;
    private JourneyTaskProgress quizProgress;

    /** Câu 1: xếp 3 mốc (10 điểm). Câu 2: đoán năm 1950–1980, đúng 1966 ±2 (15 điểm). */
    private TourInfo tourInfo() {
        var ordering = new TourInfo.QuestionInfo(1L, "Xếp các mốc theo thời gian", "ORDERING", 1, null,
                null, null, null, null, null,
                List.of(new TourInfo.AnswerInfo(31L, "Đặt đá Dinh Norodom", false, 1),
                        new TourInfo.AnswerInfo(32L, "Dinh bị ném bom", false, 2),
                        new TourInfo.AnswerInfo(33L, "Khánh thành dinh mới", false, 3)),
                10, true, "Dinh mới khánh thành năm 1966.", null);
        var number = new TourInfo.QuestionInfo(2L, "Dinh mới khánh thành năm nào?", "NUMBER", 2, null,
                null, null, null, null, null, List.of(),
                15, true, null, new TourInfo.NumberSpec(1950, 1980, 1966, 2));
        var quiz = new TourInfo.TourTaskInfo(-9L, "Câu đố tại Dinh", "QUIZ", 1, 25, 1, null, false,
                List.of(ordering, number), null, false, true);
        return new TourInfo(1L, "Sài Gòn xưa", List.of(new TourInfo.TourDestinationInfo(
                7L, "Dinh Độc Lập", 1, null, LAT, LNG, 150, STOP_QR, List.of(quiz))), true);
    }

    @BeforeEach
    void setUp() {
        journey = Journey.builder().id(50L).userId(10L).tourId(1L).tourName("Sài Gòn xưa")
                .status(JourneyStatus.IN_PROGRESS).currentDestinationOrder(1).totalDestinations(1)
                .destinations(new ArrayList<>()).build();
        stop = JourneyDestinationProgress.builder().id(200L).journey(journey).destinationId(7L)
                .destinationName("Dinh Độc Lập").orderIndex(1).status(DestinationProgressStatus.IN_PROGRESS)
                .checkedIn(true).tasksCompleted(0).totalTasks(1).tasks(new ArrayList<>()).build();
        quizProgress = JourneyTaskProgress.builder().id(300L).journey(journey).destinationProgress(stop)
                .taskId(-9L).taskName("Câu đố").taskType("QUIZ").orderIndex(1)
                .status(TaskProgressStatus.NOT_STARTED).attempts(0).pointsEarned(0).build();
        stop.addTask(quizProgress);
        journey.addDestination(stop);
        when(journeyRepository.findByIdWithDestinations(50L)).thenReturn(Optional.of(journey));
        when(taskProgressRepository.findByJourneyId(50L)).thenReturn(List.of(quizProgress));
        when(tourInfoProvider.getTourInfo(1L)).thenReturn(tourInfo());
    }

    private static SubmitTaskRequest orderingAnswer(Long... ids) {
        return new SubmitTaskRequest(List.of(new SubmitTaskRequest.QuestionAnswer(1L, null, null, List.of(ids), null)),
                null, null, null);
    }

    private static SubmitTaskRequest numberAnswer(int value, BigDecimal lat, BigDecimal lng) {
        return new SubmitTaskRequest(List.of(new SubmitTaskRequest.QuestionAnswer(2L, null, null, null, value)),
                lat, lng, null);
    }

    @Test
    void questions_OrderingIsShuffledWithoutOrderAndNumberHidesAnswer() {
        TaskQuestionsResponse content = journeyService.getTaskQuestions(50L, -9L, 10L, null, null, null);

        TaskQuestionsResponse.Question ordering = content.questions().get(0);
        List<Long> shown = ordering.options().stream().map(TaskQuestionsResponse.Option::id).toList();
        assertNotEquals(List.of(31L, 32L, 33L), shown);
        assertTrue(ordering.options().stream().allMatch(o -> o.orderIndex() == null));
        // Cố định theo câu hỏi: mở lại vẫn cùng thứ tự
        assertEquals(shown, journeyService.getTaskQuestions(50L, -9L, 10L, null, null, null)
                .questions().get(0).options().stream().map(TaskQuestionsResponse.Option::id).toList());

        TaskQuestionsResponse.Question number = content.questions().get(1);
        assertEquals(1950, number.numberMin());
        assertEquals(1980, number.numberMax());
        assertTrue(number.options().isEmpty());
    }

    @Test
    void answerQuestion_CorrectOrderShowsReviewAndKeepsTaskOpen() {
        JourneyTaskProgressResponse r = journeyService.answerQuestion(50L, -9L, 1L, orderingAnswer(31L, 32L, 33L), 10L);

        assertTrue(r.lastAnswerCorrect());
        assertEquals(TaskProgressStatus.IN_PROGRESS, r.status());
        assertEquals(1, r.questionIndex());
        assertEquals(List.of(31L, 32L, 33L), r.review().get(0).correctOrder());
        assertEquals("Dinh mới khánh thành năm 1966.", r.review().get(0).explanation());
        verify(gamificationService, never()).awardPoints(anyLong(), anyInt(), any(), anyString(), anyString());
    }

    @Test
    void answerQuestion_OutOfOrderIsRejected() {
        BusinessException ex = assertThrows(BusinessException.class,
                () -> journeyService.answerQuestion(50L, -9L, 2L, numberAnswer(1966, LAT, LNG), 10L));
        assertEquals("QUESTION-OUT-OF-ORDER", ex.getCode());
    }

    @Test
    void answerQuestion_DoesNotCheckLocation() {
        quizProgress.setCurrentQuestionIndex(1);

        // Câu đố không kiểm tra vị trí lúc trả lời (đã check-in trạm là đủ): ở xa vẫn trả lời được.
        JourneyTaskProgressResponse r = journeyService.answerQuestion(50L, -9L, 2L, numberAnswer(1966, FAR_LAT, LNG), 10L);
        assertTrue(r.lastAnswerCorrect());
    }

    @Test
    void answerQuestion_LastQuestionWithinToleranceCompletesWithAccumulatedPoints() {
        journeyService.answerQuestion(50L, -9L, 1L, orderingAnswer(31L, 32L, 33L), 10L);

        JourneyTaskProgressResponse r = journeyService.answerQuestion(50L, -9L, 2L, numberAnswer(1965, LAT, LNG), 10L);

        assertTrue(r.lastAnswerCorrect());
        assertEquals(TaskProgressStatus.COMPLETED, r.status());
        assertEquals(25, r.pointsEarned());
        assertEquals(1966, r.review().get(0).correctNumber());
        verify(gamificationService).awardPoints(eq(10L), eq(25), any(), anyString(), anyString());
    }

    @Test
    void answerQuestion_WrongOrderCountsZeroForThatQuestion() {
        JourneyTaskProgressResponse r = journeyService.answerQuestion(50L, -9L, 1L, orderingAnswer(32L, 31L, 33L), 10L);
        assertFalse(r.lastAnswerCorrect());
        assertFalse(r.review().get(0).correct());

        // Câu đoán năm lệch 5 năm (quá sai số ±2): xong nhiệm vụ với 0 điểm
        JourneyTaskProgressResponse last = journeyService.answerQuestion(50L, -9L, 2L, numberAnswer(1971, LAT, LNG), 10L);
        assertEquals(TaskProgressStatus.COMPLETED, last.status());
        assertEquals(0, last.pointsEarned());
        assertFalse(quizProgress.getIsCorrect());
    }
}
