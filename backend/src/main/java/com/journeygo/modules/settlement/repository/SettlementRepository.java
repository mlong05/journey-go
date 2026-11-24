package com.journeygo.modules.settlement.repository;

import com.journeygo.modules.settlement.entity.Settlement;
import com.journeygo.modules.settlement.entity.enums.SettlementScope;
import com.journeygo.modules.settlement.entity.enums.SettlementStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    Optional<Settlement> findBySettlementCode(String settlementCode);

    Page<Settlement> findByProviderProfile_IdOrderByCreatedAtDesc(Long providerProfileId, Pageable pageable);

    Page<Settlement> findByStatus(SettlementStatus status, Pageable pageable);

    /**
     * Danh sách đợt tất toán — ưu tiên đợt ĐANG CHỜ XỬ LÝ (DRAFT) lên đầu.
     *
     * <p>⚠️ Vì sao cần? Danh sách mặc định sắp theo {@code createdAt DESC} ⇒ đợt mới
     * tạo nằm trên cùng, còn đợt chờ duyệt từ lâu bị đẩy xuống dưới ⇒ Admin
     * phải lật nhiều trang mới thấy việc cần làm. Đây là "hàng đợi" nên việc đang
     * chờ phải nằm trên cùng.
     *
     * <p>Trong nhóm DRAFT, đợt MỚI TẠO hơn nằm trước (mới nhất trước).
     */
    @Query("""
            SELECT s FROM Settlement s
            ORDER BY CASE WHEN s.status = com.journeygo.modules.settlement.entity.enums.SettlementStatus.DRAFT
                          THEN 0 ELSE 1 END,
                     s.createdAt DESC
            """)
    Page<Settlement> findAllPendingFirst(Pageable pageable);

    /**
     * Lọc theo trạng thái + ưu tiên đợt đang chờ xử lý lên đầu.
     */
    @Query("""
            SELECT s FROM Settlement s
            WHERE s.status = :status
            ORDER BY CASE WHEN s.status = com.journeygo.modules.settlement.entity.enums.SettlementStatus.DRAFT
                          THEN 0 ELSE 1 END,
                     s.createdAt DESC
            """)
    Page<Settlement> findByStatusPendingFirst(@Param("status") SettlementStatus status, Pageable pageable);

    /**
     * Đếm số đợt theo trạng thái — TOÀN HỆ THỐNG (không phụ thuộc phân trang).
     */
    long countByStatus(SettlementStatus status);

    /**
     * Tổng tiền của các đợt theo trạng thái — dùng cho ô "Tiền chờ chi trả".
     */
    @Query("SELECT COALESCE(SUM(s.settlementAmount), 0) FROM Settlement s WHERE s.status = :status")
    java.math.BigDecimal sumSettlementAmountByStatus(@Param("status") SettlementStatus status);

    List<Settlement> findByProviderProfile_IdAndRevenuePeriod(Long providerProfileId, String revenuePeriod);

    Optional<Settlement> findByProviderProfile_IdAndRevenuePeriodAndStatus(Long providerProfileId, String revenuePeriod,
                                                                 SettlementStatus status);

    boolean existsByProviderProfile_IdAndRevenuePeriod(Long providerProfileId, String revenuePeriod);

    /**
     * Lấy Settlement kèm khóa pessimistic write — dùng khi duyệt để tránh hai Admin
     * duyệt hai lần (chỉ tạo một giao dịch cộng tiền).
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Settlement s WHERE s.id = :id")
    Optional<Settlement> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            SELECT s FROM Settlement s
            WHERE s.providerProfile.id = :providerProfileId
              AND s.revenuePeriod = :period
            """)
    List<Settlement> findByProviderProfileAndPeriod(@Param("providerProfileId") Long providerProfileId, @Param("period") String period);

    /**
     * Tất cả đợt tất toán TỔNG của một kỳ — dùng khi cần xem lịch sử (đợt đã bị từ chối
     * vẫn giữ để tra cứu).
     *
     * <p>⚠️ Một kỳ có THỂ có nhiều đợt: đợt cũ đã TỪ CHỐI / HỦY + đợt mới đang DRAFT
     * (Admin từ chối rồi tạo lại thủ công). Vì vậy phải lọc theo trạng thái, không
     * được dùng "findFirst" (có thể trả về nhầm đợt cũ).
     *
     * <p>Ràng buộc "mỗi kỳ chỉ 1 đợt tổng còn sống" được đảm bảo ở tầng DB bằng partial
     * unique index `uk_settlement_batch_period` (xem migration V50).
     */
    List<Settlement> findByScopeAndRevenuePeriod(SettlementScope scope, String revenuePeriod);

    /**
     * Các đợt tất toán ĐÃ DUYỆT mà đối tác này có khoản doanh thu bên trong.
     *
     * <p>Bao gồm cả hai loại phạm vi:
     * <ul>
     *   <li>{@code PROVIDER} — đợt của riêng đối tác ({@code settlement.provider_profile_id}).</li>
     *   <li>{@code BATCH} — đợt TỔNG cả sàn, đối tác có mặt qua {@code settlement_details}.</li>
     * </ul>
     *
     * <p>Chỉ lấy đợt {@code APPROVED} — đó là lúc tiền thực sự về ví đối tác.
     */
    @Query("""
            SELECT s FROM Settlement s
            WHERE s.status = com.journeygo.modules.settlement.entity.enums.SettlementStatus.APPROVED
              AND (s.providerProfile.id = :providerProfileId
                   OR EXISTS (SELECT 1 FROM SettlementDetail d
                              WHERE d.settlement.id = s.id
                                AND d.providerProfile.id = :providerProfileId))
            """)
    Page<Settlement> findApprovedByProviderProfile(@Param("providerProfileId") Long providerProfileId,
                                                   Pageable pageable);

    /**
     * Tổng hợp số liệu theo kỳ doanh thu cho các đợt đã duyệt.
     *
     * <p>Gom theo {@code revenuePeriod} để dựng bảng "Doanh thu nền tảng" theo tháng.
     * Chỉ lấy {@code APPROVED} — đó là lúc tiền thực sự được ghi vào ví đối tác.
     */
    @Query("""
            SELECT s.revenuePeriod AS revenuePeriod,
                   SUM(s.grossAmount) AS grossAmount,
                   SUM(s.refundAmount) AS refundAmount,
                   SUM(s.commissionAmount) AS commissionAmount,
                   SUM(s.adjustmentAmount) AS adjustmentAmount,
                   SUM(s.settlementAmount) AS settlementAmount,
                   COUNT(s) AS settlementCount
            FROM Settlement s
            WHERE s.status = com.journeygo.modules.settlement.entity.enums.SettlementStatus.APPROVED
            GROUP BY s.revenuePeriod
            ORDER BY s.revenuePeriod DESC
            """)
    List<ApprovedSettlementAggregate> aggregateApprovedByPeriod();
}
