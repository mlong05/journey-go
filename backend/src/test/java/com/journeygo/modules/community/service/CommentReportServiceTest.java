package com.journeygo.modules.community.service;

import com.journeygo.modules.community.dto.CreateReportRequest;
import com.journeygo.modules.community.entity.CommentReport;
import com.journeygo.modules.community.entity.PostComment;
import com.journeygo.modules.community.entity.enums.ReportReason;
import com.journeygo.modules.community.entity.enums.ReportStatus;
import com.journeygo.modules.community.repository.CommentReportRepository;
import com.journeygo.modules.community.repository.CommunityPostRepository;
import com.journeygo.modules.community.repository.PostCommentRepository;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.notification.service.NotificationPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Báo cáo bình luận: hiện ngay khi đăng, cộng đồng báo cáo, kiểm duyệt viên ẩn hoặc bác bỏ. */
@ExtendWith(MockitoExtension.class)
class CommentReportServiceTest {

    @Mock private CommentReportRepository reportRepository;
    @Mock private PostCommentRepository commentRepository;
    @Mock private CommunityPostRepository postRepository;
    @Mock private CommunityService communityService;
    @Spy private NotificationPublisher notifications = new NotificationPublisher(mock(ApplicationEventPublisher.class));

    @InjectMocks private CommentReportService service;

    private PostComment comment;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "autoHideReportThreshold", 3);
        comment = PostComment.builder().id(7L).postId(100L).authorId(2L).content("Bình luận xấu").hidden(false).build();
    }

    private CommentReport saved(Long reporter) {
        return CommentReport.builder().id(1L).commentId(7L).reporterId(reporter)
                .reason(ReportReason.SPAM).status(ReportStatus.PENDING).build();
    }

    @Test
    void cannotReportOwnComment() {
        when(commentRepository.findById(7L)).thenReturn(Optional.of(comment));

        var ex = assertThrows(BusinessException.class,
                () -> service.reportComment(7L, 2L, new CreateReportRequest(ReportReason.SPAM, null)));
        assertEquals("CANNOT-REPORT-OWN-COMMENT", ex.getCode());
        verify(reportRepository, never()).save(any());
    }

    @Test
    void cannotReportTwice() {
        when(commentRepository.findById(7L)).thenReturn(Optional.of(comment));
        when(reportRepository.existsByCommentIdAndReporterId(7L, 1L)).thenReturn(true);

        var ex = assertThrows(BusinessException.class,
                () -> service.reportComment(7L, 1L, new CreateReportRequest(ReportReason.SPAM, null)));
        assertEquals("ALREADY-REPORTED", ex.getCode());
    }

    @Test
    void autoHidesWhenThresholdReached() {
        when(commentRepository.findById(7L)).thenReturn(Optional.of(comment));
        when(reportRepository.save(any())).thenReturn(saved(1L));
        when(reportRepository.countByCommentIdAndStatus(7L, ReportStatus.PENDING)).thenReturn(3L);

        service.reportComment(7L, 1L, new CreateReportRequest(ReportReason.HATE_SPEECH, "  "));

        verify(communityService).setCommentHidden(7L, null, true);
        verify(reportRepository).save(argThat(r -> r.getDescription() == null));
    }

    @Test
    void belowThresholdKeepsCommentVisible() {
        when(commentRepository.findById(7L)).thenReturn(Optional.of(comment));
        when(reportRepository.save(any())).thenReturn(saved(1L));
        when(reportRepository.countByCommentIdAndStatus(7L, ReportStatus.PENDING)).thenReturn(1L);

        service.reportComment(7L, 1L, new CreateReportRequest(ReportReason.SPAM, null));

        verify(communityService, never()).setCommentHidden(anyLong(), any(), anyBoolean());
    }

    @Test
    void resolveHidesCommentAndClosesSiblingReports() {
        CommentReport report = saved(1L);
        CommentReport sibling = CommentReport.builder().id(2L).commentId(7L).reporterId(3L)
                .reason(ReportReason.SPAM).status(ReportStatus.PENDING).build();
        when(reportRepository.findById(1L)).thenReturn(Optional.of(report));
        when(commentRepository.findById(7L)).thenReturn(Optional.of(comment));
        when(reportRepository.findByCommentIdAndStatus(7L, ReportStatus.PENDING)).thenReturn(List.of(sibling));

        service.resolve(1L, 9L, true, "Ngôn từ thô tục");

        verify(communityService).setCommentHidden(7L, 9L, true);
        assertEquals(ReportStatus.RESOLVED, report.getStatus());
        assertEquals(ReportStatus.RESOLVED, sibling.getStatus());
    }

    @Test
    void dismissRestoresAutoHiddenCommentWhenNoReportsLeft() {
        comment.setHidden(true);
        when(reportRepository.findById(1L)).thenReturn(Optional.of(saved(1L)));
        when(commentRepository.findById(7L)).thenReturn(Optional.of(comment));
        when(reportRepository.countByCommentIdAndStatus(7L, ReportStatus.PENDING)).thenReturn(0L);
        when(reportRepository.existsByCommentIdAndStatus(7L, ReportStatus.RESOLVED)).thenReturn(false);

        service.dismiss(1L, 9L, null);

        verify(communityService).setCommentHidden(7L, 9L, false);
    }

    @Test
    void listingDeletesReportsOfDeletedComments() {
        CommentReport orphan = CommentReport.builder().id(5L).commentId(404L).reporterId(1L)
                .reason(ReportReason.SPAM).status(ReportStatus.PENDING).build();
        CommentReport live = saved(1L);
        var pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        when(reportRepository.findByStatusOrderByCreatedAtDesc(ReportStatus.PENDING, pageable))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(orphan, live), pageable, 2))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(live), pageable, 1));
        when(commentRepository.findAllById(anyIterable())).thenReturn(List.of(comment));

        var page = service.getReports(ReportStatus.PENDING, pageable);

        verify(reportRepository).deleteAllInBatch(List.of(orphan));
        assertEquals(1, page.getTotalElements());
        assertEquals(7L, page.getContent().get(0).commentId());
    }

    @Test
    void cannotHandleReportTwice() {
        CommentReport done = saved(1L);
        done.setStatus(ReportStatus.DISMISSED);
        when(reportRepository.findById(1L)).thenReturn(Optional.of(done));

        assertThrows(BusinessException.class, () -> service.resolve(1L, 9L, true, null));
    }
}
