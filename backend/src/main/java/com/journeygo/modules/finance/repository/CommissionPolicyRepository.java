package com.journeygo.modules.finance.repository;

import com.journeygo.modules.finance.entity.CommissionPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface CommissionPolicyRepository extends JpaRepository<CommissionPolicy, Long> {

    List<CommissionPolicy> findAllByOrderByEffectiveFromDesc();

    /**
     * Chính sách đang có hiệu lực tại thời điểm {@code at} (BR-03: tối đa một chính sách).
     *
     * <p>Dùng JPQL thuần (không ép kiểu {@code timestamptz} như native SQL) để tương thích
     * với Hibernate HQL parser.
     */
    @Query("""
            SELECT p FROM CommissionPolicy p
            WHERE p.cancelled = false
              AND p.effectiveFrom <= :at
              AND (p.effectiveTo IS NULL OR p.effectiveTo > :at)
            ORDER BY p.effectiveFrom DESC
            """)
    List<CommissionPolicy> findEffectiveAt(@Param("at") Instant at);

    /**
     * Các chính sách CHƯA bị hủy — dùng để kiểm tra chồng lấn (BR-04) và tự động đóng
     * khoảng hiệu lực của chính sách cũ khi chính sách mới bắt đầu.
     */
    List<CommissionPolicy> findByCancelledFalseOrderByEffectiveFromAsc();

    Optional<CommissionPolicy> findFirstByCancelledFalseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(Instant at);

    List<CommissionPolicy> findByCreatedBy_IdOrderByCreatedAtDesc(Long createdById);
}