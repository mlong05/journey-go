package com.journeygo.modules.tourfeedback.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.tourfeedback.dto.request.CreateTourCustomerReviewRequest;
import com.journeygo.modules.tourfeedback.dto.request.UpdateTourCustomerReviewRequest;
import com.journeygo.modules.tourfeedback.dto.response.TourCustomerReviewResponse;
import com.journeygo.modules.tourfeedback.dto.response.TourRatingSummaryResponse;
import com.journeygo.modules.tourfeedback.dto.response.TourReviewEligibilityResponse;
import com.journeygo.modules.tourfeedback.service.TourCustomerReviewService;
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

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Verified Tour Reviews", description = "Đánh giá tour xác thực từ du khách đã trải nghiệm")
public class TourCustomerReviewController {

    private final TourCustomerReviewService reviewService;

    @GetMapping("/tours/{tourId}/reviews")
    @Operation(summary = "Danh sách đánh giá công khai của tour")
    public ResponseEntity<ApiResponse<PageResponse<TourCustomerReviewResponse>>> getTourReviews(
            @PathVariable Long tourId,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) Boolean hasPhotos,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String viewerEmail = principal != null ? principal.getEmail() : null;
        boolean isStaff = isStaff(principal);
        PageResponse<TourCustomerReviewResponse> data = reviewService.getPublicReviews(
                tourId, rating, hasPhotos, sort, page, size, viewerEmail, isStaff);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đánh giá thành công", data));
    }

    @GetMapping("/tours/{tourId}/reviews/summary")
    @Operation(summary = "Thống kê điểm sao và tiêu chí đánh giá của tour")
    public ResponseEntity<ApiResponse<TourRatingSummaryResponse>> getTourReviewSummary(
            @PathVariable Long tourId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String viewerEmail = principal != null ? principal.getEmail() : null;
        boolean isStaff = isStaff(principal);
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy thống kê đánh giá thành công",
                reviewService.getTourRatingSummary(tourId, viewerEmail, isStaff)));
    }

    @GetMapping("/tour-reviews/eligibility/{bookingId}")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Kiểm tra điều kiện viết đánh giá xác thực cho một booking")
    public ResponseEntity<ApiResponse<TourReviewEligibilityResponse>> checkEligibility(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Kiểm tra điều kiện đánh giá thành công",
                reviewService.checkEligibility(bookingId, principal.getId())));
    }

    @PostMapping("/tour-reviews")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Gửi đánh giá xác thực cho chuyến đi đã hoàn thành")
    public ResponseEntity<ApiResponse<TourCustomerReviewResponse>> create(
            @Valid @RequestBody CreateTourCustomerReviewRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        TourCustomerReviewResponse created = reviewService.createReview(request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Gửi đánh giá thành công", created));
    }

    @PutMapping("/tour-reviews/{reviewId}")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Chỉnh sửa đánh giá của bản thân (trong vòng 7 ngày)")
    public ResponseEntity<ApiResponse<TourCustomerReviewResponse>> update(
            @PathVariable Long reviewId,
            @Valid @RequestBody UpdateTourCustomerReviewRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        TourCustomerReviewResponse updated = reviewService.updateReview(reviewId, request, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật đánh giá thành công", updated));
    }

    @DeleteMapping("/tour-reviews/{reviewId}")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xóa đánh giá (tác giả hoặc Admin)")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long reviewId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        boolean isAdmin = hasRole(principal, "ROLE_ADMIN");
        reviewService.deleteReview(reviewId, principal.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success("Xóa đánh giá thành công", null));
    }

    @GetMapping("/tour-reviews/my")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách đánh giá của tôi")
    public ResponseEntity<ApiResponse<PageResponse<TourCustomerReviewResponse>>> getMyReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách đánh giá của tôi thành công",
                reviewService.getMyReviews(principal.getId(), page, size)));
    }

    private static boolean hasRole(UserPrincipal principal, String role) {
        return principal != null && principal.getAuthorities().stream()
                .anyMatch(a -> role.equals(a.getAuthority()));
    }

    private static boolean isStaff(UserPrincipal principal) {
        return hasRole(principal, "ROLE_ADMIN")
                || hasRole(principal, "ROLE_CONTENT_MODERATOR")
                || hasRole(principal, "ROLE_CONTENT_PROVIDER");
    }
}
