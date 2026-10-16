package com.journeygo.modules.user.repository;

import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE " +
           "(:keyword IS NULL OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           " OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           " OR (u.phone IS NOT NULL AND u.phone LIKE CONCAT('%', :keyword, '%'))) " +
           "AND (:role IS NULL OR u.role = :role) " +
           "AND (:active IS NULL OR u.active = :active)")
    Page<User> searchUsers(
            @Param("keyword") String keyword,
            @Param("role") Role role,
            @Param("active") Boolean active,
            Pageable pageable
    );
}
