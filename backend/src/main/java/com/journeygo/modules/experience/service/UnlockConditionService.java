package com.journeygo.modules.experience.service;

import com.journeygo.modules.experience.dto.response.UnlockConditionResponse;
import com.journeygo.modules.experience.entity.UnlockCondition;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.experience.repository.UnlockConditionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UnlockConditionService {

    private final UnlockConditionRepository unlockConditionRepository;

    @Transactional(readOnly = true)
    public UnlockConditionResponse getByTask(Long taskId) {
        UnlockCondition uc = unlockConditionRepository.findByTaskId(taskId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "UnlockCondition", "taskId", taskId));
        return UnlockConditionResponse.fromEntity(uc);
    }
}
