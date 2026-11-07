package com.journeygo.modules.partnerapplication.repository;

import com.journeygo.modules.partnerapplication.entity.PartnerApplication;
import com.journeygo.modules.partnerapplication.entity.enums.PartnerApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PartnerApplicationRepository extends JpaRepository<PartnerApplication, Long> {

    Optional<PartnerApplication> findByEmailIgnoreCase(String email);

    /** Đơn của một ứng viên đối tác cụ thể (mới nhất trước). */
    Optional<PartnerApplication> findFirstByApplicant_IdOrderByCreatedAtDesc(Long applicantUserId);

    /** Tồn tại đơn đang chờ duyệt của email này hay không (chống trùng đơn). */
    boolean existsByEmailIgnoreCaseAndStatusIn(String email, List<PartnerApplicationStatus> statuses);

    /** Tồn tại đơn đang chờ duyệt trùng định danh doanh nghiệp hay không (chống trùng đơn). */
    boolean existsByBusinessNameIgnoreCaseAndStatusIn(String businessName, List<PartnerApplicationStatus> statuses);

    Page<PartnerApplication> findByStatus(PartnerApplicationStatus status, Pageable pageable);

    /**
     * Tìm đơn đang chờ duyệt của một email — dùng để chống trùng khi gửi đơn.
     */
    @Query("SELECT a FROM PartnerApplication a WHERE LOWER(a.email) = LOWER(:email) AND a.status = :status")
    List<PartnerApplication> findPendingByEmail(@Param("email") String email,
                                                @Param("status") PartnerApplicationStatus status);

    /**
     * Tìm đơn đang chờ duyệt trùng tên doanh nghiệp.
     */
    @Query("SELECT a FROM PartnerApplication a WHERE LOWER(a.businessName) = LOWER(:businessName) AND a.status = :status")
    List<PartnerApplication> findPendingByBusinessName(@Param("businessName") String businessName,
                                                       @Param("status") PartnerApplicationStatus status);

    /** Tất cả đơn đã từ chối (để Admin xem lại / người đăng ký sửa lại). */
    List<PartnerApplication> findByStatusIn(List<PartnerApplicationStatus> statuses);

    long countByStatus(PartnerApplicationStatus status);

    /** Đơn được gửi trong khoảng thời gian — dùng cho báo cáo. */
    long countByStatusAndSubmittedAtBetween(PartnerApplicationStatus status, Instant from, Instant to);
}
