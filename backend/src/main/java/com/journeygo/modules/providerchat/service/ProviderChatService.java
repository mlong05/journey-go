package com.journeygo.modules.providerchat.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.providerchat.dto.request.SendProviderMessageRequest;
import com.journeygo.modules.providerchat.dto.request.StartProviderConversationRequest;
import com.journeygo.modules.providerchat.dto.response.ProviderConversationResponse;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Chat trực tiếp giữa du khách và NHÀ TOUR — KHÔNG cần đã mua tour.
 *
 * <p>─── Vì sao cần module riêng? ───
 *  Chat hỗ trợ hiện có ({@code BookingMessage}) gắn với một Booking ⇒ chỉ dùng được
 *  SAU khi đặt tour. Yêu cầu mới: du khách xem chi tiết tour (chưa mua) vẫn nhắn
 *  được cho nhà tour ⇒ cần mô hình hội thoại độc lập Booking, khóa theo cặp
 *  (du khách, nhà tour) để gom lịch sử theo từng nhà tour.
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
    private final com.journeygo.modules.realtime.service.RealtimeHub realtimeHub;
    private final com.journeygo.modules.notification.service.NotificationPublisher notifications;

    // ── Mở cuộc trò chuyện ─────────────────────────────────────────────────────

    /**
     * Lấy (hoặc tạo) cuộc trò chuyện giữa du khách và nhà tour.
     *
     * @param touristId du khách đang đăng nhập
     * @param request   tourId (hoặc providerId) — xác định nhà tour cần liên hệ
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

        ProviderConversation conversation = conversationRepository
                .findByTouristIdAndProviderId(touristId, providerId)
                .orElseGet(() -> {
                    ProviderConversation created = ProviderConversation.builder()
                            .touristId(touristId)
                            .providerId(providerId)
                            .tourId(tourId)
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
            conversationRepository.save(conversation);
        }

        return toResponse(conversation, touristId);
    }

    // ── Danh sách hội thoại ────────────────────────────────────────────────────

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

        return messages.stream().map(ProviderMessageResponse::fromEntity).toList();
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

        ProviderMessage message = ProviderMessage.builder()
                .conversation(conversation)
                .senderId(senderId)
                .body(body)
                .build();
        messageRepository.save(message);

        conversation.setLastMessageAt(message.getCreatedAt());
        conversationRepository.save(conversation);

        ProviderMessageResponse response = ProviderMessageResponse.fromEntity(message);
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

        List<ProviderMessage> messages = messageRepository
                .findByConversation_IdOrderByCreatedAtAsc(c.getId());
        String lastMessage = messages.isEmpty()
                ? null
                : messages.get(messages.size() - 1).getBody();

        int unread = (int) messages.stream()
                .filter(m -> !viewerId.equals(m.getSenderId()) && !m.isRead())
                .count();

        return ProviderConversationResponse.fromEntity(
                c, touristName, providerName, tourTitle, lastMessage, unread);
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
