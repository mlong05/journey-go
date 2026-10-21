package com.journeygo.modules.gamification.repository;

import com.journeygo.modules.gamification.entity.UserVoucher;
import com.journeygo.modules.gamification.entity.enums.UserVoucherStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserVoucherRepository extends JpaRepository<UserVoucher, Long> {

    @Query("SELECT uv FROM UserVoucher uv JOIN FETCH uv.voucher WHERE uv.userId = :userId ORDER BY uv.redeemedAt DESC")
    List<UserVoucher> findByUserIdWithVoucher(@Param("userId") Long userId);

    @Query("SELECT uv FROM UserVoucher uv JOIN FETCH uv.voucher WHERE uv.userId = :userId AND uv.status = :status ORDER BY uv.expiryDate ASC")
    List<UserVoucher> findByUserIdAndStatusWithVoucher(@Param("userId") Long userId, @Param("status") UserVoucherStatus status);

    Optional<UserVoucher> findByUserVoucherCode(String userVoucherCode);

    boolean existsByUserVoucherCode(String userVoucherCode);
}
