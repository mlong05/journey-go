package com.journeygo.modules.partnerapplication.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectPartnerApplicationRequest(
        @Schema(description = "Lý do từ chối (bắt buộc)", example = "Giấy phép kinh doanh không hợp lệ và thông tin địa chỉ doanh nghiệp không khớp với hồ sơ cung cấp.")
        @NotBlank(message = "Lý do từ chối không được để trống")
        @Size(max = 2000, message = "Lý do từ chối không được vượt quá 2000 ký tự")
        String reason
) {
}
