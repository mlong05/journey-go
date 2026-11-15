package com.journeygo.modules.achievement.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.achievement.dto.ClaimAchievementResponse;
import com.journeygo.modules.achievement.dto.TouristAchievementResponse;
import com.journeygo.modules.achievement.dto.TouristAchievementSummaryResponse;
import com.journeygo.modules.achievement.entity.enums.AchievementCategory;
import com.journeygo.modules.achievement.entity.enums.AchievementStatus;
import com.journeygo.modules.achievement.service.AchievementService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tourist/achievements")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Thành tựu & Huy hiệu du khách (Achievements)", description = "Các API xem danh sách thành tựu, tiến độ cá nhân, thống kê và nhận thưởng (claim) của du khách")
public class TouristAchievementController {

    private final AchievementService achievementService;

    @GetMapping
    @Operation(summary = "Xem danh sách thành tựu và tiến độ",
            description = "Trả về danh sách thành tựu kèm tiến độ và trạng thái (LOCKED, CLAIMABLE, CLAIMED) của du khách đang đăng nhập")
    public ResponseEntity<ApiResponse<Page<TouristAchievementResponse>>> getAchievements(
            @RequestParam(required = false) AchievementCategory category,
            @RequestParam(required = false) AchievementStatus status,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách thành tựu thành công",
                achievementService.getTouristAchievements(userPrincipal.getId(), category, status, pageable)
        ));
    }

    @GetMapping("/summary")
    @Operation(summary = "Xem thống kê thành tựu",
            description = "Trả về tổng số thành tựu đã đạt, số thành tựu đang chờ nhận (red dot indicator), đã nhận và tổng điểm đã nhận")
    public ResponseEntity<ApiResponse<TouristAchievementSummaryResponse>> getSummary(
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy thống kê thành tựu thành công",
                achievementService.getTouristAchievementSummary(userPrincipal.getId())
        ));
    }

    @GetMapping("/{achievementId}")
    @Operation(summary = "Xem chi tiết một thành tựu",
            description = "Trả về thông tin chi tiết và tiến độ của du khách đối với thành tựu cụ thể")
    public ResponseEntity<ApiResponse<TouristAchievementResponse>> getDetail(
            @PathVariable Long achievementId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy chi tiết thành tựu thành công",
                achievementService.getTouristAchievementDetail(userPrincipal.getId(), achievementId)
        ));
    }

    @PostMapping("/{achievementId}/claim")
    @Operation(summary = "Nhận thưởng thành tựu",
            description = "Nhận điểm thưởng Journey Points và huy hiệu khi thành tựu đạt trạng thái CLAIMABLE (idempotent & concurrency-safe)")
    public ResponseEntity<ApiResponse<ClaimAchievementResponse>> claimReward(
            @PathVariable Long achievementId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Nhận thưởng thành tựu thành công",
                achievementService.claimReward(userPrincipal.getId(), achievementId)
        ));
    }
}

