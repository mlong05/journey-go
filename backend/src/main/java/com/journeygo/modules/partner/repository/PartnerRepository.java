package com.journeygo.modules.partner.repository;

import com.journeygo.modules.partner.entity.Partner;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PartnerRepository extends JpaRepository<Partner, Long> {

    Optional<Partner> findByUser_Id(Long userId);

    boolean existsByUser_Id(Long userId);

    List<Partner> findByActiveTrue();

    Page<Partner> findByActiveTrue(Pageable pageable);

    @Query("SELECT p FROM Partner p WHERE p.user.id = :userId")
    Optional<Partner> findByUserId(@Param("userId") Long userId);

    /**
     * Tìm Partner theo danh sách user id — dùng khi ghi nhận doanh thu cho một Booking
     * có nhiều Experience thuộc các Partner khác nhau.
     */
    @Query("SELECT p FROM Partner p WHERE p.user.id IN :userIds")
    List<Partner> findByUserIds(@Param("userIds") List<Long> userIds);
}
