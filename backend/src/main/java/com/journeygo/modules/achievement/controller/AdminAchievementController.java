package com.journeygo.modules.achievement.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.achievement.dto.AdminAchievementRequest;
import com.journeygo.modules.achievement.dto.AdminAchievementResponse;
import com.journeygo.modules.achievement.entity.enums.AchievementCategory;
import com.journeygo.modules.achievement.service.AchievementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/achievements")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Quản trị Thành tựu & Huy hiệu (Admin Achievements)", description = "Các API quản trị cấu hình danh mục thành tựu, tiêu chí đạt và phần thưởng")
public class AdminAchievementController {

    private final AchievementService achievementService;

    @GetMapping
    @Operation(summary = "Xem danh sách cấu hình thành tựu",
            description = "Quản trị viên xem tất cả thành tựu kèm số du khách đã đạt và đã nhận thưởng, hỗ trợ phân trang và lọc")
    public ResponseEntity<ApiResponse<Page<AdminAchievementResponse>>> getAchievements(
            @RequestParam(required = false) AchievementCategory category,
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách thành tựu quản trị thành công",
                achievementService.getAdminAchievements(category, active, pageable)
        ));
    }

    @GetMapping("/{achievementId}")
    @Operation(summary = "Xem chi tiết cấu hình thành tựu",
            description = "Xem chi tiết cấu hình và thống kê tiến độ của một thành tựu")
    public ResponseEntity<ApiResponse<AdminAchievementResponse>> getDetail(
            @PathVariable Long achievementId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy chi tiết thành tựu thành công",
                achievementService.getAdminAchievementDetail(achievementId)
        ));
    }

    @PostMapping
    @Operation(summary = "Tạo mới thành tựu",
            description = "Quản trị viên tạo mới một cấu hình thành tựu và phần thưởng")
    public ResponseEntity<ApiResponse<AdminAchievementResponse>> createAchievement(
            @Valid @RequestBody AdminAchievementRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                "Tạo mới thành tựu thành công",
                achievementService.createAchievement(request)
        ));
    }

    @PutMapping("/{achievementId}")
    @Operation(summary = "Cập nhật cấu hình thành tựu",
            description = "Cập nhật tên, mô tả, phần thưởng, icon, huy hiệu hoặc trạng thái của thành tựu")
    public ResponseEntity<ApiResponse<AdminAchievementResponse>> updateAchievement(
            @PathVariable Long achievementId,
            @Valid @RequestBody AdminAchievementRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Cập nhật cấu hình thành tựu thành công",
                achievementService.updateAchievement(achievementId, request)
        ));
    }

    @DeleteMapping("/{achievementId}")
    @Operation(summary = "Vô hiệu hóa thành tựu",
            description = "Ngừng áp dụng thành tựu (deactivate/soft-delete) để bảo toàn lịch sử người dùng đã đạt")
    public ResponseEntity<ApiResponse<AdminAchievementResponse>> deactivateAchievement(
            @PathVariable Long achievementId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Vô hiệu hóa thành tựu thành công",
                achievementService.deactivateAchievement(achievementId)
        ));
    }
}

