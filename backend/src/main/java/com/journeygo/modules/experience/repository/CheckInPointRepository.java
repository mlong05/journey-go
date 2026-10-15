package com.journeygo.modules.experience.repository;

import com.journeygo.modules.experience.entity.CheckInPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CheckInPointRepository extends JpaRepository<CheckInPoint, Long> {

    List<CheckInPoint> findByExperienceIdOrderBySequenceOrderAsc(Long experienceId);

    boolean existsByQrToken(String qrToken);


    long countByExperienceId(Long experienceId);


    @Query("""
            SELECT c FROM CheckInPoint c
            JOIN FETCH c.experience e
            JOIN FETCH e.createdBy
            WHERE c.id = :id
            """)
    Optional<CheckInPoint> findByIdWithOwner(@Param("id") Long id);
}
