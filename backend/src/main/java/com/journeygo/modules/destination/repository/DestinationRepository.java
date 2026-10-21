package com.journeygo.modules.destination.repository;

import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.entity.DestinationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface DestinationRepository extends JpaRepository<Destination, Long> {

    // ── Pagination & Sorting queries ─────────────────────────────────────────

    Page<Destination> findByDeletedFalse(Pageable pageable);

    Page<Destination> findByDeletedTrue(Pageable pageable);

    Page<Destination> findByApprovedAndDeletedFalse(boolean approved, Pageable pageable);

    Page<Destination> findByStatusAndDeletedFalse(DestinationStatus status, Pageable pageable);

    Page<Destination> findByRegionIdAndDeletedFalse(Long regionId, Pageable pageable);

    Page<Destination> findByRegionSlugAndDeletedFalse(String regionSlug, Pageable pageable);

    Page<Destination> findByThemesIdAndDeletedFalse(Long themeId, Pageable pageable);

    Page<Destination> findByThemesSlugAndDeletedFalse(String themeSlug, Pageable pageable);

    // ── Non-paged list queries ───────────────────────────────────────────────

    List<Destination> findByDeletedFalse();

    List<Destination> findByDeletedTrue();

    List<Destination> findByApprovedAndDeletedFalse(boolean approved);

    List<Destination> findByStatusAndDeletedFalse(DestinationStatus status);

    List<Destination> findByRegionSlugAndDeletedFalse(String regionSlug);

    List<Destination> findByThemesSlugAndDeletedFalse(String themeSlug);

    // ── Single item queries & Validations ────────────────────────────────────

    Optional<Destination> findByIdAndDeletedFalse(Long id);

    Optional<Destination> findByIdAndDeletedTrue(Long id);

    boolean existsByNameAndAddressAndDeletedFalse(String name, String address);

    boolean existsByLatitudeAndLongitudeAndDeletedFalse(BigDecimal latitude, BigDecimal longitude);

    boolean existsByLatitudeAndLongitudeAndDeletedFalseAndIdNot(BigDecimal latitude, BigDecimal longitude, Long id);
}
