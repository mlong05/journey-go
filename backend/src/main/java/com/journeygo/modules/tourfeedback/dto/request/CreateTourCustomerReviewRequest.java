package com.journeygo.modules.tourfeedback.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateTourCustomerReviewRequest(
        @NotNull(message = "Thiếu mã booking cần đánh giá")
        Long bookingId,

        @NotNull(message = "Vui lòng chọn số sao tổng thể (1–5)")
        @Min(value = 1, message = "Số sao tối thiểu là 1")
        @Max(value = 5, message = "Số sao tối đa là 5")
        Integer overallRating,

        @Min(value = 1, message = "Số sao tối thiểu là 1")
        @Max(value = 5, message = "Số sao tối đa là 5")
        Integer guideRating,

        @Min(value = 1, message = "Số sao tối thiểu là 1")
        @Max(value = 5, message = "Số sao tối đa là 5")
        Integer cultureRating,

        @Min(value = 1, message = "Số sao tối thiểu là 1")
        @Max(value = 5, message = "Số sao tối đa là 5")
        Integer scheduleRating,

        @Min(value = 1, message = "Số sao tối thiểu là 1")
        @Max(value = 5, message = "Số sao tối đa là 5")
        Integer valueRating,

        @Size(max = 150, message = "Tiêu đề tối đa 150 ký tự")
        String title,

        @NotBlank(message = "Vui lòng nhập nội dung đánh giá")
        @Size(min = 10, max = 2000, message = "Nội dung đánh giá từ 10 đến 2000 ký tự")
        String comment,

        @Size(max = 5, message = "Tối đa 5 ảnh đính kèm")
        List<String> imageUrls
) {
}
