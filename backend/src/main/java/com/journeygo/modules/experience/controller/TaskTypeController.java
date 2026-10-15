package com.journeygo.modules.experience.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.experience.dto.request.CreateTaskTypeRequest;
import com.journeygo.modules.experience.dto.request.UpdateTaskTypeRequest;
import com.journeygo.modules.experience.dto.response.TaskTypeResponse;
import com.journeygo.modules.experience.service.TaskTypeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "TaskType", description = "Master data: loại Task (PUBLIC đọc, Admin sửa)")
public class TaskTypeController {

    private final TaskTypeService taskTypeService;

    /** List tất cả TaskType — PUBLIC, không cần auth. */
    @GetMapping("/task-types")
    @Operation(summary = "Danh sách TaskType (PUBLIC — không cần auth)")
    public ResponseEntity<ApiResponse<List<TaskTypeResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(taskTypeService.list()));
    }

    @GetMapping("/task-types/{id}")
    @Operation(summary = "Lấy TaskType theo ID")
    public ResponseEntity<ApiResponse<TaskTypeResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(taskTypeService.getById(id)));
    }

    @GetMapping("/task-types/code/{code}")
    @Operation(summary = "Lấy TaskType theo code (vd: QUIZ, FIELD_CLUE)")
    public ResponseEntity<ApiResponse<TaskTypeResponse>> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.success(taskTypeService.getByCode(code)));
    }

    @PostMapping("/task-types")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Tạo TaskType mới (ADMIN only)")
    public ResponseEntity<ApiResponse<TaskTypeResponse>> create(
            @Valid @RequestBody CreateTaskTypeRequest request) {
        TaskTypeResponse t = taskTypeService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo TaskType thành công", t));
    }

    @PatchMapping("/task-types/{id}")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Cập nhật TaskType (ADMIN only)")
    public ResponseEntity<ApiResponse<TaskTypeResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTaskTypeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(taskTypeService.update(id, request)));
    }
}
