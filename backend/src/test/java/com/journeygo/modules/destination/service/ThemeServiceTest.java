package com.journeygo.modules.destination.service;

import com.journeygo.modules.destination.dto.ThemeResponse;
import com.journeygo.modules.destination.entity.Theme;
import com.journeygo.modules.destination.repository.ThemeRepository;
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
class ThemeServiceTest {

    @Mock
    private ThemeRepository themeRepository;

    @InjectMocks
    private ThemeService themeService;

    private Theme theme;

    @BeforeEach
    void setUp() {
        theme = Theme.builder()
                .id(1L)
                .name("Du lịch sinh thái")
                .slug("du-lich-sinh-thai")
                .deleted(false)
                .build();
    }

    @Test
    @DisplayName("Soft delete theme sets deleted = true")
    void testDeleteThemeSoft() {
        when(themeRepository.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(theme));
        when(themeRepository.save(any(Theme.class))).thenAnswer(i -> i.getArgument(0));

        themeService.delete(1L);

        assertTrue(theme.isDeleted());
        verify(themeRepository).save(theme);
        verify(themeRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Restore soft-deleted theme sets deleted = false")
    void testRestoreTheme() {
        theme.setDeleted(true);
        when(themeRepository.findByIdAndDeletedTrue(1L)).thenReturn(Optional.of(theme));
        when(themeRepository.save(any(Theme.class))).thenAnswer(i -> i.getArgument(0));

        ThemeResponse response = themeService.restore(1L);

        assertNotNull(response);
        assertFalse(response.deleted());
        assertFalse(theme.isDeleted());
        verify(themeRepository).save(theme);
    }
}
