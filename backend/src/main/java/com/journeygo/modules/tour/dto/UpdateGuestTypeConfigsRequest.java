package com.journeygo.modules.tour.dto;

import com.journeygo.modules.tour.entity.GuestType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

@Schema(description = "Admin lưu cấu hình cả 4 loại khách cùng lúc (để kiểm tra khoảng tuổi liền nhau)")
public record UpdateGuestTypeConfigsRequest(
        @NotNull @Size(min = 4, max = 4, message = "Cần gửi đủ 4 loại khách") @Valid List<Item> items
) {
    public record Item(
            @NotNull(message = "Thiếu mã loại khách") GuestType guestType,
            @NotBlank(message = "Tên loại khách không được để trống")
            @Size(max = 50, message = "Tên loại khách tối đa 50 ký tự") String label,
            @NotNull(message = "Thiếu tuổi bắt đầu")
            @Min(value = 0, message = "Tuổi không được âm")
            @Max(value = 120, message = "Tuổi tối đa 120") Integer minAge,
            boolean alwaysFree
    ) {
    }
}
