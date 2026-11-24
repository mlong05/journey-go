package com.journeygo.modules.aiguide.service;

import com.journeygo.modules.aiguide.event.DestinationInvalidatedEvent;
import com.journeygo.modules.aiguide.event.DestinationSyncedEvent;
import com.journeygo.modules.aiguide.listener.DestinationAiEventListener;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.entity.Region;
import com.journeygo.modules.destination.entity.Theme;
import com.journeygo.modules.destination.entity.enums.DestinationStatus;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.destination.repository.RegionRepository;
import com.journeygo.modules.destination.repository.ThemeRepository;
import com.journeygo.modules.destination.service.DestinationService;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.experience.repository.TaskRepository;
import com.journeygo.modules.moderation.entity.DestinationReview;
import com.journeygo.modules.moderation.entity.enums.DestinationReviewStatus;
import com.journeygo.modules.moderation.repository.DestinationReviewHistoryRepository;
import com.journeygo.modules.moderation.repository.DestinationReviewRepository;
import com.journeygo.modules.moderation.service.DestinationModerationService;
import com.journeygo.modules.notification.service.NotificationPublisher;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DestinationAutoSyncTest {

    @Mock private DestinationRepository destinationRepository;
    @Mock private DestinationReviewRepository reviewRepository;
    @Mock private DestinationReviewHistoryRepository historyRepository;
    @Mock private UserRepository userRepository;
    @Mock private ExperienceRepository experienceRepository;
    @Mock private TaskRepository taskRepository;
    @Mock(answer = Answers.RETURNS_DEEP_STUBS) private NotificationPublisher notifications;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private DestinationModerationService moderationService;

    @Mock private RegionRepository regionRepository;
    @Mock private ThemeRepository themeRepository;
    @Mock private DestinationModerationService unusedModerationService;
    @Mock private DocumentIngestionService ingestionService;

    @Test
    @DisplayName("Duyệt điểm đến phát ra DestinationSyncedEvent mang thông tin mới nhất")
    void approveDestination_publishesSyncedEvent() {
        Destination dest = Destination.builder()
                .id(50L)
                .name("Hoàng Thành Huế")
                .address("Thừa Thiên Huế")
                .region(Region.builder().name("Miền Trung").build())
                .themes(Set.of(Theme.builder().name("Di sản").build()))
                .status(DestinationStatus.PENDING)
                .build();
        DestinationReview review = DestinationReview.builder()
                .id(1L)
                .destination(dest)
                .status(DestinationReviewStatus.PENDING)
                .build();
        User reviewer = User.builder().id(9L).fullName("Moderator").build();

        when(reviewRepository.findByDestination_Id(50L)).thenReturn(Optional.of(review));
        when(userRepository.findById(9L)).thenReturn(Optional.of(reviewer));
        when(experienceRepository.findByDestination_Id(50L)).thenReturn(List.of());

        moderationService.approve(50L, 9L, "Hợp lệ");

        ArgumentCaptor<DestinationSyncedEvent> captor = ArgumentCaptor.forClass(DestinationSyncedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        DestinationSyncedEvent event = captor.getValue();
        assertThat(event.destinationId()).isEqualTo(50L);
        assertThat(event.name()).isEqualTo("Hoàng Thành Huế");
        assertThat(event.description()).contains("Khu vực: Miền Trung").contains("Chủ đề: Di sản");
        assertThat(event.address()).isEqualTo("Thừa Thiên Huế");
    }

    @Test
    @DisplayName("Gửi lại sau sửa và thu hồi duyệt đều phát DestinationInvalidatedEvent")
    void submitAfterEditAndReject_publishInvalidatedEvents() {
        Destination dest = Destination.builder().id(51L).name("Văn Miếu").address("Hà Nội").build();
        DestinationReview approvedReview = DestinationReview.builder()
                .id(2L)
                .destination(dest)
                .status(DestinationReviewStatus.APPROVED)
                .build();
        User actor = User.builder().id(9L).fullName("Admin").build();

        when(destinationRepository.findByIdAndDeletedFalse(51L)).thenReturn(Optional.of(dest));
        when(reviewRepository.findByDestination_Id(51L)).thenReturn(Optional.of(approvedReview));
        when(userRepository.findById(9L)).thenReturn(Optional.of(actor));
        when(experienceRepository.findByDestination_Id(51L)).thenReturn(List.of());
        when(reviewRepository.save(any(DestinationReview.class))).thenAnswer(inv -> inv.getArgument(0));

        moderationService.submitAfterEdit(51L, 9L, Role.of(Role.ADMIN));
        verify(eventPublisher).publishEvent(new DestinationInvalidatedEvent(51L, "DESTINATION_EDITED", false));

        approvedReview.setStatus(DestinationReviewStatus.APPROVED);
        moderationService.reject(51L, 9L, "Thu hồi", "INCOMPLETE_INFORMATION", null);
        verify(eventPublisher).publishEvent(new DestinationInvalidatedEvent(51L, "DESTINATION_APPROVAL_REVOKED", false));
    }

    @Test
    @DisplayName("Xóa mềm điểm đến phát ra DestinationInvalidatedEvent xóa toàn bộ vector của điểm đến")
    void deleteDestination_publishesFullInvalidationEvent() {
        DestinationService destService = new DestinationService(
                destinationRepository, userRepository, regionRepository, themeRepository, unusedModerationService, eventPublisher
        );
        Destination dest = Destination.builder().id(52L).name("Điểm xóa").build();
        when(destinationRepository.findByIdAndDeletedFalse(52L)).thenReturn(Optional.of(dest));

        destService.delete(52L);

        verify(eventPublisher).publishEvent(new DestinationInvalidatedEvent(52L, "DESTINATION_DELETED", true));
    }

    @Test
    @DisplayName("DestinationAiEventListener gọi đúng ingestDestinationSummary, invalidateContent và invalidateDestination")
    void destinationListener_delegatesCorrectly() {
        DestinationAiEventListener listener = new DestinationAiEventListener(ingestionService);

        listener.handleDestinationSynced(new DestinationSyncedEvent(50L, "Huế", "Khu vực: Miền Trung", "Huế"));
        verify(ingestionService).ingestDestinationSummary(50L, "Huế", "Khu vực: Miền Trung", "Huế");

        listener.handleDestinationInvalidated(new DestinationInvalidatedEvent(50L, "DESTINATION_EDITED", false));
        verify(ingestionService).invalidateContent("DESTINATION:50");

        listener.handleDestinationInvalidated(new DestinationInvalidatedEvent(50L, "DESTINATION_DELETED", true));
        verify(ingestionService).invalidateDestination(50L);
    }
}
