package com.journeygo.modules.tourrequest.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Schema(description = "Yêu cầu đăng bài tạo tour riêng theo nhu cầu")
public record CreateTourRequestRequest(

        @Schema(description = "Tiêu đề yêu cầu", example = "Cần thiết kế tour khám phá ẩm thực Đà Lạt 3 ngày 2 đêm")
        @NotBlank(message = "Tiêu đề yêu cầu không được để trống")
        @Size(max = 200, message = "Tiêu đề không được vượt quá 200 ký tự")
        String title,

        @Schema(description = "Mô tả chi tiết mong muốn", example = "Nhóm mình gồm 4 người lớn, muốn đi các quán ăn truyền thống và trải nghiệm hái chè...")
        @NotBlank(message = "Mô tả chi tiết không được để trống")
        @Size(max = 5000, message = "Mô tả chi tiết không được vượt quá 5000 ký tự")
        String description,

        @Schema(description = "Địa điểm mong muốn", example = "Đà Lạt, Lâm Đồng")
        @Size(max = 500, message = "Địa điểm không được vượt quá 500 ký tự")
        String preferredDestination,

        @Schema(description = "Ngày bắt đầu mong muốn (yyyy-MM-dd)", example = "2026-12-20")
        LocalDate preferredDateFrom,

        @Schema(description = "Ngày kết thúc mong muốn (yyyy-MM-dd)", example = "2026-12-22")
        LocalDate preferredDateTo,

        @Schema(description = "Số lượng khách dự kiến", example = "4")
        @Min(value = 1, message = "Số lượng khách tối thiểu là 1")
        @Max(value = 500, message = "Số lượng khách tối đa là 500")
        Integer guestCount,

        @Schema(description = "Ngân sách dự kiến tối thiểu (VND)", example = "3000000")
        @DecimalMin(value = "0", message = "Ngân sách không được âm")
        BigDecimal budgetMin,

        @Schema(description = "Ngân sách dự kiến tối đa (VND)", example = "5000000")
        @DecimalMin(value = "0", message = "Ngân sách không được âm")
        BigDecimal budgetMax,

        @Schema(description = "Yêu cầu đặc biệt (chế độ ăn chay, xe đưa đón, hướng dẫn viên nói tiếng Anh...)", example = "Cần xe đưa đón tận sân bay Liên Khương")
        @Size(max = 2000, message = "Yêu cầu đặc biệt không được vượt quá 2000 ký tự")
        String specialRequirements
) {}
