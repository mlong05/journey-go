package com.journeygo.modules.destination.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Yêu cầu tạo hoặc cập nhật chủ đề du lịch")
public record ThemeRequest(

        @Schema(description = "Tên chủ đề", example = "Di sản văn hóa")
        @NotBlank(message = "Tên chủ đề không được để trống")
        @Size(max = 150, message = "Tên chủ đề không được quá 150 ký tự")
        String name,

        @Schema(description = "Đường dẫn định danh (slug)", example = "di-san-van-hoa")
        @Size(max = 150, message = "Slug không được quá 150 ký tự")
        String slug,

        @Schema(description = "URL ảnh đại diện (https). Trống = chưa có ảnh", example = "https://res.cloudinary.com/demo/image/upload/sample.jpg")
        @Size(max = 1000, message = "URL ảnh không được quá 1000 ký tự")
        @Pattern(regexp = "^$|^https://\\S+$", message = "URL ảnh phải bắt đầu bằng https://")
        String imageUrl,

        @Schema(description = "Ghi nguồn ảnh (tác giả · giấy phép); trống nếu là ảnh tự chụp", example = "Christophe95 · CC BY-SA 4.0 · Wikimedia Commons")
        @Size(max = 300, message = "Ghi nguồn ảnh không được quá 300 ký tự")
        String imageCredit
) {}
