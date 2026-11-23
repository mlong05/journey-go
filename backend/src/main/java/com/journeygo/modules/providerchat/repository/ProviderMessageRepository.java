package com.journeygo.modules.providerchat.repository;

import com.journeygo.modules.providerchat.entity.ProviderMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProviderMessageRepository extends JpaRepository<ProviderMessage, Long> {

    /** Tin nhắn của một cuộc trò chuyện (cũ nhất trước ⇒ hiển thị đúng thứ tự). */
    List<ProviderMessage> findByConversation_IdOrderByCreatedAtAsc(Long conversationId);

    /** Tổng số tin nhắn của một cuộc trò chuyện (hiển thị "x / y tin"). */
    long countByConversation_Id(Long conversationId);

    /**
     * Trang tin nhắn MỚI NHẤT của một cuộc trò chuyện (sắp xếp GIẢM dần theo id).
     *
     * <p>⚠️ Dùng cho phân trang kiểu "cuộn lên để load thêm": mỗi lần gọi lấy
     * {@code limit} tin MỚI NHẤT. Frontend tự đảo lại để render tăng dần.
     *
     * @param conversationId ID cuộc trò chuyện
     * @param pageable       dùng {@code PageRequest.of(0, limit, Sort.by(DESC, "id"))}
     */
    List<ProviderMessage> findByConversation_IdOrderByIdDesc(Long conversationId, Pageable pageable);

    /**
     * Trang tin nhắn CŨ HƠN mốc {@code beforeId}.
     *
     * <p>⚠️ Cursor theo {@code id} (auto-increment) thay vì {@code createdAt} — vì
     * nhiều tin có thể trùng {@code createdAt} (cùng mili-giây) ⇒ phân trang theo
     * thời gian sẽ bị TRÙNG hoặc BỎ SÓT tin. {@code id} là khóa tăng dần tuyệt đối
     * ⇒ mỗi tin xuất hiện đúng một lần, không thiếu không thừa.
     *
     * @param beforeId chỉ lấy tin có {@code id < beforeId}
     */
    List<ProviderMessage> findByConversation_IdAndIdLessThanOrderByIdDesc(
            Long conversationId, Long beforeId, Pageable pageable);
}
