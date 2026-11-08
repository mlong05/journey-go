package com.journeygo.modules.partnerprofileupdate.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

/**
 * Yêu cầu đổi thông tin đối tác.
 *
 * <p>Chỉ những trường được gửi lên (không null) mới được xem là "đã thay đổi"; trường null
 * được hiểu là giữ nguyên giá trị hiện tại.
 */
@Schema(description = "Đối tác gửi yêu cầu đổi thông tin hồ sơ")
public record PartnerProfileUpdateSubmitRequest(

        @Schema(description = "Số điện thoại người đại diện")
        @Size(max = 20, message = "Số điện thoại không được vượt quá 20 ký tự")
        String phone,

        @Schema(description = "Họ tên người đại diện")
        @Size(max = 150, message = "Họ tên không được vượt quá 150 ký tự")
        String representativeName,

        @Schema(description = "Chức vụ người đại diện")
        @Size(max = 50, message = "Chức vụ không được vượt quá 50 ký tự")
        String representativePosition,

        @Schema(description = "Tên doanh nghiệp / cơ sở")
        @Size(max = 200, message = "Tên doanh nghiệp không được vượt quá 200 ký tự")
        String businessName,

        @Schema(description = "Mã số thuế")
        @Size(max = 20, message = "Mã số thuế không được vượt quá 20 ký tự")
        String taxCode,

        @Schema(description = "Thông tin đăng ký kinh doanh")
        String businessRegistrationInfo,

        @Schema(description = "Tỉnh / Thành")
        @Size(max = 100, message = "Tỉnh/Thành không được vượt quá 100 ký tự")
        String province,

        @Schema(description = "Quận / Huyện")
        @Size(max = 100, message = "Quận/Huyện không được vượt quá 100 ký tự")
        String district,

        @Schema(description = "Phường / Xã")
        @Size(max = 100, message = "Phường/Xã không được vượt quá 100 ký tự")
        String ward,

        @Schema(description = "Số nhà, tên đường...")
        String addressDetail,

        @Schema(description = "Phạm vi hoạt động")
        String businessScope,

        @Schema(description = "Ngân hàng thụ hưởng")
        @Size(max = 120, message = "Ngân hàng không được vượt quá 120 ký tự")
        String bankName,

        @Schema(description = "Số tài khoản")
        @Size(max = 50, message = "Số tài khoản không được vượt quá 50 ký tự")
        String bankAccountNumber,

        @Schema(description = "Tên chủ tài khoản")
        @Size(max = 150, message = "Tên chủ tài khoản không được vượt quá 150 ký tự")
        String bankAccountHolder,

        @Schema(description = "Ghi chú của đối tác cho Admin (không bắt buộc)")
        @Size(max = 1000, message = "Ghi chú không được vượt quá 1000 ký tự")
        String note
) {
}
