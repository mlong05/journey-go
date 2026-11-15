package com.journeygo.modules.refund.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Admin sửa mã lý do hoàn tiền chi tiết")
public record UpdateRefundReasonCodeRequest(

        @Schema(description = "Tên hiển thị tiếng Việt (bắt buộc)")
        @NotBlank(message = "Tên lý do không được để trống")
        @Size(max = 100, message = "Tên lý do không được vượt quá 100 ký tự")
        String name,

        @Schema(description = "Điều kiện áp dụng — Admin đối chiếu bằng chứng")
        @Size(max = 150, message = "Điều kiện áp dụng không được vượt quá 150 ký tự")
        String conditions,

        @Schema(description = "true = bắt buộc đính kèm bằng chứng")
        Boolean requireEvidence,

        @Schema(description = "Thứ tự hiển thị trong nhóm")
        Integer displayOrder,

        @Schema(description = "true = đang bật")
        Boolean active
) {}
