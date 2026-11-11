package com.journeygo.modules.booking.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.auth.service.EmailService;
import com.journeygo.modules.booking.dto.response.InvitationResponse;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.entity.BookingPassengerInvitation;
import com.journeygo.modules.booking.entity.enums.BookingPassengerStatus;
import com.journeygo.modules.booking.entity.enums.InvitationStatus;
import com.journeygo.modules.booking.repository.BookingPassengerInvitationRepository;
import com.journeygo.modules.booking.repository.BookingPassengerRepository;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Luồng lời mời tham gia tour (Tour Invitation).
 *
 * <p>Trọng tâm: trước đây lỗi {@code LazyInitializationException} khi dựng nội dung email
 * bị nuốt trong log ⇒ UI hiện "Đã gửi lời mời" nhưng email không hề được gửi.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class BookingInvitationServiceTest {

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private BookingPassengerRepository passengerRepository;
    @Mock
    private BookingPassengerInvitationRepository invitationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private EmailService emailService;

    @InjectMocks
    private BookingInvitationService service;

    private static final Long BOOKING_ID = 42L;
    private static final Long TOURIST_ID = 8L;
    private static final Long PASSENGER_ID = 20L;
    private static final Long PROVIDER_ID = 4L;
    private static final String GUEST_EMAIL = "khach_moi@example.com";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "appInvitationUrl", "journeygo://booking/invitations/accept");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Booking booking() {
        User tourist = User.builder().id(TOURIST_ID).fullName("Nguyen Van A").email("tourist1@journeygo.com").build();
        User provider = User.builder().id(PROVIDER_ID).fullName("Ban Quản Lý").email("provider@journeygo.com").build();
        Booking b = Booking.builder()
                .id(BOOKING_ID)
                .tourist(tourist)
                .experienceDate(java.time.LocalDate.of(2026, 12, 28))
                .build();
        b.getTour();
        return b;
    }

    private BookingPassenger guestPassenger() {
        return BookingPassenger.builder()
                .id(PASSENGER_ID)
                .booking(booking())
                .fullName("Tran Thi Guest")
                .email(GUEST_EMAIL)
                .status(BookingPassengerStatus.ACTIVE)
                .bookingCustomer(false)
                .build();
    }

    // ── Tests ────────────────────────────────────────────────────────────────

    /**
     * Gửi lời mời thành công ⇒ email THẬT SỰ được gửi qua EmailService.
     */
    @Test
    void invite_sendsEmailToGuest() {
        Booking b = booking();
        BookingPassenger p = guestPassenger();
        when(bookingRepository.findByIdWithRelations(BOOKING_ID)).thenReturn(Optional.of(b));
        when(passengerRepository.findByIdAndBooking_Id(PASSENGER_ID, BOOKING_ID)).thenReturn(Optional.of(p));
        when(invitationRepository.findByPassenger_IdAndStatus(PASSENGER_ID, InvitationStatus.PENDING))
                .thenReturn(List.of());
        when(invitationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(emailService.sendHtml(anyString(), anyString(), anyString())).thenReturn(true);

        InvitationResponse res = service.invite(b, PASSENGER_ID, TOURIST_ID, null);

        assertEquals(InvitationStatus.PENDING, res.status());
        verify(emailService, times(1)).sendHtml(eq(GUEST_EMAIL), contains("Lời mời tham gia tour"), contains("Tran Thi Guest"));
    }

    /**
     * Email KHÔNG gửi được (SMTP lỗi) ⇒ phải báo lỗi cho người dùng,
     * tuyệt đối không trả về "thành công" như trước đây.
     */
    @Test
    void invite_failsWhenEmailCannotBeSent() {
        Booking b = booking();
        BookingPassenger p = guestPassenger();
        when(bookingRepository.findByIdWithRelations(BOOKING_ID)).thenReturn(Optional.of(b));
        when(passengerRepository.findByIdAndBooking_Id(PASSENGER_ID, BOOKING_ID)).thenReturn(Optional.of(p));
        when(invitationRepository.findByPassenger_IdAndStatus(PASSENGER_ID, InvitationStatus.PENDING))
                .thenReturn(List.of());
        when(invitationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(emailService.sendHtml(anyString(), anyString(), anyString())).thenReturn(false);

        AppException ex = assertThrows(AppException.class,
                () -> service.invite(b, PASSENGER_ID, TOURIST_ID, null));
        assertEquals(ErrorCode.MAIL_SEND_FAILED, ex.getErrorCode());
    }

    /**
     * Lỗi khi dựng/gửi nội dung email (ví d. proxy lazy không load được, SMTP lỗi)
     * phải được phản ánh ra ngoài, không bị nuốt im lặng.
     */
    @Test
    void invite_failsWhenEmailTemplateCannotBeBuilt() {
        Booking b = booking();
        BookingPassenger p = guestPassenger();
        when(bookingRepository.findByIdWithRelations(BOOKING_ID)).thenReturn(Optional.of(b));
        when(passengerRepository.findByIdAndBooking_Id(PASSENGER_ID, BOOKING_ID)).thenReturn(Optional.of(p));
        when(invitationRepository.findByPassenger_IdAndStatus(PASSENGER_ID, InvitationStatus.PENDING))
                .thenReturn(List.of());
        when(invitationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        // Mô phỏng lỗi dựng nội dung email (LazyInitializationException / lỗi template).
        when(emailService.sendHtml(anyString(), anyString(), anyString()))
                .thenThrow(new IllegalStateException("could not initialize proxy - no Session"));

        AppException ex = assertThrows(AppException.class,
                () -> service.invite(b, PASSENGER_ID, TOURIST_ID, null));
        assertEquals(ErrorCode.MAIL_SEND_FAILED, ex.getErrorCode());
    }

    /**
     * Tour = null ⇒ nội dung email vẫn phải dựng được (không NPE).
     */
    @Test
    void invite_handlesBookingWithoutTour() {
        Booking noTour = booking();
        noTour.setTour(null);
        BookingPassenger p = guestPassenger();
        when(bookingRepository.findByIdWithRelations(BOOKING_ID)).thenReturn(Optional.of(noTour));
        when(passengerRepository.findByIdAndBooking_Id(PASSENGER_ID, BOOKING_ID)).thenReturn(Optional.of(p));
        when(invitationRepository.findByPassenger_IdAndStatus(PASSENGER_ID, InvitationStatus.PENDING))
                .thenReturn(List.of());
        when(invitationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(emailService.sendHtml(anyString(), anyString(), anyString())).thenReturn(true);

        InvitationResponse res = service.invite(noTour, PASSENGER_ID, TOURIST_ID, null);

        assertEquals(InvitationStatus.PENDING, res.status());
        verify(emailService).sendHtml(eq(GUEST_EMAIL), contains("Lời mời tham gia tour"), contains("tour"));
    }

    /**
     * Email override được chuẩn hoá (lowercase, trim) và dùng làm địa chỉ nhận.
     */
    @Test
    void invite_usesNormalizedEmailOverride() {
        Booking b = booking();
        BookingPassenger p = guestPassenger();
        when(bookingRepository.findByIdWithRelations(BOOKING_ID)).thenReturn(Optional.of(b));
        when(passengerRepository.findByIdAndBooking_Id(PASSENGER_ID, BOOKING_ID)).thenReturn(Optional.of(p));
        when(invitationRepository.findByPassenger_IdAndStatus(PASSENGER_ID, InvitationStatus.PENDING))
                .thenReturn(List.of());
        when(invitationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(emailService.sendHtml(anyString(), anyString(), anyString())).thenReturn(true);

        service.invite(b, PASSENGER_ID, TOURIST_ID, "  KHACH_MOI@Example.COM  ");

        verify(emailService).sendHtml(eq("khach_moi@example.com"), anyString(), anyString());
    }

    /**
     * Hành khách không có email ⇒ không gửi được lời mời.
     */
    @Test
    void invite_rejectsPassengerWithoutEmail() {
        Booking b = booking();
        BookingPassenger p = guestPassenger();
        p.setEmail(null);
        when(bookingRepository.findByIdWithRelations(BOOKING_ID)).thenReturn(Optional.of(b));
        when(passengerRepository.findByIdAndBooking_Id(PASSENGER_ID, BOOKING_ID)).thenReturn(Optional.of(p));

        AppException ex = assertThrows(AppException.class,
                () -> service.invite(b, PASSENGER_ID, TOURIST_ID, null));
        assertEquals(ErrorCode.BOOKING_INVITATION_NO_EMAIL, ex.getErrorCode());
        verify(emailService, never()).sendHtml(anyString(), anyString(), anyString());
    }

    /**
     * Người đặt tour (đã có tài khoản) không cần lời mời.
     */
    @Test
    void invite_rejectsBookingCustomer() {
        Booking b = booking();
        BookingPassenger p = guestPassenger();
        p.setBookingCustomer(true);
        when(bookingRepository.findByIdWithRelations(BOOKING_ID)).thenReturn(Optional.of(b));
        when(passengerRepository.findByIdAndBooking_Id(PASSENGER_ID, BOOKING_ID)).thenReturn(Optional.of(p));

        AppException ex = assertThrows(AppException.class,
                () -> service.invite(b, PASSENGER_ID, TOURIST_ID, null));
        assertEquals(ErrorCode.BOOKING_INVITATION_NO_EMAIL, ex.getErrorCode());
    }

    /**
     * Đã có lời mời đang chờ ⇒ không tạo trùng.
     */
    @Test
    void invite_rejectsWhenPendingInvitationExists() {
        Booking b = booking();
        BookingPassenger p = guestPassenger();
        BookingPassengerInvitation pending = BookingPassengerInvitation.builder()
                .id(99L)
                .booking(b)
                .passenger(p)
                .invitedBy(TOURIST_ID)
                .invitedEmail(GUEST_EMAIL)
                .invitationTokenHash("hash")
                .status(InvitationStatus.PENDING)
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
        when(bookingRepository.findByIdWithRelations(BOOKING_ID)).thenReturn(Optional.of(b));
        when(passengerRepository.findByIdAndBooking_Id(PASSENGER_ID, BOOKING_ID)).thenReturn(Optional.of(p));
        when(invitationRepository.findByPassenger_IdAndStatus(PASSENGER_ID, InvitationStatus.PENDING))
                .thenReturn(List.of(pending));

        AppException ex = assertThrows(AppException.class,
                () -> service.invite(b, PASSENGER_ID, TOURIST_ID, null));
        assertEquals(ErrorCode.BOOKING_INVITATION_ALREADY_PENDING, ex.getErrorCode());
        verify(emailService, never()).sendHtml(anyString(), anyString(), anyString());
    }

    // ── Xác nhận lời mời ─────────────────────────────────────────────────────

    /**
     * Người được mời xác nhận ⇒ hành khách được liên kết với tài khoản.
     */
    @Test
    void accept_linksPassengerToUser() {
        Booking b = booking();
        BookingPassenger p = guestPassenger();
        BookingPassengerInvitation inv = BookingPassengerInvitation.builder()
                .id(77L)
                .booking(b)
                .passenger(p)
                .invitedBy(TOURIST_ID)
                .invitedEmail(GUEST_EMAIL)
                .invitationTokenHash(BookingInvitationService.sha256("raw-token"))
                .status(InvitationStatus.PENDING)
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
        User guest = User.builder().id(555L).email(GUEST_EMAIL).fullName("Tran Thi Guest").build();

        when(invitationRepository.findByInvitationTokenHash(anyString())).thenReturn(Optional.of(inv));
        when(userRepository.findById(555L)).thenReturn(Optional.of(guest));
        when(passengerRepository.findByBooking_IdOrderByCreatedAtAsc(BOOKING_ID)).thenReturn(List.of(p));
        when(passengerRepository.save(any())).thenAnswer(inv2 -> inv2.getArgument(0));
        when(invitationRepository.save(any())).thenAnswer(inv2 -> inv2.getArgument(0));

        InvitationResponse res = service.accept("raw-token", 555L);

        assertEquals(InvitationStatus.ACCEPTED, res.status());
        assertEquals(555L, p.getLinkedUserId());
    }

    /**
     * Đăng nhập bằng email KHÁC email được mời ⇒ từ chối.
     */
    @Test
    void accept_rejectsMismatchedEmail() {
        Booking b = booking();
        BookingPassenger p = guestPassenger();
        BookingPassengerInvitation inv = BookingPassengerInvitation.builder()
                .id(77L)
                .booking(b)
                .passenger(p)
                .invitedBy(TOURIST_ID)
                .invitedEmail(GUEST_EMAIL)
                .invitationTokenHash(BookingInvitationService.sha256("raw-token"))
                .status(InvitationStatus.PENDING)
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
        User other = User.builder().id(556L).email("someone_else@example.com").fullName("Khác").build();

        when(invitationRepository.findByInvitationTokenHash(anyString())).thenReturn(Optional.of(inv));
        when(userRepository.findById(556L)).thenReturn(Optional.of(other));

        AppException ex = assertThrows(AppException.class, () -> service.accept("raw-token", 556L));
        assertEquals(ErrorCode.BOOKING_INVITATION_EMAIL_MISMATCH, ex.getErrorCode());
    }

    /**
     * Lời mời đã hết hạn ⇒ từ chối.
     */
    @Test
    void accept_rejectsExpiredInvitation() {
        Booking b = booking();
        BookingPassenger p = guestPassenger();
        BookingPassengerInvitation inv = BookingPassengerInvitation.builder()
                .id(77L)
                .booking(b)
                .passenger(p)
                .invitedBy(TOURIST_ID)
                .invitedEmail(GUEST_EMAIL)
                .invitationTokenHash(BookingInvitationService.sha256("raw-token"))
                .status(InvitationStatus.PENDING)
                .expiresAt(Instant.now().minusSeconds(60))
                .build();

        when(invitationRepository.findByInvitationTokenHash(anyString())).thenReturn(Optional.of(inv));

        AppException ex = assertThrows(AppException.class, () -> service.accept("raw-token", 555L));
        assertEquals(ErrorCode.BOOKING_INVITATION_EXPIRED, ex.getErrorCode());
    }

    /**
     * Lời mời chỉ dùng được một lần.
     */
    @Test
    void accept_rejectsAlreadyUsedInvitation() {
        Booking b = booking();
        BookingPassenger p = guestPassenger();
        BookingPassengerInvitation inv = BookingPassengerInvitation.builder()
                .id(77L)
                .booking(b)
                .passenger(p)
                .invitedBy(TOURIST_ID)
                .invitedEmail(GUEST_EMAIL)
                .invitationTokenHash(BookingInvitationService.sha256("raw-token"))
                .status(InvitationStatus.ACCEPTED)
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        when(invitationRepository.findByInvitationTokenHash(anyString())).thenReturn(Optional.of(inv));

        AppException ex = assertThrows(AppException.class, () -> service.accept("raw-token", 555L));
        assertEquals(ErrorCode.BOOKING_INVITATION_ALREADY_USED, ex.getErrorCode());
    }

    /**
     * Chỉ lưu HASH của token thô trong DB, không lưu bản rõ.
     */
    @Test
    void invite_storesOnlyTokenHash() {
        Booking b = booking();
        BookingPassenger p = guestPassenger();
        when(bookingRepository.findByIdWithRelations(BOOKING_ID)).thenReturn(Optional.of(b));
        when(passengerRepository.findByIdAndBooking_Id(PASSENGER_ID, BOOKING_ID)).thenReturn(Optional.of(p));
        when(invitationRepository.findByPassenger_IdAndStatus(PASSENGER_ID, InvitationStatus.PENDING))
                .thenReturn(List.of());
        when(invitationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(emailService.sendHtml(anyString(), anyString(), anyString())).thenReturn(true);

        service.invite(b, PASSENGER_ID, TOURIST_ID, null);

        ArgumentCaptor<BookingPassengerInvitation> captor =
                ArgumentCaptor.forClass(BookingPassengerInvitation.class);
        verify(invitationRepository).save(captor.capture());
        String hash = captor.getValue().getInvitationTokenHash();
        assertNotNull(hash);
        assertEquals(64, hash.length());
    }
}
