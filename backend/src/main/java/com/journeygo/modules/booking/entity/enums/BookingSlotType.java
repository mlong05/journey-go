package com.journeygo.modules.booking.entity.enums;

/**
 * Loại slot được giữ cho một Booking.
 *
 * <p>Slot được định nghĩa theo {@code (experienceId, slotDate)} — mỗi Experience có một
 * hàng trong {@code experience_slot} với {@code maxTourPerDay} và {@code bookedTourCount}.
 */
public enum BookingSlotType {
    /** Giữ chỗ trên Experience (có giới hạn sức chứa theo ngày). */
    EXPERIENCE
}
