package com.journeygo.modules.experience.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.security.AuthorizationGuard;
import com.journeygo.modules.experience.dto.request.ChangeExperienceStatusRequest;
import com.journeygo.modules.experience.dto.request.CreateExperienceRequest;
import com.journeygo.modules.experience.dto.request.UpdateExperienceRequest;
import com.journeygo.modules.experience.dto.response.ExperienceResponse;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import com.journeygo.modules.experience.service.ExperienceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Experience", description = "Quản lý Experience (trải nghiệm du lịch) — CRUD thuần")
public class ExperienceController {

    private final ExperienceService experienceService;

    @GetMapping("/experiences/{id}")
    @Operation(summary = "Lấy Experience theo ID")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Experience không tồn tại")
    })
    public ResponseEntity<ApiResponse<ExperienceResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                experienceService.getById(id)));
    }

    @GetMapping({"/destinations/{destinationId}/experiences", "/destinations/{destinationId}/experience"})
    @Operation(summary = "Lấy danh sách Experience theo Destination")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Danh sách Experience, có thể rỗng")
    })
    public ResponseEntity<ApiResponse<List<ExperienceResponse>>> getByDestinationId(
            @PathVariable Long destinationId) {
        return ResponseEntity.ok(ApiResponse.success(
                experienceService.getByDestinationId(destinationId)));
    }

    @GetMapping("/experiences")
    @Operation(summary = "Danh sách Experience (có phân trang)",
            description = "filter theo ?status=PUBLISHED/DRAFT/INACTIVE&destinationId=<id>&page=0&size=20&sort=id,asc. " +
                    "Mặc định ẩn INACTIVE (soft-deleted). Admin truyền ?includeInactive=true để thấy tất cả.")
    public ResponseEntity<ApiResponse<Page<ExperienceResponse>>> list(
            @Parameter(description = "Filter theo status (mặc định ẩn INACTIVE)")
            @RequestParam(required = false) ExperienceStatus status,
            @Parameter(description = "Admin: bao gồm cả INACTIVE")
            @RequestParam(defaultValue = "false") boolean includeInactive,
            @Parameter(description = "Lọc theo điểm đến")
            @RequestParam(required = false) Long destinationId,
            @Parameter(description = "Phân trang — để trống sort nếu không cần")
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                experienceService.list(status, includeInactive, destinationId, pageable)));
    }

    /**
     * Danh sách Experience của user hiện tại (PROVIDER xem của mình).
     * Không nhìn thấy experience của provider khác.
     */
    @GetMapping("/experiences/mine")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasRole('CONTENT_PROVIDER')")
    @Operation(summary = "Danh sách Experience của tôi (CONTENT_PROVIDER) — không thấy của người khác",
            description = "Lọc theo createdBy = current user. Hỗ trợ ?status=&?destinationId=&?includeInactive=true.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Chỉ CONTENT_PROVIDER")
    })
    public ResponseEntity<ApiResponse<Page<ExperienceResponse>>> listMine(
            @Parameter(description = "Filter theo status (mặc định ẩn INACTIVE)")
            @RequestParam(required = false) ExperienceStatus status,
            @Parameter(description = "Bao gồm cả INACTIVE")
            @RequestParam(defaultValue = "false") boolean includeInactive,
            @Parameter(description = "Lọc theo điểm đến")
            @RequestParam(required = false) Long destinationId,
            @PageableDefault(size = 20) Pageable pageable) {
        Long currentUserId = AuthorizationGuard.currentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                experienceService.listByOwner(currentUserId, status, includeInactive, destinationId, pageable)));
    }

    @PostMapping("/experiences")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasRole('CONTENT_PROVIDER')")
    @Operation(summary = "Tạo Experience mới (CONTENT_PROVIDER) — status = DRAFT")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Chỉ CONTENT_PROVIDER")
    })
    public ResponseEntity<ApiResponse<ExperienceResponse>> create(
            @Valid @RequestBody CreateExperienceRequest request) {
        Long creatorId = AuthorizationGuard.currentUserId();
        ExperienceResponse e = experienceService.create(request, creatorId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo Experience thành công", e));
    }

    @PatchMapping("/experiences/{id}")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasRole('CONTENT_PROVIDER') and @experienceSecurityBean.isOwnerOfExperience(#id)")
    @Operation(summary = "Cập nhật Experience (chỉ DRAFT — BR-EXP-2, chỉ owner)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "BR-EXP-2: chỉ update khi DRAFT"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Không phải owner"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<ExperienceResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateExperienceRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                experienceService.update(id, request)));
    }

    @DeleteMapping("/experiences/{id}")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasRole('CONTENT_PROVIDER') and @experienceSecurityBean.isOwnerOfExperience(#id)")
    @Operation(summary = "Xóa mềm Experience (DRAFT/PUBLISHED → INACTIVE, chỉ owner)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Không phải owner"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        experienceService.softDelete(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa Experience thành công"));
    }

    @PatchMapping("/experiences/{id}/status")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasRole('CONTENT_PROVIDER') and @experienceSecurityBean.isOwnerOfExperience(#id)")
    @Operation(summary = "Đổi trạng thái Experience (DRAFT ↔ PUBLISHED, chỉ owner)",
            description = "Không thể đổi INACTIVE; dùng DELETE để xoá mềm. Idempotent: trùng status hiện tại thì trả về object hiện tại.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
                    description = "BR-EXP-3: status mới không hợp lệ hoặc Experience đã INACTIVE"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Không phải owner"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<ExperienceResponse>> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody ChangeExperienceStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Đổi trạng thái thành công",
                experienceService.changeStatus(id, request)));
    }
}
