package com.journeygo.modules.booking.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.dto.request.CreateBookingRequest;
import com.journeygo.modules.booking.dto.response.BookingPassengerResponse;
import com.journeygo.modules.booking.dto.response.BookingResponse;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.entity.BookingPassengerInvitation;
import com.journeygo.modules.booking.entity.BookingSlotHold;
import com.journeygo.modules.booking.entity.enums.BookingPassengerStatus;
import com.journeygo.modules.booking.entity.enums.BookingSlotType;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.entity.enums.InvitationStatus;
import com.journeygo.modules.booking.event.BookingCompletedEvent;
import com.journeygo.modules.booking.repository.BookingPassengerRepository;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.booking.repository.BookingSlotHoldRepository;
import com.journeygo.modules.booking.support.GuestAgeResolver;
import com.journeygo.modules.experience.entity.ExperienceSlot;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.experience.repository.ExperienceSlotRepository;
import com.journeygo.modules.finance.config.FinanceProperties;
import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourSlot;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.tour.repository.TourSlotRepository;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
 *   <li><b>Slot chỉ được giải phóng</b> khi Booking chuyển sang EXPIRED hoặc bị hủy hợp lệ.</li>
 * </ul>
 *
 * <p><b>Đặt tour nhóm</b> (theo tài liệu "Đặt - Thanh toán tour"):
 * <ul>
 *   <li>Mỗi hành khách chiếm 1 slot trải nghiệm; số slot giữ = số hành khách có
 *       {@code countsTowardSlot = TRUE} (em bé theo cấu hình đối tác thường không chiếm slot).</li>
 *   <li>Loại khách được xác định theo TUỔI TẠI NGÀY TRẢI NGHIỆM (không theo ngày đặt) —
 *       xem {@link GuestAgeResolver}.</li>
 *   <li>Giá = tổng giá vé của từng hành khách theo bảng giá {@code tour_prices} của tour.</li>
 *   <li>Người đặt (Booking Customer) là một trong các hành khách và giữ quyền quản lý Booking.</li>
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
    private final BookingPassengerRepository passengerRepository;
    private final ExperienceSlotRepository experienceSlotRepository;
    private final ExperienceRepository experienceRepository;
    private final FinanceProperties financeProperties;
    private final TourRepository tourRepository;
    private final TourSlotRepository tourSlotRepository;
    private final UserRepository userRepository;
    private final TourBookingCatalogService catalogService;
    private final ApplicationEventPublisher eventPublisher;
    private final BookingInvitationService invitationService;

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * Tạo Booking mới cho một Tourist (có thể đặt cho bản thân hoặc cho cả nhóm).
     *
     * <p>Toàn bộ thao tác (kiểm tra điều kiện đặt + giữ slot + lưu Booking + lưu hành khách)
     * nằm trong một transaction — nếu một slot không còn chỗ thì rollback toàn bộ, không để
     * sót slot đã giữ một phần (UC-02).
     */
    @Transactional
    public BookingResponse createBooking(CreateBookingRequest request, Long touristId) {
        User tourist = userRepository.findById(touristId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Tour tour = tourRepository.findByTourId(request.tourId())
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_NOT_FOUND));

        validateTourBookable(tour);
        validateExperienceDate(tour, request.experienceDate());

        // ── Chuẩn bị danh sách hành khách + chốt giá ─────────────────────────
        PriceSnapshot price = buildPriceSnapshot(tour, request);

        // ── Kiểm tra + giữ chỗ NGUYÊN TỬ ────────────────────────────────────
        TourSlot tourSlot = null;
        ExperienceSlot legacySlot = null;

        if (tour.isWizardTour()) {
            // Tour luồng 5 bước: giữ chỗ trên TourSlot (sức chứa theo ngày khởi hành).
            tourSlot = tourSlotRepository
                    .findByTourAndDateForUpdate(tour.getTourId(), request.experienceDate())
                    .orElseThrow(() -> new AppException(ErrorCode.BOOKING_SLOT_NOT_FOUND,
                            "Tour chưa mở bán ngày " + request.experienceDate()));
            if (tourSlot.getCapacity() == null || tourSlot.getCapacity() <= 0) {
                throw new AppException(ErrorCode.BOOKING_SLOT_FULL,
                        "Tour đã hết chỗ ngày " + request.experienceDate());
            }
            if (price.slotCount() <= 0) {
                throw new AppException(ErrorCode.BOOKING_NO_AVAILABLE_EXPERIENCE,
                        "Tour này không có hành khách nào chiếm chỗ — không thể đặt");
            }
            int updated = tourSlotRepository.atomicReserveSlots(tourSlot.getId(), price.slotCount());
            if (updated == 0) {
                throw new AppException(ErrorCode.BOOKING_SLOT_FULL,
                        "Tour đã hết chỗ ngày " + request.experienceDate());
            }
        } else {
            // Tour luồng cũ: giữ chỗ trên ExperienceSlot (mỗi booking 1 slot).
            ExperienceSlot slot = findLegacyExperienceSlot(tour, request.experienceDate());
            if (slot == null) {
                if (!financeProperties.isAutoOpenSlots()) {
                    throw new AppException(ErrorCode.BOOKING_SLOT_NOT_FOUND,
                            "Trải nghiệm chưa mở bán ngày " + request.experienceDate());
                }
                slot = openSlot(findFirstExperienceId(tour), request.experienceDate());
            }
            int updated = experienceSlotRepository.atomicReserveSlot(slot.getId());
            if (updated == 0) {
                throw new AppException(ErrorCode.BOOKING_SLOT_FULL,
                        "Trải nghiệm vừa hết chỗ, vui lòng thử lại");
            }
            legacySlot = slot;
        }

        // ── Lưu Booking ──────────────────────────────────────────────────────
        Instant now = Instant.now();
        Booking booking = Booking.builder()
                .bookingCode(generateBookingCode())
                .tourist(tourist)
                .tour(tour)
                .experienceDate(request.experienceDate())
                .totalAmount(price.totalAmount())
                .currency("VND")
                .status(BookingStatus.PENDING_PAYMENT)
                .paymentDeadline(now.plus(PAYMENT_DEADLINE))
                .slotCount(price.slotCount())
                .build();

        Booking saved = bookingRepository.save(booking);

        // ── Lưu danh sách hành khách ─────────────────────────────────────────
        for (PassengerDraft draft : price.passengers()) {
            BookingPassenger passenger = BookingPassenger.builder()
                    .booking(saved)
                    .fullName(draft.fullName())
                    .birthDate(draft.birthDate())
                    .gender(draft.gender())
                    .email(draft.email())
                    .guestType(draft.guestType())
                    .price(draft.price())
                    .countsTowardSlot(draft.countsTowardSlot())
                    // Người đặt tour được liên kết với tài khoản ngay.
                    .bookingCustomer(draft.bookingCustomer())
                    .linkedUserId(draft.bookingCustomer() ? touristId : null)
                    .status(BookingPassengerStatus.ACTIVE)
                    .build();
            passengerRepository.save(passenger);
        }

        // ── Ghi nhận slot đã giữ ─────────────────────────────────────────────
        BookingSlotHold hold = BookingSlotHold.builder()
                .booking(saved)
                .slotType(tour.isWizardTour() ? BookingSlotType.TOUR : BookingSlotType.EXPERIENCE)
                .tourSlot(tourSlot)
                .experienceSlot(legacySlot)
                .experienceId(legacySlot != null && legacySlot.getExperience() != null
                        ? legacySlot.getExperience().getId() : null)
                .slotDate(request.experienceDate())
                .slotCount(price.slotCount())
                .build();
        slotHoldRepository.save(hold);

        log.info("Đã tạo booking id={} code={} tourist={} tour={} amount={} slotCount={} passengers={}",
                saved.getId(), saved.getBookingCode(), touristId, tour.getTourId(),
                price.totalAmount(), price.slotCount(), price.passengers().size());
        return BookingResponse.fromEntity(saved);
    }

    /**
     * Tìm ExperienceSlot của tour luồng cũ tại một ngày.
     *
     * <p>Tour luồng cũ gồm nhiều điểm đến, mỗi điểm đến có Experience; chỉ cần một slot
     * đại diện để giữ chỗ (giữ trên mọi Experience để không vỡ đối xứng).
     */
    private ExperienceSlot findLegacyExperienceSlot(Tour tour, LocalDate date) {
        List<Long> destinationIds = tour.getTourDestinations() == null
                ? List.of()
                : tour.getTourDestinations().stream()
                .map(td -> td.getDestination())
                .filter(d -> d != null)
                .map(d -> d.getId())
                .toList();
        if (destinationIds.isEmpty()) {
            return null;
        }
        List<ExperienceSlot> slots = experienceSlotRepository.findByExperienceIdsAndDate(
                experienceRepository.findByDestination_IdInOrderById(destinationIds).stream()
                        .map(e -> e.getId())
                        .toList(),
                date);
        return slots.stream().findFirst().orElse(null);
    }

    /** ID Experience đầu tiên của tour luồng cũ (dùng khi tự mở slot). */
    private Long findFirstExperienceId(Tour tour) {
        if (tour.getTourDestinations() == null) {
            throw new AppException(ErrorCode.BOOKING_NO_AVAILABLE_EXPERIENCE,
                    "Tour không có trải nghiệm nào khả dụng để đặt");
        }
        return tour.getTourDestinations().stream()
                .map(td -> td.getDestination())
                .filter(d -> d != null)
                .flatMap(d -> experienceRepository.findByDestination_Id(d.getId()).stream())
                .map(e -> e.getId())
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NO_AVAILABLE_EXPERIENCE,
                        "Tour không có trải nghiệm nào khả dụng để đặt"));
    }

    /**
     * Tự mở slot cho ngày Provider chưa cấu hình (app.finance.auto-open-slots).
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

    // ── Chuẩn bị hành khách & chốt giá ───────────────────────────────────────

    /** Một hành khách đã được xác định loại + giá, sẵn sàng lưu. */
    private record PassengerDraft(String fullName, LocalDate birthDate, String gender, String email,
                                  GuestType guestType, BigDecimal price, boolean countsTowardSlot,
                                  boolean bookingCustomer) {
    }

    /** Kết quả chốt giá cho một Booking nhóm. */
    private record PriceSnapshot(List<PassengerDraft> passengers, BigDecimal totalAmount, int slotCount) {
    }

    /**
     * Xác định loại khách, giá và số slot từ danh sách hành khách khách gửi lên.
     *
     * <p>Quy tắc:
     * <ul>
     *   <li>Loại khách: nếu khách chỉ định → dùng; ngược lại tự tính từ ngày sinh tại ngày
     *       trải nghiệm.</li>
     *   <li>Tour không bán loại khách đó ⇒ lỗi nghiệp vụ (đối tác chưa mở bán loại khách).</li>
     *   <li>Giá: lấy từ bảng giá của tour theo loại khách. Em bé luôn miễn phí.</li>
     *   <li>Slot: mỗi hành khách có {@code countsTowardSlot} chiếm 1 slot.</li>
     * </ul>
     */
    private PriceSnapshot buildPriceSnapshot(Tour tour, CreateBookingRequest request) {
        TourBookingCatalogService.PriceTable table = resolvePriceTable(tour);
        LocalDate experienceDate = request.experienceDate();

        List<PassengerDraft> drafts = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        int slotCount = 0;
        boolean customerAssigned = false;
        java.util.Set<String> seenEmails = new java.util.LinkedHashSet<>();

        for (CreateBookingRequest.PassengerRequest p : request.passengers()) {
            // Loại khách: ưu tiên giá trị khách gửi, nếu không thì tính từ tuổi tại ngày trải nghiệm.
            GuestType guestType = p.guestType() != null
                    ? p.guestType()
                    : GuestAgeResolver.resolveGuestTypeOrAdult(p.birthDate(), experienceDate);

            if (!table.sells(guestType)) {
                throw new AppException(ErrorCode.BOOKING_GUEST_TYPE_NOT_AVAILABLE,
                        "Tour hiện không bán vé cho loại khách \""
                                + guestType.getLabel() + "\" — vui lòng kiểm tra lại thông tin hành khách");
            }

            // Người lớn bắt buộc có email (để nhận vé và quyền truy cập tour).
            String email = p.email() == null || p.email().isBlank()
                    ? null
                    : p.email().trim().toLowerCase();
            if (guestType == GuestType.ADULT && email == null) {
                throw new AppException(ErrorCode.BOOKING_PASSENGER_EMAIL_REQUIRED,
                        "Hành khách người lớn bắt buộc phải có email");
            }
            // Không được trùng email trong cùng nhóm (mỗi email = một tài khoản).
            if (email != null && !seenEmails.add(email)) {
                throw new AppException(ErrorCode.BOOKING_PASSENGER_DUPLICATE_EMAIL,
                        "Email \"" + email + "\" bị trùng trong nhóm hành khách");
            }

            BigDecimal price = table.priceOf(guestType);
            if (guestType.isAlwaysFree()) {
                price = BigDecimal.ZERO;
            }

            boolean countsSlot = table.countsTowardSlot(guestType);

            // Người đặt là hành khách có email trùng email tài khoản, hoặc hành khách đầu tiên.
            boolean isCustomer = !customerAssigned && matchesCustomer(p, drafts.size());
            if (isCustomer) {
                customerAssigned = true;
            }

            drafts.add(new PassengerDraft(
                    p.fullName().trim(), p.birthDate(), p.gender(),
                    email,
                    guestType, price, countsSlot, isCustomer));

            total = total.add(price);
            if (countsSlot) {
                slotCount++;
            }
        }

        if (!customerAssigned) {
            // Không hành khách nào khớp người đặt ⇒ hành khách đầu tiên đóng vai người đặt.
            PassengerDraft first = drafts.get(0);
            drafts.set(0, new PassengerDraft(first.fullName(), first.birthDate(), first.gender(),
                    first.email(), first.guestType(), first.price(), first.countsTowardSlot(), true));
        }

        return new PriceSnapshot(drafts, total, slotCount);
    }

    /**
     * Bảng giá của tour.
     *
     * <p>Tour luồng 5 bước dùng {@code tour_prices}. Tour luồng cũ không có bảng giá theo loại
     * khách ⇒ dùng giá trước đây (tổng giá Experience) cho mọi loại khách.
     */
    private TourBookingCatalogService.PriceTable resolvePriceTable(Tour tour) {
        TourBookingCatalogService.PriceTable table = catalogService.priceTable(tour);
        if (!table.prices().isEmpty()) {
            return table;
        }
        BigDecimal flat = catalogService.flatPriceOf(tour);
        return catalogService.legacyFlatPriceTable(flat);
    }

    /** Hành khách đầu tiên được coi là người đặt (người đặt luôn là hành khách đầu tiên trong nhóm). */
    private boolean matchesCustomer(CreateBookingRequest.PassengerRequest p, int index) {
        return index == 0;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public BookingResponse getById(Long bookingId, Long callerId, boolean isAdmin) {
        Booking booking = findOrThrow(bookingId);
        checkViewAccess(booking, callerId, isAdmin);
        return buildResponse(booking, callerId, isAdmin);
    }

    /**
     * Dựng response chi tiết Booking theo QUYỀN của người đang xem.
     *
     * <p>Ma trận quyền (theo tài liệu "Mời tham gia Tour"):
     * <ul>
     *   <li><b>Booking Customer</b> — xem tất cả thông tin cá nhân của mọi hành khách.</li>
     *   <li><b>Hành khách được mời</b> — xem chi tiết Booking, xem thông tin của chính mình,
     *       nhưng KHÔNG xem thông tin cá nhân của hành khách khác (che email / ngày sinh / giới tính).</li>
     *   <li><b>Admin</b> — xem tất cả.</li>
     * </ul>
     */
    @Transactional(readOnly = true)
    public BookingResponse buildResponse(Booking booking, Long callerId, boolean isAdmin) {
        List<BookingPassenger> passengers = passengerRepository
                .findByBooking_IdOrderByCreatedAtAsc(booking.getId());

        boolean isOwner = booking.getTourist() != null && callerId != null
                && booking.getTourist().getId().equals(callerId);
        // Hành khách được mời: xem được Booking nhưng không xem PII của người khác.
        boolean isGuestPassenger = !isOwner && !isAdmin && callerId != null
                && passengers.stream().anyMatch(p -> callerId.equals(p.getLinkedUserId()));

        // Lời mời gần nhất của từng hành khách (để UI hiển thị trạng thái "đã gửi mời"...).
        Map<Long, BookingPassengerInvitation> latestInvitations = new HashMap<>();
        for (BookingPassengerInvitation inv : invitationService
                .listInvitationsOfBooking(booking.getId())) {
            latestInvitations.putIfAbsent(inv.getPassenger().getId(), inv);
        }

        Instant now = Instant.now();
        List<BookingPassengerResponse> passengerResponses = passengers.stream()
                .map(p -> {
                    boolean self = callerId != null && callerId.equals(p.getLinkedUserId());
                    boolean visible = isAdmin || isOwner || self;
                    BookingPassengerInvitation inv = latestInvitations.get(p.getId());
                    InvitationStatus invStatus = inv != null ? inv.getStatus() : null;
                    Instant invExpires = inv != null ? inv.getExpiresAt() : null;
                    return BookingPassengerResponse.fromEntity(
                            p, booking.getExperienceDate(), visible, invStatus, invExpires);
                })
                .toList();

        return BookingResponse.fromEntity(booking, passengerResponses, null, now);
    }

    @Transactional(readOnly = true)
    public PageResponse<BookingResponse> getMyBookings(Long touristId, Pageable pageable) {
        Page<Booking> page = bookingRepository.findByTourist_Id(touristId, pageable);
        return PageResponse.from(page, b -> buildResponse(b, touristId, false));
    }

    /**
     * Danh sách booking mà user có quyền xem: vừa là người đặt, vừa là hành khách được mời.
     *
     * <p>⚠️ Hành khách được mời KHÔNG được xem thông tin cá nhân của hành khách khác
     * ⇒ {@link #buildResponse} tự ẩn PII tương ứng.
     */
    @Transactional(readOnly = true)
    public List<BookingResponse> getAccessibleBookings(Long userId) {
        List<Booking> owned = bookingRepository.findByTourist_IdOrderByCreatedAtDesc(userId);
        List<Booking> joined = bookingRepository
                .findByPassengerLinkedUserId(userId, Pageable.unpaged()).getContent();
        Map<Long, Booking> merged = new LinkedHashMap<>();
        for (Booking b : owned) merged.put(b.getId(), b);
        for (Booking b : joined) merged.putIfAbsent(b.getId(), b);
        return merged.values().stream()
                .map(b -> buildResponse(b, userId, false))
                .toList();
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

        // Lời mời chưa sử dụng bị vô hiệu hóa khi booking bị hủy.
        invitationService.revokeAllForBooking(bookingId);

        log.info("Đã hủy booking id={} bởi user={}", bookingId, callerId);
        return BookingResponse.fromEntity(booking);
    }

    // ── Complete ──────────────────────────────────────────────────────────────

    /**
     * Đánh dấu Booking đã hoàn thành trải nghiệm.
     *
     * <p>Đây là mốc quyết định doanh thu ProviderProfile được xét điều kiện tất toán
     * (Mục 4.1 — "Booking chỉ phát sinh doanh thu có thể tất toán sau khi trải nghiệm hoàn thành";
     * ngày hoàn thành trải nghiệm là căn cứ xác định kỳ doanh thu).
     *
     * <p>Phát {@link BookingCompletedEvent} để {@code ProviderRevenueService} đánh giá lại
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

        log.info("Đã đánh dấu hoàn thành booking id={} tại {}", booking.getId(), at);
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
        // Lời mời chưa sử dụng cũng bị vô hiệu hóa khi booking hết hạn thanh toán.
        invitationService.revokeAllForBooking(booking.getId());
    }

    /**
     * Giải phóng các slot đã giữ — đúng một lần nhờ cờ {@code released}.
     *
     * <p>⚠️ Vì sao phải gom ID slot TRƯỚC rồi mới gọi bulk UPDATE?
     * <ul>
     *   <li>Bulk UPDATE có thể {@code clear} PersistenceContext ⇒ entity {@code Booking} đang
     *       quản lý sẽ bị detach ⇒ {@code BookingResponse.fromEntity(booking)} ném
     *       {@code LazyInitializationException} khi truy cập {@code booking.getSlotHolds()}.</li>
     *   <li>Gom ID trước còn giúp tránh truy cập lazy {@code hold.getExperienceSlot()}
     *       sau khi bulk update đã làm thay đổi trạng thái của các entity liên quan.</li>
     * </ul>
     */
    private void releaseSlots(Booking booking) {
        List<BookingSlotHold> holds = slotHoldRepository.findByBooking_Id(booking.getId());
        if (holds.isEmpty()) {
            return;
        }

        // Gom ID slot cần giải phóng + đánh dấu hold TRƯỚC khi chạy bulk UPDATE.
        List<Long> slotIds = new java.util.ArrayList<>();
        List<Long> tourSlotIds = new java.util.ArrayList<>();
        for (BookingSlotHold hold : holds) {
            if (!hold.markReleased()) {
                // Đã giải phóng trước đó — bỏ qua để không cộng/trừ sai số chỗ.
                continue;
            }
            slotHoldRepository.save(hold);
            int count = Math.max(1, hold.getSlotCount());
            if (hold.getTourSlot() != null) {
                tourSlotIds.add(hold.getTourSlot().getId());
            } else if (hold.getExperienceSlot() != null) {
                slotIds.add(hold.getExperienceSlot().getId());
            }
        }

        // Bulk UPDATE sau khi đã thu thập xong ID ⇒ PersistenceContext không bị clear
        // giữa chừng ⇒ lazy collection của Booking vẫn khởi tạo được trong transaction.
        for (Long slotId : slotIds) {
            experienceSlotRepository.atomicReleaseSlot(slotId);
        }
        for (Long tourSlotId : tourSlotIds) {
            tourSlotRepository.atomicReleaseSlots(tourSlotId, booking.getSlotCount());
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
     * Kiểm tra du khách có được phép bắt đầu hành trình của một Booking hay chưa.
     *
     * <p>Quy tắc "Tour bị khoá cho tới ngày trải nghiệm":
     * <ul>
     *   <li>Chỉ người đặt tour hoặc hành khách đã liên kết tài khoản mới được bắt đầu.</li>
     *   <li>Chưa tới ngày trải nghiệm thì bị chặn (tour bị khoá).</li>
     *   <li>Booking chưa thanh toán / bị hủy / quá hạn thì không được bắt đầu.</li>
     * </ul>
     *
     * @throws AppException nếu không được phép
     */
    @Transactional(readOnly = true)
    public Booking assertJourneyAllowed(Long bookingId, Long userId) {
        Booking booking = findOrThrow(bookingId);

        boolean isOwner = booking.getTourist() != null && userId.equals(booking.getTourist().getId());
        boolean isPassenger = passengerRepository
                .findByBooking_IdOrderByCreatedAtAsc(booking.getId()).stream()
                .anyMatch(p -> userId.equals(p.getLinkedUserId()));
        if (!isOwner && !isPassenger) {
            throw new AppException(ErrorCode.UNAUTHORIZED,
                    "Bạn không có quyền bắt đầu hành trình của booking này");
        }

        if (!booking.getStatus().isPaid()) {
            throw new AppException(ErrorCode.BOOKING_INVALID_STATUS_FOR_CANCEL,
                    "Booking chưa thanh toán thành công — chưa thể bắt đầu hành trình");
        }
        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.EXPIRED) {
            throw new AppException(ErrorCode.BOOKING_INVALID_STATUS_FOR_CANCEL,
                    "Booking đã bị hủy hoặc hết hạn — không thể bắt đầu hành trình");
        }

        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        if (booking.getExperienceDate() != null && booking.getExperienceDate().isAfter(today)) {
            throw new AppException(ErrorCode.BOOKING_TOUR_LOCKED,
                    "Tour chỉ mở từ ngày trải nghiệm ("
                            + booking.getExperienceDate() + ") — còn "
                            + java.time.temporal.ChronoUnit.DAYS.between(today, booking.getExperienceDate())
                            + " ngày nữa");
        }

        return booking;
    }

    /** Ngày trải nghiệm của một booking (dùng để tính đồng hồ đếm ngược). */
    @Transactional(readOnly = true)
    public LocalDate experienceDateOf(Long bookingId) {
        return findOrThrow(bookingId).getExperienceDate();
    }

    /**
     * Tìm Booking kèm khóa write — dùng khi xử lý callback thanh toán để tránh race condition
     * với tác vụ hết hạn (UC-01: "Backend phải đảm bảo không vừa giải phóng chỗ vừa xác nhận Booking").
     */
    @Transactional(readOnly = true)
    public Booking findByIdForUpdate(Long bookingId) {
        return bookingRepository.findByIdForUpdate(bookingId).orElse(null);
    }

    /**
     * Nạp Booking theo id, kèm sẵn {@code tourist}, {@code tour}, {@code tour.createdBy}.
     *
     * <p>⚠️ Vì sao KHÔNG dùng {@code findById}?
     * Hàm này được gọi từ controller — NGOÀI giao dịch — nên entity trả về sẽ bị DETACH
     * khỏi PersistenceContext. Mọi truy cập vào proxy lười ({@code getTour()},
     * {@code getTourist()}, {@code getTour().getCreatedBy()}) sau đó sẽ ném
     * {@code LazyInitializationException: could not initialize proxy - no Session}.
     * Đó chính là lý do email lời mời không được gửi (lỗi bị nuốt trong log) và
     * API danh sách hành khách trả về 500.
     *
     * <p>⇒ Dùng EntityGraph để nạp sẵn các liên kết này ⇒ không còn phụ thuộc session.
     */
    public Booking findOrThrow(Long bookingId) {
        return bookingRepository.findByIdWithRelations(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
    }

    /**
     * Kiểm tra quyền XEM chi tiết Booking.
     *
     * <p>⚠️ Ngoài người đặt (Booking Customer) và Admin, HÀNH KHÁCH ĐƯỢC MỜI
     * (đã liên kết tài khoản) cũng được xem chi tiết Booking — theo ma trận quyền.
     * Họ KHÔNG được quyền sửa/hủy/thanh toán ⇒ các luồng đó dùng {@link #checkOwnership}
     * (chỉ người đặt).
     */
    private void checkViewAccess(Booking booking, Long callerId, boolean isAdmin) {
        if (isAdmin) {
            return;
        }
        Long ownerId = booking.getTourist() != null ? booking.getTourist().getId() : null;
        if (ownerId != null && ownerId.equals(callerId)) {
            return;
        }
        if (callerId != null && passengerRepository
                .findByBooking_IdOrderByCreatedAtAsc(booking.getId()).stream()
                .anyMatch(p -> callerId.equals(p.getLinkedUserId()))) {
            return;
        }
        throw new AppException(ErrorCode.UNAUTHORIZED,
                "Bạn không có quyền truy cập Booking này");
    }

    /**
     * Kiểm tra quyền QUẢN LÝ Booking — CHỈ người đặt (Booking Customer) và Admin.
     *
     * <p>⚠️ Hành khách được mời KHÔNG được quyền sửa / hủy / thanh toán (quy tắc 9).
     */
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
        // Tour luồng 5 bước: ngày trải nghiệm phải nằm trong lịch khởi hành đã công bố.
        if (tour.isWizardTour() && catalogService.findDepartureDate(tour, experienceDate).isEmpty()) {
            throw new AppException(ErrorCode.BOOKING_INVALID_DATE,
                    "Ngày " + experienceDate + " không có trong lịch khởi hành của tour");
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
