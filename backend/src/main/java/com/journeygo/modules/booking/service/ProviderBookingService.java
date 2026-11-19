package com.journeygo.modules.booking.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.dto.response.BookingResponse;
import com.journeygo.modules.booking.dto.response.ProviderDepartureResponse;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.repository.BookingPassengerRepository;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourSlot;
import com.journeygo.modules.tour.entity.TourSlotStatus;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.tour.repository.TourSlotRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Góc nhìn dành cho <b>Đối tác (Content Provider)</b> — danh sách khách đã đặt tour
 * của họ, kèm danh sách hành khách đầy đủ.
 *
 * <p>Quy tắc:
 * <ul>
 *   <li>Đối tác chỉ xem được booking của tour do chính mình tạo ({@code Tour.createdBy}).</li>
 *   <li>Đối tác không được sửa thông tin booking của khách — mọi thay đổi phải qua
 *       yêu cầu thay đổi hành khách mà người đặt gửi.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderBookingService {

    private final BookingRepository bookingRepository;
    private final BookingPassengerRepository passengerRepository;
    private final TourRepository tourRepository;
    private final TourSlotRepository tourSlotRepository;

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    /** Biên dưới / trên khi lọc "tất cả" hoặc "đã qua" (tránh tham số null với PostgreSQL). */
    private static final LocalDate MIN_DATE = LocalDate.of(2000, 1, 1);
    private static final LocalDate MAX_DATE = LocalDate.of(2100, 12, 31);

    /**
     * Danh sách booking của các tour mà đối tác sở hữu, lọc tuỳ chọn theo tour, ngày
     * khởi hành và trạng thái.
     */
    @Transactional(readOnly = true)
    public PageResponse<BookingResponse> listProviderBookings(Long providerId, Long tourId, LocalDate date,
                                                              List<BookingStatus> statuses, Pageable pageable) {
        Specification<Booking> spec = (root, query, cb) -> {
            List<Predicate> where = new ArrayList<>();
            where.add(cb.equal(root.get("tour").get("createdBy").get("id"), providerId));
            if (tourId != null) {
                where.add(cb.equal(root.get("tour").get("tourId"), tourId));
            }
            if (date != null) {
                where.add(cb.equal(root.get("experienceDate"), date));
            }
            if (statuses != null && !statuses.isEmpty()) {
                where.add(root.get("status").in(statuses));
            }
            return cb.and(where.toArray(Predicate[]::new));
        };
        Page<Booking> page = bookingRepository.findAll(spec, pageable);
        return PageResponse.from(page, BookingResponse::fromEntity);
    }

    /** Phạm vi thời gian của màn "Theo lịch khởi hành". */
    public enum DepartureScope { UPCOMING, PAST, ALL }

    /**
     * Danh sách lịch khởi hành (tour × ngày) của đối tác kèm số khách đã đăng ký.
     *
     * <p>Nguồn dữ liệu: slot của tour ({@code tour_slots}) hợp với các ngày có booking
     * (tour cũ có thể có booking mà không có slot). Mặc định chỉ trả các ngày có ít nhất
     * một đơn (bất kỳ trạng thái nào); {@code includeEmpty = true} trả cả slot chưa có ai đặt.
     */
    @Transactional(readOnly = true)
    public PageResponse<ProviderDepartureResponse> listDepartures(Long providerId, Long tourId,
                                                                   DepartureScope scope, LocalDate from, LocalDate to,
                                                                   boolean includeEmpty, Pageable pageable) {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        DepartureScope effectiveScope = scope == null ? DepartureScope.UPCOMING : scope;
        LocalDate lower = from != null ? from
                : effectiveScope == DepartureScope.UPCOMING ? today : MIN_DATE;
        LocalDate upper = to != null ? to
                : effectiveScope == DepartureScope.PAST ? today.minusDays(1) : MAX_DATE;

        Map<DepartureKey, DepartureAccumulator> rows = new LinkedHashMap<>();
        if (!lower.isAfter(upper)) {
            for (TourSlot slot : tourSlotRepository.findProviderSlotsBetween(providerId, lower, upper)) {
                Tour tour = slot.getTour();
                if (tourId != null && !tourId.equals(tour.getTourId())) continue;
                DepartureAccumulator acc = rows.computeIfAbsent(
                        new DepartureKey(tour.getTourId(), slot.getSlotDate()), k -> new DepartureAccumulator());
                acc.tourTitle = tour.getTitle();
                acc.capacity = slot.getCapacity();
                acc.reservedSeats = slot.getBookedCount();
                acc.slotStatus = slot.getStatus();
            }
            for (Object[] r : bookingRepository.aggregateProviderBookings(providerId, lower, upper)) {
                Long rowTourId = (Long) r[0];
                if (tourId != null && !tourId.equals(rowTourId)) continue;
                BookingStatus status = (BookingStatus) r[2];
                DepartureAccumulator acc = rows.computeIfAbsent(
                        new DepartureKey(rowTourId, (LocalDate) r[1]), k -> new DepartureAccumulator());
                acc.anyBooking = true;
                int count = ((Number) r[3]).intValue();
                if (isRegistered(status)) {
                    acc.confirmedBookings += count;
                    acc.revenue = acc.revenue.add(toBigDecimal(r[4]));
                } else if (status == BookingStatus.PENDING_PAYMENT) {
                    acc.pendingBookings += count;
                }
            }
            for (Object[] r : passengerRepository.aggregateProviderPassengers(providerId, lower, upper)) {
                DepartureAccumulator acc = rows.get(new DepartureKey((Long) r[0], (LocalDate) r[1]));
                if (acc == null) continue;
                BookingStatus status = (BookingStatus) r[2];
                GuestType guestType = (GuestType) r[3];
                int guests = ((Number) r[4]).intValue();
                int seats = r[5] == null ? 0 : ((Number) r[5]).intValue();
                if (isRegistered(status)) {
                    acc.confirmedGuests += guests;
                    acc.confirmedSeats += seats;
                    acc.guestBreakdown.merge(guestType, guests, Integer::sum);
                } else if (status == BookingStatus.PENDING_PAYMENT) {
                    acc.pendingGuests += guests;
                    acc.pendingSeats += seats;
                }
            }
        }

        // Tour không có slot trong khoảng ngày ⇒ chưa có tên, nạp bổ sung.
        Set<Long> missingTitles = new HashSet<>();
        rows.forEach((k, acc) -> { if (acc.tourTitle == null) missingTitles.add(k.tourId()); });
        Map<Long, String> titles = new HashMap<>();
        tourRepository.findAllById(missingTitles).forEach(t -> titles.put(t.getTourId(), t.getTitle()));

        Comparator<Map.Entry<DepartureKey, DepartureAccumulator>> byDate =
                Comparator.comparing(e -> e.getKey().date());
        if (effectiveScope == DepartureScope.PAST) byDate = byDate.reversed();
        List<ProviderDepartureResponse> all = rows.entrySet().stream()
                .filter(e -> includeEmpty || e.getValue().anyBooking)
                .sorted(byDate.thenComparing(e -> e.getKey().tourId()))
                .map(e -> e.getValue().toResponse(e.getKey(),
                        titles.getOrDefault(e.getKey().tourId(), null), today))
                .toList();

        int start = (int) Math.min(pageable.getOffset(), all.size());
        int end = Math.min(start + pageable.getPageSize(), all.size());
        return PageResponse.from(new PageImpl<>(all.subList(start, end), pageable, all.size()));
    }

    /** Booking được tính là "khách đã đăng ký". */
    private static boolean isRegistered(BookingStatus status) {
        return status == BookingStatus.CONFIRMED || status == BookingStatus.COMPLETED;
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd) return bd;
        return new BigDecimal(value.toString());
    }

    private record DepartureKey(Long tourId, LocalDate date) {
    }

    private static final class DepartureAccumulator {
        String tourTitle;
        Integer capacity;
        Integer reservedSeats;
        TourSlotStatus slotStatus;
        boolean anyBooking;
        int confirmedBookings;
        int confirmedGuests;
        int confirmedSeats;
        int pendingBookings;
        int pendingGuests;
        int pendingSeats;
        BigDecimal revenue = BigDecimal.ZERO;
        final Map<GuestType, Integer> guestBreakdown = new EnumMap<>(GuestType.class);

        ProviderDepartureResponse toResponse(DepartureKey key, String fallbackTitle, LocalDate today) {
            return new ProviderDepartureResponse(key.tourId(),
                    tourTitle != null ? tourTitle : fallbackTitle,
                    key.date(), capacity, reservedSeats, slotStatus,
                    confirmedBookings, confirmedGuests, confirmedSeats,
                    pendingBookings, pendingGuests, pendingSeats,
                    guestBreakdown, revenue, key.date().isBefore(today));
        }
    }

    /**
     * Chi tiết booking kèm danh sách hành khách — dành cho đối tác.
     */
    @Transactional(readOnly = true)
    public BookingResponse getProviderBooking(Long bookingId, Long providerId) {
        Booking booking = bookingRepository.findByIdWithRelations(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
        requireOwnTour(booking, providerId);
        return BookingResponse.fromEntity(booking);
    }

    /**
     * Danh sách hành khách của một booking — dành cho đối tác (quyền xem "toàn bộ khách hàng
     * đã đặt tour" và "danh sách hành khách").
     */
    @Transactional(readOnly = true)
    public List<BookingPassenger> listPassengers(Long bookingId, Long providerId) {
        Booking booking = bookingRepository.findByIdWithRelations(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
        requireOwnTour(booking, providerId);
        return passengerRepository.findByBooking_IdOrderByCreatedAtAsc(bookingId);
    }

    /**
     * Kiểm tra đối tác có sở hữu tour của booking hay không.
     */
    public void requireOwnTour(Booking booking, Long providerId) {
        Tour tour = booking.getTour();
        Long ownerId = tour != null && tour.getCreatedBy() != null ? tour.getCreatedBy().getId() : null;
        if (ownerId == null || !ownerId.equals(providerId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED,
                    "Bạn chỉ có thể xem booking của tour do mình tạo");
        }
    }

    /**
     * Đối tác có sở hữu tour này không.
     */
    public boolean ownsTour(Long tourId, Long providerId) {
        return tourRepository.findByTourId(tourId)
                .map(t -> t.getCreatedBy() != null && providerId.equals(t.getCreatedBy().getId()))
                .orElse(false);
    }
}
