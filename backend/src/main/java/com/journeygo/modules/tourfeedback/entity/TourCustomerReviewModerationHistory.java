package com.journeygo.modules.tourfeedback.entity;

import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Lịch sử kiểm duyệt một đánh giá tour — append-only.
 *
 * <p>Mỗi lần kiểm duyệt viên (ẩn / khôi phục) đều ghi một dòng ⇒ có thể tra cứu
 * "ai đã ẩn/khôi phục đánh giá này, khi nào, vì lý do gì" thay vì chỉ nhìn được
 * trạng thái hiện tại.
 */
@Entity
@Table(name = "tour_customer_review_moderation_history", indexes = {
        @Index(name = "idx_review_mod_history_review", columnList = "review_id, created_at"),
        @Index(name = "idx_review_mod_history_actor", columnList = "actor_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourCustomerReviewModerationHistory {

    /** Thao tác kiểm duyệt. */
    public enum Action {
        /** Ẩn đánh giá (vi phạm). */
        HIDDEN,
        /** Khôi phục đánh giá đã bị ẩn. */
        RESTORED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "review_id", nullable = false)
    private TourCustomerReview review;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 30)
    private Action action;

    /** Trạng thái hiển thị trước thao tác. */
    @Column(name = "from_status", length = 30)
    private String fromStatus;

    /** Trạng thái hiển thị sau thao tác. */
    @Column(name = "to_status", length = 30)
    private String toStatus;

    /** Kiểm duyệt viên / admin thực hiện. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    /** Tên người thực hiện — chụp lại tại thời điểm thao tác. */
    @Column(name = "actor_name", length = 150)
    private String actorName;

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
