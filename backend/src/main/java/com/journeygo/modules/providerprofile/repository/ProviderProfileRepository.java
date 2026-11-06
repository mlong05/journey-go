package com.journeygo.modules.providerprofile.repository;

import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProviderProfileRepository extends JpaRepository<ProviderProfile, Long> {

    Optional<ProviderProfile> findByUser_Id(Long userId);

    boolean existsByUser_Id(Long userId);

    List<ProviderProfile> findByActiveTrue();

    Page<ProviderProfile> findByActiveTrue(Pageable pageable);

    @Query("SELECT p FROM ProviderProfile p WHERE p.user.id = :userId")
    Optional<ProviderProfile> findByUserId(@Param("userId") Long userId);

    /**
     * Tìm ProviderProfile theo danh sách user id — dùng khi ghi nhận doanh thu cho một Booking
     * có nhiều Experience thuộc các ProviderProfile khác nhau.
     */
    @Query("SELECT p FROM ProviderProfile p WHERE p.user.id IN :userIds")
    List<ProviderProfile> findByUserIds(@Param("userIds") List<Long> userIds);
}
