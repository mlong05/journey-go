package com.journeygo.modules.booking.entity;

import com.journeygo.modules.booking.entity.enums.BookingSlotType;
import com.journeygo.modules.experience.entity.ExperienceSlot;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Bản ghi "giữ chỗ" (slot hold) của một Booking.
 *
 * <p>Nguyên tắc (UC-02 — Giữ chỗ):
 * <ul>
 *   <li>Mỗi Booking giữ một hoặc nhiều slot, mỗi slot gắn với đúng một
 *       {@link ExperienceSlot} (cặp {@code experienceId + slotDate}).</li>
 *   <li>Slot chỉ được giải phóng <b>đúng một lần</b> — cờ {@link #released} bảo đảm việc xử lý
 *       lại cùng một sự kiện không cộng/trừ số chỗ sai.</li>
 *   <li>Nếu một slot trong danh sách không còn chỗ, Booking không được tạo và các slot đã giữ
 *       một phần phải được giải phóng (rollback toàn bộ transaction).</li>
 * </ul>
 */
@Entity
@Table(name = "booking_slot_holds", uniqueConstraints = {
        @UniqueConstraint(name = "uk_booking_slot_hold", columnNames = {"booking_id", "experience_slot_id"})
}, indexes = {
        @Index(name = "idx_slot_holds_booking", columnList = "booking_id"),
        @Index(name = "idx_slot_holds_slot", columnList = "experience_slot_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingSlotHold {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "experience_slot_id", nullable = false)
    private ExperienceSlot experienceSlot;

    @Enumerated(EnumType.STRING)
    @Column(name = "slot_type", nullable = false, length = 30)
    @Builder.Default
    private BookingSlotType slotType = BookingSlotType.EXPERIENCE;

    /** Ngày của slot — bản sao để truy vấn nhanh, không phụ thuộc lazy load. */
    @Column(name = "slot_date", nullable = false)
    private LocalDate slotDate;

    /** Experience mà slot thuộc về (bản sao phẳng để truy vấn theo booking). */
    @Column(name = "experience_id", nullable = false)
    private Long experienceId;

    /** Cờ đánh dấu slot đã được giải phóng — bảo đảm chỉ giải phóng đúng một lần. */
    @Column(name = "released", nullable = false)
    @Builder.Default
    private boolean released = false;

    @Column(name = "held_at", nullable = false, updatable = false)
    private Instant heldAt;

    @Column(name = "released_at")
    private Instant releasedAt;

    @PrePersist
    protected void onCreate() {
        this.heldAt = Instant.now();
        if (this.slotType == null) {
            this.slotType = BookingSlotType.EXPERIENCE;
        }
    }

    /** Đánh dấu slot đã được giải phóng. Trả về false nếu đã giải phóng trước đó (idempotent). */
    public boolean markReleased() {
        if (this.released) {
            return false;
        }
        this.released = true;
        this.releasedAt = Instant.now();
        return true;
    }
}
