package com.journeygo.modules.community.service;

import com.journeygo.modules.community.dto.*;
import com.journeygo.modules.community.entity.*;
import com.journeygo.modules.community.entity.enums.*;
import com.journeygo.modules.community.repository.*;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.service.NotificationPublisher;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

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
    private final DestinationRepository destinationRepository;
    private final TourRepository tourRepository;
    private final NotificationPublisher notifications;

    private static final int MAX_MEDIA_PER_POST = 10;
    private static final int MAX_MEDIA_URL_LENGTH = 1000;

    /** Số báo cáo chờ xử lý khiến bài tự động bị ẩn để moderator xem xét. */
    @Value("${app.community.auto-hide-report-threshold:5}")
    private int autoHideReportThreshold = 5;

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

        int createOrder = 0;
        for (String url : normalizeMediaUrls(request.mediaUrls())) {
            post.addMedia(PostMedia.builder()
                    .mediaUrl(url)
                    .mediaType(mediaTypeOf(url))
                    .orderIndex(createOrder++)
                    .build());
        }

        CommunityPost saved = postRepository.save(post);
        log.info("Du khách {} tạo bài viết mới id={}, status={}", userId, saved.getId(), initialStatus);
        if (initialStatus == PostStatus.PENDING_REVIEW) notifyPostPending(saved, false);
        return withNames(PostResponse.fromEntity(saved, null));
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
        boolean backToReview = post.getStatus() == PostStatus.PUBLISHED;
        if (backToReview) {
            post.setStatus(PostStatus.PENDING_REVIEW);
            post.setModerationNote("Bài viết đã được chỉnh sửa bởi tác giả, chờ kiểm duyệt lại");
            log.info("Bài viết id={} đã chuyển lại PENDING_REVIEW do tác giả chỉnh sửa nội dung", postId);
            notifyPostPending(post, true);
        }

        if (request.mediaUrls() != null) {
            List<String> urls = normalizeMediaUrls(request.mediaUrls());
            post.getMediaList().clear();
            int order = 0;
            for (String url : urls) {
                post.addMedia(PostMedia.builder()
                        .mediaUrl(url)
                        .mediaType(mediaTypeOf(url))
                        .orderIndex(order++)
                        .build());
            }
        }

        CommunityPost updated = postRepository.save(post);
        return PostResponse.fromEntity(updated, null);
    }

    /** Tác giả gửi duyệt bài nháp, bài bị từ chối hoặc bài được yêu cầu chỉnh sửa. */
    @Transactional
    public PostResponse submitPost(Long postId, Long userId) {
        CommunityPost post = postRepository.findByIdWithMedia(postId)
                .orElseThrow(() -> new ResourceNotFoundException("CommunityPost", postId));

        if (!post.getAuthorId().equals(userId)) {
            throw new BusinessException("FORBIDDEN-POST", "Bạn không có quyền gửi duyệt bài viết của người khác");
        }
        PostStatus status = post.getStatus();
        if (status != PostStatus.DRAFT && status != PostStatus.REJECTED && status != PostStatus.NEEDS_REVISION) {
            throw new BusinessException("POST-INVALID-STATUS",
                    "Chỉ có thể gửi duyệt bài nháp, bài bị từ chối hoặc bài cần chỉnh sửa");
        }

        post.setStatus(PostStatus.PENDING_REVIEW);
        post.setModerationNote(null);
        post.setModeratedBy(null);
        post.setModeratedAt(null);
        CommunityPost saved = postRepository.save(post);
        log.info("Tác giả {} gửi duyệt bài viết id={}", userId, postId);
        notifyPostPending(saved, status != PostStatus.DRAFT);
        return withNames(PostResponse.fromEntity(saved, null));
    }

    private void notifyPostPending(CommunityPost post, boolean resubmitted) {
        String author = post.getAuthorName() != null && !post.getAuthorName().isBlank() ? post.getAuthorName() : "du khách";
        notifications.send(NotificationType.POST_PENDING)
                .toRole(Role.CONTENT_MODERATOR)
                .title(resubmitted ? "Bài viết được gửi lại chờ duyệt" : "Bài viết cộng đồng mới chờ duyệt")
                .body(NotificationPublisher.quote(post.getTitle()) + " của " + author + " đang chờ bạn kiểm duyệt.")
                .link("/moderator/community")
                .ref("POST", post.getId())
                .queue(NotificationPublisher.Queue.POST_REVIEW)
                .publish();
    }

    private static String reportReasonLabel(ReportReason reason) {
        if (reason == null) return "khác";
        return switch (reason) {
            case SPAM -> "spam, quảng cáo";
            case INAPPROPRIATE_CONTENT -> "nội dung không phù hợp";
            case HATE_SPEECH -> "ngôn từ thù ghét";
            case FALSE_INFORMATION -> "thông tin sai lệch";
            case COPYRIGHT_VIOLATION -> "vi phạm bản quyền";
            case OTHER -> "khác";
        };
    }

    /** Tác giả xóa bài của mình; không cho xóa khi còn báo cáo chờ xử lý để tránh né kiểm duyệt. */
    @Transactional
    public void deletePost(Long postId, Long userId) {
        CommunityPost post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("CommunityPost", postId));

        if (!post.getAuthorId().equals(userId)) {
            throw new BusinessException("FORBIDDEN-POST", "Bạn không có quyền xóa bài viết của người khác");
        }
        if (reportRepository.countByPostIdAndStatus(postId, ReportStatus.PENDING) > 0) {
            throw new BusinessException("POST-HAS-PENDING-REPORTS",
                    "Bài viết đang có báo cáo chờ xử lý nên chưa thể xóa");
        }

        reactionRepository.deleteByPostId(postId);
        commentRepository.deleteByPostId(postId);
        reportRepository.deleteByPostId(postId);
        postRepository.delete(post);
        log.info("Tác giả {} đã xóa bài viết id={}", userId, postId);
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getFeed(Pageable pageable, Long destinationId, Long tourId, Long currentUserId) {
        Page<CommunityPost> posts = postRepository.findFeedPosts(PostStatus.PUBLISHED, destinationId, tourId, pageable);
        return withNames(posts.map(p -> {
            ReactionType myReaction = findUserReaction(p.getId(), currentUserId);
            return PostResponse.fromEntity(p, myReaction);
        }));
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getMyPosts(Long userId, Pageable pageable) {
        Page<CommunityPost> posts = postRepository.findByAuthorIdOrderByCreatedAtDesc(userId, pageable);
        return withNames(posts.map(p -> {
            ReactionType myReaction = findUserReaction(p.getId(), userId);
            return PostResponse.fromEntity(p, myReaction);
        }));
    }

    @Transactional(readOnly = true)
    public PostResponse getPostDetail(Long postId, Long currentUserId, boolean canModerate) {
        CommunityPost post = postRepository.findByIdWithMedia(postId)
                .orElseThrow(() -> new ResourceNotFoundException("CommunityPost", postId));

        if (canModerate) {
            // Kiểm duyệt viên xem được mọi bài, kể cả bài đã ẩn hoặc chưa duyệt.
            return withNames(PostResponse.fromEntity(post, findUserReaction(postId, currentUserId)).toBuilder()
                    .reportCount((int) reportRepository.countByPostIdAndStatus(postId, ReportStatus.PENDING))
                    .build());
        }

        if (post.isHidden()) {
            throw new BusinessException("POST-HIDDEN", "Bài viết này đã bị ẩn do vi phạm tiêu chuẩn cộng đồng");
        }

        if (post.getStatus() != PostStatus.PUBLISHED && (currentUserId == null || !currentUserId.equals(post.getAuthorId()))) {
            throw new BusinessException("POST-NOT-PUBLISHED", "Bài viết này đang ở chế độ chờ duyệt hoặc nháp");
        }

        ReactionType myReaction = findUserReaction(postId, currentUserId);
        return withNames(PostResponse.fromEntity(post, myReaction));
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

        // Báo tác giả có bình luận mới (tự bình luận bài mình thì không báo)
        notifications.send(NotificationType.POST_COMMENTED)
                .to(post.getAuthorId())
                .except(userId)
                .title(author.getFullName() + " đã bình luận về bài viết của bạn")
                .body("“" + excerpt(saved.getContent(), 120) + "” — trong bài " + NotificationPublisher.quote(post.getTitle()))
                .ref("POST", postId)
                .publish();
        return CommentResponse.fromEntity(saved);
    }

    @Transactional
    public void deleteComment(Long commentId, Long userId) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("PostComment", commentId));
        if (!comment.getAuthorId().equals(userId)) {
            throw new BusinessException("FORBIDDEN-COMMENT", "Bạn không có quyền xóa bình luận của người khác");
        }
        if (!comment.isHidden()) {
            adjustCommentsCount(comment.getPostId(), -1);
        }
        commentRepository.delete(comment);
    }

    /** Moderator ẩn hoặc hiện lại một bình luận; số bình luận của bài được cập nhật theo. */
    @Transactional
    public CommentResponse setCommentHidden(Long commentId, Long moderatorId, boolean hidden) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("PostComment", commentId));
        if (comment.isHidden() != hidden) {
            comment.setHidden(hidden);
            adjustCommentsCount(comment.getPostId(), hidden ? -1 : 1);
            log.info("Moderator {} {} bình luận id={}", moderatorId, hidden ? "đã ẩn" : "đã hiện lại", commentId);
        }
        return CommentResponse.fromEntity(commentRepository.save(comment));
    }

    private void adjustCommentsCount(Long postId, int delta) {
        postRepository.findById(postId).ifPresent(p -> {
            p.setCommentsCount(Math.max(0, p.getCommentsCount() + delta));
            postRepository.save(p);
        });
    }

    @Transactional(readOnly = true)
    public Page<CommentResponse> getPostComments(Long postId, Pageable pageable) {
        return commentRepository.findByPostIdAndHiddenFalseOrderByCreatedAtAsc(postId, pageable)
                .map(CommentResponse::fromEntity);
    }

    @Transactional
    public int toggleReaction(Long postId, Long userId, ReactionType requestedType) {
        ReactionType reactionType = requestedType != null ? requestedType : ReactionType.LOVE;
        if (reactionType != ReactionType.LOVE) {
            throw new BusinessException("INVALID-REACTION", "Hiện chỉ hỗ trợ thả tim cho bài viết");
        }
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
        CommunityPost reported = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("CommunityPost", postId));

        if (reported.getAuthorId().equals(userId)) {
            throw new BusinessException("CANNOT-REPORT-OWN-POST", "Bạn không thể báo cáo bài viết của chính mình");
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

        long pending = reportRepository.countByPostIdAndStatus(postId, ReportStatus.PENDING);
        if (pending >= autoHideReportThreshold && !reported.isHidden()) {
            reported.setHidden(true);
            postRepository.save(reported);
            log.warn("Bài viết id={} tự động bị ẩn vì có {} báo cáo chờ xử lý", postId, pending);
        }

        notifications.send(NotificationType.POST_REPORTED)
                .toRole(Role.CONTENT_MODERATOR)
                .title(reported.isHidden() && pending >= autoHideReportThreshold
                        ? "Bài viết bị tạm ẩn do nhiều báo cáo"
                        : "Có báo cáo vi phạm mới")
                .body(NotificationPublisher.quote(reported.getTitle()) + " — lý do: " + reportReasonLabel(request.reason())
                        + " (" + pending + " báo cáo chờ xử lý).")
                .link("/moderator/community")
                .ref("POST", postId)
                .queue(NotificationPublisher.Queue.POST_REPORT)
                .publish();
        return ReportResponse.fromEntity(saved);
    }

    // ── MODERATOR OPERATIONS ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<PostResponse> getPendingPosts(Pageable pageable) {
        Page<CommunityPost> page = postRepository.findByStatusOrderByCreatedAtAsc(PostStatus.PENDING_REVIEW, pageable);
        Map<Long, Integer> counts = pendingReportCounts(page.getContent().stream().map(CommunityPost::getId).toList());
        return withNames(page.map(p -> PostResponse.fromEntity(p, null).toBuilder()
                .reportCount(counts.getOrDefault(p.getId(), 0))
                .build()));
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

        NotificationType type = switch (newStatus) {
            case PUBLISHED -> NotificationType.POST_APPROVED;
            case REJECTED -> NotificationType.POST_REJECTED;
            default -> NotificationType.POST_NEEDS_REVISION;
        };
        String sentence = switch (newStatus) {
            case PUBLISHED -> " đã được đăng lên cộng đồng JourneyGo. Cảm ơn bạn đã chia sẻ hành trình!";
            case REJECTED -> " chưa phù hợp để đăng lên cộng đồng.";
            default -> " cần chỉnh sửa thêm trước khi đăng. Bạn sửa rồi gửi lại nhé.";
        };
        notifications.send(type)
                .to(post.getAuthorId())
                .except(moderatorId)
                .title(switch (newStatus) {
                    case PUBLISHED -> "Bài viết của bạn đã được đăng";
                    case REJECTED -> "Bài viết chưa được duyệt";
                    default -> "Bài viết cần chỉnh sửa";
                })
                .body(NotificationPublisher.withNote(NotificationPublisher.quote(post.getTitle()) + sentence,
                        post.getModerationNote()))
                .ref("POST", postId)
                .publish();
        notifications.queueChanged(Role.CONTENT_MODERATOR, NotificationPublisher.Queue.POST_REVIEW);
        return withNames(PostResponse.fromEntity(saved, null).toBuilder()
                .reportCount((int) reportRepository.countByPostIdAndStatus(postId, ReportStatus.PENDING))
                .build());
    }

    /** Moderator ẩn hoặc hiện lại bài viết (gỡ bài tạm thời mà không xóa dữ liệu). */
    @Transactional
    public PostResponse setPostHidden(Long postId, Long moderatorId, boolean hidden) {
        CommunityPost post = postRepository.findByIdWithMedia(postId)
                .orElseThrow(() -> new ResourceNotFoundException("CommunityPost", postId));
        if (post.isHidden() != hidden) {
            post.setHidden(hidden);
            postRepository.save(post);
            log.info("Moderator {} {} bài viết id={}", moderatorId, hidden ? "đã ẩn" : "đã hiện lại", postId);
            notifyAuthorVisibility(post, hidden, moderatorId, null);
        }
        return withNames(PostResponse.fromEntity(post, null).toBuilder()
                .reportCount((int) reportRepository.countByPostIdAndStatus(postId, ReportStatus.PENDING))
                .build());
    }

    @Transactional(readOnly = true)
    public Page<ReportResponse> getReports(ReportStatus status, Pageable pageable) {
        ReportStatus filterStatus = status != null ? status : ReportStatus.PENDING;
        Page<PostReport> page = reportRepository.findByStatusOrderByCreatedAtDesc(filterStatus, pageable);

        List<Long> postIds = page.getContent().stream().map(PostReport::getPostId).distinct().toList();
        Map<Long, CommunityPost> posts = postRepository.findAllById(postIds).stream()
                .collect(Collectors.toMap(CommunityPost::getId, p -> p));
        Map<Long, Integer> counts = pendingReportCounts(postIds);

        return page.map(r -> ReportResponse.fromEntity(r, posts.get(r.getPostId()), counts.getOrDefault(r.getPostId(), 0)));
    }

    /** Xác nhận báo cáo đúng; có thể ẩn bài và xử lý luôn các báo cáo chờ khác của cùng bài. */
    @Transactional
    public ReportResponse resolveReport(Long reportId, Long moderatorId, boolean hidePost, String note) {
        PostReport report = requirePendingReport(reportId);
        markHandled(report, ReportStatus.RESOLVED, moderatorId, note);
        CommunityPost post = postRepository.findById(report.getPostId()).orElse(null);

        List<Long> reporters = new java.util.ArrayList<>(List.of(report.getReporterId()));
        if (hidePost) {
            if (post != null) {
                post.setHidden(true);
                postRepository.save(post);
                log.info("Moderator {} đã ẩn bài viết vi phạm id={}", moderatorId, post.getId());
                // Kể cả bài đã bị tự ẩn trước đó: lúc này mới là kết luận chính thức gửi tác giả
                notifyAuthorVisibility(post, true, moderatorId, note);
            }
            for (PostReport sibling : reportRepository.findByPostIdAndStatus(report.getPostId(), ReportStatus.PENDING)) {
                markHandled(sibling, ReportStatus.RESOLVED, moderatorId, note);
                reporters.add(sibling.getReporterId());
            }
        }

        // Cảm ơn những người đã báo cáo (khi ẩn bài thì mọi báo cáo chờ của bài đều được xử lý cùng lúc)
        String title = post == null ? "" : " " + NotificationPublisher.quote(post.getTitle());
        var thanks = notifications.send(NotificationType.REPORT_RESOLVED)
                .title("Báo cáo của bạn đã được xử lý")
                .body(hidePost
                        ? "Cảm ơn bạn! Bài viết" + title + " đã được gỡ khỏi cộng đồng vì vi phạm quy định."
                        : "Cảm ơn bạn! Kiểm duyệt viên đã ghi nhận vi phạm ở bài viết" + title + ".")
                .ref("REPORT", report.getPostId());
        reporters.forEach(thanks::to);
        thanks.publish();

        notifications.queueChanged(Role.CONTENT_MODERATOR, NotificationPublisher.Queue.POST_REPORT);
        return toReportResponse(report);
    }

    /** Bác bỏ báo cáo (báo cáo sai hoặc không vi phạm); bài viết giữ nguyên. */
    @Transactional
    public ReportResponse dismissReport(Long reportId, Long moderatorId, String note) {
        PostReport report = requirePendingReport(reportId);
        markHandled(report, ReportStatus.DISMISSED, moderatorId, note);

        String title = postRepository.findById(report.getPostId())
                .map(p -> NotificationPublisher.quote(p.getTitle())).orElse("bạn báo cáo");
        notifications.send(NotificationType.REPORT_DISMISSED)
                .to(report.getReporterId())
                .title("Kết quả xem xét báo cáo")
                .body(NotificationPublisher.withNote("Sau khi xem xét, bài viết " + title
                        + " chưa vi phạm quy định cộng đồng. Cảm ơn bạn đã góp phần giữ cộng đồng lành mạnh.", note))
                .ref("REPORT", report.getPostId())
                .publish();

        notifications.queueChanged(Role.CONTENT_MODERATOR, NotificationPublisher.Queue.POST_REPORT);
        return toReportResponse(report);
    }

    /** Báo tác giả khi bài bị ẩn khỏi cộng đồng hoặc được hiện lại. */
    private void notifyAuthorVisibility(CommunityPost post, boolean hidden, Long moderatorId, String note) {
        notifications.send(hidden ? NotificationType.POST_HIDDEN : NotificationType.POST_RESTORED)
                .to(post.getAuthorId())
                .except(moderatorId)
                .title(hidden ? "Bài viết của bạn đã bị ẩn" : "Bài viết của bạn đã hiển thị lại")
                .body(NotificationPublisher.withNote(NotificationPublisher.quote(post.getTitle()) + (hidden
                        ? " tạm thời không hiển thị trên cộng đồng do vi phạm quy định. Bạn có thể chỉnh sửa và gửi duyệt lại."
                        : " đã được hiển thị lại trên cộng đồng JourneyGo."), note))
                .ref("POST", post.getId())
                .publish();
    }

    private static String excerpt(String text, int max) {
        if (text == null) return "";
        String oneLine = text.replaceAll("\\s+", " ").trim();
        return oneLine.length() <= max ? oneLine : oneLine.substring(0, max - 1) + "…";
    }

    /** Bổ sung tên điểm đến và tên tour (bài viết chỉ lưu id) bằng hai truy vấn cho cả danh sách. */
    private List<PostResponse> withNames(List<PostResponse> posts) {
        Set<Long> destinationIds = posts.stream().map(PostResponse::destinationId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> tourIds = posts.stream().map(PostResponse::tourId)
                .filter(Objects::nonNull).collect(Collectors.toSet());

        Map<Long, String> destinationNames = destinationIds.isEmpty() ? Map.of()
                : destinationRepository.findAllById(destinationIds).stream()
                        .filter(d -> d.getName() != null)
                        .collect(Collectors.toMap(Destination::getId, Destination::getName));
        Map<Long, String> tourTitles = tourIds.isEmpty() ? Map.of()
                : tourRepository.findAllById(tourIds).stream()
                        .filter(t -> t.getTitle() != null)
                        .collect(Collectors.toMap(Tour::getTourId, Tour::getTitle));

        return posts.stream()
                .map(p -> p.toBuilder()
                        .destinationName(p.destinationId() == null ? null : destinationNames.get(p.destinationId()))
                        .tourTitle(p.tourId() == null ? null : tourTitles.get(p.tourId()))
                        .build())
                .toList();
    }

    private PostResponse withNames(PostResponse post) {
        return withNames(List.of(post)).get(0);
    }

    private Page<PostResponse> withNames(Page<PostResponse> page) {
        return new PageImpl<>(withNames(page.getContent()), page.getPageable(), page.getTotalElements());
    }

    private PostReport requirePendingReport(Long reportId) {
        PostReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("PostReport", reportId));
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new BusinessException("REPORT-ALREADY-HANDLED", "Báo cáo này đã được xử lý");
        }
        return report;
    }

    private void markHandled(PostReport report, ReportStatus status, Long moderatorId, String note) {
        report.setStatus(status);
        report.setResolvedBy(moderatorId);
        report.setResolvedAt(Instant.now());
        report.setResolutionNote(note != null && !note.isBlank() ? note.trim() : null);
        reportRepository.save(report);
    }

    private ReportResponse toReportResponse(PostReport report) {
        CommunityPost post = postRepository.findById(report.getPostId()).orElse(null);
        int pending = (int) reportRepository.countByPostIdAndStatus(report.getPostId(), ReportStatus.PENDING);
        return ReportResponse.fromEntity(report, post, pending);
    }

    private Map<Long, Integer> pendingReportCounts(Collection<Long> postIds) {
        if (postIds.isEmpty()) return Map.of();
        return reportRepository.countByPostIdsAndStatus(postIds, ReportStatus.PENDING).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> ((Long) row[1]).intValue()));
    }

    /** Chuẩn hóa danh sách đường dẫn media: bỏ dòng trống, chỉ nhận http(s), giới hạn số lượng và độ dài. */
    private List<String> normalizeMediaUrls(List<String> urls) {
        List<String> result = new ArrayList<>();
        if (urls == null) return result;
        for (String raw : urls) {
            if (raw == null || raw.isBlank()) continue;
            String url = raw.trim();
            String lower = url.toLowerCase();
            if (url.length() > MAX_MEDIA_URL_LENGTH || !(lower.startsWith("https://") || lower.startsWith("http://"))) {
                throw new BusinessException("INVALID-MEDIA-URL",
                        "Đường dẫn ảnh hoặc video không hợp lệ: chỉ chấp nhận http(s), tối đa " + MAX_MEDIA_URL_LENGTH + " ký tự");
            }
            result.add(url);
        }
        if (result.size() > MAX_MEDIA_PER_POST) {
            throw new BusinessException("TOO-MANY-MEDIA",
                    "Mỗi bài viết chỉ đính kèm tối đa " + MAX_MEDIA_PER_POST + " ảnh hoặc video");
        }
        return result;
    }

    private String mediaTypeOf(String url) {
        String path = url.toLowerCase().split("[?#]")[0];
        return (path.endsWith(".mp4") || path.endsWith(".mov") || path.endsWith(".webm")) ? "VIDEO" : "IMAGE";
    }

    private ReactionType findUserReaction(Long postId, Long userId) {
        if (userId == null) return null;
        return reactionRepository.findByPostIdAndUserId(postId, userId)
                .map(PostReaction::getReactionType)
                .orElse(null);
    }
}
