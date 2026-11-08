package com.journeygo.modules.reward.entity;

/** Các mức điểm thưởng Admin cấu hình cho tour. */
public enum RewardSettingCode {
    /** Điểm cho mỗi nhiệm vụ của điểm đến (gồm quiz và trải nghiệm thực tế) khách hoàn thành. */
    TOUR_TASK("Điểm mỗi nhiệm vụ", 50);

    private final String label;
    private final int defaultPoints;

    RewardSettingCode(String label, int defaultPoints) {
        this.label = label;
        this.defaultPoints = defaultPoints;
    }

    public String getLabel() { return label; }

    public int getDefaultPoints() { return defaultPoints; }
}
