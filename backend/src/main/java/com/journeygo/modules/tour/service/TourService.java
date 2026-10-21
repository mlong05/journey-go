package com.journeygo.modules.tour.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.tour.dto.*;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourDestination;
import com.journeygo.modules.tour.entity.TourStatus;
import com.journeygo.modules.tour.repository.TourRepository;
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

    private static final Set<String> ALLOWED_SORT_PROPERTIES = Set.of(
            "tourId", "title", "tourType", "price", "durationDays",
            "approved", "status", "deleted", "createdAt", "updatedAt"
    );

    // ── Public / read-only queries ────────────────────────────────────────────

    /** All non-deleted tours (paginated). */
    @Transactional(readOnly = true)
    public PageResponse<TourResponse> getAll(Pageable pageable) {
        Page<Tour> page = tourRepository.findAll(sanitizePageable(pageable));
        return PageResponse.from(page, TourResponse::fromEntity);
    }

    /** All published / approved tours (public API, paginated). */
    @Transactional(readOnly = true)
    public PageResponse<TourResponse> getPublished(Pageable pageable) {
        Page<Tour> page = tourRepository.findByApprovedTrue(sanitizePageable(pageable));
        return PageResponse.from(page, TourResponse::fromEntity);
    }

    /** Tours by workflow status (paginated). */
    @Transactional(readOnly = true)
    public PageResponse<TourResponse> getByStatus(TourStatus status, Pageable pageable) {
        Page<Tour> page = tourRepository.findByStatus(status, sanitizePageable(pageable));
        return PageResponse.from(page, TourResponse::fromEntity);
    }

    /** Tours created by a specific user (paginated). */
    @Transactional(readOnly = true)
    public PageResponse<TourResponse> getByCreator(Long creatorId, Pageable pageable) {
        Page<Tour> page = tourRepository.findByCreatedBy_Id(creatorId, sanitizePageable(pageable));
        return PageResponse.from(page, TourResponse::fromEntity);
    }

    /** Single tour by ID. */
    @Transactional(readOnly = true)
    public TourResponse getById(Long tourId) {
        return TourResponse.fromEntity(findOrThrow(tourId));
    }

    /** Soft-deleted tours (admin / moderator). */
    @Transactional(readOnly = true)
    public PageResponse<TourResponse> getDeleted(Pageable pageable) {
        Pageable pagination = pageable == null
                ? PageRequest.of(0, 10)
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Page<Tour> page = tourRepository.findDeleted(pagination);
        return PageResponse.from(page, TourResponse::fromEntity);
    }

    // ── Create / Update ───────────────────────────────────────────────────────

    /** Create a new tour in DRAFT status. */
    @Transactional
    public TourResponse create(TourRequest request, Long creatorId) {
        if (tourRepository.existsByTitle(request.title())) {
            throw new AppException(ErrorCode.TOUR_EXISTED);
        }

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Tour tour = Tour.builder()
                .title(request.title().trim())
                .tourType(request.tourType())
                .price(request.price())
                .durationDays(request.durationDays())
                .approved(false)
                .status(TourStatus.DRAFT)
                .deleted(false)
                .createdBy(creator)
                .build();

        attachDestinations(tour, request.destinations());

        Tour saved = tourRepository.save(tour);
        log.info("Created tour id={} title={}", saved.getTourId(), saved.getTitle());
        return TourResponse.fromEntity(saved);
    }

    /** Update an existing tour and reset it to DRAFT for re-review.
     *  PROVIDER may only update their own tours. */
    @Transactional
    public TourResponse update(Long tourId, TourRequest request, Long callerId, Role callerRole) {
        Tour existing = findOrThrow(tourId);
        checkOwnership(existing, callerId, callerRole);

        if (tourRepository.existsByTitleAndTourIdNot(request.title(), tourId)) {
            throw new AppException(ErrorCode.TOUR_EXISTED);
        }

        existing.setTitle(request.title().trim());
        existing.setTourType(request.tourType());
        existing.setPrice(request.price());
        existing.setDurationDays(request.durationDays());
        existing.setStatus(TourStatus.DRAFT);
        existing.setApproved(false);
        existing.setRejectionReason(null);

        // Replace destinations
        existing.getTourDestinations().clear();
        attachDestinations(existing, request.destinations());

        Tour saved = tourRepository.save(existing);
        log.info("Updated tour id={} by userId={}", saved.getTourId(), callerId);
        return TourResponse.fromEntity(saved);
    }

    // ── Workflow ──────────────────────────────────────────────────────────────

    /** Submit tour for review (PROVIDER / ADMIN / MODERATOR). */
    @Transactional
    public TourResponse submit(Long tourId, Long callerId, Role callerRole) {
        Tour tour = findOrThrow(tourId);
        checkOwnership(tour, callerId, callerRole);
        tour.submit();
        Tour saved = tourRepository.save(tour);
        log.info("Submitted tour id={} for review", saved.getTourId());
        return TourResponse.fromEntity(saved);
    }

    /** Publish tour (ADMIN / MODERATOR). */
    @Transactional
    public TourResponse publish(Long tourId) {
        Tour tour = findOrThrow(tourId);
        tour.publish();
        Tour saved = tourRepository.save(tour);
        log.info("Published tour id={}", saved.getTourId());
        return TourResponse.fromEntity(saved);
    }

    /** Reject tour with a mandatory reason (ADMIN / MODERATOR). */
    @Transactional
    public TourResponse reject(Long tourId, String reason) {
        Tour tour = findOrThrow(tourId);
        tour.reject(reason);
        Tour saved = tourRepository.save(tour);
        log.info("Rejected tour id={} reason={}", saved.getTourId(), reason);
        return TourResponse.fromEntity(saved);
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
        tour.setApproved(false);
        tour.setStatus(TourStatus.DRAFT);
        tour.setRejectionReason(null);
        Tour saved = tourRepository.save(tour);
        log.info("Restored tour id={}", saved.getTourId());
        return TourResponse.fromEntity(saved);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private Tour findOrThrow(Long tourId) {
        return tourRepository.findByTourId(tourId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_NOT_FOUND));
    }

    private void checkOwnership(Tour tour, Long callerId, Role callerRole) {
        if (callerRole == Role.PROVIDER) {
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
