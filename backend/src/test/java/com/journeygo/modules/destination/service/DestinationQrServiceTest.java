package com.journeygo.modules.destination.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.modules.destination.dto.DestinationQrResponse;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.destination.repository.RegionRepository;
import com.journeygo.modules.destination.repository.ThemeRepository;
import com.journeygo.modules.moderation.service.DestinationModerationService;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Mã QR check-in của điểm đến: chỉ chủ điểm đến / MODERATOR xem và tạo lại được. */
@ExtendWith(MockitoExtension.class)
class DestinationQrServiceTest {

    @Mock private DestinationRepository destinationRepository;
    @Mock private UserRepository userRepository;
    @Mock private RegionRepository regionRepository;
    @Mock private ThemeRepository themeRepository;
    @Mock private DestinationModerationService moderationService;

    @InjectMocks
    private DestinationService destinationService;

    private static final Role PROVIDER = Role.of("CONTENT_PROVIDER");
    private static final Role MODERATOR = Role.of("CONTENT_MODERATOR");

    private Destination destination(Long ownerId, String qrToken) {
        Destination d = Destination.builder()
                .id(5L)
                .name("Văn Miếu")
                .createdBy(User.builder().id(ownerId).build())
                .qrToken(qrToken)
                .build();
        when(destinationRepository.findByIdAndDeletedFalse(5L)).thenReturn(Optional.of(d));
        return d;
    }

    @Test
    void newQrToken_hasReadableUniqueFormat() {
        String a = Destination.newQrToken();
        String b = Destination.newQrToken();
        assertTrue(a.matches("JGD-[0-9A-F]{16}"), a);
        assertNotEquals(a, b);
    }

    @Test
    void owner_seesExistingToken() {
        destination(10L, "JGD-AAAABBBBCCCCDDDD");

        DestinationQrResponse res = destinationService.getQr(5L, 10L, PROVIDER);

        assertEquals("JGD-AAAABBBBCCCCDDDD", res.qrToken());
        assertEquals("Văn Miếu", res.destinationName());
        verify(destinationRepository, never()).save(any());
    }

    @Test
    void legacyDestinationWithoutToken_getsOneGenerated() {
        Destination d = destination(10L, null);

        DestinationQrResponse res = destinationService.getQr(5L, 10L, PROVIDER);

        assertNotNull(res.qrToken());
        assertEquals(res.qrToken(), d.getQrToken());
        verify(destinationRepository).save(d);
    }

    @Test
    void otherProvider_isRejected() {
        destination(10L, "JGD-AAAABBBBCCCCDDDD");

        assertThrows(AppException.class, () -> destinationService.getQr(5L, 99L, PROVIDER));
        assertThrows(AppException.class, () -> destinationService.regenerateQr(5L, 99L, PROVIDER));
    }

    @Test
    void moderator_canRegenerate_andOldTokenIsReplaced() {
        Destination d = destination(10L, "JGD-AAAABBBBCCCCDDDD");

        DestinationQrResponse res = destinationService.regenerateQr(5L, 1L, MODERATOR);

        assertNotEquals("JGD-AAAABBBBCCCCDDDD", res.qrToken());
        assertEquals(res.qrToken(), d.getQrToken());
        verify(destinationRepository).save(d);
    }
}
