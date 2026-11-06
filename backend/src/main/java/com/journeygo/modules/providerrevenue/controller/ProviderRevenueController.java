package com.journeygo.modules.providerrevenue.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.providerrevenue.dto.response.EligibilityEvaluationResponse;
import com.journeygo.modules.providerrevenue.dto.response.ProviderRevenueResponse;
import com.journeygo.modules.providerrevenue.entity.enums.ProviderRevenueStatus;
import com.journeygo.modules.providerrevenue.service.ProviderRevenueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/provider-revenues")
@RequiredArgsConstructor
@Tag(name = "ProviderProfile Revenue (Doanh thu đối tác)",
        description = "Theo dõi doanh thu theo Booking/Payment/kỳ và đánh giá điều kiện đủ tư cách tất toán")
public class ProviderRevenueController {

    private final ProviderRevenueService revenueService;

    @GetMapping("/provider-profile/{providerProfileId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách doanh thu của một đối tác")
    public ResponseEntity<ApiResponse<PageResponse<ProviderRevenueResponse>>> getByProviderProfile(
            @PathVariable Long providerProfileId,
            @ParameterObject @PageableDefault(page = 0, size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách doanh thu thành công",
                revenueService.getByProviderProfile(providerProfileId, pageable)));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách doanh thu theo trạng thái (ADMIN)")
    public ResponseEntity<ApiResponse<PageResponse<ProviderRevenueResponse>>> getAll(
            @RequestParam(required = false) ProviderRevenueStatus status,
            @ParameterObject @PageableDefault(page = 0, size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách doanh thu thành công",
                revenueService.getByStatus(status, pageable)));
    }

    @GetMapping("/bookings/{bookingId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Doanh thu phát sinh từ một booking")
    public ResponseEntity<ApiResponse<java.util.List<ProviderRevenueResponse>>> getByBooking(
            @PathVariable Long bookingId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy doanh thu của booking thành công",
                revenueService.findByBooking(bookingId).stream()
                        .map(ProviderRevenueResponse::fromEntity)
                        .toList()));
    }

    @GetMapping("/{revenueId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Chi tiết khoản doanh thu")
    public ResponseEntity<ApiResponse<ProviderRevenueResponse>> getById(@PathVariable Long revenueId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin doanh thu thành công",
                revenueService.getById(revenueId)));
    }

    @GetMapping("/{revenueId}/eligibility")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Đánh giá điều kiện đủ tư cách tất toán",
            description = "Đánh giá lại 9 điều kiện bắt buộc tại thời điểm gọi — không dựa vào trạng thái "
                    + "tính từ trước, để dữ liệu cũ hoặc trạng thái chưa kịp cập nhật không lọt khoản doanh thu chưa đủ điều kiện. "
                    + "Khi truyền `settlementId`, điều kiện 6 được chấm theo ngữ cảnh duyệt đợt "
                    + "(khoản doanh thu thuộc đúng đợt đang duyệt) thay vì ngữ cảnh ứng viên.")
    public ResponseEntity<ApiResponse<EligibilityEvaluationResponse>> evaluateEligibility(
            @PathVariable Long revenueId,
            @RequestParam(required = false) Long settlementId) {
        EligibilityEvaluationResponse result = (settlementId != null)
                ? revenueService.evaluateForApproval(revenueId, settlementId)
                : revenueService.evaluateEligibility(revenueId);
        return ResponseEntity.ok(ApiResponse.success("Đánh giá điều kiện tất toán thành công", result));
    }
}
