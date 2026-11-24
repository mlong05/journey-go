package com.journeygo.modules.tourrequest.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.service.NotificationPublisher;
import com.journeygo.modules.providerprofile.service.ProviderProfileService;
import com.journeygo.modules.tourrequest.dto.CreateTourRequestRequest;
import com.journeygo.modules.tourrequest.dto.TourRequestResponse;
import com.journeygo.modules.tourrequest.entity.TourRequest;
import com.journeygo.modules.tourrequest.entity.enums.TourRequestStatus;
import com.journeygo.modules.tourrequest.repository.TourRequestRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TourRequestServiceTest {

    @Mock
    private TourRequestRepository tourRequestRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProviderProfileService providerProfileService;

    @Mock
    private NotificationPublisher notifications;

    @InjectMocks
    private TourRequestService tourRequestService;

    private User tourist;
    private User provider;

    @BeforeEach
    void setUp() {
        tourist = User.builder()
                .id(1L)
                .email("tourist@example.com")
                .fullName("Nguyễn Văn Du Khách")
                .build();

        provider = User.builder()
                .id(2L)
                .email("provider@example.com")
                .fullName("Công Ty Du Lịch Miền Trung")
                .build();

        NotificationPublisher.Builder builder = mock(NotificationPublisher.Builder.class);
        when(builder.to(any())).thenReturn(builder);
        when(builder.toRole(any())).thenReturn(builder);
        when(builder.title(any())).thenReturn(builder);
        when(builder.body(any())).thenReturn(builder);
        when(builder.link(any())).thenReturn(builder);
        when(builder.ref(any(), any())).thenReturn(builder);
        when(notifications.send(any(NotificationType.class))).thenReturn(builder);
    }

    @Test
    @DisplayName("Tạo yêu cầu tour thành công với trạng thái OPEN")
    void createTourRequest_success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(tourist));
        when(tourRequestRepository.save(any(TourRequest.class))).thenAnswer(invocation -> {
            TourRequest tr = invocation.getArgument(0);
            tr.setId(100L);
            return tr;
        });

        CreateTourRequestRequest request = new CreateTourRequestRequest(
                "Tour khám phá Hội An",
                "Cần tour 2 ngày 1 đêm cho 4 người lớn",
                "Hội An, Quảng Nam",
                LocalDate.of(2026, 12, 1),
                LocalDate.of(2026, 12, 3),
                4,
                BigDecimal.valueOf(2000000),
                BigDecimal.valueOf(5000000),
                "Cần xe đưa đón"
        );

        TourRequestResponse response = tourRequestService.create(request, 1L);

        assertNotNull(response);
        assertEquals(100L, response.id());
        assertEquals("Tour khám phá Hội An", response.title());
        assertEquals(TourRequestStatus.OPEN, response.status());
        assertEquals(1L, response.requesterId());
        verify(tourRequestRepository).save(any(TourRequest.class));
        verify(notifications).send(NotificationType.TOUR_REQUEST_NEW);
    }

    @Test
    @DisplayName("Tạo yêu cầu thất bại nếu ngày kết thúc trước ngày bắt đầu")
    void createTourRequest_invalidDateRange() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(tourist));

        CreateTourRequestRequest request = new CreateTourRequestRequest(
                "Tour test",
                "Mô tả",
                "Đà Nẵng",
                LocalDate.of(2026, 12, 5),
                LocalDate.of(2026, 12, 1),
                2,
                null,
                null,
                null
        );

        AppException ex = assertThrows(AppException.class, () -> tourRequestService.create(request, 1L));
        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
    }

    @Test
    @DisplayName("Hủy yêu cầu tour thành công khi đang OPEN")
    void cancelTourRequest_success() {
        TourRequest tr = TourRequest.builder()
                .id(100L)
                .requester(tourist)
                .status(TourRequestStatus.OPEN)
                .build();

        when(tourRequestRepository.findById(100L)).thenReturn(Optional.of(tr));

        tourRequestService.cancel(100L, 1L);

        assertEquals(TourRequestStatus.CANCELLED, tr.getStatus());
        verify(tourRequestRepository).save(tr);
    }

    @Test
    @DisplayName("Không được hủy yêu cầu của người khác")
    void cancelTourRequest_forbidden() {
        TourRequest tr = TourRequest.builder()
                .id(100L)
                .requester(tourist)
                .status(TourRequestStatus.OPEN)
                .build();

        when(tourRequestRepository.findById(100L)).thenReturn(Optional.of(tr));

        AppException ex = assertThrows(AppException.class, () -> tourRequestService.cancel(100L, 999L));
        assertEquals(ErrorCode.TOUR_REQUEST_NOT_OWNER, ex.getErrorCode());
    }

    @Test
    @DisplayName("Không được hủy yêu cầu đã có đối tác nhận")
    void cancelTourRequest_alreadyAccepted() {
        TourRequest tr = TourRequest.builder()
                .id(100L)
                .requester(tourist)
                .status(TourRequestStatus.ACCEPTED)
                .acceptedBy(provider)
                .build();

        when(tourRequestRepository.findById(100L)).thenReturn(Optional.of(tr));

        AppException ex = assertThrows(AppException.class, () -> tourRequestService.cancel(100L, 1L));
        assertEquals(ErrorCode.TOUR_REQUEST_INVALID_STATUS, ex.getErrorCode());
    }

    @Test
    @DisplayName("Đối tác nhận yêu cầu thành công")
    void acceptTourRequest_success() {
        TourRequest tr = TourRequest.builder()
                .id(100L)
                .requester(tourist)
                .title("Tour khám phá Huế")
                .status(TourRequestStatus.OPEN)
                .build();

        when(userRepository.findById(2L)).thenReturn(Optional.of(provider));
        when(tourRequestRepository.findById(100L)).thenReturn(Optional.of(tr));
        when(tourRequestRepository.save(any(TourRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TourRequestResponse response = tourRequestService.acceptRequest(100L, 2L);

        assertNotNull(response);
        assertEquals(TourRequestStatus.ACCEPTED, response.status());
        assertEquals(2L, response.acceptedById());
        assertNotNull(response.acceptedAt());
        verify(providerProfileService).requireCanManageTours(2L);
        verify(notifications).send(NotificationType.TOUR_REQUEST_ACCEPTED);
    }

    @Test
    @DisplayName("Nhận yêu cầu thất bại nếu đã có đối tác khác nhận")
    void acceptTourRequest_alreadyAccepted() {
        TourRequest tr = TourRequest.builder()
                .id(100L)
                .requester(tourist)
                .status(TourRequestStatus.ACCEPTED)
                .acceptedBy(provider)
                .build();

        when(userRepository.findById(3L)).thenReturn(Optional.of(User.builder().id(3L).build()));
        when(tourRequestRepository.findById(100L)).thenReturn(Optional.of(tr));

        AppException ex = assertThrows(AppException.class, () -> tourRequestService.acceptRequest(100L, 3L));
        assertEquals(ErrorCode.TOUR_REQUEST_ALREADY_ACCEPTED, ex.getErrorCode());
    }
}
