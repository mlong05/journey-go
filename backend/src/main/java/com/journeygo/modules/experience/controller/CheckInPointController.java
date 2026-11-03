package com.journeygo.modules.experience.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.experience.dto.request.CreateCheckInPointRequest;
import com.journeygo.modules.experience.dto.request.UpdateCheckInPointRequest;
import com.journeygo.modules.experience.dto.response.CheckInPointResponse;
import com.journeygo.modules.experience.service.CheckInPointService;
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
@Tag(name = "CheckInPoint", description = "Quản lý CheckInPoint vi mô trong Experience")
public class CheckInPointController {

    private final CheckInPointService checkInPointService;

    @GetMapping("/check-in-points/{id}")
    @Operation(summary = "Lấy CheckInPoint theo ID")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<CheckInPointResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(checkInPointService.getById(id)));
    }

    @GetMapping("/experiences/{experienceId}/check-in-points")
    @Operation(summary = "Danh sách CheckInPoint theo Experience")
    @ApiResponses(@io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"))
    public ResponseEntity<ApiResponse<List<CheckInPointResponse>>> listByExperience(
            @PathVariable Long experienceId) {
        return ResponseEntity.ok(ApiResponse.success(
                checkInPointService.listByExperience(experienceId)));
    }

    @PostMapping("/experiences/{experienceId}/check-in-points")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfExperience(#experienceId)")
    @Operation(summary = "Tạo CheckInPoint (chỉ khi Experience DRAFT, chỉ owner) — BR-CIP-1: qr_token UNIQUE")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
                    description = "BR-CIP-1: qr_token đã tồn tại hoặc Experience không DRAFT"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403")
    })
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
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
                    description = "Experience không DRAFT hoặc qr_token trùng"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403")
    })
    public ResponseEntity<ApiResponse<CheckInPointResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCheckInPointRequest request) {
        return ResponseEntity.ok(ApiResponse.success(checkInPointService.update(id, request)));
    }

    @PostMapping("/check-in-points/{id}/qr/regenerate")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfCheckInPoint(#id)")
    @Operation(summary = "Tạo lại mã QR của trạm check-in (chỉ owner)",
            description = "Dùng khi mã cũ bị lộ. Được phép cả khi Experience đã PUBLISHED vì chỉ đổi mã. "
                    + "Mã cũ hết hiệu lực ngay, cần in lại QR.")
    public ResponseEntity<ApiResponse<CheckInPointResponse>> regenerateQr(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Đã tạo mã QR mới cho trạm",
                checkInPointService.regenerateQr(id)));
    }

    @DeleteMapping("/check-in-points/{id}")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfCheckInPoint(#id)")
    @Operation(summary = "Xóa CheckInPoint (chỉ khi Experience DRAFT, chỉ owner)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404")
    })
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        checkInPointService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa CheckInPoint thành công"));
    }
}
