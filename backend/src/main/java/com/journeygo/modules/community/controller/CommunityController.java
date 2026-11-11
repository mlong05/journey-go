package com.journeygo.modules.community.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.community.dto.*;
import com.journeygo.modules.community.entity.enums.ReportStatus;
import com.journeygo.modules.community.service.CommentReportService;
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
    private final CommentReportService commentReportService;

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
        boolean canModerate = userPrincipal != null && userPrincipal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_MODERATOR".equals(a.getAuthority()));
        PostResponse post = communityService.getPostDetail(id, currentUserId, canModerate);
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

    @PostMapping("/posts/{id}/submit")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Gửi duyệt bài viết", description = "Tác giả gửi duyệt bài nháp, bài bị từ chối hoặc bài được yêu cầu chỉnh sửa")
    public ResponseEntity<ApiResponse<PostResponse>> submitPost(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.success("Đã gửi bài viết để kiểm duyệt",
                communityService.submitPost(id, userPrincipal.getId())));
    }

    @DeleteMapping("/posts/{id}")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xóa bài viết của tôi", description = "Tác giả xóa bài của mình; không xóa được khi bài còn báo cáo chờ xử lý")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        communityService.deletePost(id, userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success("Đã xóa bài viết", null));
    }

    @DeleteMapping("/comments/{id}")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xóa bình luận của tôi")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        communityService.deleteComment(id, userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success("Đã xóa bình luận", null));
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
    @Operation(summary = "Thả tim / tương tác với bài viết", description = "Thả tim hoặc bỏ tim bài viết (chỉ hỗ trợ reactionType = LOVE, bỏ trống thì mặc định LOVE)")
    public ResponseEntity<ApiResponse<Integer>> toggleReaction(
            @PathVariable Long id,
            @RequestBody(required = false) PostReactionRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        int likesCount = communityService.toggleReaction(id, userPrincipal.getId(),
                request == null ? null : request.reactionType());
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

    @PostMapping("/comments/{id}/report")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Báo cáo bình luận vi phạm", description = "Gửi báo cáo bình luận có nội dung không phù hợp cho kiểm duyệt viên")
    public ResponseEntity<ApiResponse<CommentReportResponse>> reportComment(
            @PathVariable Long id,
            @Valid @RequestBody CreateReportRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.success("Đã gửi báo cáo bình luận, cảm ơn bạn đã góp phần xây dựng cộng đồng",
                commentReportService.reportComment(id, userPrincipal.getId(), request)));
    }

    // ── MODERATOR ENDPOINTS ─────────────────────────────────────────────────────

    @GetMapping("/moderation/pending")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy danh sách bài viết chờ duyệt (Moderator)", description = "Danh sách bài viết PENDING_REVIEW dành cho Kiểm duyệt viên")
    public ResponseEntity<ApiResponse<Page<PostResponse>>> getPendingPosts(
            @PageableDefault(size = 10) Pageable pageable
    ) {
        Page<PostResponse> page = communityService.getPendingPosts(pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách bài viết chờ duyệt thành công", page));
    }

    @PostMapping("/moderation/posts/{id}")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'ADMIN')")
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

    @PatchMapping("/moderation/posts/{id}/visibility")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Ẩn hoặc hiện lại bài viết (Moderator)", description = "hidden=true để gỡ bài khỏi cộng đồng, hidden=false để khôi phục")
    public ResponseEntity<ApiResponse<PostResponse>> setPostVisibility(
            @PathVariable Long id,
            @RequestParam boolean hidden,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.success(hidden ? "Đã ẩn bài viết" : "Đã hiện lại bài viết",
                communityService.setPostHidden(id, userPrincipal.getId(), hidden)));
    }

    @PatchMapping("/moderation/comments/{id}/visibility")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Ẩn hoặc hiện lại bình luận (Moderator)")
    public ResponseEntity<ApiResponse<CommentResponse>> setCommentVisibility(
            @PathVariable Long id,
            @RequestParam boolean hidden,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.success(hidden ? "Đã ẩn bình luận" : "Đã hiện lại bình luận",
                communityService.setCommentHidden(id, userPrincipal.getId(), hidden)));
    }

    @GetMapping("/moderation/comment-reports")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xem báo cáo bình luận (Moderator)", description = "Báo cáo bình luận kèm nội dung bình luận và bài chứa nó")
    public ResponseEntity<ApiResponse<Page<CommentReportResponse>>> getCommentReports(
            @RequestParam(required = false) ReportStatus status,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách báo cáo bình luận thành công",
                commentReportService.getReports(status, pageable)));
    }

    @PatchMapping("/moderation/comment-reports/{id}/resolve")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xử lý báo cáo bình luận (Moderator)", description = "Xác nhận vi phạm và tuỳ chọn ẩn bình luận")
    public ResponseEntity<ApiResponse<CommentReportResponse>> resolveCommentReport(
            @PathVariable Long id,
            @RequestParam(defaultValue = "true") boolean hideComment,
            @RequestParam(required = false) String note,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.success("Xử lý báo cáo bình luận thành công",
                commentReportService.resolve(id, userPrincipal.getId(), hideComment, note)));
    }

    @PatchMapping("/moderation/comment-reports/{id}/dismiss")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Bác bỏ báo cáo bình luận (Moderator)", description = "Bình luận không vi phạm; giữ nguyên")
    public ResponseEntity<ApiResponse<CommentReportResponse>> dismissCommentReport(
            @PathVariable Long id,
            @RequestParam(required = false) String note,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.success("Đã bác bỏ báo cáo bình luận",
                commentReportService.dismiss(id, userPrincipal.getId(), note)));
    }

    @GetMapping("/moderation/reports")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'ADMIN')")
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
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'ADMIN')")
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

    @PatchMapping("/moderation/reports/{id}/dismiss")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Bác bỏ báo cáo vi phạm (Moderator)", description = "Báo cáo sai hoặc không vi phạm; bài viết giữ nguyên")
    public ResponseEntity<ApiResponse<ReportResponse>> dismissReport(
            @PathVariable Long id,
            @RequestParam(required = false) String note,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        ReportResponse report = communityService.dismissReport(id, userPrincipal.getId(), note);
        return ResponseEntity.ok(ApiResponse.success("Đã bác bỏ báo cáo", report));
    }
}
