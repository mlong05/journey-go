package com.journeygo.modules.tour.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.tour.dto.TourRequest;
import com.journeygo.modules.tour.dto.TourResponse;
import com.journeygo.modules.tour.service.TourService;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
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
@RequestMapping("/api/v1/tours")
@RequiredArgsConstructor
@Tag(name = "Tour du lịch (Tours)", description = "Quản lý tour du lịch với quy trình duyệt CP/CM")
public class TourController {

    private final TourService tourService;

    // ── Public endpoints ──────────────────────────────────────────────────────

    @GetMapping("/published")
    @Operation(summary = "Lấy danh sách tour đã xuất bản (công khai)",
            description = "Trả về danh sách tour đã được phê duyệt và xuất bản, hỗ trợ phân trang")
    public ResponseEntity<ApiResponse<PageResponse<TourResponse>>> getPublished(
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tour đã xuất bản thành công",
                tourService.getPublished(pageable)));
    }

    @GetMapping("/{tourId}")
    @Operation(summary = "Lấy thông tin tour theo ID")
    public ResponseEntity<ApiResponse<TourResponse>> getById(@PathVariable Long tourId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin tour thành công",
                tourService.getById(tourId)));
    }

    // ── ADMIN / MODERATOR ─────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy tất cả tour (ADMIN / MODERATOR)",
            description = "Bao gồm các tour chưa xuất bản, hỗ trợ phân trang và sắp xếp")
    public ResponseEntity<ApiResponse<PageResponse<TourResponse>>> getAll(
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tour thành công",
                tourService.getAll(pageable)));
    }

    @GetMapping("/deleted")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy tour đã xóa mềm (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<PageResponse<TourResponse>>> getDeleted(
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tour đã xóa thành công",
                tourService.getDeleted(pageable)));
    }

    @DeleteMapping("/{tourId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xóa mềm tour (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long tourId) {
        tourService.delete(tourId);
        return ResponseEntity.ok(ApiResponse.success("Xóa tour thành công"));
    }

    @PatchMapping("/{tourId}/restore")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Khôi phục tour đã xóa (ADMIN / MODERATOR)")
    public ResponseEntity<ApiResponse<TourResponse>> restore(@PathVariable Long tourId) {
        return ResponseEntity.ok(ApiResponse.success("Khôi phục tour thành công",
                tourService.restore(tourId)));
    }

    // ── ADMIN / MODERATOR / PROVIDER ─────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo tour mới (ADMIN / MODERATOR / PROVIDER)",
            description = "Tạo tour và tự gửi vào hàng chờ moderation. Request cần có price (VND), "
                    + "startDate và endDate theo định dạng yyyy-MM-dd.")
    public ResponseEntity<ApiResponse<TourResponse>> create(
            @Valid @RequestBody TourRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo tour thành công",
                        tourService.create(request, userPrincipal.getId())));
    }

    @PutMapping("/{tourId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Cập nhật tour (ADMIN / MODERATOR / PROVIDER)",
            description = "PROVIDER chỉ được cập nhật tour của chính mình. Chỉnh sửa sẽ tự gửi duyệt lại. "
                    + "Request cần có price (VND), startDate và endDate theo định dạng yyyy-MM-dd.")
    public ResponseEntity<ApiResponse<TourResponse>> update(
            @PathVariable Long tourId,
            @Valid @RequestBody TourRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tour thành công",
                tourService.update(tourId, request, userPrincipal.getId(), callerRole)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy tour của tôi (PROVIDER / ADMIN / MODERATOR)",
            description = "Trả về danh sách tour do người dùng hiện tại tạo")
    public ResponseEntity<ApiResponse<PageResponse<TourResponse>>> getMine(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tour của tôi thành công",
                tourService.getByCreator(userPrincipal.getId(), pageable)));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private Role extractRole(UserPrincipal userPrincipal) {
        return Role.valueOf(
                userPrincipal.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "")
        );
    }
}
