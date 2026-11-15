package com.journeygo.modules.refund.dto.request;

import com.journeygo.modules.refund.entity.enums.RefundReason;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

@Schema(description = "Yêu cầu hoàn tiền từ Tourist")
public record CreateRefundRequest(

        @Schema(description = "ID payment cần hoàn", example = "1")
        @NotNull(message = "Payment không được để trống")
        Long paymentId,

        @Schema(description = "Nhóm lý do hoàn tiền: PERSONAL (lỗi khách hàng), "
                + "PLATFORM_FAULT (lỗi nền tảng), PROVIDER_FAULT (lỗi đối tác), "
                + "FORCE_MAJEURE (bất khả kháng). "
                + "KHÔNG BẮT BUỘC — khách chỉ mô tả bằng văn bản, "
                + "việc phân loại do Admin quyết định khi duyệt.")
        RefundReason reason,

        @Schema(description = "Mã lý do cụ thể trong nhóm (VD: HEALTH_ISSUE, PROVIDER_ABSENT) — "
                + "lấy từ GET /refund-reason-groups. "
                + "KHÔNG BẮT BUỘC — khách không chọn mã, Admin xác định khi duyệt.")
        @Size(max = 60, message = "Mã lý do không được vượt quá 60 ký tự")
        String reasonCode,

        @Schema(description = "Lý do ngắn gọn do khách nhập (VD: Bị ốm đột xuất)")
        @NotBlank(message = "Lý do hoàn tiền không được để trống")
        @Size(max = 200, message = "Lý do ngắn gọn không được vượt quá 200 ký tự")
        String reasonSummary,

        @Schema(description = "Mô tả chi tiết tình huống / sự cố của khách")
        @NotBlank(message = "Mô tả chi tiết không được để trống")
        @Size(max = 2000, message = "Mô tả chi tiết không được vượt quá 2000 ký tự")
        String reasonDetail,

        @Schema(description = "Bằng chứng / thông tin bổ sung (JSON string hoặc văn bản)")
        @Size(max = 5000, message = "Thông tin bổ sung không được vượt quá 5000 ký tự")
        String evidence,

        @Schema(description = "Danh sách URL file bằng chứng đính kèm (ảnh / video) — "
                + "tải lên trước qua POST /upload/image hoặc /upload/video")
        @Size(max = 20, message = "Chỉ được đính kèm tối đa 20 file bằng chứng")
        List<String> evidenceAttachments,

        @Schema(description = "Số tài khoản nhận tiền (bắt buộc khi dùng phương thức chuyển khoản thủ công)")
        @Size(max = 50, message = "Số tài khoản không được vượt quá 50 ký tự")
        String bankAccountNumber,

        @Schema(description = "Tên chủ tài khoản nhận tiền")
        @Size(max = 150, message = "Tên chủ tài khoản không được vượt quá 150 ký tự")
        String bankAccountName,

        @Schema(description = "Ngân hàng")
        @Size(max = 150, message = "Tên ngân hàng không được vượt quá 150 ký tự")
        String bankName,

        @Schema(description = "Số điện thoại liên hệ để Admin hỗ trợ yêu cầu hoàn tiền")
        @Size(max = 20, message = "Số điện thoại không được vượt quá 20 ký tự")
        String contactPhone,

        @Schema(description = "Email dự phòng để Admin liên hệ khi cần")
        @Size(max = 150, message = "Email không được vượt quá 150 ký tự")
        String contactEmail
) {}
