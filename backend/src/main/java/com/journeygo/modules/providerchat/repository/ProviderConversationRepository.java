package com.journeygo.modules.providerchat.repository;

import com.journeygo.modules.providerchat.entity.ProviderConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProviderConversationRepository extends JpaRepository<ProviderConversation, Long> {

    /**
     * Tìm cuộc trò chuyện giữa một du khách và một nhà tour (khoá duy nhất).
     *
     * ⚠️ `touristId`/`providerId` là CỘT THUẦN (không phải quan hệ JPA) ⇒ tên method
     * phải là `findByTouristId...`, KHÔNG phải `findByTourist_Id...` (sai sẽ khiến
     * Spring Data ném PropertyReferenceException lúc khởi động).
     */
    Optional<ProviderConversation> findByTouristIdAndProviderId(Long touristId, Long providerId);

    /** Danh sách cuộc trò chuyện của du khách (mới nhất trước). */
    List<ProviderConversation> findByTouristIdOrderByLastMessageAtDescCreatedAtDesc(Long touristId);

    /** Danh sách cuộc trò chuyện mà nhà tour nhận được (mới nhất trước). */
    List<ProviderConversation> findByProviderIdOrderByLastMessageAtDescCreatedAtDesc(Long providerId);
}
