package com.journeygo.modules.tour.importer.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Kết quả kiểm tra / nhập file Excel.
 *
 * @param valid    true = không có lỗi chặn, có thể tạo bản nháp
 * @param tourId   id bản nháp vừa tạo (chỉ có khi nhập thật thành công)
 * @param summary  tóm tắt nội dung đọc được
 * @param errors   lỗi chặn — phải sửa file rồi tải lên lại
 * @param warnings mục còn thiếu so với điều kiện gửi duyệt — vẫn tạo nháp được, bổ sung sau trong wizard
 */
@Schema(description = "Kết quả kiểm tra / nhập tour từ Excel")
public record TourImportResult(
        boolean valid,
        Long tourId,
        Summary summary,
        List<TourImportIssue> errors,
        List<TourImportIssue> warnings
) {

    @Schema(description = "Tóm tắt nội dung đọc được từ file")
    public record Summary(
            String title,
            String tourFormat,
            int images,
            int highlights,
            int prices,
            int itineraryDays,
            int stops,
            int quizQuestions,
            int experiences,
            int artifacts,
            int departureDates
    ) {}
}
