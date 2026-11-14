package com.journeygo.modules.booking.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.dto.request.SendMessageRequest;
import com.journeygo.modules.booking.dto.response.BookingMessageResponse;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingMessage;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.repository.BookingMessageRepository;
import com.journeygo.modules.booking.repository.BookingPassengerRepository;
import com.journeygo.modules.tour.entity.Tour;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Khung chat hỗ trợ gắn với Booking.
 *
 * <p>Các bên tham gia:
 * <ul>
 *   <li><b>Người đặt tour</b> (Booking Customer) — có quyền nhắn tin.</li>
 *   <li><b>Hành khách được mời</b> — được xem tin nhắn của Booking mình tham gia
 *       (xem chi tiết booking) nhưng không được quyền quản lý booking.</li>
 *   <li><b>Đối tác sở hữu tour</b> ({@code Tour.createdBy}) — có quyền nhắn tin và trả lời.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BookingChatService {

    private final BookingMessageRepository messageRepository;
    private final BookingPassengerRepository passengerRepository;
    private final com.journeygo.modules.realtime.service.RealtimeHub realtimeHub;
    private final com.journeygo.modules.notification.service.NotificationPublisher notifications;
    private final com.journeygo.modules.user.repository.UserRepository userRepository;

    // ── Gửi tin ───────────────────────────────────────────────────────────────

    /**
     * Gửi một tin nhắn vào khung chat của Booking.
     *
     * @param booking   Booking
     * @param senderId  Người gửi
     * @param request   Nội dung
     */
    @Transactional
    public BookingMessageResponse send(Booking booking, Long senderId, SendMessageRequest request) {
        String body = request.body() == null ? "" : request.body().trim();
        if (body.isEmpty()) {
            throw new AppException(ErrorCode.BOOKING_MESSAGE_EMPTY);
        }

        BookingMessage message = BookingMessage.builder()
                .booking(booking)
                .senderId(senderId)
                .body(body)
                .build();
        messageRepository.save(message);

        BookingMessageResponse response = BookingMessageResponse.fromEntity(message);
        pushRealtime(booking, response, senderId);
        return response;
    }

    /**
     * Đẩy tin nhắn mới tới các bên còn lại trong khung chat (qua WebSocket) và tạo
     * thông báo "Đã nhận tin nhắn mới" cho họ.
     */
    private void pushRealtime(Booking booking, BookingMessageResponse response, Long senderId) {
        // Dùng Set để tránh gửi trùng: người đặt cũng có thể nằm trong danh sách hành khách
        // đã liên kết tài khoản ⇒ cùng một người có thể xuất hiện nhiều lần.
        java.util.Set<Long> recipients = new java.util.LinkedHashSet<>();
        if (booking.getTourist() != null) recipients.add(booking.getTourist().getId());
        Tour tour = booking.getTour();
        if (tour != null && tour.getCreatedBy() != null) recipients.add(tour.getCreatedBy().getId());
        for (BookingPassenger p : passengerRepository.findByBooking_IdOrderByCreatedAtAsc(booking.getId())) {
            if (p.getLinkedUserId() != null) recipients.add(p.getLinkedUserId());
        }
        recipients.remove(senderId);
        recipients.removeIf(java.util.Objects::isNull);

        String senderName = userRepository.findById(senderId)
                .map(com.journeygo.modules.user.entity.User::getFullName).orElse("Người dùng");
        String tourTitle = tour != null ? tour.getTitle() : "tour";
        String preview = truncate(response.body(), 120);

        for (Long recipientId : recipients) {
            realtimeHub.sendChatMessage(recipientId, Map.of(
                    "type", com.journeygo.modules.realtime.service.RealtimeHub.TYPE_CHAT_MESSAGE,
                    "scope", "BOOKING_CHAT",
                    "bookingId", booking.getId(),
                    "senderId", senderId,
                    "senderName", senderName,
                    "body", response.body(),
                    "createdAt", response.createdAt().toString(),
                    "message", response));

            notifications.send(com.journeygo.modules.notification.entity.enums.NotificationType.BOOKING_MESSAGE_RECEIVED)
                    .to(recipientId)
                    .title("Đã nhận tin nhắn mới")
                    .body(senderName + " vừa gửi tin nhắn về tour “" + tourTitle + "”: “" + preview + "”")
                    .ref("BOOKING", booking.getId())
                    .publish();
        }
    }

    private static String truncate(String text, int max) {
        if (text == null) return "";
        String trimmed = text.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max - 1) + "…";
    }

    // ── Đọc ───────────────────────────────────────────────────────────────────

    /**
     * Lấy toàn bộ tin nhắn của Booking (mới nhất trước).
     */
    @Transactional(readOnly = true)
    public List<BookingMessageResponse> list(Booking booking) {
        return messageRepository.findByBooking_IdOrderByCreatedAtDesc(booking.getId()).stream()
                .map(BookingMessageResponse::fromEntity)
                .toList();
    }

    /**
     * Đánh dấu đã đọc các tin nhắn gửi cho người đang đăng nhập.
     */
    @Transactional
    public int markRead(Booking booking, Long readerId) {
        List<BookingMessage> unread = messageRepository.findByBooking_IdAndReadAtIsNull(booking.getId());
        Instant now = Instant.now();
        int count = 0;
        for (BookingMessage m : unread) {
            if (!m.getSenderId().equals(readerId)) {
                m.setReadAt(now);
                messageRepository.save(m);
                count++;
            }
        }
        return count;
    }

    // ── Kiểm tra quyền ───────────────────────────────────────────────────────

    /**
     * Người đặt tour có quyền nhắn tin không.
     */
    public boolean isOwner(Booking booking, Long userId) {
        return booking.getTourist() != null && userId.equals(booking.getTourist().getId());
    }

    /**
     * Đối tác sở hữu tour có quyền nhắn tin không.
     */
    public boolean isTourProvider(Booking booking, Long userId) {
        Tour tour = booking.getTour();
        return tour != null && tour.getCreatedBy() != null && userId.equals(tour.getCreatedBy().getId());
    }

    /**
     * Hành khách được mời (đã liên kết tài khoản) có quyền xem/nhắn trong Booking này không.
     */
    public boolean isLinkedPassenger(Booking booking, Long userId) {
        List<BookingPassenger> passengers = passengerRepository
                .findByBooking_IdOrderByCreatedAtAsc(booking.getId());
        return passengers.stream().anyMatch(p -> userId.equals(p.getLinkedUserId()));
    }

    /**
     * Người dùng có được phép tham gia khung chat của Booking này không.
     */
    public boolean canAccess(Booking booking, Long userId) {
        return isOwner(booking, userId)
                || isTourProvider(booking, userId)
                || isLinkedPassenger(booking, userId);
    }
}
