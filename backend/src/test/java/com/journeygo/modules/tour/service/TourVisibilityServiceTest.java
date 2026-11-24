package com.journeygo.modules.tour.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.moderation.service.TourModerationService;
import com.journeygo.modules.tour.dto.TourPublicDetailResponse;
import com.journeygo.modules.tour.dto.TourResponse;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.entity.enums.TourVisibility;
import com.journeygo.modules.tour.repository.TourRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TourVisibilityServiceTest {

    @Mock
    private TourRepository tourRepository;

    @Mock
    private TourModerationService moderationService;

    @Mock
    private TourPricingService pricingService;

    @Mock
    private TourDetailMapper detailMapper;

    @InjectMocks
    private TourService tourService;

    private Tour publicTour;
    private Tour customTour;

    @BeforeEach
    void setUp() {
        publicTour = Tour.builder()
                .tourId(10L)
                .title("Tour Hà Nội công khai")
                .status(TourStatus.PUBLISHED)
                .approved(true)
                .visibility(TourVisibility.ALL)
                .build();

        customTour = Tour.builder()
                .tourId(20L)
                .title("Tour thiết kế riêng cho khách VIP")
                .status(TourStatus.PUBLISHED)
                .approved(true)
                .visibility(TourVisibility.SPECIFIC_USER)
                .specificUserEmail("vip@example.com")
                .build();

        TourResponse mockResponse = TourResponse.builder()
                .tourId(10L)
                .title("Tour")
                .build();
        when(pricingService.toResponse(any())).thenReturn(mockResponse);
    }

    @Test
    @DisplayName("Tour công khai (ALL): bất kỳ ai cũng có thể xem chi tiết")
    void getPublicDetail_publicTour_accessibleByAnyone() {
        when(tourRepository.findByTourId(10L)).thenReturn(Optional.of(publicTour));

        TourPublicDetailResponse response = tourService.getPublicDetail(10L, null);

        assertNotNull(response);
        verify(moderationService).requireApproved(10L);
    }

    @Test
    @DisplayName("Tour riêng (SPECIFIC_USER): khách hàng có email khớp được phép xem")
    void getPublicDetail_specificUserTour_accessibleByOwnerEmail() {
        when(tourRepository.findByTourId(20L)).thenReturn(Optional.of(customTour));

        TourPublicDetailResponse response = tourService.getPublicDetail(20L, "vip@example.com");

        assertNotNull(response);
        verify(moderationService).requireApproved(20L);
    }

    @Test
    @DisplayName("Tour riêng (SPECIFIC_USER): chặn người dùng chưa đăng nhập (email null)")
    void getPublicDetail_specificUserTour_deniedForUnauthenticated() {
        when(tourRepository.findByTourId(20L)).thenReturn(Optional.of(customTour));

        AppException ex = assertThrows(AppException.class, () -> tourService.getPublicDetail(20L, null));
        assertEquals(ErrorCode.TOUR_ACCESS_DENIED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Tour riêng (SPECIFIC_USER): chặn người dùng khác email")
    void getPublicDetail_specificUserTour_deniedForDifferentEmail() {
        when(tourRepository.findByTourId(20L)).thenReturn(Optional.of(customTour));

        AppException ex = assertThrows(AppException.class, () -> tourService.getPublicDetail(20L, "other@example.com"));
        assertEquals(ErrorCode.TOUR_ACCESS_DENIED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Tour riêng (SPECIFIC_USER): getById cũng chặn nếu khác email")
    void getById_specificUserTour_deniedForDifferentEmail() {
        when(tourRepository.findByTourId(20L)).thenReturn(Optional.of(customTour));

        AppException ex = assertThrows(AppException.class, () -> tourService.getById(20L, "intruder@example.com"));
        assertEquals(ErrorCode.TOUR_ACCESS_DENIED, ex.getErrorCode());
    }
}
