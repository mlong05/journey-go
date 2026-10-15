package com.journeygo.modules.experience.repository;

import com.journeygo.modules.experience.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {

    List<Question> findByTaskIdOrderBySequenceOrderAsc(Long taskId);

    /**
     * Load Question cùng Task → Experience → createdBy trong 1 query.
     * Dùng cho ownership check — tránh LazyInitException.
     */
    @Query("""
            SELECT q FROM Question q
            JOIN FETCH q.task t
            JOIN FETCH t.experience e
            JOIN FETCH e.createdBy
            WHERE q.id = :id
            """)
    Optional<Question> findByIdWithOwner(@Param("id") Long id);
}