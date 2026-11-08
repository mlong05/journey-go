package com.journeygo.modules.experience.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.experience.dto.request.CreateQuestionRequest;
import com.journeygo.modules.experience.dto.request.SetExpectedTextRequest;
import com.journeygo.modules.experience.dto.response.QuestionResponse;
import com.journeygo.modules.experience.service.QuestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
@Tag(name = "Question", description = "Quản lý Question trong Task")
public class QuestionController {

    private final QuestionService questionService;

    @GetMapping("/questions/{id}")
    @Operation(summary = "Lấy Question theo ID",
            description = "?forTourist=true ẩn expectedText & answers.isCorrect (BR-TASK-5)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<QuestionResponse>> getById(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean forTourist) {
        return ResponseEntity.ok(ApiResponse.success(questionService.getById(id, forTourist)));
    }

    @GetMapping("/tasks/{taskId}/questions")
    @Operation(summary = "Danh sách Question theo Task",
            description = "?forTourist=true ẩn đáp án (BR-TASK-5)")
    @ApiResponses(@io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"))
    public ResponseEntity<ApiResponse<List<QuestionResponse>>> listByTask(
            @PathVariable Long taskId,
            @RequestParam(defaultValue = "false") boolean forTourist) {
        return ResponseEntity.ok(ApiResponse.success(
                questionService.listByTask(taskId, forTourist)));
    }

    @PostMapping("/tasks/{taskId}/questions")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasRole('CONTENT_PROVIDER') and @experienceSecurityBean.isOwnerOfTask(#taskId)")
    @Operation(summary = "Tạo Question cho Task (chỉ khi Task DRAFT, chỉ owner)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
                    description = "Task không DRAFT hoặc không thuộc TaskType có Question"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403")
    })
    public ResponseEntity<ApiResponse<QuestionResponse>> create(
            @PathVariable Long taskId,
            @Valid @RequestBody CreateQuestionRequest request) {
        QuestionResponse q = questionService.create(taskId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo Question thành công", q));
    }

    @PatchMapping("/questions/{id}/expected-text")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasRole('CONTENT_PROVIDER') and @experienceSecurityBean.isOwnerOfQuestion(#id)")
    @Operation(summary = "Set/Cập nhật expectedText (chỉ khi Task DRAFT, chỉ owner)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<QuestionResponse>> setExpectedText(
            @PathVariable Long id,
            @Valid @RequestBody SetExpectedTextRequest request) {
        return ResponseEntity.ok(ApiResponse.success(questionService.setExpectedText(id, request)));
    }

    @DeleteMapping("/questions/{id}")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasRole('CONTENT_PROVIDER') and @experienceSecurityBean.isOwnerOfQuestion(#id)")
    @Operation(summary = "Xóa Question (chỉ khi Task DRAFT, chỉ owner)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        questionService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa Question thành công"));
    }
}
