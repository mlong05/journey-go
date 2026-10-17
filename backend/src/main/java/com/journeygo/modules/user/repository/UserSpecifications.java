package com.journeygo.modules.user.repository;

import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Specifications cho User — dùng Criteria API an toàn với mọi CSDL.
 * Tránh hoàn toàn lỗi "function lower(bytea) does not exist" /
 * "could not determine data type of parameter" của PostgreSQL
 * vì không dùng native SQL hay ép kiểu thủ công.
 */
public final class UserSpecifications {

    private UserSpecifications() {
    }

    /**
     * Search theo keyword (tìm trong email, fullName, phone) + role + active.
     * Nếu tham số null/rỗng thì bỏ qua điều kiện tương ứng (không thêm predicate).
     */
    public static Specification<User> searchUsers(
            String keyword,
            Role role,
            Boolean active
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (keyword != null && !keyword.trim().isEmpty()) {
                String like = "%" + keyword.trim().toLowerCase() + "%";
                Predicate emailLike = cb.like(cb.lower(root.get("email")), like);
                Predicate nameLike = cb.like(
                        cb.lower(root.get("fullName")),
                        like
                );
                // phone có thể NULL nên dùng COALESCE để tránh lỗi khi so sánh
                Predicate phoneLike = cb.like(
                        cb.lower(cb.coalesce(root.get("phone"), "")),
                        like
                );
                predicates.add(cb.or(emailLike, nameLike, phoneLike));
            }

            if (role != null) {
                predicates.add(cb.equal(root.get("role"), role));
            }

            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }

            return predicates.isEmpty()
                    ? cb.conjunction()
                    : cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
