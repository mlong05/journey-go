package com.journeygo.modules.partnerprofileupdate.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectPartnerProfileUpdateRequest(

        @Schema(description = "Lý do từ chối (bắt buộc)")
        @NotBlank(message = "Lý do từ chối không được để trống")
        @Size(max = 2000, message = "Lý do từ chối không được vượt quá 2000 ký tự")
        String reason
) {
}
