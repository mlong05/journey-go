package com.journeygo.modules.partnerapplication.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public record ApprovePartnerApplicationRequest(
        @Schema(description = "Ghi chú của Admin (không bắt buộc)")
        @Size(max = 2000, message = "Ghi chú không được vượt quá 2000 ký tự")
        String note
) {
}
