package com.journeygo.modules.content.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.content.dto.CulturalContentRequest;
import com.journeygo.modules.content.dto.CulturalContentResponse;
import com.journeygo.modules.content.entity.CulturalContent;
import com.journeygo.modules.content.repository.CulturalContentRepository;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CulturalContentServiceTest {

    @Mock
    private CulturalContentRepository culturalContentRepository;

    @Mock
    private DestinationRepository destinationRepository;

    @InjectMocks
    private CulturalContentService culturalContentService;

    private User owner;
    private Destination destination;
    private CulturalContent content;

    @BeforeEach
    void setUp() {
        owner = User.builder()
                .id(1L)
                .fullName("Owner Provider")
                .role(Role.PROVIDER)
                .build();

        destination = Destination.builder()
                .id(50L)
                .name("Chùa Một Cột")
                .deleted(false)
                .createdBy(owner)
                .build();

        content = CulturalContent.builder()
                .id(1L)
                .title("Kiến trúc Chùa Một Cột")
                .contentType("AUDIO")
                .sequenceOrder(1)
                .description("Thuyết minh kiến trúc bông sen nghìn năm")
                .contentText("Nội dung chi tiết...")
                .mediaUrl("https://example.com/audio.mp3")
                .duration(240)
                .playCount(5L)
                .deleted(false)
                .destination(destination)
                .build();
    }

    @Test
    @DisplayName("Get contents by destination id")
    void testGetByDestinationId() {
        when(destinationRepository.findByIdAndDeletedFalse(50L)).thenReturn(Optional.of(destination));
        when(culturalContentRepository.findByDestinationIdAndDeletedFalseAndDestinationDeletedFalseOrderBySequenceOrderAsc(50L))
                .thenReturn(List.of(content));

        List<CulturalContentResponse> responses = culturalContentService.getByDestinationId(50L);

        assertEquals(1, responses.size());
        assertEquals("Kiến trúc Chùa Một Cột", responses.get(0).title());
        assertEquals("AUDIO", responses.get(0).contentType());
        assertEquals(5L, responses.get(0).playCount());
    }

    @Test
    @DisplayName("Create cultural content succeeds for owner PROVIDER")
    void testCreateCulturalContentSuccess() {
        CulturalContentRequest request = new CulturalContentRequest(
                "Kiến trúc Chùa Một Cột", "AUDIO", 1,
                "Thuyết minh", "Nội dung", "https://example.com/audio.mp3", 240
        );

        when(destinationRepository.findByIdAndDeletedFalse(50L)).thenReturn(Optional.of(destination));
        when(culturalContentRepository.save(any(CulturalContent.class))).thenAnswer(i -> {
            CulturalContent c = i.getArgument(0);
            c.setId(10L);
            return c;
        });

        CulturalContentResponse response = culturalContentService.create(50L, request, 1L, Role.PROVIDER);

        assertNotNull(response);
        assertEquals("Kiến trúc Chùa Một Cột", response.title());
        assertEquals("AUDIO", response.contentType());
    }

    @Test
    @DisplayName("Create cultural content throws UNAUTHORIZED when PROVIDER is not owner")
    void testCreateCulturalContentUnauthorized() {
        CulturalContentRequest request = new CulturalContentRequest(
                "Title", "AUDIO", 1, null, null, null, null
        );

        when(destinationRepository.findByIdAndDeletedFalse(50L)).thenReturn(Optional.of(destination));

        AppException ex = assertThrows(AppException.class, () ->
                culturalContentService.create(50L, request, 999L, Role.PROVIDER));
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Play cultural content increments playCount")
    void testPlayCulturalContent() {
        when(culturalContentRepository.findByIdAndDeletedFalseAndDestinationDeletedFalse(1L)).thenReturn(Optional.of(content));
        when(culturalContentRepository.save(any(CulturalContent.class))).thenAnswer(i -> i.getArgument(0));

        CulturalContentResponse response = culturalContentService.play(1L);

        assertNotNull(response);
        assertEquals(6L, response.playCount());
    }

    @Test
    @DisplayName("Soft delete cultural content marks deleted = true")
    void testDeleteCulturalContentSoft() {
        when(culturalContentRepository.findByIdAndDeletedFalseAndDestinationDeletedFalse(1L)).thenReturn(Optional.of(content));
        when(culturalContentRepository.save(any(CulturalContent.class))).thenAnswer(i -> i.getArgument(0));

        culturalContentService.delete(1L, 1L, Role.PROVIDER);

        assertTrue(content.isDeleted());
        verify(culturalContentRepository).save(content);
        verify(culturalContentRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Restore cultural content marks deleted = false")
    void testRestoreCulturalContent() {
        content.setDeleted(true);
        when(culturalContentRepository.findByIdAndDeletedTrue(1L)).thenReturn(Optional.of(content));
        when(culturalContentRepository.save(any(CulturalContent.class))).thenAnswer(i -> i.getArgument(0));

        CulturalContentResponse response = culturalContentService.restore(1L, 1L, Role.PROVIDER);

        assertNotNull(response);
        assertFalse(response.deleted());
        verify(culturalContentRepository).save(content);
    }
}
