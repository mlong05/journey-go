package com.journeygo.modules.booking.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.dto.request.SendMessageRequest;
import com.journeygo.modules.booking.dto.response.BookingMessagePageResponse;
import com.journeygo.modules.booking.dto.response.BookingMessageResponse;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.repository.BookingPassengerRepository;
import com.journeygo.modules.providerchat.dto.request.SendProviderMessageRequest;
import com.journeygo.modules.providerchat.dto.response.ProviderConversationResponse;
import com.journeygo.modules.providerchat.dto.response.ProviderMessagePageResponse;
import com.journeygo.modules.providerchat.dto.response.ProviderMessageResponse;
import com.journeygo.modules.providerchat.service.ProviderChatService;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Khung chat hỗ trợ gắn với Booking.
 *
 * <p>─── QUY ƯỚC MỚI: "Hỗ trợ trong đơn này" ≡ "Tin nhắn với nhà tour" ───
 *  Hai khung này về bản chất là CÙNG MỘT kênh liên lạc giữa du khách và nhà tour
 *  của tour đó. Vì vậy service này KHÔNG tự lưu tin nhắn nữa mà chuyển tiếp
 *  sang {@link ProviderChatService}:
 * <ul>
 *   <li>Gửi tin trong khung "Hỗ trợ trong đơn này" ⇒ tin được ghi vào hội thoại
 *       (du khách, nhà tour) với {@code bookingId} tương ứng ⇒ tự động xuất hiện
 *       trong tab "Tin nhắn với nhà tour" và trên dashboard của nhà tour.</li>
 *   <li>Đọc tin trong khung "Hỗ trợ trong đơn này" ⇒ đọc chính hội thoại đó.</li>
 * </ul>
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

    /** Không còn ghi bảng `booking_messages` — mọi tin nhắn nằm ở hội thoại thống nhất. */
    private final BookingPassengerRepository passengerRepository;
    private final ProviderChatService providerChatService;
    private final UserRepository userRepository;

    // ── Gửi tin ───────────────────────────────────────────────────────────────

    /**
     * Gửi một tin nhắn vào khung chat của Booking.
     *
     * <p>Tin được ghi vào hội thoại thống nhất (du khách ↔ nhà tour) nên vừa xuất hiện
     * ở khung "Hỗ trợ trong đơn này", vừa xuất hiện ở tab "Tin nhắn với nhà tour".
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

        // Lấy (hoặc tạo) hội thoại thống nhất gắn với đơn này.
        ProviderConversationResponse conversation =
                providerChatService.startForBooking(booking.getId(), senderId);

        ProviderMessageResponse sent = providerChatService.send(
                conversation.id(), senderId, new SendProviderMessageRequest(body, null, booking.getId()));

        return toBookingResponse(sent, sent.senderName() != null ? sent.senderName() : senderNameOf(senderId));
    }

    // ── Đọc ───────────────────────────────────────────────────────────────────

    /**
     * Lấy toàn bộ tin nhắn của Booking (cũ nhất trước) — đọc từ hội thoại thống nhất.
     *
     * @param booking  Booking
     * @param readerId người đang đọc (để đánh dấu đã đọc đúng phía)
     */
    @Transactional
    public List<BookingMessageResponse> list(Booking booking, Long readerId) {
        Long viewerId = readerId != null ? readerId : resolveViewerId(booking);
        ProviderConversationResponse conversation =
                providerChatService.startForBooking(booking.getId(), viewerId);

        List<ProviderMessageResponse> messages =
                providerChatService.listMessages(conversation.id(), viewerId);

        return messages.stream()
                .map(m -> toBookingResponse(m, m.senderName() != null ? m.senderName() : senderNameOf(m.senderId())))
                .toList();
    }

    /**
     * Trang tin nhắn MỚI NHẤT của Booking — phân trang kiểu "cuộn lên để load thêm".
     *
     * <p>⚠️ Luôn trả về {@code limit} tin MỚI NHẤT (mặc định 10). Muốn xem lịch sử
     * cũ hơn thì gọi lại với {@code beforeId} = {@code nextCursor} của lần trước.
     *
     * <p>⚠️ Tin nhắn được trả về theo thứ tự thời gian TĂNG dần (tin cũ ở trên,
     * tin mới ở dưới) ⇒ frontend render thẳng, không cần đảo mảng.
     *
     * @param booking   Booking
     * @param readerId  người đang đọc (đánh dấu đã đọc đúng phía)
     * @param limit     số tin tối đa mỗi trang (mặc định 10)
     * @param beforeId  chỉ lấy tin có id nhỏ hơn mốc này (null = lấy mới nhất)
     */
    @Transactional
    public BookingMessagePageResponse listPage(Booking booking, Long readerId,
                                               int limit, Long beforeId) {
        Long viewerId = readerId != null ? readerId : resolveViewerId(booking);
        ProviderConversationResponse conversation =
                providerChatService.startForBooking(booking.getId(), viewerId);

        ProviderMessagePageResponse page =
                providerChatService.listMessagesPage(conversation.id(), viewerId, limit, beforeId);

        List<BookingMessageResponse> items = page.items().stream()
                .map(m -> toBookingResponse(m, m.senderName() != null ? m.senderName() : senderNameOf(m.senderId())))
                .toList();

        return new BookingMessagePageResponse(items, page.hasMore(), page.nextCursor(), page.totalCount());
    }

    /**
     * Đánh dấu đã đọc các tin nhắn gửi cho người đang đăng nhập.
     */
    @Transactional
    public int markRead(Booking booking, Long readerId) {        try {
            ProviderConversationResponse conversation =
                    providerChatService.startForBooking(booking.getId(), readerId);
            providerChatService.listMessages(conversation.id(), readerId);
            return 0;
        } catch (AppException e) {
            log.debug("markRead bỏ qua booking={} reader={}: {}", booking.getId(), readerId, e.getMessage());
            return 0;
        }
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

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Người đang đọc khung chat của đơn (ưu tiên người đặt, nhà tour, hành khách). */
    private Long resolveViewerId(Booking booking) {
        if (booking.getTourist() != null) return booking.getTourist().getId();
        Tour tour = booking.getTour();
        if (tour != null && tour.getCreatedBy() != null) return tour.getCreatedBy().getId();
        return passengerRepository.findByBooking_IdOrderByCreatedAtAsc(booking.getId()).stream()
                .map(BookingPassenger::getLinkedUserId)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private String senderNameOf(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).map(User::getFullName).orElse(null);
    }

    /** Chuyển tin nhắn của hội thoại thống nhất sang định dạng của khung trong đơn. */
    private BookingMessageResponse toBookingResponse(ProviderMessageResponse m, String senderName) {
        return BookingMessageResponse.builder()
                .id(m.id())
                .senderId(m.senderId())
                .senderName(senderName)
                .body(m.body())
                .createdAt(m.createdAt() != null ? m.createdAt() : Instant.now())
                .read(m.read())
                .build();
    }
}