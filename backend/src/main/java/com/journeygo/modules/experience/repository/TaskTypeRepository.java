package com.journeygo.modules.experience.repository;

import com.journeygo.modules.experience.entity.TaskType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TaskTypeRepository extends JpaRepository<TaskType, Long> {

    Optional<TaskType> findByCode(String code);

    boolean existsByCode(String code);
}