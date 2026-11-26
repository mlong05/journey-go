package com.journeygo.modules.tourmerge.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.repository.BookingPassengerRepository;
import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.providerprofile.repository.ProviderProfileRepository;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourSlot;
import com.journeygo.modules.tour.repository.TourSlotRepository;
import com.journeygo.modules.tourmerge.dto.request.CancelTourMergeRequest;
import com.journeygo.modules.tourmerge.dto.request.ConfirmTourMergeRequest;
import com.journeygo.modules.tourmerge.dto.request.CreateTourMergeRequest;
import com.journeygo.modules.tourmerge.dto.request.ReviewTourMergeRequest;
import com.journeygo.modules.tourmerge.dto.request.ValidateTourMergeRequest;
import com.journeygo.modules.tourmerge.dto.response.MergeCandidateSlotResponse;
import com.journeygo.modules.tourmerge.dto.response.MergeableOwnSlotResponse;
import com.journeygo.modules.tourmerge.dto.response.MergedPassengerManifestResponse;
import com.journeygo.modules.tourmerge.dto.response.MergedPassengerManifestResponse.MergedPassengerItem;
import com.journeygo.modules.tourmerge.dto.response.TourMergeResponse;
import com.journeygo.modules.tourmerge.dto.response.TourMergeValidationResponse;
import com.journeygo.modules.tourmerge.entity.TourMerge;
import com.journeygo.modules.tourmerge.entity.enums.TourMergeStatus;
import com.journeygo.modules.tourmerge.repository.TourMergeRepository;
import com.journeygo.modules.tourmerge.support.DepartureTimeParser;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Nghiệp vụ Ghép Tour B2B 1-1: khởi tạo, xác nhận 2 bên, Moderator duyệt (kèm Pessimistic Lock),
 * danh sách hành khách đoàn ghép và hủy/tách đoàn.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TourMergeService {

    private static final List<BookingStatus> ATTENDING_STATUSES = List.of(
            BookingStatus.CONFIRMED, BookingStatus.COMPLETED);

    private static final List<RefundStatus> REFUNDED_OUT_STATUSES = List.of(
            RefundStatus.APPROVED,
            RefundStatus.VNPAY_PROCESSING,
            RefundStatus.MANUAL_TRANSFER_PENDING,
            RefundStatus.REFUND_PROCESSING,
            RefundStatus.REFUNDED);

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final TourMergeRepository tourMergeRepository;
    private final TourSlotRepository tourSlotRepository;
    private final TourMergeValidationService validationService;
    private final BookingPassengerRepository bookingPassengerRepository;
    private final ProviderProfileRepository providerProfileRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<MergeableOwnSlotResponse> listEligibleOwnSlots(Long providerId) {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        List<TourSlot> slots = tourMergeRepository.findEligibleOwnSlots(
                providerId, today, TourMergeStatus.ACTIVE_STATUSES);

        return slots.stream()
                .map(slot -> {
                    Tour tour = slot.getTour();
                    return MergeableOwnSlotResponse.builder()
                            .slotId(slot.getId())
                            .tourId(tour != null ? tour.getTourId() : null)
                            .tourTitle(tour != null ? tour.getTitle() : null)
                            .departureDate(slot.getSlotDate())
                            .departureTimeRaw(tour != null ? tour.getDepartureTime() : null)
                            .parsedDepartureTime(DepartureTimeParser.parse(
                                    tour != null ? tour.getDepartureTime() : null).orElse(null))
                            .meetingPoint(tour != null ? tour.getMeetingPoint() : null)
                            .capacity(slot.getCapacity())
                            .bookedCount(slot.getBookedCount() != null ? slot.getBookedCount() : 0)
                            .build();
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MergeCandidateSlotResponse> listCandidateSlots(Long mySlotId, Long currentProviderId) {
        TourSlot mySlot = loadSlotOrThrow(mySlotId, "Slot của bạn");
        Long myOwnerId = extractOwnerId(mySlot);
        if (!Objects.equals(currentProviderId, myOwnerId)) {
            throw new AppException(ErrorCode.TOUR_MERGE_FORBIDDEN,
                    "Bạn không sở hữu slot này");
        }
        Long myTourId = mySlot.getTour() != null ? mySlot.getTour().getTourId() : null;
        if (myTourId == null) {
            return List.of();
        }

        List<TourSlot> rawCandidates = tourMergeRepository.findOpenUnmergedCandidateSlots(
                mySlot.getSlotDate(), mySlot.getId(), myTourId, TourMergeStatus.ACTIVE_STATUSES);
        if (rawCandidates.isEmpty()) {
            return List.of();
        }

        Set<Long> ownerIds = new HashSet<>();
        for (TourSlot candidate : rawCandidates) {
            Long ownerId = extractOwnerId(candidate);
            if (ownerId != null) {
                ownerIds.add(ownerId);
            }
        }
        Map<Long, String> providerNames = loadProviderNames(ownerIds);

        List<MergeCandidateSlotResponse> matches = new ArrayList<>();
        for (TourSlot candidate : rawCandidates) {
            TourMergeValidationService.ValidationResult result =
                    validationService.evaluate(mySlot, candidate, null, null);
            if (!result.valid()) {
                continue;
            }
            Tour candidateTour = candidate.getTour();
            Long ownerId = extractOwnerId(candidate);
            long timeDiff = DepartureTimeParser.minutesDiff(
                    result.hostDepartureTime(), result.guestDepartureTime());

            matches.add(MergeCandidateSlotResponse.builder()
                    .slotId(candidate.getId())
                    .tourId(candidateTour.getTourId())
                    .tourTitle(candidateTour.getTitle())
                    .providerId(ownerId)
                    .providerName(providerNames.getOrDefault(ownerId,
                            candidateTour.getCreatedBy() != null ? candidateTour.getCreatedBy().getFullName() : null))
                    .sameProvider(Objects.equals(ownerId, currentProviderId))
                    .departureDate(candidate.getSlotDate())
                    .departureTimeRaw(candidateTour.getDepartureTime())
                    .parsedDepartureTime(result.guestDepartureTime())
                    .meetingPoint(candidateTour.getMeetingPoint())
                    .capacity(candidate.getCapacity())
                    .bookedCount(candidate.getBookedCount() != null ? candidate.getBookedCount() : 0)
                    .timeDiffMinutes(timeDiff)
                    .matchedPrefixStops(result.matchedPrefixStops())
                    .build());
        }

        matches.sort(Comparator
                .comparing(MergeCandidateSlotResponse::sameProvider)
                .thenComparing((MergeCandidateSlotResponse c) -> c.matchedPrefixStops().size(), Comparator.reverseOrder())
                .thenComparingLong(MergeCandidateSlotResponse::timeDiffMinutes)
                .thenComparing(MergeCandidateSlotResponse::slotId));
        return matches;
    }

    @Transactional(readOnly = true)
    public TourMergeValidationResponse validateMerge(ValidateTourMergeRequest request, Long currentProviderId) {
        TourSlot hostSlot = loadSlotOrThrow(request.hostSlotId(), "Host");
        TourSlot guestSlot = loadSlotOrThrow(request.guestSlotId(), "Guest");
        verifyOwnerOfEitherSlot(hostSlot, guestSlot, currentProviderId);

        TourMergeValidationService.ValidationResult result = validationService.evaluate(
                hostSlot, guestSlot, request.mergedCapacity(), null);

        return TourMergeValidationResponse.builder()
                .valid(result.valid())
                .errors(result.errorMessages())
                .hostSlotId(hostSlot.getId())
                .guestSlotId(guestSlot.getId())
                .departureDate(hostSlot.getSlotDate())
                .hostDepartureTime(result.hostDepartureTime())
                .guestDepartureTime(result.guestDepartureTime())
                .hostBookedCount(result.hostBookedCount())
                .guestBookedCount(result.guestBookedCount())
                .totalBookedCount(result.totalBookedCount())
                .mergedCapacity(request.mergedCapacity())
                .matchedPrefixStops(result.matchedPrefixStops())
                .build();
    }

    @Transactional
    public TourMergeResponse createMergeRequest(CreateTourMergeRequest request, Long initiatorProviderId) {
        if (request.hostSlotId().equals(request.guestSlotId())) {
            throw new AppException(ErrorCode.TOUR_MERGE_SAME_SLOT);
        }

        TourSlot hostSlot = loadSlotOrThrow(request.hostSlotId(), "Host");
        TourSlot guestSlot = loadSlotOrThrow(request.guestSlotId(), "Guest");

        Long hostOwnerId = extractOwnerId(hostSlot);
        Long guestOwnerId = extractOwnerId(guestSlot);
        if (hostOwnerId == null || guestOwnerId == null) {
            throw new AppException(ErrorCode.TOUR_MERGE_INVALID_PROVIDER,
                    "Không xác định được nhà cung cấp sở hữu tour");
        }
        if (!initiatorProviderId.equals(hostOwnerId) && !initiatorProviderId.equals(guestOwnerId)) {
            throw new AppException(ErrorCode.TOUR_MERGE_FORBIDDEN,
                    "Bạn phải là chủ sở hữu của ít nhất một trong hai slot ghép");
        }
        if (hostOwnerId.equals(guestOwnerId)
                && Objects.equals(hostSlot.getTour().getTourId(), guestSlot.getTour().getTourId())) {
            throw new AppException(ErrorCode.TOUR_MERGE_INVALID_PROVIDER,
                    "Không thể ghép 2 slot của cùng một tour");
        }

        validationService.validateOrThrow(hostSlot, guestSlot, request.mergedCapacity(), null);

        User initiator = initiatorProviderId.equals(hostOwnerId)
                ? hostSlot.getTour().getCreatedBy()
                : guestSlot.getTour().getCreatedBy();
        User target = initiatorProviderId.equals(hostOwnerId)
                ? guestSlot.getTour().getCreatedBy()
                : hostSlot.getTour().getCreatedBy();

        TourMerge merge = TourMerge.builder()
                .hostSlot(hostSlot)
                .guestSlot(guestSlot)
                .initiatorProvider(initiator)
                .targetProvider(target)
                .departureDate(hostSlot.getSlotDate())
                .mergedDepartureTime(request.mergedDepartureTime())
                .mergedMeetingPoint(request.mergedMeetingPoint().trim())
                .mergedCapacity(request.mergedCapacity())
                .targetConfirmed(false)
                .status(TourMergeStatus.PENDING_PROVIDER)
                .note(request.note() != null ? request.note().trim() : null)
                .build();

        TourMerge saved = tourMergeRepository.save(merge);
        log.info("Created tour merge id={} hostSlot={} guestSlot={} initiator={} target={}",
                saved.getId(), hostSlot.getId(), guestSlot.getId(), initiator.getId(), target.getId());
        return toSingleResponse(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<TourMergeResponse> listProviderMerges(Long providerId,
                                                              TourMergeStatus status,
                                                              Pageable pageable) {
        Page<TourMerge> page = status == null
                ? tourMergeRepository.findByProviderId(providerId, pageable)
                : tourMergeRepository.findByProviderIdAndStatus(providerId, status, pageable);
        return toPageResponse(page);
    }

    @Transactional
    public TourMergeResponse confirmOrReject(Long mergeId, ConfirmTourMergeRequest request, Long currentProviderId) {
        TourMerge merge = tourMergeRepository.findByIdForUpdate(mergeId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_MERGE_NOT_FOUND));

        if (merge.getStatus() != TourMergeStatus.PENDING_PROVIDER) {
            throw new AppException(ErrorCode.TOUR_MERGE_INVALID_STATUS,
                    "Yêu cầu ghép không ở trạng thái chờ đối tác xác nhận");
        }
        if (merge.getTargetProvider() == null || !merge.getTargetProvider().getId().equals(currentProviderId)) {
            throw new AppException(ErrorCode.TOUR_MERGE_FORBIDDEN,
                    "Chỉ đối tác nhận yêu cầu mới có quyền xác nhận hoặc từ chối");
        }

        if (Boolean.TRUE.equals(request.confirm())) {
            validationService.validateOrThrow(
                    merge.getHostSlot(), merge.getGuestSlot(), merge.getMergedCapacity(), merge.getId());
            merge.setTargetConfirmed(true);
            merge.setTargetConfirmedAt(Instant.now());
            merge.setStatus(TourMergeStatus.PENDING_MOD);
        } else {
            if (request.rejectReason() == null || request.rejectReason().isBlank()) {
                throw new AppException(ErrorCode.TOUR_MERGE_REJECT_REASON_REQUIRED);
            }
            merge.setTargetConfirmed(false);
            merge.setStatus(TourMergeStatus.REJECTED);
            merge.setRejectReason(request.rejectReason().trim());
        }

        TourMerge saved = tourMergeRepository.save(merge);
        return toSingleResponse(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<TourMergeResponse> listModMerges(TourMergeStatus status, Pageable pageable) {
        TourMergeStatus effectiveStatus = status != null ? status : TourMergeStatus.PENDING_MOD;
        Page<TourMerge> page = tourMergeRepository.findByStatusOrderByCreatedAtDesc(effectiveStatus, pageable);
        return toPageResponse(page);
    }

    @Transactional
    public TourMergeResponse reviewByMod(Long mergeId, ReviewTourMergeRequest request, Long modId) {
        TourMerge merge = tourMergeRepository.findByIdForUpdate(mergeId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_MERGE_NOT_FOUND));

        if (merge.getStatus() != TourMergeStatus.PENDING_MOD) {
            throw new AppException(ErrorCode.TOUR_MERGE_INVALID_STATUS,
                    "Yêu cầu ghép không ở trạng thái chờ Moderator duyệt");
        }

        User modUser = userRepository.findById(modId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (Boolean.FALSE.equals(request.approved())) {
            if (request.rejectReason() == null || request.rejectReason().isBlank()) {
                throw new AppException(ErrorCode.TOUR_MERGE_REJECT_REASON_REQUIRED);
            }
            merge.setStatus(TourMergeStatus.REJECTED);
            merge.setRejectReason(request.rejectReason().trim());
            merge.setApprovedByMod(modUser);
            return toSingleResponse(tourMergeRepository.save(merge));
        }

        Long hostSlotId = merge.getHostSlot().getId();
        Long guestSlotId = merge.getGuestSlot().getId();
        Long firstId = Math.min(hostSlotId, guestSlotId);
        Long secondId = Math.max(hostSlotId, guestSlotId);

        TourSlot firstLocked = tourSlotRepository.findByIdForUpdate(firstId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_MERGE_SLOT_NOT_OPEN));
        TourSlot secondLocked = tourSlotRepository.findByIdForUpdate(secondId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_MERGE_SLOT_NOT_OPEN));

        TourSlot lockedHost = hostSlotId.equals(firstId) ? firstLocked : secondLocked;
        TourSlot lockedGuest = guestSlotId.equals(firstId) ? firstLocked : secondLocked;

        validationService.validateOrThrow(lockedHost, lockedGuest, merge.getMergedCapacity(), merge.getId());

        merge.setStatus(TourMergeStatus.APPROVED);
        merge.setApprovedByMod(modUser);
        TourMerge saved = tourMergeRepository.save(merge);

        log.info("Moderator id={} approved tour merge id={} (hostSlot={}, guestSlot={}, capacity={})",
                modId, saved.getId(), hostSlotId, guestSlotId, saved.getMergedCapacity());
        return toSingleResponse(saved);
    }

    @Transactional(readOnly = true)
    public MergedPassengerManifestResponse getPassengerManifest(Long mergeId, Long requesterId, boolean isModerator) {
        TourMerge merge = tourMergeRepository.findById(mergeId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_MERGE_NOT_FOUND));

        if (!isModerator && !isParticipant(merge, requesterId)) {
            throw new AppException(ErrorCode.TOUR_MERGE_FORBIDDEN);
        }

        Long hostSlotId = merge.getHostSlot().getId();
        Long guestSlotId = merge.getGuestSlot().getId();
        Long hostOwnerId = extractOwnerId(merge.getHostSlot());

        List<Object[]> rows = bookingPassengerRepository.findAttendingPassengersByTourSlotIds(
                List.of(hostSlotId, guestSlotId),
                ATTENDING_STATUSES,
                REFUNDED_OUT_STATUSES
        );

        Set<Long> providerUserIds = new HashSet<>();
        for (Object[] row : rows) {
            Long ownerId = (Long) row[4];
            if (ownerId != null) {
                providerUserIds.add(ownerId);
            }
        }
        Map<Long, String> providerNames = loadProviderNames(providerUserIds);

        List<MergedPassengerItem> items = new ArrayList<>(rows.size());
        int totalSeats = 0;
        for (Object[] row : rows) {
            BookingPassenger passenger = (BookingPassenger) row[0];
            String bookingCode = (String) row[1];
            Long tourId = (Long) row[2];
            String tourTitle = (String) row[3];
            Long ownerId = (Long) row[4];
            Long slotId = (Long) row[5];

            if (passenger.isCountsTowardSlot()) {
                totalSeats++;
            }

            boolean shouldMaskEmail = !isModerator
                    && !Objects.equals(requesterId, hostOwnerId)
                    && !Objects.equals(requesterId, ownerId);

            String email = shouldMaskEmail ? maskEmail(passenger.getEmail()) : passenger.getEmail();

            items.add(MergedPassengerItem.builder()
                    .passengerId(passenger.getId())
                    .bookingCode(bookingCode)
                    .slotId(slotId)
                    .slotRole(slotId.equals(hostSlotId) ? "HOST" : "GUEST")
                    .originalTourId(tourId)
                    .originalTourName(tourTitle)
                    .providerId(ownerId)
                    .providerName(providerNames.getOrDefault(ownerId, ""))
                    .fullName(passenger.getFullName())
                    .birthDate(passenger.getBirthDate())
                    .gender(passenger.getGender())
                    .email(email)
                    .guestType(passenger.getGuestType())
                    .countsTowardSlot(passenger.isCountsTowardSlot())
                    .bookingCustomer(passenger.isBookingCustomer())
                    .build());
        }

        return MergedPassengerManifestResponse.builder()
                .mergeId(merge.getId())
                .status(merge.getStatus())
                .departureDate(merge.getDepartureDate())
                .mergedDepartureTime(merge.getMergedDepartureTime())
                .mergedMeetingPoint(merge.getMergedMeetingPoint())
                .mergedCapacity(merge.getMergedCapacity())
                .totalPassengers(items.size())
                .totalSeatsOccupied(totalSeats)
                .passengers(items)
                .build();
    }

    @Transactional
    public TourMergeResponse cancelMerge(Long mergeId, CancelTourMergeRequest request,
                                         Long requesterId, boolean isModerator) {
        TourMerge merge = tourMergeRepository.findByIdForUpdate(mergeId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_MERGE_NOT_FOUND));

        if (!isModerator && !isParticipant(merge, requesterId)) {
            throw new AppException(ErrorCode.TOUR_MERGE_FORBIDDEN);
        }
        if (!merge.getStatus().isActive()) {
            throw new AppException(ErrorCode.TOUR_MERGE_INVALID_STATUS,
                    "Chỉ có thể hủy yêu cầu ghép đang ở trạng thái hoạt động");
        }

        merge.setStatus(TourMergeStatus.CANCELLED);
        if (request != null && request.reason() != null && !request.reason().isBlank()) {
            merge.setRejectReason(request.reason().trim());
        }
        TourMerge saved = tourMergeRepository.save(merge);
        log.info("Cancelled tour merge id={} by userId={} (moderator={})", mergeId, requesterId, isModerator);
        return toSingleResponse(saved);
    }

    private TourSlot loadSlotOrThrow(Long slotId, String label) {
        return tourSlotRepository.findById(slotId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_MERGE_SLOT_NOT_OPEN,
                        label + " slot (id=" + slotId + ") không tồn tại"));
    }

    private void verifyOwnerOfEitherSlot(TourSlot hostSlot, TourSlot guestSlot, Long providerId) {
        Long hostOwner = extractOwnerId(hostSlot);
        Long guestOwner = extractOwnerId(guestSlot);
        if (!Objects.equals(providerId, hostOwner) && !Objects.equals(providerId, guestOwner)) {
            throw new AppException(ErrorCode.TOUR_MERGE_FORBIDDEN,
                    "Bạn không sở hữu slot nào trong cặp ghép này");
        }
    }

    private Long extractOwnerId(TourSlot slot) {
        Tour tour = slot != null ? slot.getTour() : null;
        return tour != null && tour.getCreatedBy() != null ? tour.getCreatedBy().getId() : null;
    }

    private boolean isParticipant(TourMerge merge, Long userId) {
        if (userId == null) {
            return false;
        }
        Long initiatorId = merge.getInitiatorProvider() != null ? merge.getInitiatorProvider().getId() : null;
        Long targetId = merge.getTargetProvider() != null ? merge.getTargetProvider().getId() : null;
        return userId.equals(initiatorId) || userId.equals(targetId);
    }

    private TourMergeResponse toSingleResponse(TourMerge merge) {
        Set<Long> userIds = new HashSet<>();
        if (merge.getInitiatorProvider() != null) userIds.add(merge.getInitiatorProvider().getId());
        if (merge.getTargetProvider() != null) userIds.add(merge.getTargetProvider().getId());
        Map<Long, String> names = loadProviderNames(userIds);
        return TourMergeResponse.fromEntity(
                merge,
                merge.getInitiatorProvider() != null ? names.get(merge.getInitiatorProvider().getId()) : null,
                merge.getTargetProvider() != null ? names.get(merge.getTargetProvider().getId()) : null
        );
    }

    private PageResponse<TourMergeResponse> toPageResponse(Page<TourMerge> page) {
        Set<Long> userIds = new HashSet<>();
        for (TourMerge m : page.getContent()) {
            if (m.getInitiatorProvider() != null) userIds.add(m.getInitiatorProvider().getId());
            if (m.getTargetProvider() != null) userIds.add(m.getTargetProvider().getId());
        }
        Map<Long, String> names = loadProviderNames(userIds);
        return PageResponse.from(page, m -> TourMergeResponse.fromEntity(
                m,
                m.getInitiatorProvider() != null ? names.get(m.getInitiatorProvider().getId()) : null,
                m.getTargetProvider() != null ? names.get(m.getTargetProvider().getId()) : null
        ));
    }

    private Map<Long, String> loadProviderNames(Set<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> map = new HashMap<>();
        for (ProviderProfile profile : providerProfileRepository.findByUserIds(new ArrayList<>(userIds))) {
            if (profile.getUser() != null) {
                map.put(profile.getUser().getId(), profile.getProviderName());
            }
        }
        return map;
    }

    static String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        int at = email.indexOf('@');
        if (at <= 1) {
            return "***" + (at >= 0 ? email.substring(at) : "");
        }
        String local = email.substring(0, at);
        int visible = Math.min(2, local.length());
        return local.substring(0, visible) + "***" + email.substring(at);
    }
}
