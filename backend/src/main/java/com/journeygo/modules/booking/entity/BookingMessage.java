package com.journeygo.modules.booking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Tin nhắn trong khung chat hỗ trợ của một Booking.
 *
 * <p>Khung chat gắn với Booking: người đặt / hành khách nhắn với đối tác sở hữu tour để
 * trao đổi (ví dụ yêu cầu thay đổi hành khách khi tour đã public).
 */
@Entity
@Table(name = "booking_messages", indexes = {
        @Index(name = "idx_booking_messages_booking", columnList = "booking_id, created_at")
    })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    /** Người gửi (khách đặt, hành khách hoặc đối tác). */
    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "read_at")
    private Instant readAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    public boolean isRead() {
        return readAt != null;
    }
}
