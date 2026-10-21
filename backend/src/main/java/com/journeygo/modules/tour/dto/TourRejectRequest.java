package com.journeygo.modules.tour.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Yêu cầu từ chối tour (bắt buộc nhập lý do)")
public record TourRejectRequest(

        @Schema(description = "Lý do từ chối", example = "Thiếu thông tin điểm đến hợp lệ")
        @NotBlank(message = "Lý do từ chối không được để trống")
        @Size(min = 10, max = 500, message = "Lý do từ chối phải từ 10 đến 500 ký tự")
        String reason
) {}
