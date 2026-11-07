package com.journeygo.modules.tour.exception;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.tour.dto.wizard.TourValidationIssue;

import java.util.List;

/** Tour chưa đủ điều kiện gửi duyệt / duyệt — trả về HTTP 400 kèm danh sách lỗi theo bước và trường. */
public class TourValidationException extends AppException {

    private final transient List<TourValidationIssue> issues;

    public TourValidationException(List<TourValidationIssue> issues) {
        super(ErrorCode.TOUR_SUBMISSION_INVALID);
        this.issues = List.copyOf(issues);
    }

    public List<TourValidationIssue> getIssues() {
        return issues;
    }
}
