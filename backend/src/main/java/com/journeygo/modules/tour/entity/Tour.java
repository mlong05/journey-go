package com.journeygo.modules.tour.entity;

import com.journeygo.modules.destination.entity.Region;
import com.journeygo.modules.destination.entity.Theme;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tours")
@SQLRestriction("deleted = false")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Tour {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long tourId;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private TourType tourType = TourType.OTHER;

    @Column(nullable = false)
    private int durationDays;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    /** Administrative approval flag (mirrors status for legacy compatibility). */
    @Column(nullable = false)
    @Builder.Default
    private boolean approved = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30, columnDefinition = "varchar(30) default 'DRAFT'")
    @Builder.Default
    private TourStatus status = TourStatus.DRAFT;

    /** Populated by admin/moderator when rejecting the tour. */
    /** Ảnh bìa riêng của tour (URL https tải lên qua /upload/image); trống thì dùng ảnh điểm đến đầu tiên */
    @Column(name = "cover_image_url", length = 1000)
    private String coverImageUrl;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(nullable = false)
    @Builder.Default
    private boolean deleted = false;

    /** Timestamp set when the tour is soft-deleted. Null while active. */
    @Column(name = "deleted_at")
    private Instant deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    /** Ordered list of destinations that make up this tour (luồng cũ — dùng danh mục điểm đến chung). */
    @OneToMany(mappedBy = "tour", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<TourDestination> tourDestinations = new ArrayList<>();

    // ── Luồng tạo tour 5 bước ────────────────────────────────────────────────
    // Tour tạo theo luồng mới có tourFormat != null. Các cột cũ (tourType, startDate, endDate,
    // approved) giữ lại cho tour cũ; `approved` vẫn được đồng bộ để API công khai lọc tour đang bán.

    /** Bước 1 — hình thức tour: trong ngày / nhiều ngày. */
    @Enumerated(EnumType.STRING)
    @Column(name = "tour_format", length = 20)
    private TourFormat tourFormat;

    /** Bước 1 — thời lượng tour trong ngày, tính bằng phút. */
    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    /** Bước 1 — số đêm của tour nhiều ngày (không lớn hơn số ngày). */
    @Column(name = "duration_nights")
    private Integer durationNights;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "theme_id")
    private Theme theme;

    /** Câu đầu tiên hiển thị trên thẻ tour ở trang tìm kiếm. */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Bước 1 — Lịch trình theo ngày (dạng chữ, không gắn với điểm đến). */
    @ElementCollection
    @CollectionTable(name = "tour_itinerary_days", joinColumns = @JoinColumn(name = "tour_id"))
    @OrderColumn(name = "position")
    @Builder.Default
    private List<TourItineraryDay> itinerary = new ArrayList<>();

    // ── Bước 1 — "Những thông tin cần lưu ý" (không bắt buộc) ─────────────────
    /** Giá tour bao gồm. */
    @Column(name = "price_includes", columnDefinition = "TEXT")
    private String priceIncludes;

    /** Giá tour không bao gồm. */
    @Column(name = "price_excludes", columnDefinition = "TEXT")
    private String priceExcludes;

    /** Trường hợp bất khả kháng. */
    @Column(name = "force_majeure", columnDefinition = "TEXT")
    private String forceMajeure;

    /** Liên hệ. */
    @Column(name = "contact_info", columnDefinition = "TEXT")
    private String contactInfo;

    /** Bước 1 — 3 đến 5 điểm nổi bật. */
    @ElementCollection
    @CollectionTable(name = "tour_highlights", joinColumns = @JoinColumn(name = "tour_id"))
    @OrderColumn(name = "position")
    @Column(name = "content", length = 300, nullable = false)
    @Builder.Default
    private List<String> highlights = new ArrayList<>();

    /** Bước 1 — ít nhất 5 ảnh; ảnh bìa (coverImageUrl) phải nằm trong danh sách này. */
    @ElementCollection
    @CollectionTable(name = "tour_images", joinColumns = @JoinColumn(name = "tour_id"))
    @OrderColumn(name = "position")
    @Column(name = "image_url", length = 1000, nullable = false)
    @Builder.Default
    private List<String> images = new ArrayList<>();

    /** Bước 2 — chính sách hủy do đối tác tự nhập. */
    @Column(name = "cancellation_policy", columnDefinition = "TEXT")
    private String cancellationPolicy;

    /** Bước 2 — số chỗ tối đa mỗi slot. */
    @Column(name = "max_guests_per_slot")
    private Integer maxGuestsPerSlot;

    /** Bước 2 — bảng giá theo 4 loại khách. */
    @OneToMany(mappedBy = "tour", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("guestType ASC")
    @Builder.Default
    private List<TourPrice> prices = new ArrayList<>();

    /** Bước 3 — điểm đến riêng của tour. */
    @OneToMany(mappedBy = "tour", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<TourStop> stops = new ArrayList<>();

    /** Bước 4 — các ngày khởi hành được chọn trên lịch. */
    @OneToMany(mappedBy = "tour", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("departureDate ASC")
    @Builder.Default
    private List<TourDepartureDate> departureDates = new ArrayList<>();

    /** Bước 5 — đối tác cam kết quyền sử dụng hình ảnh, nội dung. */
    @Column(name = "content_rights_confirmed", nullable = false)
    @Builder.Default
    private boolean contentRightsConfirmed = false;

    /** Tăng mỗi lần gửi duyệt; lưu vào lịch sử kiểm duyệt. */
    @Column(name = "version_number", nullable = false)
    @Builder.Default
    private int versionNumber = 1;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    /** Tour tạo theo luồng 5 bước (khác tour cũ chọn điểm đến từ danh mục chung). */
    public boolean isWizardTour() {
        return tourFormat != null;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.status == null) {
            this.status = TourStatus.DRAFT;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ── Soft-delete helpers ───────────────────────────────────────────────────

    /** Soft-delete: flag as deleted and stamp the deletion time. */
    public void softDelete() {
        this.deleted = true;
        this.deletedAt = Instant.now();
    }

    /** Restore: clear the deleted flag and the deletion timestamp. */
    public void softRestore() {
        this.deleted = false;
        this.deletedAt = null;
    }

    /** Calculate the total number of destinations in this tour. */
    public int getDestinationCount() {
        return tourDestinations == null ? 0 : tourDestinations.size();
    }
}
