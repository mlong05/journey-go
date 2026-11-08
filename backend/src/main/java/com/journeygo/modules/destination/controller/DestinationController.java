package com.journeygo.modules.destination.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.destination.dto.DestinationQrResponse;
import com.journeygo.modules.destination.dto.DestinationRequest;
import com.journeygo.modules.destination.dto.DestinationResponse;
import com.journeygo.modules.destination.service.DestinationService;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/destinations")
@RequiredArgsConstructor
@Tag(name = "Điểm đến (Destinations)", description = "Quản lý điểm đến du lịch với phân trang và sắp xếp")
public class DestinationController {

    private final DestinationService destinationService;

    // ── Public endpoints ──────────────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "Lấy điểm đến đã duyệt (phân trang & sắp xếp)",
            description = "Chỉ trả về điểm đến đã được moderation duyệt; hỗ trợ page, size và sort")
    public ResponseEntity<ApiResponse<PageResponse<DestinationResponse>>> getAll(
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách điểm đến thành công",
                destinationService.getAll(pageable)));
    }

    @GetMapping("/region/{slug}")
    @Operation(summary = "Lấy điểm đến theo khu vực (phân trang & sắp xếp)",
            description = "Trả về danh sách điểm đến thuộc khu vực (theo slug)")
    public ResponseEntity<ApiResponse<PageResponse<DestinationResponse>>> getByRegion(
            @PathVariable String slug,
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách điểm đến theo khu vực thành công",
                destinationService.getByRegion(slug, pageable)));
    }

    @GetMapping("/theme/{slug}")
    @Operation(summary = "Lấy điểm đến theo chủ đề (phân trang & sắp xếp)",
            description = "Trả về danh sách điểm đến gắn chủ đề du lịch (theo slug)")
    public ResponseEntity<ApiResponse<PageResponse<DestinationResponse>>> getByTheme(
            @PathVariable String slug,
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách điểm đến theo chủ đề thành công",
                destinationService.getByTheme(slug, pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy điểm đến theo ID", description = "Trả về thông tin chi tiết một điểm đến")
    public ResponseEntity<ApiResponse<DestinationResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin điểm đến thành công", destinationService.getById(id)));
    }

    // ── CONTENT_MODERATOR only ────────────────────────────────────────────────

    @Operation(summary = "Lấy điểm đến đã xóa (phân trang & sắp xếp)",
            description = "Trả về danh sách điểm đến đã bị xóa mềm (CONTENT_MODERATOR)")
    @GetMapping("/deleted")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    public ResponseEntity<ApiResponse<PageResponse<DestinationResponse>>> getDeleted(
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách điểm đến đã xóa thành công",
                destinationService.getDeleted(pageable)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xóa điểm đến", description = "Xóa mềm điểm đến (CONTENT_MODERATOR)")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        destinationService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa điểm đến thành công"));
    }

    @PatchMapping("/{id}/restore")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Khôi phục điểm đến", description = "Khôi phục điểm đến đã bị xóa mềm (CONTENT_MODERATOR)")
    public ResponseEntity<ApiResponse<DestinationResponse>> restore(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Khôi phục điểm đến thành công", destinationService.restore(id)));
    }

    // ── CONTENT_MODERATOR / CONTENT_PROVIDER ─────────────────────────────────

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy điểm đến của tôi",
            description = "Trả về mọi điểm đến (kể cả DRAFT/PENDING/REJECTED) do người dùng hiện tại tạo")
    public ResponseEntity<ApiResponse<PageResponse<DestinationResponse>>> getMine(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách điểm đến của tôi thành công",
                destinationService.getByCreator(userPrincipal.getId(), pageable)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo điểm đến mới", description = "Tạo điểm đến mới, mặc định trạng thái DRAFT (CONTENT_MODERATOR / CONTENT_PROVIDER)")
    public ResponseEntity<ApiResponse<DestinationResponse>> create(
            @Valid @RequestBody DestinationRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo điểm đến thành công", destinationService.create(request, userPrincipal.getId())));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Cập nhật điểm đến", description = "Cập nhật điểm đến; CONTENT_PROVIDER chỉ được sửa điểm đến của chính mình")
    public ResponseEntity<ApiResponse<DestinationResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody DestinationRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật điểm đến thành công",
                destinationService.update(id, request, userPrincipal.getId(), callerRole)));
    }

    @GetMapping("/{id}/qr")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy mã QR check-in của điểm đến",
            description = "Mã dùng để in QR dán tại cổng; du khách quét để check-in thay GPS. "
                    + "CONTENT_PROVIDER chỉ xem được điểm đến của chính mình. Mã không xuất hiện ở API công khai.")
    public ResponseEntity<ApiResponse<DestinationQrResponse>> getQr(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy mã QR điểm đến thành công",
                destinationService.getQr(id, userPrincipal.getId(), extractRole(userPrincipal))));
    }

    @PostMapping("/{id}/qr/regenerate")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo lại mã QR check-in của điểm đến",
            description = "Dùng khi mã cũ bị lộ. Mã cũ hết hiệu lực ngay, cần in lại QR.")
    public ResponseEntity<ApiResponse<DestinationQrResponse>> regenerateQr(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.success("Đã tạo mã QR mới cho điểm đến",
                destinationService.regenerateQr(id, userPrincipal.getId(), extractRole(userPrincipal))));
    }

    private Role extractRole(UserPrincipal userPrincipal) {
        return Role.valueOf(
                userPrincipal.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "")
        );
    }
}
