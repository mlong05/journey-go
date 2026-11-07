package com.journeygo.modules.reward.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.reward.dto.RewardSettingResponse;
import com.journeygo.modules.reward.dto.UpdateRewardSettingRequest;
import com.journeygo.modules.reward.entity.RewardSettingCode;
import com.journeygo.modules.reward.service.RewardSettingService;
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

@RestController
@RequestMapping("/api/v1/reward-settings")
@RequiredArgsConstructor
@Tag(name = "Quản lý điểm thưởng")
@SecurityRequirement(name = "Bearer Authentication")
public class RewardSettingController {

    private final RewardSettingService service;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Xem mức điểm thưởng (đối tác xem khi tạo quiz / trải nghiệm, Admin quản lý)")
    public ResponseEntity<ApiResponse<List<RewardSettingResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success("Lấy cấu hình điểm thưởng thành công", service.getAll()));
    }

    @PutMapping("/{code}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin cập nhật mức điểm thưởng (áp dụng cho các lần duyệt tour sau)")
    public ResponseEntity<ApiResponse<RewardSettingResponse>> update(@PathVariable RewardSettingCode code,
            @Valid @RequestBody UpdateRewardSettingRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật điểm thưởng",
                service.update(code, request.points(), principal.getId())));
    }
}
