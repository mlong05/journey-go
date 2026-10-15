package com.journeygo.modules.experience.entity;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Bảng cấu hình cách tính điểm cho từng {@link TaskType}.
 *
 * Schema theo ĐÚ-02 §3.7:
 *   - task_type_id UNIQUE — mỗi TaskType có đúng 1 PointRule.
 *   - base_points: điểm nền.
 *   - bonus_multiplier: hệ số nhân (DECIMAL(3,2) cho phép 0.00-9.99).
 *   - conditions (JSONB): cấu hình bonus linh hoạt (vd: firstAttempt:1.5, perfectScore:1.2, speedBonus:1.3).
 *
 * Công thức runtime (module Tourist Execution): điểm_thực_nhận = base_points × bonus_multiplier × task.points_reward.
 *
 * JSONB được map qua hypersistence-utils-hibernate-63 (xem pom.xml).
 */
@Entity
@Table(name = "point_rule")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PointRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_type_id", nullable = false, unique = true)
    private TaskType taskType;

    @Column(name = "base_points", nullable = false)
    @Builder.Default
    private Integer basePoints = 0;

    @Column(name = "bonus_multiplier", nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal bonusMultiplier = new BigDecimal("1.00");

    /**
     * Điều kiện bonus dạng JSONB.
     * Ví dụ: {"firstAttempt": 1.5, "perfectScore": 1.2, "speedBonus": 1.3}.
     */
    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> conditions = new HashMap<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}