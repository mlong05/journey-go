package com.journeygo.modules.destination.repository;

import com.journeygo.modules.destination.entity.Region;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RegionRepository extends JpaRepository<Region, Long> {

    List<Region> findByDeletedFalse();

    List<Region> findByDeletedTrue();

    Optional<Region> findByIdAndDeletedFalse(Long id);

    Optional<Region> findByIdAndDeletedTrue(Long id);

    Optional<Region> findBySlugAndDeletedFalse(String slug);

    boolean existsByNameAndDeletedFalse(String name);

    boolean existsBySlugAndDeletedFalse(String slug);

    boolean existsByNameAndDeletedFalseAndIdNot(String name, Long id);

    boolean existsBySlugAndDeletedFalseAndIdNot(String slug, Long id);
}
