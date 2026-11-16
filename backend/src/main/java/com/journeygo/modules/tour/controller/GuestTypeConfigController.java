package com.journeygo.modules.tour.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.tour.dto.GuestTypeConfigResponse;
import com.journeygo.modules.tour.dto.UpdateGuestTypeConfigsRequest;
import com.journeygo.modules.tour.service.GuestTypeConfigService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Loại khách & độ tuổi: ai cũng xem được (trang tạo tour, trang đặt tour); chỉ Admin sửa. */
@RestController
@RequestMapping("/api/v1/guest-types")
@RequiredArgsConstructor
@Tag(name = "Loại khách & độ tuổi", description = "Tên hiển thị, độ tuổi, loại miễn phí của 4 loại khách — Admin cấu hình")
public class GuestTypeConfigController {

    private final GuestTypeConfigService service;

    @GetMapping
    @Operation(summary = "Danh sách loại khách theo tuổi tăng dần (công khai)")
    public ResponseEntity<ApiResponse<List<GuestTypeConfigResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success("Lấy cấu hình loại khách thành công", service.getAll()));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Admin lưu cấu hình cả 4 loại khách",
            description = "Khoảng tuổi phải liền nhau: loại nhỏ tuổi nhất bắt đầu từ 0, tuổi bắt đầu tăng dần. "
                    + "Chỉ áp dụng cho đơn đặt sau khi lưu.")
    public ResponseEntity<ApiResponse<List<GuestTypeConfigResponse>>> update(
            @Valid @RequestBody UpdateGuestTypeConfigsRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã lưu cấu hình loại khách", service.update(request, principal.getId())));
    }
}
