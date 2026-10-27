package com.journeygo.modules.community.dto;

import jakarta.validation.constraints.Size;
import com.journeygo.modules.community.entity.enums.ReportReason;
import jakarta.validation.constraints.NotNull;

public record CreateReportRequest(
        @NotNull(message = "Lý do báo cáo không được để trống")
        ReportReason reason,

        @Size(max = 500, message = "Mô tả báo cáo không được vượt quá 500 ký tự")
        String description
) {
}
