package com.journeygo.modules.refund.dto.request;

import com.journeygo.modules.refund.entity.enums.RefundReason;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Yêu cầu hoàn tiền từ Tourist")
public record CreateRefundRequest(

        @Schema(description = "ID payment cần hoàn", example = "1")
        @NotNull(message = "Payment không được để trống")
        Long paymentId,

        @Schema(description = "Nguyên nhân: TOURIST_FAULT (lý do cá nhân) hoặc PLATFORM_FAULT (lỗi nền tảng)")
        @NotNull(message = "Nguyên nhân hoàn tiền không được để trống")
        RefundReason reason,

        @Schema(description = "Mô tả chi tiết lý do")
        @NotBlank(message = "Lý do hoàn tiền không được để trống")
        @Size(max = 2000, message = "Lý do không được vượt quá 2000 ký tự")
        String reasonDetail,

        @Schema(description = "Bằng chứng / thông tin bổ sung (JSON string hoặc văn bản)")
        @Size(max = 5000, message = "Thông tin bổ sung không được vượt quá 5000 ký tự")
        String evidence,

        @Schema(description = "Số tài khoản nhận tiền (bắt buộc khi dùng phương thức chuyển khoản thủ công)")
        @Size(max = 50, message = "Số tài khoản không được vượt quá 50 ký tự")
        String bankAccountNumber,

        @Schema(description = "Tên chủ tài khoản nhận tiền")
        @Size(max = 150, message = "Tên chủ tài khoản không được vượt quá 150 ký tự")
        String bankAccountName,

        @Schema(description = "Ngân hàng")
        @Size(max = 150, message = "Tên ngân hàng không được vượt quá 150 ký tự")
        String bankName
) {}
