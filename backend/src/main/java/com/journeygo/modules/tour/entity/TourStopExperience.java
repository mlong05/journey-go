package com.journeygo.modules.tour.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Trải nghiệm thực tế: khách đến checkpoint (trong bán kính) → bấm Bắt đầu → đếm ngược
 * {@code durationSeconds} → hiện câu hỏi sau trải nghiệm.
 */
@Entity
@Table(name = "tour_stop_experiences")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourStopExperience {

    public static final int DEFAULT_RADIUS_METERS = 50;
    public static final java.util.regex.Pattern QR_TOKEN_PATTERN = java.util.regex.Pattern.compile("JGE-[0-9A-F]{16}");

    /** Mã QR ngẫu nhiên, dễ đọc để nhập tay khi camera không dùng được: JGE-XXXXXXXXXXXXXXXX. */
    public static String newQrToken() {
        return "JGE-" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    /** Giữ mã cũ nếu hợp lệ (QR đã in), ngược lại sinh mã mới. */
    public static String keepOrNewQrToken(String token) {
        return token != null && QR_TOKEN_PATTERN.matcher(token).matches() ? token : newQrToken();
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stop_id", nullable = false)
    private TourStop stop;

    @Column(name = "sequence_order", nullable = false)
    private int sequenceOrder;

    @Column(name = "activity_name", length = 200)
    private String activityName;

    @Column(name = "checkpoint_latitude", precision = 10, scale = 7)
    private BigDecimal checkpointLatitude;

    @Column(name = "checkpoint_longitude", precision = 10, scale = 7)
    private BigDecimal checkpointLongitude;

    @Column(name = "radius_meters", nullable = false)
    @Builder.Default
    private Integer radiusMeters = DEFAULT_RADIUS_METERS;

    /** Thời gian thực hiện trải nghiệm (đếm ngược trên mobile). */
    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    /**
     * Mã QR dán tại điểm trải nghiệm: hết giờ đếm ngược, khách quét mã này để xác nhận đã hoàn thành rồi mới
     * hiện câu hỏi sau trải nghiệm. Giữ nguyên qua các lần lưu nháp để QR đã in vẫn dùng được.
     */
    @Column(name = "qr_token", length = 40)
    private String qrToken;

    /** Điểm thưởng — chốt từ cấu hình Admin lúc tour được duyệt; đối tác không sửa. */
    @Column(name = "points_reward")
    private Integer pointsReward;

    /** Câu hỏi sau trải nghiệm (đúng 1 câu; dùng List để cascade / orphanRemoval ổn định). */
    @OneToMany(mappedBy = "experience", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<TourStopQuestion> questions = new ArrayList<>();

    public TourStopQuestion getQuestion() {
        return questions == null || questions.isEmpty() ? null : questions.get(0);
    }
}
