package com.journeygo.modules.partnerprofileupdate.entity;

import com.journeygo.modules.partnerprofileupdate.entity.enums.PartnerProfileUpdateStatus;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Yêu cầu đổi thông tin đối tác ("Yêu cầu chỉnh sửa thông tin").
 *
 * <p>Đối tác bấm "Yêu cầu chỉnh sửa thông tin" ở tab <b>Thông tin đối tác</b> ⇒ hệ thống tạo
 * 1 bản ghi ở trạng thái {@link PartnerProfileUpdateStatus#PENDING} và gửi sang Dashboard Admin.
 *
 * <p>Trong lúc chờ duyệt, đối tác vẫn hoạt động bình thường với thông tin cũ; khóa tạo yêu cầu mới.
 *
 * <p>Khi Admin duyệt ⇒ thông tin mới ({@code newData}) được ghi đè vào hồ sơ chính thức
 * (đơn đăng ký đã duyệt + tài khoản User). Khi Admin từ chối ⇒ hồ sơ cũ giữ nguyên,
 * lý do từ chối hiển thị cho đối tác.
 */
@Entity
@Table(name = "partner_profile_update_requests", indexes = {
        @Index(name = "idx_partner_profile_update_requests_partner",
                columnList = "partner_user_id, created_at"),
        @Index(name = "idx_partner_profile_update_requests_status",
                columnList = "status, submitted_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartnerProfileUpdateRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Đối tác gửi yêu cầu. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "partner_user_id", nullable = false)
    private User partner;

    /** Đơn đăng ký gốc — nguồn dữ liệu của hồ sơ chính thức. */
    @Column(name = "application_id")
    private Long applicationId;

    /** Hồ sơ đối tác (provider_profiles). */
    @Column(name = "provider_profile_id")
    private Long providerProfileId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PartnerProfileUpdateStatus status = PartnerProfileUpdateStatus.PENDING;

    /** JSON: thông tin hiện tại (trước khi đối tác sửa). */
    @Column(name = "old_data", columnDefinition = "TEXT")
    private String oldData;

    /** JSON: thông tin đề xuất mới. */
    @Column(name = "new_data", columnDefinition = "TEXT")
    private String newData;

    /** JSON: danh sách key trường thực sự thay đổi. */
    @Column(name = "changed_fields", columnDefinition = "TEXT")
    private String changedFields;

    /** Lý do từ chối (bắt buộc khi REJECTED). */
    @Column(columnDefinition = "TEXT")
    private String reason;

    /** Ghi chú của đối tác kèm theo yêu cầu. */
    @Column(name = "partner_note", columnDefinition = "TEXT")
    private String partnerNote;

    /** Ghi chú của Admin khi xử lý. */
    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    /** Admin xử lý. */
    @Column(name = "reviewer_id")
    private Long reviewerId;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.submittedAt == null) {
            this.submittedAt = Instant.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
