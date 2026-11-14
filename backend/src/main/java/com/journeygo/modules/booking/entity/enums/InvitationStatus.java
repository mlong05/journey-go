package com.journeygo.modules.booking.entity.enums;

/**
 * Trạng thái lời mời tham gia tour.
 *
 * <ul>
 *   <li>{@link #PENDING} — đã gửi, chờ người được mời xác nhận (hạn 24 giờ).</li>
 *   <li>{@link #ACCEPTED} — đã xác nhận thành công, Passenger đã liên kết với User.</li>
 *   <li>{@link #EXPIRED} — quá 24 giờ, người đặt có thể gửi lại.</li>
 *   <li>{@link #REVOKED} — bị vô hiệu hóa (booking bị hủy).</li>
 * </ul>
 */
public enum InvitationStatus {
    PENDING,
    ACCEPTED,
    EXPIRED,
    REVOKED;

    /** Lời mời còn hiệu lực và chưa hết hạn. */
    public boolean isUsable() {
        return this == PENDING;
    }
}
