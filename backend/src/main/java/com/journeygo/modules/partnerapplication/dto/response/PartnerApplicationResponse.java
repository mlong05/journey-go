package com.journeygo.modules.partnerapplication.dto.response;

import com.journeygo.modules.partnerapplication.entity.PartnerApplication;
import com.journeygo.modules.partnerapplication.entity.PartnerApplicationHistory;
import com.journeygo.modules.partnerapplication.entity.enums.PartnerApplicationStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

@Schema(description = "Chi tiết đơn đăng ký trở thành đối tác")
public record PartnerApplicationResponse(

        @Schema(description = "ID đơn") Long id,
        @Schema(description = "Trạng thái đơn") PartnerApplicationStatus status,

        // ── Giai đoạn 1 ──────────────────────────────────────────────────────────
        @Schema(description = "Email người đại diện") String email,
        @Schema(description = "Email đã xác minh") boolean emailVerified,
        @Schema(description = "Số điện thoại") String phone,
        @Schema(description = "Họ tên người đại diện") String representativeName,
        @Schema(description = "Chức vụ người đại diện") String representativePosition,

        // ── Giai đoạn 2 ──────────────────────────────────────────────────────────
        @Schema(description = "Tên doanh nghiệp / cơ sở") String businessName,
        @Schema(description = "Loại hình đối tác") String partnerType,
        @Schema(description = "Phạm vi hoạt động (quốc tế / nội địa)") String travelScope,
        @Schema(description = "Mã số thuế") String taxCode,
        @Schema(description = "Thông tin đăng ký kinh doanh") String businessRegistrationInfo,
        @Schema(description = "URL giấy phép hoạt động") String operationLicenseUrl,
        @Schema(description = "URL giấy phép lữ hành") String travelLicenseUrl,
        @Schema(description = "URL giấy ký quỹ") String signatureDocumentUrl,
        @Schema(description = "URL giấy đăng ký kinh doanh / GPKD") String businessRegistrationUrl,
        @Schema(description = "Tỉnh / Thành phố") String province,
        @Schema(description = "Phường / Xã") String ward,
        @Schema(description = "Số nhà, tên đường...") String addressDetail,
        @Schema(description = "Phạm vi hoạt động") String businessScope,

        // ── Giai đoạn 3 ──────────────────────────────────────────────────────────
        @Schema(description = "Ngân hàng thụ hưởng") String bankName,
        @Schema(description = "Số tài khoản") String bankAccountNumber,
        @Schema(description = "Tên chủ tài khoản") String bankAccountHolder,

        // ── Giai đoạn 4 ──────────────────────────────────────────────────────────
        @Schema(description = "Đã xác nhận thẩm quyền đại diện") boolean confirmedAuthority,
        @Schema(description = "Đã đồng ý điều khoản hợp tác") boolean agreedPartnerTerms,
        @Schema(description = "Đã đồng ý chính sách bảo vệ dữ liệu cá nhân") boolean agreedPrivacyPolicy,

        // ── Vòng đời ─────────────────────────────────────────────────────────────
        @Schema(description = "ID tài khoản ứng viên (null nếu chưa có tài khoản)") Long applicantUserId,
        @Schema(description = "Lý do từ chối") String rejectionReason,
        @Schema(description = "Ghi chú của Admin") String reviewNote,
        @Schema(description = "Thời điểm gửi đơn") Instant submittedAt,
        @Schema(description = "Thời điểm xử lý") Instant reviewedAt,
        @Schema(description = "Thời điểm tạo") Instant createdAt,
        @Schema(description = "Thời điểm cập nhật") Instant updatedAt,

        @Schema(description = "Lịch sử kiểm duyệt") List<PartnerApplicationHistoryResponse> history
) {

    public static PartnerApplicationResponse fromEntity(PartnerApplication app,
                                                        List<PartnerApplicationHistory> history) {
        return new PartnerApplicationResponse(
                app.getId(),
                app.getStatus(),
                app.getEmail(),
                app.isEmailVerified(),
                app.getPhone(),
                app.getRepresentativeName(),
                app.getRepresentativePosition() == null ? null : app.getRepresentativePosition().getLabel(),
                app.getBusinessName(),
                app.getPartnerType() == null ? null : app.getPartnerType().name(),
                app.getTravelScope() == null ? null : app.getTravelScope().name(),
                app.getTaxCode(),
                app.getBusinessRegistrationInfo(),
                app.getOperationLicenseUrl(),
                app.getTravelLicenseUrl(),
                app.getSignatureDocumentUrl(),
                app.getBusinessRegistrationUrl(),
                app.getProvince(),
                app.getWard(),
                app.getAddressDetail(),
                app.getBusinessScope(),
                app.getBankName(),
                app.getBankAccountNumber(),
                app.getBankAccountHolder(),
                app.isConfirmedAuthority(),
                app.isAgreedPartnerTerms(),
                app.isAgreedPrivacyPolicy(),
                app.getApplicant() == null ? null : app.getApplicant().getId(),
                app.getRejectionReason(),
                app.getReviewNote(),
                app.getSubmittedAt(),
                app.getReviewedAt(),
                app.getCreatedAt(),
                app.getUpdatedAt(),
                history == null ? List.of()
                        : history.stream().map(PartnerApplicationHistoryResponse::fromEntity).toList()
        );
    }
}
