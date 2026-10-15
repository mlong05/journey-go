package com.journeygo.modules.destination.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.destination.dto.DestinationRequest;
import com.journeygo.modules.destination.dto.DestinationResponse;
import com.journeygo.modules.destination.service.DestinationService;
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
@RequestMapping("/api/v1/destinations")
@RequiredArgsConstructor
@Tag(name = "Điểm đến (Destinations)", description = "Quản lý điểm đến du lịch")
public class DestinationController {

    private final DestinationService destinationService;

    // ── Public endpoints ──────────────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "Lấy tất cả điểm đến", description = "Trả về danh sách tất cả điểm đến chưa bị xóa")
    public ResponseEntity<ApiResponse<List<DestinationResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách điểm đến thành công", destinationService.getAll()));
    }

    @GetMapping("/approved")
    @Operation(summary = "Lấy điểm đến đã duyệt", description = "Trả về danh sách điểm đến đã được phê duyệt")
    public ResponseEntity<ApiResponse<List<DestinationResponse>>> getApproved() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách điểm đến đã duyệt thành công", destinationService.getApproved()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy điểm đến theo ID", description = "Trả về thông tin chi tiết một điểm đến")
    public ResponseEntity<ApiResponse<DestinationResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin điểm đến thành công", destinationService.getById(id)));
    }

    // ── ADMIN / MODERATOR only ────────────────────────────────────────────────

    @GetMapping("/deleted")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy điểm đến đã xóa", description = "Trả về danh sách điểm đến đã bị xóa mềm (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<List<DestinationResponse>>> getDeleted() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách điểm đến đã xóa thành công", destinationService.getDeleted()));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Phê duyệt điểm đến", description = "Phê duyệt hoặc hủy phê duyệt điểm đến (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<DestinationResponse>> setApproval(
            @PathVariable Long id,
            @RequestParam boolean approved) {
        String message = approved ? "Phê duyệt điểm đến thành công" : "Hủy phê duyệt điểm đến thành công";
        return ResponseEntity.ok(ApiResponse.success(message, destinationService.setApproval(id, approved)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xóa điểm đến", description = "Xóa mềm điểm đến (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        destinationService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa điểm đến thành công"));
    }

    @PatchMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Khôi phục điểm đến", description = "Khôi phục điểm đến đã bị xóa mềm (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<DestinationResponse>> restore(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Khôi phục điểm đến thành công", destinationService.restore(id)));
    }

    // ── ADMIN / MODERATOR / PROVIDER ─────────────────────────────────────────

  
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Cập nhật điểm đến", description = "Cập nhật điểm đến; PROVIDER chỉ được sửa điểm đến của chính mình")
    public ResponseEntity<ApiResponse<DestinationResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody DestinationRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = Role.valueOf(
                userPrincipal.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "")
        );
        return ResponseEntity.ok(ApiResponse.success("Cập nhật điểm đến thành công",
                destinationService.update(id, request, userPrincipal.getId(), callerRole)));
    }
}
  @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo điểm đến mới", description = "Tạo điểm đến mới, mặc định chưa được phê duyệt (ADMIN / MODERATOR / PROVIDER)")
    public ResponseEntity<ApiResponse<DestinationResponse>> create(
            @Valid @RequestBody DestinationRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo điểm đến thành công", destinationService.create(request, userPrincipal.getId())));
    }
