package com.journeygo.modules.community.service;

import com.journeygo.modules.community.dto.*;
import com.journeygo.modules.community.entity.*;
import com.journeygo.modules.community.entity.enums.*;
import com.journeygo.modules.community.repository.*;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.journey.entity.Journey;
import com.journeygo.modules.journey.repository.JourneyRepository;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import com.journeygo.modules.notification.event.NotificationEvent;
import com.journeygo.modules.notification.service.NotificationPublisher;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.springframework.context.ApplicationEventPublisher;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommunityServiceTest {

    @Mock
    private CommunityPostRepository postRepository;

    @Mock
    private PostMediaRepository mediaRepository;

    @Mock
    private PostCommentRepository commentRepository;

    @Mock
    private PostReactionRepository reactionRepository;

    @Mock
    private PostReportRepository reportRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private DestinationRepository destinationRepository;

    @Mock
    private TourRepository tourRepository;
    @Mock
    private JourneyRepository journeyRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private CommentReportRepository commentReportRepository;

    /** Publisher thật với ApplicationEventPublisher giả: thông báo được tạo nhưng không gửi đi đâu. */
    private final ApplicationEventPublisher eventPublisher = org.mockito.Mockito.mock(ApplicationEventPublisher.class);

    @Spy
    private NotificationPublisher notifications = new NotificationPublisher(eventPublisher);

    @InjectMocks
    private CommunityService communityService;

    private User sampleUser;
    private CommunityPost samplePublishedPost;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id(1L)
                .fullName("Nguyen Van A")
                .avatarUrl("https://example.com/avatar.jpg")
                .email("user1@example.com")
                .build();

        samplePublishedPost = CommunityPost.builder()
                .id(100L)
                .authorId(1L)
                .authorName("Nguyen Van A")
                .authorAvatarUrl("https://example.com/avatar.jpg")
                .title("Trải nghiệm tuyệt vời tại Huế")
                .content("Chùa Thiên Mụ thật cổ kính và bình yên...")
                .status(PostStatus.PUBLISHED)
                .likesCount(5)
                .commentsCount(2)
                .hidden(false)
                .mediaList(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("Tạo bài viết mới ở chế độ Nháp (DRAFT)")
    void testCreatePost_Draft() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(tourRepository.findById(10L)).thenReturn(Optional.of(Tour.builder().tourId(10L).approved(true).build()));
        when(postRepository.save(any(CommunityPost.class))).thenAnswer(invocation -> {
            CommunityPost p = invocation.getArgument(0);
            p.setId(201L);
            return p;
        });

        CreatePostRequest req = new CreatePostRequest(
                "Tiêu đề nháp",
                "Nội dung nháp",
                10L,
                20L,
                null,
                List.of("https://example.com/pic1.jpg"),
                true
        );

        PostResponse res = communityService.createPost(1L, req);

        assertNotNull(res);
        assertEquals(201L, res.id());
        assertEquals(PostStatus.DRAFT, res.status());
        // Bài mới chỉ gắn tour: destinationId trong request bị bỏ qua
        verify(postRepository).save(argThat(p -> p.getStatus() == PostStatus.DRAFT && p.getMediaList().size() == 1
                && Long.valueOf(10L).equals(p.getTourId()) && p.getDestinationId() == null));
    }

    @Test
    @DisplayName("Không cho gắn tour không tồn tại hoặc chưa mở bán")
    void testCreatePost_RejectsInvalidTour() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(tourRepository.findById(10L)).thenReturn(Optional.empty());
        when(tourRepository.findById(11L)).thenReturn(Optional.of(Tour.builder().tourId(11L).approved(false).build()));

        var missing = new CreatePostRequest("T", "N", 10L, null, null, List.of(), false);
        var unpublished = new CreatePostRequest("T", "N", 11L, null, null, List.of(), false);

        assertEquals("POST-TOUR-NOT-FOUND",
                assertThrows(BusinessException.class, () -> communityService.createPost(1L, missing)).getCode());
        assertEquals("POST-TOUR-NOT-PUBLISHED",
                assertThrows(BusinessException.class, () -> communityService.createPost(1L, unpublished)).getCode());
        verify(postRepository, never()).save(any());
    }

    @Test
    @DisplayName("Chỉ cho gắn hành trình của chính mình và đúng tour đã chọn")
    void testCreatePost_RejectsForeignJourney() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(tourRepository.findById(10L)).thenReturn(Optional.of(Tour.builder().tourId(10L).approved(true).build()));
        when(journeyRepository.findById(5L)).thenReturn(Optional.of(Journey.builder().id(5L).userId(2L).tourId(10L).build()));
        when(journeyRepository.findById(6L)).thenReturn(Optional.of(Journey.builder().id(6L).userId(1L).tourId(99L).build()));

        var foreign = new CreatePostRequest("T", "N", 10L, null, 5L, List.of(), false);
        var otherTour = new CreatePostRequest("T", "N", 10L, null, 6L, List.of(), false);

        assertEquals("POST-JOURNEY-FORBIDDEN",
                assertThrows(BusinessException.class, () -> communityService.createPost(1L, foreign)).getCode());
        assertEquals("POST-JOURNEY-MISMATCH",
                assertThrows(BusinessException.class, () -> communityService.createPost(1L, otherTour)).getCode());
    }

    @Test
    @DisplayName("Tạo bài viết mới gửi duyệt (PENDING_REVIEW)")
    void testCreatePost_PendingReview() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(postRepository.save(any(CommunityPost.class))).thenAnswer(invocation -> {
            CommunityPost p = invocation.getArgument(0);
            p.setId(202L);
            return p;
        });

        CreatePostRequest req = new CreatePostRequest(
                "Hành trình Đà Nẵng",
                "Cầu Rồng phun lửa rất đẹp",
                null,
                null,
                null,
                null,
                false
        );

        PostResponse res = communityService.createPost(1L, req);

        assertNotNull(res);
        assertEquals(PostStatus.PENDING_REVIEW, res.status());
        verify(postRepository).save(argThat(p -> p.getStatus() == PostStatus.PENDING_REVIEW));
    }

    @Test
    @DisplayName("Sửa bài viết của người khác bị chặn FORBIDDEN-POST")
    void testUpdatePost_Forbidden() {
        when(postRepository.findByIdWithMedia(100L)).thenReturn(Optional.of(samplePublishedPost));

        UpdatePostRequest req = new UpdatePostRequest("Hacked Title", "Hacked Content", null);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                communityService.updatePost(100L, 999L, req)
        );

        assertEquals("FORBIDDEN-POST", ex.getCode());
    }

    @Test
    @DisplayName("Sửa bài viết đã PUBLISHED tự động quay về PENDING_REVIEW để kiểm duyệt lại")
    void testUpdatePost_PublishedResetsToPendingReview() {
        when(postRepository.findByIdWithMedia(100L)).thenReturn(Optional.of(samplePublishedPost));
        when(postRepository.save(any(CommunityPost.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdatePostRequest req = new UpdatePostRequest("Tiêu đề đã sửa", "Nội dung cập nhật mới", List.of("https://example.com/new.jpg"));

        PostResponse res = communityService.updatePost(100L, 1L, req);

        assertNotNull(res);
        assertEquals(PostStatus.PENDING_REVIEW, res.status());
        assertEquals("Tiêu đề đã sửa", res.title());
        verify(postRepository).save(argThat(p -> p.getStatus() == PostStatus.PENDING_REVIEW && p.getModerationNote() != null));
    }

    @Test
    @DisplayName("Xem chi tiết bài viết bị ẩn ném ngoại lệ POST-HIDDEN")
    void testGetPostDetail_HiddenPost() {
        samplePublishedPost.setHidden(true);
        when(postRepository.findByIdWithMedia(100L)).thenReturn(Optional.of(samplePublishedPost));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                communityService.getPostDetail(100L, 1L, false)
        );

        assertEquals("POST-HIDDEN", ex.getCode());
    }

    @Test
    @DisplayName("Xem chi tiết bài viết chưa publish bởi người lạ ném ngoại lệ POST-NOT-PUBLISHED")
    void testGetPostDetail_NotPublished_Stranger() {
        samplePublishedPost.setStatus(PostStatus.PENDING_REVIEW);
        when(postRepository.findByIdWithMedia(100L)).thenReturn(Optional.of(samplePublishedPost));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                communityService.getPostDetail(100L, 999L, false)
        );

        assertEquals("POST-NOT-PUBLISHED", ex.getCode());
    }

    @Test
    @DisplayName("Bình luận vào bài viết chưa PUBLISHED bị từ chối")
    void testAddComment_NotPublished_Fails() {
        samplePublishedPost.setStatus(PostStatus.PENDING_REVIEW);
        when(postRepository.findById(100L)).thenReturn(Optional.of(samplePublishedPost));

        PostCommentRequest req = new PostCommentRequest("Bình luận test");

        BusinessException ex = assertThrows(BusinessException.class, () ->
                communityService.addComment(100L, 1L, req)
        );

        assertEquals("COMMENT-NOT-ALLOWED", ex.getCode());
    }

    @Test
    @DisplayName("Bình luận thành công tăng commentsCount")
    void testAddComment_Success() {
        when(postRepository.findById(100L)).thenReturn(Optional.of(samplePublishedPost));
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(commentRepository.save(any(PostComment.class))).thenAnswer(invocation -> {
            PostComment c = invocation.getArgument(0);
            c.setId(501L);
            return c;
        });

        PostCommentRequest req = new PostCommentRequest("Bài viết hay quá!");
        CommentResponse res = communityService.addComment(100L, 1L, req);

        assertNotNull(res);
        assertEquals(501L, res.id());
        assertEquals("Bài viết hay quá!", res.content());
        assertEquals(3, samplePublishedPost.getCommentsCount());
        verify(postRepository).save(samplePublishedPost);
    }

    @Test
    @DisplayName("Người khác bình luận thì tác giả nhận thông báo POST_COMMENTED")
    void testAddComment_NotifiesAuthor() {
        when(postRepository.findById(100L)).thenReturn(Optional.of(samplePublishedPost));
        when(userRepository.findById(2L)).thenReturn(Optional.of(sampleUser));
        when(commentRepository.save(any(PostComment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        communityService.addComment(100L, 2L, new PostCommentRequest("Cảnh đẹp quá!"));

        NotificationEvent sent = lastNotification();
        assertEquals(com.journeygo.modules.notification.entity.enums.NotificationType.POST_COMMENTED, sent.type());
        assertEquals(java.util.Set.of(samplePublishedPost.getAuthorId()), sent.recipientIds());
        // Người bình luận bị loại trừ: tự bình luận bài của mình sẽ không có ai nhận
        assertEquals(2L, sent.excludeUserId());
        assertEquals("POST", sent.refType());
    }

    private NotificationEvent lastNotification() {
        org.mockito.ArgumentCaptor<Object> events = org.mockito.ArgumentCaptor.forClass(Object.class);
        org.mockito.Mockito.verify(eventPublisher, org.mockito.Mockito.atLeastOnce()).publishEvent(events.capture());
        return events.getAllValues().stream()
                .filter(NotificationEvent.class::isInstance).map(NotificationEvent.class::cast)
                .reduce((a, b) -> b).orElseThrow();
    }

    @Test
    @DisplayName("Thả tim mới lần đầu tăng likesCount")
    void testToggleReaction_NewReaction() {
        when(postRepository.findById(100L)).thenReturn(Optional.of(samplePublishedPost));
        when(reactionRepository.findByPostIdAndUserId(100L, 2L)).thenReturn(Optional.empty());

        int likes = communityService.toggleReaction(100L, 2L, ReactionType.LOVE);

        assertEquals(6, likes);
        verify(reactionRepository).save(argThat(r -> r.getReactionType() == ReactionType.LOVE && r.getUserId().equals(2L)));
        verify(postRepository).save(samplePublishedPost);
    }

    @Test
    @DisplayName("Bấm lại cùng loại reaction thì hủy (toggle off) giảm likesCount")
    void testToggleReaction_SameReaction_TogglesOff() {
        when(postRepository.findById(100L)).thenReturn(Optional.of(samplePublishedPost));
        PostReaction existing = PostReaction.builder()
                .id(10L)
                .postId(100L)
                .userId(2L)
                .reactionType(ReactionType.LOVE)
                .build();
        when(reactionRepository.findByPostIdAndUserId(100L, 2L)).thenReturn(Optional.of(existing));

        int likes = communityService.toggleReaction(100L, 2L, ReactionType.LOVE);

        assertEquals(4, likes);
        verify(reactionRepository).delete(existing);
        verify(postRepository).save(samplePublishedPost);
    }

    @Test
    @DisplayName("Bấm khác loại reaction thì cập nhật loại mới, không đổi likesCount")
    void testToggleReaction_ChangeReactionType() {
        when(postRepository.findById(100L)).thenReturn(Optional.of(samplePublishedPost));
        PostReaction existing = PostReaction.builder()
                .id(10L)
                .postId(100L)
                .userId(2L)
                .reactionType(ReactionType.LIKE)
                .build();
        when(reactionRepository.findByPostIdAndUserId(100L, 2L)).thenReturn(Optional.of(existing));

        int likes = communityService.toggleReaction(100L, 2L, ReactionType.LOVE);

        assertEquals(5, likes);
        assertEquals(ReactionType.LOVE, existing.getReactionType());
        verify(reactionRepository).save(existing);
        verify(postRepository).save(samplePublishedPost);
    }

    @Test
    @DisplayName("Báo cáo vi phạm thành công")
    void testReportPost_Success() {
        when(postRepository.findById(100L)).thenReturn(Optional.of(samplePublishedPost));
        when(reportRepository.existsByPostIdAndReporterId(100L, 2L)).thenReturn(false);
        when(reportRepository.save(any(PostReport.class))).thenAnswer(invocation -> {
            PostReport r = invocation.getArgument(0);
            r.setId(701L);
            return r;
        });

        CreateReportRequest req = new CreateReportRequest(ReportReason.SPAM, "Spam link quảng cáo");
        ReportResponse res = communityService.reportPost(100L, 2L, req);

        assertNotNull(res);
        assertEquals(701L, res.id());
        assertEquals(ReportReason.SPAM, res.reason());
        assertEquals(ReportStatus.PENDING, res.status());
    }

    @Test
    @DisplayName("Báo cáo trùng bài viết bị từ chối ALREADY-REPORTED")
    void testReportPost_AlreadyReported() {
        when(postRepository.findById(100L)).thenReturn(Optional.of(samplePublishedPost));
        when(reportRepository.existsByPostIdAndReporterId(100L, 2L)).thenReturn(true);

        CreateReportRequest req = new CreateReportRequest(ReportReason.INAPPROPRIATE_CONTENT, null);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                communityService.reportPost(100L, 2L, req)
        );

        assertEquals("ALREADY-REPORTED", ex.getCode());
    }

    @Test
    @DisplayName("Kiểm duyệt duyệt bài viết APPROVE -> PUBLISHED")
    void testModeratePost_Approve() {
        samplePublishedPost.setStatus(PostStatus.PENDING_REVIEW);
        when(postRepository.findByIdWithMedia(100L)).thenReturn(Optional.of(samplePublishedPost));
        when(postRepository.save(any(CommunityPost.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ModeratePostRequest req = new ModeratePostRequest("APPROVE", "Nội dung chuẩn chỉ");
        PostResponse res = communityService.moderatePost(100L, 888L, req);

        assertNotNull(res);
        assertEquals(PostStatus.PUBLISHED, res.status());
        assertEquals(888L, samplePublishedPost.getModeratedBy());

        // Tác giả nhận thông báo "bài viết đã được đăng"
        org.mockito.ArgumentCaptor<Object> events = org.mockito.ArgumentCaptor.forClass(Object.class);
        org.mockito.Mockito.verify(eventPublisher, org.mockito.Mockito.atLeastOnce()).publishEvent(events.capture());
        NotificationEvent sent = events.getAllValues().stream()
                .filter(NotificationEvent.class::isInstance).map(NotificationEvent.class::cast)
                .findFirst().orElseThrow();
        assertEquals(com.journeygo.modules.notification.entity.enums.NotificationType.POST_APPROVED, sent.type());
        assertEquals(java.util.Set.of(samplePublishedPost.getAuthorId()), sent.recipientIds());
    }

    @Test
    @DisplayName("Kiểm duyệt từ chối REJECT -> REJECTED")
    void testModeratePost_Reject() {
        samplePublishedPost.setStatus(PostStatus.PENDING_REVIEW);
        when(postRepository.findByIdWithMedia(100L)).thenReturn(Optional.of(samplePublishedPost));
        when(postRepository.save(any(CommunityPost.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ModeratePostRequest req = new ModeratePostRequest("REJECT", "Hình ảnh không phù hợp");
        PostResponse res = communityService.moderatePost(100L, 888L, req);

        assertNotNull(res);
        assertEquals(PostStatus.REJECTED, res.status());
    }

    @Test
    @DisplayName("Hành động kiểm duyệt không hợp lệ bị từ chối")
    void testModeratePost_InvalidAction() {
        when(postRepository.findByIdWithMedia(100L)).thenReturn(Optional.of(samplePublishedPost));

        ModeratePostRequest req = new ModeratePostRequest("UNKNOWN_ACTION", null);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                communityService.moderatePost(100L, 888L, req)
        );

        assertEquals("INVALID-MODERATION-ACTION", ex.getCode());
    }

    @Test
    @DisplayName("Xử lý báo cáo vi phạm với tuỳ chọn ẩn bài viết hidePost=true")
    void testResolveReport_HidePost() {
        PostReport report = PostReport.builder()
                .id(801L)
                .postId(100L)
                .reporterId(2L)
                .reason(ReportReason.INAPPROPRIATE_CONTENT)
                .status(ReportStatus.PENDING)
                .build();

        when(reportRepository.findById(801L)).thenReturn(Optional.of(report));
        when(postRepository.findById(100L)).thenReturn(Optional.of(samplePublishedPost));
        when(reportRepository.save(any(PostReport.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReportResponse res = communityService.resolveReport(801L, 999L, true, "Đã xác minh vi phạm, ẩn bài viết");

        assertNotNull(res);
        assertEquals(ReportStatus.RESOLVED, res.status());
        assertTrue(samplePublishedPost.isHidden());
        verify(postRepository).save(samplePublishedPost);

        // Tác giả được báo bài bị ẩn, người báo cáo được cảm ơn
        org.mockito.ArgumentCaptor<Object> events = org.mockito.ArgumentCaptor.forClass(Object.class);
        org.mockito.Mockito.verify(eventPublisher, org.mockito.Mockito.atLeastOnce()).publishEvent(events.capture());
        var sent = events.getAllValues().stream()
                .filter(NotificationEvent.class::isInstance).map(NotificationEvent.class::cast).toList();
        var hidden = sent.stream()
                .filter(e -> e.type() == com.journeygo.modules.notification.entity.enums.NotificationType.POST_HIDDEN)
                .findFirst().orElseThrow();
        assertEquals(java.util.Set.of(samplePublishedPost.getAuthorId()), hidden.recipientIds());
        var thanks = sent.stream()
                .filter(e -> e.type() == com.journeygo.modules.notification.entity.enums.NotificationType.REPORT_RESOLVED)
                .findFirst().orElseThrow();
        assertEquals(java.util.Set.of(2L), thanks.recipientIds());
    }

    @Test
    @DisplayName("Bác bỏ báo cáo thì người báo cáo nhận kết quả REPORT_DISMISSED")
    void testDismissReport_NotifiesReporter() {
        PostReport report = PostReport.builder()
                .id(802L).postId(100L).reporterId(3L)
                .reason(ReportReason.SPAM).status(ReportStatus.PENDING).build();
        when(reportRepository.findById(802L)).thenReturn(Optional.of(report));
        when(postRepository.findById(100L)).thenReturn(Optional.of(samplePublishedPost));
        when(reportRepository.save(any(PostReport.class))).thenAnswer(invocation -> invocation.getArgument(0));

        communityService.dismissReport(802L, 999L, null);

        NotificationEvent sent = lastNotification();
        assertEquals(com.journeygo.modules.notification.entity.enums.NotificationType.REPORT_DISMISSED, sent.type());
        assertEquals(java.util.Set.of(3L), sent.recipientIds());
        assertFalse(samplePublishedPost.isHidden());
    }
}
