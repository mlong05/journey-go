package com.journeygo.modules.destination.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.destination.dto.ThemeRequest;
import com.journeygo.modules.destination.dto.ThemeResponse;
import com.journeygo.modules.destination.entity.Theme;
import com.journeygo.modules.destination.repository.ThemeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class ThemeService {

    private final ThemeRepository themeRepository;

    @Transactional(readOnly = true)
    public List<ThemeResponse> getAll() {
        return themeRepository.findByDeletedFalse()
                .stream().map(ThemeResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public List<ThemeResponse> getDeleted() {
        return themeRepository.findByDeletedTrue()
                .stream().map(ThemeResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public ThemeResponse getById(Long id) {
        return ThemeResponse.fromEntity(findOrThrow(id));
    }

    @Transactional(readOnly = true)
    public ThemeResponse getBySlug(String slug) {
        return themeRepository.findBySlugAndDeletedFalse(slug)
                .map(ThemeResponse::fromEntity)
                .orElseThrow(() -> new AppException(ErrorCode.THEME_NOT_FOUND));
    }

    @Transactional
    public ThemeResponse create(ThemeRequest request) {
        String slug = (request.slug() != null && !request.slug().isBlank())
                ? toSlug(request.slug())
                : toSlug(request.name());

        if (themeRepository.existsByNameAndDeletedFalse(request.name())
                || themeRepository.existsBySlugAndDeletedFalse(slug)) {
            throw new AppException(ErrorCode.THEME_EXISTED);
        }

        Theme theme = Theme.builder()
                .name(request.name().trim())
                .slug(slug)
                .imageUrl(blankToNull(request.imageUrl()))
                .imageCredit(blankToNull(request.imageCredit()))
                .deleted(false)
                .build();

        Theme saved = themeRepository.save(theme);
        log.info("Created theme id={} name={}", saved.getId(), saved.getName());
        return ThemeResponse.fromEntity(saved);
    }

    @Transactional
    public ThemeResponse update(Long id, ThemeRequest request) {
        Theme theme = findOrThrow(id);

        String slug = (request.slug() != null && !request.slug().isBlank())
                ? toSlug(request.slug())
                : toSlug(request.name());

        if (themeRepository.existsByNameAndDeletedFalseAndIdNot(request.name().trim(), id)
                || themeRepository.existsBySlugAndDeletedFalseAndIdNot(slug, id)) {
            throw new AppException(ErrorCode.THEME_EXISTED);
        }

        theme.setName(request.name().trim());
        theme.setSlug(slug);
        // null = giữ ảnh cũ (form đổi tên không gửi ảnh); chuỗi rỗng = bỏ ảnh
        if (request.imageUrl() != null) theme.setImageUrl(blankToNull(request.imageUrl()));
        if (request.imageCredit() != null) theme.setImageCredit(blankToNull(request.imageCredit()));

        Theme saved = themeRepository.save(theme);
        log.info("Updated theme id={}", saved.getId());
        return ThemeResponse.fromEntity(saved);
    }

    /** Soft-delete theme */
    @Transactional
    public void delete(Long id) {
        Theme theme = findOrThrow(id);
        theme.setDeleted(true);
        themeRepository.save(theme);
        log.info("Soft-deleted theme id={}", id);
    }

    /** Restore a soft-deleted theme */
    @Transactional
    public ThemeResponse restore(Long id) {
        Theme theme = themeRepository.findByIdAndDeletedTrue(id)
                .orElseThrow(() -> new AppException(ErrorCode.THEME_NOT_FOUND));
        theme.setDeleted(false);
        Theme saved = themeRepository.save(theme);
        log.info("Restored theme id={}", saved.getId());
        return ThemeResponse.fromEntity(saved);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Theme findOrThrow(Long id) {
        return themeRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.THEME_NOT_FOUND));
    }

    private String toSlug(String input) {
        if (input == null) return "";
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        String noAccents = pattern.matcher(normalized).replaceAll("").replace('đ', 'd').replace('Đ', 'D');
        return noAccents.toLowerCase(Locale.ENGLISH)
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("[\\s-]+", "-")
                .replaceAll("^-|-$", "");
    }
}
