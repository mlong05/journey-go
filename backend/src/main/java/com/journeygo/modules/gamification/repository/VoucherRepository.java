package com.journeygo.modules.gamification.repository;

import com.journeygo.modules.gamification.entity.Voucher;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VoucherRepository extends JpaRepository<Voucher, Long> {

    /** Khóa dòng voucher (SELECT ... FOR UPDATE) để các lượt đổi đồng thời xếp hàng, tránh bán quá số lượng. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Voucher v where v.id = :id")
    Optional<Voucher> findByIdForUpdate(@Param("id") Long id);

    Optional<Voucher> findByCode(String code);

    List<Voucher> findByActiveTrueOrderByPointsRequiredAsc();

    boolean existsByCode(String code);
}
