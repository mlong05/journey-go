package com.journeygo.modules.moderation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public record ExperienceReviewDecisionRequest(
        @Schema(description = "Ghi chú kèm quyết định; bắt buộc khi từ chối",
                example = "Câu hỏi số 2 chưa có đáp án đúng")
        @Size(max = 1000) String note
) {}
