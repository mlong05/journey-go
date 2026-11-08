package com.journeygo.modules.partnerprofileupdate.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.partnerprofileupdate.dto.request.PartnerProfileUpdateDecisionRequest;
import com.journeygo.modules.partnerprofileupdate.dto.request.PartnerProfileUpdateSubmitRequest;
import com.journeygo.modules.partnerprofileupdate.dto.request.RejectPartnerProfileUpdateRequest;
import com.journeygo.modules.partnerprofileupdate.dto.response.PartnerProfileInfoResponse;
import com.journeygo.modules.partnerprofileupdate.dto.response.PartnerProfileUpdateResponse;
import com.journeygo.modules.partnerprofileupdate.entity.enums.PartnerProfileUpdateStatus;
import com.journeygo.modules.partnerprofileupdate.service.PartnerProfileUpdateService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * API "Yêu cầu đổi thông tin đối tác".
 *
 * <p>Nhóm đối tác (CONTENT_PROVIDER):
 * <ul>
 *   <li>{@code GET  /partner-profile-updates/mine}  — hồ sơ hiện tại + trạng thái yêu cầu.</li>
 *   <li>{@code POST /partner-profile-updates}       — gửi yêu cầu đổi thông tin.</li>
 * </ul>
 *
 * <p>Nhóm Admin:
 * <ul>
 *   <li>{@code GET   /partner-profile-updates/queue} — hàng đợi xử lý.</li>
 *   <li>{@code GET   /partner-profile-updates/stats} — thống kê theo trạng thái.</li>
 *   <li>{@code GET   /partner-profile-updates/{id}}  — chi tiết + lịch sử thay đổi.</li>
 *   <li>{@code PATCH /partner-profile-updates/{id}/approve} — duyệt (ghi đè hồ sơ).</li>
 *   <li>{@code PATCH /partner-profile-updates/{id}/reject}  — từ chối (bắt buộc lý do).</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/partner-profile-updates")
@RequiredArgsConstructor
@Tag(name = "Yêu cầu đổi thông tin đối tác",
        description = "Đối tác gửi yêu cầu chỉnh sửa hồ sơ — Admin so sánh và duyệt/từ chối")
public class PartnerProfileUpdateController {

    private final PartnerProfileUpdateService service;

    // ═════════════════════════════════════════════════════════════════════════
    //  NHÓM ĐỐI TÁC
    // ═════════════════════════════════════════════════════════════════════════

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('CONTENT_PROVIDER', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Thông tin đối tác hiện tại + trạng thái yêu cầu đổi thông tin")
    public ResponseEntity<ApiResponse<PartnerProfileInfoResponse>> mine(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin đối tác thành công",
                service.getMyProfileInfo(principal.getId())));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CONTENT_PROVIDER', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Gửi yêu cầu đổi thông tin (Admin xử lý)",
            description = "Chỉ gửi được khi không có yêu cầu nào đang chờ duyệt. "
                    + "Trong lúc chờ, đối tác vẫn hoạt động bình thường với thông tin cũ.")
    public ResponseEntity<ApiResponse<PartnerProfileUpdateResponse>> submit(
            @Valid @RequestBody PartnerProfileUpdateSubmitRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Gửi yêu cầu thay đổi thông tin thành công",
                service.submit(principal.getId(), request)));
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  NHÓM ADMIN
    // ═════════════════════════════════════════════════════════════════════════

    @GetMapping("/queue")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Hàng đợi yêu cầu đổi thông tin (Admin)")
    public ResponseEntity<ApiResponse<Page<PartnerProfileUpdateResponse>>> queue(
            @RequestParam(required = false) PartnerProfileUpdateStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy hàng đợi yêu cầu đổi thông tin thành công",
                service.getQueue(status, pageable)));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Thống kê yêu cầu đổi thông tin theo trạng thái (Admin)")
    public ResponseEntity<ApiResponse<Map<String, Long>>> stats() {
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê yêu cầu đổi thông tin thành công",
                service.getStats()));
    }

    @GetMapping("/{requestId}")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Chi tiết yêu cầu đổi thông tin kèm lịch sử thay đổi (Admin)")
    public ResponseEntity<ApiResponse<PartnerProfileUpdateResponse>> getById(
            @PathVariable Long requestId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết yêu cầu đổi thông tin thành công",
                service.getById(requestId)));
    }

    @PatchMapping("/{requestId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Duyệt yêu cầu đổi thông tin (Admin)",
            description = "Thông tin mới được tự động ghi đè vào hồ sơ chính thức của đối tác.")
    public ResponseEntity<ApiResponse<PartnerProfileUpdateResponse>> approve(
            @PathVariable Long requestId,
            @Valid @RequestBody(required = false) PartnerProfileUpdateDecisionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Duyệt yêu cầu đổi thông tin thành công",
                service.approve(requestId, request, principal.getId())));
    }

    @PatchMapping("/{requestId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Từ chối yêu cầu đổi thông tin (Admin)",
            description = "Bắt buộc nhập lý do từ chối. Hồ sơ chính thức giữ nguyên, "
                    + "lý do được hiển thị cho đối tác.")
    public ResponseEntity<ApiResponse<PartnerProfileUpdateResponse>> reject(
            @PathVariable Long requestId,
            @Valid @RequestBody RejectPartnerProfileUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Từ chối yêu cầu đổi thông tin thành công",
                service.reject(requestId, request, principal.getId())));
    }
}
