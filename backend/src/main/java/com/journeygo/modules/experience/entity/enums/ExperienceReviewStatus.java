package com.journeygo.modules.experience.entity.enums;

/**
 * Trạng thái kiểm duyệt của gói trải nghiệm, tách khỏi {@link ExperienceStatus} (phát hành hay chưa).
 * null = dữ liệu cũ chưa từng qua kiểm duyệt riêng (coi như đi theo điểm đến).
 */
public enum ExperienceReviewStatus {
    PENDING,
    APPROVED,
    REJECTED
}
