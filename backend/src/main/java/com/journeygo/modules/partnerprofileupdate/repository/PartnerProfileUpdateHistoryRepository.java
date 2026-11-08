package com.journeygo.modules.partnerprofileupdate.repository;

import com.journeygo.modules.partnerprofileupdate.entity.PartnerProfileUpdateHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PartnerProfileUpdateHistoryRepository extends JpaRepository<PartnerProfileUpdateHistory, Long> {

    List<PartnerProfileUpdateHistory> findByRequest_IdOrderByCreatedAtDesc(Long requestId);

    /**
     * Toàn bộ lịch sử thay đổi của một đối tác, xuyên suốt mọi yêu cầu (mới nhất trước).
     *
     * <p>Dùng cho màn hình "Lịch sử thay đổi thông tin" của đối tác — mỗi lần gửi yêu cầu
     * là một {@code request} riêng nhưng lịch sử phải nối liền, không bị mất khi gửi lần 2.
     */
    List<PartnerProfileUpdateHistory> findByRequest_Partner_IdOrderByCreatedAtDesc(Long partnerUserId);
}
