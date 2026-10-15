package com.journeygo.modules.experience.repository;

import com.journeygo.modules.experience.entity.Answer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AnswerRepository extends JpaRepository<Answer, Long> {

    List<Answer> findByQuestionIdOrderBySequenceOrderAsc(Long questionId);

    boolean existsByQuestionIdAndIsCorrectTrue(Long questionId);


    @Query("""
            SELECT a FROM Answer a
            JOIN FETCH a.question q
            JOIN FETCH q.task t
            JOIN FETCH t.experience e
            JOIN FETCH e.createdBy
            WHERE a.id = :id
            """)
    Optional<Answer> findByIdWithOwner(@Param("id") Long id);
}
