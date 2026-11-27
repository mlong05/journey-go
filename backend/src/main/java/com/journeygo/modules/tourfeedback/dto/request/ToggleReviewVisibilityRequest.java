package com.journeygo.modules.tourfeedback.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ToggleReviewVisibilityRequest(
        @NotNull(message = "Thiếu trạng thái ẩn/hiện")
        Boolean hidden,

        @Size(max = 500, message = "Lý do tối đa 500 ký tự")
        String reason
) {
}
