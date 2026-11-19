package com.journeygo.modules.settlement.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.settlement.dto.request.CreateBatchSettlementRequest;
import com.journeygo.modules.settlement.dto.request.CreateSettlementRequest;
import com.journeygo.modules.settlement.dto.request.RejectSettlementRequest;
import com.journeygo.modules.settlement.dto.response.BatchSettlementCandidatesResponse;
import com.journeygo.modules.settlement.dto.response.FinanceSummaryResponse;
import com.journeygo.modules.settlement.dto.response.PlatformRevenueSummaryResponse;
import com.journeygo.modules.settlement.dto.response.SettlementCandidatesResponse;
import com.journeygo.modules.settlement.dto.response.SettlementDetailResponse;
import com.journeygo.modules.settlement.dto.response.SettlementOverviewResponse;
import com.journeygo.modules.settlement.dto.response.SettlementResponse;
import com.journeygo.modules.settlement.entity.enums.SettlementStatus;
import com.journeygo.modules.settlement.service.BatchSettlementService;
import com.journeygo.modules.settlement.service.FinanceSummaryService;
import com.journeygo.modules.settlement.service.SettlementService;
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

@RestController
@RequestMapping("/api/v1/settlements")
@RequiredArgsConstructor
@Tag(name = "Settlement (Tất toán)",
        description = "Đợt tất toán doanh thu cho ProviderProfile theo tháng dương lịch, duyệt nguyên tử và ghi nhận vào ví")
public class SettlementController {

    private final SettlementService settlementService;
    private final BatchSettlementService batchSettlementService;
    private final FinanceSummaryService financeSummaryService;

    // ── Ứng viên tất toán ────────────────────────────────────────────────────

    @GetMapping("/candidates")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xem ứng viên tất toán của một đối tác theo kỳ",
            description = "Đánh giá lại điều kiện tất toán tại thời điểm gọi. Các khoản chưa đủ điều kiện "
                    + "được giữ lại kèm lý do rõ ràng và sẽ được xét lại ở kỳ sau.")
    public ResponseEntity<ApiResponse<SettlementCandidatesResponse>> getCandidates(
            @RequestParam Long providerProfileId,
            @RequestParam String revenuePeriod) {
        return ResponseEntity.ok(ApiResponse.success("Lấy ứng viên tất toán thành công",
                settlementService.getCandidates(providerProfileId, revenuePeriod)));
    }

    // ── Đợt tất toán TỔNG cho cả sàn ─────────────────────────────────────────

    @GetMapping("/batch/candidates")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xem ứng viên tất toán TỔNG của kỳ (toàn bộ đối tác)",
            description = "Gom khoản doanh thu đủ điều kiện của TẤT CẢ đối tác trong kỳ "
                    + "(kèm doanh thu chuyển tiếp từ kỳ trước). Khoản chưa đủ điều kiện được "
                    + "giữ lại kèm lý do và KHÔNG vào đợt — sẽ được xét lại ở kỳ sau.")
    public ResponseEntity<ApiResponse<BatchSettlementCandidatesResponse>> getBatchCandidates(
            @RequestParam String revenuePeriod) {
        return ResponseEntity.ok(ApiResponse.success("Lấy ứng viên tất toán tổng thành công",
                batchSettlementService.getBatchCandidates(revenuePeriod)));
    }

    @PostMapping("/batch")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo đợt tất toán TỔNG cho kỳ (toàn bộ đối tác)",
            description = "Chỉ cần chọn KỲ doanh thu — đợt sẽ gom mọi khoản doanh thu đủ điều kiện "
                    + "của tất cả đối tác trong kỳ. Admin duyệt MỘT lần; tiền vẫn cộng vào ví "
                    + "của từng đối tác theo đúng số tiền của họ.")
    public ResponseEntity<ApiResponse<SettlementResponse>> createBatch(
            @Valid @RequestBody CreateBatchSettlementRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo đợt tất toán tổng thành công",
                        batchSettlementService.createBatchSettlement(request, principal.getId())));
    }

    @PostMapping("/batch/{settlementId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Duyệt đợt tất toán TỔNG",
            description = "Cộng tiền vào ví của TỪNG đối tác theo đúng số tiền của họ — tất cả trong "
                    + "CÙNG một transaction (lỗi một đối tác ⇒ rollback cả đợt).")
    public ResponseEntity<ApiResponse<SettlementResponse>> approveBatch(
            @PathVariable Long settlementId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Duyệt đợt tất toán tổng thành công",
                batchSettlementService.approveBatchSettlement(settlementId, principal.getId())));
    }

    // ── Tổng hợp số liệu ─────────────────────────────────────────────────────

    @GetMapping("/overview")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tổng hợp số liệu tab Tổng quan & Duyệt đợt",
            description = "Gồm thực thu nền tảng, doanh thu nền tảng, doanh thu đối tác, "
                    + "số đợt đã duyệt và số đợt chờ duyệt.")
    public ResponseEntity<ApiResponse<SettlementOverviewResponse>> getOverview() {
        return ResponseEntity.ok(ApiResponse.success("Lấy tổng hợp tất toán thành công",
                settlementService.getOverviewSummary()));
    }

    @GetMapping("/finance-summary")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tổng hợp số liệu tab Tài chính & Thanh toán",
            description = "Gồm số đơn thanh toán thành công, tổng tiền giao dịch, tổng tiền đã hoàn "
                    + "và thực thu nền tảng. Số liệu toàn hệ thống, không phụ thuộc phân trang.")
    public ResponseEntity<ApiResponse<FinanceSummaryResponse>> getFinanceSummary() {
        return ResponseEntity.ok(ApiResponse.success("Lấy tổng hợp tài chính thành công",
                financeSummaryService.getSummary()));
    }

    // ── Doanh thu nền tảng ───────────────────────────────────────────────────

    @GetMapping("/platform-revenue")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tổng hợp doanh thu nền tảng",
            description = "Phần doanh thu nền tảng thu được sau khi tất toán cho đối tác "
                    + "(= tổng thanh toán − tổng hoàn tiền − tổng chi trả đối tác = hoa hồng + điều chỉnh). "
                    + "Chỉ tính các đợt tất toán đã DUYỆT — kỳ đang chờ duyệt chưa phải doanh thu đã thu.")
    public ResponseEntity<ApiResponse<PlatformRevenueSummaryResponse>> getPlatformRevenue(
            @RequestParam(defaultValue = "12") int periods) {
        int safePeriods = Math.min(Math.max(periods, 1), 60);
        return ResponseEntity.ok(ApiResponse.success("Lấy tổng hợp doanh thu nền tảng thành công",
                settlementService.getPlatformRevenueSummary(safePeriods)));
    }

    // ── Tạo / duyệt / từ chối ────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo bản nháp đợt tất toán",
            description = "Chỉ tạo được cho kỳ doanh thu đã kết thúc. Các khoản doanh thu được chọn "
                    + "chuyển sang IN_SETTLEMENT nên không thể bị chọn vào đợt khác trong lúc chờ xử lý.")
    public ResponseEntity<ApiResponse<SettlementResponse>> create(
            @Valid @RequestBody CreateSettlementRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo đợt tất toán thành công",
                        settlementService.createSettlement(request, principal.getId())));
    }

    @PostMapping("/{settlementId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Duyệt đợt tất toán",
            description = "Đánh giá lại toàn bộ điều kiện trước khi duyệt. Việc duyệt cập nhật Settlement, "
                    + "ProviderProfile Revenue và tạo giao dịch cộng tiền vào ví trong CÙNG một transaction — "
                    + "lỗi một bước thì rollback toàn bộ. Một Settlement chỉ tạo được một giao dịch cộng tiền.")
    public ResponseEntity<ApiResponse<SettlementResponse>> approve(
            @PathVariable Long settlementId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Duyệt đợt tất toán thành công",
                settlementService.approveSettlement(settlementId, principal.getId())));
    }

    @PostMapping("/{settlementId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Từ chối / hủy đợt tất toán",
            description = "Giải phóng các khoản doanh thu về trạng thái ELIGIBLE/PENDING. "
                    + "KHÔNG ghi tiền vào ví. Đợt đã duyệt không thể từ chối — phải dùng khoản điều chỉnh tài chính.")
    public ResponseEntity<ApiResponse<SettlementResponse>> reject(
            @PathVariable Long settlementId,
            @Valid @RequestBody RejectSettlementRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Từ chối đợt tất toán thành công",
                settlementService.rejectSettlement(settlementId, request, principal.getId())));
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @GetMapping("/{settlementId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Chi tiết đợt tất toán")
    public ResponseEntity<ApiResponse<SettlementResponse>> getById(@PathVariable Long settlementId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin đợt tất toán thành công",
                settlementService.getById(settlementId)));
    }

    @GetMapping("/{settlementId}/details")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Chi tiết từng khoản doanh thu trong đợt tất toán",
            description = "Hiển thị từng Booking / Payment / Refund kèm công thức tính số tiền.")
    public ResponseEntity<ApiResponse<List<SettlementDetailResponse>>> getDetails(@PathVariable Long settlementId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết đợt tất toán thành công",
                settlementService.getDetails(settlementId)));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách toàn bộ đợt tất toán (ADMIN)")
    public ResponseEntity<ApiResponse<PageResponse<SettlementResponse>>> getAll(
            @RequestParam(required = false) SettlementStatus status,
            @ParameterObject @PageableDefault(page = 0, size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đợt tất toán thành công",
                settlementService.getAll(status, pageable)));
    }

    @GetMapping("/provider-profile/{providerProfileId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách đợt tất toán của một đối tác")
    public ResponseEntity<ApiResponse<PageResponse<SettlementResponse>>> getByProviderProfile(
            @PathVariable Long providerProfileId,
            @ParameterObject @PageableDefault(page = 0, size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đợt tất toán thành công",
                settlementService.getByProviderProfile(providerProfileId, pageable)));
    }
}
