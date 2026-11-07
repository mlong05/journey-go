package com.journeygo.modules.finance.entity;

import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Chính sách hoa hồng mặc định của nền tảng (Admin Dashboard — "Quản lý chính sách hoa hồng").
 *
 * <p>Quy tắc nghiệp vụ (BR-01 → BR-09):
 * <ul>
 *   <li><b>BR-01</b> — Chỉ Admin có quyền quản lý. (kiểm ở tầng service/controller)</li>
 *   <li><b>BR-02</b> — Commission rate &gt; 0% và &lt; 100%. (CHECK constraint)</li>
 *   <li><b>BR-03</b> — Mỗi thời điểm chỉ có một chính sách có hiệu lực. (kiểm ở tầng service)</li>
 *   <li><b>BR-04</b> — Không tạo chính sách có thời gian hiệu lực chồng lấn. (kiểm ở tầng service)</li>
 *   <li><b>BR-05</b> — Chính sách mới không áp dụng hồi tố cho Booking cũ — settlement dùng
 *       commission snapshot trên {@code ProviderRevenue}, không tính lại từ tỷ lệ hiện tại.</li>
 *   <li><b>BR-06</b> — Mọi thay đổi phải có {@code changeReason} và người thực hiện.</li>
 *   <li><b>BR-07</b> — Chính sách đã có hiệu lực không được chỉnh sửa trực tiếp.</li>
 *   <li><b>BR-08</b> — Chính sách tương lai có thể hủy/thay thế nếu chưa tới ngày hiệu lực.</li>
 *   <li><b>BR-09</b> — Settlement dùng commission snapshot. (xem {@code ProviderRevenueService})</li>
 * </ul>
 */
@Entity
@Table(name = "commission_policies", indexes = {
        @Index(name = "idx_commission_policies_effective", columnList = "effective_from"),
        @Index(name = "idx_commission_policies_creator", columnList = "created_by")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommissionPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Tên chính sách (VD: "Policy 01", "Chính sách Q4/2026"). */
    @Column(nullable = false, length = 150)
    private String name;

    /** Tỷ lệ hoa hồng (0.30 = 30%). */
    @Column(name = "commission_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal commissionRate;

    /** Ngày bắt đầu có hiệu lực. */
    @Column(name = "effective_from", nullable = false)
    private Instant effectiveFrom;

    /** Ngày kết thúc hiệu lực (null = đang hiệu lực / không xác định). */
    @Column(name = "effective_to")
    private Instant effectiveTo;

    /** Lý do thay đổi — bắt buộc (BR-06). */
    @Column(name = "change_reason", nullable = false, columnDefinition = "TEXT")
    private String changeReason;

    /** Admin thực hiện thay đổi (BR-06). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    /** Chính sách tương lai đã bị hủy (BR-08). */
    @Column(nullable = false)
    @Builder.Default
    private boolean cancelled = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
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

    /** Chính sách đã bắt đầu hiệu lực → không được sửa trực tiếp (BR-07). */
    public boolean hasStarted() {
        return effectiveFrom != null && !effectiveFrom.isAfter(Instant.now());
    }

    /** Chính sách tương lai → được phép hủy / thay thế (BR-08). */
    public boolean isFuture() {
        return effectiveFrom != null && effectiveFrom.isAfter(Instant.now());
    }
}
