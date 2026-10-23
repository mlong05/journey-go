package com.journeygo.modules.moderation.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.moderation.dto.ContentReviewResponse;
import com.journeygo.modules.moderation.dto.ReviewDecisionRequest;
import com.journeygo.modules.moderation.service.ContentModerationService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
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
    @PreAuthorize("hasAnyRole('PROVIDER', 'ADMIN', 'MODERATOR')")
    public ResponseEntity<ApiResponse<ContentReviewResponse>> submit(@PathVariable Long contentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã gửi nội dung để kiểm duyệt",
                moderationService.submit(contentId, principal.getId(), role(principal))));
    }

    @GetMapping("/queue")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<ApiResponse<PageResponse<ContentReviewResponse>>> queue(Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy hàng chờ kiểm duyệt thành công",
                PageResponse.from(moderationService.getQueue(pageable), x -> x)));
    }

    @PatchMapping("/{contentId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<ApiResponse<ContentReviewResponse>> approve(@PathVariable Long contentId,
            @Valid @RequestBody(required = false) ReviewDecisionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã duyệt nội dung",
                moderationService.approve(contentId, principal.getId(), request == null ? null : request.note())));
    }

    @PatchMapping("/{contentId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<ApiResponse<ContentReviewResponse>> reject(@PathVariable Long contentId,
            @Valid @RequestBody ReviewDecisionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối nội dung",
                moderationService.reject(contentId, principal.getId(), request.note())));
    }

    private com.journeygo.modules.user.entity.Role role(UserPrincipal principal) {
        return com.journeygo.modules.user.entity.Role.valueOf(principal.getAuthorities().iterator().next().getAuthority().replace("ROLE_", ""));
    }
}
