package com.journeygo.modules.moderation.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.moderation.dto.TourReviewDecisionRequest;
import com.journeygo.modules.moderation.dto.TourReviewResponse;
import com.journeygo.modules.moderation.entity.enums.TourRejectionReason;
import com.journeygo.modules.moderation.entity.enums.TourReviewStatus;
import com.journeygo.modules.moderation.service.TourModerationService;
import com.journeygo.modules.tour.dto.wizard.TourDetailResponse;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/v1/moderation/tours")
@RequiredArgsConstructor
@Tag(name = "Kiểm duyệt tour")
@SecurityRequirement(name = "Bearer Authentication")
public class TourModerationController {
    private final TourModerationService moderationService;

    @PostMapping("/{tourId}/submit")
    @PreAuthorize("hasAnyRole('CONTENT_PROVIDER', 'CONTENT_MODERATOR')")
    @Operation(summary = "Gửi lại tour bị từ chối để kiểm duyệt")
    public ResponseEntity<ApiResponse<TourReviewResponse>> submit(@PathVariable Long tourId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã gửi tour để kiểm duyệt",
                moderationService.submit(tourId, principal.getId(), role(principal))));
    }

    @GetMapping("/queue")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    @Operation(summary = "Lấy hàng chờ kiểm duyệt tour")
    public ResponseEntity<ApiResponse<PageResponse<TourReviewResponse>>> queue(
            @ParameterObject @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy hàng chờ kiểm duyệt tour thành công",
                moderationService.getQueue(pageable)));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    @Operation(summary = "Lọc tour theo trạng thái kiểm duyệt")
    public ResponseEntity<ApiResponse<PageResponse<TourReviewResponse>>> byStatus(@PathVariable TourReviewStatus status,
            @ParameterObject @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tour theo trạng thái thành công",
                moderationService.getByStatus(status, pageable)));
    }

    @GetMapping("/rejection-reasons")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    @Operation(summary = "Lấy danh sách lý do từ chối tour")
    public ResponseEntity<ApiResponse<List<RejectionReasonOption>>> rejectionReasons() {
        var reasons = Arrays.stream(TourRejectionReason.values())
                .map(reason -> new RejectionReasonOption(reason.getCode(), reason.getLabel())).toList();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách lý do từ chối tour thành công", reasons));
    }

    @GetMapping("/{tourId}/history")
    @PreAuthorize("hasAnyRole('CONTENT_PROVIDER', 'CONTENT_MODERATOR')")
    @Operation(summary = "Xem trạng thái và lịch sử kiểm duyệt tour")
    public ResponseEntity<ApiResponse<TourReviewResponse>> history(@PathVariable Long tourId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử kiểm duyệt tour thành công",
                moderationService.getHistory(tourId, principal.getId(), role(principal))));
    }

    @GetMapping("/{tourId}/detail")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    @Operation(summary = "Xem toàn bộ nội dung tour (luồng 5 bước) để kiểm duyệt")
    public ResponseEntity<ApiResponse<TourDetailResponse>> detail(@PathVariable Long tourId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết tour thành công",
                moderationService.getDetail(tourId)));
    }

    @PatchMapping("/{tourId}/approve")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    @Operation(summary = "Đồng ý duyệt tour",
            description = "Tour 5 bước: bắt buộc tick 5 tiêu chí, đạt tối thiểu 3/5 và không có ghi chú lỗi. "
                    + "Backend kiểm tra lại toàn bộ dữ liệu, chốt điểm thưởng, sinh slot, chuyển PUBLISHED và gửi email.")
    public ResponseEntity<ApiResponse<TourReviewResponse>> approve(@PathVariable Long tourId,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody(required = false) TourReviewDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã duyệt tour",
                moderationService.approve(tourId, principal.getId(), request)));
    }

    @PatchMapping("/{tourId}/request-changes")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    @Operation(summary = "Yêu cầu đối tác chỉnh sửa tour",
            description = "Bắt buộc ít nhất 1 ghi chú (gắn với bước / điểm đến). Tour chuyển CHANGES_REQUESTED.")
    public ResponseEntity<ApiResponse<TourReviewResponse>> requestChanges(@PathVariable Long tourId,
            @AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody TourReviewDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã gửi yêu cầu chỉnh sửa",
                moderationService.requestChanges(tourId, principal.getId(), request)));
    }

    @PatchMapping("/{tourId}/reject")
    @PreAuthorize("hasRole('CONTENT_MODERATOR')")
    @Operation(summary = "Từ chối tour",
            description = "Bắt buộc mã lý do hoặc ghi chú. Tour 5 bước: bắt buộc tick 5 tiêu chí.")
    public ResponseEntity<ApiResponse<TourReviewResponse>> reject(@PathVariable Long tourId,
            @AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody TourReviewDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối tour",
                moderationService.reject(tourId, principal.getId(), request)));
    }

    public record RejectionReasonOption(String code, String label) {}

    private Role role(UserPrincipal principal) {
        return Role.valueOf(principal.getAuthorities().iterator().next().getAuthority().replace("ROLE_", ""));
    }
}
