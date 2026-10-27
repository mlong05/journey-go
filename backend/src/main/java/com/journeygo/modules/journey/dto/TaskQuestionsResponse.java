package com.journeygo.modules.journey.dto;

import com.journeygo.modules.journey.entity.enums.TaskProgressStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;

/**
 * Nội dung nhiệm vụ dành cho du khách. Không bao giờ chứa đáp án đúng.
 * Nhiệm vụ cần vị trí ({@code sequential = true}) đi theo từng câu: {@code questions} chỉ chứa câu hiện tại và chỉ khi
 * {@code unlocked = true} (đã đứng trong bán kính của địa điểm câu đó hoặc quét đúng mã QR);
 * {@code station} là địa điểm của câu hiện tại để dẫn đường.
 */
@Builder
public record TaskQuestionsResponse(
        Long taskId,
        String taskName,
        String taskType,
        String description,
        Integer pointsReward,
        Integer maxAttempts,
        Integer attempts,
        Integer attemptsRemaining,
        TaskProgressStatus status,
        boolean requiresLocation,
        boolean sequential,
        Integer questionIndex,
        Integer totalQuestions,
        boolean unlocked,
        Station station,
        Integer distanceMeters,
        List<Question> questions
) {
    public record Station(String name, BigDecimal latitude, BigDecimal longitude, Integer radiusMeters) {}

    public record Question(Long id, String content, String questionType, Integer orderIndex, List<Option> options) {}

    public record Option(Long id, String content, Integer orderIndex) {}
}
