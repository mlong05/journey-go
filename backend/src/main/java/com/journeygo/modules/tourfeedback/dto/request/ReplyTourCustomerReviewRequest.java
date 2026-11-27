package com.journeygo.modules.tourfeedback.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReplyTourCustomerReviewRequest(
        @NotBlank(message = "Vui lòng nhập nội dung phản hồi")
        @Size(min = 2, max = 1500, message = "Nội dung phản hồi từ 2 đến 1500 ký tự")
        String reply
) {
}
