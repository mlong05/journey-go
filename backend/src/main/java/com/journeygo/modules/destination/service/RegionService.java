package com.journeygo.modules.destination.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.destination.dto.RegionRequest;
import com.journeygo.modules.destination.dto.RegionResponse;
import com.journeygo.modules.destination.entity.Region;
import com.journeygo.modules.destination.repository.RegionRepository;
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
public class RegionService {

    private final RegionRepository regionRepository;

    @Transactional(readOnly = true)
    public List<RegionResponse> getAll() {
        return regionRepository.findByDeletedFalse()
                .stream().map(RegionResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public List<RegionResponse> getDeleted() {
        return regionRepository.findByDeletedTrue()
                .stream().map(RegionResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public RegionResponse getById(Long id) {
        return RegionResponse.fromEntity(findOrThrow(id));
    }

    @Transactional(readOnly = true)
    public RegionResponse getBySlug(String slug) {
        return regionRepository.findBySlugAndDeletedFalse(slug)
                .map(RegionResponse::fromEntity)
                .orElseThrow(() -> new AppException(ErrorCode.REGION_NOT_FOUND));
    }

    @Transactional
    public RegionResponse create(RegionRequest request) {
        String slug = (request.slug() != null && !request.slug().isBlank())
                ? toSlug(request.slug())
                : toSlug(request.name());

        if (regionRepository.existsByNameAndDeletedFalse(request.name())
                || regionRepository.existsBySlugAndDeletedFalse(slug)) {
            throw new AppException(ErrorCode.REGION_EXISTED);
        }

        Region region = Region.builder()
                .name(request.name().trim())
                .slug(slug)
                .imageUrl(blankToNull(request.imageUrl()))
                .imageCredit(blankToNull(request.imageCredit()))
                .deleted(false)
                .build();

        Region saved = regionRepository.save(region);
        log.info("Created region id={} name={}", saved.getId(), saved.getName());
        return RegionResponse.fromEntity(saved);
    }

    @Transactional
    public RegionResponse update(Long id, RegionRequest request) {
        Region region = findOrThrow(id);

        String slug = (request.slug() != null && !request.slug().isBlank())
                ? toSlug(request.slug())
                : toSlug(request.name());

        if (regionRepository.existsByNameAndDeletedFalseAndIdNot(request.name().trim(), id)
                || regionRepository.existsBySlugAndDeletedFalseAndIdNot(slug, id)) {
            throw new AppException(ErrorCode.REGION_EXISTED);
        }

        region.setName(request.name().trim());
        region.setSlug(slug);
        // null = giữ ảnh cũ (form đổi tên không gửi ảnh); chuỗi rỗng = bỏ ảnh
        if (request.imageUrl() != null) region.setImageUrl(blankToNull(request.imageUrl()));
        if (request.imageCredit() != null) region.setImageCredit(blankToNull(request.imageCredit()));

        Region saved = regionRepository.save(region);
        log.info("Updated region id={}", saved.getId());
        return RegionResponse.fromEntity(saved);
    }

    /** Soft-delete region */
    @Transactional
    public void delete(Long id) {
        Region region = findOrThrow(id);
        region.setDeleted(true);
        regionRepository.save(region);
        log.info("Soft-deleted region id={}", id);
    }

    /** Restore a soft-deleted region */
    @Transactional
    public RegionResponse restore(Long id) {
        Region region = regionRepository.findByIdAndDeletedTrue(id)
                .orElseThrow(() -> new AppException(ErrorCode.REGION_NOT_FOUND));
        region.setDeleted(false);
        Region saved = regionRepository.save(region);
        log.info("Restored region id={}", saved.getId());
        return RegionResponse.fromEntity(saved);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Region findOrThrow(Long id) {
        return regionRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.REGION_NOT_FOUND));
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
