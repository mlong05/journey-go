package com.journeygo.modules.experience.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.security.AuthorizationGuard;
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

/**
 * Controller Experience — CRUD thuần.
 *
 * <p>Authorization dùng {@code @PreAuthorize}:</p>
 * <ul>
 *   <li>Role gate: {@code hasAnyRole('PROVIDER','ADMIN')}</li>
 *   <li>Ownership gate (chỉ trên resource đã có): {@code @experienceSecurityBean.isOwnerOf*(#id)}</li>
 * </ul>
 *
 * <p>Khi fail → Spring ném {@code AccessDeniedException} → {@code GlobalExceptionHandler} → 403.</p>
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Experience", description = "Quản lý Experience (trải nghiệm du lịch) — CRUD thuần")
public class ExperienceController {

    private final ExperienceService experienceService;

    // ── Public / authenticated reads ────────────────────────────────────────

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

    @GetMapping("/destinations/{destinationId}/experience")
    @Operation(summary = "Lấy Experience theo Destination")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Experience không tồn tại cho destination này")
    })
    public ResponseEntity<ApiResponse<ExperienceResponse>> getByDestinationId(
            @PathVariable Long destinationId) {
        return ResponseEntity.ok(ApiResponse.success(
                experienceService.getByDestinationId(destinationId)));
    }

    @GetMapping("/experiences")
    @Operation(summary = "Danh sách Experience (có phân trang)",
            description = "filter theo ?status=PUBLISHED/DRAFT/INACTIVE&page=0&size=20&sort=id,asc. " +
                    "Mặc định ẩn INACTIVE (soft-deleted). Admin truyền ?includeInactive=true để thấy tất cả.")
    public ResponseEntity<ApiResponse<Page<ExperienceResponse>>> list(
            @Parameter(description = "Filter theo status (mặc định ẩn INACTIVE)")
            @RequestParam(required = false) ExperienceStatus status,
            @Parameter(description = "Admin: bao gồm cả INACTIVE")
            @RequestParam(defaultValue = "false") boolean includeInactive,
            @Parameter(description = "Phân trang — để trống sort nếu không cần")
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                experienceService.list(status, includeInactive, pageable)));
    }

    // ── CP: tạo / sửa / xóa ────────────────────────────────────────────────

    @PostMapping("/experiences")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN')")
    @Operation(summary = "Tạo Experience mới (PROVIDER/ADMIN) — status = DRAFT")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "BR-EXP-1: Destination đã có Experience"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Chỉ PROVIDER/ADMIN")
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
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfExperience(#id)")
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
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfExperience(#id)")
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
}
