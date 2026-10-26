package com.journeygo.modules.destination.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.destination.dto.DestinationRequest;
import com.journeygo.modules.destination.dto.DestinationResponse;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.entity.DestinationStatus;
import com.journeygo.modules.destination.entity.Region;
import com.journeygo.modules.destination.entity.Theme;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.destination.repository.RegionRepository;
import com.journeygo.modules.destination.repository.ThemeRepository;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DestinationServiceWorkflowTest {

    @Mock
    private DestinationRepository destinationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RegionRepository regionRepository;

    @Mock
    private ThemeRepository themeRepository;

    @InjectMocks
    private DestinationService destinationService;

    private User creator;
    private Region region;
    private Theme theme;
    private Destination destination;

    @BeforeEach
    void setUp() {
        creator = User.builder()
                .id(1L)
                .email("provider@example.com")
                .fullName("Test Provider")
                .role(Role.valueOf(Role.PROVIDER))
                .build();

        region = Region.builder()
                .id(10L)
                .name("Miền Bắc")
                .slug("mien-bac")
                .build();

        theme = Theme.builder()
                .id(20L)
                .name("Di sản")
                .slug("di-san")
                .build();

        destination = Destination.builder()
                .id(100L)
                .name("Hồ Hoàn Kiếm")
                .address("Hà Nội")
                .latitude(BigDecimal.valueOf(21.0285))
                .longitude(BigDecimal.valueOf(105.8542))
                .capacity(1000)
                .status(DestinationStatus.DRAFT)
                .approved(false)
                .deleted(false)
                .region(region)
                .themes(Set.of(theme))
                .createdBy(creator)
                .build();
    }

    @Test
    @DisplayName("Create destination sets status to DRAFT and links region/themes")
    void testCreateDestination() {
        DestinationRequest request = new DestinationRequest(
                "Hồ Hoàn Kiếm", "Hà Nội",
                BigDecimal.valueOf(21.0285), BigDecimal.valueOf(105.8542),
                1000, 10L, Set.of(20L)
        );

        when(destinationRepository.existsByNameAndAddressAndDeletedFalse(any(), any())).thenReturn(false);
        when(destinationRepository.existsByLatitudeAndLongitudeAndDeletedFalse(any(), any())).thenReturn(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(creator));
        when(regionRepository.findByIdAndDeletedFalse(10L)).thenReturn(Optional.of(region));
        when(themeRepository.findAllByIdInAndDeletedFalse(Set.of(20L))).thenReturn(List.of(theme));
        when(destinationRepository.save(any(Destination.class))).thenAnswer(invocation -> {
            Destination d = invocation.getArgument(0);
            d.setId(100L);
            return d;
        });

        DestinationResponse response = destinationService.create(request, 1L);

        assertNotNull(response);
        assertEquals(DestinationStatus.DRAFT, response.status());
        assertFalse(response.approved());
        assertNotNull(response.region());
        assertEquals("mien-bac", response.region().slug());
        assertEquals(10L, response.regionId());
    }

    @Test
    @DisplayName("Submit destination transitions to PENDING")
    void testSubmitDestination() {
        when(destinationRepository.findByIdAndDeletedFalse(100L)).thenReturn(Optional.of(destination));
        when(destinationRepository.save(any(Destination.class))).thenAnswer(i -> i.getArgument(0));

        DestinationResponse response = destinationService.submit(100L, 1L, Role.valueOf(Role.PROVIDER));

        assertEquals(DestinationStatus.PENDING, response.status());
        assertFalse(response.approved());
    }

    @Test
    @DisplayName("Submit destination fails if caller is PROVIDER and not the owner")
    void testSubmitDestinationUnauthorized() {
        when(destinationRepository.findByIdAndDeletedFalse(100L)).thenReturn(Optional.of(destination));

        AppException ex = assertThrows(AppException.class, () ->
                destinationService.submit(100L, 999L, Role.valueOf(Role.PROVIDER)));
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Publish destination transitions to PUBLISHED and sets approved = true")
    void testPublishDestination() {
        destination.setStatus(DestinationStatus.PENDING);
        when(destinationRepository.findByIdAndDeletedFalse(100L)).thenReturn(Optional.of(destination));
        when(destinationRepository.save(any(Destination.class))).thenAnswer(i -> i.getArgument(0));

        DestinationResponse response = destinationService.publish(100L);

        assertEquals(DestinationStatus.PUBLISHED, response.status());
        assertTrue(response.approved());
    }

    @Test
    @DisplayName("Reject destination transitions to REJECTED and approved = false")
    void testRejectDestination() {
        destination.setStatus(DestinationStatus.PENDING);
        when(destinationRepository.findByIdAndDeletedFalse(100L)).thenReturn(Optional.of(destination));
        when(destinationRepository.save(any(Destination.class))).thenAnswer(i -> i.getArgument(0));

        DestinationResponse response = destinationService.reject(100L);

        assertEquals(DestinationStatus.REJECTED, response.status());
        assertFalse(response.approved());
    }

    @Test
    @DisplayName("Get all destinations with pagination and sorting")
    void testGetAllWithPaginationAndSorting() {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                0, 10, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt")
        );
        org.springframework.data.domain.Page<Destination> pagedDestinations = new org.springframework.data.domain.PageImpl<>(
                List.of(destination), pageable, 1
        );

        when(destinationRepository.findByDeletedFalse(pageable)).thenReturn(pagedDestinations);

        com.journeygo.common.dto.PageResponse<DestinationResponse> response = destinationService.getAll(pageable);

        assertNotNull(response);
        assertEquals(0, response.getPage());
        assertEquals(10, response.getSize());
        assertEquals(1, response.getTotalElements());
        assertEquals(1, response.getTotalPages());
        assertTrue(response.isFirst());
        assertTrue(response.isLast());
        assertEquals(1, response.getContent().size());
        assertEquals("Hồ Hoàn Kiếm", response.getContent().get(0).name());
    }

    @Test
    @DisplayName("Get destinations by status with pagination")
    void testGetByStatusWithPagination() {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 5);
        org.springframework.data.domain.Page<Destination> pagedDestinations = new org.springframework.data.domain.PageImpl<>(
                List.of(destination), pageable, 1
        );

        when(destinationRepository.findByStatusAndDeletedFalse(DestinationStatus.DRAFT, pageable)).thenReturn(pagedDestinations);

        com.journeygo.common.dto.PageResponse<DestinationResponse> response = destinationService.getByStatus(DestinationStatus.DRAFT, pageable);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals(DestinationStatus.DRAFT, response.getContent().get(0).status());
    }

    @Test
    @DisplayName("Get destinations handles Swagger default sort string ['string'] safely")
    void testGetAllWithSwaggerDefaultSortField() {
        // Simulates Swagger UI sending sort=["string"]
        org.springframework.data.domain.Pageable swaggerPageable = org.springframework.data.domain.PageRequest.of(
                0, 10, org.springframework.data.domain.Sort.by("[\"string\"]")
        );
        org.springframework.data.domain.Pageable sanitizedPageable = org.springframework.data.domain.PageRequest.of(
                0, 10, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt")
        );
        org.springframework.data.domain.Page<Destination> pagedDestinations = new org.springframework.data.domain.PageImpl<>(
                List.of(destination), sanitizedPageable, 1
        );

        when(destinationRepository.findByDeletedFalse(sanitizedPageable)).thenReturn(pagedDestinations);

        com.journeygo.common.dto.PageResponse<DestinationResponse> response = destinationService.getAll(swaggerPageable);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
    }
}
