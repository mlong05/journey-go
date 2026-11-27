package com.journeygo.modules.tourfeedback.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.tourfeedback.dto.request.ReplyTourCustomerReviewRequest;
import com.journeygo.modules.tourfeedback.dto.response.ProviderReviewSummaryResponse;
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
@RequestMapping("/api/v1/provider/tour-reviews")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CONTENT_PROVIDER')")
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Provider Tour Reviews", description = "Đối tác xem và phản hồi đánh giá từ khách hàng")
public class ProviderTourReviewController {

    private final TourCustomerReviewService reviewService;

    @GetMapping
    @Operation(summary = "Danh sách đánh giá thuộc các tour của đối tác")
    public ResponseEntity<ApiResponse<PageResponse<TourCustomerReviewResponse>>> list(
            @RequestParam(required = false) Long tourId,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) Boolean replied,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách đánh giá đối tác thành công",
                reviewService.listForProvider(principal.getId(), tourId, rating, replied, page, size)));
    }

    @GetMapping("/summary")
    @Operation(summary = "Tổng hợp điểm đánh giá và số lượt chưa phản hồi của đối tác")
    public ResponseEntity<ApiResponse<ProviderReviewSummaryResponse>> summary(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy thống kê đánh giá đối tác thành công",
                reviewService.getProviderSummary(principal.getId())));
    }

    @PostMapping("/{reviewId}/reply")
    @Operation(summary = "Đối tác gửi hoặc cập nhật phản hồi cho đánh giá")
    public ResponseEntity<ApiResponse<TourCustomerReviewResponse>> reply(
            @PathVariable Long reviewId,
            @Valid @RequestBody ReplyTourCustomerReviewRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Phản hồi đánh giá thành công",
                reviewService.replyToReview(reviewId, request, principal.getId())));
    }
}
