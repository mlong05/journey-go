package com.journeygo.modules.refund.repository;

import com.journeygo.modules.refund.entity.RefundReasonGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RefundReasonGroupRepository extends JpaRepository<RefundReasonGroup, Long> {

    Optional<RefundReasonGroup> findByCode(String code);

    boolean existsByCode(String code);

    /** Nhóm đang bật, sắp xếp theo thứ tự hiển thị. */
    List<RefundReasonGroup> findByActiveTrueOrderByDisplayOrderAsc();

    @Query("""
            SELECT g FROM RefundReasonGroup g
            LEFT JOIN FETCH g.createdBy
            ORDER BY g.displayOrder ASC, g.id ASC
            """)
    List<RefundReasonGroup> findAllOrdered();

    @Query("""
            SELECT g FROM RefundReasonGroup g
            LEFT JOIN FETCH g.createdBy
            WHERE g.code = :code
            """)
    Optional<RefundReasonGroup> findByCodeWithCreator(@Param("code") String code);
}
