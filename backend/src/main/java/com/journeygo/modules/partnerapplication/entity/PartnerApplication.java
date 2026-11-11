package com.journeygo.modules.partnerapplication.entity;

import com.journeygo.modules.partnerapplication.entity.enums.PartnerApplicationStatus;
import com.journeygo.modules.partnerapplication.entity.enums.PartnerType;
import com.journeygo.modules.partnerapplication.entity.enums.RepresentativePosition;
import com.journeygo.modules.partnerapplication.entity.enums.TravelScope;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Đơn đăng ký trở thành đối tác của JourneyGo.
 *
 * <p>Cấu trúc bám sát 4 giai đoạn trong đặc tả:
 * <ol>
 *   <li><b>Thông tin người đại diện</b> — email (đã verify qua OTP), số điện thoại, họ tên, chức vụ.</li>
 *   <li><b>Xác minh hồ sơ doanh nghiệp</b> — tên doanh nghiệp, loại hình, mã số thuế,
 *       thông tin đăng ký kinh doanh, giấy phép hoạt động, địa chỉ trụ sở, phạm vi hoạt động.</li>
 *   <li><b>Thiết lập thanh toán</b> — ngân hàng thụ hưởng, số tài khoản, tên chủ tài khoản.</li>
 *   <li><b>Xác nhận &amp; đồng ý</b> — 3 checkbox bắt buộc.</li>
 * </ol>
 *
 * <p>Đơn được tạo ở trạng thái {@link PartnerApplicationStatus#DRAFT} và có thể lưu dần;
 * chỉ khi bấm "Gửi đơn" mới chạy validation toàn bộ (đặc tả mục "Kiểm tra dữ liệu trước khi gửi đơn").
 */
@Entity
@Table(name = "partner_applications", indexes = {
        @Index(name = "idx_partner_applications_email", columnList = "email"),
        @Index(name = "idx_partner_applications_status", columnList = "status, submitted_at"),
        @Index(name = "idx_partner_applications_applicant", columnList = "applicant_user_id"),
        @Index(name = "idx_partner_applications_business", columnList = "business_name")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartnerApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Giai đoạn 1: Thông tin người đại diện ───────────────────────────────────

    @Column(nullable = false, length = 100)
    private String email;

    /** Email đã được xác minh qua OTP 6 chữ số. */
    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    @Column(length = 20)
    private String phone;

    @Column(name = "representative_name", length = 150)
    private String representativeName;

    @Enumerated(EnumType.STRING)
    @Column(name = "representative_position", length = 50)
    private RepresentativePosition representativePosition;

    // ── Giai đoạn 2: Xác minh hồ sơ doanh nghiệp ───────────────────────────────

    @Column(name = "business_name", length = 200)
    private String businessName;

    @Enumerated(EnumType.STRING)
    @Column(name = "partner_type", length = 30)
    private PartnerType partnerType;

    /** Chỉ dùng khi {@link #partnerType} = TRAVEL_AGENCY. */
    @Enumerated(EnumType.STRING)
    @Column(name = "travel_scope", length = 20)
    private TravelScope travelScope;

    @Column(name = "tax_code", length = 20)
    private String taxCode;

    @Column(name = "business_registration_info", columnDefinition = "TEXT")
    private String businessRegistrationInfo;

    /** Giấy phép hoạt động — bắt buộc với cả hai loại hình đối tác. */
    @Column(name = "operation_license_url", columnDefinition = "TEXT")
    private String operationLicenseUrl;

    /** Giấy phép lữ hành — chỉ bắt buộc với Công ty Lữ hành. */
    @Column(name = "travel_license_url", columnDefinition = "TEXT")
    private String travelLicenseUrl;

    /** Giấy ký quỹ — chỉ bắt buộc với Công ty Lữ hành. */
    @Column(name = "signature_document_url", columnDefinition = "TEXT")
    private String signatureDocumentUrl;

    /** Giấy ĐK kinh doanh / GPKD / Hộ kinh doanh. */
    @Column(name = "business_registration_url", columnDefinition = "TEXT")
    private String businessRegistrationUrl;

    /** Tỉnh / Thành phố — theo mô hình hành chính 2 cấp mới (sau sáp nhập). */
    @Column(length = 100)
    private String province;

    /** Phường / Xã trực thuộc tỉnh (không còn cấp quận/huyện). */
    @Column(length = 100)
    private String ward;

    @Column(name = "address_detail", columnDefinition = "TEXT")
    private String addressDetail;

    @Column(name = "business_scope", columnDefinition = "TEXT")
    private String businessScope;

    // ── Giai đoạn 3: Thiết lập thanh toán ───────────────────────────────────────

    @Column(name = "bank_name", length = 120)
    private String bankName;

    @Column(name = "bank_account_number", length = 50)
    private String bankAccountNumber;

    @Column(name = "bank_account_holder", length = 150)
    private String bankAccountHolder;

    // ── Giai đoạn 4: Xác nhận & đồng ý ──────────────────────────────────────────

    @Column(name = "confirmed_authority", nullable = false)
    @Builder.Default
    private boolean confirmedAuthority = false;

    @Column(name = "agreed_partner_terms", nullable = false)
    @Builder.Default
    private boolean agreedPartnerTerms = false;

    @Column(name = "agreed_privacy_policy", nullable = false)
    @Builder.Default
    private boolean agreedPrivacyPolicy = false;

    // ── Vòng đời đơn ─────────────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PartnerApplicationStatus status = PartnerApplicationStatus.DRAFT;

    /** User đang đăng nhập (null nếu đơn được tạo bởi khách chưa có tài khoản). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applicant_user_id")
    private User applicant;

    /** Admin xử lý gần nhất. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id")
    private User reviewer;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "review_note", columnDefinition = "TEXT")
    private String reviewNote;

    @Column(name = "submitted_at")
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
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
