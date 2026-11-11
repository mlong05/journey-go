package com.journeygo.modules.booking.entity;

import com.journeygo.modules.booking.entity.enums.BookingPassengerStatus;
import com.journeygo.modules.tour.entity.GuestType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Hành khách trong một Booking (đặt tour cho bản thân hoặc cho cả nhóm).
 *
 * <p>Phân biệt với {@link Booking#tourist} (người đặt — <b>Booking Customer</b>):
 * <ul>
 *   <li>{@code booking.tourist} — người trả tiền, sở hữu Booking, có quyền quản lý nhóm.</li>
 *   <li>{@code BookingPassenger} — danh sách người sẽ đi thực tế; người đặt cũng là một
 *       Passenger (với {@code isBookingCustomer = true}).</li>
 * </ul>
 *
 * <p>Hệ thống KHÔNG tự động tạo tài khoản JourneyGo cho hành khách. Nếu hành khách muốn
 * có tài khoản riêng, người đặt gửi lời mời; sau khi xác nhận, {@link #linkedUserId}
 * được gắn vào User tương ứng.
 */
@Entity
@Table(name = "booking_passengers", indexes = {
        @Index(name = "idx_booking_passengers_booking", columnList = "booking_id, created_at"),
        @Index(name = "idx_booking_passengers_linked_user", columnList = "linked_user_id")
    })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingPassenger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    /** Họ và tên hành khách. */
    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    /** Ngày sinh — dùng để xác định {@link #guestType} theo tuổi TẠI NGÀY TRẢI NGHIỆM. */
    @Column(name = "birth_date")
    private LocalDate birthDate;

    /** Giới tính: MALE | FEMALE | OTHER. */
    @Column(name = "gender", length = 20)
    private String gender;

    /** Email — bắt buộc với Người lớn (để gửi vé / lời mời); các loại khác có thể để trống. */
    @Column(name = "email", length = 255)
    private String email;

    /**
     * Loại khách — hệ thống tự xác định theo tuổi tại ngày trải nghiệm, nhưng đối tác có thể
     * tắt bỏ loại khách trong bảng giá của tour.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "guest_type", nullable = false, length = 20)
    @Builder.Default
    private GuestType guestType = GuestType.ADULT;

    /** Giá đã chốt cho hành khách này tại thời điểm đặt. */
    @Column(name = "price", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    /** Loại khách này có chiếm 1 chỗ trong slot hay không (em bé thường không chiếm). */
    @Column(name = "counts_toward_slot", nullable = false)
    @Builder.Default
    private boolean countsTowardSlot = true;

    /** true = đây là chính người đặt tour (Booking Customer). */
    @Column(name = "is_booking_customer", nullable = false)
    @Builder.Default
    private boolean bookingCustomer = false;

    /** User JourneyGo đã liên kết (sau khi xác nhận lời mời). Null = chưa có tài khoản. */
    @Column(name = "linked_user_id")
    private Long linkedUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private BookingPassengerStatus status = BookingPassengerStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.status == null) {
            this.status = BookingPassengerStatus.ACTIVE;
        }
        if (this.guestType == null) {
            this.guestType = GuestType.ADULT;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    /** Hành khách đã được liên kết với tài khoản JourneyGo. */
    public boolean hasLinkedAccount() {
        return linkedUserId != null;
    }

    /** Hành khách còn hiệu lực (được quyền truy cập tour). */
    public boolean isActive() {
        return status == BookingPassengerStatus.ACTIVE;
    }
}
