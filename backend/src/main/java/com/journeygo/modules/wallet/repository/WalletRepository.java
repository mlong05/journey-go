package com.journeygo.modules.wallet.repository;

import com.journeygo.modules.wallet.entity.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WalletRepository extends JpaRepository<Wallet, Long> {

    Optional<Wallet> findByPartner_Id(Long partnerId);

    /**
     * Lấy Wallet kèm khóa pessimistic write — dùng khi duyệt Settlement hoặc ghi nhận
     * điều chỉnh tài chính để tránh cập nhật số dư hai lần / race condition.
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM Wallet w WHERE w.partner.id = :partnerId")
    Optional<Wallet> findByPartnerIdForUpdate(@Param("partnerId") Long partnerId);
}
