package com.journeygo.modules.community.dto;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;

public record ModeratePostRequest(
        @NotBlank(message = "Hành động phê duyệt không được để trống (APPROVE, REJECT, REQUEST_REVISION)")
        String action,

        @Size(max = 500, message = "Ghi chú không được vượt quá 500 ký tự")
        String note
) {
}
