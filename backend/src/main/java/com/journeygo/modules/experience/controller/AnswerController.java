package com.journeygo.modules.experience.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.experience.dto.request.CreateAnswerRequest;
import com.journeygo.modules.experience.dto.request.UpdateAnswerRequest;
import com.journeygo.modules.experience.dto.response.AnswerResponse;
import com.journeygo.modules.experience.service.AnswerService;
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

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Answer", description = "Quản lý Answer trong Question")
public class AnswerController {

    private final AnswerService answerService;

    @GetMapping("/answers/{id}")
    @Operation(summary = "Lấy Answer theo ID",
            description = "?forTourist=true ẩn isCorrect & explanation (BR-TASK-5)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<AnswerResponse>> getById(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean forTourist) {
        return ResponseEntity.ok(ApiResponse.success(answerService.getById(id, forTourist)));
    }

    @PostMapping("/questions/{questionId}/answers")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfQuestion(#questionId)")
    @Operation(summary = "Tạo Answer cho Question (chỉ khi Task DRAFT, chỉ owner)",
            description = "BR-TASK-6: MULTIPLE_CHOICE chỉ 1 isCorrect=true; TEXT tất cả isCorrect=true")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
                    description = "BR-TASK-6: vi phạm rule chọn isCorrect"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403")
    })
    public ResponseEntity<ApiResponse<AnswerResponse>> create(
            @PathVariable Long questionId,
            @Valid @RequestBody CreateAnswerRequest request) {
        AnswerResponse a = answerService.create(questionId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo Answer thành công", a));
    }

    @PatchMapping("/answers/{id}")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfAnswer(#id)")
    @Operation(summary = "Cập nhật Answer (chỉ khi Task DRAFT, chỉ owner)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<AnswerResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAnswerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(answerService.update(id, request)));
    }

    @DeleteMapping("/answers/{id}")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfAnswer(#id)")
    @Operation(summary = "Xóa Answer (chỉ khi Task DRAFT, chỉ owner)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        answerService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa Answer thành công"));
    }
}
