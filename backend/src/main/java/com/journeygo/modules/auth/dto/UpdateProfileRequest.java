package com.journeygo.modules.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

@Schema(description = "Yêu cầu cập nhật thông tin cá nhân")
public record UpdateProfileRequest(

        @Schema(description = "Họ và tên", example = "Nguyễn An")
        @Size(max = 150, message = "Họ và tên tối đa 150 ký tự")
        String fullName,

        @Schema(description = "Số điện thoại", example = "0988123456")
        @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
        String phone,

        @Schema(description = "Đường dẫn ảnh đại diện hoặc Base64", example = "https://example.com/avatar.png")
        String avatarUrl,

        @Schema(description = "Bí danh cho avatarUrl")
        String avatar,

        @Schema(description = "Ảnh bìa trang hồ sơ (URL https). Bỏ trống \"\" để về ảnh mặc định; null = giữ nguyên",
                example = "https://res.cloudinary.com/demo/image/upload/cover.jpg")
        @Size(max = 1000, message = "Đường dẫn ảnh bìa tối đa 1000 ký tự")
        String coverImageUrl
) {
}
