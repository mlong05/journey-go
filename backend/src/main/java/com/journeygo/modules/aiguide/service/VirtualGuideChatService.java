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
import com.journeygo.modules.aiguide.repository.AiKnowledgeChunkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
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
    private final AiKnowledgeChunkRepository chunkRepository;
    private final AiEmbeddingService embeddingService;
    private final GeminiChatClient chatClient;
    private final VirtualGuidePromptTemplate promptTemplate;
    private final GeminiAiProperties properties;
    private final AiRetrievalService aiRetrievalService;

    /**
     * Khởi tạo hoặc lấy lại một phiên hội thoại cho du khách.
     */
    @Transactional
    public AiChatSessionDto getOrCreateSession(Long userId, Long destinationId) {
        if (destinationId != null) {
            var existingSession = sessionRepository
                    .findFirstByUserIdAndCurrentDestinationIdOrderByUpdatedAtDesc(userId, destinationId);
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
     * Xử lý luồng Chat RAG chính:
     * 1. Xác thực hoặc tạo phiên chat.
     * 2. Lưu tin nhắn của User vào DB.
     * 3. Nhúng (embed) câu hỏi của user thành Vector.
     * 4. Tìm kiếm Top-K chunks tương đồng từ AiKnowledgeChunkRepository.
     * 5. Lấy 6-8 tin nhắn gần nhất làm Memory.
     * 6. Lắp ráp Prompt và gọi Gemini LLM.
     * 7. Lưu câu trả lời của AI vào DB và trả về cho du khách.
     */
    @Transactional
    public AiChatResponse chat(Long userId, AiChatRequest request) {
        // 1. Xác định Session
        AiChatSession session;
        if (request.getSessionId() != null) {
            session = findSessionOwnedByUser(request.getSessionId(), userId);
            if (request.getDestinationId() != null && session.getCurrentDestinationId() == null) {
                session.setCurrentDestinationId(request.getDestinationId());
                session = sessionRepository.save(session);
            }
        } else {
            // Tự động tìm hoặc tạo session mới theo destinationId
            Long destId = request.getDestinationId();
            session = sessionRepository
                    .findFirstByUserIdAndCurrentDestinationIdOrderByUpdatedAtDesc(userId, destId)
                    .orElseGet(() -> sessionRepository.save(
                            AiChatSession.builder()
                                    .userId(userId)
                                    .currentDestinationId(destId)
                                    .build()
                    ));
        }

        // Cập nhật updatedAt cho session
        session.setUpdatedAt(Instant.now());
        sessionRepository.save(session);

        // 2. Lưu tin nhắn người dùng vào DB
        AiChatMessage userMessage = AiChatMessage.builder()
                .sessionId(session.getId())
                .role("USER")
                .content(request.getQuestion().trim())
                .build();
        messageRepository.save(userMessage);

        // 3. Phân biệt chế độ: Normal Guide vs Task Hint
        boolean isTaskHintMode = (request.getTaskId() != null);
        String activeMode = isTaskHintMode ? "TASK_HINT" : "NORMAL_GUIDE";
        String systemInstruction = isTaskHintMode
                ? VirtualGuidePromptTemplate.TASK_HINT_SYSTEM_PROMPT
                : VirtualGuidePromptTemplate.NORMAL_GUIDE_SYSTEM_PROMPT;

        // 4. Retrieval: Nhúng câu hỏi & Truy vấn Vector Chunks (transaction riêng để tránh abort cascade)
        Long targetDestinationId = request.getDestinationId() != null
                ? request.getDestinationId()
                : session.getCurrentDestinationId();

        // Gọi qua AiRetrievalService với REQUIRES_NEW để lỗi pgvector không làm abort transaction chính
        List<AiKnowledgeChunk> relevantChunks = aiRetrievalService.retrieveRelevantChunks(
                request.getQuestion().trim(),
                targetDestinationId,
                isTaskHintMode
        );

        List<String> citations = new ArrayList<>();
        for (AiKnowledgeChunk chunk : relevantChunks) {
            if (chunk.getMetadata() != null && chunk.getMetadata().containsKey("title")) {
                citations.add(String.valueOf(chunk.getMetadata().get("title")));
            } else {
                citations.add(chunk.getSourceId());
            }
        }

        // 5. Memory: Lấy 6 tin nhắn gần nhất trước tin nhắn vừa tạo để làm ngữ cảnh
        List<AiChatMessage> recentMessages = messageRepository.findRecentMessagesAsc(session.getId(), 8);
        List<GeminiChatClient.ChatTurn> historyTurns = new ArrayList<>();
        for (AiChatMessage msg : recentMessages) {
            // Không lặp lại tin nhắn user vừa gửi
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
                targetDestinationId != null ? ("Điểm đến #" + targetDestinationId) : null,
                request.getQuestion()
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
        return AiChatSessionDto.builder()
                .id(session.getId())
                .userId(session.getUserId())
                .currentDestinationId(session.getCurrentDestinationId())
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
