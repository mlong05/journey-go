package com.journeygo.modules.achievement.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.achievement.dto.AdminAchievementRequest;
import com.journeygo.modules.achievement.dto.AdminAchievementResponse;
import com.journeygo.modules.achievement.entity.enums.AchievementCategory;
import com.journeygo.modules.achievement.entity.enums.AchievementTier;
import com.journeygo.modules.achievement.service.AchievementService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminAchievementControllerTest {

    @Mock
    private AchievementService achievementService;

    @InjectMocks
    private AdminAchievementController controller;

    @Test
    void getAchievements_shouldReturnPagedResults() {
        AdminAchievementResponse item = AdminAchievementResponse.builder()
                .id(1L)
                .code("FIRST_TOUR")
                .name("Bước Chân Đầu Tiên")
                .category(AchievementCategory.TOUR)
                .tier(AchievementTier.BRONZE)
                .targetValue(1)
                .pointsReward(100)
                .active(true)
                .achievedCount(5L)
                .claimedCount(3L)
                .build();

        Page<AdminAchievementResponse> page = new PageImpl<>(List.of(item));
        when(achievementService.getAdminAchievements(any(), any(), any())).thenReturn(page);

        ResponseEntity<ApiResponse<Page<AdminAchievementResponse>>> response =
                controller.getAchievements(AchievementCategory.TOUR, true, PageRequest.of(0, 10));

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getData().getTotalElements());
    }

    @Test
    void getDetail_shouldReturnDetail() {
        AdminAchievementResponse item = AdminAchievementResponse.builder()
                .id(1L)
                .code("FIRST_TOUR")
                .name("Bước Chân Đầu Tiên")
                .category(AchievementCategory.TOUR)
                .tier(AchievementTier.BRONZE)
                .targetValue(1)
                .pointsReward(100)
                .active(true)
                .achievedCount(5L)
                .claimedCount(3L)
                .build();

        when(achievementService.getAdminAchievementDetail(1L)).thenReturn(item);

        ResponseEntity<ApiResponse<AdminAchievementResponse>> response = controller.getDetail(1L);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("FIRST_TOUR", response.getBody().getData().code());
    }

    @Test
    void createAchievement_shouldReturnCreated() {
        AdminAchievementRequest request = new AdminAchievementRequest(
                "NEW_CODE",
                "Thành tựu mới",
                "Mô tả chi tiết",
                AchievementCategory.TOUR,
                AchievementTier.GOLD,
                5,
                200,
                "Huy hiệu vàng",
                "https://example.com/icon.png",
                null,
                true
        );

        AdminAchievementResponse created = AdminAchievementResponse.builder()
                .id(99L)
                .code("NEW_CODE")
                .name("Thành tựu mới")
                .category(AchievementCategory.TOUR)
                .tier(AchievementTier.GOLD)
                .targetValue(5)
                .pointsReward(200)
                .active(true)
                .createdAt(Instant.now())
                .build();

        when(achievementService.createAchievement(any())).thenReturn(created);

        ResponseEntity<ApiResponse<AdminAchievementResponse>> response = controller.createAchievement(request);

        assertNotNull(response);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals("NEW_CODE", response.getBody().getData().code());
    }

    @Test
    void updateAchievement_shouldReturnUpdated() {
        AdminAchievementRequest request = new AdminAchievementRequest(
                "FIRST_TOUR",
                "Bước Chân Đầu Tiên (Update)",
                "Mô tả cập nhật",
                AchievementCategory.TOUR,
                AchievementTier.BRONZE,
                1,
                150,
                null,
                null,
                null,
                true
        );

        AdminAchievementResponse updated = AdminAchievementResponse.builder()
                .id(1L)
                .code("FIRST_TOUR")
                .name("Bước Chân Đầu Tiên (Update)")
                .category(AchievementCategory.TOUR)
                .tier(AchievementTier.BRONZE)
                .targetValue(1)
                .pointsReward(150)
                .active(true)
                .build();

        when(achievementService.updateAchievement(eq(1L), any())).thenReturn(updated);

        ResponseEntity<ApiResponse<AdminAchievementResponse>> response = controller.updateAchievement(1L, request);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Bước Chân Đầu Tiên (Update)", response.getBody().getData().name());
    }

    @Test
    void deactivateAchievement_shouldReturnDeactivated() {
        AdminAchievementResponse deactivated = AdminAchievementResponse.builder()
                .id(1L)
                .code("FIRST_TOUR")
                .name("Bước Chân Đầu Tiên")
                .active(false)
                .build();

        when(achievementService.deactivateAchievement(1L)).thenReturn(deactivated);

        ResponseEntity<ApiResponse<AdminAchievementResponse>> response = controller.deactivateAchievement(1L);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertFalse(response.getBody().getData().active());
    }
}

