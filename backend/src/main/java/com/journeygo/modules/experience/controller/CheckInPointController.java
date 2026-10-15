package com.journeygo.modules.experience.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.experience.dto.request.CreateCheckInPointRequest;
import com.journeygo.modules.experience.dto.request.UpdateCheckInPointRequest;
import com.journeygo.modules.experience.dto.response.CheckInPointResponse;
import com.journeygo.modules.experience.service.CheckInPointService;
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
@Tag(name = "CheckInPoint", description = "Quản lý CheckInPoint vi mô trong Experience")
public class CheckInPointController {

    private final CheckInPointService checkInPointService;

    @GetMapping("/check-in-points/{id}")
    @Operation(summary = "Lấy CheckInPoint theo ID")
    public ResponseEntity<ApiResponse<CheckInPointResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(checkInPointService.getById(id)));
    }

    @GetMapping("/experiences/{experienceId}/check-in-points")
    @Operation(summary = "Danh sách CheckInPoint theo Experience")
    public ResponseEntity<ApiResponse<List<CheckInPointResponse>>> listByExperience(
            @PathVariable Long experienceId) {
        return ResponseEntity.ok(ApiResponse.success(
                checkInPointService.listByExperience(experienceId)));
    }

    @PostMapping("/experiences/{experienceId}/check-in-points")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfExperience(#experienceId)")
    @Operation(summary = "Tạo CheckInPoint (chỉ khi Experience DRAFT, chỉ owner) — BR-CIP-1: qr_token UNIQUE")
    public ResponseEntity<ApiResponse<CheckInPointResponse>> create(
            @PathVariable Long experienceId,
            @Valid @RequestBody CreateCheckInPointRequest request) {
        CheckInPointResponse c = checkInPointService.create(experienceId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo CheckInPoint thành công", c));
    }

    @PatchMapping("/check-in-points/{id}")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfCheckInPoint(#id)")
    @Operation(summary = "Cập nhật CheckInPoint (chỉ khi Experience DRAFT, chỉ owner)")
    public ResponseEntity<ApiResponse<CheckInPointResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCheckInPointRequest request) {
        return ResponseEntity.ok(ApiResponse.success(checkInPointService.update(id, request)));
    }

    @DeleteMapping("/check-in-points/{id}")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfCheckInPoint(#id)")
    @Operation(summary = "Xóa CheckInPoint (chỉ khi Experience DRAFT, chỉ owner)")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        checkInPointService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa CheckInPoint thành công"));
    }
}
