package com.journeygo.modules.moderation.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.moderation.dto.ContentReviewResponse;
import com.journeygo.modules.moderation.dto.ReviewDecisionRequest;
import com.journeygo.modules.moderation.entity.enums.ContentRejectionReason;
import com.journeygo.modules.moderation.service.ContentModerationService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/moderation/contents")
@RequiredArgsConstructor
@Tag(name = "Kiểm duyệt nội dung")
@SecurityRequirement(name = "Bearer Authentication")
public class ContentModerationController {
    private final ContentModerationService moderationService;

    @PostMapping("/{contentId}/submit")
    @PreAuthorize("hasAnyRole('CONTENT_PROVIDER', 'CONTENT_MODERATOR')")
    @Operation(summary = "Gửi content kiểm duyệt hoặc gửi lại content bị từ chối")
    public ResponseEntity<ApiResponse<ContentReviewResponse>> submit(@PathVariable Long contentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã gửi nội dung để kiểm duyệt",
                moderationService.submit(contentId, principal.getId(), role(principal))));
    }

    @GetMapping("/queue")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    public ResponseEntity<ApiResponse<PageResponse<ContentReviewResponse>>> queue(Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy hàng chờ kiểm duyệt thành công",
                PageResponse.from(moderationService.getQueue(pageable), x -> x)));
    }

    @GetMapping("/{contentId}/history")
    @PreAuthorize("hasAnyRole('CONTENT_PROVIDER', 'CONTENT_MODERATOR')")
    @Operation(summary = "Xem trạng thái và toàn bộ lịch sử kiểm duyệt của content")
    public ResponseEntity<ApiResponse<ContentReviewResponse>> history(
            @PathVariable Long contentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử kiểm duyệt nội dung thành công",
                moderationService.getHistory(contentId, principal.getId(), role(principal))));
    }

    @GetMapping("/rejection-reasons")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    public ResponseEntity<ApiResponse<java.util.List<RejectionReasonOption>>> rejectionReasons() {
        var reasons = java.util.Arrays.stream(ContentRejectionReason.values())
                .map(reason -> new RejectionReasonOption(reason.getCode(), reason.getLabel())).toList();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách lý do từ chối thành công", reasons));
    }

    @PatchMapping("/{contentId}/approve")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    public ResponseEntity<ApiResponse<ContentReviewResponse>> approve(@PathVariable Long contentId,
            @Valid @RequestBody(required = false) ReviewDecisionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã duyệt nội dung",
                moderationService.approve(contentId, principal.getId(), request == null ? null : request.note())));
    }

    @PatchMapping("/{contentId}/reject")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    public ResponseEntity<ApiResponse<ContentReviewResponse>> reject(@PathVariable Long contentId,
            @Valid @RequestBody ReviewDecisionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối nội dung",
                moderationService.reject(contentId, principal.getId(), request.note(), request.reason(), request.otherReason())));
    }

    public record RejectionReasonOption(String code, String label) {}

    private com.journeygo.modules.user.entity.Role role(UserPrincipal principal) {
        return com.journeygo.modules.user.entity.Role.valueOf(principal.getAuthorities().iterator().next().getAuthority().replace("ROLE_", ""));
    }
}
