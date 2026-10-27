package com.journeygo.modules.destination.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.destination.dto.DestinationRequest;
import com.journeygo.modules.destination.dto.DestinationResponse;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.entity.Region;
import com.journeygo.modules.destination.entity.Theme;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.destination.repository.RegionRepository;
import com.journeygo.modules.destination.repository.ThemeRepository;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import com.journeygo.modules.moderation.service.DestinationModerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class DestinationService {

    private final DestinationRepository destinationRepository;
    private final UserRepository userRepository;
    private final RegionRepository regionRepository;
    private final ThemeRepository themeRepository;
    private final DestinationModerationService moderationService;

    private static final Set<String> ALLOWED_SORT_PROPERTIES = Set.of(
            "id", "name", "address", "latitude", "longitude",
            "capacity", "booked", "status", "approved", "deleted", "regionId", "createdAt", "updatedAt"
    );

    /** Retrieve all non-deleted destinations with pagination and sorting. */
    @Transactional(readOnly = true)
    public PageResponse<DestinationResponse> getAll(Pageable pageable) {
        Page<Destination> page = destinationRepository.findByApprovedTrueAndDeletedFalse(sanitizePageable(pageable));
        return PageResponse.from(page, DestinationResponse::fromEntity);
    }

    /** Retrieve all non-deleted destinations as list. */
    @Transactional(readOnly = true)
    public List<DestinationResponse> getAll() {
        return destinationRepository.findByApprovedTrueAndDeletedFalse()
                .stream().map(DestinationResponse::fromEntity).toList();
    }

    /** Retrieve destinations by region slug with pagination and sorting. */
    @Transactional(readOnly = true)
    public PageResponse<DestinationResponse> getByRegion(String regionSlug, Pageable pageable) {
        Page<Destination> page = destinationRepository.findByRegionSlugAndApprovedTrueAndDeletedFalse(regionSlug, sanitizePageable(pageable));
        return PageResponse.from(page, DestinationResponse::fromEntity);
    }

    /** Retrieve destinations by region slug as list. */
    @Transactional(readOnly = true)
    public List<DestinationResponse> getByRegion(String regionSlug) {
        return destinationRepository.findByRegionSlugAndApprovedTrueAndDeletedFalse(regionSlug)
                .stream().map(DestinationResponse::fromEntity).toList();
    }

    /** Retrieve destinations by theme slug with pagination and sorting. */
    @Transactional(readOnly = true)
    public PageResponse<DestinationResponse> getByTheme(String themeSlug, Pageable pageable) {
        Page<Destination> page = destinationRepository.findByThemesSlugAndApprovedTrueAndDeletedFalse(themeSlug, sanitizePageable(pageable));
        return PageResponse.from(page, DestinationResponse::fromEntity);
    }

    /** Retrieve destinations by theme slug as list. */
    @Transactional(readOnly = true)
    public List<DestinationResponse> getByTheme(String themeSlug) {
        return destinationRepository.findByThemesSlugAndApprovedTrueAndDeletedFalse(themeSlug)
                .stream().map(DestinationResponse::fromEntity).toList();
    }

    /** Retrieve a single non-deleted destination by id. */
    @Transactional(readOnly = true)
    public DestinationResponse getById(Long id) {
        Destination destination = findOrThrow(id);
        if (!destination.isApproved()) throw new AppException(ErrorCode.DESTINATION_NOT_FOUND);
        return DestinationResponse.fromEntity(destination);
    }

    /** Retrieve all soft-deleted destinations with pagination and sorting. */
    @Transactional(readOnly = true)
    public PageResponse<DestinationResponse> getDeleted(Pageable pageable) {
        Page<Destination> page = destinationRepository.findByDeletedTrue(sanitizePageable(pageable));
        return PageResponse.from(page, DestinationResponse::fromEntity);
    }

    /** Retrieve all soft-deleted destinations as list. */
    @Transactional(readOnly = true)
    public List<DestinationResponse> getDeleted() {
        return destinationRepository.findByDeletedTrue()
                .stream().map(DestinationResponse::fromEntity).toList();
    }

    /** Clean and validate Pageable properties to prevent invalid sort property errors from Swagger or query strings. */
    private Pageable sanitizePageable(Pageable pageable) {
        if (pageable == null) {
            return PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        }
        if (pageable.getSort().isUnsorted()) {
            return pageable;
        }

        List<Sort.Order> validOrders = new ArrayList<>();
        for (Sort.Order order : pageable.getSort()) {
            String property = order.getProperty();
            if (property != null) {
                property = property.replaceAll("[\\[\\]\"']", "").trim();
            }
            if (property != null && ALLOWED_SORT_PROPERTIES.contains(property)) {
                validOrders.add(new Sort.Order(order.getDirection(), property));
            }
        }

        if (validOrders.isEmpty()) {
            return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(validOrders));
    }

    /** Create a destination and send it to moderation. */
    @Transactional
    public DestinationResponse create(DestinationRequest request, Long creatorId) {
        if (destinationRepository.existsByNameAndAddressAndDeletedFalse(request.name(), request.address())) {
            throw new AppException(ErrorCode.DESTINATION_EXISTED);
        }
        if (destinationRepository.existsByLatitudeAndLongitudeAndDeletedFalse(request.latitude(), request.longitude())) {
            throw new AppException(ErrorCode.DESTINATION_COORDINATE_EXISTED);
        }

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Region region = null;
        if (request.regionId() != null) {
            region = regionRepository.findByIdAndDeletedFalse(request.regionId())
                    .orElseThrow(() -> new AppException(ErrorCode.REGION_NOT_FOUND));
        }

        Set<Theme> themes = new HashSet<>();
        if (request.themeIds() != null && !request.themeIds().isEmpty()) {
            themes.addAll(themeRepository.findAllByIdInAndDeletedFalse(request.themeIds()));
        }

        Destination destination = Destination.builder()
                .name(request.name().trim())
                .address(request.address().trim())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .capacity(request.capacity())
                .booked(0)
                .approved(false)
                .region(region)
                .themes(themes)
                .deleted(false)
                .createdBy(creator)
                .build();

        Destination saved = destinationRepository.save(destination);
        moderationService.submit(saved.getId(), creatorId, Role.of(Role.PROVIDER));
        log.info("Created destination id={} name={}", saved.getId(), saved.getName());
        return DestinationResponse.fromEntity(saved);
    }

    /** Update an existing destination and reset approval.
     * PROVIDER may only update destinations they created;
     * ADMIN and MODERATOR may update any destination. */
    @Transactional
    public DestinationResponse update(Long id, DestinationRequest request, Long callerId, Role callerRole) {
        Destination existing = findOrThrow(id);

        checkOwnership(existing, callerId, callerRole);
        moderationService.assertCanEdit(id, callerId, callerRole);

        if (destinationRepository.existsByLatitudeAndLongitudeAndDeletedFalseAndIdNot(request.latitude(), request.longitude(), id)) {
            throw new AppException(ErrorCode.DESTINATION_COORDINATE_EXISTED);
        }

        Region region = null;
        if (request.regionId() != null) {
            region = regionRepository.findByIdAndDeletedFalse(request.regionId())
                    .orElseThrow(() -> new AppException(ErrorCode.REGION_NOT_FOUND));
        }

        Set<Theme> themes = new HashSet<>();
        if (request.themeIds() != null && !request.themeIds().isEmpty()) {
            themes.addAll(themeRepository.findAllByIdInAndDeletedFalse(request.themeIds()));
        }

        existing.setName(request.name().trim());
        existing.setAddress(request.address().trim());
        existing.setLatitude(request.latitude());
        existing.setLongitude(request.longitude());
        existing.setCapacity(request.capacity());
        existing.setRegion(region);
        existing.setThemes(themes);

        Destination saved = destinationRepository.save(existing);
        moderationService.submitAfterEdit(saved.getId(), callerId, callerRole);
        log.info("Updated destination id={} by userId={}", saved.getId(), callerId);
        return DestinationResponse.fromEntity(saved);
    }

    /** Soft-delete a destination by id (cascades soft-delete to contents). */
    @Transactional
    public void delete(Long id) {
        Destination destination = findOrThrow(id);
        destination.setDeleted(true);
        if (destination.getContents() != null) {
            destination.getContents().forEach(c -> c.setDeleted(true));
        }
        destinationRepository.save(destination);
        log.info("Soft-deleted destination id={}", id);
    }

    /** Restore a soft-deleted destination (restores associated contents). */
    @Transactional
    public DestinationResponse restore(Long id) {
        Destination destination = destinationRepository.findByIdAndDeletedTrue(id)
                .orElseThrow(() -> new AppException(ErrorCode.DESTINATION_NOT_FOUND));
        destination.setDeleted(false);
        if (destination.getContents() != null) {
            destination.getContents().forEach(c -> c.setDeleted(false));
        }
        Destination saved = destinationRepository.save(destination);
        moderationService.resetAfterRestore(saved.getId());
        log.info("Restored destination id={}", saved.getId());
        return DestinationResponse.fromEntity(saved);
    }

    // ── internal helper ──────────────────────────────────────────────────────

    private Destination findOrThrow(Long id) {
        return destinationRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.DESTINATION_NOT_FOUND));
    }

    private void checkOwnership(Destination destination, Long callerId, Role callerRole) {
        if (callerRole != null && callerRole.isProvider()) {
            Long ownerId = destination.getCreatedBy() != null ? destination.getCreatedBy().getId() : null;
            if (ownerId == null || !ownerId.equals(callerId)) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
        }
    }
}
