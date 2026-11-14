package com.journeygo.modules.partnerprofileupdate.entity;

import com.journeygo.modules.partnerprofileupdate.entity.enums.PartnerProfileUpdateAction;
import com.journeygo.modules.partnerprofileupdate.entity.enums.PartnerProfileUpdateStatus;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Lịch sử thay đổi thông tin đối tác.
 *
 * <p>Mỗi lần đối tác gửi yêu cầu / Admin duyệt / Admin từ chối đều ghi 1 dòng — tương tự
 * lịch sử kiểm duyệt đơn đăng ký đối tác.
 */
@Entity
@Table(name = "partner_profile_update_histories", indexes = {
        @Index(name = "idx_partner_profile_update_histories_request",
                columnList = "request_id, created_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartnerProfileUpdateHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private PartnerProfileUpdateRequest request;

    /** Người thực hiện (đối tác khi gửi yêu cầu, Admin khi xử lý). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PartnerProfileUpdateAction action;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_before", length = 20)
    private PartnerProfileUpdateStatus statusBefore;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_after", length = 20)
    private PartnerProfileUpdateStatus statusAfter;

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
