package com.journeygo.modules.community.dto;

import com.journeygo.modules.community.entity.enums.ReportReason;
import jakarta.validation.constraints.NotNull;

public record CreateReportRequest(
        @NotNull(message = "Lý do báo cáo không được để trống")
        ReportReason reason,

        String description
) {
}
