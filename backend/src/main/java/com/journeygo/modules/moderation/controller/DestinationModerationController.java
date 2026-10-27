package com.journeygo.modules.moderation.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.destination.dto.DestinationResponse;
import com.journeygo.modules.destination.entity.DestinationStatus;
import com.journeygo.modules.moderation.service.DestinationModerationService;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/moderation/destinations")
@RequiredArgsConstructor
@Tag(name = "Kiểm duyệt điểm đến")
@SecurityRequirement(name = "Bearer Authentication")
public class DestinationModerationController {
    private final DestinationModerationService moderationService;

    @PostMapping("/{destinationId}/submit")
    @PreAuthorize("hasAnyRole('PROVIDER', 'ADMIN', 'MODERATOR')")
    @Operation(summary = "Gửi điểm đến để kiểm duyệt")
    public ResponseEntity<ApiResponse<DestinationResponse>> submit(
            @PathVariable Long destinationId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã gửi điểm đến để kiểm duyệt",
                moderationService.submit(destinationId, principal.getId(), role(principal))));
    }

    @GetMapping("/queue")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Lấy hàng chờ kiểm duyệt điểm đến")
    public ResponseEntity<ApiResponse<PageResponse<DestinationResponse>>> queue(
            @ParameterObject @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy hàng chờ kiểm duyệt điểm đến thành công",
                moderationService.getQueue(pageable)));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Lấy điểm đến theo trạng thái kiểm duyệt")
    public ResponseEntity<ApiResponse<PageResponse<DestinationResponse>>> byStatus(
            @PathVariable DestinationStatus status,
            @ParameterObject @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách điểm đến theo trạng thái thành công",
                moderationService.getByStatus(status, pageable)));
    }

    @PatchMapping("/{destinationId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Duyệt và xuất bản điểm đến")
    public ResponseEntity<ApiResponse<DestinationResponse>> approve(@PathVariable Long destinationId) {
        return ResponseEntity.ok(ApiResponse.success("Đã duyệt điểm đến",
                moderationService.approve(destinationId)));
    }

    @PatchMapping("/{destinationId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Từ chối điểm đến")
    public ResponseEntity<ApiResponse<DestinationResponse>> reject(@PathVariable Long destinationId) {
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối điểm đến",
                moderationService.reject(destinationId)));
    }

    private Role role(UserPrincipal principal) {
        return Role.valueOf(principal.getAuthorities().iterator().next().getAuthority().replace("ROLE_", ""));
    }
}
