package com.journeygo.modules.experience.service;

import com.journeygo.modules.experience.dto.request.CreateTaskTypeRequest;
import com.journeygo.modules.experience.dto.request.UpdateTaskTypeRequest;
import com.journeygo.modules.experience.dto.response.TaskTypeResponse;
import com.journeygo.modules.experience.entity.TaskType;
import com.journeygo.modules.experience.entity.enums.VerificationMethod;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.experience.repository.TaskTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskTypeService {

    private final TaskTypeRepository taskTypeRepository;


    @Transactional(readOnly = true)
    public List<TaskTypeResponse> list() {
        return taskTypeRepository.findAll().stream().map(TaskTypeResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public TaskTypeResponse getById(Long id) {
        return TaskTypeResponse.fromEntity(findOrThrow(id));
    }

    @Transactional(readOnly = true)
    public TaskTypeResponse getByCode(String code) {
        TaskType t = taskTypeRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("TaskType", "code", code));
        return TaskTypeResponse.fromEntity(t);
    }

    @Transactional
    public TaskTypeResponse create(CreateTaskTypeRequest req) {
        if (taskTypeRepository.existsByCode(req.code())) {
            throw new BusinessException("BR-TT-UNIQUE",
                    "TaskType code '" + req.code() + "' đã tồn tại");
        }
        VerificationMethod vm = parseVerificationMethod(req.verificationMethod());
        TaskType t = TaskType.builder()
                .code(req.code())
                .name(req.name())
                .hasQuestions(Boolean.TRUE.equals(req.hasQuestions()))
                .requiresLocation(Boolean.TRUE.equals(req.requiresLocation()))
                .verificationMethod(vm)
                .build();
        TaskType saved = taskTypeRepository.saveAndFlush(t);
        log.info("Created TaskType id={} code={}", saved.getId(), saved.getCode());
        return TaskTypeResponse.fromEntity(saved);
    }

    @Transactional
    public TaskTypeResponse update(Long id, UpdateTaskTypeRequest req) {
        TaskType t = findOrThrow(id);
        if (req.name() != null) t.setName(req.name());
        if (req.hasQuestions() != null) t.setHasQuestions(req.hasQuestions());
        if (req.requiresLocation() != null) t.setRequiresLocation(req.requiresLocation());
        if (req.verificationMethod() != null) {
            t.setVerificationMethod(parseVerificationMethod(req.verificationMethod()));
        }
        TaskType saved = taskTypeRepository.save(t);
        log.info("Updated TaskType id={}", saved.getId());
        return TaskTypeResponse.fromEntity(saved);
    }

    private VerificationMethod parseVerificationMethod(VerificationMethod vm) {
        if (vm == null) return null;

        return vm;
    }

    private TaskType findOrThrow(Long id) {
        return taskTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TaskType", id));
    }
}
