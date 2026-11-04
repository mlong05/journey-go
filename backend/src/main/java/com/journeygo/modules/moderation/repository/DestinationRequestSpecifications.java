package com.journeygo.modules.moderation.repository;

import com.journeygo.modules.moderation.entity.PartnerDestinationRequest;
import com.journeygo.modules.moderation.entity.enums.DestinationRequestStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Specifications cho PartnerDestinationRequest — dùng Criteria API.
 * Tránh hoàn toàn lỗi "function lower(bytea) does not exist" của PostgreSQL.
 */
public final class DestinationRequestSpecifications {

    private DestinationRequestSpecifications() {}

    public static Specification<PartnerDestinationRequest> filter(
            Long partnerId,
            Long assignedCpId,
            DestinationRequestStatus status,
            String search
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (partnerId != null) {
                predicates.add(cb.equal(root.get("partner").get("id"), partnerId));
            }

            if (assignedCpId != null) {
                predicates.add(cb.equal(root.get("assignedCp").get("id"), assignedCpId));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate nameLike = cb.like(cb.lower(root.get("destinationName")), pattern);
                Predicate locationLike = cb.like(cb.lower(root.get("location")), pattern);
                Predicate addressLike = cb.like(cb.lower(root.get("address")), pattern);
                predicates.add(cb.or(nameLike, locationLike, addressLike));
            }

            return predicates.isEmpty()
                    ? cb.conjunction()
                    : cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
