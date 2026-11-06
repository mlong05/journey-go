package com.journeygo.modules.destination.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.destination.dto.ThemeRequest;
import com.journeygo.modules.destination.dto.ThemeResponse;
import com.journeygo.modules.destination.service.ThemeService;
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
@RequestMapping("/api/v1/themes")
@RequiredArgsConstructor
@Tag(name = "Chủ đề du lịch (Themes)", description = "Quản lý chủ đề du lịch (Di sản, Ẩm thực, Khám phá...)")
public class ThemeController {

    private final ThemeService themeService;

    @GetMapping
    @Operation(summary = "Lấy tất cả chủ đề")
    public ResponseEntity<ApiResponse<List<ThemeResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách chủ đề thành công", themeService.getAll()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết chủ đề theo ID")
    public ResponseEntity<ApiResponse<ThemeResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin chủ đề thành công", themeService.getById(id)));
    }

    @GetMapping("/slug/{slug}")
    @Operation(summary = "Lấy chi tiết chủ đề theo slug")
    public ResponseEntity<ApiResponse<ThemeResponse>> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin chủ đề thành công", themeService.getBySlug(slug)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo chủ đề mới (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<ThemeResponse>> create(@Valid @RequestBody ThemeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo chủ đề thành công", themeService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Cập nhật chủ đề (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<ThemeResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody ThemeRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật chủ đề thành công", themeService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xóa mềm chủ đề (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        themeService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa mềm chủ đề thành công"));
    }

    @PatchMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Khôi phục chủ đề đã xóa mềm (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<ThemeResponse>> restore(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Khôi phục chủ đề thành công", themeService.restore(id)));
    }

    @GetMapping("/deleted")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy danh sách chủ đề đã xóa mềm (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<List<ThemeResponse>>> getDeleted() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách chủ đề đã xóa thành công", themeService.getDeleted()));
    }
}
