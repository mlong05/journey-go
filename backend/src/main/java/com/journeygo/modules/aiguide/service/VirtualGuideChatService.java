package com.journeygo.modules.aiguide.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import com.journeygo.modules.aiguide.dto.AiChatMessageDto;
import com.journeygo.modules.aiguide.dto.AiChatRequest;
import com.journeygo.modules.aiguide.dto.AiChatResponse;
import com.journeygo.modules.aiguide.dto.AiChatSessionDto;
import com.journeygo.modules.aiguide.entity.AiChatMessage;
import com.journeygo.modules.aiguide.entity.AiChatSession;
import com.journeygo.modules.aiguide.entity.AiKnowledgeChunk;
import com.journeygo.modules.aiguide.repository.AiChatMessageRepository;
import com.journeygo.modules.aiguide.repository.AiChatSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service trung tâm điều phối luồng hỏi đáp RAG (Retrieval-Augmented Generation)
 * và quản lý bộ nhớ phiên trò chuyện (Chat Memory) cho du khách.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VirtualGuideChatService {

    private final AiChatSessionRepository sessionRepository;
    private final AiChatMessageRepository messageRepository;
    private final GeminiChatClient chatClient;
    private final VirtualGuidePromptTemplate promptTemplate;
    private final GeminiAiProperties properties;
    private final AiRetrievalService aiRetrievalService;
    private final AiRateLimiterService aiRateLimiterService;

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
     * Xử lý luồng Chat RAG chính:
     * 1. Kiểm tra Rate Limit và độ dài câu hỏi.
     * 2. Xác thực hoặc tìm/tạo phiên chat.
     * 3. Lưu tin nhắn của User vào DB.
     * 4. Truy xuất ngữ cảnh Vector (cô lập REQUIRES_NEW).
     * 5. Lấy lịch sử tin nhắn làm Memory.
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
                .content(trimmedQuestion)
                .build();
        messageRepository.save(userMessage);

        // 3. Phân biệt chế độ: Normal Guide vs Task Hint
        boolean isTaskHintMode = (request.getTaskId() != null);
        String activeMode = isTaskHintMode ? "TASK_HINT" : "NORMAL_GUIDE";
        String systemInstruction = isTaskHintMode
                ? VirtualGuidePromptTemplate.TASK_HINT_SYSTEM_PROMPT
                : VirtualGuidePromptTemplate.NORMAL_GUIDE_SYSTEM_PROMPT;

        // 4. Retrieval: Nhúng câu hỏi & Truy vấn Vector Chunks (REQUIRES_NEW)
        Long targetDestinationId = request.getDestinationId() != null
                ? request.getDestinationId()
                : session.getCurrentDestinationId();

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
            if (!msg.getId().equals(userMessage.getId())) {
                historyTurns.add(new GeminiChatClient.ChatTurn(msg.getRole(), msg.getContent()));
            }
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
        }

        // 8. Lưu câu trả lời của AI vào DB
        AiChatMessage aiMessage = AiChatMessage.builder()
                .sessionId(session.getId())
                .role("ASSISTANT")
                .content(aiAnswer)
                .build();
        AiChatMessage savedAiMessage = messageRepository.save(aiMessage);

        return AiChatResponse.builder()
                .sessionId(session.getId())
                .messageId(savedAiMessage.getId())
                .answer(aiAnswer)
                .mode(activeMode)
                .citations(citations.stream().distinct().toList())
                .createdAt(savedAiMessage.getCreatedAt())
                .build();
    }

    private AiChatSession findSessionOwnedByUser(UUID sessionId, Long userId) {
        return sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.AI_SESSION_NOT_FOUND,
                        "Không tìm thấy phiên trò chuyện hoặc bạn không có quyền truy cập"));
    }

    private AiChatSessionDto toSessionDto(AiChatSession session) {
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
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .build();
    }

    private AiChatMessageDto toMessageDto(AiChatMessage message) {
        return AiChatMessageDto.builder()
                .id(message.getId())
                .sessionId(message.getSessionId())
                .role(message.getRole())
                .content(message.getContent())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
