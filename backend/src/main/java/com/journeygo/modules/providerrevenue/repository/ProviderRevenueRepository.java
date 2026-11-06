package com.journeygo.modules.providerrevenue.repository;

import com.journeygo.modules.providerrevenue.entity.ProviderRevenue;
import com.journeygo.modules.providerrevenue.entity.enums.ProviderRevenueStatus;
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
public interface ProviderRevenueRepository extends JpaRepository<ProviderRevenue, Long> {

    /**
     * Tất cả các bản ghi doanh thu của một Booking (mỗi ProviderProfile một bản ghi).
     */
    List<ProviderRevenue> findByBooking_Id(Long bookingId);

    /**
     * Tìm bản ghi doanh thu của một ProviderProfile cho một Booking.
     *
     * <p>Dùng để bảo đảm "một Booking — một nguồn doanh thu hợp lệ" cho MỖI ProviderProfile:
     * ghi nhận doanh thu là idempotent (cập nhật bản ghi sẵn có thay vì tạo mới).
     */
    @Query("SELECT r FROM ProviderRevenue r WHERE r.booking.id = :bookingId AND r.providerProfile.id = :providerProfileId")
    Optional<ProviderRevenue> findByBooking_IdAndProviderProfile_Id(@Param("bookingId") Long bookingId,
                                                          @Param("providerProfileId") Long providerProfileId);

    Optional<ProviderRevenue> findByPayment_Id(Long paymentId);

    boolean existsByBooking_Id(Long bookingId);

    boolean existsByPayment_Id(Long paymentId);

    Page<ProviderRevenue> findByProviderProfile_IdOrderByCreatedAtDesc(Long providerProfileId, Pageable pageable);

    List<ProviderRevenue> findByProviderProfile_IdAndStatus(Long providerProfileId, ProviderRevenueStatus status);

    List<ProviderRevenue> findByStatus(ProviderRevenueStatus status);

    Page<ProviderRevenue> findByStatus(ProviderRevenueStatus status, Pageable pageable);

    List<ProviderRevenue> findByRevenuePeriodAndStatus(String revenuePeriod, ProviderRevenueStatus status);

    /**
     * Các khoản doanh thu của một ProviderProfile CHƯA được tất toán và CHƯA thuộc đợt tất toán
     * nào đang xử lý — dùng để lọc ứng viên tất toán (bao gồm cả khoản đang
     * {@code PENDING} vì lý do "kỳ doanh thu chưa kết thúc", khoản này sẽ đủ điều kiện
     * khi kỳ đóng lại và cần được xét lại).
     */
    @Query("""
            SELECT r FROM ProviderRevenue r
            WHERE r.providerProfile.id = :providerProfileId
              AND r.status <> com.journeygo.modules.providerrevenue.entity.enums.ProviderRevenueStatus.SETTLED
              AND r.status <> com.journeygo.modules.providerrevenue.entity.enums.ProviderRevenueStatus.IN_SETTLEMENT
            """)
    List<ProviderRevenue> findUnsettledByProviderProfile(@Param("providerProfileId") Long providerProfileId);

    /**
     * Các khoản doanh thu đủ điều kiện của một ProviderProfile, chưa thuộc Settlement nào đang xử lý
     * hoặc đã duyệt — dùng để lọc ứng viên tất toán.
     */
    @Query("""
            SELECT r FROM ProviderRevenue r
            WHERE r.providerProfile.id = :providerProfileId
              AND r.status = com.journeygo.modules.providerrevenue.entity.enums.ProviderRevenueStatus.ELIGIBLE
            """)
    List<ProviderRevenue> findEligibleByProviderProfile(@Param("providerProfileId") Long providerProfileId);

    /**
     * Tất cả khoản doanh thu của một ProviderProfile theo kỳ (bất kể trạng thái) — dùng để báo cáo
     * doanh thu chuyển tiếp giữa các kỳ.
     */
    @Query("""
            SELECT r FROM ProviderRevenue r
            WHERE r.providerProfile.id = :providerProfileId
              AND r.revenuePeriod = :period
            """)
    List<ProviderRevenue> findByProviderProfileAndPeriod(@Param("providerProfileId") Long providerProfileId,
                                                @Param("period") String period);

    /**
     * Lấy ProviderRevenue kèm khóa pessimistic write — dùng khi chuyển trạng thái
     * sang IN_SETTLEMENT / SETTLED để tránh hai Admin cùng chọn một khoản doanh thu.
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM ProviderRevenue r WHERE r.id = :id")
    Optional<ProviderRevenue> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            SELECT r FROM ProviderRevenue r
            WHERE r.settlementId = :settlementId
            """)
    List<ProviderRevenue> findBySettlementId(@Param("settlementId") Long settlementId);
}
