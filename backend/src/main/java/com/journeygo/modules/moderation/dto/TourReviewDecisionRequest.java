package com.journeygo.modules.moderation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public record TourReviewDecisionRequest(
        @Schema(description = "Ghi ch├║ k├¿m quyß║┐t ─æß╗ïnh", example = "Vui l├▓ng x├íc minh lß║íi lß╗ïch tr├¼nh")
        @Size(max = 1000) String note,
        @Schema(description = "M├ú l├╜ do tß╗½ chß╗æi dß║íng checkbox, ph├ón c├ích bß║▒ng dß║Ñu phß║⌐y; bß║»t buß╗Öc khi tß╗½ chß╗æi",
                example = "INCOMPLETE_INFORMATION,OTHER")
        @Size(max = 500) String reason,
        @Schema(description = "Nß╗Öi dung l├╜ do kh├íc; bß║»t buß╗Öc nß║┐u reason c├│ m├ú OTHER")
        @Size(max = 500) String otherReason
) {}
