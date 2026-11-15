package com.journeygo.modules.refund.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Admin tạo mã lý do hoàn tiền chi tiết")
public record CreateRefundReasonCodeRequest(

        @Schema(description = "Mã lý do chi tiết (chữ in hoa + gạch dưới, VD: HEALTH_ISSUE). "
                + "Để trống ⇒ hệ thống tự sinh mã kỹ thuật (VD: PERSONAL_7). "
                + "Mã này chỉ dùng nội bộ, KHÔNG hiển thị cho người dùng.")
        @Size(max = 60, message = "Mã lý do không được vượt quá 60 ký tự")
        String code,

        @Schema(description = "Mã nhóm lý do chứa mã này")
        @NotBlank(message = "Nhóm lý do không được để trống")
        String groupCode,

        @Schema(description = "Tên hiển thị tiếng Việt (bắt buộc) — đây là nội dung "
                + "người dùng thấy trên web và mobile")
        @NotBlank(message = "Tên lý do không được để trống")
        @Size(max = 100, message = "Tên lý do không được vượt quá 100 ký tự")
        String name,

        @Schema(description = "Điều kiện áp dụng — Admin đối chiếu bằng chứng")
        @Size(max = 150, message = "Điều kiện áp dụng không được vượt quá 150 ký tự")
        String conditions,

        @Schema(description = "true = bắt buộc đính kèm bằng chứng")
        Boolean requireEvidence,

        @Schema(description = "Thứ tự hiển thị trong nhóm")
        Integer displayOrder
) {}
