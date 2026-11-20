package com.journeygo.modules.tour.dto;

import com.journeygo.modules.tour.entity.GuestType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "Cấu hình một loại khách (tên, độ tuổi). Giá và tính chỗ do đối tác khai báo theo tour.")
public record GuestTypeConfigResponse(
        @Schema(description = "Mã loại khách", example = "ADULT") GuestType guestType,
        @Schema(description = "Tên hiển thị", example = "Người lớn") String label,
        @Schema(description = "Tuổi bắt đầu (tính tại ngày trải nghiệm)", example = "12") int minAge,
        @Schema(description = "Tuổi kết thúc (null = không giới hạn)", example = "null") Integer maxAge,
        @Schema(description = "Mô tả độ tuổi", example = "12 tuổi trở lên") String ageRange,
        @Schema(description = "Thứ tự theo tuổi tăng dần (0 = nhỏ tuổi nhất)") int sortOrder,
        @Schema(description = "Lần sửa gần nhất") Instant updatedAt
) {
    public static GuestTypeConfigResponse of(GuestType t, int sortOrder, Instant updatedAt) {
        return new GuestTypeConfigResponse(t, t.getLabel(), t.getMinAge(), t.getMaxAge(), t.getAgeRange(),
                sortOrder, updatedAt);
    }
}
