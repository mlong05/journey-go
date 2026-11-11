package com.journeygo.modules.booking.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.dto.request.ChangePassengerRequest;
import com.journeygo.modules.booking.dto.response.PassengerChangeResponse;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.entity.BookingPassengerChange;
import com.journeygo.modules.booking.entity.enums.BookingPassengerStatus;
import com.journeygo.modules.booking.entity.enums.PassengerChangeStatus;
import com.journeygo.modules.booking.repository.BookingPassengerChangeRepository;
import com.journeygo.modules.booking.repository.BookingPassengerRepository;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.booking.support.GuestAgeResolver;
import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Thay đổi hành khách trong một Booking (ví dụ: Booking có A–E, người đặt muốn thay E bằng F).
 *
 * <p>Quy tắc nghiệp vụ:
 * <ul>
 *   <li>Chỉ người đặt tour mới được gửi yêu cầu thay đổi.</li>
 *   <li>Đối tác chỉ được xử lý Booking thuộc tour của mình.</li>
 *   <li>Không được thay đổi hành khách đã hoàn thành trải nghiệm.</li>
 *   <li>Không được thay đổi loại khách nếu làm sai lệch giá mà chưa xử lý phần chênh lệch.</li>
 *   <li>Lưu thông tin trước và sau khi thay đổi.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BookingPassengerChangeService {

    private final BookingPassengerChangeRepository changeRepository;
    private final BookingPassengerRepository passengerRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final TourBookingCatalogService catalogService;
    private final ObjectMapper objectMapper;

    // ── Người đặt gửi yêu cầu ─────────────────────────────────────────────────

    /**
     * Người đặt tour gửi yêu cầu thay đổi một hành khách.
     */
    @Transactional
    public PassengerChangeResponse requestChange(Booking booking, Long passengerId, Long requesterId,
                                                 ChangePassengerRequest request) {
        if (booking.isLockedForPassengerChange()) {
            throw new AppException(ErrorCode.BOOKING_PASSENGER_CHANGE_NOT_ALLOWED,
                    "Không thể thay đổi hành khách của booking đã hoàn thành hoặc đã hủy");
        }

        // Quy tắc: chỉ người đặt tour mới được gửi yêu cầu thay đổi.
        Long ownerId = booking.getTourist() != null ? booking.getTourist().getId() : null;
        if (ownerId == null || !ownerId.equals(requesterId)) {
            throw new AppException(ErrorCode.BOOKING_PASSENGER_CHANGE_NOT_OWNER);
        }

        BookingPassenger passenger = passengerRepository.findByIdAndBooking_Id(passengerId, booking.getId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_PASSENGER_NOT_FOUND));

        if (passenger.isBookingCustomer()) {
            throw new AppException(ErrorCode.BOOKING_PASSENGER_CHANGE_NOT_ALLOWED,
                    "Không thể thay đổi hành khách chính là người đặt tour");
        }
        if (passenger.getStatus() != BookingPassengerStatus.ACTIVE) {
            throw new AppException(ErrorCode.BOOKING_PASSENGER_CHANGE_NOT_ALLOWED);
        }

        // Chỉ có một yêu cầu đang chờ cho mỗi hành khách.
        boolean hasPending = changeRepository
                .findByBooking_IdAndStatusOrderByCreatedAtDesc(booking.getId(), PassengerChangeStatus.PENDING)
                .stream()
                .anyMatch(c -> passengerId.equals(c.getPassenger() != null ? c.getPassenger().getId() : null));
        if (hasPending) {
            throw new AppException(ErrorCode.BOOKING_PASSENGER_CHANGE_PENDING);
        }

        // Chốt giá của hành khách mới để tính chênh lệch.
        GuestType newGuestType = request.guestType() != null
                ? request.guestType()
                : GuestAgeResolver.resolveGuestTypeOrAdult(request.birthDate(), booking.getExperienceDate());

        TourBookingCatalogService.PriceTable table = catalogService.priceTable(booking.getTour());
        BigDecimal newPrice = table.sells(newGuestType) ? table.priceOf(newGuestType) : BigDecimal.ZERO;
        if (newGuestType.isAlwaysFree()) {
            newPrice = BigDecimal.ZERO;
        }
        BigDecimal priceDelta = newPrice.subtract(passenger.getPrice() != null ? passenger.getPrice() : BigDecimal.ZERO);

        BookingPassengerChange change = BookingPassengerChange.builder()
                .booking(booking)
                .passenger(passenger)
                .requestedBy(requesterId)
                .oldData(toJson(snapshot(passenger)))
                .newData(toJson(snapshotOf(request, newGuestType, newPrice)))
                .priceDelta(priceDelta)
                .reason(request.reason())
                .status(PassengerChangeStatus.PENDING)
                .build();
        changeRepository.save(change);

        log.info("Nhận yêu cầu thay đổi hành khách booking={} passenger={} delta={}",
                booking.getId(), passengerId, priceDelta);
        return PassengerChangeResponse.fromEntity(change, passenger.getFullName());
    }

    // ── Đối tác xử lý ────────────────────────────────────────────────────────

    /**
     * Đối tác duyệt yêu cầu thay đổi — hành khách cũ bị thay, hành khách mới được thêm vào Booking.
     *
     * @param acceptPriceDifference true = đối tác đã xử lý phần chênh lệch giá (bằng cách
     *                              điều chỉnh trực tiếp trên hệ thống hoặc thỏa thuận ngoài).
     */
    @Transactional
    public PassengerChangeResponse approve(BookingPassengerChange change, Long processorId,
                                           boolean acceptPriceDifference) {
        if (!change.isPending()) {
            throw new AppException(ErrorCode.BOOKING_INVALID_STATUS_FOR_CANCEL,
                    "Yêu cầu này đã được xử lý");
        }
        Booking booking = change.getBooking();
        if (booking.isLockedForPassengerChange()) {
            throw new AppException(ErrorCode.BOOKING_PASSENGER_CHANGE_NOT_ALLOWED);
        }

        // Quy tắc: "Không được thay đổi loại khách nếu làm sai lệch giá mà chưa xử lý phần chênh lệch."
        BigDecimal delta = change.getPriceDelta() == null ? BigDecimal.ZERO : change.getPriceDelta();
        if (delta.compareTo(BigDecimal.ZERO) != 0 && !acceptPriceDifference) {
            throw new AppException(ErrorCode.BOOKING_PASSENGER_CHANGE_PRICE_DIFF,
                    "Chênh lệch giá " + delta
                            + " đ chưa được xử lý — vui lòng điều chỉnh trước khi duyệt");
        }

        BookingPassenger oldPassenger = change.getPassenger();
        Map<String, Object> newData = fromJson(change.getNewData());
        TourBookingCatalogService.PriceTable table = catalogService.priceTable(booking.getTour());

        oldPassenger.setStatus(BookingPassengerStatus.REPLACED);
        passengerRepository.save(oldPassenger);

        GuestType newGuestType = GuestType.valueOf(String.valueOf(newData.get("guestType")));
        LocalDate newBirthDate = newData.get("birthDate") == null
                ? null : LocalDate.parse(String.valueOf(newData.get("birthDate")));
        BigDecimal newPrice = toBigDecimal(newData.get("price"));
        boolean newCountsTowardSlot = table.countsTowardSlot(newGuestType);

        BookingPassenger replacement = BookingPassenger.builder()
                .booking(booking)
                .fullName(String.valueOf(newData.get("fullName")))
                .birthDate(newBirthDate)
                .gender((String) newData.get("gender"))
                .email((String) newData.get("email"))
                .guestType(newGuestType)
                .price(newPrice)
                .countsTowardSlot(newCountsTowardSlot)
                .bookingCustomer(false)
                .linkedUserId(null)
                .status(BookingPassengerStatus.ACTIVE)
                .build();
        passengerRepository.save(replacement);

        // Cập nhật tổng tiền của Booking theo giá mới.
        BigDecimal newTotal = booking.getTotalAmount() == null ? BigDecimal.ZERO : booking.getTotalAmount();
        BigDecimal oldPrice = oldPassenger.getPrice() == null ? BigDecimal.ZERO : oldPassenger.getPrice();
        newTotal = newTotal.subtract(oldPrice).add(replacement.getPrice());
        booking.setTotalAmount(newTotal);
        bookingRepository.save(booking);

        change.setStatus(PassengerChangeStatus.APPROVED);
        change.setProcessedBy(processorId);
        change.setProcessedAt(Instant.now());
        changeRepository.save(change);

        log.info("Đối tác duyệt thay đổi hành khách booking={} cũ={} mới={} delta={}",
                booking.getId(), oldPassenger.getId(), replacement.getId(), delta);
        return PassengerChangeResponse.fromEntity(change, oldPassenger.getFullName());
    }

    /** Đối tác từ chối yêu cầu thay đổi. */
    @Transactional
    public PassengerChangeResponse reject(BookingPassengerChange change, Long processorId, String reason) {
        if (!change.isPending()) {
            throw new AppException(ErrorCode.BOOKING_INVALID_STATUS_FOR_CANCEL,
                    "Yêu cầu này đã được xử lý");
        }
        change.setStatus(PassengerChangeStatus.REJECTED);
        change.setProcessedBy(processorId);
        change.setProcessedAt(Instant.now());
        if (reason != null && !reason.isBlank()) {
            change.setReason(change.getReason() + "\n[Đối tác] " + reason.trim());
        }
        changeRepository.save(change);
        return PassengerChangeResponse.fromEntity(change,
                change.getPassenger() != null ? change.getPassenger().getFullName() : null);
    }

    /** Danh sách yêu cầu thay đổi của một Booking. */
    @Transactional(readOnly = true)
    public List<PassengerChangeResponse> listChanges(Long bookingId) {
        return changeRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId).stream()
                .map(c -> PassengerChangeResponse.fromEntity(c,
                        c.getPassenger() != null ? c.getPassenger().getFullName() : null))
                .toList();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Snapshot dữ liệu hành khách cũ (để lưu "trước khi thay đổi"). */
    private Map<String, Object> snapshot(BookingPassenger p) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("fullName", p.getFullName());
        map.put("birthDate", p.getBirthDate() != null ? p.getBirthDate().toString() : null);
        map.put("gender", p.getGender());
        map.put("email", p.getEmail());
        map.put("guestType", p.getGuestType() != null ? p.getGuestType().name() : null);
        map.put("price", p.getPrice());
        map.put("countsTowardSlot", p.isCountsTowardSlot());
        return map;
    }

    /** Snapshot dữ liệu hành khách mới (đề xuất thay thế). */
    private Map<String, Object> snapshotOf(ChangePassengerRequest req, GuestType guestType, BigDecimal price) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("fullName", req.fullName());
        map.put("birthDate", req.birthDate() != null ? req.birthDate().toString() : null);
        map.put("gender", req.gender());
        map.put("email", req.email());
        map.put("guestType", guestType.name());
        map.put("price", price);
        map.put("countsTowardSlot", true);
        return map;
    }

    private String toJson(Map<String, Object> data) {
        try {
            return objectMapper.writeValueAsString(data);
        } catch (Exception e) {
            throw new IllegalStateException("Không serialize được dữ liệu hành khách", e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fromJson(String json) {
        try {
            return objectMapper.readValue(json, LinkedHashMap.class);
        } catch (Exception e) {
            throw new IllegalStateException("Không đọc được dữ liệu hành khách", e);
        }
    }

    /** Chuyển giá trị số đọc từ JSON sang {@link BigDecimal}. */
    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bd) {
            return bd;
        }
        return new BigDecimal(String.valueOf(value));
    }

    /** Tên người dùng — phục vụ hiển thị. */
    public String displayName(Long userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId).map(User::getFullName).orElse(null);
    }
}
