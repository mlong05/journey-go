package com.journeygo.modules.journey.provider;

import java.math.BigDecimal;
import java.util.List;

/**
 * Ảnh chụp nội dung một Tour dùng cho hành trình của du khách: các điểm đến theo thứ tự,
 * nhiệm vụ đang phát hành của từng điểm, cùng câu hỏi và đáp án của từng nhiệm vụ.
 *
 * <p>Tour 5 bước ({@code wizard = true}): mỗi "điểm đến" là một điểm dừng riêng của tour
 * ({@code destinationId} = id điểm dừng), không cấp huy hiệu điểm đến; nhiệm vụ gồm một nhiệm vụ câu đố
 * (id âm = -id điểm dừng) và mỗi hoạt động thực địa là một nhiệm vụ cần vị trí (id = id hoạt động).
 */
public record TourInfo(
        Long tourId,
        String tourName,
        List<TourDestinationInfo> destinations,
        boolean wizard
) {

    public TourInfo(Long tourId, String tourName, List<TourDestinationInfo> destinations) {
        this(tourId, tourName, destinations, false);
    }

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
     * Một nhiệm vụ. Mặc định điểm thưởng nằm ở cấp nhiệm vụ: trả lời đúng toàn bộ câu hỏi thì nhận trọn
     * {@code points}, chưa đúng hết thì không có điểm và phải làm lại cả nhiệm vụ.
     * Nhiệm vụ cần vị trí ({@code requiresLocation}) đi theo từng câu hỏi: mỗi câu gắn với một địa điểm,
     * du khách check-in từng địa điểm theo thứ tự rồi mới trả lời câu đó.
     *
     * @param durationSeconds đếm ngược trước khi được quét QR (hoạt động thực địa của tour 5 bước)
     * @param qrRequired      chỉ mở câu hỏi khi quét đúng mã QR (GPS thôi chưa đủ)
     * @param perQuestionPoints nộp một lần, đúng câu nào cộng điểm câu đó ({@link QuestionInfo#points()})
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
            List<QuestionInfo> questions,
            Integer durationSeconds,
            boolean qrRequired,
            boolean perQuestionPoints
    ) {
        public TourTaskInfo(Long taskId, String taskName, String taskType, Integer orderIndex, Integer points,
                            Integer maxAttempts, String clue, boolean requiresLocation, List<QuestionInfo> questions) {
            this(taskId, taskName, taskType, orderIndex, points, maxAttempts, clue, requiresLocation, questions,
                    null, false, false);
        }
    }

    /**
     * Câu hỏi; các trường station* chỉ có với câu hỏi của nhiệm vụ cần vị trí.
     *
     * @param points       điểm của riêng câu này (nhiệm vụ chấm theo từng câu)
     * @param lenientText  câu tự luận chấm không phân biệt dấu / hoa thường, nhiều đáp án ngăn bởi ';'
     */
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
            Integer points,
            boolean lenientText
    ) {
        public QuestionInfo(Long questionId, String content, String questionType, Integer orderIndex,
                            String expectedText, String stationName, BigDecimal stationLatitude,
                            BigDecimal stationLongitude, Integer stationRadiusMeters, String stationQrToken,
                            List<AnswerInfo> answers) {
            this(questionId, content, questionType, orderIndex, expectedText, stationName, stationLatitude,
                    stationLongitude, stationRadiusMeters, stationQrToken, answers, null, false);
        }
    }

    public record AnswerInfo(
            Long answerId,
            String content,
            boolean correct,
            Integer orderIndex
    ) {}
}
