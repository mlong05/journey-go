package com.journeygo.modules.destination.repository;

import com.journeygo.modules.destination.entity.Destination;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DestinationRepository extends JpaRepository<Destination, Long> {

    List<Destination> findByDeletedFalse();

    List<Destination> findByDeletedTrue();

    List<Destination> findByApprovedAndDeletedFalse(boolean approved);

    Optional<Destination> findByIdAndDeletedFalse(Long id);

    Optional<Destination> findByIdAndDeletedTrue(Long id);

    boolean existsByNameAndAddressAndDeletedFalse(String name, String address);

    boolean existsByLatitudeAndLongitudeAndDeletedFalse(java.math.BigDecimal latitude, java.math.BigDecimal longitude);

    boolean existsByLatitudeAndLongitudeAndDeletedFalseAndIdNot(java.math.BigDecimal latitude, java.math.BigDecimal longitude, Long id);
}
