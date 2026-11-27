package com.journeygo.modules.tourfeedback.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.tourfeedback.dto.request.ToggleReviewVisibilityRequest;
import com.journeygo.modules.tourfeedback.dto.response.TourCustomerReviewResponse;
import com.journeygo.modules.tourfeedback.service.TourCustomerReviewService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/moderation/tour-reviews")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'ADMIN')")
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Moderation Tour Reviews", description = "Kiểm duyệt viên quản lý hiển thị đánh giá tour")
public class ModTourReviewController {

    private final TourCustomerReviewService reviewService;

    @GetMapping
    @Operation(summary = "Danh sách đánh giá tour phục vụ kiểm duyệt")
    public ResponseEntity<ApiResponse<PageResponse<TourCustomerReviewResponse>>> list(
            @RequestParam(required = false) Boolean hidden,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách kiểm duyệt đánh giá thành công",
                reviewService.listForModeration(hidden, rating, q, page, size)));
    }

    @PatchMapping("/{reviewId}/visibility")
    @Operation(summary = "Ẩn hoặc khôi phục đánh giá tour vi phạm")
    public ResponseEntity<ApiResponse<TourCustomerReviewResponse>> toggleVisibility(
            @PathVariable Long reviewId,
            @Valid @RequestBody ToggleReviewVisibilityRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        boolean isAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        return ResponseEntity.ok(ApiResponse.success(
                "Cập nhật trạng thái hiển thị đánh giá thành công",
                reviewService.toggleVisibility(reviewId, request, principal.getId(), isAdmin)));
    }
}
