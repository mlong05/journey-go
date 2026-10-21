package com.journeygo.modules.content.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.content.dto.CulturalContentRequest;
import com.journeygo.modules.content.dto.CulturalContentResponse;
import com.journeygo.modules.content.service.CulturalContentService;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Nội dung văn hóa (Cultural Contents)", description = "Quản lý nội dung văn hóa, câu chuyện, thuyết minh đa phương tiện")
public class CulturalContentController {

    private final CulturalContentService culturalContentService;

    // ── Public endpoints ──────────────────────────────────────────────────────

    @GetMapping("/api/v1/destinations/{destinationId}/contents")
    @Operation(summary = "Lấy danh sách nội dung văn hóa của điểm đến",
            description = "Trả về danh sách nội dung được sắp xếp theo thứ tự (sequenceOrder)")
    public ResponseEntity<ApiResponse<List<CulturalContentResponse>>> getByDestination(@PathVariable Long destinationId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách nội dung văn hóa thành công",
                culturalContentService.getByDestinationId(destinationId)));
    }

    @GetMapping("/api/v1/cultural-contents/{id}")
    @Operation(summary = "Lấy chi tiết một nội dung văn hóa theo ID")
    public ResponseEntity<ApiResponse<CulturalContentResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin nội dung văn hóa thành công",
                culturalContentService.getById(id)));
    }

    @GetMapping("/api/v1/cultural-contents/{id}/play")
    @Operation(summary = "Phát / xem nội dung (play)",
            description = "Tăng lượt phát (playCount) và trả về thông tin đa phương tiện để phát trực tiếp")
    public ResponseEntity<ApiResponse<CulturalContentResponse>> play(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Phát nội dung văn hóa thành công",
                culturalContentService.play(id)));
    }

    // ── Protected endpoints (Admin / Moderator / Provider) ────────────────────

    @PostMapping("/api/v1/destinations/{destinationId}/contents")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo nội dung văn hóa mới cho điểm đến",
            description = "PROVIDER chỉ được thêm nội dung vào điểm đến của chính mình")
    public ResponseEntity<ApiResponse<CulturalContentResponse>> create(
            @PathVariable Long destinationId,
            @Valid @RequestBody CulturalContentRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo nội dung văn hóa thành công",
                        culturalContentService.create(destinationId, request, userPrincipal.getId(), callerRole)));
    }

    @PutMapping("/api/v1/cultural-contents/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Cập nhật nội dung văn hóa",
            description = "PROVIDER chỉ được sửa nội dung thuộc điểm đến của mình")
    public ResponseEntity<ApiResponse<CulturalContentResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody CulturalContentRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật nội dung văn hóa thành công",
                culturalContentService.update(id, request, userPrincipal.getId(), callerRole)));
    }

    @DeleteMapping("/api/v1/cultural-contents/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xóa mềm nội dung văn hóa",
            description = "PROVIDER chỉ được xóa nội dung thuộc điểm đến của mình")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        culturalContentService.delete(id, userPrincipal.getId(), callerRole);
        return ResponseEntity.ok(ApiResponse.success("Xóa mềm nội dung văn hóa thành công"));
    }

    @PatchMapping("/api/v1/cultural-contents/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Khôi phục nội dung văn hóa đã xóa mềm",
            description = "Khôi phục nội dung văn hóa bị xóa mềm")
    public ResponseEntity<ApiResponse<CulturalContentResponse>> restore(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        return ResponseEntity.ok(ApiResponse.success("Khôi phục nội dung văn hóa thành công",
                culturalContentService.restore(id, userPrincipal.getId(), callerRole)));
    }

    @GetMapping("/api/v1/destinations/{destinationId}/contents/deleted")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy danh sách nội dung văn hóa đã bị xóa mềm",
            description = "Trả về danh sách nội dung văn hóa đã bị xóa mềm của điểm đến")
    public ResponseEntity<ApiResponse<List<CulturalContentResponse>>> getDeleted(
            @PathVariable Long destinationId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách nội dung văn hóa đã xóa thành công",
                culturalContentService.getDeletedByDestinationId(destinationId, userPrincipal.getId(), callerRole)));
    }

    private Role extractRole(UserPrincipal userPrincipal) {
        return Role.valueOf(
                userPrincipal.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "")
        );
    }
}
