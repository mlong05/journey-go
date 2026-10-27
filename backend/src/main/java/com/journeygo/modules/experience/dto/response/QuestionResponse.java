package com.journeygo.modules.experience.dto.response;

import com.journeygo.modules.experience.entity.Question;
import com.journeygo.modules.experience.entity.enums.QuestionType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;
import java.util.List;

@Builder
@Schema(description = "Response Question (CP/CM xem đầy đủ; Tourist dùng forTourist() để ẨN đáp án)")
public record QuestionResponse(

        @Schema(description = "ID Question") Long id,
        @Schema(description = "ID Task") Long taskId,
        @Schema(description = "Nội dung câu hỏi") String content,
        @Schema(description = "Đáp án cho câu TEXT (ẨN với Tourist — BR-TASK-5)") String expectedText,
        @Schema(description = "Loại câu hỏi") QuestionType questionType,
        @Schema(description = "Thứ tự") Integer sequenceOrder,
        @Schema(description = "ID CheckInPoint gắn với câu hỏi (nhiệm vụ tương tác ngoài thực tế)") Long checkInPointId,
        @Schema(description = "Danh sách đáp án (đã mask isCorrect nếu forTourist)") List<AnswerResponse> answers,
        @Schema(description = "Ngày tạo") Instant createdAt
) {
    public static QuestionResponse fromEntity(Question q) {
        return QuestionResponse.builder()
                .id(q.getId())
                .taskId(q.getTask() != null ? q.getTask().getId() : null)
                .content(q.getContent())
                .expectedText(q.getExpectedText())
                .questionType(q.getQuestionType())
                .sequenceOrder(q.getSequenceOrder())
                .checkInPointId(q.getCheckInPoint() != null ? q.getCheckInPoint().getId() : null)
                .answers(q.getAnswers() != null
                        ? q.getAnswers().stream().map(AnswerResponse::fromEntity).toList()
                        : List.of())
                .createdAt(q.getCreatedAt())
                .build();
    }


    public static QuestionResponse forTourist(Question q) {
        return QuestionResponse.builder()
                .id(q.getId())
                .taskId(q.getTask() != null ? q.getTask().getId() : null)
                .content(q.getContent())
                .expectedText(null)   // ẨN
                .questionType(q.getQuestionType())
                .sequenceOrder(q.getSequenceOrder())
                .checkInPointId(q.getCheckInPoint() != null ? q.getCheckInPoint().getId() : null)
                .answers(q.getAnswers() != null
                        ? q.getAnswers().stream().map(AnswerResponse::forTourist).toList()
                        : List.of())
                .createdAt(q.getCreatedAt())
                .build();
    }
}
