package com.journeygo.modules.experience.repository;

import com.journeygo.modules.experience.entity.Task;
import com.journeygo.modules.experience.entity.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByExperienceIdOrderBySequenceOrderAsc(Long experienceId);

    List<Task> findByExperienceIdAndStatus(Long experienceId, TaskStatus status);

    long countByExperienceIdAndStatus(Long experienceId, TaskStatus status);

    /** Đếm tất cả Task của 1 Experience (dùng cho response listing — tránh N+1). */
    long countByExperienceId(Long experienceId);

    boolean existsByExperienceIdAndSequenceOrder(Long experienceId, Integer sequenceOrder);

    boolean existsByExperienceIdAndSequenceOrderAndIdNot(Long experienceId, Integer sequenceOrder, Long id);

    /**
     * Load Task cùng Experience và createdBy trong 1 query duy nhất.
     * Dùng cho ownership check trong {@code ExperienceSecurity} — tránh LazyInitException.
     */
    @Query("""
            SELECT t FROM Task t
            JOIN FETCH t.experience e
            JOIN FETCH e.createdBy
            WHERE t.id = :id
            """)
    Optional<Task> findByIdWithOwner(@Param("id") Long id);
}
