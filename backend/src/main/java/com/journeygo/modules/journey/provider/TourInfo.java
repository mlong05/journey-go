package com.journeygo.modules.journey.provider;

import java.math.BigDecimal;
import java.util.List;

/**
 * Ảnh chụp nội dung một Tour dùng cho hành trình của du khách: các điểm đến theo thứ tự,
 * nhiệm vụ đang phát hành của từng điểm, cùng câu hỏi và đáp án của từng nhiệm vụ.
 */
public record TourInfo(
        Long tourId,
        String tourName,
        List<TourDestinationInfo> destinations
) {

    public record TourDestinationInfo(
            Long destinationId,
            String destinationName,
            Integer orderIndex,
            Long experienceId,
            BigDecimal latitude,
            BigDecimal longitude,
            Integer radiusMeters,
            String qrToken,
            List<TourTaskInfo> tasks
    ) {}

    /**
     * Một nhiệm vụ. Điểm thưởng nằm ở cấp nhiệm vụ: trả lời đúng toàn bộ câu hỏi thì nhận trọn
     * {@code points}, chưa đúng hết thì không có điểm và phải làm lại cả nhiệm vụ.
     * Nhiệm vụ cần vị trí ({@code requiresLocation}) đi theo từng câu hỏi: mỗi câu gắn với một địa điểm,
     * du khách check-in từng địa điểm theo thứ tự rồi mới trả lời câu đó.
     */
    public record TourTaskInfo(
            Long taskId,
            String taskName,
            String taskType,
            Integer orderIndex,
            Integer points,
            Integer maxAttempts,
            String clue,
            boolean requiresLocation,
            boolean freeOrder,
            List<QuestionInfo> questions
    ) {}

    /** Câu hỏi; các trường station* chỉ có với câu hỏi của nhiệm vụ cần vị trí. */
    public record QuestionInfo(
            Long questionId,
            String content,
            String questionType,
            Integer orderIndex,
            String expectedText,
            String stationName,
            BigDecimal stationLatitude,
            BigDecimal stationLongitude,
            Integer stationRadiusMeters,
            String stationQrToken,
            List<AnswerInfo> answers,
            String imageUrl
    ) {}

    public record AnswerInfo(
            Long answerId,
            String content,
            boolean correct,
            Integer orderIndex,
            String imageUrl
    ) {}
}
