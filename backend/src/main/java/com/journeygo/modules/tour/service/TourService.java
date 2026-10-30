package com.journeygo.modules.tour.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.tour.dto.*;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourDestination;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.moderation.service.TourModerationService;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class TourService {

    private final TourRepository tourRepository;
    private final UserRepository userRepository;
    private final DestinationRepository destinationRepository;
    private final TourModerationService moderationService;
    private final TourPricingService pricingService;

    private static final Set<String> ALLOWED_SORT_PROPERTIES = Set.of(
            "tourId", "title", "tourType", "durationDays", "startDate", "endDate",
            "approved", "status", "deleted", "createdAt", "updatedAt"
    );

    // ── Public / read-only queries ────────────────────────────────────────────

    /** All non-deleted tours (paginated). */
    @Transactional(readOnly = true)
    public PageResponse<TourResponse> getAll(Pageable pageable) {
        Page<Tour> page = tourRepository.findAll(sanitizePageable(pageable));
        return toPageResponse(page);
    }

    /** All published / approved tours (public API, paginated). */
    @Transactional(readOnly = true)
    public PageResponse<TourResponse> getPublished(Pageable pageable) {
        Page<Tour> page = tourRepository.findByApprovedTrue(sanitizePageable(pageable));
        return toPageResponse(page);
    }

    /** Tours created by a specific user (paginated). */
    @Transactional(readOnly = true)
    public PageResponse<TourResponse> getByCreator(Long creatorId, Pageable pageable) {
        Page<Tour> page = tourRepository.findByCreatedBy_Id(creatorId, sanitizePageable(pageable));
        return toPageResponse(page);
    }

    /** Single tour by ID. */
    @Transactional(readOnly = true)
    public TourResponse getById(Long tourId) {
        moderationService.requireApproved(tourId);
        Tour tour = findOrThrow(tourId);
        return pricingService.toResponse(tour);
    }

    /** Soft-deleted tours (admin / moderator). */
    @Transactional(readOnly = true)
    public PageResponse<TourResponse> getDeleted(Pageable pageable) {
        Pageable pagination = pageable == null
                ? PageRequest.of(0, 10)
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Page<Tour> page = tourRepository.findDeleted(pagination);
        return toPageResponse(page);
    }

    // ── Create / Update ───────────────────────────────────────────────────────

    /** Create a tour and send it to moderation. */
    @Transactional
    public TourResponse create(TourRequest request, Long creatorId) {
        validateDateRange(request);
        if (tourRepository.existsByTitle(request.title())) {
            throw new AppException(ErrorCode.TOUR_EXISTED);
        }

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Tour tour = Tour.builder()
                .title(request.title().trim())
                .tourType(request.tourType())
                .durationDays(request.durationDays())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .coverImageUrl(cleanCoverUrl(request.coverImageUrl()))
                .approved(false)
                .deleted(false)
                .createdBy(creator)
                .build();

        attachDestinations(tour, request.destinations());

        Tour saved = tourRepository.save(tour);
        moderationService.submit(saved.getTourId(), creatorId, Role.of(Role.PROVIDER));
        log.info("Created tour id={} title={}", saved.getTourId(), saved.getTitle());
        return pricingService.toResponse(saved);
    }

    /** Update an existing tour and reset it to DRAFT for re-review.
     *  PROVIDER may only update their own tours. */
    @Transactional
    public TourResponse update(Long tourId, TourRequest request, Long callerId, Role callerRole) {
        validateDateRange(request);
        Tour existing = findOrThrow(tourId);
        checkOwnership(existing, callerId, callerRole);
        moderationService.assertCanEdit(tourId, callerId, callerRole);

        if (tourRepository.existsByTitleAndTourIdNot(request.title(), tourId)) {
            throw new AppException(ErrorCode.TOUR_EXISTED);
        }

        existing.setTitle(request.title().trim());
        existing.setTourType(request.tourType());
        existing.setDurationDays(request.durationDays());
        existing.setStartDate(request.startDate());
        existing.setEndDate(request.endDate());
        existing.setCoverImageUrl(cleanCoverUrl(request.coverImageUrl()));

        // Replace destinations
        existing.getTourDestinations().clear();
        attachDestinations(existing, request.destinations());

        Tour saved = tourRepository.save(existing);
        moderationService.submitAfterEdit(saved.getTourId(), callerId, callerRole);
        log.info("Updated tour id={} by userId={}", saved.getTourId(), callerId);
        return pricingService.toResponse(saved);
    }

    // ── Soft-delete / Restore ─────────────────────────────────────────────────

    /** Soft-delete a tour (ADMIN / MODERATOR). */
    @Transactional
    public void delete(Long tourId) {
        Tour tour = findOrThrow(tourId);
        tour.softDelete();
        tourRepository.save(tour);
        log.info("Soft-deleted tour id={}", tourId);
    }

    /** Restore a soft-deleted tour (ADMIN / MODERATOR). */
    @Transactional
    public TourResponse restore(Long tourId) {
        Tour tour = tourRepository.findDeletedByTourId(tourId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_NOT_FOUND));
        tour.softRestore();
        Tour saved = tourRepository.save(tour);
        moderationService.resetAfterRestore(saved.getTourId());
        log.info("Restored tour id={}", saved.getTourId());
        return pricingService.toResponse(saved);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private PageResponse<TourResponse> toPageResponse(Page<Tour> page) {
        return PageResponse.from(page, pricingService.mapperFor(page.getContent()));
    }

    /** Ảnh bìa tour: bỏ trống thì lưu null (dùng ảnh điểm đến), chỉ nhận đường dẫn https. */
    private String cleanCoverUrl(String url) {
        if (url == null || url.isBlank()) return null;
        String trimmed = url.trim();
        if (!trimmed.regionMatches(true, 0, "https://", 0, 8)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ảnh bìa tour phải là đường dẫn https hợp lệ");
        }
        return trimmed;
    }

    private void validateDateRange(TourRequest request) {
        if (request.startDate() != null && request.endDate() != null
                && request.endDate().isBefore(request.startDate())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu");
        }
    }

    private Tour findOrThrow(Long tourId) {
        return tourRepository.findByTourId(tourId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_NOT_FOUND));
    }

    private void checkOwnership(Tour tour, Long callerId, Role callerRole) {
        if (callerRole != null && callerRole.isProvider()) {
            Long ownerId = tour.getCreatedBy() != null ? tour.getCreatedBy().getId() : null;
            if (ownerId == null || !ownerId.equals(callerId)) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
        }
    }

    private void attachDestinations(Tour tour, List<TourDestinationRequest> destRequests) {
        List<TourDestination> tourDestinations = new ArrayList<>();
        for (TourDestinationRequest dr : destRequests) {
            Destination destination = destinationRepository.findByIdAndDeletedFalse(dr.destinationId())
                    .orElseThrow(() -> new AppException(ErrorCode.DESTINATION_NOT_FOUND));
            // Tour chỉ được gắn điểm đến đã qua thẩm định
            if (!destination.isApproved()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR,
                        "Điểm đến \"" + destination.getName() + "\" chưa được duyệt, không thể thêm vào tour");
            }
            tourDestinations.add(TourDestination.builder()
                    .tour(tour)
                    .destination(destination)
                    .sequenceOrder(dr.sequenceOrder())
                    .build());
        }
        tour.getTourDestinations().addAll(tourDestinations);
    }

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
            return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                    Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(validOrders));
    }
}
