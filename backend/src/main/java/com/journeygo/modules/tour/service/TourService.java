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
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
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
    private final TourDetailMapper detailMapper;
    private final com.journeygo.modules.providerprofile.service.ProviderProfileService providerProfileService;

    private static final Set<String> ALLOWED_SORT_PROPERTIES = Set.of(
            "tourId", "title", "tourType", "durationDays", "startDate", "endDate",
            "approved", "status", "deleted", "createdAt", "updatedAt"
    );

    // ── Public / read-only queries ────────────────────────────────────────────

    /** Tour chưa xóa, trừ bản nháp (chưa gửi duyệt thì kiểm duyệt viên không cần thấy). */
    @Transactional(readOnly = true)
    public PageResponse<TourResponse> getAll(Pageable pageable) {
        Page<Tour> page = tourRepository.findByStatusNot(com.journeygo.modules.tour.entity.enums.TourStatus.DRAFT, sanitizePageable(pageable));
        return toPageResponse(page);
    }

    /** All published / approved tours (public API, paginated). */
    @Transactional(readOnly = true)
    public PageResponse<TourResponse> getPublished(Pageable pageable) {
        return searchPublished(TourSearchFilter.none(), pageable);
    }

    /**
     * Tour đã xuất bản theo bộ lọc. Lọc vùng miền / chủ đề / hình thức chạy trong DB; tìm theo từ khóa
     * (không dấu) và sắp theo giá / ngày khởi hành — hai giá trị được tính, không phải cột — chạy trên
     * danh sách đã lọc rồi mới phân trang. Số tour xuất bản nhỏ nên cách này đủ nhanh.
     */
    @Transactional(readOnly = true)
    public PageResponse<TourResponse> searchPublished(TourSearchFilter filter, Pageable pageable) {
        Pageable paging = sanitizePageable(pageable);
        Specification<Tour> spec = publishedSpec(filter);
        if (filter.databaseOnly()) {
            return toPageResponse(tourRepository.findAll(spec, paging));
        }

        List<Tour> tours = tourRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));
        if (filter.q() != null) {
            String keyword = TextAnswerMatcher.normalize(filter.q());
            tours = tours.stream().filter(t -> searchText(t).contains(keyword)).toList();
        }
        List<TourResponse> responses = new ArrayList<>(tours.stream().map(pricingService.mapperFor(tours)).toList());
        switch (filter.order()) {
            case PRICE_ASC -> responses.sort(Comparator.comparing(TourService::priceOf));
            case PRICE_DESC -> responses.sort(Comparator.comparing(TourService::priceOf).reversed());
            case DEPARTURE -> responses.sort(Comparator.comparing(TourResponse::nextDepartureDate,
                    Comparator.nullsLast(Comparator.naturalOrder())));
            case NEWEST -> { /* đã sắp theo createdAt */ }
        }

        int from = (int) Math.min(paging.getOffset(), responses.size());
        int to = Math.min(from + paging.getPageSize(), responses.size());
        Page<TourResponse> page = new PageImpl<>(responses.subList(from, to),
                PageRequest.of(paging.getPageNumber(), paging.getPageSize()), responses.size());
        return PageResponse.from(page);
    }

    /** Chi tiết tour công khai cho du khách (chỉ tour đã duyệt). */
    @Transactional(readOnly = true)
    public TourPublicDetailResponse getPublicDetail(Long tourId) {
        moderationService.requireApproved(tourId);
        Tour tour = findOrThrow(tourId);
        TourResponse summary = pricingService.toResponse(tour);
        if (!tour.isWizardTour()) {
            return TourPublicDetailResponse.fromLegacy(summary);
        }
        return TourPublicDetailResponse.fromWizard(detailMapper.toResponse(tour), summary.price(), LocalDate.now());
    }

    /**
     * Nội dung văn hoá của một điểm dừng (tour 5 bước). Không kiểm tra quyền: nơi gọi phải bảo đảm
     * du khách đã check-in tại điểm dừng này.
     */
    @Transactional(readOnly = true)
    public StopCultureResponse getStopCulture(Long tourId, Long stopId) {
        Tour tour = findOrThrow(tourId);
        if (!tour.isWizardTour()) {
            throw new AppException(ErrorCode.TOUR_NOT_FOUND);
        }
        return detailMapper.toResponse(tour).stops().stream()
                .filter(s -> s.id().equals(stopId))
                .findFirst()
                .map(StopCultureResponse::from)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_NOT_FOUND));
    }

    private static Specification<Tour> publishedSpec(TourSearchFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("approved")));
            if (filter.regionId() != null) predicates.add(cb.equal(root.get("region").get("id"), filter.regionId()));
            if (filter.themeId() != null) predicates.add(cb.equal(root.get("theme").get("id"), filter.themeId()));
            if (filter.format() != null) predicates.add(cb.equal(root.get("tourFormat"), filter.format()));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    /** Chuỗi để tìm kiếm: tên tour, vùng miền, chủ đề (đã bỏ dấu). */
    private static String searchText(Tour tour) {
        StringBuilder text = new StringBuilder(tour.getTitle() == null ? "" : tour.getTitle());
        if (tour.getRegion() != null) text.append(' ').append(tour.getRegion().getName());
        if (tour.getTheme() != null) text.append(' ').append(tour.getTheme().getName());
        return TextAnswerMatcher.normalize(text.toString());
    }

    private static BigDecimal priceOf(TourResponse tour) {
        return tour.price() == null ? BigDecimal.ZERO : tour.price();
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
        // BR-01: chỉ đối tác đã được Admin duyệt mới tạo tour.
        if (creator.getRole() != null && Role.CONTENT_PROVIDER.equalsIgnoreCase(creator.getRole().getName())) {
            providerProfileService.requireCanManageTours(creatorId);
        }

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
        moderationService.submit(saved.getTourId(), creatorId, Role.of(Role.CONTENT_PROVIDER));
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
        if (callerRole != null && callerRole.isContentProvider()) {
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
