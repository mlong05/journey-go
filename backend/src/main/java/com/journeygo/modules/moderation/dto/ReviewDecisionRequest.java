package com.journeygo.modules.moderation.dto;

import jakarta.validation.constraints.Size;
import io.swagger.v3.oas.annotations.media.Schema;

public record ReviewDecisionRequest(
        @Schema(description = "Ghi ch├║ bß╗ò sung cho quyß║┐t ─æß╗ïnh kiß╗âm duyß╗çt", example = "Vui l├▓ng thay ß║únh r├╡ h╞ín")
        @Size(max = 1000) String note,
        @Schema(description = "C├íc m├ú l├╜ do tß╗½ chß╗æi ─æ╞░ß╗úc chß╗ìn, ph├ón c├ích bß║▒ng dß║Ñu phß║⌐y; bß║»t buß╗Öc khi tß╗½ chß╗æi. Bß╗Å trß╗æng khi duyß╗çt.",
                example = "IMAGE_NOT_RELEVANT,INACCURATE_INFORMATION")
        @Size(max = 500) String reason,
        @Schema(description = "Nß╗Öi dung l├╜ do kh├íc; bß║»t buß╗Öc nß║┐u reason c├│ m├ú OTHER")
        @Size(max = 500) String otherReason
) {}
