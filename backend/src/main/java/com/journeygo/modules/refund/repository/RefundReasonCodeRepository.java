package com.journeygo.modules.refund.repository;

import com.journeygo.modules.refund.entity.RefundReasonCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RefundReasonCodeRepository extends JpaRepository<RefundReasonCode, Long> {

    Optional<RefundReasonCode> findByCode(String code);

    boolean existsByCode(String code);

    boolean existsByGroupIdAndCode(Long groupId, String code);

    /** Mã lý do đang bật của một nhóm, sắp xếp theo thứ tự hiển thị. */
    List<RefundReasonCode> findByGroupIdAndActiveTrueOrderByDisplayOrderAsc(Long groupId);

    List<RefundReasonCode> findByGroup_IdOrderByDisplayOrderAsc(Long groupId);

    /** Số mã lý do hiện có trong một nhóm — dùng sinh mã kỹ thuật tự động. */
    long countByGroup_Id(Long groupId);

    @Query("""
            SELECT c FROM RefundReasonCode c
            LEFT JOIN FETCH c.group
            LEFT JOIN FETCH c.createdBy
            WHERE c.active = true
            ORDER BY c.group.displayOrder ASC, c.displayOrder ASC, c.id ASC
            """)
    List<RefundReasonCode> findAllActiveOrdered();

    @Query("""
            SELECT c FROM RefundReasonCode c
            LEFT JOIN FETCH c.group
            LEFT JOIN FETCH c.createdBy
            ORDER BY c.group.displayOrder ASC, c.displayOrder ASC, c.id ASC
            """)
    List<RefundReasonCode> findAllOrdered();

    @Query("""
            SELECT c FROM RefundReasonCode c
            LEFT JOIN FETCH c.group
            WHERE c.code = :code
            """)
    Optional<RefundReasonCode> findByCodeWithGroup(@Param("code") String code);
}
