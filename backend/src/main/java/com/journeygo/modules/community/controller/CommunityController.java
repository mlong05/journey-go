package com.journeygo.modules.community.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.community.dto.*;
import com.journeygo.modules.community.entity.enums.ReportStatus;
import com.journeygo.modules.community.service.CommunityService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/community")
@RequiredArgsConstructor
@Tag(name = "Cộng đồng du lịch (Community)", description = "Các API chia sẻ bài viết, trải nghiệm du lịch, bình luận, tương tác và kiểm duyệt nội dung cộng đồng")
public class CommunityController {

    private final CommunityService communityService;

    // ── PUBLIC / FEED ───────────────────────────────────────────────────────────

    @GetMapping("/posts")
    @Operation(summary = "Lấy bảng tin bài viết cộng đồng (Feed)", description = "Trả về danh sách các bài viết đã được kiểm duyệt và công khai (PUBLISHED)")
    public ResponseEntity<ApiResponse<Page<PostResponse>>> getFeed(
            @RequestParam(required = false) Long destinationId,
            @RequestParam(required = false) Long tourId,
            @PageableDefault(size = 10) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        Long currentUserId = userPrincipal != null ? userPrincipal.getId() : null;
        Page<PostResponse> page = communityService.getFeed(pageable, destinationId, tourId, currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Lấy bảng tin cộng đồng thành công", page));
    }

    @GetMapping("/posts/{id}")
    @Operation(summary = "Xem chi tiết bài viết", description = "Lấy toàn bộ thông tin chi tiết bài viết và danh sách hình ảnh/video đính kèm")
    public ResponseEntity<ApiResponse<PostResponse>> getPostDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        Long currentUserId = userPrincipal != null ? userPrincipal.getId() : null;
        PostResponse post = communityService.getPostDetail(id, currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết bài viết thành công", post));
    }

    @GetMapping("/posts/{id}/comments")
    @Operation(summary = "Xem danh sách bình luận của bài viết", description = "Trả về các bình luận công khai dưới bài viết theo thứ tự thời gian")
    public ResponseEntity<ApiResponse<Page<CommentResponse>>> getPostComments(
            @PathVariable Long id,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Page<CommentResponse> comments = communityService.getPostComments(id, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách bình luận thành công", comments));
    }

    // ── USER AUTHENTICATED ENDPOINTS ────────────────────────────────────────────

    @PostMapping("/posts")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Đăng bài viết mới", description = "Du khách tạo bài viết chia sẻ, mặc định sẽ gửi vào hàng đợi chờ kiểm duyệt (PENDING_REVIEW)")
    public ResponseEntity<ApiResponse<PostResponse>> createPost(
            @Valid @RequestBody CreatePostRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        PostResponse post = communityService.createPost(userPrincipal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đăng bài viết thành công, bài viết đang chờ kiểm duyệt", post));
    }

    @PutMapping("/posts/{id}")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Chỉnh sửa bài viết", description = "Chỉnh sửa nội dung; nếu bài đã công khai (PUBLISHED) sẽ tự động quay lại chờ kiểm duyệt")
    public ResponseEntity<ApiResponse<PostResponse>> updatePost(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePostRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        PostResponse post = communityService.updatePost(id, userPrincipal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật bài viết thành công", post));
    }

    @GetMapping("/posts/my")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xem các bài viết của tôi", description = "Trả về toàn bộ bài viết cá nhân của du khách (kể cả bản nháp hoặc đang chờ duyệt)")
    public ResponseEntity<ApiResponse<Page<PostResponse>>> getMyPosts(
            @PageableDefault(size = 10) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        Page<PostResponse> page = communityService.getMyPosts(userPrincipal.getId(), pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách bài viết cá nhân thành công", page));
    }

    @PostMapping("/posts/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Viết bình luận vào bài viết", description = "Bình luận trực tiếp vào bài viết đã được công khai")
    public ResponseEntity<ApiResponse<CommentResponse>> addComment(
            @PathVariable Long id,
            @Valid @RequestBody PostCommentRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        CommentResponse comment = communityService.addComment(id, userPrincipal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã đăng bình luận thành công", comment));
    }

    @PostMapping("/posts/{id}/react")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Thả tim / tương tác với bài viết", description = "Thả cảm xúc hoặc hủy cảm xúc bài viết (LIKE, LOVE, CLAP, WOW)")
    public ResponseEntity<ApiResponse<Integer>> toggleReaction(
            @PathVariable Long id,
            @Valid @RequestBody PostReactionRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        int likesCount = communityService.toggleReaction(id, userPrincipal.getId(), request.reactionType());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tương tác thành công", likesCount));
    }

    @PostMapping("/posts/{id}/report")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Báo cáo bài viết vi phạm", description = "Gửi báo cáo bài viết có nội dung không phù hợp cho ban quản trị kiểm duyệt")
    public ResponseEntity<ApiResponse<ReportResponse>> reportPost(
            @PathVariable Long id,
            @Valid @RequestBody CreateReportRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        ReportResponse report = communityService.reportPost(id, userPrincipal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Đã gửi báo cáo vi phạm, cảm ơn bạn đã đóng góp xây dựng cộng đồng", report));
    }

    // ── MODERATOR ENDPOINTS ─────────────────────────────────────────────────────

    @GetMapping("/moderation/pending")
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy danh sách bài viết chờ duyệt (Moderator)", description = "Danh sách bài viết PENDING_REVIEW dành cho Kiểm duyệt viên")
    public ResponseEntity<ApiResponse<Page<PostResponse>>> getPendingPosts(
            @PageableDefault(size = 10) Pageable pageable
    ) {
        Page<PostResponse> page = communityService.getPendingPosts(pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách bài viết chờ duyệt thành công", page));
    }

    @PostMapping("/moderation/posts/{id}")
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Kiểm duyệt bài viết (Moderator)", description = "Phê duyệt (APPROVE), Từ chối (REJECT) hoặc Yêu cầu chỉnh sửa (REQUEST_REVISION)")
    public ResponseEntity<ApiResponse<PostResponse>> moderatePost(
            @PathVariable Long id,
            @Valid @RequestBody ModeratePostRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        PostResponse post = communityService.moderatePost(id, userPrincipal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Kiểm duyệt bài viết thành công", post));
    }

    @GetMapping("/moderation/reports")
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xem danh sách báo cáo vi phạm (Moderator)", description = "Lấy các báo cáo bài viết vi phạm từ cộng đồng")
    public ResponseEntity<ApiResponse<Page<ReportResponse>>> getReports(
            @RequestParam(required = false) ReportStatus status,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Page<ReportResponse> page = communityService.getReports(status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách báo cáo vi phạm thành công", page));
    }

    @PatchMapping("/moderation/reports/{id}/resolve")
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xử lý báo cáo vi phạm (Moderator)", description = "Xác nhận xử lý vi phạm và tùy chọn ẩn bài viết khỏi cộng đồng")
    public ResponseEntity<ApiResponse<ReportResponse>> resolveReport(
            @PathVariable Long id,
            @RequestParam(defaultValue = "true") boolean hidePost,
            @RequestParam(required = false) String note,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        ReportResponse report = communityService.resolveReport(id, userPrincipal.getId(), hidePost, note);
        return ResponseEntity.ok(ApiResponse.success("Xử lý báo cáo vi phạm thành công", report));
    }
}
