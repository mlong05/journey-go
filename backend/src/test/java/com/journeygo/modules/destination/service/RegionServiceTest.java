package com.journeygo.modules.destination.service;

import com.journeygo.modules.destination.dto.RegionResponse;
import com.journeygo.modules.destination.entity.Region;
import com.journeygo.modules.destination.repository.RegionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RegionServiceTest {

    @Mock
    private RegionRepository regionRepository;

    @InjectMocks
    private RegionService regionService;

    private Region region;

    @BeforeEach
    void setUp() {
        region = Region.builder()
                .id(1L)
                .name("Miền Trung")
                .slug("mien-trung")
                .deleted(false)
                .build();
    }

    @Test
    @DisplayName("Soft delete region sets deleted = true")
    void testDeleteRegionSoft() {
        when(regionRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(region));
        when(regionRepository.save(any(Region.class))).thenAnswer(i -> i.getArgument(0));

        regionService.delete(1L);

        assertTrue(region.isDeleted());
        verify(regionRepository).save(region);
        verify(regionRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Restore soft-deleted region sets deleted = false")
    void testRestoreRegion() {
        region.setDeleted(true);
        when(regionRepository.findByIdAndDeletedTrue(1L)).thenReturn(Optional.of(region));
        when(regionRepository.save(any(Region.class))).thenAnswer(i -> i.getArgument(0));

        RegionResponse response = regionService.restore(1L);

        assertNotNull(response);
        assertFalse(response.deleted());
        assertFalse(region.isDeleted());
        verify(regionRepository).save(region);
    }
}
