package com.journeygo.modules.tourfeedback.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.tourfeedback.dto.request.CreateReviewReportRequest;
import com.journeygo.modules.tourfeedback.dto.request.ResolveReviewReportRequest;
import com.journeygo.modules.tourfeedback.dto.request.ReviewReplyDecisionRequest;
import com.journeygo.modules.tourfeedback.dto.request.ToggleReviewVisibilityRequest;
import com.journeygo.modules.tourfeedback.dto.response.ReviewHistoryEntryResponse;
import com.journeygo.modules.tourfeedback.dto.response.ReviewModerationHistoryResponse;
import com.journeygo.modules.tourfeedback.dto.response.ReviewReplyResponse;
import com.journeygo.modules.tourfeedback.dto.response.ReviewReportResponse;
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

import java.util.List;

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

    // ── Lịch sử kiểm duyệt (E2d) ────────────────────────────────────────────

    @GetMapping("/history/all")
    @Operation(summary = "Lịch sử kiểm duyệt đánh giá toàn hệ thống")
    public ResponseEntity<ApiResponse<PageResponse<ReviewHistoryEntryResponse>>> allHistory(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy lịch sử kiểm duyệt đánh giá thành công",
                reviewService.listAllModerationHistory(q, page, size)));
    }

    @GetMapping("/{reviewId}/history")
    @Operation(summary = "Lịch sử kiểm duyệt của một đánh giá tour")
    public ResponseEntity<ApiResponse<List<ReviewModerationHistoryResponse>>> history(
            @PathVariable Long reviewId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy lịch sử kiểm duyệt đánh giá thành công",
                reviewService.getModerationHistory(reviewId)));
    }

    // ── Duyệt phản hồi của đối tác (E2c) ─────────────────────────────────────

    @GetMapping("/replies/pending")
    @Operation(summary = "Hàng đợi phản hồi của đối tác đang chờ kiểm duyệt")
    public ResponseEntity<ApiResponse<PageResponse<ReviewReplyResponse>>> pendingReplies(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách phản hồi chờ duyệt thành công",
                reviewService.listPendingReplies(page, size)));
    }

    @PatchMapping("/replies/{replyId}/approve")
    @Operation(summary = "Duyệt phản hồi của đối tác (hiển thị công khai)")
    public ResponseEntity<ApiResponse<ReviewReplyResponse>> approveReply(
            @PathVariable Long replyId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Duyệt phản hồi thành công",
                reviewService.approveReply(replyId, principal.getId())));
    }

    @PatchMapping("/replies/{replyId}/reject")
    @Operation(summary = "Từ chối phản hồi của đối tác")
    public ResponseEntity<ApiResponse<ReviewReplyResponse>> rejectReply(
            @PathVariable Long replyId,
            @Valid @RequestBody ReviewReplyDecisionRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Từ chối phản hồi thành công",
                reviewService.rejectReply(replyId, principal.getId(), request.reason())));
    }

    // ── Báo cáo đánh giá vi phạm (E2e / D1) ──────────────────────────────────

    @GetMapping("/reports")
    @Operation(summary = "Danh sách báo cáo đánh giá vi phạm")
    public ResponseEntity<ApiResponse<PageResponse<ReviewReportResponse>>> reports(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách báo cáo đánh giá thành công",
                reviewService.listReports(status, page, size)));
    }

    @PatchMapping("/reports/{reportId}/resolve")
    @Operation(summary = "Xử lý báo cáo đánh giá vi phạm (đã xử lý)")
    public ResponseEntity<ApiResponse<ReviewReportResponse>> resolveReport(
            @PathVariable Long reportId,
            @Valid @RequestBody ResolveReviewReportRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Xử lý báo cáo thành công",
                reviewService.resolveReport(reportId, principal.getId(), request.resolution(), false)));
    }

    @PatchMapping("/reports/{reportId}/dismiss")
    @Operation(summary = "Bác báo cáo đánh giá vi phạm (không có cơ sở)")
    public ResponseEntity<ApiResponse<ReviewReportResponse>> dismissReport(
            @PathVariable Long reportId,
            @Valid @RequestBody ResolveReviewReportRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Bác báo cáo thành công",
                reviewService.resolveReport(reportId, principal.getId(), request.resolution(), true)));
    }
}
