package com.journeygo.modules.journey.dto;

import com.journeygo.modules.journey.entity.JourneyTaskProgress;
import com.journeygo.modules.journey.entity.enums.TaskProgressStatus;
import lombok.Builder;

import java.time.Instant;
import java.util.List;

@Builder(toBuilder = true)
public record JourneyTaskProgressResponse(
        Long id,
        Long taskId,
        String taskName,
        String taskType,
        Integer orderIndex,
        TaskProgressStatus status,
        Integer pointsEarned,
        Integer attempts,
        Boolean isCorrect,
        Instant startedAt,
        Instant completedAt,
        // Kết quả của lần nộp bài vừa rồi (null khi chỉ xem tiến độ)
        Integer maxAttempts,
        Integer attemptsRemaining,
        Integer totalQuestions,
        Integer correctCount,
        // Nhiệm vụ đi theo từng địa điểm: số câu đã đúng trong lần làm hiện tại, và câu vừa nộp đúng hay sai
        Integer questionIndex,
        Boolean lastAnswerCorrect,
        /**
         * Xem lại từng câu sau khi nộp: chỉ có khi lần nộp này kết thúc nhiệm vụ (hoàn thành / hết lượt), hoặc
         * với nhiệm vụ đi từng trạm thì là câu vừa trả lời đúng — không bao giờ lộ đáp án khi còn được làm lại.
         */
        List<QuestionReview> review
) {
    /**
     * @param correctAnswerId trắc nghiệm: id đáp án đúng
     * @param correctText     tự luận: một đáp án được chấp nhận
     * @param explanation     giải thích ngắn do người soạn tour viết (có thể null)
     * @param correctOrder    xếp thứ tự: id các mục theo thứ tự đúng
     * @param correctNumber   đoán số: đáp án đúng
     * @param correctMatches  nối cột: các cặp đúng (id cột A → key cột B)
     */
    public record QuestionReview(Long questionId, boolean correct, Long correctAnswerId, String correctText,
                                 String explanation, List<Long> correctOrder, Integer correctNumber,
                                 List<SubmitTaskRequest.MatchPair> correctMatches) {
        public QuestionReview(Long questionId, boolean correct, Long correctAnswerId, String correctText,
                              String explanation) {
            this(questionId, correct, correctAnswerId, correctText, explanation, null, null, null);
        }
    }

    public static JourneyTaskProgressResponse fromEntity(JourneyTaskProgress entity) {
        return JourneyTaskProgressResponse.builder()
                .id(entity.getId())
                .taskId(entity.getTaskId())
                .taskName(entity.getTaskName())
                .taskType(entity.getTaskType())
                .orderIndex(entity.getOrderIndex())
                .status(entity.getStatus())
                .pointsEarned(entity.getPointsEarned())
                .attempts(entity.getAttempts())
                .isCorrect(entity.getIsCorrect())
                // Câu đang làm (câu đố trả lời từng câu: số câu đã trả lời) — app hiện "2/3 câu" khi làm dở
                .questionIndex(entity.getCurrentQuestionIndex())
                .startedAt(entity.getStartedAt())
                .completedAt(entity.getCompletedAt())
                .build();
    }
}
