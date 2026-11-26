package com.journeygo.modules.tourmerge.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourDestination;
import com.journeygo.modules.tour.entity.TourSlot;
import com.journeygo.modules.tour.entity.TourSlotStatus;
import com.journeygo.modules.tour.entity.TourStop;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tourmerge.dto.response.TourMergeValidationResponse.MatchedPrefixStop;
import com.journeygo.modules.tourmerge.entity.enums.TourMergeStatus;
import com.journeygo.modules.tourmerge.repository.TourMergeRepository;
import com.journeygo.modules.tourmerge.support.DepartureTimeParser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Bộ quy tắc kiểm tra hợp lệ khi ghép đoàn B2B 1-1:
 * <ol>
 *   <li>Khác slot, cả 2 slot đang OPEN, ngày >= hôm nay, tour đang PUBLISHED.</li>
 *   <li>Quy tắc 1-1 nghiêm ngặt: cả 2 slot chưa tham gia tour_merges nào ở trạng thái hoạt động.</li>
 *   <li>Cùng ngày khởi hành &amp; độ lệch giờ khởi hành &le; 30 phút.</li>
 *   <li>Prefix Destination Matching: khớp ít nhất N điểm đầu theo đúng thứ tự
 *       (so theo {@code destination_id} nếu có, hoặc theo GPS Haversine &le; 500m / tên chuẩn hóa của {@code TourStop}).</li>
 *   <li>Tổng khách đã đặt của 2 slot &le; {@code mergedCapacity} (nếu có truyền).</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
public class TourMergeValidationService {

    public static final long MAX_DEPARTURE_TIME_DIFF_MINUTES = 30L;
    public static final double MAX_STOP_DISTANCE_METERS = 500.0;
    public static final int MIN_MATCHED_PREFIX_STOPS = 1;
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Pattern DIACRITICS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private final TourMergeRepository tourMergeRepository;

    public record ValidationIssue(ErrorCode errorCode, String message) {
    }

    public record ValidationResult(
            boolean valid,
            List<ValidationIssue> issues,
            LocalTime hostDepartureTime,
            LocalTime guestDepartureTime,
            int hostBookedCount,
            int guestBookedCount,
            int totalBookedCount,
            List<MatchedPrefixStop> matchedPrefixStops
    ) {
        public List<String> errorMessages() {
            return issues.stream().map(ValidationIssue::message).toList();
        }
    }

    public void validateOrThrow(TourSlot hostSlot, TourSlot guestSlot, Integer mergedCapacity, Long excludeMergeId) {
        ValidationResult result = evaluate(hostSlot, guestSlot, mergedCapacity, excludeMergeId);
        if (!result.valid()) {
            ValidationIssue first = result.issues().get(0);
            throw new AppException(first.errorCode(), first.message());
        }
    }

    public ValidationResult evaluate(TourSlot hostSlot, TourSlot guestSlot, Integer mergedCapacity, Long excludeMergeId) {
        List<ValidationIssue> issues = new ArrayList<>();

        if (hostSlot == null || guestSlot == null) {
            issues.add(new ValidationIssue(ErrorCode.TOUR_MERGE_SLOT_NOT_OPEN, "Không tìm thấy thông tin slot cần ghép"));
            return new ValidationResult(false, issues, null, null, 0, 0, 0, List.of());
        }

        if (hostSlot.getId() != null && hostSlot.getId().equals(guestSlot.getId())) {
            issues.add(new ValidationIssue(ErrorCode.TOUR_MERGE_SAME_SLOT,
                    ErrorCode.TOUR_MERGE_SAME_SLOT.getMessage()));
        }

        validateSlotAndTourOpen(hostSlot, "Slot chủ (Host)", issues);
        validateSlotAndTourOpen(guestSlot, "Slot khách (Guest)", issues);

        validateOneToOneRule(hostSlot.getId(), excludeMergeId, "Host", issues);
        validateOneToOneRule(guestSlot.getId(), excludeMergeId, "Guest", issues);

        if (hostSlot.getSlotDate() == null || guestSlot.getSlotDate() == null
                || !hostSlot.getSlotDate().equals(guestSlot.getSlotDate())) {
            issues.add(new ValidationIssue(ErrorCode.TOUR_MERGE_DATE_MISMATCH,
                    ErrorCode.TOUR_MERGE_DATE_MISMATCH.getMessage()));
        }

        Tour hostTour = hostSlot.getTour();
        Tour guestTour = guestSlot.getTour();
        Optional<LocalTime> hostTimeOpt = DepartureTimeParser.parse(hostTour != null ? hostTour.getDepartureTime() : null);
        Optional<LocalTime> guestTimeOpt = DepartureTimeParser.parse(guestTour != null ? guestTour.getDepartureTime() : null);

        if (hostTimeOpt.isEmpty() || guestTimeOpt.isEmpty()) {
            issues.add(new ValidationIssue(ErrorCode.TOUR_MERGE_TIME_DIFF_EXCEEDED,
                    "Không xác định được giờ khởi hành của một trong hai tour để kiểm tra độ lệch"));
        } else {
            long diffMinutes = DepartureTimeParser.minutesDiff(hostTimeOpt.get(), guestTimeOpt.get());
            if (diffMinutes > MAX_DEPARTURE_TIME_DIFF_MINUTES) {
                issues.add(new ValidationIssue(ErrorCode.TOUR_MERGE_TIME_DIFF_EXCEEDED,
                        "Giờ khởi hành của hai tour chênh lệch " + diffMinutes
                                + " phút (tối đa cho phép " + MAX_DEPARTURE_TIME_DIFF_MINUTES + " phút)"));
            }
        }

        List<MatchedPrefixStop> matchedPrefix = matchPrefixStops(hostTour, guestTour);
        if (matchedPrefix.size() < MIN_MATCHED_PREFIX_STOPS) {
            issues.add(new ValidationIssue(ErrorCode.TOUR_MERGE_PREFIX_MISMATCH,
                    "Hai tour không trùng khớp điểm đến chặng đầu theo đúng thứ tự"));
        }

        int hostBooked = hostSlot.getBookedCount() != null ? hostSlot.getBookedCount() : 0;
        int guestBooked = guestSlot.getBookedCount() != null ? guestSlot.getBookedCount() : 0;
        int totalBooked = hostBooked + guestBooked;

        if (mergedCapacity != null) {
            if (mergedCapacity <= 0 || totalBooked > mergedCapacity) {
                issues.add(new ValidationIssue(ErrorCode.TOUR_MERGE_CAPACITY_EXCEEDED,
                        "Tổng số khách đã đặt (" + totalBooked + ") vượt quá sức chứa ghép (" + mergedCapacity + ")"));
            }
        }

        return new ValidationResult(
                issues.isEmpty(),
                issues,
                hostTimeOpt.orElse(null),
                guestTimeOpt.orElse(null),
                hostBooked,
                guestBooked,
                totalBooked,
                matchedPrefix
        );
    }

    private void validateSlotAndTourOpen(TourSlot slot, String label, List<ValidationIssue> issues) {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        if (slot.getStatus() != TourSlotStatus.OPEN) {
            issues.add(new ValidationIssue(ErrorCode.TOUR_MERGE_SLOT_NOT_OPEN,
                    label + " không ở trạng thái OPEN"));
        } else if (slot.getSlotDate() != null && slot.getSlotDate().isBefore(today)) {
            issues.add(new ValidationIssue(ErrorCode.TOUR_MERGE_SLOT_NOT_OPEN,
                    label + " có ngày khởi hành đã qua (" + slot.getSlotDate() + ")"));
        }

        Tour tour = slot.getTour();
        if (tour == null || tour.isDeleted() || tour.getStatus() != TourStatus.PUBLISHED) {
            issues.add(new ValidationIssue(ErrorCode.TOUR_MERGE_SLOT_NOT_OPEN,
                    label + " không thuộc tour đang ở trạng thái PUBLISHED"));
        }
    }

    private void validateOneToOneRule(Long slotId, Long excludeMergeId, String label, List<ValidationIssue> issues) {
        if (slotId == null) {
            return;
        }
        boolean exists = excludeMergeId == null
                ? tourMergeRepository.existsActiveMergeForSlot(slotId, TourMergeStatus.ACTIVE_STATUSES)
                : tourMergeRepository.existsActiveMergeForSlotExcluding(slotId, excludeMergeId, TourMergeStatus.ACTIVE_STATUSES);
        if (exists) {
            issues.add(new ValidationIssue(ErrorCode.TOUR_MERGE_SLOT_ALREADY_IN_MERGE,
                    label + " slot (id=" + slotId + ") đã nằm trong một yêu cầu ghép đang hoạt động"));
        }
    }

    /**
     * Khớp tiền tố chặng đầu theo đúng thứ tự index 0, 1, 2...:
     * ưu tiên {@code TourDestination.destination.id} nếu cả 2 tour đều có; nếu không dùng {@code TourStop}
     * (Haversine &le; 500m hoặc tên chuẩn hóa). Dừng ngay tại điểm đầu tiên không khớp.
     */
    public List<MatchedPrefixStop> matchPrefixStops(Tour hostTour, Tour guestTour) {
        if (hostTour == null || guestTour == null) {
            return List.of();
        }
        List<TourDestination> hostDests = hostTour.getTourDestinations() == null
                ? List.of() : hostTour.getTourDestinations();
        List<TourDestination> guestDests = guestTour.getTourDestinations() == null
                ? List.of() : guestTour.getTourDestinations();

        if (!hostDests.isEmpty() && !guestDests.isEmpty()) {
            return matchByDestinationId(hostDests, guestDests);
        }

        List<TourStop> hostStops = hostTour.getStops() == null ? List.of() : hostTour.getStops();
        List<TourStop> guestStops = guestTour.getStops() == null ? List.of() : guestTour.getStops();
        return matchByTourStops(hostStops, guestStops);
    }

    private List<MatchedPrefixStop> matchByDestinationId(List<TourDestination> hostDests,
                                                         List<TourDestination> guestDests) {
        List<TourDestination> sortedHost = hostDests.stream()
                .sorted(Comparator.comparingInt(TourDestination::getSequenceOrder))
                .toList();
        List<TourDestination> sortedGuest = guestDests.stream()
                .sorted(Comparator.comparingInt(TourDestination::getSequenceOrder))
                .toList();

        int limit = Math.min(sortedHost.size(), sortedGuest.size());
        List<MatchedPrefixStop> matched = new ArrayList<>();
        for (int i = 0; i < limit; i++) {
            TourDestination a = sortedHost.get(i);
            TourDestination b = sortedGuest.get(i);
            Long destIdA = a.getDestination() != null ? a.getDestination().getId() : null;
            Long destIdB = b.getDestination() != null ? b.getDestination().getId() : null;
            if (destIdA == null || !destIdA.equals(destIdB)) {
                break;
            }
            matched.add(MatchedPrefixStop.builder()
                    .orderIndex(i + 1)
                    .stopName(a.getDestination().getName())
                    .destinationId(destIdA)
                    .matchType("DESTINATION_ID")
                    .build());
        }
        return matched;
    }

    private List<MatchedPrefixStop> matchByTourStops(List<TourStop> hostStops, List<TourStop> guestStops) {
        List<TourStop> sortedHost = hostStops.stream()
                .sorted(Comparator.comparingInt(TourStop::getSequenceOrder))
                .toList();
        List<TourStop> sortedGuest = guestStops.stream()
                .sorted(Comparator.comparingInt(TourStop::getSequenceOrder))
                .toList();

        int limit = Math.min(sortedHost.size(), sortedGuest.size());
        List<MatchedPrefixStop> matched = new ArrayList<>();
        for (int i = 0; i < limit; i++) {
            TourStop a = sortedHost.get(i);
            TourStop b = sortedGuest.get(i);

            String matchType = resolveStopMatchType(a, b);
            if (matchType == null) {
                break;
            }
            matched.add(MatchedPrefixStop.builder()
                    .orderIndex(i + 1)
                    .stopName(a.getName() != null ? a.getName() : b.getName())
                    .destinationId(null)
                    .matchType(matchType)
                    .build());
        }
        return matched;
    }

    private String resolveStopMatchType(TourStop a, TourStop b) {
        if (a.getLatitude() != null && a.getLongitude() != null
                && b.getLatitude() != null && b.getLongitude() != null) {
            double meters = haversineMeters(
                    a.getLatitude().doubleValue(), a.getLongitude().doubleValue(),
                    b.getLatitude().doubleValue(), b.getLongitude().doubleValue());
            return meters <= MAX_STOP_DISTANCE_METERS ? "GPS" : null;
        }
        String nameA = normalizeName(a.getName());
        String nameB = normalizeName(b.getName());
        if (!nameA.isEmpty() && nameA.equals(nameB)) {
            return "NAME";
        }
        return null;
    }

    static String normalizeName(String raw) {
        if (raw == null) {
            return "";
        }
        String replaced = raw.trim()
                .replace('đ', 'd')
                .replace('Đ', 'D');
        String decomposed = Normalizer.normalize(replaced, Normalizer.Form.NFD);
        String stripped = DIACRITICS.matcher(decomposed).replaceAll("");
        return WHITESPACE.matcher(stripped.toLowerCase(Locale.ROOT)).replaceAll(" ").trim();
    }

    static double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        final double earthRadiusMeters = 6_371_000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double sinLat = Math.sin(dLat / 2.0);
        double sinLon = Math.sin(dLon / 2.0);
        double a = sinLat * sinLat
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * sinLon * sinLon;
        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return earthRadiusMeters * c;
    }
}
