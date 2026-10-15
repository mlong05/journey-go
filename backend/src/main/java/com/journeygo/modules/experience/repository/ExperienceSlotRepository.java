package com.journeygo.modules.experience.repository;

import com.journeygo.modules.experience.entity.ExperienceSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repository ExperienceSlot — quota (theo TOUR) cho Experience theo ngày.
 */
@Repository
public interface ExperienceSlotRepository extends JpaRepository<ExperienceSlot, Long> {

    List<ExperienceSlot> findByExperienceIdOrderBySlotDateAsc(Long experienceId);

    Optional<ExperienceSlot> findByExperienceIdAndSlotDate(Long experienceId, LocalDate slotDate);

    /**
     * Load Slot cùng Experience và createdBy trong 1 query.
     * Dùng cho ownership check — tránh LazyInitException.
     */
    @Query("""
            SELECT s FROM ExperienceSlot s
            JOIN FETCH s.experience e
            JOIN FETCH e.createdBy
            WHERE s.id = :id
            """)
    Optional<ExperienceSlot> findByIdWithOwner(@Param("id") Long id);
}