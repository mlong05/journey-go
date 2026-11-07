package com.journeygo.modules.reward.entity;

/** Các mức điểm thưởng Admin cấu hình cho tour. */
public enum RewardSettingCode {
    /** Điểm cho mỗi câu quiz trả lời đúng. */
    QUIZ_QUESTION("Điểm mỗi câu hỏi trắc nghiệm", 10),
    /** Điểm cho mỗi trải nghiệm thực tế hoàn thành (trả lời đúng câu hỏi sau trải nghiệm). */
    REAL_WORLD_EXPERIENCE("Điểm mỗi trải nghiệm thực tế", 50);

    private final String label;
    private final int defaultPoints;

    RewardSettingCode(String label, int defaultPoints) {
        this.label = label;
        this.defaultPoints = defaultPoints;
    }

    public String getLabel() { return label; }

    public int getDefaultPoints() { return defaultPoints; }
}
