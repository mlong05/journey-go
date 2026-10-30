package com.journeygo.modules.gamification.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** iconUrl để trống nghĩa là bỏ ảnh, ứng dụng sẽ hiện biểu tượng mặc định. */
public record BadgeUpdateRequest(
        @NotBlank(message = "Tên huy hiệu không được để trống")
        @Size(max = 150, message = "Tên huy hiệu tối đa 150 ký tự")
        String name,

        @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
        String description,

        @Pattern(regexp = "^$|^https://.+", message = "Ảnh huy hiệu phải là đường dẫn https")
        @Size(max = 500, message = "Đường dẫn ảnh tối đa 500 ký tự")
        String iconUrl,

        @Min(value = 0, message = "Điểm thưởng không được âm")
        Integer bonusPoints,

        Boolean active
) {
}
