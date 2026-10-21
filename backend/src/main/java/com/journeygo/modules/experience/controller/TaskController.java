package com.journeygo.modules.experience.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.experience.dto.request.CreateTaskRequest;
import com.journeygo.modules.experience.dto.request.ReorderTasksRequest;
import com.journeygo.modules.experience.dto.request.SetTaskPointsRequest;
import com.journeygo.modules.experience.dto.request.SetUnlockConditionRequest;
import com.journeygo.modules.experience.dto.request.UpdateTaskRequest;
import com.journeygo.modules.experience.dto.response.TaskResponse;
import com.journeygo.modules.experience.dto.response.UnlockConditionResponse;
import com.journeygo.modules.experience.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Validated
@Tag(name = "Task", description = "Quản lý Task trong Experience")
public class TaskController {

    private final TaskService taskService;

    @GetMapping("/tasks/{id}")
    @Operation(summary = "Lấy Task theo ID")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<TaskResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(taskService.getById(id)));
    }

    @GetMapping("/experiences/{experienceId}/tasks")
    @Operation(summary = "Danh sách Task theo Experience (sắp xếp theo sequenceOrder)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404",
                    description = "Experience không tồn tại hoặc DRAFT không thuộc về bạn")
    })
    public ResponseEntity<ApiResponse<List<TaskResponse>>> listByExperience(
            @PathVariable Long experienceId) {
        return ResponseEntity.ok(ApiResponse.success(
                taskService.listByExperience(experienceId)));
    }

    @PostMapping("/experiences/{experienceId}/tasks")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfExperience(#experienceId)")
    @Operation(summary = "Tạo Task mới (chỉ khi Experience DRAFT, chỉ owner) — BR-TASK-1, BR-TASK-2")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
                    description = "BR-TASK-1: status Experience != DRAFT; BR-TASK-2: trùng sequenceOrder"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403",
                    description = "Không phải owner Experience hoặc sai role")
    })
    public ResponseEntity<ApiResponse<TaskResponse>> create(
            @PathVariable Long experienceId,
            @Valid @RequestBody CreateTaskRequest request) {
        TaskResponse t = taskService.create(experienceId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo Task thành công", t));
    }

    @PatchMapping("/tasks/{id}")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfTask(#id)")
    @Operation(summary = "Cập nhật Task (chỉ khi Experience DRAFT — BR-TASK-1, chỉ owner)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
                    description = "BR-TASK-1: chỉ sửa khi Experience DRAFT"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<TaskResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTaskRequest request) {
        return ResponseEntity.ok(ApiResponse.success(taskService.update(id, request)));
    }

    @DeleteMapping("/tasks/{id}")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfTask(#id)")
    @Operation(summary = "Xóa mềm Task (chỉ khi Experience DRAFT, chỉ owner)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        taskService.softDelete(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa Task thành công"));
    }

    @PostMapping("/experiences/{experienceId}/tasks/reorder")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfExperience(#experienceId)")
    @Operation(summary = "Sắp xếp lại thứ tự Task (theo thứ tự trong taskIds, chỉ owner)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
                    description = "taskIds phải chứa đủ các ID hiện có của Experience"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403")
    })
    public ResponseEntity<ApiResponse<List<TaskResponse>>> reorder(
            @PathVariable Long experienceId,
            @Valid @RequestBody ReorderTasksRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                taskService.reorder(experienceId, request)));
    }

    @PatchMapping("/tasks/{id}/points")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfTask(#id)")
    @Operation(summary = "Set points_reward cho Task (chỉ owner)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403")
    })
    public ResponseEntity<ApiResponse<TaskResponse>> setPoints(
            @PathVariable Long id,
            @Valid @RequestBody SetTaskPointsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(taskService.setPoints(id, request)));
    }

    @PatchMapping("/tasks/{id}/location")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfTask(#id)")
    @Operation(summary = "Gán CheckInPoint cho Task (chỉ owner, BR-TASK-4 nếu loại Task cần location)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
                    description = "BR-TASK-4: TaskType không yêu cầu location"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403")
    })
    public ResponseEntity<ApiResponse<TaskResponse>> setLocation(
            @PathVariable Long id,
            @RequestParam @Positive Long checkInPointId) {
        return ResponseEntity.ok(ApiResponse.success(taskService.setLocation(id, checkInPointId)));
    }

    @PatchMapping("/tasks/{id}/unlock-condition")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfTask(#id)")
    @Operation(summary = "Set/Cập nhật UnlockCondition cho Task (chỉ owner)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403")
    })
    public ResponseEntity<ApiResponse<UnlockConditionResponse>> setUnlockCondition(
            @PathVariable Long id,
            @Valid @RequestBody SetUnlockConditionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(taskService.setUnlockCondition(id, request)));
    }
}
