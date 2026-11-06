package com.journeygo.modules.moderation.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.moderation.dto.DestinationReviewResponse;
import com.journeygo.modules.moderation.dto.DestinationReviewDecisionRequest;
import com.journeygo.modules.moderation.entity.enums.DestinationReviewStatus;
import com.journeygo.modules.moderation.entity.enums.DestinationRejectionReason;
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
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/moderation/destinations")
@RequiredArgsConstructor
@Tag(name = "Kiểm duyệt điểm đến")
@SecurityRequirement(name = "Bearer Authentication")
public class DestinationModerationController {
    private final DestinationModerationService moderationService;

    @GetMapping("/approved")
    @Operation(summary = "Lấy danh sách điểm đến đã được duyệt")
    public ResponseEntity<ApiResponse<PageResponse<com.journeygo.modules.destination.dto.DestinationResponse>>> approved(
            @ParameterObject @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách điểm đến đã duyệt thành công",
                moderationService.getApproved(pageable)));
    }

    @PostMapping("/{destinationId}/submit")
    @PreAuthorize("hasAnyRole('CONTENT_PROVIDER', 'ADMIN', 'CONTENT_MODERATOR')")
    @Operation(summary = "Gửi điểm đến để kiểm duyệt")
    public ResponseEntity<ApiResponse<DestinationReviewResponse>> submit(
            @PathVariable Long destinationId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã gửi điểm đến để kiểm duyệt",
                moderationService.submit(destinationId, principal.getId(), role(principal))));
    }

    @GetMapping("/queue")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    @Operation(summary = "Lấy hàng chờ kiểm duyệt điểm đến")
    public ResponseEntity<ApiResponse<PageResponse<DestinationReviewResponse>>> queue(
            @ParameterObject @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy hàng chờ kiểm duyệt điểm đến thành công",
                moderationService.getQueue(pageable)));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    @Operation(summary = "Lấy điểm đến theo trạng thái kiểm duyệt")
    public ResponseEntity<ApiResponse<PageResponse<DestinationReviewResponse>>> byStatus(
            @PathVariable DestinationReviewStatus status,
            @ParameterObject @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách điểm đến theo trạng thái thành công",
                moderationService.getByStatus(status, pageable)));
    }

    @GetMapping("/rejection-reasons")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    public ResponseEntity<ApiResponse<java.util.List<RejectionReasonOption>>> rejectionReasons() {
        var reasons = java.util.Arrays.stream(DestinationRejectionReason.values())
                .map(reason -> new RejectionReasonOption(reason.getCode(), reason.getLabel())).toList();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách lý do từ chối thành công", reasons));
    }

    public record RejectionReasonOption(String code, String label) {}

    @GetMapping("/{destinationId}/history")
    @PreAuthorize("hasAnyRole('CONTENT_PROVIDER', 'ADMIN', 'CONTENT_MODERATOR')")
    @Operation(summary = "Xem trạng thái và lịch sử kiểm duyệt điểm đến")
    public ResponseEntity<ApiResponse<DestinationReviewResponse>> history(@PathVariable Long destinationId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử kiểm duyệt điểm đến thành công",
                moderationService.getHistory(destinationId, principal.getId(), role(principal))));
    }

    @PatchMapping("/{destinationId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    @Operation(summary = "Duyệt và xuất bản điểm đến")
    public ResponseEntity<ApiResponse<DestinationReviewResponse>> approve(@PathVariable Long destinationId,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody(required = false) DestinationReviewDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã duyệt điểm đến",
                moderationService.approve(destinationId, principal.getId(), request == null ? null : request.note())));
    }

    @PatchMapping("/{destinationId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    @Operation(summary = "Từ chối điểm đến")
    public ResponseEntity<ApiResponse<DestinationReviewResponse>> reject(@PathVariable Long destinationId,
            @AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody DestinationReviewDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối điểm đến",
                moderationService.reject(destinationId, principal.getId(), request.note(), request.reason(), request.otherReason())));
    }

    private Role role(UserPrincipal principal) {
        return Role.valueOf(principal.getAuthorities().iterator().next().getAuthority().replace("ROLE_", ""));
    }
}
