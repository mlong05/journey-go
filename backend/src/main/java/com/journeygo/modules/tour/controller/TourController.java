package com.journeygo.modules.tour.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.tour.dto.TourRequest;
import com.journeygo.modules.tour.dto.TourPublicDetailResponse;
import com.journeygo.modules.tour.dto.TourResponse;
import com.journeygo.modules.tour.dto.TourSearchFilter;
import com.journeygo.modules.tour.dto.TourSlotAvailabilityResponse;
import com.journeygo.modules.tour.entity.TourFormat;
import com.journeygo.modules.tour.service.TourAvailabilityService;
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
    private final TourAvailabilityService tourAvailabilityService;

    // ── Public endpoints ──────────────────────────────────────────────────────

    @GetMapping("/published")
    @Operation(summary = "Lấy danh sách tour đã xuất bản (công khai)",
            description = "Trả về danh sách tour đã được phê duyệt và xuất bản, hỗ trợ phân trang. "
                    + "Lọc tùy chọn: q (tên / vùng miền / chủ đề, không phân biệt dấu), regionId, themeId, "
                    + "format (DAY_TRIP, MULTI_DAY); order: NEWEST (mặc định), PRICE_ASC, PRICE_DESC, DEPARTURE")
    public ResponseEntity<ApiResponse<PageResponse<TourResponse>>> getPublished(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false) Long themeId,
            @RequestParam(required = false) TourFormat format,
            @RequestParam(required = false) TourSearchFilter.Order order,
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        TourSearchFilter filter = new TourSearchFilter(q, regionId, themeId, format, order);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tour đã xuất bản thành công",
                tourService.searchPublished(filter, pageable)));
    }

    @GetMapping("/{tourId}/public-detail")
    @Operation(summary = "Chi tiết tour cho du khách (công khai)",
            description = "Mô tả, điểm nổi bật, ảnh, lịch trình, bảng giá, chính sách và các điểm dừng. "
                    + "Không trả đáp án quiz, mã QR hay ghi chú kiểm duyệt. Chỉ tour đã duyệt.")
    public ResponseEntity<ApiResponse<TourPublicDetailResponse>> getPublicDetail(@PathVariable Long tourId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết tour thành công",
                tourService.getPublicDetail(tourId)));
    }

    @GetMapping("/{tourId}/availability")
    @Operation(summary = "Số chỗ còn theo ngày trải nghiệm (công khai)",
            description = "Trả về danh sách ngày kèm số chỗ còn = capacity - bookedCount. "
                    + "Màn 'Đặt tour' dùng endpoint này để hiển thị 'Số chỗ còn — Còn N chỗ' "
                    + "và chặn khách chọn vượt sức chứa thực tế. "
                    + "Chỉ tính ngày từ hôm nay trở đi.")
    public ResponseEntity<ApiResponse<TourSlotAvailabilityResponse>> getAvailability(@PathVariable Long tourId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy số chỗ còn thành công",
                tourAvailabilityService.getAvailability(tourId)));
    }

    @GetMapping("/{tourId}")
    @Operation(summary = "Lấy thông tin tour theo ID")
    public ResponseEntity<ApiResponse<TourResponse>> getById(@PathVariable Long tourId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin tour thành công",
                tourService.getById(tourId)));
    }

    // ── CONTENT_MODERATOR ─────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy tất cả tour (CONTENT_MODERATOR)",
            description = "Gồm tour chờ duyệt, bị từ chối, đã xuất bản… (không gồm bản nháp), hỗ trợ phân trang và sắp xếp. "
                    + "ADMIN không quản lý tour — việc này thuộc Kiểm duyệt viên.")
    public ResponseEntity<ApiResponse<PageResponse<TourResponse>>> getAll(
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tour thành công",
                tourService.getAll(pageable)));
    }

    @GetMapping("/deleted")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy tour đã xóa mềm (CONTENT_MODERATOR)")
    public ResponseEntity<ApiResponse<PageResponse<TourResponse>>> getDeleted(
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tour đã xóa thành công",
                tourService.getDeleted(pageable)));
    }

    @DeleteMapping("/{tourId}")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xóa mềm tour (CONTENT_MODERATOR)")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long tourId) {
        tourService.delete(tourId);
        return ResponseEntity.ok(ApiResponse.success("Xóa tour thành công"));
    }

    @PatchMapping("/{tourId}/restore")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Khôi phục tour đã xóa (CONTENT_MODERATOR)")
    public ResponseEntity<ApiResponse<TourResponse>> restore(@PathVariable Long tourId) {
        return ResponseEntity.ok(ApiResponse.success("Khôi phục tour thành công",
                tourService.restore(tourId)));
    }

    // ── CONTENT_MODERATOR / CONTENT_PROVIDER ─────────────────────────────────

    @PostMapping
    @PreAuthorize("hasRole('CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo tour mới (CONTENT_PROVIDER)",
            description = "Tạo tour và tự gửi vào hàng chờ moderation. Giá tour được tính tự động từ các Experience; "
                    + "startDate và endDate (yyyy-MM-dd) là tùy chọn.")
    public ResponseEntity<ApiResponse<TourResponse>> create(
            @Valid @RequestBody TourRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo tour thành công",
                        tourService.create(request, userPrincipal.getId())));
    }

    @PutMapping("/{tourId}")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Cập nhật tour (CONTENT_MODERATOR / CONTENT_PROVIDER)",
            description = "PROVIDER chỉ được cập nhật tour của chính mình. Chỉnh sửa sẽ tự gửi duyệt lại. "
                    + "Giá tour được tính tự động; startDate và endDate (yyyy-MM-dd) là tùy chọn.")
    public ResponseEntity<ApiResponse<TourResponse>> update(
            @PathVariable Long tourId,
            @Valid @RequestBody TourRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tour thành công",
                tourService.update(tourId, request, userPrincipal.getId(), callerRole)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy tour của tôi (CONTENT_PROVIDER / CONTENT_MODERATOR)",
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
