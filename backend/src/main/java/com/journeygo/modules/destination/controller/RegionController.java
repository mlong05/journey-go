package com.journeygo.modules.destination.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.destination.dto.RegionRequest;
import com.journeygo.modules.destination.dto.RegionResponse;
import com.journeygo.modules.destination.service.RegionService;
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
@RequestMapping("/api/v1/regions")
@RequiredArgsConstructor
@Tag(name = "Khu vực (Regions)", description = "Quản lý khu vực / vùng địa lý du lịch")
public class RegionController {

    private final RegionService regionService;

    @GetMapping
    @Operation(summary = "Lấy tất cả khu vực")
    public ResponseEntity<ApiResponse<List<RegionResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách khu vực thành công", regionService.getAll()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết khu vực theo ID")
    public ResponseEntity<ApiResponse<RegionResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin khu vực thành công", regionService.getById(id)));
    }

    @GetMapping("/slug/{slug}")
    @Operation(summary = "Lấy chi tiết khu vực theo slug")
    public ResponseEntity<ApiResponse<RegionResponse>> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin khu vực thành công", regionService.getBySlug(slug)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo khu vực mới (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<RegionResponse>> create(@Valid @RequestBody RegionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo khu vực thành công", regionService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Cập nhật khu vực (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<RegionResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody RegionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật khu vực thành công", regionService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xóa mềm khu vực (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        regionService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa mềm khu vực thành công"));
    }

    @PatchMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Khôi phục khu vực đã xóa mềm (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<RegionResponse>> restore(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Khôi phục khu vực thành công", regionService.restore(id)));
    }

    @GetMapping("/deleted")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy danh sách khu vực đã xóa mềm (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<List<RegionResponse>>> getDeleted() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách khu vực đã xóa thành công", regionService.getDeleted()));
    }
}
