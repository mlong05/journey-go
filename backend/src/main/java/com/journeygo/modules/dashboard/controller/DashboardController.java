package com.journeygo.modules.dashboard.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.dashboard.dto.AdminDashboardResponse;
import com.journeygo.modules.dashboard.dto.ModeratorDashboardResponse;
import com.journeygo.modules.dashboard.dto.OperationsOverviewResponse;
import com.journeygo.modules.dashboard.dto.ProviderDashboardResponse;
import com.journeygo.modules.dashboard.service.DashboardService;
import com.journeygo.modules.dashboard.service.OperationsOverviewService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Trang tổng quan")
@SecurityRequirement(name = "Bearer Authentication")
public class DashboardController {
    private final DashboardService dashboardService;
    private final OperationsOverviewService operationsOverviewService;

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Số liệu tổng quan vận hành toàn sàn")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> admin() {
        return ResponseEntity.ok(ApiResponse.success("Lấy số liệu tổng quan thành công", dashboardService.admin()));
    }

    @GetMapping("/admin/operations")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Trang tổng quan vận hành (kỳ động: hôm nay / 7 ngày / 30 ngày / tháng này / tháng trước / tùy chỉnh)")
    public ResponseEntity<ApiResponse<OperationsOverviewResponse>> operations(
            @RequestParam(defaultValue = "month") String range,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return ResponseEntity.ok(ApiResponse.success("Lấy số liệu tổng quan vận hành thành công",
                operationsOverviewService.overview(range, from, to)));
    }

    @GetMapping("/admin/operations/badges")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Số lượng việc đang chờ theo mô-đun (badge Sidebar Admin)")
    public ResponseEntity<ApiResponse<java.util.Map<String, Long>>> operationBadges() {
        return ResponseEntity.ok(ApiResponse.success("Lấy số lượng việc đang chờ thành công",
                operationsOverviewService.sidebarBadges()));
    }

    @GetMapping("/provider")
    @PreAuthorize("hasAnyRole('CONTENT_PROVIDER', 'ADMIN')")
    @Operation(summary = "Số liệu tổng quan của đối tác đang đăng nhập (range: today | week | month)")
    public ResponseEntity<ApiResponse<ProviderDashboardResponse>> provider(
            @RequestParam(defaultValue = "month") String range,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy số liệu tổng quan thành công",
                dashboardService.provider(principal.getId(), range)));
    }

    @GetMapping("/moderator")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'ADMIN')")
    @Operation(summary = "Số liệu bàn làm việc kiểm duyệt")
    public ResponseEntity<ApiResponse<ModeratorDashboardResponse>> moderator() {
        return ResponseEntity.ok(ApiResponse.success("Lấy số liệu tổng quan thành công", dashboardService.moderator()));
    }
}
