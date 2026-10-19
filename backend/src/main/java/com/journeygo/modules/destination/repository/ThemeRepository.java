package com.journeygo.modules.destination.repository;

import com.journeygo.modules.destination.entity.Theme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ThemeRepository extends JpaRepository<Theme, Long> {

    List<Theme> findByDeletedFalse();

    List<Theme> findByDeletedTrue();

    Optional<Theme> findByIdAndDeletedFalse(Long id);

    Optional<Theme> findByIdAndDeletedTrue(Long id);

    Optional<Theme> findBySlugAndDeletedFalse(String slug);

    boolean existsByNameAndDeletedFalse(String name);

    boolean existsBySlugAndDeletedFalse(String slug);

    boolean existsByNameAndDeletedFalseAndIdNot(String name, Long id);

    boolean existsBySlugAndDeletedFalseAndIdNot(String slug, Long id);

    List<Theme> findAllByIdInAndDeletedFalse(Collection<Long> ids);
}
