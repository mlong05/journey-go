package com.journeygo.modules.providerprofile.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.providerprofile.dto.request.CreateProviderProfileRequest;
import com.journeygo.modules.providerprofile.dto.request.UpdateProviderProfileRequest;
import com.journeygo.modules.providerprofile.dto.response.ProviderProfileResponse;
import com.journeygo.modules.providerprofile.service.ProviderProfileService;
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
@RequestMapping("/api/v1/provider-profiles")
@RequiredArgsConstructor
@Tag(name = "ProviderProfile (Đối tác)", description = "Quản lý đối tác và ví nội bộ")
public class ProviderProfileController {

    private final ProviderProfileService providerProfileService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo đối tác kèm ví nội bộ",
            description = "Chọn User có sẵn và gán vai trò CONTENT_PROVIDER. Hệ thống tạo ProviderProfile và Wallet "
                    + "trong cùng một transaction — nếu tạo Wallet thất bại thì toàn bộ được rollback.")
    public ResponseEntity<ApiResponse<ProviderProfileResponse>> create(
            @Valid @RequestBody CreateProviderProfileRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo đối tác thành công",
                        providerProfileService.createProviderProfile(request, principal.getId())));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách đối tác")
    public ResponseEntity<ApiResponse<PageResponse<ProviderProfileResponse>>> getAll(
            @RequestParam(required = false) Boolean active,
            @ParameterObject @PageableDefault(page = 0, size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đối tác thành công",
                providerProfileService.getAll(active, pageable)));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách đối tác đang hoạt động")
    public ResponseEntity<ApiResponse<List<ProviderProfileResponse>>> getActive() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đối tác thành công",
                providerProfileService.getActiveProviderProfiles()));
    }

    @GetMapping("/{providerProfileId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Chi tiết đối tác")
    public ResponseEntity<ApiResponse<ProviderProfileResponse>> getById(@PathVariable Long providerProfileId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin đối tác thành công",
                providerProfileService.getById(providerProfileId)));
    }

    @GetMapping("/by-user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tìm đối tác theo user")
    public ResponseEntity<ApiResponse<ProviderProfileResponse>> getByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin đối tác thành công",
                providerProfileService.getByUserId(userId)));
    }
    @PutMapping("/{providerProfileId}")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Cập nhật thông tin đối tác")
    public ResponseEntity<ApiResponse<ProviderProfileResponse>> update(
            @PathVariable Long providerProfileId,
            @Valid @RequestBody UpdateProviderProfileRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật đối tác thành công",
                providerProfileService.updateProviderProfile(providerProfileId, request.providerName(),
                        request.commissionRate(), request.active())));
    }
}
