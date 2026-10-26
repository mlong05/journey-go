package com.journeygo.modules.tour.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.tour.dto.TourRejectRequest;
import com.journeygo.modules.tour.dto.TourRequest;
import com.journeygo.modules.tour.dto.TourResponse;
import com.journeygo.modules.tour.entity.TourStatus;
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

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy tour theo trạng thái (ADMIN / MODERATOR)",
            description = "Lọc theo DRAFT, PENDING, PUBLISHED, REJECTED")
    public ResponseEntity<ApiResponse<PageResponse<TourResponse>>> getByStatus(
            @PathVariable TourStatus status,
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tour theo trạng thái thành công",
                tourService.getByStatus(status, pageable)));
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

    @PatchMapping("/{tourId}/publish")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xuất bản tour (ADMIN / MODERATOR)",
            description = "Phê duyệt và chuyển trạng thái sang PUBLISHED")
    public ResponseEntity<ApiResponse<TourResponse>> publish(@PathVariable Long tourId) {
        return ResponseEntity.ok(ApiResponse.success("Xuất bản tour thành công",
                tourService.publish(tourId)));
    }

    @PatchMapping("/{tourId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Từ chối tour (ADMIN / MODERATOR)",
            description = "Từ chối và chuyển trạng thái sang REJECTED. Bắt buộc nhập lý do từ chối.")
    public ResponseEntity<ApiResponse<TourResponse>> reject(
            @PathVariable Long tourId,
            @Valid @RequestBody TourRejectRequest rejectRequest) {
        return ResponseEntity.ok(ApiResponse.success("Từ chối tour thành công",
                tourService.reject(tourId, rejectRequest.reason())));
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
            description = "Tour mới mặc định ở trạng thái DRAFT, chưa được phê duyệt. "
                    + "Giá tour KHÔNG nhập tay mà được tính tự động = tổng giá các Experience "
                    + "của các điểm đến trong hành trình.")
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
            description = "PROVIDER chỉ được cập nhật tour của chính mình. Chỉnh sửa sẽ reset trạng thái về DRAFT. "
                    + "Giá tour được tính lại tự động từ các Experience của các điểm đến.")
    public ResponseEntity<ApiResponse<TourResponse>> update(
            @PathVariable Long tourId,
            @Valid @RequestBody TourRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tour thành công",
                tourService.update(tourId, request, userPrincipal.getId(), callerRole)));
    }

    @PatchMapping("/{tourId}/submit")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Gửi duyệt tour (ADMIN / MODERATOR / PROVIDER)",
            description = "Chuyển trạng thái sang PENDING để chờ admin phê duyệt")
    public ResponseEntity<ApiResponse<TourResponse>> submit(
            @PathVariable Long tourId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        return ResponseEntity.ok(ApiResponse.success("Gửi duyệt tour thành công",
                tourService.submit(tourId, userPrincipal.getId(), callerRole)));
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
