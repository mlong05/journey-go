package com.journeygo.modules.voucher.repository;

import com.journeygo.modules.voucher.entity.Voucher;
import com.journeygo.modules.voucher.entity.enums.VoucherScope;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface VoucherRepository extends JpaRepository<Voucher, Long> {

    /** Khóa dòng voucher (SELECT ... FOR UPDATE) để đảm bảo concurrency an toàn. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Voucher v where v.id = :id")
    Optional<Voucher> findByIdForUpdate(@Param("id") Long id);

    Optional<Voucher> findByCode(String code);

    List<Voucher> findByActiveTrueOrderByPointsRequiredAsc();

    boolean existsByCode(String code);

    List<Voucher> findByVoucherScopeAndActiveTrue(VoucherScope voucherScope);

    List<Voucher> findByPartnerIdAndActiveTrue(Long partnerId);

    @Query("SELECT v FROM Voucher v WHERE v.active = true AND " +
           "(v.startDate IS NULL OR v.startDate <= :now) AND " +
           "(v.endDate IS NULL OR v.endDate >= :now) AND " +
           "(v.voucherScope = 'PLATFORM' OR (v.voucherScope = 'PARTNER' AND v.partner.id = :partnerId))")
    List<Voucher> findApplicableVouchersForTour(@Param("partnerId") Long partnerId, @Param("now") LocalDate now);

    @Query("SELECT v FROM Voucher v WHERE " +
           "(:scope IS NULL OR v.voucherScope = :scope) AND " +
           "(:partnerId IS NULL OR v.partner.id = :partnerId) AND " +
           "(:active IS NULL OR v.active = :active) AND " +
           "(:search IS NULL OR LOWER(v.code) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(v.title) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Voucher> findVouchersWithFilter(
            @Param("scope") VoucherScope scope,
            @Param("partnerId") Long partnerId,
            @Param("active") Boolean active,
            @Param("search") String search,
            Pageable pageable
    );
}
