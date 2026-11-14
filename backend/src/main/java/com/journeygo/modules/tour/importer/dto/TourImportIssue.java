package com.journeygo.modules.tour.importer.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Một lỗi / cảnh báo khi nhập tour từ Excel, chỉ rõ ô cần sửa.
 *
 * @param sheet  tên sheet, null nếu lỗi chung của cả file
 * @param row    số dòng như Excel hiển thị (bắt đầu từ 1), null nếu không gắn với dòng nào
 * @param column tên cột (tiêu đề cột hoặc tên trường), null nếu áp dụng cho cả dòng
 */
@Schema(description = "Lỗi / cảnh báo khi nhập tour từ Excel")
public record TourImportIssue(String sheet, Integer row, String column, String message) {

    public static TourImportIssue general(String message) {
        return new TourImportIssue(null, null, null, message);
    }
}
