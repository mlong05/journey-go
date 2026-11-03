package com.journeygo.modules.experience.service;

import com.journeygo.modules.experience.dto.response.CheckInPointResponse;
import com.journeygo.modules.experience.entity.CheckInPoint;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.repository.CheckInPointRepository;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.experience.security.ExperienceSecurity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Mã QR của trạm check-in chỉ trả cho chủ trải nghiệm / ADMIN / MODERATOR; du khách và khách vãng lai
 * vẫn thấy vị trí trạm để được dẫn đường nhưng không có mã (phải tới trạm mới quét được).
 */
@ExtendWith(MockitoExtension.class)
class CheckInPointQrVisibilityTest {

    @Mock private CheckInPointRepository checkInPointRepository;
    @Mock private ExperienceRepository experienceRepository;
    @Mock private ExperienceSecurity experienceSecurity;

    @InjectMocks
    private CheckInPointService checkInPointService;

    private CheckInPoint station() {
        return CheckInPoint.builder()
                .id(3L)
                .experience(Experience.builder().id(9L).build())
                .name("Khuê Văn Các")
                .latitude(new BigDecimal("21.0283"))
                .longitude(new BigDecimal("105.8359"))
                .qrToken("STATION-SECRET")
                .build();
    }

    @Test
    void publicCaller_seesStationWithoutQrToken() {
        when(checkInPointRepository.findByExperienceIdOrderBySequenceOrderAsc(9L)).thenReturn(List.of(station()));
        when(experienceSecurity.canViewCheckInSecrets(9L)).thenReturn(false);

        CheckInPointResponse r = checkInPointService.listByExperience(9L).get(0);

        assertNull(r.qrToken());
        assertEquals("Khuê Văn Các", r.name());
        assertEquals(new BigDecimal("21.0283"), r.latitude());
    }

    @Test
    void owner_seesQrToken() {
        when(checkInPointRepository.findByExperienceIdOrderBySequenceOrderAsc(9L)).thenReturn(List.of(station()));
        when(experienceSecurity.canViewCheckInSecrets(9L)).thenReturn(true);

        assertEquals("STATION-SECRET", checkInPointService.listByExperience(9L).get(0).qrToken());
    }

    @Test
    void regenerateQr_worksOnPublishedExperience_andReplacesOldToken() {
        CheckInPoint c = station();
        c.getExperience().setStatus(com.journeygo.modules.experience.entity.enums.ExperienceStatus.PUBLISHED);
        when(checkInPointRepository.findById(3L)).thenReturn(Optional.of(c));
        when(checkInPointRepository.existsByQrToken(anyString())).thenReturn(false);
        when(checkInPointRepository.saveAndFlush(c)).thenReturn(c);

        CheckInPointResponse r = checkInPointService.regenerateQr(3L);

        assertNotEquals("STATION-SECRET", r.qrToken());
        assertTrue(r.qrToken().matches("JGS-[0-9A-F]{16}"), r.qrToken());
    }

    @Test
    void getById_masksForPublicCaller() {
        when(checkInPointRepository.findById(3L)).thenReturn(Optional.of(station()));
        when(experienceSecurity.canViewCheckInSecrets(9L)).thenReturn(false);

        assertNull(checkInPointService.getById(3L).qrToken());
    }
}
