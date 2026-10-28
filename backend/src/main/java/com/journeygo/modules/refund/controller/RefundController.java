package com.journeygo.modules.refund.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.security.AuthorizationGuard;
import com.journeygo.modules.refund.dto.request.CreateRefundRequest;
import com.journeygo.modules.refund.dto.request.ManualTransferRequest;
import com.journeygo.modules.refund.dto.request.ReviewRefundRequest;
import com.journeygo.modules.refund.dto.response.RefundResponse;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import com.journeygo.modules.refund.service.RefundService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/refunds")
@RequiredArgsConstructor
@Tag(name = "Refund (Hoàn tiền)",
        description = "Tourist gửi yêu cầu hoàn tiền, Admin duyệt/từ chối, VNPay Refund API và chuyển khoản thủ công")
public class RefundController {

    private final RefundService refundService;

    // ── Tourist ───────────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAnyRole('TOURIST', 'USER', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Gửi yêu cầu hoàn tiền",
            description = "Chỉ dành cho Payment đã thanh toán thành công (đã xác minh) và trong vòng 24 giờ "
                    + "kể từ thời điểm thanh toán. Số tiền do hệ thống tự tính theo nguyên nhân "
                    + "(50% lỗi Tourist / 100% lỗi nền tảng) — Tourist không tự nhập số tiền. "
                    + "Mỗi Payment chỉ có tối đa một yêu cầu đang xử lý hoặc đã hoàn tất.")
    public ResponseEntity<ApiResponse<RefundResponse>> create(
            @Valid @RequestBody CreateRefundRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Gửi yêu cầu hoàn tiền thành công",
                        refundService.createRefund(request, principal.getId())));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('TOURIST', 'USER', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách yêu cầu hoàn tiền của tôi")
    public ResponseEntity<ApiResponse<PageResponse<RefundResponse>>> getMyRefunds(
            @AuthenticationPrincipal UserPrincipal principal,
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách yêu cầu hoàn tiền thành công",
                refundService.getMyRefunds(principal.getId(), pageable)));
    }

    @GetMapping("/payments/{paymentId}")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Các yêu cầu hoàn tiền của một payment")
    public ResponseEntity<ApiResponse<PageResponse<RefundResponse>>> getByPayment(
            @PathVariable Long paymentId,
            @AuthenticationPrincipal UserPrincipal principal,
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        boolean isAdmin = AuthorizationGuard.isAdmin();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách yêu cầu hoàn tiền thành công",
                refundService.getByPayment(paymentId, principal.getId(), isAdmin, pageable)));
    }

    @GetMapping("/{refundId}")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Chi tiết yêu cầu hoàn tiền (kèm nhật ký kiểm toán)")
    public ResponseEntity<ApiResponse<RefundResponse>> getById(
            @PathVariable Long refundId,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean isAdmin = AuthorizationGuard.isAdmin();
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin yêu cầu hoàn tiền thành công",
                refundService.getById(refundId, principal.getId(), isAdmin)));
    }

    @GetMapping("/code/{refundCode}")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tra cứu yêu cầu hoàn tiền theo mã")
    public ResponseEntity<ApiResponse<RefundResponse>> getByCode(@PathVariable String refundCode) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin yêu cầu hoàn tiền thành công",
                refundService.getByCode(refundCode)));
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách toàn bộ yêu cầu hoàn tiền (ADMIN)")
    public ResponseEntity<ApiResponse<PageResponse<RefundResponse>>> getAll(
            @RequestParam(required = false) RefundStatus status,
            @ParameterObject @PageableDefault(page = 0, size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách yêu cầu hoàn tiền thành công",
                refundService.getAll(status, pageable)));
    }

    @PostMapping("/{refundId}/review")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Admin duyệt hoặc từ chối yêu cầu hoàn tiền",
            description = "Số tiền được hệ thống tính theo nguyên nhân do Admin xác định (50% / 100%). "
                    + "Nếu chọn phương thức VNPAY_API, hệ thống gửi yêu cầu hoàn tiền ngay và giữ trạng thái "
                    + "REFUND_PROCESSING cho tới khi xác minh được kết quả cuối cùng.")
    public ResponseEntity<ApiResponse<RefundResponse>> review(
            @PathVariable Long refundId,
            @Valid @RequestBody ReviewRefundRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Xử lý yêu cầu hoàn tiền thành công",
                refundService.reviewRefund(refundId, request, principal.getId())));
    }

    @PostMapping("/{refundId}/manual-transfer")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Ghi nhận đã chuyển khoản thủ công",
            description = "Admin nhập mã tham chiếu + bằng chứng chuyển khoản. Chỉ khi có bằng chứng xác minh "
                    + "thì Refund mới chuyển sang REFUNDED. Hệ thống chặn thao tác này nếu yêu cầu đã gửi "
                    + "tới VNPay mà chưa xác minh được kết quả — tránh hoàn tiền hai lần.")
    public ResponseEntity<ApiResponse<RefundResponse>> confirmManualTransfer(
            @PathVariable Long refundId,
            @Valid @RequestBody ManualTransferRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Ghi nhận chuyển khoản thủ công thành công",
                refundService.confirmManualTransfer(refundId, request, principal.getId())));
    }

    @PostMapping("/{refundId}/refresh-status")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Kiểm tra lại trạng thái hoàn tiền với VNPay",
            description = "Dùng khi yêu cầu đang ở REFUND_PROCESSING. Chỉ chuyển REFUNDED khi xác minh được "
                    + "kết quả hoàn tiền thành công; nếu chưa xác minh được thì giữ nguyên trạng thái.")
    public ResponseEntity<ApiResponse<RefundResponse>> refreshStatus(@PathVariable Long refundId) {
        return ResponseEntity.ok(ApiResponse.success("Kiểm tra trạng thái hoàn tiền thành công",
                refundService.refreshStatus(refundId)));
    }
}
