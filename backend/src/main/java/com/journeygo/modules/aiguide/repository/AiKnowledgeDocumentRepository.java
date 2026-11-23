package com.journeygo.modules.aiguide.repository;

import com.journeygo.modules.aiguide.entity.AiDocumentScope;
import com.journeygo.modules.aiguide.entity.AiDocumentType;
import com.journeygo.modules.aiguide.entity.AiKnowledgeDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiKnowledgeDocumentRepository extends JpaRepository<AiKnowledgeDocument, Long> {

    @Query("""
            SELECT d FROM AiKnowledgeDocument d
            WHERE (:docType IS NULL OR d.docType = :docType)
              AND (:scope IS NULL OR d.scope = :scope)
              AND (:destinationId IS NULL OR d.destinationId = :destinationId)
              AND (:active IS NULL OR d.active = :active)
            ORDER BY d.updatedAt DESC
            """)
    Page<AiKnowledgeDocument> findFiltered(
            @Param("docType") AiDocumentType docType,
            @Param("scope") AiDocumentScope scope,
            @Param("destinationId") Long destinationId,
            @Param("active") Boolean active,
            Pageable pageable
    );

    @Query("""
            SELECT d FROM AiKnowledgeDocument d
            WHERE d.docType = com.journeygo.modules.aiguide.entity.AiDocumentType.AI_RULE
              AND d.active = true
              AND (d.scope = com.journeygo.modules.aiguide.entity.AiDocumentScope.GLOBAL
                   OR (:destinationId IS NOT NULL AND d.destinationId = :destinationId))
            ORDER BY CASE WHEN d.scope = com.journeygo.modules.aiguide.entity.AiDocumentScope.GLOBAL THEN 0 ELSE 1 END,
                     d.updatedAt DESC
            """)
    List<AiKnowledgeDocument> findActiveRulesForChat(@Param("destinationId") Long destinationId);

    List<AiKnowledgeDocument> findByActiveTrueAndDocTypeNot(AiDocumentType docType);

    long countByActiveTrue();

    long countByDocTypeAndActiveTrue(AiDocumentType docType);
}
