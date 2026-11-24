package com.journeygo.modules.user.repository;

import com.journeygo.modules.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository
        extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    /**
     * Tài khoản ADMIN đầu tiên trong hệ thống (theo id tăng dần).
     *
     * <p>Dùng làm "người tạo" cho các đợt tất toán TỰ ĐỘNG (scheduler) — đợt vẫn do
     * Admin thật sự xem xét & duyệt, nhưng cần một tài khoản hợp lệ để ghi audit.
     */
    Optional<User> findFirstByRoleNameOrderByIdAsc(String roleName);

    /**
     * Tìm kiếm người dùng theo từ khóa / role / active.
     *
     * Lưu ý: dùng JpaSpecificationExecutor (xem {@link UserSpecifications})
     * thay vì @Query JPQL/native — tránh lỗi "function lower(bytea) does not exist"
     * và "could not determine data type of parameter" trên PostgreSQL.
     */
    default org.springframework.data.domain.Page<User> searchUsers(
            String keyword,
            com.journeygo.modules.user.entity.Role role,
            Boolean active,
            org.springframework.data.domain.Pageable pageable
    ) {
        return findAll(
                UserSpecifications.searchUsers(keyword, role, active),
                pageable
        );
    }
}
