package com.journeygo.modules.booking.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.auth.service.EmailService;
import com.journeygo.modules.booking.dto.response.InvitationResponse;
import com.journeygo.modules.booking.dto.response.PendingInvitationResponse;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

/**
 * Cơ chế Tour Invitation — mời hành khách tạo tài khoản riêng và tham gia tour.
 *
 * <p>Quy trình (theo tài liệu "Đặt - Thanh toán tour"):
 * <ol>
 *   <li>Người đặt chọn hành khách muốn mời và nhập email.</li>
 *   <li>Backend tạo Invitation Token (chỉ lưu SHA-256 hash).</li>
 *   <li>JourneyGo gửi email mời kèm liên kết tham gia.</li>
 *   <li>Người nhận mở liên kết: đã có tài khoản → đăng nhập; chưa có → đăng ký.</li>
 *   <li>Xác nhận tham gia ⇒ Passenger được liên kết với User.</li>
 * </ol>
 *
 * <p>Quy tắc nghiệp vụ:
 * <ol>
 *   <li>Chỉ Booking Customer được gửi lời mời.</li>
 *   <li>Chỉ mời Passenger có email.</li>
 *   <li>Email nhận lời mời phải trùng email Passenger.</li>
 *   <li>Một Passenger chỉ được liên kết với một User.</li>
 *   <li>Một User không được liên kết với nhiều Passenger trong cùng Booking.</li>
 *   <li>Mỗi lời mời chỉ được xác nhận một lần.</li>
 *   <li>Có thể gửi lại lời mời khi hết hạn.</li>
 *   <li>Booking bị hủy thì các lời mời chưa sử dụng bị vô hiệu hóa.</li>
 *   <li>Người được mời không có quyền sửa thông tin Booking hoặc thay đổi hành khách.</li>
 *   <li>Người đặt tour vẫn giữ quyền quản lý Booking.</li>
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BookingInvitationService {

    /** Hạn lời mời: 24 giờ kể từ lúc tạo. */
    public static final Duration INVITATION_TTL = Duration.ofHours(24);

    private final BookingRepository bookingRepository;
    private final BookingPassengerRepository passengerRepository;
    private final BookingPassengerInvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Value("${app.booking.invitation-app-url:journeygo://booking/invitations/accept}")
    private String appInvitationUrl;

    // ── Gửi lời mời ───────────────────────────────────────────────────────────

    /**
     * Người đặt gửi lời mời cho một hành khách.
     *
     * @return lời mời vừa tạo (chưa bao gồm token thô — token chỉ gửi qua email)
     */
    @Transactional
    public InvitationResponse invite(Booking booking, Long passengerId, Long inviterUserId, String emailOverride) {
        // Booking được controller nạp ngoài giao dịch ⇒ nạp lại trong giao dịch này để dựng nội dung email.
        Booking managedBooking = bookingRepository.findByIdWithRelations(booking.getId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
        booking = managedBooking;

        BookingPassenger passenger = passengerRepository.findByIdAndBooking_Id(passengerId, booking.getId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_PASSENGER_NOT_FOUND));

        if (passenger.isBookingCustomer()) {
            throw new AppException(ErrorCode.BOOKING_INVITATION_NO_EMAIL,
                    "Người đặt tour đã có tài khoản — không cần gửi lời mời");
        }
        if (passenger.getStatus() != BookingPassengerStatus.ACTIVE) {
            throw new AppException(ErrorCode.BOOKING_PASSENGER_CHANGE_NOT_ALLOWED,
                    "Hành khách này không còn hiệu lực nên không thể mời");
        }

        String email = (emailOverride != null && !emailOverride.isBlank())
                ? emailOverride.trim().toLowerCase(Locale.ROOT)
                : passenger.getEmail();

        if (email == null || email.isBlank()) {
            throw new AppException(ErrorCode.BOOKING_INVITATION_NO_EMAIL);
        }

        // Lời mời đang chờ cho hành khách này → không tạo trùng.
        List<BookingPassengerInvitation> pending = invitationRepository
                .findByPassenger_IdAndStatus(passenger.getId(), InvitationStatus.PENDING);
        Instant now = Instant.now();
        for (BookingPassengerInvitation inv : pending) {
            if (inv.isUsable(now)) {
                throw new AppException(ErrorCode.BOOKING_INVITATION_ALREADY_PENDING);
            }
            inv.markExpired();
        }

        // Token thô sinh ngẫu nhiên; chỉ lưu hash.
        String rawToken = java.util.UUID.randomUUID().toString()
                + "." + java.util.UUID.randomUUID().toString();
        String tokenHash = sha256(rawToken);

        BookingPassengerInvitation invitation = BookingPassengerInvitation.builder()
                .booking(booking)
                .passenger(passenger)
                .invitedBy(inviterUserId)
                .invitedEmail(email)
                .invitationTokenHash(tokenHash)
                .status(InvitationStatus.PENDING)
                .expiresAt(now.plus(INVITATION_TTL))
                .build();
        invitationRepository.save(invitation);

        // Gửi email. Nếu gửi thất bại ⇒ báo lỗi cho người dùng (và rollback lời mời),
        // tránh tình trạng UI hiện "Đã gửi lời mời" trong khi email không tới.
        boolean emailed = sendInvitationEmail(booking, passenger, email, rawToken);
        if (!emailed) {
            throw new AppException(ErrorCode.MAIL_SEND_FAILED,
                    "Không gửi được email lời mời tới " + email + " — vui lòng thử lại sau");
        }

        log.info("Đã gửi lời mời booking={} passenger={} email={}", booking.getId(), passenger.getId(), email);
        return InvitationResponse.fromEntity(invitation, passenger, now);
    }

    // ── Xác nhận lời mời ──────────────────────────────────────────────────────

    /**
     * Người nhận lời mời xác nhận tham gia.
     *
     * <p>Kiểm tra theo bảng "Trường hợp khi nhận lời mời" trong tài liệu:
     * <ul>
     *   <li>Đã có tài khoản → đăng nhập, xác minh email rồi xác nhận.</li>
     *   <li>Chưa có tài khoản → đăng ký, xác minh email rồi xác nhận.</li>
     *   <li>Đang đăng nhập bằng email khác → yêu cầu chuyển sang tài khoản đúng email.</li>
     *   <li>Lời mời hết hạn → yêu cầu người đặt gửi lại.</li>
     *   <li>Lời mời đã dùng → không cho xác nhận lần nữa.</li>
     * </ul>
     */
    @Transactional
    public InvitationResponse accept(String rawToken, Long userId) {
        BookingPassengerInvitation invitation = invitationRepository
                .findByInvitationTokenHash(sha256(rawToken))
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_INVITATION_NOT_FOUND));

        Instant now = Instant.now();
        if (invitation.getStatus() == InvitationStatus.ACCEPTED) {
            throw new AppException(ErrorCode.BOOKING_INVITATION_ALREADY_USED);
        }
        if (invitation.getStatus() == InvitationStatus.REVOKED) {
            throw new AppException(ErrorCode.BOOKING_INVITATION_EXPIRED,
                    "Lời mời đã bị vô hiệu hóa — vui lòng liên hệ người đặt tour");
        }
        if (!invitation.isUsable(now)) {
            invitation.markExpired();
            throw new AppException(ErrorCode.BOOKING_INVITATION_EXPIRED,
                    "Lời mời đã hết hạn — vui lòng yêu cầu người đặt tour gửi lại");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Email đang đăng nhập phải trùng email được mời.
        String userEmail = user.getEmail() == null ? "" : user.getEmail().toLowerCase(Locale.ROOT);
        if (!userEmail.equalsIgnoreCase(invitation.getInvitedEmail())) {
            throw new AppException(ErrorCode.BOOKING_INVITATION_EMAIL_MISMATCH,
                    "Bạn đang đăng nhập bằng email khác với email được mời ("
                            + invitation.getInvitedEmail() + ") — vui lòng dùng đúng tài khoản này");
        }

        Booking booking = invitation.getBooking();
        BookingPassenger passenger = invitation.getPassenger();

        // Một User không được liên kết với nhiều Passenger trong cùng Booking.
        boolean alreadyInBooking = passengerRepository
                .findByBooking_IdOrderByCreatedAtAsc(booking.getId()).stream()
                .anyMatch(p -> userId.equals(p.getLinkedUserId()) && !p.getId().equals(passenger.getId()));
        if (alreadyInBooking) {
            throw new AppException(ErrorCode.BOOKING_INVITATION_ALREADY_USED,
                    "Tài khoản này đã được liên kết với một hành khách khác trong đơn đặt này");
        }

        passenger.setLinkedUserId(userId);
        passenger.setEmail(userEmail);
        passengerRepository.save(passenger);

        invitation.accept(userId, now);
        invitationRepository.save(invitation);

        log.info("Hành khách {} đã xác nhận lời mời booking={}", passenger.getId(), booking.getId());
        return InvitationResponse.fromEntity(invitation, passenger, now);
    }

    /** Xem thông tin lời mời mà chưa cần xác nhận (dùng để hiển thị màn "Bạn được mời"). */
    @Transactional(readOnly = true)
    public InvitationResponse preview(String rawToken) {
        BookingPassengerInvitation invitation = invitationRepository
                .findByInvitationTokenHash(sha256(rawToken))
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_INVITATION_NOT_FOUND));

        Instant now = Instant.now();
        Booking booking = invitation.getBooking();
        BookingPassenger passenger = invitation.getPassenger();

        return InvitationResponse.builder()
                .id(invitation.getId())
                .passengerId(passenger.getId())
                .passengerName(passenger.getFullName())
                .invitedEmail(invitation.getInvitedEmail())
                .status(invitation.getStatus())
                .expiresAt(invitation.getExpiresAt())
                .acceptedAt(invitation.getAcceptedAt())
                .createdAt(invitation.getCreatedAt())
                .usable(invitation.isUsable(now))
                .build();
    }

    // ── Lời mời trong app (không cần deep link) ───────────────────────────────

    /**
     * Các lời mời ĐANG CHỜ mà người dùng hiện tại có thể xác nhận.
     *
     * <p>⚠️ Vì sao cần? Khi lời mời được gửi, người nhận có thể CHƯA có tài khoản
     * ⇒ không có user id ⇒ không tạo được notification cho họ. Khi họ đăng ký /
     * đăng nhập bằng đúng email được mời, ta tra cứu theo email để hiện lời mời
     * trong trung tâm thông báo của app.
     *
     * @param userId  người dùng đang đăng nhập
     * @param email   email của người dùng đang đăng nhập
     */
    @Transactional(readOnly = true)
    public List<PendingInvitationResponse> listPendingForUser(Long userId, String email) {
        if (email == null || email.isBlank()) return List.of();
        Instant now = Instant.now();
        List<BookingPassengerInvitation> invitations = invitationRepository
                .findByInvitedEmailAndStatus(email.trim(), InvitationStatus.PENDING);

        List<PendingInvitationResponse> result = new ArrayList<>();
        for (BookingPassengerInvitation inv : invitations) {
            if (!inv.isUsable(now)) continue; // đã hết hạn ⇒ không hiện
            Booking booking = inv.getBooking();
            BookingPassenger passenger = inv.getPassenger();
            String inviterName = booking != null && booking.getTourist() != null
                    ? booking.getTourist().getFullName() : null;
            String tourTitle = booking != null && booking.getTour() != null
                    ? booking.getTour().getTitle() : null;
            result.add(PendingInvitationResponse.fromEntity(
                    inv, booking, passenger, inviterName, tourTitle, now));
        }
        return result;
    }

    /**
     * Xác nhận lời mời TRONG APP (theo id lời mời, không cần deep link/token).
     *
     * <p>Kiểm tra giống {@link #accept(String, Long)}: email đang đăng nhập phải
     * trùng email được mời; lời mời phải còn hiệu lực và chưa dùng.
     */
    @Transactional
    public InvitationResponse acceptById(Long invitationId, Long userId) {
        BookingPassengerInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_INVITATION_NOT_FOUND));

        Instant now = Instant.now();
        if (invitation.getStatus() == InvitationStatus.ACCEPTED) {
            throw new AppException(ErrorCode.BOOKING_INVITATION_ALREADY_USED);
        }
        if (invitation.getStatus() == InvitationStatus.REVOKED) {
            throw new AppException(ErrorCode.BOOKING_INVITATION_EXPIRED,
                    "Lời mời đã bị vô hiệu hóa — vui lòng liên hệ người đặt tour");
        }
        if (!invitation.isUsable(now)) {
            invitation.markExpired();
            invitationRepository.save(invitation);
            throw new AppException(ErrorCode.BOOKING_INVITATION_EXPIRED,
                    "Lời mời đã hết hạn — vui lòng yêu cầu người đặt tour gửi lại");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        String userEmail = user.getEmail() == null ? "" : user.getEmail().toLowerCase(Locale.ROOT);
        if (!userEmail.equalsIgnoreCase(invitation.getInvitedEmail())) {
            throw new AppException(ErrorCode.BOOKING_INVITATION_EMAIL_MISMATCH,
                    "Bạn đang đăng nhập bằng email khác với email được mời ("
                            + invitation.getInvitedEmail() + ") — vui lòng dùng đúng tài khoản này");
        }

        Booking booking = invitation.getBooking();
        BookingPassenger passenger = invitation.getPassenger();

        // Một User không được liên kết với nhiều Passenger trong cùng Booking.
        boolean alreadyInBooking = passengerRepository
                .findByBooking_IdOrderByCreatedAtAsc(booking.getId()).stream()
                .anyMatch(p -> userId.equals(p.getLinkedUserId()) && !p.getId().equals(passenger.getId()));
        if (alreadyInBooking) {
            throw new AppException(ErrorCode.BOOKING_INVITATION_ALREADY_USED,
                    "Tài khoản này đã được liên kết với một hành khách khác trong đơn đặt này");
        }

        passenger.setLinkedUserId(userId);
        passenger.setEmail(userEmail);
        passengerRepository.save(passenger);

        invitation.accept(userId, now);
        invitationRepository.save(invitation);

        log.info("Hành khách {} đã xác nhận lời mời (in-app) booking={}", passenger.getId(), booking.getId());
        return InvitationResponse.fromEntity(invitation, passenger, now);
    }

    // ── Vô hiệu hóa ───────────────────────────────────────────────────────────
    /**
     * Danh sách lời mời của một Booking (mới nhất trước).
     *
     * <p>Dùng để dựng response chi tiết Booking ⇒ UI hiển thị trạng thái lời mời
     * cho từng hành khách (chưa gửi / đang chờ / đã xác nhận / hết hạn).
     */
    @Transactional(readOnly = true)
    public List<BookingPassengerInvitation> listInvitationsOfBooking(Long bookingId) {
        return invitationRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId);
    }

    /** Vô hiệu hóa các lời mời chưa sử dụng khi Booking bị hủy (quy tắc 8). */
    @Transactional
    public void revokeAllForBooking(Long bookingId) {
        List<BookingPassengerInvitation> pending = invitationRepository
                .findByBooking_IdAndStatus(bookingId, InvitationStatus.PENDING);
        for (BookingPassengerInvitation inv : pending) {
            inv.revoke();
        }
        if (!pending.isEmpty()) {
            invitationRepository.saveAll(pending);
            log.info("Đã vô hiệu hóa {} lời mời của booking {}", pending.size(), bookingId);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** SHA-256 hex của token thô. */
    public static String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Không hỗ trợ SHA-256", e);
        }
    }

    /** Gửi email mời tham gia tour. */
    private boolean sendInvitationEmail(Booking booking, BookingPassenger passenger, String email, String rawToken) {
        try {
            String tourTitle = booking.getTour() != null ? booking.getTour().getTitle() : "tour";
            String date = booking.getExperienceDate() == null ? "" : booking.getExperienceDate().toString();
            String link = appInvitationUrl
                    + "?token=" + java.net.URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
            String html = """
                    <!DOCTYPE html>
                    <html lang="vi">
                    <head><meta charset="UTF-8"></head>
                    <body style="font-family:'Segoe UI',Tahoma,sans-serif;background:#f8fafc;padding:24px;">
                      <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
                        <div style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:28px;text-align:center;color:#fff;">
                          <h1 style="margin:0;font-size:22px;">JourneyGo</h1>
                          <p style="margin:6px 0 0;font-size:14px;opacity:.9;">Lời mời tham gia tour</p>
                        </div>
                        <div style="padding:28px;color:#334155;line-height:1.6;">
                          <p>Xin chào <strong>{{passengerName}}</strong>,</p>
                          <p><strong>{{inviterName}}</strong> đã mời bạn tham gia tour
                             <strong>{{tourTitle}}</strong> vào ngày <strong>{{experienceDate}}</strong>.</p>
                          <p>Vui lòng mở ứng dụng JourneyGo, đăng nhập hoặc đăng ký bằng email
                             <strong>{{email}}</strong> rồi xác nhận lời mời để được
                             cấp quyền truy cập tour.</p>
                          <p style="text-align:center;margin:28px 0;">
                            <a href="{{link}}" style="background:#0d9488;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">
                              Mở app JourneyGo để xác nhận
                            </a>
                          </p>
                          <p style="font-size:12px;color:#647488;">Lời mời có hiệu lực trong 24 giờ.
                             Nếu bạn chưa cài ứng dụng, hãy tải JourneyGo trên CH Play / App Store
                             rồi mở lại email này. Nếu bạn không phải người được mời, hãy bỏ qua email này.</p>
                        </div>
                      </div>
                    </body>
                    </html>
                    """;

            String inviterName = booking.getTourist() != null ? booking.getTourist().getFullName() : "Người đặt tour";
            html = html.replace("{{passengerName}}", passenger.getFullName())
                    .replace("{{inviterName}}", inviterName)
                    .replace("{{tourTitle}}", tourTitle)
                    .replace("{{experienceDate}}", date)
                    .replace("{{email}}", email)
                    .replace("{{link}}", link);

            boolean sent = emailService.sendHtml(email, "Lời mời tham gia tour " + tourTitle, html);
            if (!sent) {
                log.error("Không gửi được email lời mời tới {} (SMTP không nhận)", email);
            }
            return sent;
        } catch (Exception ex) {
            log.error("Không gửi được email lời mời tới {}: {}", email, ex.getMessage(), ex);
            return false;
        }
    }
}
