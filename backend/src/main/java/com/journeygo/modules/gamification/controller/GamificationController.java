package com.journeygo.modules.gamification.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.gamification.dto.*;
import com.journeygo.modules.voucher.dto.response.VoucherResponse;
import com.journeygo.modules.gamification.entity.enums.UserVoucherStatus;
import com.journeygo.modules.gamification.service.GamificationService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/gamification")
@RequiredArgsConstructor
@Tag(name = "Gamification & Phần thưởng (Badges, Points, Vouchers)", description = "Các API tra cứu huy hiệu, điểm thưởng và quy đổi voucher giảm giá của du khách")
public class GamificationController {

    private final GamificationService gamificationService;

    // ── BADGES ──────────────────────────────────────────────────────────────────

    @GetMapping("/badges")
    @Operation(summary = "Xem danh mục huy hiệu toàn hệ thống", description = "Trả về danh sách tất cả huy hiệu di sản đang mở")
    public ResponseEntity<ApiResponse<List<BadgeResponse>>> getAllBadges() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh mục huy hiệu thành công", gamificationService.getAllBadges()));
    }

    @GetMapping("/badges/admin")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Quản trị: danh sách mọi huy hiệu", description = "Gồm cả huy hiệu đã tắt, kèm số du khách đã đạt")
    public ResponseEntity<ApiResponse<List<AdminBadgeResponse>>> getAllBadgesForAdmin() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách huy hiệu thành công",
                gamificationService.getAllBadgesForAdmin()));
    }

    @PutMapping("/badges/{badgeId}")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Quản trị: cập nhật huy hiệu", description = "Đổi tên, mô tả, ảnh, điểm thưởng hoặc bật/tắt huy hiệu")
    public ResponseEntity<ApiResponse<AdminBadgeResponse>> updateBadge(
            @PathVariable Long badgeId,
            @Valid @RequestBody BadgeUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật huy hiệu thành công",
                gamificationService.updateBadge(badgeId, request)));
    }

    @GetMapping("/badges/my")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xem bộ sưu tập huy hiệu của tôi", description = "Trả về các huy hiệu mà du khách đã đạt được qua các chuyến đi")
    public ResponseEntity<ApiResponse<List<UserBadgeResponse>>> getMyBadges(
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.success("Lấy bộ sưu tập huy hiệu thành công",
                gamificationService.getUserBadges(userPrincipal.getId())));
    }

    // ── POINTS ──────────────────────────────────────────────────────────────────

    @GetMapping("/points/my")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xem số dư điểm thưởng", description = "Trả về số dư ví điểm hiện tại và tổng tích lũy của du khách")
    public ResponseEntity<ApiResponse<UserPointResponse>> getMyPoints(
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.success("Lấy số dư điểm thành công",
                gamificationService.getUserPoint(userPrincipal.getId())));
    }

    @GetMapping("/points/history")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xem lịch sử giao dịch điểm", description = "Trả về lịch sử cộng điểm và tiêu điểm tích lũy của du khách")
    public ResponseEntity<ApiResponse<Page<PointTransactionResponse>>> getPointHistory(
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử điểm thành công",
                gamificationService.getPointHistoryPaged(userPrincipal.getId(), pageable)));
    }

    // ── VOUCHERS ────────────────────────────────────────────────────────────────

    @GetMapping("/vouchers")
    @Operation(summary = "Xem danh sách voucher khả dụng", description = "Danh sách voucher giảm giá có thể dùng điểm đổi")
    public ResponseEntity<ApiResponse<List<VoucherResponse>>> getAvailableVouchers() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách voucher thành công",
                gamificationService.getAvailableVouchers()));
    }

    @PostMapping("/vouchers/{voucherId}/redeem")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Dùng điểm đổi lấy mã voucher", description = "Trừ điểm thưởng và phát hành mã voucher giảm giá cá nhân")
    public ResponseEntity<ApiResponse<UserVoucherResponse>> redeemVoucher(
            @PathVariable Long voucherId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        UserVoucherResponse response = gamificationService.redeemVoucher(userPrincipal.getId(), voucherId);
        return ResponseEntity.ok(ApiResponse.success("Đổi voucher thành công! Mã đã được lưu vào ví voucher của bạn", response));
    }

    @GetMapping("/vouchers/my")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xem kho voucher của tôi", description = "Danh sách voucher cá nhân đang sở hữu hoặc đã dùng")
    public ResponseEntity<ApiResponse<List<UserVoucherResponse>>> getMyVouchers(
            @RequestParam(required = false) UserVoucherStatus status,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.success("Lấy kho voucher cá nhân thành công",
                gamificationService.getMyVouchers(userPrincipal.getId(), status)));
    }
}
