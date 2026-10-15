package com.journeygo.modules.experience.repository;

import com.journeygo.modules.experience.entity.UnlockCondition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UnlockConditionRepository extends JpaRepository<UnlockCondition, Long> {

    Optional<UnlockCondition> findByTaskId(Long taskId);
}
