package com.journeygo.modules.achievement.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.achievement.dto.ClaimAchievementResponse;
import com.journeygo.modules.achievement.dto.TouristAchievementResponse;
import com.journeygo.modules.achievement.dto.TouristAchievementSummaryResponse;
import com.journeygo.modules.achievement.entity.enums.AchievementCategory;
import com.journeygo.modules.achievement.entity.enums.AchievementStatus;
import com.journeygo.modules.achievement.entity.enums.AchievementTier;
import com.journeygo.modules.achievement.service.AchievementService;
import com.journeygo.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TouristAchievementControllerTest {

    @Mock
    private AchievementService achievementService;

    @InjectMocks
    private TouristAchievementController controller;

    private UserPrincipal mockUserPrincipal;

    @BeforeEach
    void setUp() {
        mockUserPrincipal = new UserPrincipal(
                100L,
                "tourist@journeygo.com",
                "secret",
                "Tourist User",
                true,
                List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_TOURIST"))
        );
    }

    @Test
    void getAchievements_shouldReturnPagedAchievements() {
        TouristAchievementResponse item = TouristAchievementResponse.builder()
                .id(1L)
                .code("FIRST_TOUR")
                .name("Bước Chân Đầu Tiên")
                .description("Hoàn thành tour đầu tiên")
                .category(AchievementCategory.TOUR)
                .tier(AchievementTier.BRONZE)
                .targetValue(1)
                .currentProgress(1)
                .status(AchievementStatus.CLAIMABLE)
                .pointsReward(100)
                .build();

        Page<TouristAchievementResponse> pagedResponse = new PageImpl<>(List.of(item));
        when(achievementService.getTouristAchievements(eq(100L), any(), any(), any(Pageable.class)))
                .thenReturn(pagedResponse);

        ResponseEntity<ApiResponse<Page<TouristAchievementResponse>>> response =
                controller.getAchievements(AchievementCategory.TOUR, AchievementStatus.CLAIMABLE, PageRequest.of(0, 10), mockUserPrincipal);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("Lấy danh sách thành tựu thành công", response.getBody().getMessage());
        assertEquals(1, response.getBody().getData().getTotalElements());
        assertEquals("FIRST_TOUR", response.getBody().getData().getContent().get(0).code());
    }

    @Test
    void getSummary_shouldReturnSummaryData() {
        TouristAchievementSummaryResponse summary = TouristAchievementSummaryResponse.builder()
                .totalAchieved(6L)
                .unclaimedCount(2L)
                .totalClaimed(4L)
                .totalPointsEarned(800L)
                .build();

        when(achievementService.getTouristAchievementSummary(100L)).thenReturn(summary);

        ResponseEntity<ApiResponse<TouristAchievementSummaryResponse>> response =
                controller.getSummary(mockUserPrincipal);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(2L, response.getBody().getData().unclaimedCount());
        assertEquals(800L, response.getBody().getData().totalPointsEarned());
    }

    @Test
    void getDetail_shouldReturnAchievementDetail() {
        TouristAchievementResponse detail = TouristAchievementResponse.builder()
                .id(1L)
                .code("FIRST_TOUR")
                .name("Bước Chân Đầu Tiên")
                .description("Hoàn thành tour đầu tiên")
                .category(AchievementCategory.TOUR)
                .tier(AchievementTier.BRONZE)
                .targetValue(1)
                .currentProgress(1)
                .status(AchievementStatus.CLAIMABLE)
                .pointsReward(100)
                .build();

        when(achievementService.getTouristAchievementDetail(100L, 1L)).thenReturn(detail);

        ResponseEntity<ApiResponse<TouristAchievementResponse>> response =
                controller.getDetail(1L, mockUserPrincipal);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertEquals("FIRST_TOUR", response.getBody().getData().code());
    }

    @Test
    void claimReward_shouldReturnClaimResponse() {
        ClaimAchievementResponse claimRes = ClaimAchievementResponse.builder()
                .achievementId(1L)
                .achievementCode("FIRST_TOUR")
                .achievementName("Bước Chân Đầu Tiên")
                .status(AchievementStatus.CLAIMED)
                .pointsAwarded(100)
                .newPointBalance(450)
                .badgeName("Nhà Khám Phá Tập Sự 🥉")
                .claimedAt(Instant.now())
                .build();

        when(achievementService.claimReward(100L, 1L)).thenReturn(claimRes);

        ResponseEntity<ApiResponse<ClaimAchievementResponse>> response =
                controller.claimReward(1L, mockUserPrincipal);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertEquals(AchievementStatus.CLAIMED, response.getBody().getData().status());
        assertEquals(100, response.getBody().getData().pointsAwarded());
        assertEquals(450, response.getBody().getData().newPointBalance());
    }
}
