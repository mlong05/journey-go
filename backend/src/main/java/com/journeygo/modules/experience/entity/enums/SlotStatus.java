package com.journeygo.modules.experience.entity.enums;

/**
 * Trạng thái một khung giờ (slot) trong Experience.
 *
 * - AVAILABLE: còn vé
 * - SOLD_OUT: hết vé
 * - PAUSED: tạm dừng bán
 * - CLOSED: đóng hẳn (ngày đã qua)
 */
public enum SlotStatus {
    AVAILABLE,
    SOLD_OUT,
    PAUSED,
    CLOSED
}