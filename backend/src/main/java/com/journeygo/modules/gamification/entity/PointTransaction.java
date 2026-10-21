package com.journeygo.modules.gamification.entity;

import com.journeygo.modules.gamification.entity.enums.PointTransactionType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "point_transactions", indexes = {
        @Index(name = "idx_point_tx_user_id", columnList = "user_id"),
        @Index(name = "idx_point_tx_type", columnList = "transaction_type"),
        @Index(name = "idx_point_tx_reference", columnList = "reference_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_point_ref", columnNames = {"user_id", "reference_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PointTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "amount", nullable = false)
    private Integer amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 40)
    private PointTransactionType transactionType;

    @Column(name = "reference_id", length = 100)
    private String referenceId;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "balance_after", nullable = false)
    private Integer balanceAfter;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
