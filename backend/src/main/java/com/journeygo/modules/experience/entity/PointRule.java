package com.journeygo.modules.experience.entity;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

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
