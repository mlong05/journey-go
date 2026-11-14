package com.journeygo.modules.community.service;

import com.journeygo.modules.community.dto.CommentReportResponse;
import com.journeygo.modules.community.dto.CreateReportRequest;
import com.journeygo.modules.community.entity.CommentReport;
import com.journeygo.modules.community.entity.CommunityPost;
import com.journeygo.modules.community.entity.PostComment;
import com.journeygo.modules.community.entity.enums.ReportStatus;
import com.journeygo.modules.community.repository.CommentReportRepository;
import com.journeygo.modules.community.repository.CommunityPostRepository;
import com.journeygo.modules.community.repository.PostCommentRepository;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.service.NotificationPublisher;
import com.journeygo.modules.user.entity.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Báo cáo bình luận: bình luận hiện ngay khi đăng, cộng đồng báo cáo vi phạm, kiểm duyệt viên ẩn hoặc bỏ qua.
 * Bình luận có từ {@code app.community.auto-hide-report-threshold} báo cáo chờ trở lên thì tự ẩn để chờ xem xét.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CommentReportService {

    private final CommentReportRepository reportRepository;
    private final PostCommentRepository commentRepository;
    private final CommunityPostRepository postRepository;
    private final CommunityService communityService;
    private final NotificationPublisher notifications;

    @Value("${app.community.auto-hide-report-threshold:5}")
    private int autoHideReportThreshold = 5;

    @Transactional
    public CommentReportResponse reportComment(Long commentId, Long userId, CreateReportRequest request) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("PostComment", commentId));
        if (comment.getAuthorId().equals(userId)) {
            throw new BusinessException("CANNOT-REPORT-OWN-COMMENT", "Bạn không thể báo cáo bình luận của chính mình");
        }
        if (comment.isHidden()) {
            throw new BusinessException("COMMENT-ALREADY-HIDDEN", "Bình luận này đã bị ẩn");
        }
        if (reportRepository.existsByCommentIdAndReporterId(commentId, userId)) {
            throw new BusinessException("ALREADY-REPORTED", "Bạn đã báo cáo bình luận này rồi");
        }

        CommentReport saved = reportRepository.save(CommentReport.builder()
                .commentId(commentId)
                .reporterId(userId)
                .reason(request.reason())
                .description(request.description() != null && !request.description().isBlank()
                        ? request.description().trim() : null)
                .status(ReportStatus.PENDING)
                .build());
        log.info("User {} báo cáo bình luận id={} ({})", userId, commentId, request.reason());

        long pending = reportRepository.countByCommentIdAndStatus(commentId, ReportStatus.PENDING);
        boolean autoHidden = pending >= autoHideReportThreshold;
        if (autoHidden) {
            communityService.setCommentHidden(commentId, null, true);
            log.warn("Bình luận id={} tự động bị ẩn vì có {} báo cáo chờ xử lý", commentId, pending);
        }

        CommunityPost post = postRepository.findById(comment.getPostId()).orElse(null);
        notifications.send(NotificationType.POST_REPORTED)
                .toRole(Role.CONTENT_MODERATOR)
                .title(autoHidden ? "Bình luận bị tạm ẩn do nhiều báo cáo" : "Có báo cáo bình luận mới")
                .body("“" + excerpt(comment.getContent()) + "”"
                        + (post == null ? "" : " — trong bài " + NotificationPublisher.quote(post.getTitle()))
                        + " (" + pending + " báo cáo chờ xử lý).")
                .link("/moderator/community")
                .ref("COMMENT", commentId)
                .queue(NotificationPublisher.Queue.POST_REPORT)
                .publish();
        return toResponse(saved);
    }

    @Transactional
    public Page<CommentReportResponse> getReports(ReportStatus status, Pageable pageable) {
        ReportStatus filter = status != null ? status : ReportStatus.PENDING;
        Page<CommentReport> page = reportRepository.findByStatusOrderByCreatedAtDesc(filter, pageable);

        List<Long> commentIds = page.getContent().stream().map(CommentReport::getCommentId).distinct().toList();
        Map<Long, PostComment> found = commentRepository.findAllById(commentIds).stream()
                .collect(Collectors.toMap(PostComment::getId, Function.identity()));
        Map<Long, PostComment> comments = found;

        // Bình luận không còn (đã bị xoá) thì báo cáo của nó không còn gì để xử lý: xoá luôn rồi tải lại trang,
        // để hàng chờ của kiểm duyệt viên không có mục "mồ côi".
        List<CommentReport> orphans = page.getContent().stream()
                .filter(r -> !found.containsKey(r.getCommentId())).toList();
        if (!orphans.isEmpty()) {
            reportRepository.deleteAllInBatch(orphans);
            log.info("Đã xoá {} báo cáo của bình luận không còn tồn tại", orphans.size());
            page = reportRepository.findByStatusOrderByCreatedAtDesc(filter, pageable);
            commentIds = page.getContent().stream().map(CommentReport::getCommentId).distinct().toList();
            comments = commentRepository.findAllById(commentIds).stream()
                    .collect(Collectors.toMap(PostComment::getId, Function.identity()));
        }
        final Map<Long, PostComment> commentById = comments;
        List<Long> postIds = commentById.values().stream().map(PostComment::getPostId).distinct().toList();
        Map<Long, CommunityPost> posts = postRepository.findAllById(postIds).stream()
                .collect(Collectors.toMap(CommunityPost::getId, Function.identity()));
        Map<Long, Integer> counts = commentIds.isEmpty() ? Map.of()
                : reportRepository.countByCommentIdsAndStatus(commentIds, ReportStatus.PENDING).stream()
                        .collect(Collectors.toMap(row -> (Long) row[0], row -> ((Number) row[1]).intValue()));

        return page.map(r -> {
            PostComment c = commentById.get(r.getCommentId());
            return CommentReportResponse.of(r, c, c == null ? null : posts.get(c.getPostId()),
                    counts.getOrDefault(r.getCommentId(), 0));
        });
    }

    /** Xác nhận vi phạm: (tuỳ chọn) ẩn bình luận và xử lý luôn mọi báo cáo chờ của bình luận đó. */
    @Transactional
    public CommentReportResponse resolve(Long reportId, Long moderatorId, boolean hideComment, String note) {
        CommentReport report = requirePending(reportId);
        markHandled(report, ReportStatus.RESOLVED, moderatorId, note);

        List<Long> reporters = new ArrayList<>(List.of(report.getReporterId()));
        if (hideComment) {
            commentRepository.findById(report.getCommentId())
                    .ifPresent(c -> communityService.setCommentHidden(c.getId(), moderatorId, true));
            for (CommentReport sibling : reportRepository.findByCommentIdAndStatus(report.getCommentId(), ReportStatus.PENDING)) {
                markHandled(sibling, ReportStatus.RESOLVED, moderatorId, note);
                reporters.add(sibling.getReporterId());
            }
        }

        var thanks = notifications.send(NotificationType.REPORT_RESOLVED)
                .title("Báo cáo của bạn đã được xử lý")
                .body(hideComment
                        ? "Cảm ơn bạn! Bình luận bạn báo cáo đã được gỡ khỏi cộng đồng vì vi phạm quy định."
                        : "Cảm ơn bạn! Kiểm duyệt viên đã ghi nhận vi phạm ở bình luận bạn báo cáo.")
                .ref("COMMENT", report.getCommentId());
        reporters.forEach(thanks::to);
        thanks.publish();

        notifications.queueChanged(Role.CONTENT_MODERATOR, NotificationPublisher.Queue.POST_REPORT);
        return toResponse(report);
    }

    /** Bác bỏ báo cáo; nếu bình luận đang bị tự ẩn và không còn báo cáo chờ nào thì hiện lại. */
    @Transactional
    public CommentReportResponse dismiss(Long reportId, Long moderatorId, String note) {
        CommentReport report = requirePending(reportId);
        markHandled(report, ReportStatus.DISMISSED, moderatorId, note);

        // Bình luận bị tự ẩn (chưa từng bị xác nhận vi phạm) mà hết báo cáo chờ thì hiện lại
        Long commentId = report.getCommentId();
        commentRepository.findById(commentId).ifPresent(c -> {
            if (c.isHidden()
                    && reportRepository.countByCommentIdAndStatus(commentId, ReportStatus.PENDING) == 0
                    && !reportRepository.existsByCommentIdAndStatus(commentId, ReportStatus.RESOLVED)) {
                communityService.setCommentHidden(commentId, moderatorId, false);
            }
        });

        notifications.send(NotificationType.REPORT_DISMISSED)
                .to(report.getReporterId())
                .title("Kết quả xem xét báo cáo")
                .body(NotificationPublisher.withNote("Sau khi xem xét, bình luận bạn báo cáo chưa vi phạm quy định "
                        + "cộng đồng. Cảm ơn bạn đã góp phần giữ cộng đồng lành mạnh.", note))
                .ref("COMMENT", report.getCommentId())
                .publish();

        notifications.queueChanged(Role.CONTENT_MODERATOR, NotificationPublisher.Queue.POST_REPORT);
        return toResponse(report);
    }

    private CommentReport requirePending(Long reportId) {
        CommentReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("CommentReport", reportId));
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new BusinessException("REPORT-ALREADY-HANDLED", "Báo cáo này đã được xử lý");
        }
        return report;
    }

    private void markHandled(CommentReport report, ReportStatus status, Long moderatorId, String note) {
        report.setStatus(status);
        report.setResolvedBy(moderatorId);
        report.setResolvedAt(Instant.now());
        report.setResolutionNote(note != null && !note.isBlank() ? note.trim() : null);
        reportRepository.save(report);
    }

    private CommentReportResponse toResponse(CommentReport r) {
        PostComment c = commentRepository.findById(r.getCommentId()).orElse(null);
        CommunityPost p = c == null ? null : postRepository.findById(c.getPostId()).orElse(null);
        return CommentReportResponse.of(r, c, p,
                (int) reportRepository.countByCommentIdAndStatus(r.getCommentId(), ReportStatus.PENDING));
    }

    private static String excerpt(String text) {
        if (text == null) return "";
        String oneLine = text.replaceAll("\\s+", " ").trim();
        return oneLine.length() <= 100 ? oneLine : oneLine.substring(0, 99) + "…";
    }
}
