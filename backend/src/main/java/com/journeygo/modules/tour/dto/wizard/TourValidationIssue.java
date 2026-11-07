package com.journeygo.modules.tour.dto.wizard;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Một lỗi khiến tour chưa gửi duyệt được — chỉ rõ bước và trường cần sửa.
 *
 * @param step      BASIC_INFO | PRICING | STOPS | SCHEDULE | REVIEW | ACCOUNT
 * @param stopIndex vị trí điểm đến (bắt đầu từ 0) khi lỗi thuộc bước 3, ngược lại null
 * @param field     đường dẫn trường, ví dụ {@code images}, {@code quiz[1].answers}
 */
@Schema(description = "Lỗi kiểm tra trước khi gửi duyệt")
public record TourValidationIssue(String step, Integer stopIndex, String field, String message) {

    public static TourValidationIssue of(String step, String field, String message) {
        return new TourValidationIssue(step, null, field, message);
    }

    public static TourValidationIssue stop(int stopIndex, String field, String message) {
        return new TourValidationIssue("STOPS", stopIndex, field, message);
    }
}
