package com.journeygo.modules.gamification.repository;

import com.journeygo.modules.gamification.entity.PointTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PointTransactionRepository extends JpaRepository<PointTransaction, Long> {

    List<PointTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);

    Page<PointTransaction> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    boolean existsByUserIdAndReferenceId(Long userId, String referenceId);
}
