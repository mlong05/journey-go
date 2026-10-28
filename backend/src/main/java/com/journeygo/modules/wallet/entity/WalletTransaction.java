package com.journeygo.modules.wallet.entity;

import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.wallet.entity.enums.WalletTransactionDirection;
import com.journeygo.modules.wallet.entity.enums.WalletTransactionStatus;
import com.journeygo.modules.wallet.entity.enums.WalletTransactionType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Wallet Transaction — lịch sử biến động số dư Wallet.
 *
 * <p>Quy tắc:
 * <ul>
 *   <li>Mọi biến động số dư phải được ghi nhận thành một giao dịch riêng — không sửa số dư
 *       trực tiếp mà không lưu lịch sử.</li>
 *   <li>{@code amount} lưu số dương; chiều tăng/giảm xác định bằng {@code direction}.</li>
 *   <li>Với {@link WalletTransactionType#SETTLEMENT_CREDIT}, ràng buộc duy nhất trên
 *       {@code (wallet_id, source_type, source_id)} bảo đảm một Settlement chỉ tạo được
 *       một giao dịch cộng tiền thành công.</li>
 * </ul>
 */
@Entity
@Table(name = "wallet_transactions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_wallet_txn_settlement_credit",
                columnNames = {"wallet_id", "source_type", "source_id"})
}, indexes = {
        @Index(name = "idx_wallet_txn_wallet", columnList = "wallet_id"),
        @Index(name = "idx_wallet_txn_source", columnList = "source_type, source_id"),
        @Index(name = "idx_wallet_txn_created", columnList = "created_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletTransaction {

    /** Loại nguồn phát sinh giao dịch. */
    public enum SourceType {
        SETTLEMENT,
        REFUND,
        MANUAL_ADJUSTMENT,
        FINANCIAL_ADJUSTMENT
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 40)
    private WalletTransactionType transactionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "direction", nullable = false, length = 10)
    private WalletTransactionDirection direction;

    /** Số tiền (luôn dương). */
    @Column(name = "amount", nullable = false, precision = 16, scale = 2)
    private BigDecimal amount;

    @Column(name = "balance_before", nullable = false, precision = 16, scale = 2)
    private BigDecimal balanceBefore;

    @Column(name = "balance_after", nullable = false, precision = 16, scale = 2)
    private BigDecimal balanceAfter;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 40)
    private SourceType sourceType;

    /** ID của nguồn phát sinh (Settlement id, Refund id, Adjustment id). */
    @Column(name = "source_id", nullable = false)
    private Long sourceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private WalletTransactionStatus status = WalletTransactionStatus.SUCCESS;

    /** Người tạo giao dịch (Admin). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        if (this.status == null) {
            this.status = WalletTransactionStatus.SUCCESS;
        }
    }

    /** Tạo giao dịch cộng tiền. */
    public static WalletTransaction credit(Wallet wallet, WalletTransactionType type, SourceType sourceType,
                                          Long sourceId, BigDecimal amount, BigDecimal balanceBefore,
                                          User createdBy, String note) {
        BigDecimal safeAmount = amount != null ? amount : BigDecimal.ZERO;
        return WalletTransaction.builder()
                .wallet(wallet)
                .transactionType(type)
                .direction(WalletTransactionDirection.CREDIT)
                .amount(safeAmount)
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceBefore.add(safeAmount))
                .sourceType(sourceType)
                .sourceId(sourceId)
                .status(WalletTransactionStatus.SUCCESS)
                .createdBy(createdBy)
                .note(note)
                .build();
    }

    /** Tạo giao dịch trừ tiền. */
    public static WalletTransaction debit(Wallet wallet, WalletTransactionType type, SourceType sourceType,
                                         Long sourceId, BigDecimal amount, BigDecimal balanceBefore,
                                         User createdBy, String note) {
        BigDecimal safeAmount = amount != null ? amount : BigDecimal.ZERO;
        return WalletTransaction.builder()
                .wallet(wallet)
                .transactionType(type)
                .direction(WalletTransactionDirection.DEBIT)
                .amount(safeAmount)
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceBefore.subtract(safeAmount))
                .sourceType(sourceType)
                .sourceId(sourceId)
                .status(WalletTransactionStatus.SUCCESS)
                .createdBy(createdBy)
                .note(note)
                .build();
    }
}
