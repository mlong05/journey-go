package com.journeygo.modules.partner.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.partner.dto.request.CreatePartnerRequest;
import com.journeygo.modules.partner.dto.request.UpdatePartnerRequest;
import com.journeygo.modules.partner.dto.response.PartnerResponse;
import com.journeygo.modules.partner.service.PartnerService;
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

import java.util.List;

@RestController
@RequestMapping("/api/v1/partners")
@RequiredArgsConstructor
@Tag(name = "Partner (Đối tác)", description = "Quản lý đối tác và ví nội bộ")
public class PartnerController {

    private final PartnerService partnerService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo đối tác kèm ví nội bộ",
            description = "Chọn User có sẵn và gán vai trò PARTNER. Hệ thống tạo Partner và Wallet "
                    + "trong cùng một transaction — nếu tạo Wallet thất bại thì toàn bộ được rollback.")
    public ResponseEntity<ApiResponse<PartnerResponse>> create(
            @Valid @RequestBody CreatePartnerRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo đối tác thành công",
                        partnerService.createPartner(request, principal.getId())));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách đối tác")
    public ResponseEntity<ApiResponse<PageResponse<PartnerResponse>>> getAll(
            @RequestParam(required = false) Boolean active,
            @ParameterObject @PageableDefault(page = 0, size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đối tác thành công",
                partnerService.getAll(active, pageable)));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROVIDER', 'PARTNER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách đối tác đang hoạt động")
    public ResponseEntity<ApiResponse<List<PartnerResponse>>> getActive() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đối tác thành công",
                partnerService.getActivePartners()));
    }

    @GetMapping("/{partnerId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PARTNER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Chi tiết đối tác")
    public ResponseEntity<ApiResponse<PartnerResponse>> getById(@PathVariable Long partnerId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin đối tác thành công",
                partnerService.getById(partnerId)));
    }

    @GetMapping("/by-user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PARTNER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tìm đối tác theo user")
    public ResponseEntity<ApiResponse<PartnerResponse>> getByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin đối tác thành công",
                partnerService.getByUserId(userId)));
    }

    @PutMapping("/{partnerId}")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Cập nhật thông tin đối tác")
    public ResponseEntity<ApiResponse<PartnerResponse>> update(
            @PathVariable Long partnerId,
            @Valid @RequestBody UpdatePartnerRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật đối tác thành công",
                partnerService.updatePartner(partnerId, request.partnerName(),
                        request.commissionRate(), request.active())));
    }
}
