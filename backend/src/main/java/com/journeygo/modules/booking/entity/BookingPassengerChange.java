package com.journeygo.modules.booking.entity;

import com.journeygo.modules.booking.entity.enums.PassengerChangeStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Yêu cầu / biên bản thay đổi hành khách trong một Booking.
 *
 * <p>Ví dụ: Booking có A, B, C, D, E — người đặt muốn thay E bằng F.
 * <ol>
 *   <li>Người đặt gửi yêu cầu (kèm lý do) → bản ghi này ở trạng thái {@code PENDING}.</li>
 *   <li>Đối tác duyệt → {@code APPROVED}: hành khách cũ chuyển {@code REPLACED},
 *       hành khách mới được thêm vào Booking.</li>
 *   <li>Đối tác từ chối → {@code REJECTED}.</li>
 * </ol>
 *
 * <p>⚠️ {@link #oldData} và {@link #newData} lưu JSON của hành khách TRƯỚC và SAU khi thay
 * đổi (theo yêu cầu "Lưu thông tin trước và sau khi thay đổi").
 * {@link #priceDelta} là chênh lệch giá — nếu khác 0 thì phải xử lý phần chênh lệch
 * trước khi áp dụng.
 */
@Entity
@Table(name = "booking_passenger_changes", indexes = {
        @Index(name = "idx_booking_passenger_changes_booking", columnList = "booking_id, created_at DESC")
    })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingPassengerChange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    /** Hành khách bị thay thế. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "passenger_id", nullable = false)
    private BookingPassenger passenger;

    /** Người đặt gửi yêu cầu. */
    @Column(name = "requested_by")
    private Long requestedBy;

    /** Đối tác xử lý yêu cầu. */
    @Column(name = "processed_by")
    private Long processedBy;

    /** JSON hành khách TRƯỚC khi thay đổi. */
    @Column(name = "old_data", columnDefinition = "TEXT")
    private String oldData;

    /** JSON hành khách MỚI (đề xuất thay thế). */
    @Column(name = "new_data", columnDefinition = "TEXT")
    private String newData;

    /** Chênh lệch giá (newPrice - oldPrice). Khác 0 ⇒ cần xử lý chênh lệch. */
    @Column(name = "price_delta", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal priceDelta = BigDecimal.ZERO;

    /** Lý do khách hàng yêu cầu thay đổi. */
    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private PassengerChangeStatus status = PassengerChangeStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "processed_at")
    private Instant processedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        if (this.status == null) {
            this.status = PassengerChangeStatus.PENDING;
        }
        if (this.priceDelta == null) {
            this.priceDelta = BigDecimal.ZERO;
        }
    }

    /** Yêu cầu còn chờ đối tác xử lý. */
    public boolean isPending() {
        return status == PassengerChangeStatus.PENDING;
    }
}
