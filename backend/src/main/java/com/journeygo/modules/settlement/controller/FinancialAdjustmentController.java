package com.journeygo.modules.settlement.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.settlement.dto.request.CreateFinancialAdjustmentRequest;
import com.journeygo.modules.settlement.dto.response.FinancialAdjustmentResponse;
import com.journeygo.modules.settlement.entity.enums.FinancialAdjustmentStatus;
import com.journeygo.modules.settlement.service.FinancialAdjustmentService;
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
@RequestMapping("/api/v1/financial-adjustments")
@RequiredArgsConstructor
@Tag(name = "Financial Adjustment (Điều chỉnh tài chính)",
        description = "Khoản điều chỉnh tài chính phát sinh SAU khi đã tất toán — không sửa lịch sử đã duyệt")
public class FinancialAdjustmentController {

    private final FinancialAdjustmentService adjustmentService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Ghi nhận khoản điều chỉnh tài chính (chờ phê duyệt)",
            description = "Dùng cho Refund phát sinh sau khi Settlement đã duyệt, hoặc bồi hoàn chi phí "
                    + "cho ProviderProfile do lỗi nền tảng. Số tiền dương = cộng, âm = trừ. "
                    + "Chỉ có một khoản điều chỉnh đang mở cho mỗi Refund.")
    public ResponseEntity<ApiResponse<FinancialAdjustmentResponse>> create(
            @Valid @RequestBody CreateFinancialAdjustmentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Ghi nhận khoản điều chỉnh thành công",
                        adjustmentService.createAdjustment(request, principal.getId())));
    }

    @PostMapping("/{adjustmentId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Phê duyệt khoản điều chỉnh và áp dụng vào ví",
            description = "Tạo giao dịch ví tương ứng. Nếu số dư không đủ để khấu trừ, hệ thống ghi nhận "
                    + "giao dịch PENDING (khoản phải thu) thay vì tạo số dư âm.")
    public ResponseEntity<ApiResponse<FinancialAdjustmentResponse>> approve(
            @PathVariable Long adjustmentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Phê duyệt khoản điều chỉnh thành công",
                adjustmentService.approveAdjustment(adjustmentId, principal.getId())));
    }

    @PostMapping("/{adjustmentId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Từ chối khoản điều chỉnh (không ảnh hưởng số dư ví)")
    public ResponseEntity<ApiResponse<FinancialAdjustmentResponse>> reject(
            @PathVariable Long adjustmentId,
            @RequestParam String reason,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Từ chối khoản điều chỉnh thành công",
                adjustmentService.rejectAdjustment(adjustmentId, reason, principal.getId())));
    }

    @GetMapping("/{adjustmentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Chi tiết khoản điều chỉnh tài chính")
    public ResponseEntity<ApiResponse<FinancialAdjustmentResponse>> getById(@PathVariable Long adjustmentId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin khoản điều chỉnh thành công",
                adjustmentService.getById(adjustmentId)));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách khoản điều chỉnh tài chính (ADMIN)")
    public ResponseEntity<ApiResponse<PageResponse<FinancialAdjustmentResponse>>> getAll(
            @RequestParam(required = false) FinancialAdjustmentStatus status,
            @ParameterObject @PageableDefault(page = 0, size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách khoản điều chỉnh thành công",
                adjustmentService.getAll(status, pageable)));
    }

    @GetMapping("/provider-profile/{providerProfileId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Khoản điều chỉnh tài chính của một đối tác")
    public ResponseEntity<ApiResponse<PageResponse<FinancialAdjustmentResponse>>> getByProviderProfile(
            @PathVariable Long providerProfileId,
            @ParameterObject @PageableDefault(page = 0, size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách khoản điều chỉnh thành công",
                adjustmentService.getByProviderProfile(providerProfileId, pageable)));
    }
}
