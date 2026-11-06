package com.journeygo.modules.dashboard.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.dashboard.dto.AdminDashboardResponse;
import com.journeygo.modules.dashboard.dto.ModeratorDashboardResponse;
import com.journeygo.modules.dashboard.dto.ProviderDashboardResponse;
import com.journeygo.modules.dashboard.service.DashboardService;
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

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Số liệu tổng quan vận hành toàn sàn")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> admin() {
        return ResponseEntity.ok(ApiResponse.success("Lấy số liệu tổng quan thành công", dashboardService.admin()));
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
