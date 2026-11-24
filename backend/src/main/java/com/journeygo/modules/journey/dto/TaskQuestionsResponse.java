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
        // Mọi trạm của nhiệm vụ theo thứ tự câu hỏi; trạm chưa tới lượt chỉ có tên, không có tọa độ
        List<Station> stations,
        Integer distanceMeters,
        List<Question> questions,
        // Hoạt động thực địa (tour 5 bước): đếm ngược bao lâu trước khi được quét QR
        Integer durationSeconds,
        // true: câu hỏi chỉ mở khi quét đúng mã QR tại điểm (GPS không đủ)
        boolean qrRequired,
        // true: nộp một lần, đúng câu nào cộng điểm câu đó
        boolean perQuestionPoints,
        // Câu đố trả lời từng câu đang làm dở: số câu đã đúng + điểm tạm tính tới câu đã trả lời
        // (app hiện "Đã trả lời 2/3 câu · đúng 2 · +20 điểm" và nút "Tiếp tục từ câu 3")
        Integer correctCount,
        Integer pointsSoFar
) {
    public record Station(String name, BigDecimal latitude, BigDecimal longitude, Integer radiusMeters) {}

    /**
     * @param numberMin    câu NUMBER: giá trị nhỏ nhất của thanh trượt (không bao giờ kèm đáp án đúng)
     * @param matchOptions câu MATCHING: các mục cột B đã xáo trộn, mỗi mục có key riêng (không lộ cặp đúng);
     *                     {@code options} là cột A theo thứ tự đối tác nhập
     */
    public record Question(Long id, String content, String questionType, Integer orderIndex, List<Option> options,
                           Integer numberMin, Integer numberMax, List<MatchOption> matchOptions) {
        public Question(Long id, String content, String questionType, Integer orderIndex, List<Option> options) {
            this(id, content, questionType, orderIndex, options, null, null, null);
        }
    }

    /** Một mục cột B của câu nối cột. */
    public record MatchOption(Integer key, String content) {}

    /** Câu xếp thứ tự: các mục đã xáo trộn và orderIndex = null (không lộ thứ tự đúng). */
    public record Option(Long id, String content, Integer orderIndex, String imageUrl) {
        public Option(Long id, String content, Integer orderIndex) {
            this(id, content, orderIndex, null);
        }
    }
}
