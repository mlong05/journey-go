package com.journeygo.modules.moderation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public record ExperienceReviewDecisionRequest(
        @Schema(description = "Ghi ch├║ k├¿m quyß║┐t ─æß╗ïnh; bß║»t buß╗Öc khi tß╗½ chß╗æi",
                example = "C├óu hß╗Åi sß╗æ 2 ch╞░a c├│ ─æ├íp ├ín ─æ├║ng")
        @Size(max = 1000) String note
) {}
