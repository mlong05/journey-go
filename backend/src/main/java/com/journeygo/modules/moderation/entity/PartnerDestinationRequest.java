package com.journeygo.modules.moderation.entity;

import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.moderation.entity.enums.DestinationRequestStatus;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "destination_requests",
        indexes = {
                @Index(name = "idx_destination_requests_partner", columnList = "partner_id, created_at"),
                @Index(name = "idx_destination_requests_status", columnList = "status, created_at"),
                @Index(name = "idx_destination_requests_assigned_cp", columnList = "assigned_cp_id, status")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartnerDestinationRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Đối tác gửi đề xuất */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "partner_id", nullable = false)
    private User partner;

    /** Tên điểm đến đề xuất (ví dụ: Chùa Thiên Mụ) */
    @Column(name = "destination_name", nullable = false)
    private String destinationName;

    /** Địa điểm/Khu vực (ví dụ: Huế, Việt Nam) */
    @Column(nullable = false)
    private String location;

    /** Địa chỉ chi tiết */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String address;

    /** Giới thiệu sơ bộ về địa điểm */
    @Column(columnDefinition = "TEXT")
    private String description;

    /** Danh sách URLs hình ảnh (dạng text/JSON/phân cách bởi dấu phẩy) */
    @Column(columnDefinition = "TEXT")
    private String images;

    /** Tài liệu chứng minh thông tin, giấy phép, liên kết hỗ trợ */
    @Column(name = "supporting_documents", columnDefinition = "TEXT")
    private String supportingDocuments;

    /** Tên người liên hệ đại diện đối tác */
    @Column(name = "contact_name", length = 150)
    private String contactName;

    /** Số điện thoại liên hệ */
    @Column(name = "contact_phone", length = 50)
    private String contactPhone;

    /** Email liên hệ */
    @Column(name = "contact_email", length = 150)
    private String contactEmail;

    /** Thông tin liên hệ bổ sung */
    @Column(name = "contact_info", columnDefinition = "TEXT")
    private String contactInfo;

    /** Ghi chú của đối tác khi gửi đề xuất */
    @Column(columnDefinition = "TEXT")
    private String note;

    /** Trạng thái xử lý theo quy trình moderation */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 35)
    @Builder.Default
    private DestinationRequestStatus status = DestinationRequestStatus.SUBMITTED;

    // ── Lần 1: Moderator kiểm tra tính hợp lệ và phù hợp ─────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "moderator_id")
    private User moderator;

    @Column(name = "initial_review_note", columnDefinition = "TEXT")
    private String initialReviewNote;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "rejection_note", columnDefinition = "TEXT")
    private String rejectionNote;

    @Column(name = "initial_reviewed_at")
    private Instant initialReviewedAt;

    // ── Admin phân công Content Provider (CP) ────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by_id")
    private User assignedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_cp_id")
    private User assignedCp;

    @Column(name = "assigned_at")
    private Instant assignedAt;

    @Column(name = "assignment_note", columnDefinition = "TEXT")
    private String assignmentNote;

    // ── Content Provider tạo/liên kết Destination ────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id")
    private Destination destination;

    @Column(name = "content_submitted_at")
    private Instant contentSubmittedAt;

    // ── Lần 2: Moderator kiểm duyệt nội dung hoàn chỉnh ──────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "content_moderator_id")
    private User contentModerator;

    @Column(name = "content_review_note", columnDefinition = "TEXT")
    private String contentReviewNote;

    @Column(name = "content_rejection_reason", columnDefinition = "TEXT")
    private String contentRejectionReason;

    @Column(name = "content_reviewed_at")
    private Instant contentReviewedAt;

    // ── Hoàn tất / Rút request ───────────────────────────────────────────────
    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    @Builder.Default
    private List<DestinationRequestHistory> histories = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (status == null) status = DestinationRequestStatus.SUBMITTED;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
