package com.journeygo.modules.aiguide.repository;

import com.journeygo.modules.aiguide.entity.AiChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiChatMessageRepository extends JpaRepository<AiChatMessage, UUID> {

    /**
     * Lấy toàn bộ tin nhắn trong phiên theo thứ tự thời gian tăng dần.
     */
    List<AiChatMessage> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    /**
     * Lấy tin nhắn trong phiên có phân trang (thường sắp xếp desc để lấy tin mới nhất).
     */
    Page<AiChatMessage> findBySessionIdOrderByCreatedAtDesc(UUID sessionId, Pageable pageable);

    /**
     * Lấy N tin nhắn gần đây nhất của phiên chat để làm Memory ngữ cảnh,
     * trả về theo thứ tự thời gian tăng dần.
     */
    @Query(value = """
            SELECT * FROM (
                SELECT * FROM ai_chat_messages
                WHERE session_id = :sessionId
                ORDER BY created_at DESC
                LIMIT :limit
            ) sub
            ORDER BY created_at ASC
            """, nativeQuery = true)
    List<AiChatMessage> findRecentMessagesAsc(
            @Param("sessionId") UUID sessionId,
            @Param("limit") int limit
    );

    /**
     * Xóa tất cả tin nhắn của một session.
     */
    void deleteBySessionId(UUID sessionId);
}
