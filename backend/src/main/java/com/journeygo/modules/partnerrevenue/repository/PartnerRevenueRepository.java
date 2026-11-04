package com.journeygo.modules.partnerrevenue.repository;

import com.journeygo.modules.partnerrevenue.entity.PartnerRevenue;
import com.journeygo.modules.partnerrevenue.entity.enums.PartnerRevenueStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PartnerRevenueRepository extends JpaRepository<PartnerRevenue, Long> {

    /**
     * Tất cả các bản ghi doanh thu của một Booking (mỗi Partner một bản ghi).
     */
    List<PartnerRevenue> findByBooking_Id(Long bookingId);

    /**
     * Tìm bản ghi doanh thu của một Partner cho một Booking.
     *
     * <p>Dùng để bảo đảm "một Booking — một nguồn doanh thu hợp lệ" cho MỖI Partner:
     * ghi nhận doanh thu là idempotent (cập nhật bản ghi sẵn có thay vì tạo mới).
     */
    @Query("SELECT r FROM PartnerRevenue r WHERE r.booking.id = :bookingId AND r.partner.id = :partnerId")
    Optional<PartnerRevenue> findByBooking_IdAndPartner_Id(@Param("bookingId") Long bookingId,
                                                          @Param("partnerId") Long partnerId);

    Optional<PartnerRevenue> findByPayment_Id(Long paymentId);

    boolean existsByBooking_Id(Long bookingId);

    boolean existsByPayment_Id(Long paymentId);

    Page<PartnerRevenue> findByPartner_IdOrderByCreatedAtDesc(Long partnerId, Pageable pageable);

    List<PartnerRevenue> findByPartner_IdAndStatus(Long partnerId, PartnerRevenueStatus status);

    List<PartnerRevenue> findByStatus(PartnerRevenueStatus status);

    Page<PartnerRevenue> findByStatus(PartnerRevenueStatus status, Pageable pageable);

    List<PartnerRevenue> findByRevenuePeriodAndStatus(String revenuePeriod, PartnerRevenueStatus status);

    /**
     * Các khoản doanh thu của một Partner CHƯA được tất toán và CHƯA thuộc đợt tất toán
     * nào đang xử lý — dùng để lọc ứng viên tất toán (bao gồm cả khoản đang
     * {@code PENDING} vì lý do "kỳ doanh thu chưa kết thúc", khoản này sẽ đủ điều kiện
     * khi kỳ đóng lại và cần được xét lại).
     */
    @Query("""
            SELECT r FROM PartnerRevenue r
            WHERE r.partner.id = :partnerId
              AND r.status <> com.journeygo.modules.partnerrevenue.entity.enums.PartnerRevenueStatus.SETTLED
              AND r.status <> com.journeygo.modules.partnerrevenue.entity.enums.PartnerRevenueStatus.IN_SETTLEMENT
            """)
    List<PartnerRevenue> findUnsettledByPartner(@Param("partnerId") Long partnerId);

    /**
     * Các khoản doanh thu đủ điều kiện của một Partner, chưa thuộc Settlement nào đang xử lý
     * hoặc đã duyệt — dùng để lọc ứng viên tất toán.
     */
    @Query("""
            SELECT r FROM PartnerRevenue r
            WHERE r.partner.id = :partnerId
              AND r.status = com.journeygo.modules.partnerrevenue.entity.enums.PartnerRevenueStatus.ELIGIBLE
            """)
    List<PartnerRevenue> findEligibleByPartner(@Param("partnerId") Long partnerId);

    /**
     * Tất cả khoản doanh thu của một Partner theo kỳ (bất kể trạng thái) — dùng để báo cáo
     * doanh thu chuyển tiếp giữa các kỳ.
     */
    @Query("""
            SELECT r FROM PartnerRevenue r
            WHERE r.partner.id = :partnerId
              AND r.revenuePeriod = :period
            """)
    List<PartnerRevenue> findByPartnerAndPeriod(@Param("partnerId") Long partnerId,
                                                @Param("period") String period);

    /**
     * Lấy PartnerRevenue kèm khóa pessimistic write — dùng khi chuyển trạng thái
     * sang IN_SETTLEMENT / SETTLED để tránh hai Admin cùng chọn một khoản doanh thu.
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM PartnerRevenue r WHERE r.id = :id")
    Optional<PartnerRevenue> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            SELECT r FROM PartnerRevenue r
            WHERE r.settlementId = :settlementId
            """)
    List<PartnerRevenue> findBySettlementId(@Param("settlementId") Long settlementId);
}
