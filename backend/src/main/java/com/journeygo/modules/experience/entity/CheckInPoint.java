package com.journeygo.modules.experience.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Điểm check-in vi mô trong một Experience.
 *
 * Tourist phải đến đúng tọa độ (trong bán kính radius_meters) hoặc quét QR token
 * để hoàn thành task loại LOCATION_VISIT / QR_CHECKPOINT / FIELD_CLUE.
 *
 * Schema theo ĐÚ-02 §3.4:
 *   - qr_token UNIQUE toàn cục — BR-CIP-1.
 *   - DECIMAL(10,8) cho lat, DECIMAL(11,8) cho lng — độ chính xác cao (~1mm).
 */
@Entity
@Table(name = "check_in_point")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "experience_id", nullable = false)
    private Experience experience;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 11, scale = 8)
    private BigDecimal longitude;

    @Column(name = "radius_meters", nullable = false)
    @Builder.Default
    private Integer radiusMeters = 50;

    @Column(name = "qr_token", nullable = false, unique = true, length = 100)
    private String qrToken;

    @Column(name = "sequence_order", nullable = false)
    @Builder.Default
    private Integer sequenceOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}