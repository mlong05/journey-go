package com.journeygo.modules.tour.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Bước 3 — một điểm đến riêng của tour (không dùng danh mục điểm đến chung).
 * Các trường để trống được khi lưu nháp; kiểm tra đầy đủ lúc gửi duyệt.
 */
@Entity
@Table(name = "tour_stops", indexes = @Index(name = "idx_tour_stops_tour_seq", columnList = "tour_id, sequence_order"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tour_id", nullable = false)
    private Tour tour;

    /** Thứ tự theo kéo thả, bắt đầu từ 1. */
    @Column(name = "sequence_order", nullable = false)
    private int sequenceOrder;

    @Column(name = "name", length = 200)
    private String name;

    /**
     * Vị trí check-in trạm (nên đặt tại cổng / lối vào chính). Du khách phải đứng trong
     * {@link #checkInRadiusMeters} quanh điểm này mới check-in được và mở khoá trải nghiệm.
     */
    @Column(name = "latitude", precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 10, scale = 7)
    private BigDecimal longitude;

    /** Bán kính check-in trạm (mét) do đối tác tự nhập. */
    @Column(name = "check_in_radius_meters")
    private Integer checkInRadiusMeters;

    /**
     * Mã QR dán tại cổng điểm đến: check-in trạm bằng GPS (trong bán kính) HOẶC quét mã này
     * (khi GPS yếu: trong nhà, hang động, khu nhiều nhà cao tầng). Giữ nguyên qua các lần lưu để QR đã in vẫn dùng được.
     */
    @Column(name = "qr_token", length = 40)
    private String qrToken;

    public static final java.util.regex.Pattern QR_TOKEN_PATTERN = java.util.regex.Pattern.compile("JGS-[0-9A-F]{16}");

    /** Mã QR check-in trạm, dễ nhập tay khi camera không dùng được: JGS-XXXXXXXXXXXXXXXX. */
    public static String newQrToken() {
        return "JGS-" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    /** Giữ mã cũ nếu hợp lệ (QR đã in), ngược lại sinh mã mới. */
    public static String keepOrNewQrToken(String token) {
        return token != null && QR_TOKEN_PATTERN.matcher(token).matches() ? token : newQrToken();
    }

    @Column(name = "short_description", columnDefinition = "TEXT")
    private String shortDescription;

    /** Lưu ý cho khách — không bắt buộc. */
    @Column(name = "guest_note", columnDefinition = "TEXT")
    private String guestNote;

    /** Ảnh riêng — không bắt buộc. */
    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    /** Video giới thiệu điểm đến — không bắt buộc, hiển thị phía trên nội dung văn hóa. */
    @Column(name = "video_url", length = 1000)
    private String videoUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "video_source", length = 20)
    private VideoSource videoSource;

    /** Nội dung văn hóa (câu chuyện) — chỉ mở cho khách sau khi check-in tại điểm. */
    @Column(name = "cultural_content", columnDefinition = "TEXT")
    private String culturalContent;

    @ElementCollection
    @CollectionTable(name = "tour_stop_cultural_images", joinColumns = @JoinColumn(name = "stop_id"))
    @OrderColumn(name = "position")
    @Column(name = "image_url", length = 1000, nullable = false)
    @Builder.Default
    private List<String> culturalImages = new ArrayList<>();

    @OneToMany(mappedBy = "stop", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<TourStopArtifact> artifacts = new ArrayList<>();

    /** Ảnh "xưa và nay" (tối đa 3 cặp). */
    @OneToMany(mappedBy = "stop", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<TourStopThenNow> thenNow = new ArrayList<>();

    /** Quiz của điểm đến (kind = QUIZ). */
    @OneToMany(mappedBy = "stop", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<TourStopQuestion> quizQuestions = new ArrayList<>();

    /** Trải nghiệm thực tế — làm sau quiz. */
    @OneToMany(mappedBy = "stop", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<TourStopExperience> experiences = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
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
