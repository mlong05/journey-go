package com.journeygo.modules.experience.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.experience.dto.request.SetBasePointsRequest;
import com.journeygo.modules.experience.dto.request.SetPointRuleRequest;
import com.journeygo.modules.experience.dto.response.PointRuleResponse;
import com.journeygo.modules.experience.dto.response.UnlockConditionResponse;
import com.journeygo.modules.experience.service.PointRuleService;
import com.journeygo.modules.experience.service.UnlockConditionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "PointRule & UnlockCondition", description = "Cấu hình điểm thưởng & điều kiện mở khóa Task")
public class RuleController {

    private final PointRuleService pointRuleService;
    private final UnlockConditionService unlockConditionService;

    @GetMapping("/task-types/{taskTypeId}/point-rule")
    @Operation(summary = "Lấy PointRule của TaskType (PUBLIC — master data)")
    public ResponseEntity<ApiResponse<PointRuleResponse>> getPointRule(
            @PathVariable Long taskTypeId) {
        return ResponseEntity.ok(ApiResponse.success(pointRuleService.getByTaskType(taskTypeId)));
    }

    @PostMapping("/task-types/{taskTypeId}/point-rule")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Tạo hoặc cập nhật PointRule (ADMIN only)")
    public ResponseEntity<ApiResponse<PointRuleResponse>> upsertPointRule(
            @PathVariable Long taskTypeId,
            @Valid @RequestBody SetPointRuleRequest request) {
        PointRuleResponse pr = pointRuleService.upsert(taskTypeId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Cập nhật PointRule thành công", pr));
    }

    @PutMapping("/task-types/{taskTypeId}/base-points")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Đặt điểm thưởng mỗi nhiệm vụ của loại này (ADMIN only) — dùng cho nhiệm vụ trong tour")
    public ResponseEntity<ApiResponse<PointRuleResponse>> setBasePoints(
            @PathVariable Long taskTypeId,
            @Valid @RequestBody SetBasePointsRequest request) {
        PointRuleResponse pr = pointRuleService.setBasePoints(taskTypeId, request.basePoints());
        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật điểm thưởng", pr));
    }

    @GetMapping("/tasks/{taskId}/unlock-condition")
    @Operation(summary = "Lấy UnlockCondition của Task (PUBLIC — metadata của experience)")
    public ResponseEntity<ApiResponse<UnlockConditionResponse>> getUnlockCondition(
            @PathVariable Long taskId) {
        return ResponseEntity.ok(ApiResponse.success(unlockConditionService.getByTask(taskId)));
    }
}
