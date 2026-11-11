package com.journeygo.modules.booking.service;

import com.journeygo.modules.booking.dto.response.PendingInvitationResponse;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.entity.BookingPassengerInvitation;
import com.journeygo.modules.booking.entity.enums.InvitationStatus;
import com.journeygo.modules.booking.repository.BookingPassengerInvitationRepository;
import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.repository.NotificationRepository;
import com.journeygo.modules.notification.service.NotificationPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Đưa lời mời tham gia tour vào TRUNG TÂM THÔNG BÁO của app.
 *
 * <p>─── Vì sao cần lớp này? ───
 * Khi người đặt gửi lời mời, người nhận có thể CHƯA có tài khoản ⇒ không có
 * {@code recipientId} ⇒ không tạo được thông báo cho họ. Chỉ khi họ đăng ký /
 * đăng nhập bằng đúng email được mời thì ta mới biết họ là ai ⇒ mới tạo được
 * thông báo:
 *
 * <pre>
 * "Bạn đã được {Tên người đặt} mời vào tour {Tên tour}. Vui lòng bấm xác nhận để tham gia vào tour."
 * </pre>
 *
 * <p>Thông báo dùng {@code refType = "TOUR_INVITATION"} và {@code refId = id lời mời}
 * ⇒ app bấm vào là xác nhận được ngay trong app (không cần deep link).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BookingInvitationNotificationService {

    /** Loại thông báo cho lời mời tour. */
    public static final String REF_TYPE = "TOUR_INVITATION";

    private final BookingPassengerInvitationRepository invitationRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationPublisher notifications;

    /**
     * Tạo thông báo cho các lời mời đang chờ của người dùng (nếu chưa có thông báo).
     *
     * <p>Idempotent: mỗi lời mời chỉ báo MỘT lần cho mỗi người nhận.
     *
     * <p>⚠️ Vì sao phải gọi ĐỒNG BỘ (không dùng {@code AFTER_COMMIT})?
     * Lời mời được đưa vào thông báo ngay khi người dùng vừa đăng nhập/đăng ký.
     * Nếu listener chạy ở {@code AFTER_COMMIT} thì {@code @Transactional} mặc định
     * ({@code REQUIRED}) sẽ "tham gia" vào giao dịch đã commit xong ⇒ bản ghi thông
     * báo không bao giờ được ghi xuống DB ⇒ trung tâm thông báo trống.
     *
     * <p>⇒ {@link BookingInvitationAuthListener} chạy đồng bộ trong giao dịch đăng nhập,
     * và thông báo được ghi bởi {@code NotificationEventListener} ở {@code AFTER_COMMIT}
     * của chính giao dịch đó (đúng pattern của toàn hệ thống).
     *
     * @param userId người dùng vừa đăng nhập / đăng ký
     * @param email  email của người dùng
     * @return số thông báo mới tạo
     */
    @Transactional
    public int notifyPendingInvitations(Long userId, String email) {
        if (userId == null || email == null || email.isBlank()) return 0;
        Instant now = Instant.now();
        List<BookingPassengerInvitation> pending = invitationRepository
                .findByInvitedEmailAndStatus(email.trim().toLowerCase(Locale.ROOT), InvitationStatus.PENDING);

        int created = 0;
        for (BookingPassengerInvitation inv : pending) {
            if (!inv.isUsable(now)) continue; // đã hết hạn ⇒ không báo
            if (notificationRepository.existsByRecipientIdAndTypeAndRefTypeAndRefId(
                    userId, NotificationType.TOUR_INVITATION_SENT, REF_TYPE, inv.getId())) {
                continue; // đã báo rồi
            }

            Booking booking = inv.getBooking();
            BookingPassenger passenger = inv.getPassenger();
            String inviterName = booking != null && booking.getTourist() != null
                    ? booking.getTourist().getFullName() : null;
            String tourTitle = booking != null && booking.getTour() != null
                    ? booking.getTour().getTitle() : null;

            PendingInvitationResponse view = PendingInvitationResponse.fromEntity(
                    inv, booking, passenger, inviterName, tourTitle, now);

            notifications.send(NotificationType.TOUR_INVITATION_SENT)
                    .to(userId)
                    .title("Bạn được mời tham gia tour")
                    .body(view.toNotificationBody())
                    .link(null)
                    .ref(REF_TYPE, inv.getId())
                    .publish();
            created++;
            log.info("Đã tạo thông báo lời mời tour cho user={} invitation={}", userId, inv.getId());
        }
        return created;
    }

    /**
     * Danh sách lời mời đang chờ mà người dùng có thể xác nhận trong app.
     */
    @Transactional(readOnly = true)
    public List<PendingInvitationResponse> listPending(Long userId, String email) {
        if (email == null || email.isBlank()) return List.of();
        Instant now = Instant.now();
        List<BookingPassengerInvitation> pending = invitationRepository
                .findByInvitedEmailAndStatus(email.trim().toLowerCase(Locale.ROOT), InvitationStatus.PENDING);

        List<PendingInvitationResponse> result = new ArrayList<>();
        for (BookingPassengerInvitation inv : pending) {
            if (!inv.isUsable(now)) continue;
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
}
