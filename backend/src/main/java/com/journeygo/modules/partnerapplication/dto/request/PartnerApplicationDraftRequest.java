package com.journeygo.modules.partnerapplication.dto.request;

import com.journeygo.modules.partnerapplication.entity.enums.PartnerType;
import com.journeygo.modules.partnerapplication.entity.enums.RepresentativePosition;
import com.journeygo.modules.partnerapplication.entity.enums.TravelScope;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Nội dung đơn đăng ký trở thành đối tác.
 *
 * <p>Dùng chung cho cả 2 thao tác:
 * <ul>
 *   <li><b>Lưu nháp</b> — cho phép thiếu dữ liệu (chỉ {@code email} + {@code emailVerified} là bắt buộc).</li>
 *   <li><b>Gửi đơn</b> — service kiểm tra lại toàn bộ (đặc tả mục "Kiểm tra dữ liệu trước khi gửi đơn").</li>
 * </ul>
 *
 * <p>Tất cả trường nghiệp vụ đều là bắt buộc khi GỬI ĐƠN — validation phía server là chốt chặn
 * cuối cùng, không dựa vào validation phía frontend.
 */
public record PartnerApplicationDraftRequest(

        // ── Giai đoạn 1 ──────────────────────────────────────────────────────────
        @Schema(description = "Email người đại diện", example = "doanhnghiep@example.com")
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        String email,

        @Schema(description = "Email đã xác minh qua OTP")
        @NotNull(message = "Trạng thái xác minh email không được để trống")
        Boolean emailVerified,

        @Schema(description = "Token xác nhận email đã verify (do server cấp sau khi verify OTP thành công)")
        String verificationToken,

        @Schema(description = "Số điện thoại", example = "0901234567")
        @Pattern(regexp = "^$|^0\\d{9,10}$", message = "Số điện thoại không hợp lệ (phải bắt đầu bằng 0 và có 10-11 chữ số)")
        String phone,

        @Schema(description = "Họ tên người đại diện")
        @Size(max = 150, message = "Họ tên người đại diện không được vượt quá 150 ký tự")
        String representativeName,

        @Schema(description = "Chức vụ người đại diện")
        RepresentativePosition representativePosition,

        // ── Giai đoạn 2 ──────────────────────────────────────────────────────────
        @Schema(description = "Tên doanh nghiệp / cơ sở")
        @Size(max = 200, message = "Tên doanh nghiệp không được vượt quá 200 ký tự")
        String businessName,

        @Schema(description = "Loại hình đối tác: TRAVEL_AGENCY | EXPERIENCE_PROVIDER")
        PartnerType partnerType,

        @Schema(description = "Phạm vi hoạt động (chỉ dùng cho Công ty Lữ hành): INTERNATIONAL | DOMESTIC")
        TravelScope travelScope,

        @Schema(description = "Mã số thuế", example = "0101234567")
        @Pattern(regexp = "^$|^\\d{10}$", message = "Mã số thuế phải gồm đúng 10 chữ số")
        String taxCode,

        @Schema(description = "Thông tin đăng ký kinh doanh")
        String businessRegistrationInfo,

        @Schema(description = "URL giấy phép hoạt động (bắt buộc với mọi loại hình)")
        String operationLicenseUrl,

        @Schema(description = "URL giấy phép lữ hành (bắt buộc với Công ty Lữ hành)")
        String travelLicenseUrl,

        @Schema(description = "URL giấy ký quỹ (bắt buộc với Công ty Lữ hành)")
        String signatureDocumentUrl,

        @Schema(description = "URL giấy đăng ký kinh doanh / GPKD / Hộ kinh doanh")
        String businessRegistrationUrl,

        @Schema(description = "Tỉnh / Thành phố")
        @Size(max = 100, message = "Tỉnh/Thành phố không được vượt quá 100 ký tự")
        String province,

        @Schema(description = "Phường / Xã")
        @Size(max = 100, message = "Phường/Xã không được vượt quá 100 ký tự")
        String ward,

        @Schema(description = "Số nhà, tên đường, tòa nhà...")
        String addressDetail,

        @Schema(description = "Phạm vi hoạt động")
        String businessScope,

        // ── Giai đoạn 3 ──────────────────────────────────────────────────────────
        @Schema(description = "Ngân hàng thụ hưởng", example = "Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)")
        @Size(max = 120, message = "Tên ngân hàng không được vượt quá 120 ký tự")
        String bankName,

        @Schema(description = "Số tài khoản")
        @Pattern(regexp = "^$|^[0-9A-Z]{6,20}$", message = "Số tài khoản không hợp lệ")
        String bankAccountNumber,

        @Schema(description = "Tên chủ tài khoản")
        @Size(max = 150, message = "Tên chủ tài khoản không được vượt quá 150 ký tự")
        String bankAccountHolder,

        // ── Giai đoạn 4 ──────────────────────────────────────────────────────────
        @Schema(description = "Xác nhận có thẩm quyền đại diện")
        Boolean confirmedAuthority,

        @Schema(description = "Đồng ý với Điều khoản hợp tác")
        Boolean agreedPartnerTerms,

        @Schema(description = "Đồng ý với Chính sách bảo vệ dữ liệu cá nhân")
        Boolean agreedPrivacyPolicy
) {
}
