package com.journeygo.modules.finance.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.finance.dto.request.CreateCommissionPolicyRequest;
import com.journeygo.modules.finance.dto.response.CommissionPolicyResponse;
import com.journeygo.modules.finance.service.CommissionPolicyService;
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
import java.util.Map;

/**
 * Quản lý chính sách hoa hồng (Admin).
 *
 * <p>Chính sách mới có ngày hiệu lực riêng; chính sách cũ tự động kết thúc hiệu lực khi chính sách
 * mới bắt đầu. Xem {@link CommissionPolicyService} cho đầy đủ quy tắc BR-01 → BR-09.
 */
@RestController
@RequestMapping("/api/v1/commission-policies")
@RequiredArgsConstructor
@Tag(name = "Chính sách hoa hồng", description = "Quản lý chính sách hoa hồng mặc định của nền tảng")
@SecurityRequirement(name = "Bearer Authentication")
public class CommissionPolicyController {

    private final CommissionPolicyService commissionPolicyService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Danh sách chính sách hoa hồng")
    public ResponseEntity<ApiResponse<List<CommissionPolicyResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách chính sách hoa hồng thành công",
                commissionPolicyService.getAll()));
    }

    @GetMapping("/current")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Chính sách hoa hồng đang có hiệu lực")
    public ResponseEntity<ApiResponse<CommissionPolicyResponse>> current() {
        return ResponseEntity.ok(ApiResponse.success("Lấy chính sách hoa hồng hiện hành thành công",
                commissionPolicyService.getCurrentEffective()));
    }

    @GetMapping("/{policyId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Chi tiết chính sách hoa hồng")
    public ResponseEntity<ApiResponse<CommissionPolicyResponse>> getById(@PathVariable Long policyId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết chính sách hoa hồng thành công",
                commissionPolicyService.getById(policyId)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Tạo chính sách hoa hồng mới",
            description = "Chính sách mới có ngày hiệu lực riêng. Không được tạo khoảng hiệu lực chồng lấn.")
    public ResponseEntity<ApiResponse<CommissionPolicyResponse>> create(
            @Valid @RequestBody CreateCommissionPolicyRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo chính sách hoa hồng thành công",
                        commissionPolicyService.create(request, principal.getId())));
    }

    @PatchMapping("/{policyId}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Hủy chính sách hoa hồng tương lai",
            description = "Chỉ hủy được chính sách chưa tới ngày hiệu lực (BR-08)")
    public ResponseEntity<ApiResponse<CommissionPolicyResponse>> cancel(
            @PathVariable Long policyId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Hủy chính sách hoa hồng thành công",
                commissionPolicyService.cancel(policyId, body.get("reason"), principal.getId())));
    }
}
