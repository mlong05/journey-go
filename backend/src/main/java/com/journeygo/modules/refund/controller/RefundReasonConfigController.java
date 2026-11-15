package com.journeygo.modules.refund.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.refund.dto.request.CreateRefundReasonCodeRequest;
import com.journeygo.modules.refund.dto.request.UpdateRefundReasonCodeRequest;
import com.journeygo.modules.refund.dto.request.UpdateRefundReasonGroupRequest;
import com.journeygo.modules.refund.dto.response.RefundReasonGroupResponse;
import com.journeygo.modules.refund.service.RefundReasonConfigService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Cấu hình lý do hoàn tiền.
 *
 * <p>Tab "Cấu hình lý do hoàn tiền" trong Admin Dashboard:
 * <ul>
 *   <li>Admin thêm / sửa / xóa mã lý do chi tiết — KHÔNG hardcode.</li>
 *   <li>Admin sửa tên, tỷ lệ hoàn, mô tả, bật/tắt của nhóm lý do.</li>
 * </ul>
 *
 * <p>Tourist (mobile) dùng endpoint {@code GET /refund-reason-groups} để lấy danh sách
 * nhóm + mã lý do đang bật để hiển thị trên form gửi yêu cầu hoàn tiền.
 */
@RestController
@RequestMapping("/api/v1/refund-reason-groups")
@RequiredArgsConstructor
@Tag(name = "Cấu hình lý do hoàn tiền",
        description = "Nhóm lý do + mã lý do chi tiết do Admin cấu hình (không hardcode)")
@SecurityRequirement(name = "Bearer Authentication")
public class RefundReasonConfigController {

    private final RefundReasonConfigService service;

    // ── Tourist ───────────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Danh sách nhóm lý do hoàn tiền + mã lý do chi tiết (đang bật)",
            description = "Dùng cho form gửi yêu cầu hoàn tiền trên mobile. "
                    + "Chỉ trả về nhóm và mã lý do đang bật.")
    public ResponseEntity<ApiResponse<List<RefundReasonGroupResponse>>> getActive() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách lý do hoàn tiền thành công",
                service.getGroups(true)));
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Danh sách đầy đủ nhóm lý do + mã lý do (kể cả đang tắt)")
    public ResponseEntity<ApiResponse<List<RefundReasonGroupResponse>>> getAllForAdmin() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách lý do hoàn tiền thành công",
                service.getGroups(false)));
    }

    @PutMapping("/admin/{groupCode}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin cập nhật nhóm lý do (tên, tỷ lệ hoàn, mô tả, bật/tắt)")
    public ResponseEntity<ApiResponse<RefundReasonGroupResponse>> updateGroup(
            @PathVariable String groupCode,
            @Valid @RequestBody UpdateRefundReasonGroupRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật nhóm lý do hoàn tiền thành công",
                service.updateGroup(groupCode, request, principal.getId())));
    }

    @PostMapping("/admin/codes")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin tạo mã lý do hoàn tiền chi tiết")
    public ResponseEntity<ApiResponse<RefundReasonGroupResponse.RefundReasonCodeResponse>> createCode(
            @Valid @RequestBody CreateRefundReasonCodeRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo mã lý do hoàn tiền thành công",
                        service.createCode(request, principal.getId())));
    }

    @PutMapping("/admin/codes/{codeId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin sửa mã lý do hoàn tiền chi tiết")
    public ResponseEntity<ApiResponse<RefundReasonGroupResponse.RefundReasonCodeResponse>> updateCode(
            @PathVariable Long codeId,
            @Valid @RequestBody UpdateRefundReasonCodeRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật mã lý do hoàn tiền thành công",
                service.updateCode(codeId, request, principal.getId())));
    }

    @DeleteMapping("/admin/codes/{codeId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin xóa mã lý do hoàn tiền chi tiết",
            description = "Mã lý do đã được dùng trong yêu cầu hoàn tiền thì không thể xóa — "
                    + "hãy tắt (active = false) thay vì xóa.")
    public ResponseEntity<ApiResponse<Void>> deleteCode(
            @PathVariable Long codeId,
            @AuthenticationPrincipal UserPrincipal principal) {
        service.deleteCode(codeId, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Xóa mã lý do hoàn tiền thành công", null));
    }
}
