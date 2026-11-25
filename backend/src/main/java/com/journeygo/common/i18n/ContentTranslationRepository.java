package com.journeygo.common.i18n;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ContentTranslationRepository extends JpaRepository<ContentTranslation, Long> {
    Optional<ContentTranslation> findByEntityTypeAndEntityIdAndLocale(String entityType, Long entityId, String locale);

    List<ContentTranslation> findByEntityTypeAndLocaleAndEntityIdIn(
            String entityType, String locale, Collection<Long> entityIds);
}
