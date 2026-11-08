package com.journeygo.modules.tour.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.destination.entity.Region;
import com.journeygo.modules.destination.entity.Theme;
import com.journeygo.modules.destination.repository.RegionRepository;
import com.journeygo.modules.destination.repository.ThemeRepository;
import com.journeygo.modules.moderation.service.TourModerationService;
import com.journeygo.modules.providerprofile.service.ProviderProfileService;
import com.journeygo.modules.tour.dto.wizard.TourDetailResponse;
import com.journeygo.modules.tour.dto.wizard.TourSummaryResponse;
import com.journeygo.modules.tour.dto.wizard.TourValidationIssue;
import com.journeygo.modules.tour.dto.wizard.TourWizardRequests;
import com.journeygo.modules.tour.entity.*;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.exception.TourValidationException;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * Luồng đối tác tạo tour 5 bước: lưu nháp từng bước, kiểm tra, gửi duyệt,
 * nhân bản tour bị từ chối, tạm ngừng / mở bán lại.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TourDraftService {

    private final TourRepository tourRepository;
    private final UserRepository userRepository;
    private final RegionRepository regionRepository;
    private final ThemeRepository themeRepository;
    private final ProviderProfileService providerProfileService;
    private final TourSubmissionValidator validator;
    private final TourDetailMapper mapper;
    private final TourSlotService slotService;
    private final TourModerationService moderationService;

    // ── Tạo / đọc ────────────────────────────────────────────────────────────

    @Transactional
    public TourDetailResponse create(TourWizardRequests.CreateDraft request, Long userId) {
        providerProfileService.requireCanManageTours(userId);
        // Cho phép tạo bản nháp chưa đặt tên (vào thẳng wizard); tên trống bị chặn khi gửi duyệt.
        String title = request == null || request.title() == null ? "" : request.title().trim();
        if (!title.isEmpty()) requireValidTitle(title);
        User creator = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        Tour tour = Tour.builder()
                .title(title)
                .tourType(TourType.OTHER)
                .tourFormat(TourFormat.DAY_TRIP)
                .durationDays(1)
                .status(TourStatus.DRAFT)
                .approved(false)
                .deleted(false)
                .createdBy(creator)
                .build();
        Tour saved = tourRepository.save(tour);
        log.info("[TourDraft] user={} tạo bản nháp tour={}", userId, saved.getTourId());
        return mapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<TourSummaryResponse> listMine(Long userId, TourStatus status, Pageable pageable) {
        Page<Tour> page = status == null
                ? tourRepository.findByCreatedBy_IdAndTourFormatIsNotNull(userId, pageable)
                : tourRepository.findByCreatedBy_IdAndTourFormatIsNotNullAndStatus(userId, status, pageable);
        return PageResponse.from(page, TourSummaryResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public TourDetailResponse get(Long tourId, Long userId, Role role) {
        Tour tour = findWizardTour(tourId);
        if (role == null || role.isContentProvider()) requireOwner(tour, userId);
        return mapper.toResponse(tour);
    }

    // ── Bước 1 ───────────────────────────────────────────────────────────────

    @Transactional
    public TourDetailResponse updateBasicInfo(Long tourId, TourWizardRequests.BasicInfo request, Long userId) {
        Tour tour = findOwnedTour(tourId, userId);
        requireContentEditable(tour);

        if (request.title() != null) {
            requireValidTitle(request.title());
            tour.setTitle(request.title().trim());
        }
        TourFormat format = request.tourFormat() != null ? request.tourFormat() : tour.getTourFormat();
        tour.setTourFormat(format);
        if (format == TourFormat.DAY_TRIP) {
            tour.setDurationMinutes(request.durationMinutes());
            tour.setDurationDays(1);
            tour.setDurationNights(null);
        } else {
            Integer days = request.durationDays();
            Integer nights = request.durationNights();
            if (days != null && nights != null && nights > days) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Số đêm không được lớn hơn số ngày");
            }
            tour.setDurationMinutes(null);
            tour.setDurationDays(days == null ? 0 : days);
            tour.setDurationNights(nights);
        }
        tour.setRegion(request.regionId() == null ? null : findRegion(request.regionId()));
        tour.setTheme(request.themeId() == null ? null : findTheme(request.themeId()));
        tour.setDescription(trimToNull(request.description()));
        replaceList(tour.getHighlights(), cleanList(request.highlights()));
        replaceList(tour.getImages(), cleanList(request.images()));
        tour.setCoverImageUrl(trimToNull(request.coverImageUrl()));
        replaceItinerary(tour, request.itinerary());
        tour.setPriceIncludes(trimToNull(request.priceIncludes()));
        tour.setPriceExcludes(trimToNull(request.priceExcludes()));
        tour.setForceMajeure(trimToNull(request.forceMajeure()));
        tour.setRefundPolicy(trimToNull(request.refundPolicy()));
        tour.setContactInfo(trimToNull(request.contactInfo()));
        return save(tour);
    }

    // ── Bước 2 ───────────────────────────────────────────────────────────────

    @Transactional
    public TourDetailResponse updatePricing(Long tourId, TourWizardRequests.Pricing request, Long userId) {
        Tour tour = findOwnedTour(tourId, userId);
        if (!tour.getStatus().isPricingEditable()) throw lockedException(tour);

        List<TourWizardRequests.PriceItem> items = request.prices() == null ? List.of() : request.prices();
        Set<GuestType> seen = EnumSet.noneOf(GuestType.class);
        for (TourWizardRequests.PriceItem item : items) {
            if (!seen.add(item.guestType())) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Loại khách " + item.guestType() + " bị trùng");
            }
        }
        // Cập nhật tại chỗ theo loại khách (tránh vi phạm unique tour_id + guest_type).
        tour.getPrices().removeIf(p -> !seen.contains(p.getGuestType()));
        for (TourWizardRequests.PriceItem item : items) {
            TourPrice price = tour.getPrices().stream()
                    .filter(p -> p.getGuestType() == item.guestType()).findFirst()
                    .orElseGet(() -> {
                        TourPrice created = TourPrice.builder().tour(tour).guestType(item.guestType()).build();
                        tour.getPrices().add(created);
                        return created;
                    });
            BigDecimal value = item.guestType().isAlwaysFree() ? BigDecimal.ZERO : item.price();
            price.setPrice(value == null ? BigDecimal.ZERO : value);
            price.setCountsTowardSlot(Boolean.TRUE.equals(item.countsTowardSlot()));
        }
        // Loại khách chưa nhập giá: xóa dòng để validator báo "Vui lòng nhập giá".
        tour.getPrices().removeIf(p -> !p.getGuestType().isAlwaysFree() && items.stream()
                .anyMatch(i -> i.guestType() == p.getGuestType() && i.price() == null));

        tour.setMaxGuestsPerSlot(request.maxGuestsPerSlot());
        tour.setCancellationPolicy(trimToNull(request.cancellationPolicy()));
        TourDetailResponse response = save(tour);
        if (isLive(tour)) slotService.syncSlots(tour);
        return response;
    }

    // ── Bước 3 ───────────────────────────────────────────────────────────────

    @Transactional
    public TourDetailResponse updateStops(Long tourId, TourWizardRequests.Stops request, Long userId) {
        Tour tour = findOwnedTour(tourId, userId);
        requireContentEditable(tour);

        Map<Long, TourStop> existing = new HashMap<>();
        tour.getStops().forEach(s -> existing.put(s.getId(), s));
        List<TourStop> ordered = new ArrayList<>();
        int order = 1;
        for (TourWizardRequests.StopItem item : request.stops()) {
            TourStop stop;
            if (item.id() != null) {
                stop = existing.remove(item.id());
                if (stop == null) {
                    throw new AppException(ErrorCode.VALIDATION_ERROR, "Điểm đến id=" + item.id() + " không thuộc tour này");
                }
            } else {
                stop = TourStop.builder().tour(tour).build();
            }
            stop.setSequenceOrder(order++);
            applyStop(stop, item);
            ordered.add(stop);
        }
        // Xóa điểm đến không còn trong danh sách, giữ thứ tự mới.
        tour.getStops().removeIf(s -> existing.containsKey(s.getId()));
        for (TourStop stop : ordered) {
            if (stop.getId() == null) tour.getStops().add(stop);
        }
        tour.getStops().sort(Comparator.comparingInt(TourStop::getSequenceOrder));
        return save(tour);
    }

    private void applyStop(TourStop stop, TourWizardRequests.StopItem item) {
        stop.setName(trimToNull(item.name()));
        stop.setShortDescription(trimToNull(item.shortDescription()));
        stop.setGuestNote(trimToNull(item.guestNote()));
        stop.setImageUrl(trimToNull(item.imageUrl()));
        String videoUrl = trimToNull(item.videoUrl());
        stop.setVideoUrl(videoUrl);
        stop.setVideoSource(videoUrl == null ? null : item.videoSource());
        stop.setCulturalContent(trimToNull(item.culturalContent()));
        replaceList(stop.getCulturalImages(), cleanList(item.culturalImages()));

        stop.getArtifacts().clear();
        int a = 1;
        for (TourWizardRequests.ArtifactItem artifact : nullSafe(item.artifacts())) {
            stop.getArtifacts().add(TourStopArtifact.builder()
                    .stop(stop).sequenceOrder(a++)
                    .name(trimToNull(artifact.name()))
                    .imageUrl(trimToNull(artifact.imageUrl()))
                    .shortDescription(trimToNull(artifact.shortDescription()))
                    .videoUrl(trimToNull(artifact.videoUrl()))
                    .videoSource(artifact.videoSource())
                    .build());
        }

        stop.getTasks().clear();
        int t = 1;
        for (TourWizardRequests.TaskItem taskItem : nullSafe(item.tasks())) {
            stop.getTasks().add(buildTask(taskItem, stop, t++));
        }
    }

    /** Nhiệm vụ = quiz + trải nghiệm thực tế. */
    private TourStopTask buildTask(TourWizardRequests.TaskItem item, TourStop stop, int order) {
        TourStopTask task = TourStopTask.builder()
                .stop(stop).sequenceOrder(order)
                .title(trimToNull(item.title()))
                .description(trimToNull(item.description()))
                .build();

        int q = 1;
        for (TourWizardRequests.QuestionItem question : nullSafe(item.quiz())) {
            TourStopQuestion entity = buildQuestion(question, StopQuestionKind.QUIZ, q++);
            entity.setTask(task);
            task.getQuizQuestions().add(entity);
        }

        int e = 1;
        for (TourWizardRequests.ExperienceItem experience : nullSafe(item.experiences())) {
            TourStopExperience entity = TourStopExperience.builder()
                    .stop(stop).task(task).sequenceOrder(e++)
                    .activityName(trimToNull(experience.activityName()))
                    .checkpointLatitude(experience.checkpointLatitude())
                    .checkpointLongitude(experience.checkpointLongitude())
                    .radiusMeters(experience.radiusMeters() == null
                            ? TourStopExperience.DEFAULT_RADIUS_METERS : experience.radiusMeters())
                    .durationSeconds(experience.durationSeconds())
                    .build();
            if (experience.question() != null) {
                TourStopQuestion question = buildQuestion(experience.question(), StopQuestionKind.POST_EXPERIENCE, 1);
                question.setExperience(entity);
                entity.getQuestions().add(question);
            }
            task.getExperiences().add(entity);
        }
        return task;
    }

    private TourStopQuestion buildQuestion(TourWizardRequests.QuestionItem item, StopQuestionKind kind, int order) {
        // Quiz điểm đến và câu hỏi sau trải nghiệm đều chọn được trắc nghiệm hoặc tự luận.
        QuestionType type = item.type() == QuestionType.TEXT ? QuestionType.TEXT : QuestionType.MULTIPLE_CHOICE;
        TourStopQuestion question = TourStopQuestion.builder()
                .kind(kind).questionType(type).sequenceOrder(order).content(trimToNull(item.content()))
                .referenceAnswer(type == QuestionType.TEXT ? trimToNull(item.referenceAnswer()) : null)
                .build();
        if (type == QuestionType.TEXT) return question; // tự luận: không có đáp án lựa chọn
        int n = 1;
        for (TourWizardRequests.AnswerItem answer : nullSafe(item.answers())) {
            question.getAnswers().add(TourStopAnswer.builder()
                    .question(question).sequenceOrder(n++)
                    .content(trimToNull(answer.content()))
                    .correct(Boolean.TRUE.equals(answer.correct()))
                    .build());
        }
        return question;
    }

    // ── Bước 4 ───────────────────────────────────────────────────────────────

    @Transactional
    public TourDetailResponse updateSchedule(Long tourId, TourWizardRequests.Schedule request, Long userId) {
        Tour tour = findOwnedTour(tourId, userId);
        if (!tour.getStatus().isPricingEditable()) throw lockedException(tour);

        Set<LocalDate> wanted = new TreeSet<>(request.departureDates());
        if (isLive(tour)) {
            // BR-06: không được bỏ ngày đã có booking.
            for (LocalDate booked : slotService.bookedDates(tour.getTourId())) {
                if (!wanted.contains(booked)) {
                    throw new AppException(ErrorCode.TOUR_SLOT_HAS_BOOKINGS,
                            "Ngày " + booked + " đã có booking, không thể đóng");
                }
            }
        }
        tour.getDepartureDates().removeIf(d -> !wanted.contains(d.getDepartureDate()));
        Set<LocalDate> kept = new HashSet<>();
        tour.getDepartureDates().forEach(d -> kept.add(d.getDepartureDate()));
        for (LocalDate date : wanted) {
            if (!kept.contains(date)) {
                tour.getDepartureDates().add(TourDepartureDate.builder().tour(tour).departureDate(date).build());
            }
        }
        TourDetailResponse response = save(tour);
        if (isLive(tour)) slotService.syncSlots(tour);
        return response;
    }

    // ── Bước 5: kiểm tra + gửi duyệt ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TourValidationIssue> validate(Long tourId, Long userId) {
        return validator.validate(findOwnedTour(tourId, userId));
    }

    @Transactional
    public TourDetailResponse submit(Long tourId, TourWizardRequests.Submit request, Long userId) {
        Tour tour = findOwnedTour(tourId, userId);
        if (!tour.getStatus().isContentEditable()) {
            throw new AppException(ErrorCode.INVALID_TOUR_STATUS,
                    tour.getStatus() == TourStatus.PENDING_REVIEW
                            ? "Tour đang chờ duyệt, không thể gửi thêm bản khác"
                            : "Chỉ gửi duyệt được tour ở trạng thái Bản nháp hoặc Cần chỉnh sửa");
        }
        tour.setContentRightsConfirmed(request != null && Boolean.TRUE.equals(request.contentRightsConfirmed()));
        List<TourValidationIssue> issues = validator.validate(tour);
        if (!issues.isEmpty()) throw new TourValidationException(issues);

        moderationService.submitWizardTour(tour, userId);
        return mapper.toResponse(tour);
    }

    // ── Thao tác khác ────────────────────────────────────────────────────────

    /** Nhân bản tour bị từ chối (hoặc bất kỳ tour nào của mình) thành bản nháp mới. */
    @Transactional
    public TourDetailResponse duplicate(Long tourId, Long userId) {
        providerProfileService.requireCanManageTours(userId);
        Tour source = findOwnedTour(tourId, userId);
        Tour copy = Tour.builder()
                .title(source.getTitle())
                .tourType(TourType.OTHER)
                .tourFormat(source.getTourFormat())
                .durationMinutes(source.getDurationMinutes())
                .durationDays(source.getDurationDays())
                .durationNights(source.getDurationNights())
                .region(source.getRegion())
                .theme(source.getTheme())
                .description(source.getDescription())
                .priceIncludes(source.getPriceIncludes())
                .priceExcludes(source.getPriceExcludes())
                .forceMajeure(source.getForceMajeure())
                .refundPolicy(source.getRefundPolicy())
                .contactInfo(source.getContactInfo())
                .coverImageUrl(source.getCoverImageUrl())
                .cancellationPolicy(source.getCancellationPolicy())
                .maxGuestsPerSlot(source.getMaxGuestsPerSlot())
                .status(TourStatus.DRAFT)
                .approved(false)
                .deleted(false)
                .createdBy(source.getCreatedBy())
                .build();
        copy.getHighlights().addAll(source.getHighlights());
        for (int i = 0; i < source.getItinerary().size(); i++) {
            TourItineraryDay d = source.getItinerary().get(i);
            copy.getItinerary().add(TourItineraryDay.builder().dayNumber(i + 1)
                    .title(d == null ? null : d.getTitle())
                    .mainActivity(d == null ? null : d.getMainActivity())
                    .content(d == null ? null : d.getContent())
                    .build());
        }
        copy.getImages().addAll(source.getImages());
        for (TourPrice p : source.getPrices()) {
            copy.getPrices().add(TourPrice.builder().tour(copy).guestType(p.getGuestType())
                    .price(p.getPrice()).countsTowardSlot(p.isCountsTowardSlot()).build());
        }
        for (TourStop s : source.getStops()) {
            TourStop stop = TourStop.builder().tour(copy).sequenceOrder(s.getSequenceOrder()).build();
            applyStop(stop, toStopItem(s));
            copy.getStops().add(stop);
        }
        LocalDate today = LocalDate.now(TourSubmissionValidator.ZONE);
        for (TourDepartureDate d : source.getDepartureDates()) {
            if (d.getDepartureDate().isAfter(today)) {
                copy.getDepartureDates().add(TourDepartureDate.builder().tour(copy).departureDate(d.getDepartureDate()).build());
            }
        }
        Tour saved = tourRepository.save(copy);
        log.info("[TourDraft] user={} nhân bản tour={} thành tour={}", userId, tourId, saved.getTourId());
        return mapper.toResponse(saved);
    }

    @Transactional
    public TourDetailResponse pause(Long tourId, Long userId) {
        Tour tour = findOwnedTour(tourId, userId);
        if (tour.getStatus() != TourStatus.PUBLISHED) {
            throw new AppException(ErrorCode.INVALID_TOUR_STATUS, "Chỉ tạm ngừng được tour đang bán");
        }
        tour.setStatus(TourStatus.PAUSED);
        tour.setApproved(false);
        return save(tour);
    }

    @Transactional
    public TourDetailResponse resume(Long tourId, Long userId) {
        Tour tour = findOwnedTour(tourId, userId);
        if (tour.getStatus() != TourStatus.PAUSED) {
            throw new AppException(ErrorCode.INVALID_TOUR_STATUS, "Chỉ mở bán lại được tour đang tạm ngừng");
        }
        providerProfileService.requireCanManageTours(userId);
        tour.setStatus(TourStatus.PUBLISHED);
        tour.setApproved(true);
        TourDetailResponse response = save(tour);
        slotService.syncSlots(tour);
        return response;
    }

    @Transactional
    public void deleteDraft(Long tourId, Long userId) {
        Tour tour = findOwnedTour(tourId, userId);
        if (tour.getStatus() != TourStatus.DRAFT) {
            throw new AppException(ErrorCode.INVALID_TOUR_STATUS, "Chỉ xóa được tour ở trạng thái Bản nháp");
        }
        tour.softDelete();
        tourRepository.save(tour);
        log.info("[TourDraft] user={} xóa bản nháp tour={}", userId, tourId);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private TourDetailResponse save(Tour tour) {
        Tour saved = tourRepository.saveAndFlush(tour);
        return mapper.toResponse(saved);
    }

    private Tour findWizardTour(Long tourId) {
        Tour tour = tourRepository.findByTourId(tourId).orElseThrow(() -> new AppException(ErrorCode.TOUR_NOT_FOUND));
        if (!tour.isWizardTour()) {
            throw new AppException(ErrorCode.TOUR_NOT_FOUND, "Tour này được tạo theo luồng cũ, vui lòng dùng API /api/v1/tours");
        }
        return tour;
    }

    private Tour findOwnedTour(Long tourId, Long userId) {
        Tour tour = findWizardTour(tourId);
        requireOwner(tour, userId);
        return tour;
    }

    private static void requireOwner(Tour tour, Long userId) {
        Long ownerId = tour.getCreatedBy() == null ? null : tour.getCreatedBy().getId();
        if (ownerId == null || !ownerId.equals(userId)) throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    /** BR-03 / BR-04: chỉ DRAFT và CHANGES_REQUESTED được sửa nội dung. */
    private static void requireContentEditable(Tour tour) {
        if (!tour.getStatus().isContentEditable()) throw lockedException(tour);
    }

    private static AppException lockedException(Tour tour) {
        String message = switch (tour.getStatus()) {
            case PENDING_REVIEW -> "Tour đang chờ duyệt, nội dung bị khóa";
            case PUBLISHED, PAUSED -> "Tour đã được duyệt: chỉ sửa được giá và lịch. "
                    + "Sửa nội dung sẽ cần tạo phiên bản mới (chưa hỗ trợ)";
            case REJECTED -> "Tour đã bị từ chối, hãy nhân bản thành bản nháp mới để chỉnh sửa";
            default -> "Không thể sửa tour ở trạng thái hiện tại";
        };
        return new AppException(ErrorCode.INVALID_TOUR_STATUS, message);
    }

    private static boolean isLive(Tour tour) {
        return tour.getStatus() == TourStatus.PUBLISHED || tour.getStatus() == TourStatus.PAUSED;
    }

    private static void requireValidTitle(String title) {
        String error = TourSubmissionValidator.titleError(title);
        if (error != null) throw new AppException(ErrorCode.VALIDATION_ERROR, error);
    }

    private Region findRegion(Long id) {
        return regionRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Khu vực không tồn tại"));
    }

    private Theme findTheme(Long id) {
        return themeRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Chủ đề không tồn tại"));
    }

    private static TourWizardRequests.StopItem toStopItem(TourStop s) {
        return new TourWizardRequests.StopItem(null, s.getName(), s.getShortDescription(), s.getGuestNote(),
                s.getImageUrl(), s.getVideoUrl(), s.getVideoSource(),
                s.getCulturalContent(), List.copyOf(s.getCulturalImages()),
                s.getArtifacts().stream().map(a -> new TourWizardRequests.ArtifactItem(a.getName(), a.getImageUrl(),
                        a.getShortDescription(), a.getVideoUrl(), a.getVideoSource())).toList(),
                s.getTasks().stream().map(TourDraftService::toTaskItem).toList());
    }

    private static TourWizardRequests.TaskItem toTaskItem(TourStopTask t) {
        return new TourWizardRequests.TaskItem(
                t.getTitle(), t.getDescription(),
                t.getQuizQuestions().stream().map(TourDraftService::toQuestionItem).toList(),
                t.getExperiences().stream().map(e -> new TourWizardRequests.ExperienceItem(e.getActivityName(),
                        e.getCheckpointLatitude(), e.getCheckpointLongitude(), e.getRadiusMeters(),
                        e.getDurationSeconds(), e.getQuestion() == null ? null : toQuestionItem(e.getQuestion())))
                        .toList());
    }

    /**
     * Thay lịch trình. null = giữ nguyên (client cũ không gửi trường này).
     * Tour trong ngày chỉ giữ 1 mục.
     */
    private static void replaceItinerary(Tour tour, List<TourWizardRequests.ItineraryDayItem> items) {
        if (items == null) return;
        int limit = tour.getTourFormat() == TourFormat.DAY_TRIP ? 1 : items.size();
        tour.getItinerary().clear();
        for (int i = 0; i < Math.min(limit, items.size()); i++) {
            TourWizardRequests.ItineraryDayItem d = items.get(i);
            tour.getItinerary().add(TourItineraryDay.builder()
                    .dayNumber(i + 1)
                    .title(d == null ? null : trimToNull(d.title()))
                    .mainActivity(d == null ? null : trimToNull(d.mainActivity()))
                    .content(d == null ? null : trimToNull(d.content()))
                    .build());
        }
    }

    private static TourWizardRequests.QuestionItem toQuestionItem(TourStopQuestion q) {
        return new TourWizardRequests.QuestionItem(q.getQuestionType(), q.getContent(), q.getAnswers().stream()
                .map(a -> new TourWizardRequests.AnswerItem(a.getContent(), a.isCorrect())).toList(),
                q.getReferenceAnswer());
    }

    private static <T> List<T> nullSafe(List<T> list) {
        return list == null ? List.of() : list;
    }

    private static List<String> cleanList(List<String> values) {
        if (values == null) return List.of();
        return values.stream().filter(Objects::nonNull).map(String::trim).filter(v -> !v.isEmpty()).toList();
    }

    private static void replaceList(List<String> target, List<String> values) {
        target.clear();
        target.addAll(values);
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
