package com.journeygo.modules.experience.entity.enums;

/**
 * Phương thức xác minh hoàn thành task - lookup từ task_type.verification_method.
 *
 * - ANSWER_MATCH: so sánh đáp án (QUIZ, FIELD_CLUE)
 * - GPS_PRESENCE: kiểm tra GPS (LOCATION_VISIT)
 * - QR_SCAN: quét QR (QR_CHECKPOINT)
 * - PHOTO_SUBMISSION: chụp ảnh (PHOTO_CHALLENGE)
 */
public enum VerificationMethod {
    ANSWER_MATCH,
    GPS_PRESENCE,
    QR_SCAN,
    PHOTO_SUBMISSION
}