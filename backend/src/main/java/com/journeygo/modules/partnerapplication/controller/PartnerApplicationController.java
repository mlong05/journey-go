package com.journeygo.modules.partnerapplication.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.partnerapplication.dto.request.ApprovePartnerApplicationRequest;
import com.journeygo.modules.partnerapplication.dto.request.PartnerApplicationDraftRequest;
import com.journeygo.modules.partnerapplication.dto.request.RejectPartnerApplicationRequest;
import com.journeygo.modules.partnerapplication.dto.request.SendPartnerOtpRequest;
import com.journeygo.modules.partnerapplication.dto.request.VerifyPartnerOtpRequest;
import com.journeygo.modules.partnerapplication.dto.response.PartnerApplicationDecisionResponse;
import com.journeygo.modules.partnerapplication.dto.response.PartnerApplicationResponse;
import com.journeygo.modules.partnerapplication.dto.response.PartnerOtpVerifyResponse;
import com.journeygo.modules.partnerapplication.entity.enums.PartnerApplicationStatus;
import com.journeygo.modules.partnerapplication.service.PartnerApplicationService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * API luồng "Đăng ký trở thành đối tác" (công khai) và "Admin quản lý đối tác".
 *
 * <p>Nhóm public (không cần đăng nhập) — người dùng chưa có tài khoản vẫn đăng ký được:
 * <ul>
 *   <li>{@code POST /partner-applications/otp/send}</li>
 *   <li>{@code POST /partner-applications/otp/verify}</li>
 *   <li>{@code POST /partner-applications/activate}</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/partner-applications")
@RequiredArgsConstructor
@Tag(name = "Đăng ký đối tác", description = "Luồng đăng ký trở thành đối tác và Admin quản lý đơn đăng ký")
public class PartnerApplicationController {

    private final PartnerApplicationService partnerApplicationService;

    // ═════════════════════════════════════════════════════════════════════════
    //  NHÓM PUBLIC — đăng ký đối tác
    // ═════════════════════════════════════════════════════════════════════════

    @PostMapping("/otp/send")
    @Operation(summary = "Gửi OTP xác minh email",
            description = "Mã OTP 6 chữ số, hạn 5 phút, tối đa 3 lần gửi / email / ngày, "
                    + "gửi mã mới làm mã cũ mất hiệu lực")
    public ResponseEntity<ApiResponse<Void>> sendOtp(@Valid @RequestBody SendPartnerOtpRequest request) {
        partnerApplicationService.sendOtp(request);
        return ResponseEntity.ok(ApiResponse.success(
                "Mã xác thực đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư", null));
    }

    @PostMapping("/otp/verify")
    @Operation(summary = "Xác minh OTP email",
            description = "Nếu email đã có tài khoản, hệ thống trả về thông báo chuyển sang màn hình "
                    + "Đăng nhập / Khôi phục mật khẩu")
    public ResponseEntity<ApiResponse<PartnerOtpVerifyResponse>> verifyOtp(
            @Valid @RequestBody VerifyPartnerOtpRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Xác thực thành công",
                partnerApplicationService.verifyOtp(request)));
    }

    @PostMapping(value = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tải lên tài liệu hồ sơ đăng ký đối tác",
            description = "Giấy phép hoạt động, GPKD, giấy ký quỹ… Chấp nhận ảnh (PNG/JPG/WEBP) và PDF, tối đa 10MB. "
                    + "Yêu cầu verificationToken vì người đăng ký chưa có tài khoản (chưa có JWT)")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("email") String email,
            @RequestParam("verificationToken") String verificationToken) {
        String url = partnerApplicationService.uploadDocument(email, verificationToken, file);
        return ResponseEntity.ok(ApiResponse.success(
                "Tải lên tài liệu thành công",
                Map.of("url", url, "fileUrl", url)));
    }

    @PostMapping("/activate")
    @Operation(summary = "Thiết lập mật khẩu bằng activation token",
            description = "Đối tác dùng token nhận được qua email duyệt để thiết lập mật khẩu lần đầu")
    public ResponseEntity<ApiResponse<Void>> activate(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("newPassword");
        String confirmPassword = body.get("confirmPassword");
        partnerApplicationService.activate(token, newPassword, confirmPassword);
        return ResponseEntity.ok(ApiResponse.success(
                "Thiết lập mật khẩu thành công. Bạn có thể đăng nhập vào hệ thống", null));
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  NHÓM NGƯỜI ĐĂNG KÝ — lưu nháp & gửi đơn
    // ═════════════════════════════════════════════════════════════════════════

    @PostMapping("/draft")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lưu nháp đơn đăng ký",
            description = "Tự động lưu dần theo từng giai đoạn. Có thể quay lại giai đoạn trước để chỉnh sửa")
    public ResponseEntity<ApiResponse<PartnerApplicationResponse>> saveDraft(
            @Valid @RequestBody PartnerApplicationDraftRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lưu nháp đơn đăng ký thành công",
                partnerApplicationService.saveDraft(request, principal == null ? null : principal.getId())));
    }

    @PostMapping("/submit")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Gửi đơn đăng ký để duyệt",
            description = "Backend kiểm tra lại toàn bộ dữ liệu trước khi gửi; "
                    + "nếu thiếu trường bắt buộc sẽ trả về danh sách trường cần sửa")
    public ResponseEntity<ApiResponse<PartnerApplicationResponse>> submit(
            @Valid @RequestBody PartnerApplicationDraftRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Gửi đơn đăng ký thành công",
                partnerApplicationService.submit(request, principal == null ? null : principal.getId())));
    }

    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Đơn đăng ký của tôi (mới nhất)")
    public ResponseEntity<ApiResponse<PartnerApplicationResponse>> mine(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy đơn đăng ký thành công",
                partnerApplicationService.getMyApplication(principal.getId()).orElse(null)));
    }

    @GetMapping("/{applicationId}")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Chi tiết đơn đăng ký kèm lịch sử kiểm duyệt")
    public ResponseEntity<ApiResponse<PartnerApplicationResponse>> getById(
            @PathVariable Long applicationId,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean isAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết đơn đăng ký thành công",
                partnerApplicationService.getById(applicationId, principal.getId(), isAdmin)));
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  NHÓM ADMIN — quản lý đối tác
    // ═════════════════════════════════════════════════════════════════════════

    @GetMapping("/queue")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Hàng đợi duyệt đơn đăng ký (Admin)")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<PartnerApplicationResponse>>> queue(
            @RequestParam(required = false) PartnerApplicationStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy hàng đợi duyệt thành công",
                partnerApplicationService.getQueue(status, pageable)));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Thống kê số lượng đơn đăng ký theo trạng thái (Admin)")
    public ResponseEntity<ApiResponse<Map<String, Long>>> stats() {
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê đơn đăng ký thành công",
                partnerApplicationService.getStats()));
    }

    @PatchMapping("/{applicationId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Duyệt đơn đăng ký (Admin)",
            description = "Kiểm tra hồ sơ hợp lệ → tạo/nâng cấp tài khoản CONTENT_PROVIDER → "
                    + "cấp ProviderProfile + Wallet → cập nhật trạng thái → ghi lịch sử → gửi email")
    public ResponseEntity<ApiResponse<PartnerApplicationDecisionResponse>> approve(
            @PathVariable Long applicationId,
            @Valid @RequestBody(required = false) ApprovePartnerApplicationRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Duyệt đơn đăng ký thành công",
                partnerApplicationService.approve(applicationId, request, principal.getId())));
    }

    @PatchMapping("/{applicationId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Từ chối đơn đăng ký (Admin)",
            description = "Bắt buộc nhập lý do từ chối. Lý do được gửi kèm email cho người đăng ký")
    public ResponseEntity<ApiResponse<PartnerApplicationDecisionResponse>> reject(
            @PathVariable Long applicationId,
            @Valid @RequestBody RejectPartnerApplicationRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Từ chối đơn đăng ký thành công",
                partnerApplicationService.reject(applicationId, request, principal.getId())));
    }
}
