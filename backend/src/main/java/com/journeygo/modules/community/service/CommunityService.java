package com.journeygo.modules.community.service;

import com.journeygo.modules.community.dto.*;
import com.journeygo.modules.community.entity.*;
import com.journeygo.modules.community.entity.enums.*;
import com.journeygo.modules.community.repository.*;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommunityService {

    private final CommunityPostRepository postRepository;
    private final PostMediaRepository mediaRepository;
    private final PostCommentRepository commentRepository;
    private final PostReactionRepository reactionRepository;
    private final PostReportRepository reportRepository;
    private final UserRepository userRepository;

    // ── POST MANAGEMENT ─────────────────────────────────────────────────────────

    @Transactional
    public PostResponse createPost(Long userId, CreatePostRequest request) {
        User author = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        PostStatus initialStatus = Boolean.TRUE.equals(request.saveAsDraft())
                ? PostStatus.DRAFT
                : PostStatus.PENDING_REVIEW;

        CommunityPost post = CommunityPost.builder()
                .authorId(userId)
                .authorName(author.getFullName())
                .authorAvatarUrl(author.getAvatarUrl())
                .title(request.title().trim())
                .content(request.content().trim())
                .tourId(request.tourId())
                .destinationId(request.destinationId())
                .journeyId(request.journeyId())
                .status(initialStatus)
                .likesCount(0)
                .commentsCount(0)
                .hidden(false)
                .build();

        if (request.mediaUrls() != null && !request.mediaUrls().isEmpty()) {
            int order = 0;
            for (String url : request.mediaUrls()) {
                if (url != null && !url.isBlank()) {
                    post.addMedia(PostMedia.builder()
                            .mediaUrl(url.trim())
                            .mediaType(url.endsWith(".mp4") ? "VIDEO" : "IMAGE")
                            .orderIndex(order++)
                            .build());
                }
            }
        }

        CommunityPost saved = postRepository.save(post);
        log.info("Du khách {} tạo bài viết mới id={}, status={}", userId, saved.getId(), initialStatus);
        return PostResponse.fromEntity(saved, null);
    }

    @Transactional
    public PostResponse updatePost(Long postId, Long userId, UpdatePostRequest request) {
        CommunityPost post = postRepository.findByIdWithMedia(postId)
                .orElseThrow(() -> new ResourceNotFoundException("CommunityPost", postId));

        if (!post.getAuthorId().equals(userId)) {
            throw new BusinessException("FORBIDDEN-POST", "Bạn không có quyền chỉnh sửa bài viết của người khác");
        }

        post.setTitle(request.title().trim());
        post.setContent(request.content().trim());

        // QUY TẮC AN TOÀN: Nếu bài viết đã PUBLISHED mà bị chỉnh sửa nội dung
        // Bắt buộc quay lại PENDING_REVIEW để kiểm duyệt lại, chống đổi nội dung vi phạm!
        if (post.getStatus() == PostStatus.PUBLISHED) {
            post.setStatus(PostStatus.PENDING_REVIEW);
            post.setModerationNote("Bài viết đã được chỉnh sửa bởi tác giả, chờ kiểm duyệt lại");
            log.info("Bài viết id={} đã chuyển lại PENDING_REVIEW do tác giả chỉnh sửa nội dung", postId);
        }

        if (request.mediaUrls() != null) {
            post.getMediaList().clear();
            int order = 0;
            for (String url : request.mediaUrls()) {
                if (url != null && !url.isBlank()) {
                    post.addMedia(PostMedia.builder()
                            .mediaUrl(url.trim())
                            .mediaType(url.endsWith(".mp4") ? "VIDEO" : "IMAGE")
                            .orderIndex(order++)
                            .build());
                }
            }
        }

        CommunityPost updated = postRepository.save(post);
        return PostResponse.fromEntity(updated, null);
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getFeed(Pageable pageable, Long destinationId, Long tourId, Long currentUserId) {
        Page<CommunityPost> posts = postRepository.findFeedPosts(PostStatus.PUBLISHED, destinationId, tourId, pageable);
        return posts.map(p -> {
            ReactionType myReaction = findUserReaction(p.getId(), currentUserId);
            return PostResponse.fromEntity(p, myReaction);
        });
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getMyPosts(Long userId, Pageable pageable) {
        Page<CommunityPost> posts = postRepository.findByAuthorIdOrderByCreatedAtDesc(userId, pageable);
        return posts.map(p -> {
            ReactionType myReaction = findUserReaction(p.getId(), userId);
            return PostResponse.fromEntity(p, myReaction);
        });
    }

    @Transactional(readOnly = true)
    public PostResponse getPostDetail(Long postId, Long currentUserId) {
        CommunityPost post = postRepository.findByIdWithMedia(postId)
                .orElseThrow(() -> new ResourceNotFoundException("CommunityPost", postId));

        if (post.isHidden()) {
            throw new BusinessException("POST-HIDDEN", "Bài viết này đã bị ẩn do vi phạm tiêu chuẩn cộng đồng");
        }

        if (post.getStatus() != PostStatus.PUBLISHED && (currentUserId == null || !currentUserId.equals(post.getAuthorId()))) {
            throw new BusinessException("POST-NOT-PUBLISHED", "Bài viết này đang ở chế độ chờ duyệt hoặc nháp");
        }

        ReactionType myReaction = findUserReaction(postId, currentUserId);
        return PostResponse.fromEntity(post, myReaction);
    }

    // ── COMMENT & REACTION ──────────────────────────────────────────────────────

    @Transactional
    public CommentResponse addComment(Long postId, Long userId, PostCommentRequest request) {
        CommunityPost post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("CommunityPost", postId));

        if (post.getStatus() != PostStatus.PUBLISHED || post.isHidden()) {
            throw new BusinessException("COMMENT-NOT-ALLOWED", "Chỉ có thể bình luận trên bài viết đã được công khai");
        }

        User author = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        PostComment comment = PostComment.builder()
                .postId(postId)
                .authorId(userId)
                .authorName(author.getFullName())
                .authorAvatarUrl(author.getAvatarUrl())
                .content(request.content().trim())
                .hidden(false)
                .build();

        PostComment saved = commentRepository.save(comment);

        post.setCommentsCount(post.getCommentsCount() + 1);
        postRepository.save(post);

        log.info("User {} đã bình luận vào bài viết id={}", userId, postId);
        return CommentResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public Page<CommentResponse> getPostComments(Long postId, Pageable pageable) {
        return commentRepository.findByPostIdAndHiddenFalseOrderByCreatedAtAsc(postId, pageable)
                .map(CommentResponse::fromEntity);
    }

    @Transactional
    public int toggleReaction(Long postId, Long userId, ReactionType reactionType) {
        CommunityPost post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("CommunityPost", postId));

        if (post.getStatus() != PostStatus.PUBLISHED || post.isHidden()) {
            throw new BusinessException("REACTION-NOT-ALLOWED", "Chỉ có thể tương tác trên bài viết đã được công khai");
        }

        Optional<PostReaction> existing = reactionRepository.findByPostIdAndUserId(postId, userId);

        if (existing.isPresent()) {
            PostReaction r = existing.get();
            if (r.getReactionType() == reactionType) {
                // Hủy reaction nếu bấm trùng loại
                reactionRepository.delete(r);
                post.setLikesCount(Math.max(0, post.getLikesCount() - 1));
            } else {
                // Đổi loại reaction
                r.setReactionType(reactionType);
                reactionRepository.save(r);
            }
        } else {
            // Thêm reaction mới
            PostReaction newReaction = PostReaction.builder()
                    .postId(postId)
                    .userId(userId)
                    .reactionType(reactionType)
                    .build();
            reactionRepository.save(newReaction);
            post.setLikesCount(post.getLikesCount() + 1);
        }

        postRepository.save(post);
        return post.getLikesCount();
    }

    // ── REPORTING ───────────────────────────────────────────────────────────────

    @Transactional
    public ReportResponse reportPost(Long postId, Long userId, CreateReportRequest request) {
        if (!postRepository.existsById(postId)) {
            throw new ResourceNotFoundException("CommunityPost", postId);
        }

        if (reportRepository.existsByPostIdAndReporterId(postId, userId)) {
            throw new BusinessException("ALREADY-REPORTED", "Bạn đã gửi báo cáo vi phạm cho bài viết này rồi");
        }

        PostReport report = PostReport.builder()
                .postId(postId)
                .reporterId(userId)
                .reason(request.reason())
                .description(request.description() != null ? request.description().trim() : null)
                .status(ReportStatus.PENDING)
                .build();

        PostReport saved = reportRepository.save(report);
        log.info("User {} đã báo cáo bài viết id={} với lý do: {}", userId, postId, request.reason());
        return ReportResponse.fromEntity(saved);
    }

    // ── MODERATOR OPERATIONS ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<PostResponse> getPendingPosts(Pageable pageable) {
        return postRepository.findByStatusOrderByCreatedAtAsc(PostStatus.PENDING_REVIEW, pageable)
                .map(p -> PostResponse.fromEntity(p, null));
    }

    @Transactional
    public PostResponse moderatePost(Long postId, Long moderatorId, ModeratePostRequest request) {
        CommunityPost post = postRepository.findByIdWithMedia(postId)
                .orElseThrow(() -> new ResourceNotFoundException("CommunityPost", postId));

        PostStatus newStatus = switch (request.action().toUpperCase().trim()) {
            case "APPROVE", "APPROVED" -> PostStatus.PUBLISHED;
            case "REJECT", "REJECTED" -> PostStatus.REJECTED;
            case "REQUEST_REVISION", "REVISION" -> PostStatus.NEEDS_REVISION;
            default -> throw new BusinessException("INVALID-MODERATION-ACTION",
                    "Hành động kiểm duyệt không hợp lệ. Chỉ chấp nhận APPROVE, REJECT, REQUEST_REVISION");
        };

        post.setStatus(newStatus);
        post.setModeratedBy(moderatorId);
        post.setModeratedAt(Instant.now());
        post.setModerationNote(request.note() != null ? request.note().trim() : null);

        CommunityPost saved = postRepository.save(post);
        log.info("Moderator {} đã kiểm duyệt bài viết id={}, trạng thái mới: {}", moderatorId, postId, newStatus);
        return PostResponse.fromEntity(saved, null);
    }

    @Transactional(readOnly = true)
    public Page<ReportResponse> getReports(ReportStatus status, Pageable pageable) {
        ReportStatus filterStatus = status != null ? status : ReportStatus.PENDING;
        return reportRepository.findByStatusOrderByCreatedAtDesc(filterStatus, pageable)
                .map(ReportResponse::fromEntity);
    }

    @Transactional
    public ReportResponse resolveReport(Long reportId, Long moderatorId, boolean hidePost, String note) {
        PostReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("PostReport", reportId));

        report.setStatus(ReportStatus.RESOLVED);
        report.setResolvedBy(moderatorId);
        report.setResolvedAt(Instant.now());
        report.setResolutionNote(note);

        if (hidePost) {
            postRepository.findById(report.getPostId()).ifPresent(p -> {
                p.setHidden(true);
                postRepository.save(p);
                log.info("Moderator {} đã ẩn bài viết vi phạm id={}", moderatorId, p.getId());
            });
        }

        PostReport saved = reportRepository.save(report);
        return ReportResponse.fromEntity(saved);
    }

    private ReactionType findUserReaction(Long postId, Long userId) {
        if (userId == null) return null;
        return reactionRepository.findByPostIdAndUserId(postId, userId)
                .map(PostReaction::getReactionType)
                .orElse(null);
    }
}
