package com.journeygo.modules.providerchat.repository;

import com.journeygo.modules.providerchat.entity.ProviderMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProviderMessageRepository extends JpaRepository<ProviderMessage, Long> {

    /** Tin nhắn của một cuộc trò chuyện (cũ nhất trước ⇒ hiển thị đúng thứ tự). */
    List<ProviderMessage> findByConversation_IdOrderByCreatedAtAsc(Long conversationId);
}
