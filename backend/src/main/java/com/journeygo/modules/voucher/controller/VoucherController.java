package com.journeygo.modules.voucher.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.voucher.dto.request.CreateVoucherRequest;
import com.journeygo.modules.voucher.dto.request.UpdateVoucherRequest;
import com.journeygo.modules.voucher.dto.request.ValidateVoucherRequest;
import com.journeygo.modules.voucher.dto.response.VoucherCalculationResult;
import com.journeygo.modules.voucher.dto.response.VoucherResponse;
import com.journeygo.modules.voucher.entity.enums.VoucherScope;
import com.journeygo.modules.voucher.service.VoucherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/vouchers")
@RequiredArgsConstructor
@Tag(name = "Voucher Management", description = "APIs quản lý Voucher nền tảng và đối tác")
public class VoucherController {

    private final VoucherService voucherService;

    @PostMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin tạo voucher mới (nền tảng hoặc đối tác)")
    public ResponseEntity<ApiResponse<VoucherResponse>> createVoucher(@Valid @RequestBody CreateVoucherRequest request) {
        VoucherResponse response = voucherService.createVoucher(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo voucher thành công", response));
    }

    @PutMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin cập nhật thông tin voucher")
    public ResponseEntity<ApiResponse<VoucherResponse>> updateVoucher(
            @PathVariable Long id,
            @Valid @RequestBody UpdateVoucherRequest request) {
        VoucherResponse response = voucherService.updateVoucher(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật voucher thành công", response));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin lấy danh sách voucher có phân trang và bộ lọc")
    public ResponseEntity<ApiResponse<Page<VoucherResponse>>> getVouchers(
            @RequestParam(required = false) VoucherScope scope,
            @RequestParam(required = false) Long partnerId,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<VoucherResponse> page = voucherService.getVouchers(scope, partnerId, active, search, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách voucher thành công", page));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết voucher")
    public ResponseEntity<ApiResponse<VoucherResponse>> getVoucherById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết voucher thành công", voucherService.getVoucherById(id)));
    }

    @GetMapping("/applicable")
    @Operation(summary = "Lấy danh sách voucher khả dụng cho một tour của đối tác")
    public ResponseEntity<ApiResponse<List<VoucherResponse>>> getApplicableVouchers(@RequestParam Long partnerId) {
        List<VoucherResponse> vouchers = voucherService.getApplicableVouchers(partnerId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách voucher khả dụng thành công", vouchers));
    }

    @PostMapping("/calculate")
    @Operation(summary = "Kiểm tra và tính toán phân bổ doanh thu khi áp dụng voucher vào tour")
    public ResponseEntity<ApiResponse<VoucherCalculationResult>> calculateVoucher(@Valid @RequestBody ValidateVoucherRequest request) {
        VoucherCalculationResult result = voucherService.calculateAndValidateVoucher(request);
        return ResponseEntity.ok(ApiResponse.success("Tính toán voucher thành công", result));
    }
}
