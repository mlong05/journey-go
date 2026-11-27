package com.journeygo.modules.audit.repository;

import com.journeygo.modules.audit.entity.SystemAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SystemAuditLogRepository extends JpaRepository<SystemAuditLog, Long>,
        JpaSpecificationExecutor<SystemAuditLog> {

    Page<SystemAuditLog> findByActor_IdOrderByCreatedAtDesc(Long actorId, Pageable pageable);
}
