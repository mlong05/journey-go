package com.journeygo.modules.booking.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.dto.request.CreateBookingRequest;
import com.journeygo.modules.booking.dto.response.BookingResponse;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingSlotHold;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.event.BookingCompletedEvent;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.booking.repository.BookingSlotHoldRepository;
import com.journeygo.modules.experience.entity.ExperienceSlot;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.experience.repository.ExperienceSlotRepository;
import com.journeygo.modules.finance.config.FinanceProperties;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

/**
 * Nghiệp vụ Booking — đặt chỗ, giữ slot, timeout 10 phút, hủy và chống đặt vượt sức chứa.
 *
 * <p>Các quy tắc được cài đặt (theo tài liệu):
 * <ul>
 *   <li><b>UC-01 Timeout</b> — hạn thanh toán 10 phút kể từ lúc tạo Booking; hết hạn thì sang
 *       EXPIRED và giải phóng slot. Không cho tạo Payment attempt mới cho Booking đã hết hạn.</li>
 *   <li><b>UC-02 Giữ chỗ</b> — giữ chỗ ngay khi tạo Booking, tối đa 10 phút; giải phóng đúng
 *       một lần; không để xảy ra overselling (dùng cập nhật nguyên tử có điều kiện).</li>
 *   <li>Slot chỉ được giải phóng khi Booking chuyển sang EXPIRED hoặc bị hủy hợp lệ.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BookingService {

    /** Thời hạn thanh toán: 10 phút kể từ khi tạo Booking. */
    public static final Duration PAYMENT_DEADLINE = Duration.ofMinutes(10);

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final BookingRepository bookingRepository;
    private final BookingSlotHoldRepository slotHoldRepository;
    private final ExperienceSlotRepository experienceSlotRepository;
    private final ExperienceRepository experienceRepository;
    private final FinanceProperties financeProperties;
    private final TourRepository tourRepository;
    private final UserRepository userRepository;
    private final TourBookingCatalogService catalogService;
    private final ApplicationEventPublisher eventPublisher;

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * Tạo Booking mới cho một Tourist.
     *
     * <p>Toàn bộ thao tác (kiểm tra điều kiện đặt + giữ slot + lưu Booking) nằm trong một
     * transaction — nếu một slot không còn chỗ thì rollback toàn bộ, không để sót slot đã giữ
     * một phần (UC-02).
     */
    @Transactional
    public BookingResponse createBooking(CreateBookingRequest request, Long touristId) {
        User tourist = userRepository.findById(touristId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Tour tour = tourRepository.findByTourId(request.tourId())
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_NOT_FOUND));

        validateTourBookable(tour);
        validateExperienceDate(tour, request.experienceDate());

        List<TourBookingCatalogService.ExperienceQuote> quotes =
                catalogService.quoteExperiences(tour, request.experienceDate());

        if (quotes.isEmpty()) {
            throw new AppException(ErrorCode.BOOKING_NO_AVAILABLE_EXPERIENCE,
                    "Tour không có trải nghiệm nào khả dụch để đặt trong ngày này");
        }

        // ── Kiểm tra + giữ chỗ NGUYÊN TỬ ────────────────────────────────────
        // Duyệt trước để biết slot nào thiếu chỗ, rồi mới reserve. Mọi reserve thất bại
        // sẽ ném exception → rollback toàn bộ transaction (bao gồm các slot đã reserve).
        List<ExperienceSlot> slotsToReserve = new java.util.ArrayList<>();
        for (TourBookingCatalogService.ExperienceQuote quote : quotes) {
            if (quote.slot() == null) {
                // Provider chưa mở bán ngày này: tự mở slot nếu được cấu hình, không thì báo như cũ.
                if (!financeProperties.isAutoOpenSlots()) {
                    throw new AppException(ErrorCode.BOOKING_SLOT_NOT_FOUND,
                            "Trải nghiệm '" + quote.title() + "' chưa mở bán ngày " + request.experienceDate());
                }
                slotsToReserve.add(openSlot(quote.experienceId(), request.experienceDate()));
                continue;
            }
            if (!quote.hasCapacity()) {
                throw new AppException(ErrorCode.BOOKING_SLOT_FULL,
                        "Trải nghiệm '" + quote.title() + "' đã hết chỗ ngày " + request.experienceDate());
            }
            slotsToReserve.add(quote.slot());
        }

        for (ExperienceSlot slot : slotsToReserve) {
            int updated = experienceSlotRepository.atomicReserveSlot(slot.getId());
            if (updated == 0) {
                // Có request khác vừa chiếm slot cuối cùng → thất bại nguyên tử.
                throw new AppException(ErrorCode.BOOKING_SLOT_FULL,
                        "Trải nghiệm vừa hết chỗ, vui lòng thử lại");
            }
        }

        BigDecimal totalAmount = quotes.stream()
                .map(TourBookingCatalogService.ExperienceQuote::price)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Instant now = Instant.now();
        Booking booking = Booking.builder()
                .bookingCode(generateBookingCode())
                .tourist(tourist)
                .tour(tour)
                .experienceDate(request.experienceDate())
                .totalAmount(totalAmount)
                .currency("VND")
                .status(BookingStatus.PENDING_PAYMENT)
                .paymentDeadline(now.plus(PAYMENT_DEADLINE))
                .build();

        Booking saved = bookingRepository.save(booking);

        for (ExperienceSlot slot : slotsToReserve) {
            slotHoldRepository.save(BookingSlotHold.builder()
                    .booking(saved)
                    .experienceSlot(slot)
                    .experienceId(slot.getExperience() != null ? slot.getExperience().getId() : null)
                    .slotDate(slot.getSlotDate())
                    .build());
        }

        log.info("Đã tạo booking id={} code={} tourist={} tour={} amount={} giữ {} slot",
                saved.getId(), saved.getBookingCode(), touristId, tour.getTourId(), totalAmount, slotsToReserve.size());
        return BookingResponse.fromEntity(saved);
    }

    /**
     * Tự mở slot cho ngày Provider chưa cấu hình (app.finance.auto-open-slots). Slot mở theo sức chứa
     * mặc định và vẫn đi qua atomicReserveSlot như slot thường, nên không vượt quá sức chứa đó.
     */
    private ExperienceSlot openSlot(Long experienceId, LocalDate date) {
        ExperienceSlot slot = experienceSlotRepository.saveAndFlush(ExperienceSlot.builder()
                .experience(experienceRepository.getReferenceById(experienceId))
                .slotDate(date)
                .maxTourPerDay(financeProperties.getAutoOpenSlotCapacity())
                .bookedTourCount(0)
                .build());
        log.info("Tự mở slot id={} cho experience={} ngày {} (sức chứa {})",
                slot.getId(), experienceId, date, slot.getMaxTourPerDay());
        return slot;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public BookingResponse getById(Long bookingId, Long callerId, boolean isAdmin) {
        Booking booking = findOrThrow(bookingId);
        checkOwnership(booking, callerId, isAdmin);
        return BookingResponse.fromEntity(booking);
    }

    @Transactional(readOnly = true)
    public PageResponse<BookingResponse> getMyBookings(Long touristId, Pageable pageable) {
        Page<Booking> page = bookingRepository.findByTourist_Id(touristId, pageable);
        return PageResponse.from(page, BookingResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public PageResponse<BookingResponse> getAll(BookingStatus status, Pageable pageable) {
        Page<Booking> page = (status != null)
                ? bookingRepository.findAll(pageable)
                : bookingRepository.findAll(pageable);
        return PageResponse.from(page, BookingResponse::fromEntity);
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    /**
     * Hủy Booking — giải phóng slot đúng một lần.
     *
     * <p>Chỉ cho phép hủy khi Booking chưa thanh toán (PENDING_PAYMENT). Booking đã thanh toán
     * thành công phải đi qua luồng Refund.
     */
    @Transactional
    public BookingResponse cancelBooking(Long bookingId, Long callerId, boolean isAdmin, String reason) {
        Booking booking = findOrThrow(bookingId);
        checkOwnership(booking, callerId, isAdmin);

        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT && booking.isDeadlinePassed(Instant.now())) {
            expireAndRelease(booking);
            throw new AppException(ErrorCode.BOOKING_ALREADY_EXPIRED,
                    "Booking đã hết hạn thanh toán và được chuyển sang EXPIRED");
        }

        if (booking.getStatus().isPaid()) {
            throw new AppException(ErrorCode.BOOKING_CANNOT_CANCEL_PAID,
                    "Booking đã thanh toán thành công — vui lòng gửi yêu cầu hoàn tiền");
        }

        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new AppException(ErrorCode.BOOKING_INVALID_STATUS_FOR_CANCEL,
                    "Không thể hủy Booking ở trạng thái " + booking.getStatus());
        }

        booking.cancel(reason);
        bookingRepository.save(booking);
        releaseSlots(booking);

        log.info("Đã hủy booking id={} bởi user={}", bookingId, callerId);
        return BookingResponse.fromEntity(booking);
    }

    // ── Complete ──────────────────────────────────────────────────────────────

    /**
     * Đánh dấu Booking đã hoàn thành trải nghiệm.
     *
     * <p>Đây là mốc quyết định doanh thu Partner được xét điều kiện tất toán
     * (Mục 4.1 — "Booking chỉ phát sinh doanh thu có thể tất toán sau khi trải nghiệm hoàn thành";
     * ngày hoàn thành trải nghiệm là căn cứ xác định kỳ doanh thu).
     *
     * <p>Phát {@link BookingCompletedEvent} để {@code PartnerRevenueService} đánh giá lại
     * điều kiện tất toán.
     *
     * @param bookingId   Booking cần hoàn thành
     * @param completedAt Thời điểm hoàn thành (mặc định = hiện tại)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public BookingResponse completeBooking(Long bookingId, Instant completedAt) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId).orElse(null);
        if (booking == null) {
            throw new AppException(ErrorCode.BOOKING_NOT_FOUND);
        }

        if (booking.getStatus() == BookingStatus.COMPLETED) {
            // Idempotent — không phát lại sự kiện, tránh tạo trùng doanh thu.
            return BookingResponse.fromEntity(booking);
        }

        if (!booking.getStatus().isPaid()) {
            throw new AppException(ErrorCode.BOOKING_INVALID_STATUS_FOR_CANCEL,
                    "Chỉ Booking đã thanh toán thành công mới có thể đánh dấu hoàn thành trải nghiệm");
        }

        Instant at = completedAt != null ? completedAt : Instant.now();
        booking.complete(at);
        bookingRepository.save(booking);

        // Slot giữ cho Booking đã thanh toán — KHÔNG giải phóng (tour đã diễn ra).
        eventPublisher.publishEvent(new BookingCompletedEvent(booking.getId(), at));

        log.info("Đã đánh dấu hoàn thành booking id={} tại {}", bookingId, at);
        return BookingResponse.fromEntity(booking);
    }

    // ── Timeout / expiry ──────────────────────────────────────────────────────

    /**
     * Kiểm tra và xử lý hết hạn cho MỘT Booking (dùng khi có request liên quan tới Booking).
     *
     * @return true nếu Booking vừa được chuyển sang EXPIRED
     */
    @Transactional
    public boolean expireIfNeeded(Long bookingId) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId).orElse(null);
        if (booking == null) {
            return false;
        }
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            return false;
        }
        if (!booking.isDeadlinePassed(Instant.now())) {
            return false;
        }
        expireAndRelease(booking);
        return true;
    }

    /**
     * Quét và xử lý các Booking đã quá hạn thanh toán (tác vụ nền).
     */
    @Transactional
    public int expireOverdueBookings() {
        List<Booking> overdue = bookingRepository.findExpiredPendingBookings(Instant.now());
        int count = 0;
        for (Booking booking : overdue) {
            Booking locked = bookingRepository.findByIdForUpdate(booking.getId()).orElse(null);
            if (locked == null || locked.getStatus() != BookingStatus.PENDING_PAYMENT) {
                continue;
            }
            if (!locked.isDeadlinePassed(Instant.now())) {
                continue;
            }
            expireAndRelease(locked);
            count++;
        }
        if (count > 0) {
            log.info("Đã chuyển {} booking quá hạn thanh toán sang EXPIRED và giải phóng slot", count);
        }
        return count;
    }

    /**
     * Đánh dấu hết hạn và giải phóng slot (gọi trong transaction hiện tại).
     */
    private void expireAndRelease(Booking booking) {
        booking.expire();
        bookingRepository.save(booking);
        releaseSlots(booking);
    }

    /**
     * Giải phóng các slot đã giữ — đúng một lần nhờ cờ {@code released}.
     */
    private void releaseSlots(Booking booking) {
        List<BookingSlotHold> holds = slotHoldRepository.findByBooking_Id(booking.getId());
        for (BookingSlotHold hold : holds) {
            if (!hold.markReleased()) {
                // Đã giải phóng trước đó — bỏ qua để không cộng/trừ sai số chỗ.
                continue;
            }
            slotHoldRepository.save(hold);
            if (hold.getExperienceSlot() != null) {
                experienceSlotRepository.atomicReleaseSlot(hold.getExperienceSlot().getId());
            }
        }
    }

    /**
     * Giải phóng slot nếu Booking đã hết hạn — gọi từ PaymentService trước khi cho phép
     * tạo Payment attempt mới (UC-01: "Không cho tạo Payment attempt mới cho Booking đã hết hạn").
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public boolean expireIfNeededInCurrentTransaction(Long bookingId) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId).orElse(null);
        if (booking == null) {
            return false;
        }
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            return false;
        }
        if (!booking.isDeadlinePassed(Instant.now())) {
            return false;
        }
        expireAndRelease(booking);
        return true;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Tìm Booking kèm khóa write — dùng khi xử lý callback thanh toán để tránh race condition
     * với tác vụ hết hạn (UC-01: "Backend phải đảm bảo không vừa giải phóng chỗ vừa xác nhận Booking").
     */
    @Transactional(readOnly = true)
    public Booking findByIdForUpdate(Long bookingId) {
        return bookingRepository.findByIdForUpdate(bookingId).orElse(null);
    }

    public Booking findOrThrow(Long bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
    }

    private void checkOwnership(Booking booking, Long callerId, boolean isAdmin) {
        if (isAdmin) {
            return;
        }
        Long ownerId = booking.getTourist() != null ? booking.getTourist().getId() : null;
        if (ownerId == null || !ownerId.equals(callerId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED,
                    "Bạn không có quyền truy cập Booking này");
        }
    }

    private void validateTourBookable(Tour tour) {
        if (tour.getStatus() != TourStatus.PUBLISHED || !tour.isApproved()) {
            throw new AppException(ErrorCode.BOOKING_TOUR_NOT_AVAILABLE,
                    "Tour chưa được xuất bản — không thể đặt");
        }
    }

    private void validateExperienceDate(Tour tour, LocalDate experienceDate) {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        if (experienceDate == null || experienceDate.isBefore(today)) {
            throw new AppException(ErrorCode.BOOKING_INVALID_DATE,
                    "Ngày trải nghiệm không được nằm trong quá khứ");
        }
    }

    private String generateBookingCode() {
        return "JG" + UUID.randomUUID().toString().replace("-", "").substring(0, 18).toUpperCase();
    }

    /** Thời điểm hiện tại theo múi giờ VNPay. */
    public LocalDateTime nowVnPay() {
        return LocalDateTime.ofInstant(Instant.now(), VIETNAM_ZONE);
    }
}
