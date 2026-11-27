package com.journeygo.modules.tourfeedback.entity;

import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Báo cáo của du khách về một đánh giá tour vi phạm (spam, xúc phạm, quảng cáo…).
 *
 * <p>Mỗi người chỉ báo cáo được MỘT lần cho mỗi đánh giá (unique index
 * {@code reporter_id + review_id}).
 */
@Entity
@Table(name = "tour_customer_review_reports", indexes = {
        @Index(name = "idx_review_reports_review", columnList = "review_id"),
        @Index(name = "idx_review_reports_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourCustomerReviewReport {

    /** Trạng thái xử lý báo cáo. */
    public enum Status {
        /** Chờ kiểm duyệt viên xử lý. */
        PENDING,
        /** Đã xử lý (đánh giá đã bị ẩn hoặc đã được làm rõ). */
        RESOLVED,
        /** Báo cáo không có cơ sở — bị bác. */
        DISMISSED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "review_id", nullable = false)
    private TourCustomerReview review;

    /** Người báo cáo (null nếu tài khoản bị xoá sau này). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id")
    private User reporter;

    @Column(name = "reporter_name", length = 150)
    private String reporterName;

    @Column(name = "reason", nullable = false, length = 1000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "resolution", length = 500)
    private String resolution;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handled_by")
    private User handledBy;

    @Column(name = "handled_at")
    private Instant handledAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
