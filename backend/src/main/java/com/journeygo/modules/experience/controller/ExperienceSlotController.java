package com.journeygo.modules.experience.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.experience.dto.request.CreateExperienceSlotRequest;
import com.journeygo.modules.experience.dto.request.UpdateExperienceSlotRequest;
import com.journeygo.modules.experience.dto.response.ExperienceSlotResponse;
import com.journeygo.modules.experience.service.ExperienceSlotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "ExperienceSlot (Quota theo Tour)", description = "Phân bổ quota (đếm theo TOUR) cho Experience theo ngày. " +
        "Vì Experience 1-1 Destination, slot này ngầm định quản lý cả quota cho destination tương ứng.")
public class ExperienceSlotController {

    private final ExperienceSlotService slotService;

@GetMapping("/experiences/{experienceId}/slots")
    @Operation(summary = "Danh sách slot theo Experience",
            description = "?date=2026-10-15 (YYYY-MM-DD) để filter theo ngày cụ thể. Cần auth.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401")
    })
    public ResponseEntity<ApiResponse<List<ExperienceSlotResponse>>> list(
            @PathVariable Long experienceId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(slotService.listByExperience(experienceId, date)));
    }

    @GetMapping("/slots/{id}")
    @Operation(summary = "Lấy Slot theo ID")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<ExperienceSlotResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(slotService.getById(id)));
    }

    @PostMapping("/experiences/{experienceId}/slots")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasRole('CONTENT_PROVIDER') and @experienceSecurityBean.isOwnerOfExperience(#experienceId)")
    @Operation(summary = "Tạo / cập nhật quota theo ngày (Upsert, chỉ owner — KHÔNG yêu cầu Experience DRAFT)",
    description = "Upsert theo (experienceId, slotDate). Owner được tạo quota ngay cả khi Experience đã PUBLISHED.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Không phải owner")
    })
    public ResponseEntity<ApiResponse<ExperienceSlotResponse>> create(
            @PathVariable Long experienceId,
            @Valid @RequestBody CreateExperienceSlotRequest request) {
        ExperienceSlotResponse s = slotService.create(experienceId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo Slot thành công", s));
    }

    @PatchMapping("/slots/{id}")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasRole('CONTENT_PROVIDER') and @experienceSecurityBean.isOwnerOfSlot(#id)")
    @Operation(summary = "Cập nhật quota / status slot (chỉ owner — KHÔNG yêu cầu Experience DRAFT)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Không phải owner"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<ExperienceSlotResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateExperienceSlotRequest request) {
        return ResponseEntity.ok(ApiResponse.success(slotService.update(id, request)));
    }

    @DeleteMapping("/slots/{id}")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasRole('CONTENT_PROVIDER') and @experienceSecurityBean.isOwnerOfSlot(#id)")
    @Operation(summary = "Xóa Slot (chỉ owner)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Không phải owner"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        slotService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa Slot thành công"));
    }
}
