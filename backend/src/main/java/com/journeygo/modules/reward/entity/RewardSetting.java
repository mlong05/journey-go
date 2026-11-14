package com.journeygo.modules.reward.entity;

import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Mức điểm thưởng do Admin quản lý. Đối tác chỉ xem, không sửa.
 * Điểm được chốt vào câu hỏi / trải nghiệm của tour tại thời điểm Moderator duyệt.
 */
@Entity
@Table(name = "reward_settings")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RewardSetting {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(name = "code", length = 40)
    private RewardSettingCode code;

    @Column(name = "points", nullable = false)
    private Integer points;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        this.updatedAt = Instant.now();
    }
}
