package com.journeygo.modules.experience.dto.response;

import com.journeygo.modules.experience.entity.Answer;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;

/**
 * Response Answer.
 *
 * forTourist(): ẨN isCorrect + explanation (BR-TASK-5).
 */
@Builder
@Schema(description = "Response Answer (CP/CM thấy isCorrect; Tourist dùng forTourist() để ẨN)")
public record AnswerResponse(

        @Schema(description = "ID Answer") Long id,
        @Schema(description = "ID Question") Long questionId,
        @Schema(description = "Nội dung đáp án") String content,
        @Schema(description = "Đáp án đúng? (ẨN với Tourist — BR-TASK-5)") Boolean isCorrect,
        @Schema(description = "Thứ tự") Integer sequenceOrder,
        @Schema(description = "Giải thích (ẨN với Tourist — BR-TASK-5)") String explanation,
        @Schema(description = "Ngày tạo") Instant createdAt
) {
    public static AnswerResponse fromEntity(Answer a) {
        return AnswerResponse.builder()
                .id(a.getId())
                .questionId(a.getQuestion() != null ? a.getQuestion().getId() : null)
                .content(a.getContent())
                .isCorrect(a.isCorrect())
                .sequenceOrder(a.getSequenceOrder())
                .explanation(a.getExplanation())
                .createdAt(a.getCreatedAt())
                .build();
    }

    /** Mask cho Tourist: ẨN isCorrect + explanation. BR-TASK-5. */
    public static AnswerResponse forTourist(Answer a) {
        return AnswerResponse.builder()
                .id(a.getId())
                .questionId(a.getQuestion() != null ? a.getQuestion().getId() : null)
                .content(a.getContent())
                .isCorrect(null)       // ẨN
                .sequenceOrder(a.getSequenceOrder())
                .explanation(null)     // ẨN
                .createdAt(a.getCreatedAt())
                .build();
    }
}