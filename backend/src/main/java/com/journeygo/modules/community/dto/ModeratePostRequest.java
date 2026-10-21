package com.journeygo.modules.community.dto;

import jakarta.validation.constraints.NotBlank;

public record ModeratePostRequest(
        @NotBlank(message = "Hành động phê duyệt không được để trống (APPROVE, REJECT, REQUEST_REVISION)")
        String action,

        String note
) {
}
