package com.journeygo.modules.experience.service;

import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.experience.dto.request.ChangeExperienceStatusRequest;
import com.journeygo.modules.experience.dto.response.ExperienceResponse;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import com.journeygo.modules.experience.entity.enums.TaskStatus;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.repository.CheckInPointRepository;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.experience.repository.TaskRepository;
import com.journeygo.modules.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * Nhiệm vụ đi theo trạng thái của Experience: xuất bản Experience thì xuất bản Task DRAFT,
 * đưa về DRAFT thì Task PUBLISHED trở lại DRAFT để sửa được câu hỏi.
 */
@ExtendWith(MockitoExtension.class)
class ExperienceServiceStatusTest {

    @Mock private ExperienceRepository experienceRepository;
    @Mock private DestinationRepository destinationRepository;
    @Mock private UserRepository userRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private CheckInPointRepository checkInPointRepository;
    @org.mockito.Spy
    private com.journeygo.modules.notification.service.NotificationPublisher notifications =
            new com.journeygo.modules.notification.service.NotificationPublisher(
                    org.mockito.Mockito.mock(org.springframework.context.ApplicationEventPublisher.class));

    @InjectMocks
    private ExperienceService experienceService;

    private Experience experience(ExperienceStatus status) {
        Experience e = Experience.builder().id(7L).title("Trải nghiệm").status(status).build();
        when(experienceRepository.findById(7L)).thenReturn(Optional.of(e));
        return e;
    }

    @Test
    void publishingExperience_publishesItsDraftTasks() {
        experience(ExperienceStatus.DRAFT);
        when(taskRepository.updateStatusByExperience(7L, TaskStatus.DRAFT, TaskStatus.PUBLISHED)).thenReturn(3);

        ExperienceResponse res = experienceService.changeStatus(7L,
                new ChangeExperienceStatusRequest(ExperienceStatus.PUBLISHED));

        assertEquals(ExperienceStatus.PUBLISHED, res.status());
        verify(taskRepository).updateStatusByExperience(7L, TaskStatus.DRAFT, TaskStatus.PUBLISHED);
        verify(taskRepository, never()).updateStatusByExperience(anyLong(), eq(TaskStatus.PUBLISHED), eq(TaskStatus.DRAFT));
    }

    @Test
    void revertingExperienceToDraft_unpublishesItsTasks() {
        experience(ExperienceStatus.PUBLISHED);

        experienceService.changeStatus(7L, new ChangeExperienceStatusRequest(ExperienceStatus.DRAFT));

        verify(taskRepository).updateStatusByExperience(7L, TaskStatus.PUBLISHED, TaskStatus.DRAFT);
    }

    @Test
    void republishingAlreadyPublishedExperience_stillRepairsDraftTasks() {
        experience(ExperienceStatus.PUBLISHED);

        experienceService.changeStatus(7L, new ChangeExperienceStatusRequest(ExperienceStatus.PUBLISHED));

        verify(experienceRepository, never()).save(any());
        verify(taskRepository).updateStatusByExperience(7L, TaskStatus.DRAFT, TaskStatus.PUBLISHED);
    }

    @Test
    void inactiveExperience_isRejectedAndTasksUntouched() {
        experience(ExperienceStatus.INACTIVE);

        assertThrows(BusinessException.class, () -> experienceService.changeStatus(7L,
                new ChangeExperienceStatusRequest(ExperienceStatus.PUBLISHED)));
        verify(taskRepository, never()).updateStatusByExperience(anyLong(), any(), any());
    }
}
