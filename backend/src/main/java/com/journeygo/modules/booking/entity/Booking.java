package com.journeygo.modules.booking.entity;

import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Booking — đơn đặt tour của Tourist.
 *
 * <p>Quy tắc nghiệp vụ (theo tài liệu Booking - Payment - Refund - Wallet &amp; Settlement):
 * <ul>
 *   <li>Giá được "chốt" tại thời điểm đặt ({@code totalAmount}) và không thay đổi khi giá tour thay đổi.</li>
 *   <li>{@code paymentDeadline} = thời điểm tạo Booking + 10 phút, cố định, không gia hạn khi thử lại thanh toán.</li>
 *   <li>Slot được giữ ngay khi Booking tạo thành công và chỉ giải phóng đúng một lần khi
 *       Booking chuyển sang {@link BookingStatus#EXPIRED} hoặc {@link BookingStatus#CANCELLED}.</li>
 * </ul>
 */
@Entity
@Table(name = "bookings", indexes = {
        @Index(name = "idx_bookings_tourist", columnList = "tourist_id"),
        @Index(name = "idx_bookings_tour", columnList = "tour_id"),
        @Index(name = "idx_bookings_status", columnList = "status"),
        @Index(name = "idx_bookings_deadline", columnList = "payment_deadline")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Mã đơn hiển thị cho người dùng, duy nhất. */
    @Column(name = "booking_code", nullable = false, unique = true, length = 32)
    private String bookingCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tourist_id", nullable = false)
    private User tourist;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tour_id", nullable = false)
    private Tour tour;

    /** Ngày trải nghiệm — căn cứ xác định kỳ doanh thu (revenue period) của Partner. */
    @Column(name = "experience_date", nullable = false)
    private LocalDate experienceDate;

    /** Tổng tiền đã chốt tại thời điểm đặt. */
    @Column(name = "total_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "currency", nullable = false, length = 3)
    @Builder.Default
    private String currency = "VND";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING_PAYMENT;

    /** Thời điểm tạo Booking — cũng là mốc bắt đầu 10 phút thanh toán. */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Hạn thanh toán = createdAt + 10 phút. Cố định, không gia hạn khi thử lại. */
    @Column(name = "payment_deadline", nullable = false)
    private Instant paymentDeadline;

    /** Thời điểm thanh toán thành công đã được xác minh (null nếu chưa thanh toán). */
    @Column(name = "paid_at")
    private Instant paidAt;

    /** Thời điểm Booking được xác nhận (sau khi xác minh thanh toán thành công). */
    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    /** Thời điểm trải nghiệm hoàn thành — điều kiện để doanh thu đủ tư cách tất toán. */
    @Column(name = "completed_at")
    private Instant completedAt;

    /** Lý do hủy (nếu có). */
    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Các slot đã giữ cho Booking này — dùng để giải phóng chính xác, đúng một lần. */
    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<BookingSlotHold> slotHolds = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.status == null) {
            this.status = BookingStatus.PENDING_PAYMENT;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ── Workflow methods ──────────────────────────────────────────────────────

    /**
     * Xác nhận Booking sau khi thanh toán đã được xác minh thành công.
     * Không ghi đè {@code paidAt} nếu đã có — giữ nguyên thời điểm thanh toán đã xác minh.
     */
    public void confirm(Instant verifiedPaymentTime) {
        if (this.status != BookingStatus.PENDING_PAYMENT) {
            return;
        }
        this.status = BookingStatus.CONFIRMED;
        this.paidAt = verifiedPaymentTime;
        this.confirmedAt = Instant.now();
    }

    /** Đánh dấu quá hạn thanh toán (UC-01). */
    public void expire() {
        if (this.status != BookingStatus.PENDING_PAYMENT) {
            return;
        }
        this.status = BookingStatus.EXPIRED;
    }

    /** Hủy Booking hợp lệ — giải phóng slot. */
    public void cancel(String reason) {
        this.status = BookingStatus.CANCELLED;
        this.cancellationReason = reason;
    }

    /** Đánh dấu trải nghiệm đã hoàn thành. */
    public void complete(Instant completedTime) {
        this.status = BookingStatus.COMPLETED;
        this.completedAt = completedTime;
    }

    /** Booking đã quá hạn thanh toán chưa. */
    public boolean isDeadlinePassed(Instant now) {
        return now != null && paymentDeadline != null && now.isAfter(paymentDeadline);
    }
}
