package com.journeygo.modules.aiguide.repository;

import com.journeygo.modules.aiguide.entity.AiChatSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiChatSessionRepository extends JpaRepository<AiChatSession, UUID> {

    /**
     * Tìm phiên theo id và userId để đảm bảo quyền sở hữu.
     */
    Optional<AiChatSession> findByIdAndUserId(UUID id, Long userId);

    /**
     * Danh sách các phiên trò chuyện của một du khách, sắp xếp theo thời gian cập nhật giảm dần.
     */
    Page<AiChatSession> findByUserIdOrderByUpdatedAtDesc(Long userId, Pageable pageable);

    /**
     * Tìm phiên gần đây nhất của du khách tại một địa điểm cụ thể.
     */
    Optional<AiChatSession> findFirstByUserIdAndCurrentDestinationIdOrderByUpdatedAtDesc(Long userId, Long currentDestinationId);
}
