package com.journeygo.modules.experience.entity.enums;

/**
 * Phương thức Tourist dùng để xác minh khi check-in tại CheckInPoint vi mô.
 *
 * Phân biệt với CheckIn vĩ mô (User↔Destination) thuộc module Gamification.
 */
public enum CheckInVerificationMethod {
    GPS,
    QR,
    MANUAL,
    BEACON
}