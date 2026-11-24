package com.journeygo.modules.aiguide.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import com.journeygo.modules.aiguide.dto.AiChatMessageDto;
import com.journeygo.modules.aiguide.dto.AiChatRequest;
import com.journeygo.modules.aiguide.dto.AiChatResponse;
import com.journeygo.modules.aiguide.dto.AiChatSessionDto;
import com.journeygo.modules.aiguide.entity.AiChatHandoffStatus;
import com.journeygo.modules.aiguide.entity.AiChatMessage;
import com.journeygo.modules.aiguide.entity.AiChatSession;
import com.journeygo.modules.aiguide.entity.AiKnowledgeChunk;
import com.journeygo.modules.aiguide.entity.AiKnowledgeDocument;
import com.journeygo.modules.aiguide.repository.AiChatMessageRepository;
import com.journeygo.modules.aiguide.repository.AiChatSessionRepository;
import com.journeygo.modules.aiguide.repository.AiKnowledgeDocumentRepository;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service trung tâm điều phối luồng hỏi đáp RAG (Retrieval-Augmented Generation)
 * và quản lý bộ nhớ phiên trò chuyện (Chat Memory) cho du khách.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VirtualGuideChatService {

    private static final Pattern BOLD_MARKDOWN_PATTERN = Pattern.compile("\\*\\*(.+?)\\*\\*", Pattern.DOTALL);
    private static final Pattern UNDERLINE_BOLD_PATTERN = Pattern.compile("__(.+?)__", Pattern.DOTALL);
    private static final Pattern HEADING_MARKDOWN_PATTERN = Pattern.compile("(?m)^#{1,6}\\s+");
    private static final Pattern STAR_BULLET_PATTERN = Pattern.compile("(?m)^(\\s*)\\*\\s+");

    private final AiChatSessionRepository sessionRepository;
    private final AiChatMessageRepository messageRepository;
    private final GeminiChatClient chatClient;
    private final VirtualGuidePromptTemplate promptTemplate;
    private final GeminiAiProperties properties;
    private final AiRetrievalService aiRetrievalService;
    private final AiRateLimiterService aiRateLimiterService;
    private final AiKnowledgeDocumentRepository documentRepository;
    private final UserRepository userRepository;

    /**
     * Khởi tạo hoặc lấy lại một phiên hội thoại cho du khách (tương thích chữ ký cũ).
     */
    @Transactional
    public AiChatSessionDto getOrCreateSession(Long userId, Long destinationId) {
        return getOrCreateSession(userId, destinationId, false);
    }

    /**
     * Khởi tạo mới ({@code forceNew = true}) hoặc lấy lại phiên gần nhất cho du khách.
     */
    @Transactional
    public AiChatSessionDto getOrCreateSession(Long userId, Long destinationId, boolean forceNew) {
        if (!forceNew) {
            var existingSession = destinationId != null
                    ? sessionRepository.findFirstByUserIdAndCurrentDestinationIdOrderByUpdatedAtDesc(userId, destinationId)
                    : sessionRepository.findFirstByUserIdAndCurrentDestinationIdIsNullOrderByUpdatedAtDesc(userId);
            if (existingSession.isPresent()) {
                return toSessionDto(existingSession.get());
            }
        }

        AiChatSession newSession = AiChatSession.builder()
                .userId(userId)
                .currentDestinationId(destinationId)
                .build();
        AiChatSession saved = sessionRepository.save(newSession);
        return toSessionDto(saved);
    }

    /**
     * Lấy danh sách các phiên trò chuyện của một du khách.
     */
    @Transactional(readOnly = true)
    public Page<AiChatSessionDto> getUserSessions(Long userId, Pageable pageable) {
        return sessionRepository.findByUserIdOrderByUpdatedAtDesc(userId, pageable)
                .map(this::toSessionDto);
    }

    /**
     * Lấy lịch sử tin nhắn trong phiên của du khách.
     */
    @Transactional(readOnly = true)
    public List<AiChatMessageDto> getSessionMessages(UUID sessionId, Long userId) {
        AiChatSession session = findSessionOwnedByUser(sessionId, userId);
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId())
                .stream()
                .map(this::toMessageDto)
                .toList();
    }

    /**
     * Xóa một phiên trò chuyện thuộc quyền sở hữu của du khách.
     */
    @Transactional
    public void deleteSession(UUID sessionId, Long userId) {
        AiChatSession session = findSessionOwnedByUser(sessionId, userId);
        messageRepository.deleteBySessionId(session.getId());
        sessionRepository.delete(session);
        log.info("Du khách userId={} đã xóa phiên trò chuyện AI sessionId={}", userId, sessionId);
    }

    /**
     * Lấy chi tiết một phiên trò chuyện thuộc quyền sở hữu của du khách.
     */
    @Transactional(readOnly = true)
    public AiChatSessionDto getSession(UUID sessionId, Long userId) {
        return toSessionDto(findSessionOwnedByUser(sessionId, userId));
    }

    /**
     * Du khách yêu cầu chuyển phiên chat sang trò chuyện trực tiếp với Admin / Content Moderator.
     */
    @Transactional
    public AiChatSessionDto requestHumanSupport(UUID sessionId, Long userId, String reason) {
        AiChatSession session = findSessionOwnedByUser(sessionId, userId);
        AiChatHandoffStatus current = effectiveHandoffStatus(session);
        String cleanReason = StringUtils.hasText(reason) ? reason.trim() : null;

        if (current == AiChatHandoffStatus.AI_ACTIVE) {
            session.setHandoffStatus(AiChatHandoffStatus.WAITING_HUMAN);
            session.setHandoffRequestedAt(Instant.now());
            session.setHandoffReason(cleanReason);
            session.setAssignedStaffId(null);
            session.setAssignedStaffName(null);
            session.setAssignedStaffRole(null);
            session.setUpdatedAt(Instant.now());
            session = sessionRepository.save(session);

            saveSystemMessage(
                    session.getId(),
                    "Bạn đã gửi yêu cầu trò chuyện trực tiếp với Admin / Moderator. Phiên hội thoại đã được đưa vào hàng đợi chờ xử lý."
            );
            log.info("Du khách userId={} yêu cầu gặp Admin/Moderator tại sessionId={}", userId, sessionId);
        } else if (cleanReason != null && !StringUtils.hasText(session.getHandoffReason())) {
            session.setHandoffReason(cleanReason);
            session.setUpdatedAt(Instant.now());
            session = sessionRepository.save(session);
        }

        return toSessionDto(session);
    }

    /**
     * Du khách kết thúc chế độ chờ / chat với nhân viên và quay lại trò chuyện với AI.
     */
    @Transactional
    public AiChatSessionDto returnToAi(UUID sessionId, Long userId) {
        AiChatSession session = findSessionOwnedByUser(sessionId, userId);
        if (effectiveHandoffStatus(session) != AiChatHandoffStatus.AI_ACTIVE) {
            clearHandoffAssignment(session);
            session = sessionRepository.save(session);
            saveSystemMessage(session.getId(), "Bạn đã quay lại trò chuyện với AI Hướng dẫn viên.");
            log.info("Du khách userId={} chuyển phiên sessionId={} về AI Hướng dẫn viên", userId, sessionId);
        }
        return toSessionDto(session);
    }

    /**
     * Admin / Moderator lấy danh sách các phiên chat cần hỗ trợ hoặc toàn bộ phiên theo trạng thái.
     */
    @Transactional(readOnly = true)
    public Page<AiChatSessionDto> getAdminHandoffSessions(String statusFilter, Pageable pageable) {
        Page<AiChatSession> pageData;
        String normalized = StringUtils.hasText(statusFilter) ? statusFilter.trim().toUpperCase() : "WAITING_HUMAN";
        switch (normalized) {
            case "ALL" -> pageData = sessionRepository.findAllByOrderByUpdatedAtDesc(pageable);
            case "PENDING" -> pageData = sessionRepository.findByHandoffStatusInOrderByUpdatedAtDesc(
                    List.of(AiChatHandoffStatus.WAITING_HUMAN, AiChatHandoffStatus.HUMAN_ACTIVE), pageable);
            case "HUMAN_ACTIVE" -> pageData = sessionRepository.findByHandoffStatusOrderByUpdatedAtDesc(
                    AiChatHandoffStatus.HUMAN_ACTIVE, pageable);
            case "AI_ACTIVE" -> pageData = sessionRepository.findByHandoffStatusOrderByUpdatedAtDesc(
                    AiChatHandoffStatus.AI_ACTIVE, pageable);
            default -> pageData = sessionRepository.findByHandoffStatusOrderByUpdatedAtDesc(
                    AiChatHandoffStatus.WAITING_HUMAN, pageable);
        }

        Set<Long> userIds = pageData.getContent().stream()
                .map(AiChatSession::getUserId)
                .collect(Collectors.toSet());
        Map<Long, User> userMap = loadUserMap(userIds);

        return pageData.map(session -> toSessionDto(session, userMap.get(session.getUserId())));
    }

    /**
     * Admin / Moderator xem toàn bộ lịch sử tin nhắn của một phiên bất kỳ.
     */
    @Transactional(readOnly = true)
    public List<AiChatMessageDto> getAdminSessionMessages(UUID sessionId) {
        AiChatSession session = findSessionById(sessionId);
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId())
                .stream()
                .map(this::toMessageDto)
                .toList();
    }

    /**
     * Admin / Moderator nhận xử lý một phiên đang chờ hỗ trợ.
     */
    @Transactional
    public AiChatSessionDto claimHandoffSession(UUID sessionId, Long staffId, String staffName, String staffRole) {
        AiChatSession session = findSessionById(sessionId);
        session = applyClaim(session, staffId, staffName, staffRole);
        return toSessionDto(session, findUserQuietly(session.getUserId()));
    }

    /**
     * Admin / Moderator gửi tin nhắn trực tiếp tới du khách (tự động claim nếu phiên chưa HUMAN_ACTIVE).
     */
    @Transactional
    public AiChatMessageDto sendStaffReply(UUID sessionId,
                                           Long staffId,
                                           String staffName,
                                           String staffRole,
                                           String content) {
        String trimmed = content != null ? content.trim() : "";
        if (!StringUtils.hasText(trimmed) || trimmed.length() > 2000) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Nội dung phản hồi phải từ 1 đến 2000 ký tự");
        }

        AiChatSession session = findSessionById(sessionId);
        String normalizedRole = normalizeStaffRole(staffRole);
        String displayName = resolveStaffDisplayName(staffName, normalizedRole);

        if (effectiveHandoffStatus(session) != AiChatHandoffStatus.HUMAN_ACTIVE) {
            session = applyClaim(session, staffId, displayName, normalizedRole);
        } else {
            session.setUpdatedAt(Instant.now());
            sessionRepository.save(session);
        }

        AiChatMessage staffMessage = AiChatMessage.builder()
                .sessionId(session.getId())
                .role("HUMAN_AGENT")
                .senderId(staffId)
                .senderName(displayName)
                .senderRole(normalizedRole)
                .content(trimmed)
                .build();
        AiChatMessage saved = messageRepository.save(staffMessage);
        log.info("{} staffId={} đã phản hồi trực tiếp trong sessionId={}", normalizedRole, staffId, sessionId);
        return toMessageDto(saved);
    }

    /**
     * Admin / Moderator hoàn tất hỗ trợ và trả phiên hội thoại về lại cho AI.
     */
    @Transactional
    public AiChatSessionDto resolveHandoffSession(UUID sessionId, Long staffId, String staffName, String staffRole) {
        AiChatSession session = findSessionById(sessionId);
        if (effectiveHandoffStatus(session) != AiChatHandoffStatus.AI_ACTIVE) {
            String normalizedRole = normalizeStaffRole(staffRole);
            String displayName = resolveStaffDisplayName(staffName, normalizedRole);
            clearHandoffAssignment(session);
            session = sessionRepository.save(session);
            saveSystemMessage(
                    session.getId(),
                    String.format("%s %s đã kết thúc hỗ trợ trực tiếp. Phiên chat đã quay lại chế độ AI Hướng dẫn viên.",
                            buildStaffRoleLabel(normalizedRole), displayName)
            );
            log.info("{} staffId={} đã kết thúc hỗ trợ sessionId={}", normalizedRole, staffId, sessionId);
        }
        return toSessionDto(session, findUserQuietly(session.getUserId()));
    }

    /**
     * Xử lý luồng Chat RAG chính:
     * 1. Kiểm tra Rate Limit và độ dài câu hỏi.
     * 2. Xác thực hoặc tìm/tạo phiên chat.
     * 3. Lưu tin nhắn của User vào DB.
     * 4. Nếu phiên đang ở chế độ chờ/chat người thật, giữ tin nhắn và không gọi AI.
     * 5. Truy xuất ngữ cảnh Vector (cô lập REQUIRES_NEW) & Memory.
     * 6. Lắp ráp Prompt và gọi Gemini LLM.
     * 7. Lưu câu trả lời của AI vào DB và trả về cho du khách.
     */
    @Transactional
    public AiChatResponse chat(Long userId, AiChatRequest request) {
        aiRateLimiterService.checkAndConsume(userId);

        String trimmedQuestion = request.getQuestion() != null ? request.getQuestion().trim() : "";
        int maxLen = properties.getMaxQuestionLength() > 0 ? properties.getMaxQuestionLength() : 1000;
        if (!StringUtils.hasText(trimmedQuestion) || trimmedQuestion.length() > maxLen) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Câu hỏi phải từ 1 đến " + maxLen + " ký tự");
        }

        // 1. Xác định Session
        AiChatSession session;
        if (request.getSessionId() != null) {
            session = findSessionOwnedByUser(request.getSessionId(), userId);
            if (request.getDestinationId() != null && session.getCurrentDestinationId() == null) {
                session.setCurrentDestinationId(request.getDestinationId());
                session = sessionRepository.save(session);
            }
        } else {
            Long destId = request.getDestinationId();
            var found = destId != null
                    ? sessionRepository.findFirstByUserIdAndCurrentDestinationIdOrderByUpdatedAtDesc(userId, destId)
                    : sessionRepository.findFirstByUserIdAndCurrentDestinationIdIsNullOrderByUpdatedAtDesc(userId);
            session = found.orElseGet(() -> sessionRepository.save(
                    AiChatSession.builder()
                            .userId(userId)
                            .currentDestinationId(destId)
                            .build()
            ));
        }

        session.setUpdatedAt(Instant.now());
        sessionRepository.save(session);

        // 2. Lưu tin nhắn người dùng vào DB
        AiChatMessage userMessage = AiChatMessage.builder()
                .sessionId(session.getId())
                .role("USER")
                .senderId(userId)
                .senderRole(Role.TOURIST)
                .content(trimmedQuestion)
                .build();
        AiChatMessage savedUserMessage = messageRepository.save(userMessage);

        // 2b. Nếu đang chờ Admin/Moderator hoặc đang chat người thật thì không để AI trả lời đè
        AiChatHandoffStatus handoffStatus = effectiveHandoffStatus(session);
        if (handoffStatus == AiChatHandoffStatus.WAITING_HUMAN
                || handoffStatus == AiChatHandoffStatus.HUMAN_ACTIVE) {
            return AiChatResponse.builder()
                    .sessionId(session.getId())
                    .messageId(savedUserMessage.getId())
                    .answer(null)
                    .mode(handoffStatus.name())
                    .handoffStatus(handoffStatus.name())
                    .citations(List.of())
                    .createdAt(savedUserMessage.getCreatedAt())
                    .build();
        }

        // 3. Phân biệt chế độ: Normal Guide vs Task Hint & Nạp thêm AI_RULE từ Admin
        boolean isTaskHintMode = (request.getTaskId() != null);
        String activeMode = isTaskHintMode ? "TASK_HINT" : "NORMAL_GUIDE";
        String baseSystemPrompt = isTaskHintMode
                ? VirtualGuidePromptTemplate.TASK_HINT_SYSTEM_PROMPT
                : VirtualGuidePromptTemplate.NORMAL_GUIDE_SYSTEM_PROMPT;

        // 4. Retrieval: Nhúng câu hỏi & Truy vấn Vector Chunks (REQUIRES_NEW)
        Long targetDestinationId = request.getDestinationId() != null
                ? request.getDestinationId()
                : session.getCurrentDestinationId();

        List<AiKnowledgeDocument> activeRules = List.of();
        try {
            List<AiKnowledgeDocument> foundRules = documentRepository.findActiveRulesForChat(targetDestinationId);
            if (foundRules != null) {
                activeRules = foundRules;
            }
        } catch (Exception ex) {
            log.warn("Không tải được AI_RULE bổ sung cho destinationId={}: {}", targetDestinationId, ex.getMessage());
        }
        String systemInstruction = promptTemplate.appendAdminRules(baseSystemPrompt, activeRules);

        List<AiKnowledgeChunk> relevantChunks = aiRetrievalService.retrieveRelevantChunks(
                trimmedQuestion,
                targetDestinationId,
                isTaskHintMode
        );

        List<String> citations = new ArrayList<>();
        String resolvedDestinationName = null;
        for (AiKnowledgeChunk chunk : relevantChunks) {
            if (chunk.getMetadata() != null) {
                Object title = chunk.getMetadata().get("title");
                if (title != null && StringUtils.hasText(String.valueOf(title))) {
                    citations.add(String.valueOf(title));
                } else {
                    citations.add(chunk.getSourceId());
                }
                if (resolvedDestinationName == null && chunk.getMetadata().get("destination_name") != null) {
                    String candidateName = String.valueOf(chunk.getMetadata().get("destination_name"));
                    if (StringUtils.hasText(candidateName)) {
                        resolvedDestinationName = candidateName;
                    }
                }
            } else {
                citations.add(chunk.getSourceId());
            }
        }
        if (resolvedDestinationName == null && targetDestinationId != null) {
            resolvedDestinationName = "Điểm đến #" + targetDestinationId;
        }

        // 5. Memory: Lấy tối đa 8 tin nhắn gần nhất trước tin nhắn vừa tạo để làm ngữ cảnh
        List<AiChatMessage> recentMessages = messageRepository.findRecentMessagesAsc(session.getId(), 8);
        List<GeminiChatClient.ChatTurn> historyTurns = new ArrayList<>();
        for (AiChatMessage msg : recentMessages) {
            if (msg.getId() != null && msg.getId().equals(savedUserMessage.getId())) {
                continue;
            }
            if ("SYSTEM".equalsIgnoreCase(msg.getRole())) {
                continue;
            }
            String turnRole = "HUMAN_AGENT".equalsIgnoreCase(msg.getRole()) ? "ASSISTANT" : msg.getRole();
            historyTurns.add(new GeminiChatClient.ChatTurn(turnRole, msg.getContent()));
        }

        // 6. Ghép Prompt hoàn chỉnh
        String contextText = relevantChunks.stream()
                .map(AiKnowledgeChunk::getChunkText)
                .collect(Collectors.joining("\n---\n"));

        String augmentedPrompt = promptTemplate.buildAugmentedPrompt(
                contextText,
                resolvedDestinationName,
                trimmedQuestion
        );

        // 7. Gọi Gemini Chat Client
        String aiAnswer = chatClient.generateReply(
                systemInstruction,
                historyTurns,
                augmentedPrompt,
                0.3,
                1024
        );

        if (!StringUtils.hasText(aiAnswer)) {
            aiAnswer = "Rất tiếc, tôi chưa có thông tin chính xác về câu hỏi này tại điểm đến của bạn.";
        } else {
            aiAnswer = sanitizeAnswerFormatting(aiAnswer);
        }

        // 8. Lưu câu trả lời của AI vào DB
        AiChatMessage aiMessage = AiChatMessage.builder()
                .sessionId(session.getId())
                .role("ASSISTANT")
                .senderName("AI Hướng dẫn viên")
                .senderRole("AI")
                .content(aiAnswer)
                .build();
        AiChatMessage savedAiMessage = messageRepository.save(aiMessage);

        return AiChatResponse.builder()
                .sessionId(session.getId())
                .messageId(savedAiMessage.getId())
                .answer(aiAnswer)
                .mode(activeMode)
                .handoffStatus(AiChatHandoffStatus.AI_ACTIVE.name())
                .citations(citations.stream().distinct().toList())
                .createdAt(savedAiMessage.getCreatedAt())
                .build();
    }

    /**
     * Loại bỏ các ký hiệu Markdown thừa (** **, __, ###, bullet *) nhưng giữ nguyên link [label](/tours/id).
     */
    static String sanitizeAnswerFormatting(String rawAnswer) {
        if (!StringUtils.hasText(rawAnswer)) {
            return rawAnswer;
        }
        String cleaned = BOLD_MARKDOWN_PATTERN.matcher(rawAnswer).replaceAll("$1");
        cleaned = UNDERLINE_BOLD_PATTERN.matcher(cleaned).replaceAll("$1");
        cleaned = HEADING_MARKDOWN_PATTERN.matcher(cleaned).replaceAll("");
        cleaned = STAR_BULLET_PATTERN.matcher(cleaned).replaceAll("$1- ");
        cleaned = cleaned.replace("**", "");
        return cleaned.trim();
    }

    private AiChatSession findSessionOwnedByUser(UUID sessionId, Long userId) {
        return sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.AI_SESSION_NOT_FOUND,
                        "Không tìm thấy phiên trò chuyện hoặc bạn không có quyền truy cập"));
    }

    private AiChatSession findSessionById(UUID sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new AppException(ErrorCode.AI_SESSION_NOT_FOUND,
                        "Không tìm thấy phiên trò chuyện"));
    }

    private AiChatHandoffStatus effectiveHandoffStatus(AiChatSession session) {
        return session.getHandoffStatus() != null
                ? session.getHandoffStatus()
                : AiChatHandoffStatus.AI_ACTIVE;
    }

    private AiChatSession applyClaim(AiChatSession session, Long staffId, String staffName, String staffRole) {
        String normalizedRole = normalizeStaffRole(staffRole);
        String displayName = resolveStaffDisplayName(staffName, normalizedRole);
        boolean wasDifferentHandler = effectiveHandoffStatus(session) != AiChatHandoffStatus.HUMAN_ACTIVE
                || (staffId != null && !staffId.equals(session.getAssignedStaffId()));

        session.setHandoffStatus(AiChatHandoffStatus.HUMAN_ACTIVE);
        session.setAssignedStaffId(staffId);
        session.setAssignedStaffName(displayName);
        session.setAssignedStaffRole(normalizedRole);
        session.setUpdatedAt(Instant.now());
        AiChatSession saved = sessionRepository.save(session);

        if (wasDifferentHandler) {
            saveSystemMessage(
                    saved.getId(),
                    String.format("%s %s đã tiếp nhận và tham gia hỗ trợ trực tiếp phiên trò chuyện này.",
                            buildStaffRoleLabel(normalizedRole), displayName)
            );
            log.info("{} staffId={} đã tiếp nhận hỗ trợ sessionId={}", normalizedRole, staffId, saved.getId());
        }
        return saved;
    }

    private void clearHandoffAssignment(AiChatSession session) {
        session.setHandoffStatus(AiChatHandoffStatus.AI_ACTIVE);
        session.setAssignedStaffId(null);
        session.setAssignedStaffName(null);
        session.setAssignedStaffRole(null);
        session.setHandoffRequestedAt(null);
        session.setHandoffReason(null);
        session.setUpdatedAt(Instant.now());
    }

    private void saveSystemMessage(UUID sessionId, String content) {
        messageRepository.save(AiChatMessage.builder()
                .sessionId(sessionId)
                .role("SYSTEM")
                .senderName("Hệ thống")
                .senderRole("SYSTEM")
                .content(content)
                .build());
    }

    private String normalizeStaffRole(String staffRole) {
        if (Role.ADMIN.equalsIgnoreCase(staffRole)) {
            return Role.ADMIN;
        }
        return Role.CONTENT_MODERATOR;
    }

    private String resolveStaffDisplayName(String staffName, String normalizedRole) {
        if (StringUtils.hasText(staffName)) {
            return staffName.trim();
        }
        return Role.ADMIN.equals(normalizedRole) ? "Quản trị viên" : "Kiểm duyệt viên";
    }

    private String buildStaffRoleLabel(String normalizedRole) {
        return Role.ADMIN.equals(normalizedRole) ? "Admin" : "Moderator";
    }

    private Map<Long, User> loadUserMap(Collection<Long> userIds) {
        if (userRepository == null || userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
    }

    private User findUserQuietly(Long userId) {
        if (userRepository == null || userId == null) {
            return null;
        }
        return userRepository.findById(userId).orElse(null);
    }

    private AiChatSessionDto toSessionDto(AiChatSession session) {
        return toSessionDto(session, null);
    }

    private AiChatSessionDto toSessionDto(AiChatSession session, User owner) {
        String preview = messageRepository.findFirstBySessionIdOrderByCreatedAtDesc(session.getId())
                .map(AiChatMessage::getContent)
                .map(c -> c != null && c.length() > 80 ? c.substring(0, 77) + "..." : c)
                .orElse(null);
        long msgCount = messageRepository.countBySessionId(session.getId());

        return AiChatSessionDto.builder()
                .id(session.getId())
                .userId(session.getUserId())
                .currentDestinationId(session.getCurrentDestinationId())
                .lastMessagePreview(preview)
                .messageCount(msgCount)
                .handoffStatus(effectiveHandoffStatus(session).name())
                .handoffRequestedAt(session.getHandoffRequestedAt())
                .handoffReason(session.getHandoffReason())
                .assignedStaffId(session.getAssignedStaffId())
                .assignedStaffName(session.getAssignedStaffName())
                .assignedStaffRole(session.getAssignedStaffRole())
                .userFullName(owner != null ? owner.getFullName() : null)
                .userEmail(owner != null ? owner.getEmail() : null)
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .build();
    }

    private AiChatMessageDto toMessageDto(AiChatMessage message) {
        String resolvedSenderRole = StringUtils.hasText(message.getSenderRole())
                ? message.getSenderRole()
                : ("ASSISTANT".equalsIgnoreCase(message.getRole()) ? "AI" : message.getRole());
        String resolvedSenderName = StringUtils.hasText(message.getSenderName())
                ? message.getSenderName()
                : ("ASSISTANT".equalsIgnoreCase(message.getRole()) ? "AI Hướng dẫn viên" : null);

        return AiChatMessageDto.builder()
                .id(message.getId())
                .sessionId(message.getSessionId())
                .role(message.getRole())
                .content(message.getContent())
                .senderId(message.getSenderId())
                .senderName(resolvedSenderName)
                .senderRole(resolvedSenderRole)
                .createdAt(message.getCreatedAt())
                .build();
    }
}
