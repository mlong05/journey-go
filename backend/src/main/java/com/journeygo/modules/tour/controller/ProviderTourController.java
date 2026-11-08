package com.journeygo.modules.tour.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.tour.dto.wizard.TourDetailResponse;
import com.journeygo.modules.tour.dto.wizard.TourSummaryResponse;
import com.journeygo.modules.tour.dto.wizard.TourValidationIssue;
import com.journeygo.modules.tour.dto.wizard.TourWizardRequests;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.service.TourDraftService;
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

import java.util.List;

/**
 * Đối tác tạo tour 5 bước: Thông tin cơ bản → Giá vé → Điểm đến → Lịch khởi hành → Xem lại và gửi duyệt.
 * Mỗi bước có API lưu riêng (phục vụ tự động lưu nháp).
 */
@RestController
@RequestMapping("/api/v1/provider/tours")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CONTENT_PROVIDER')")
@Tag(name = "Đối tác – Tạo tour 5 bước")
@SecurityRequirement(name = "Bearer Authentication")
public class ProviderTourController {

    private final TourDraftService service;

    @PostMapping
    @Operation(summary = "Tạo bản nháp tour mới (DRAFT)", description = "Chỉ đối tác đã được Admin duyệt (BR-01)")
    public ResponseEntity<ApiResponse<TourDetailResponse>> create(
            @Valid @RequestBody TourWizardRequests.CreateDraft request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã tạo bản nháp tour", service.create(request, principal.getId())));
    }

    @GetMapping
    @Operation(summary = "Danh sách tour của tôi (lọc theo trạng thái)")
    public ResponseEntity<ApiResponse<PageResponse<TourSummaryResponse>>> listMine(
            @RequestParam(required = false) TourStatus status,
            @ParameterObject @PageableDefault(size = 10, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tour thành công",
                service.listMine(principal.getId(), status, pageable)));
    }

    @GetMapping("/{tourId}")
    @Operation(summary = "Chi tiết tour (dùng cho màn hình tạo / sửa và trang Xem lại)")
    public ResponseEntity<ApiResponse<TourDetailResponse>> get(@PathVariable Long tourId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết tour thành công",
                service.get(tourId, principal.getId(), Role.of(Role.CONTENT_PROVIDER))));
    }

    @PutMapping("/{tourId}/basic-info")
    @Operation(summary = "Lưu bước 1 – Thông tin cơ bản")
    public ResponseEntity<ApiResponse<TourDetailResponse>> basicInfo(@PathVariable Long tourId,
            @Valid @RequestBody TourWizardRequests.BasicInfo request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã lưu nháp",
                service.updateBasicInfo(tourId, request, principal.getId())));
    }

    @PutMapping("/{tourId}/pricing")
    @Operation(summary = "Lưu bước 2 – Giá vé (sửa được cả khi tour đang bán, không cần duyệt lại)")
    public ResponseEntity<ApiResponse<TourDetailResponse>> pricing(@PathVariable Long tourId,
            @Valid @RequestBody TourWizardRequests.Pricing request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã lưu nháp",
                service.updatePricing(tourId, request, principal.getId())));
    }

    @PutMapping("/{tourId}/stops")
    @Operation(summary = "Lưu bước 3 – Điểm đến (thứ tự trong mảng = thứ tự kéo thả)")
    public ResponseEntity<ApiResponse<TourDetailResponse>> stops(@PathVariable Long tourId,
            @Valid @RequestBody TourWizardRequests.Stops request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã lưu nháp",
                service.updateStops(tourId, request, principal.getId())));
    }

    @PutMapping("/{tourId}/itinerary")
    @Operation(summary = "Lưu bước 4 – Lịch trình")
    public ResponseEntity<ApiResponse<TourDetailResponse>> itinerary(@PathVariable Long tourId,
            @Valid @RequestBody TourWizardRequests.Itinerary request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã lưu nháp",
                service.updateItinerary(tourId, request, principal.getId())));
    }

    @PutMapping("/{tourId}/schedule")
    @Operation(summary = "Lưu bước 5 – Lịch khởi hành (sửa được cả khi tour đang bán)")
    public ResponseEntity<ApiResponse<TourDetailResponse>> schedule(@PathVariable Long tourId,
            @Valid @RequestBody TourWizardRequests.Schedule request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã lưu nháp",
                service.updateSchedule(tourId, request, principal.getId())));
    }

    @PostMapping("/{tourId}/validate")
    @Operation(summary = "Kiểm tra tour trước khi gửi duyệt (không gửi)",
            description = "Trả về danh sách lỗi {step, stopIndex, field, message}; rỗng = đủ điều kiện "
                    + "(trừ ô cam kết, được gửi kèm lúc bấm Gửi duyệt)")
    public ResponseEntity<ApiResponse<List<TourValidationIssue>>> validate(@PathVariable Long tourId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã kiểm tra tour", service.validate(tourId, principal.getId())));
    }

    @PostMapping("/{tourId}/submit")
    @Operation(summary = "Gửi duyệt → PENDING_REVIEW",
            description = "Backend kiểm tra lại toàn bộ dữ liệu; nếu chưa đạt trả HTTP 400 kèm danh sách lỗi theo bước")
    public ResponseEntity<ApiResponse<TourDetailResponse>> submit(@PathVariable Long tourId,
            @Valid @RequestBody TourWizardRequests.Submit request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã gửi tour để Moderator duyệt",
                service.submit(tourId, request, principal.getId())));
    }

    @PostMapping("/{tourId}/duplicate")
    @Operation(summary = "Nhân bản tour (ví dụ tour bị từ chối) thành bản nháp mới")
    public ResponseEntity<ApiResponse<TourDetailResponse>> duplicate(@PathVariable Long tourId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã tạo bản nháp từ tour", service.duplicate(tourId, principal.getId())));
    }

    @PatchMapping("/{tourId}/pause")
    @Operation(summary = "Tạm ngừng bán tour (PUBLISHED → PAUSED)")
    public ResponseEntity<ApiResponse<TourDetailResponse>> pause(@PathVariable Long tourId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã tạm ngừng bán tour", service.pause(tourId, principal.getId())));
    }

    @PatchMapping("/{tourId}/resume")
    @Operation(summary = "Mở bán lại tour (PAUSED → PUBLISHED)")
    public ResponseEntity<ApiResponse<TourDetailResponse>> resume(@PathVariable Long tourId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã mở bán lại tour", service.resume(tourId, principal.getId())));
    }

    @DeleteMapping("/{tourId}")
    @Operation(summary = "Xóa bản nháp (chỉ DRAFT)")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long tourId,
            @AuthenticationPrincipal UserPrincipal principal) {
        service.deleteDraft(tourId, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Đã xóa bản nháp"));
    }
}
