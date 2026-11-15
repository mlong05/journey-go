package com.journeygo.modules.tour.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** Cấu hình của một loại khách (tên hiển thị, tuổi bắt đầu, miễn phí) — Admin chỉnh ở trang "Loại khách & độ tuổi". */
@Entity
@Table(name = "guest_type_configs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuestTypeConfig {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(name = "guest_type", length = 20)
    private GuestType guestType;

    @Column(name = "label", nullable = false, length = 50)
    private String label;

    /** Tuổi bắt đầu của loại khách (tính tại ngày trải nghiệm). Tuổi kết thúc = tuổi bắt đầu của loại kế tiếp − 1. */
    @Column(name = "min_age", nullable = false)
    private Integer minAge;

    /** Loại miễn phí: giá luôn 0đ và không chiếm chỗ trong slot. */
    @Column(name = "always_free", nullable = false)
    private boolean alwaysFree;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;

    @PrePersist
    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }
}
