package com.journeygo.modules.experience.service;

import com.journeygo.modules.experience.dto.request.CreateTaskRequest;
import com.journeygo.modules.experience.dto.request.ReorderTasksRequest;
import com.journeygo.modules.experience.dto.request.SetTaskPointsRequest;
import com.journeygo.modules.experience.dto.request.SetUnlockConditionRequest;
import com.journeygo.modules.experience.dto.request.UpdateTaskRequest;
import com.journeygo.modules.experience.dto.response.TaskResponse;
import com.journeygo.modules.experience.dto.response.UnlockConditionResponse;
import com.journeygo.modules.experience.entity.CheckInPoint;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.Task;
import com.journeygo.modules.experience.entity.TaskType;
import com.journeygo.modules.experience.entity.UnlockCondition;
import com.journeygo.modules.experience.entity.enums.TaskStatus;
import com.journeygo.modules.experience.entity.enums.UnlockConditionType;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.experience.repository.CheckInPointRepository;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.experience.repository.TaskRepository;
import com.journeygo.modules.experience.repository.TaskTypeRepository;
import com.journeygo.modules.experience.repository.UnlockConditionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service Task con trong Experience.
 *
 * BR-TASK-1: chỉ update khi DRAFT.
 * BR-TASK-2: sequence_order UNIQUE trong experience.
 * BR-TASK-3: QUIZ/FIELD_CLUE phải có ≥1 Question (validate trong TaskService.create khi Experience publish).
 * BR-TASK-4: LOCATION_VISIT/QR_CHECKPOINT phải có check_in_point_id.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ExperienceRepository experienceRepository;
    private final TaskTypeRepository taskTypeRepository;
    private final CheckInPointRepository checkInPointRepository;
    private final UnlockConditionRepository unlockConditionRepository;

    @Transactional(readOnly = true)
    public TaskResponse getById(Long id) {
        return TaskResponse.fromEntity(findOrThrow(id));
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> listByExperience(Long experienceId) {
        return taskRepository.findByExperienceIdOrderBySequenceOrderAsc(experienceId)
                .stream().map(TaskResponse::fromEntity).toList();
    }

    @Transactional
    public TaskResponse create(Long experienceId, CreateTaskRequest req) {
        Experience exp = experienceRepository.findById(experienceId)
                .orElseThrow(() -> new ResourceNotFoundException("Experience", experienceId));

        // Chỉ thêm Task khi Experience còn DRAFT
        if (exp.getStatus() != com.journeygo.modules.experience.entity.enums.ExperienceStatus.DRAFT) {
            throw new BusinessException("BR-TASK-CREATE",
                    "Chỉ tạo Task khi Experience ở trạng thái DRAFT");
        }

        TaskType taskType = taskTypeRepository.findById(req.taskTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("TaskType", req.taskTypeId()));

        // BR-TASK-2: sequence_order unique
        if (taskRepository.existsByExperienceIdAndSequenceOrder(experienceId, req.sequenceOrder())) {
            throw new BusinessException("BR-TASK-2",
                    "Sequence order " + req.sequenceOrder() + " đã tồn tại trong Experience " + experienceId);
        }

        // BR-TASK-4: requires_location → bắt buộc checkInPointId
        CheckInPoint checkInPoint = null;
        if (taskType.isRequiresLocation()) {
            if (req.checkInPointId() == null) {
                throw new BusinessException("BR-TASK-4",
                        "Task loại " + taskType.getCode() + " (yêu cầu location) phải có checkInPointId");
            }
            checkInPoint = checkInPointRepository.findById(req.checkInPointId())
                    .orElseThrow(() -> new ResourceNotFoundException("CheckInPoint", req.checkInPointId()));
        } else if (req.checkInPointId() != null) {
            // Nếu có gửi nhưng taskType không yêu cầu location → vẫn accept (cho linh hoạt)
            checkInPoint = checkInPointRepository.findById(req.checkInPointId())
                    .orElseThrow(() -> new ResourceNotFoundException("CheckInPoint", req.checkInPointId()));
        }

        Task t = Task.builder()
                .experience(exp)
                .taskType(taskType)
                .title(req.title())
                .description(req.description())
                .sequenceOrder(req.sequenceOrder())
                .pointsReward(req.pointsReward())
                .maxAttempts(req.maxAttempts() != null ? req.maxAttempts() : 3)
                .checkInPoint(checkInPoint)
                .status(TaskStatus.DRAFT)
                .build();

        Task saved = taskRepository.saveAndFlush(t);
        log.info("Created Task id={} in Experience={}", saved.getId(), experienceId);
        return TaskResponse.fromEntity(saved);
    }

    @Transactional
    public TaskResponse update(Long id, UpdateTaskRequest req) {
        Task t = findOrThrow(id);
        // BR-TASK-1: chỉ update khi DRAFT
        if (t.getStatus() != TaskStatus.DRAFT) {
            throw new BusinessException("BR-TASK-1",
                    "Task chỉ cập nhật được khi status = DRAFT. Hiện tại: " + t.getStatus());
        }

        if (req.title() != null) t.setTitle(req.title());
        if (req.description() != null) t.setDescription(req.description());
        if (req.sequenceOrder() != null) {
            if (taskRepository.existsByExperienceIdAndSequenceOrderAndIdNot(
                    t.getExperience().getId(), req.sequenceOrder(), id)) {
                throw new BusinessException("BR-TASK-2",
                        "Sequence order " + req.sequenceOrder() + " đã tồn tại trong Experience");
            }
            t.setSequenceOrder(req.sequenceOrder());
        }
        if (req.pointsReward() != null) t.setPointsReward(req.pointsReward());
        if (req.maxAttempts() != null) t.setMaxAttempts(req.maxAttempts());
        if (req.checkInPointId() != null) {
            CheckInPoint cip = checkInPointRepository.findById(req.checkInPointId())
                    .orElseThrow(() -> new ResourceNotFoundException("CheckInPoint", req.checkInPointId()));
            t.setCheckInPoint(cip);
        }

        // saveAndFlush để (experience_id, sequence_order) UNIQUE nổ ngay → 400 thay vì 500
        Task saved = taskRepository.saveAndFlush(t);
        log.info("Updated Task id={}", saved.getId());
        return TaskResponse.fromEntity(saved);
    }

    @Transactional
    public void softDelete(Long id) {
        Task t = findOrThrow(id);
        t.setStatus(TaskStatus.INACTIVE);
        taskRepository.save(t);
        log.info("Soft-deleted Task id={} → INACTIVE", id);
    }

    @Transactional
    public List<TaskResponse> reorder(Long experienceId, ReorderTasksRequest req) {
        List<Task> tasks = taskRepository.findByExperienceIdOrderBySequenceOrderAsc(experienceId);

        // BR-TASK-REORDER: yêu cầu req.taskIds() phải là permutation đầy đủ
        // các task hiện có — tránh sequenceOrder bị trùng/bỏ sót → vi phạm BR-TASK-2
        if (req.taskIds() == null || req.taskIds().size() != tasks.size()) {
            throw new BusinessException("BR-TASK-REORDER",
                    "Danh sách taskIds phải chứa đủ " + tasks.size() + " task hiện có");
        }
        Map<Long, Task> map = new HashMap<>();
        tasks.forEach(tt -> map.put(tt.getId(), tt));

        int i = 0;
        for (Long taskId : req.taskIds()) {
            Task t = map.get(taskId);
            if (t == null) {
                throw new BusinessException("BR-TASK-REORDER",
                        "Task id " + taskId + " không thuộc Experience " + experienceId);
            }
            t.setSequenceOrder(i++);
        }
        taskRepository.saveAllAndFlush(tasks);
        log.info("Reordered {} tasks in Experience {}", tasks.size(), experienceId);
        return tasks.stream().map(TaskResponse::fromEntity).toList();
    }

    @Transactional
    public TaskResponse setPoints(Long id, SetTaskPointsRequest req) {
        Task t = findOrThrow(id);
        if (t.getStatus() != TaskStatus.DRAFT) {
            throw new BusinessException("BR-TASK-1",
                    "Chỉ set points khi Task ở trạng thái DRAFT");
        }
        t.setPointsReward(req.pointsReward());
        Task saved = taskRepository.save(t);
        return TaskResponse.fromEntity(saved);
    }

    @Transactional
    public TaskResponse setLocation(Long id, Long checkInPointId) {
        Task t = findOrThrow(id);
        if (t.getStatus() != TaskStatus.DRAFT) {
            throw new BusinessException("BR-TASK-1",
                    "Chỉ set location khi Task ở trạng thái DRAFT");
        }
        CheckInPoint cip = checkInPointRepository.findById(checkInPointId)
                .orElseThrow(() -> new ResourceNotFoundException("CheckInPoint", checkInPointId));
        t.setCheckInPoint(cip);
        Task saved = taskRepository.save(t);
        return TaskResponse.fromEntity(saved);
    }

    @Transactional
    public UnlockConditionResponse setUnlockCondition(Long id, SetUnlockConditionRequest req) {
        Task t = findOrThrow(id);
        UnlockCondition uc = unlockConditionRepository.findByTaskId(id).orElse(null);

        if (uc == null) {
            uc = UnlockCondition.builder().task(t).build();
        }
        uc.setConditionType(req.conditionType());
        uc.setMinimumScorePercent(req.minimumScorePercent());
        uc.setTimeWindowMinutes(req.timeWindowMinutes());
        uc.setDescription(req.description());

        // Pre-switch validation: một số ConditionType yêu cầu field bắt buộc
        if (req.conditionType() == UnlockConditionType.SCORE_BASED
                && req.minimumScorePercent() == null) {
            throw new BusinessException("BR-UC-SCORE",
                    "ConditionType.SCORE_BASED yêu cầu minimumScorePercent");
        }
        if (req.conditionType() == UnlockConditionType.TIME_BASED
                && req.timeWindowMinutes() == null) {
            throw new BusinessException("BR-UC-TIME",
                    "ConditionType.TIME_BASED yêu cầu timeWindowMinutes");
        }

        switch (req.conditionType()) {
            case SEQUENTIAL -> {
                if (req.prerequisiteTaskId() == null) {
                    throw new BusinessException("BR-UC-SEQ",
                            "ConditionType.SEQUENTIAL yêu cầu prerequisiteTaskId");
                }
                Task pre = findOrThrow(req.prerequisiteTaskId());
                if (pre.getExperience() == null || !pre.getExperience().getId().equals(t.getExperience().getId())) {
                    throw new BusinessException("BR-UC-SEQ-CROSS",
                            "Prerequisite task phải thuộc cùng Experience");
                }
                uc.setPrerequisiteTask(pre);
                uc.setCheckInPoint(null);
            }
            case LOCATION_VERIFICATION -> {
                if (req.checkInPointId() == null) {
                    throw new BusinessException("BR-UC-LOC",
                            "ConditionType.LOCATION_VERIFICATION yêu cầu checkInPointId");
                }
                CheckInPoint cip = checkInPointRepository.findById(req.checkInPointId())
                        .orElseThrow(() -> new ResourceNotFoundException("CheckInPoint", req.checkInPointId()));
                if (cip.getExperience() == null || !cip.getExperience().getId().equals(t.getExperience().getId())) {
                    throw new BusinessException("BR-UC-LOC-CROSS",
                            "CheckInPoint phải thuộc cùng Experience");
                }
                uc.setCheckInPoint(cip);
                uc.setPrerequisiteTask(null);
            }
            default -> {
                // SCORE_BASED / TIME_BASED / ALWAYS: không cần FK tới task/cip
                uc.setPrerequisiteTask(null);
                uc.setCheckInPoint(null);
            }
        }

        UnlockCondition saved = unlockConditionRepository.saveAndFlush(uc);
        return UnlockConditionResponse.fromEntity(saved);
    }

    // ── internal ────────────────────────────────────────────────────────────

    private Task findOrThrow(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task", id));
    }
}