package com.journeygo.modules.experience.service;

import com.journeygo.modules.experience.dto.request.SetPointRuleRequest;
import com.journeygo.modules.experience.dto.response.PointRuleResponse;
import com.journeygo.modules.experience.entity.PointRule;
import com.journeygo.modules.experience.entity.TaskType;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.experience.repository.PointRuleRepository;
import com.journeygo.modules.experience.repository.TaskTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PointRuleService {

    private final PointRuleRepository pointRuleRepository;
    private final TaskTypeRepository taskTypeRepository;

    @Transactional(readOnly = true)
    public PointRuleResponse getByTaskType(Long taskTypeId) {
        PointRule pr = pointRuleRepository.findByTaskTypeId(taskTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("PointRule", "taskTypeId", taskTypeId));
        return PointRuleResponse.fromEntity(pr);
    }


    @Transactional
    public PointRuleResponse upsert(Long taskTypeId, SetPointRuleRequest req) {
        TaskType taskType = taskTypeRepository.findById(taskTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("TaskType", taskTypeId));

        PointRule pr = pointRuleRepository.findByTaskTypeId(taskTypeId).orElse(null);
        if (pr == null) {
            pr = PointRule.builder().taskType(taskType).build();
        }
        pr.setBasePoints(req.basePoints());
        pr.setBonusMultiplier(req.bonusMultiplier());
        pr.setConditions(req.conditions() != null ? req.conditions() : new HashMap<>());

        PointRule saved = pointRuleRepository.save(pr);
        log.info("Upserted PointRule id={} for TaskType={} base={} multiplier={}",
                saved.getId(), taskTypeId, saved.getBasePoints(), saved.getBonusMultiplier());
        return PointRuleResponse.fromEntity(saved);
    }


    /** Chỉ đổi điểm nền; hệ số nhân / điều kiện bonus giữ nguyên (tạo mới thì hệ số 1.00). */
    @Transactional
    public PointRuleResponse setBasePoints(Long taskTypeId, int basePoints) {
        TaskType taskType = taskTypeRepository.findById(taskTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("TaskType", taskTypeId));
        PointRule pr = pointRuleRepository.findByTaskTypeId(taskTypeId)
                .orElseGet(() -> PointRule.builder().taskType(taskType).build());
        pr.setBasePoints(basePoints);
        PointRule saved = pointRuleRepository.save(pr);
        log.info("Set basePoints={} for TaskType={}", basePoints, taskTypeId);
        return PointRuleResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public int computePoints(Long taskTypeId, int taskPointsReward, java.util.Set<String> matched) {
        PointRule pr = pointRuleRepository.findByTaskTypeId(taskTypeId).orElse(null);
        if (pr == null) return taskPointsReward;

        double multiplier = pr.getBonusMultiplier().doubleValue();
        Map<String, Object> conditions = pr.getConditions();
        if (conditions != null && matched != null) {
            for (String key : matched) {
                Object v = conditions.get(key);
                if (v instanceof Number n) {
                    multiplier *= n.doubleValue();
                }
            }
        }
        return (int) Math.round(pr.getBasePoints() * multiplier) + taskPointsReward;
    }
}
