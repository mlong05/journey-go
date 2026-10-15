package com.journeygo.modules.experience.entity;

import com.journeygo.modules.experience.entity.enums.CheckInVerificationMethod;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "user_check_in_points", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_check_in_point", columnNames = {"user_id", "check_in_point_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserCheckInPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "check_in_point_id", nullable = false)
    private CheckInPoint checkInPoint;


    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "experience_id", nullable = false)
    private Experience experience;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_method", nullable = false, length = 20)
    private CheckInVerificationMethod verificationMethod;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "distance_meters")
    private Integer distanceMeters;


    @Column(name = "qr_value", length = 500)
    private String qrValue;

    @Column(name = "is_valid", nullable = false)
    @Builder.Default
    private boolean isValid = false;

    @Column(name = "checked_in_at", nullable = false)
    @Builder.Default
    private Instant checkedInAt = Instant.now();
}
