package com.journeygo.modules.providerchat.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.repository.BookingPassengerRepository;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.providerchat.dto.request.SendProviderMessageRequest;
import com.journeygo.modules.providerchat.dto.request.StartProviderConversationRequest;
import com.journeygo.modules.providerchat.dto.response.ProviderConversationResponse;
import com.journeygo.modules.providerchat.dto.response.ProviderMessagePageResponse;
import com.journeygo.modules.providerchat.dto.response.ProviderMessageResponse;
import com.journeygo.modules.providerchat.entity.ProviderConversation;
import com.journeygo.modules.providerchat.entity.ProviderMessage;
import com.journeygo.modules.providerchat.repository.ProviderConversationRepository;
import com.journeygo.modules.providerchat.repository.ProviderMessageRepository;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Chat giữa du khách và NHÀ TOUR — MỘT KÊNH LIÊN LẠC DUY NHẤT.
 *
 * <p>─── Vì sao gộp? ───
 *  Trước đây có hai hệ thống song song:
 * <ul>
 *   <li>{@code booking_messages} — khung "Hỗ trợ trong đơn này" (chỉ dùng được SAU khi đặt).</li>
 *   <li>{@code provider_messages} — mục "Tin nhắn với nhà tour" (dùng được cả TRƯỚC khi đặt).</li>
 * </ul>
 *  Về bản chất đây là CÙNG MỘT kênh liên lạc giữa du khách và nhà tour của một tour ⇒
 *  hội thoại được khóa theo cặp (du khách, nhà tour) và tin nhắn ghi thêm {@code booking_id}
 *  khi được gửi trong khung hỗ trợ của một đơn cụ thể.
 *
 * <p>─── Quyền ───
 *  • Du khách: mở / xem / gửi tin trong cuộc trò chuyện của mình.
 *  • Nhà tour: xem / gửi tin trong các cuộc trò chuyện gửi tới mình.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderChatService {

    private final ProviderConversationRepository conversationRepository;
    private final ProviderMessageRepository messageRepository;
    private final TourRepository tourRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final BookingPassengerRepository passengerRepository;
    private final com.journeygo.modules.realtime.service.RealtimeHub realtimeHub;
    private final com.journeygo.modules.notification.service.NotificationPublisher notifications;
    /** Ai đang mở kết nối thông báo thời gian thực (web nhà tour đang mở) ⇒ trạng thái "Đang trực tuyến". */
    private final com.journeygo.modules.notification.service.SseHub sseHub;

    /** Bộ nhớ đệm thời gian trả lời theo nhà tour (tính lại tối đa mỗi 10 phút — tránh quét tin nhắn liên tục). */
    private final java.util.Map<Long, CachedReplyTime> replyTimeCache = new java.util.concurrent.ConcurrentHashMap<>();
    private static final java.time.Duration REPLY_CACHE_TTL = java.time.Duration.ofMinutes(10);

    private record CachedReplyTime(Integer minutes, Instant at) {}

    /**
     * Số tin nhắn tối đa cho 1 trang khi phân trang kiểu "cuộn lên để load thêm".
     *
     * <p>Frontend mặc định 10 tin / trang ⇒ giá trị này chỉ là trần an toàn.
     */
    private static final int MAX_PAGE_SIZE = 100;

    // ── Mở cuộc trò chuyện ─────────────────────────────────────────────────────

    /**
     * Lấy (hoặc tạo) cuộc trò chuyện giữa du khách và nhà tour.
     *
     * @param touristId du khách đang đăng nhập
     * @param request   tourId (hoặc providerId) — xác định nhà tour cần liên hệ;
     *                 bookingId (tùy chọn) — gắn hội thoại với đơn đặt tour
     */
    @Transactional
    public ProviderConversationResponse start(Long touristId, StartProviderConversationRequest request) {
        if (request == null || (request.tourId() == null && request.providerId() == null)) {
            throw new AppException(ErrorCode.PROVIDER_CHAT_TARGET_REQUIRED,
                    "Cần tourId hoặc providerId để mở cuộc trò chuyện");
        }

        final Long providerId;
        final String tourTitle;
        final Long tourId = request.tourId();

        if (tourId != null) {
            Tour tour = tourRepository.findByTourId(tourId)
                    .orElseThrow(() -> new AppException(ErrorCode.TOUR_NOT_FOUND));
            if (tour.getCreatedBy() == null) {
                throw new AppException(ErrorCode.PROVIDER_CHAT_NO_PROVIDER,
                        "Tour này chưa có nhà tour liên hệ");
            }
            providerId = tour.getCreatedBy().getId();
            tourTitle = tour.getTitle();
        } else {
            providerId = request.providerId();
            tourTitle = null;
        }

        if (providerId == null) {
            throw new AppException(ErrorCode.PROVIDER_CHAT_TARGET_REQUIRED);
        }
        if (providerId.equals(touristId)) {
            throw new AppException(ErrorCode.PROVIDER_CHAT_TARGET_REQUIRED,
                    "Bạn không thể tự nhắn cho chính mình");
        }

        // Đơn đặt tour (nếu có) — phải thuộc về du khách và có nhà tour tương ứng.
        Booking booking = resolveBooking(request.bookingId(), touristId, providerId);

        ProviderConversation conversation = conversationRepository
                .findByTouristIdAndProviderId(touristId, providerId)
                .orElseGet(() -> {
                    ProviderConversation created = ProviderConversation.builder()
                            .touristId(touristId)
                            .providerId(providerId)
                            .tourId(tourId)
                            .bookingId(booking != null ? booking.getId() : null)
                            .subject(tourTitle != null ? tourTitle : "Hỗ trợ từ nhà tour")
                            .build();
                    return conversationRepository.save(created);
                });

        // Cập nhật tour liên quan nếu cuộc trò chuyện mở từ tour khác.
        if (tourId != null && !tourId.equals(conversation.getTourId())) {
            conversation.setTourId(tourId);
            if (tourTitle != null) {
                conversation.setSubject(tourTitle);
            }
        }
        // Gắn đơn đặt tour nếu có (khung "Hỗ trợ trong đơn này").
        if (booking != null && !booking.getId().equals(conversation.getBookingId())) {
            conversation.setBookingId(booking.getId());
        }
        conversationRepository.save(conversation);

        return toResponse(conversation, touristId);
    }

    /**
     * Tra cứu đơn đặt tour theo id và kiểm tra tính hợp lệ:
     * đơn phải thuộc về du khách (người đặt hoặc hành khách được mời)
     * và tour của đơn phải do {@code providerId} làm nhà tour.
     */
    private Booking resolveBooking(Long bookingId, Long touristId, Long providerId) {
        if (bookingId == null) {
            return null;
        }
        Booking booking = bookingRepository.findByIdWithRelations(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        Tour tour = booking.getTour();
        Long ownerId = tour != null && tour.getCreatedBy() != null ? tour.getCreatedBy().getId() : null;
        if (!providerId.equals(ownerId)) {
            throw new AppException(ErrorCode.PROVIDER_CHAT_TARGET_REQUIRED,
                    "Đơn này không thuộc nhà tour đang liên hệ");
        }
        // Người đặt / hành khách được mời, hoặc chính nhà tour của tour.
        if (!canAccessBooking(booking, touristId) && !providerId.equals(touristId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED,
                    "Bạn không có quyền truy cập cuộc trò chuyện của đơn này");
        }
        return booking;
    }

    /** Người dùng có thuộc đơn (người đặt / hành khách được mời) không. */
    private boolean canAccessBooking(Booking booking, Long userId) {
        if (userId == null) return false;
        if (booking.getTourist() != null && userId.equals(booking.getTourist().getId())) {
            return true;
        }
        for (BookingPassenger p : passengerRepository
                .findByBooking_IdOrderByCreatedAtAsc(booking.getId())) {
            if (userId.equals(p.getLinkedUserId())) {
                return true;
            }
        }
        return false;
    }

    // ── Danh sách hội thoại ────────────────────────────────────────────────────

    /**
     * Lấy (hoặc tạo) hội thoại gắn với MỘT đơn đặt tour.
     *
     * <p>Dùng cho khung "Hỗ trợ trong đơn này" — trả về đúng hội thoại mà tab
     * "Tin nhắn với nhà tour" đang hiển thị ⇒ hai nơi là MỘT kênh liên lạc.
     *
     * @param bookingId đơn đặt tour
     * @param userId   người đang đăng nhập (người đặt / hành khách được mời / nhà tour)
     */
    @Transactional
    public ProviderConversationResponse startForBooking(Long bookingId, Long userId) {
        Booking booking = bookingRepository.findByIdWithRelations(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        Tour tour = booking.getTour();
        if (tour == null || tour.getCreatedBy() == null) {
            throw new AppException(ErrorCode.PROVIDER_CHAT_NO_PROVIDER,
                    "Tour này chưa có nhà tour liên hệ");
        }
        Long providerId = tour.getCreatedBy().getId();

        // Người gọi phải là du khách (người đặt / hành khách được mời) hoặc chính nhà tour.
        boolean isTouristSide = canAccessBooking(booking, userId);
        boolean isProviderSide = userId != null && userId.equals(providerId);
        if (!isTouristSide && !isProviderSide) {
            throw new AppException(ErrorCode.UNAUTHORIZED,
                    "Bạn không có quyền truy cập cuộc trò chuyện của đơn này");
        }

        // Nhà tour mở khung chat từ phía đối tác ⇒ hội thoại vẫn do DU KHÁCH là chủ.
        Long touristId = isProviderSide
                ? (booking.getTourist() != null ? booking.getTourist().getId() : null)
                : userId;
        if (touristId == null) {
            throw new AppException(ErrorCode.BOOKING_NOT_FOUND);
        }

        ProviderConversation conversation = conversationRepository
                .findByTouristIdAndProviderId(touristId, providerId)
                .orElseGet(() -> {
                    ProviderConversation created = ProviderConversation.builder()
                            .touristId(touristId)
                            .providerId(providerId)
                            .tourId(tour.getTourId())
                            .bookingId(booking.getId())
                            .subject(tour.getTitle())
                            .build();
                    return conversationRepository.save(created);
                });

        if (!booking.getId().equals(conversation.getBookingId())) {
            conversation.setBookingId(booking.getId());
        }
        if (conversation.getTourId() == null) {
            conversation.setTourId(tour.getTourId());
        }
        if (conversation.getSubject() == null) {
            conversation.setSubject(tour.getTitle());
        }
        conversationRepository.save(conversation);

        return toResponse(conversation, userId);
    }

    /** Danh sách cuộc trò chuyện của du khách ("Hỗ trợ từ nhà tour"). */
    @Transactional(readOnly = true)
    public List<ProviderConversationResponse> listForTourist(Long touristId) {
        return conversationRepository.findByTouristIdOrderByLastMessageAtDescCreatedAtDesc(touristId).stream()
                .map(c -> toResponse(c, touristId))
                .toList();
    }

    /** Danh sách cuộc trò chuyện mà nhà tour nhận được. */
    @Transactional(readOnly = true)
    public List<ProviderConversationResponse> listForProvider(Long providerId) {
        return conversationRepository.findByProviderIdOrderByLastMessageAtDescCreatedAtDesc(providerId).stream()
                .map(c -> toResponse(c, providerId))
                .toList();
    }

    // ── Tin nhắn ──────────────────────────────────────────────────────────────

    /** Danh sách tin nhắn của một cuộc trò chuyện (cũ nhất trước). */
    @Transactional
    public List<ProviderMessageResponse> listMessages(Long conversationId, Long readerId) {
        ProviderConversation conversation = requireConversation(conversationId);
        requireAccess(conversation, readerId);

        List<ProviderMessage> messages = messageRepository
                .findByConversation_IdOrderByCreatedAtAsc(conversationId);

        // Đánh dấu đã đọc cho những tin gửi từ phía đối tác.
        Instant now = Instant.now();
        List<ProviderMessage> unread = messages.stream()
                .filter(m -> !readerId.equals(m.getSenderId()) && !m.isRead())
                .toList();
        for (ProviderMessage m : unread) {
            m.setReadAt(now);
        }
        if (!unread.isEmpty()) {
            messageRepository.saveAll(unread);
        }

        return toResponses(messages);
    }

    /**
     * Trang tin nhắn MỚI NHẤT của cuộc trò chuyện — phân trang kiểu "cuộn lên để
     * load thêm".
     *
     * <p>⚠️ Luôn trả về {@code limit} tin MỚI NHẤT (mặc định 10). Muốn xem lịch sử
     * cũ hơn thì gọi lại với {@code beforeId} = {@code nextCursor} của lần trước.
     *
     * <p>⚠️ Tin nhắn được trả về theo thứ tự thời gian TĂNG dần (tin cũ ở trên,
     * tin mới ở dưới) ⇒ frontend render thẳng, không cần đảo mảng.
     *
     * <p>⚠️ Đánh dấu đã đọc CHỈ cho các tin nằm TRONG trang vừa trả về (đúng phía
     * đang xem) — không đụng tới tin cũ chưa tải.
     *
     * @param conversationId ID cuộc trò chuyện
     * @param readerId       người đang đọc (đánh dấu đã đọc đúng phía)
     * @param limit          số tin tối đa mỗi trang (mặc định 10)
     * @param beforeId       chỉ lấy tin có id NHỎ HƠN mốc này (null = lấy mới nhất)
     */
    @Transactional
    public ProviderMessagePageResponse listMessagesPage(Long conversationId, Long readerId,
                                                        int limit, Long beforeId) {
        ProviderConversation conversation = requireConversation(conversationId);
        requireAccess(conversation, readerId);

        int safeLimit = Math.max(1, Math.min(limit, MAX_PAGE_SIZE));
        // Lấy (limit + 1) tin để biết còn trang kế tiếp hay không.
        Pageable pageable = PageRequest.of(0, safeLimit + 1, Sort.by(Sort.Direction.DESC, "id"));

        List<ProviderMessage> fetched = beforeId == null
                ? messageRepository.findByConversation_IdOrderByIdDesc(conversationId, pageable)
                : messageRepository.findByConversation_IdAndIdLessThanOrderByIdDesc(
                        conversationId, beforeId, pageable);

        boolean hasMore = fetched.size() > safeLimit;
        List<ProviderMessage> page = hasMore
                ? fetched.subList(0, safeLimit)
                : fetched;

        // Đánh dấu đã đọc cho những tin gửi TỪ phía đối tác (đối với đối tác đang
        // đọc thì "phía đối tác" = tin của khách) nằm trong trang này.
        Instant now = Instant.now();
        List<ProviderMessage> unread = page.stream()
                .filter(m -> !readerId.equals(m.getSenderId()) && !m.isRead())
                .toList();
        for (ProviderMessage m : unread) {
            m.setReadAt(now);
        }
        if (!unread.isEmpty()) {
            messageRepository.saveAll(unread);
        }

        // Đảo lại để trả về theo thứ tự thời gian TĂNG dần (cũ → mới).
        List<ProviderMessage> ordered = new ArrayList<>(page);
        java.util.Collections.reverse(ordered);

        // nextCursor = id của tin CŨ NHẤT trong trang ⇒ lần sau lấy tin có id nhỏ hơn.
        Long nextCursor = hasMore && !ordered.isEmpty()
                ? ordered.get(0).getId()
                : null;

        return new ProviderMessagePageResponse(
                toResponses(ordered),
                hasMore,
                nextCursor,
                messageRepository.countByConversation_Id(conversationId));
    }

    /**
     * Ghép họ tên người gửi + tên/ảnh bìa tour cho từng tin nhắn
     * (lấy tour và user theo lô, không truy vấn lặp từng tin).
     */
    private List<ProviderMessageResponse> toResponses(List<ProviderMessage> messages) {
        java.util.Set<Long> tourIds = messages.stream().map(ProviderMessage::getTourId)
                .filter(java.util.Objects::nonNull).collect(java.util.stream.Collectors.toSet());
        java.util.Map<Long, Tour> tours = tourIds.isEmpty() ? java.util.Map.of()
                : tourRepository.findAllById(tourIds).stream()
                        .collect(java.util.stream.Collectors.toMap(Tour::getTourId, t -> t));
        java.util.Set<Long> senderIds = messages.stream().map(ProviderMessage::getSenderId)
                .filter(java.util.Objects::nonNull).collect(java.util.stream.Collectors.toSet());
        java.util.Map<Long, String> senderNames = senderIds.isEmpty() ? java.util.Map.of()
                : userRepository.findAllById(senderIds).stream()
                        .collect(java.util.stream.Collectors.toMap(User::getId, User::getFullName));
        return messages.stream().map(m -> {
            Tour t = m.getTourId() == null ? null : tours.get(m.getTourId());
            return ProviderMessageResponse.fromEntity(m,
                    senderNames.get(m.getSenderId()),
                    t == null ? null : t.getTitle(),
                    t == null ? null : t.getCoverImageUrl());
        }).toList();
    }

    /**
     * Tour gắn với tin nhắn mới: tour client gửi lên (phải thuộc nhà tour của cuộc trò chuyện),
     * nếu không có thì dùng tour hiện tại của cuộc trò chuyện. Tour hợp lệ được ghi làm tour hiện tại.
     */
    private Tour resolveMessageTour(ProviderConversation conversation, Long requestedTourId) {
        Long tourId = requestedTourId != null ? requestedTourId : conversation.getTourId();
        if (tourId == null) return null;
        Tour tour = tourRepository.findByTourId(tourId).orElse(null);
        if (tour == null || tour.getCreatedBy() == null || !conversation.getProviderId().equals(tour.getCreatedBy().getId())) {
            // Tour không thuộc nhà tour này (hoặc đã bị xoá) ⇒ bỏ qua, không gắn tour sai.
            return null;
        }
        if (!tourId.equals(conversation.getTourId())) {
            conversation.setTourId(tourId);
            conversation.setSubject(tour.getTitle());
        }
        return tour;
    }

    /** Tra cứu họ tên người gửi (null nếu không còn tài khoản). */
    private String senderNameOf(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).map(User::getFullName).orElse(null);
    }

    /** Gửi tin nhắn mới trong cuộc trò chuyện. */
    @Transactional
    public ProviderMessageResponse send(Long conversationId, Long senderId, SendProviderMessageRequest request) {
        ProviderConversation conversation = requireConversation(conversationId);
        requireAccess(conversation, senderId);

        String body = request == null || request.body() == null ? "" : request.body().trim();
        if (body.isEmpty()) {
            throw new AppException(ErrorCode.BOOKING_MESSAGE_EMPTY);
        }

        // ── Gắn tin nhắn vào tour và (nếu có) vào đơn đặt tour ──
        // Tin nhắn gửi trong khung "Hỗ trợ trong đơn này" ⇒ gắn bookingId.
        // Tin nhắn gửi từ tab "Tin nhắn với nhà tour" ⇒ giữ bookingId của hội thoại (nếu có).
        Long bookingId = request.bookingId() != null ? request.bookingId() : conversation.getBookingId();
        if (bookingId != null) {
            Booking booking = bookingRepository.findByIdWithRelations(bookingId)
                    .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
            Tour tour = booking.getTour();
            Long ownerId = tour != null && tour.getCreatedBy() != null ? tour.getCreatedBy().getId() : null;
            if (!conversation.getProviderId().equals(ownerId)) {
                throw new AppException(ErrorCode.PROVIDER_CHAT_TARGET_REQUIRED,
                        "Đơn này không thuộc nhà tour của cuộc trò chuyện");
            }
            if (!canAccessBooking(booking, senderId)
                    && !conversation.getProviderId().equals(senderId)) {
                throw new AppException(ErrorCode.UNAUTHORIZED,
                        "Bạn không có quyền nhắn tin trong đơn này");
            }
            // Ghi nhớ đơn trên hội thoại để hiển thị "Đơn #MÃ" ở danh sách tin nhắn.
            if (!bookingId.equals(conversation.getBookingId())) {
                conversation.setBookingId(bookingId);
                conversationRepository.save(conversation);
            }
        }

        Tour tour = resolveMessageTour(conversation, request.tourId());
        ProviderMessage message = ProviderMessage.builder()
                .conversation(conversation)
                .senderId(senderId)
                .body(body)
                .tourId(tour == null ? null : tour.getTourId())
                .bookingId(bookingId)
                .build();
        messageRepository.save(message);

        conversation.setLastMessageAt(message.getCreatedAt());
        conversationRepository.save(conversation);

        ProviderMessageResponse response = ProviderMessageResponse.fromEntity(message,
                senderNameOf(senderId),
                tour == null ? null : tour.getTitle(),
                tour == null ? null : tour.getCoverImageUrl());
        pushRealtime(conversation, response, senderId);
        return response;
    }

    /**
     * Đẩy tin nhắn mới tới bên kia qua WebSocket và tạo thông báo "Đã nhận tin nhắn mới".
     *
     * <p>Người nhận = đối tác nếu du khách gửi, ngược lại là du khách.
     */
    private void pushRealtime(ProviderConversation conversation, ProviderMessageResponse response, Long senderId) {
        boolean sentByTourist = senderId.equals(conversation.getTouristId());
        Long recipientId = sentByTourist ? conversation.getProviderId() : conversation.getTouristId();
        if (recipientId == null || recipientId.equals(senderId)) return;

        String senderName = userRepository.findById(senderId)
                .map(User::getFullName).orElse("Người dùng");
        String subject = conversation.getSubject() != null ? conversation.getSubject() : "Hỗ trợ từ nhà tour";

        realtimeHub.sendChatMessage(recipientId, Map.of(
                "type", com.journeygo.modules.realtime.service.RealtimeHub.TYPE_CHAT_MESSAGE,
                "scope", "PROVIDER_CHAT",
                "conversationId", conversation.getId(),
                "bookingId", conversation.getBookingId() == null ? 0L : conversation.getBookingId(),
                "senderId", senderId,
                "senderName", senderName,
                "body", response.body(),
                "createdAt", response.createdAt().toString(),
                "message", response));

        // Link chỉ có ý nghĩa khi bên nhận là đối tác (web dashboard).
        String link = sentByTourist ? "/provider/support" : null;

        notifications.send(com.journeygo.modules.notification.entity.enums.NotificationType.PROVIDER_MESSAGE_RECEIVED)
                .to(recipientId)
                .title("Đã nhận tin nhắn mới")
                .body(senderName + " vừa gửi tin nhắn: “" + truncate(response.body(), 120) + "”")
                .link(link)
                .ref("PROVIDER_CHAT", conversation.getId())
                .publish();
    }

    private static String truncate(String text, int max) {
        if (text == null) return "";
        String trimmed = text.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max - 1) + "…";
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ProviderConversation requireConversation(Long conversationId) {
        return conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException(ErrorCode.PROVIDER_CHAT_CONVERSATION_NOT_FOUND));
    }

    /** Người dùng có thuộc cuộc trò chuyện không (du khách hoặc nhà tour). */
    private void requireAccess(ProviderConversation conversation, Long userId) {
        if (userId == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        if (!userId.equals(conversation.getTouristId()) && !userId.equals(conversation.getProviderId())) {
            throw new AppException(ErrorCode.UNAUTHORIZED,
                    "Bạn không có quyền truy cập cuộc trò chuyện này");
        }
    }

    /** Dựng response kèm tên hiển thị, tin nhắn cuối và số tin chưa đọc. */
    private ProviderConversationResponse toResponse(ProviderConversation c, Long viewerId) {
        String touristName = userRepository.findById(c.getTouristId())
                .map(User::getFullName).orElse(null);
        String providerName = userRepository.findById(c.getProviderId())
                .map(User::getFullName).orElse(null);

        String tourTitle = null;
        if (c.getTourId() != null) {
            tourTitle = tourRepository.findByTourId(c.getTourId()).map(Tour::getTitle).orElse(null);
        }

        String bookingCode = null;
        if (c.getBookingId() != null) {
            bookingCode = bookingRepository.findById(c.getBookingId())
                    .map(Booking::getBookingCode).orElse(null);
        }

        List<ProviderMessage> messages = messageRepository
                .findByConversation_IdOrderByCreatedAtAsc(c.getId());
        String lastMessage = messages.isEmpty()
                ? null
                : messages.get(messages.size() - 1).getBody();

        int unread = (int) messages.stream()
                .filter(m -> !viewerId.equals(m.getSenderId()) && !m.isRead())
                .count();

        return ProviderConversationResponse.fromEntity(
                c, touristName, providerName, tourTitle, bookingCode, lastMessage, unread,
                sseHub.isOnline(c.getProviderId()), replyMinutesOf(c.getProviderId()));
    }

    /**
     * Nhà tour "thường trả lời trong bao lâu": TRUNG VỊ khoảng cách từ tin du khách (đầu tiên chưa được đáp)
     * tới tin trả lời kế tiếp của nhà tour, lấy tối đa 30 lần trả lời gần nhất trong 60 ngày.
     * Cần ít nhất 3 lần trả lời mới đưa ra con số (ít hơn ⇒ null, app không hiện — tránh số liệu thiếu tin cậy).
     */
    private Integer replyMinutesOf(Long providerId) {
        if (providerId == null) return null;
        CachedReplyTime cached = replyTimeCache.get(providerId);
        if (cached != null && cached.at().plus(REPLY_CACHE_TTL).isAfter(Instant.now())) return cached.minutes();

        Instant since = Instant.now().minus(java.time.Duration.ofDays(60));
        List<Long> gaps = new java.util.ArrayList<>();
        for (ProviderConversation conv : conversationRepository.findByProviderIdOrderByLastMessageAtDescCreatedAtDesc(providerId)) {
            if (conv.getLastMessageAt() != null && conv.getLastMessageAt().isBefore(since)) break;
            Instant waitingSince = null;
            for (ProviderMessage m : messageRepository.findByConversation_IdOrderByCreatedAtAsc(conv.getId())) {
                if (m.getCreatedAt() == null || m.getCreatedAt().isBefore(since)) continue;
                boolean fromProvider = providerId.equals(m.getSenderId());
                if (!fromProvider) {
                    if (waitingSince == null) waitingSince = m.getCreatedAt();
                } else if (waitingSince != null) {
                    gaps.add(java.time.Duration.between(waitingSince, m.getCreatedAt()).toMinutes());
                    waitingSince = null;
                }
            }
            if (gaps.size() >= 30) break;
        }
        Integer minutes = null;
        if (gaps.size() >= 3) {
            java.util.Collections.sort(gaps);
            minutes = (int) Math.max(1, gaps.get(gaps.size() / 2));
        }
        replyTimeCache.put(providerId, new CachedReplyTime(minutes, Instant.now()));
        return minutes;
    }

    /** Danh sách cuộc trò chuyện của du khách, sắp xếp theo tin nhắn mới nhất. */
    @Transactional(readOnly = true)
    public List<ProviderConversationResponse> listForTouristSorted(Long touristId) {
        List<ProviderConversationResponse> list = new ArrayList<>(listForTourist(touristId));
        list.sort(Comparator.comparing(
                (ProviderConversationResponse r) -> r.lastMessageAt() == null ? r.createdAt() : r.lastMessageAt(),
                Comparator.reverseOrder()));
        return list;
    }
}