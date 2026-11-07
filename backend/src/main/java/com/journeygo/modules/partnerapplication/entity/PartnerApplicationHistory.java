package com.journeygo.modules.partnerapplication.entity;

import com.journeygo.modules.partnerapplication.entity.enums.PartnerApplicationAction;
import com.journeygo.modules.partnerapplication.entity.enums.PartnerApplicationStatus;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Lịch sử kiểm duyệt đơn đăng ký đối tác.
 *
 * <p>Đặc tả yêu cầu lưu lại cho mỗi lần duyệt / từ chối / yêu cầu bổ sung:
 * <ul>
 *   <li>Admin thực hiện.</li>
 *   <li>Thời gian thực hiện.</li>
 *   <li>Trạng thái trước và sau.</li>
 *   <li>Lý do hoặc ghi chú.</li>
 * </ul>
 */
@Entity
@Table(name = "partner_application_histories", indexes = {
        @Index(name = "idx_partner_app_histories_app", columnList = "application_id, created_at"),
        @Index(name = "idx_partner_app_histories_actor", columnList = "actor_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartnerApplicationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    private PartnerApplication application;

    /** Admin thực hiện (null khi chính người đăng ký gửi đơn). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PartnerApplicationAction action;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_before", length = 20)
    private PartnerApplicationStatus statusBefore;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_after", length = 20)
    private PartnerApplicationStatus statusAfter;

    /** Lý do từ chối / ghi chú. */
    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
