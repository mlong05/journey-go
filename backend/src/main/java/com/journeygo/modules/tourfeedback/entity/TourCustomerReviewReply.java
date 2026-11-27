package com.journeygo.modules.tourfeedback.entity;

import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Phản hồi của đối tác lên một đánh giá tour — PHẢI qua kiểm duyệt.
 *
 * <p>Đối tác viết phản hồi ⇒ trạng thái {@link Status#PENDING} (CHƯA hiển thị công khai).
 * Kiểm duyệt viên duyệt ⇒ {@link Status#APPROVED} (hiển thị), từ chối ⇒
 * {@link Status#REJECTED} (không hiển thị, đối tác có thể viết lại).
 */
@Entity
@Table(name = "tour_customer_review_replies", indexes = {
        @Index(name = "idx_review_replies_review", columnList = "review_id, created_at"),
        @Index(name = "idx_review_replies_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourCustomerReviewReply {

    /** Trạng thái kiểm duyệt của phản hồi. */
    public enum Status {
        /** Chờ kiểm duyệt — chưa hiển thị công khai. */
        PENDING,
        /** Đã duyệt — hiển thị công khai. */
        APPROVED,
        /** Bị từ chối — không hiển thị. */
        REJECTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "review_id", nullable = false)
    private TourCustomerReview review;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.PENDING;

    /** Đối tác viết phản hồi. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;

    @Column(name = "author_name", length = 150)
    private String authorName;

    /** Kiểm duyệt viên xử lý. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "moderator_id")
    private User moderator;

    @Column(name = "moderator_name", length = 150)
    private String moderatorName;

    @Column(name = "decision_reason", length = 500)
    private String decisionReason;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
