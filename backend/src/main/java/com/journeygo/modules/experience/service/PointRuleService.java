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

/**
 * Service PointRule — cấu hình cách tính điểm cho mỗi TaskType.
 *
 * Công thức runtime: điểm_thực_nhận = base_points × bonus_multiplier × task.points_reward.
 * Mỗi TaskType có đúng 1 PointRule (UNIQUE).
 */
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

    /**
     * Tạo hoặc cập nhật PointRule cho 1 TaskType.
     * Upsert: nếu đã có thì update, chưa có thì tạo.
     */
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

    // ── internal ────────────────────────────────────────────────────────────

    /**
     * Tính điểm thực nhận cho 1 attempt. Module Tourist Execution sẽ gọi method này.
     *
     * @param taskTypeId TaskType cần tra cứu.
     * @param taskPointsReward points_reward của Task.
     * @param matchedConditions các key trong point_rule.conditions đã match (vd: ["firstAttempt", "perfectScore"]).
     * @return điểm thực nhận. Trả về taskPointsReward nếu không tìm thấy rule.
     */
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