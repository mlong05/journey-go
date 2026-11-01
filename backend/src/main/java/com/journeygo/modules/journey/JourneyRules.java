package com.journeygo.modules.journey;

/**
 * Các con số quy tắc của hành trình, dùng chung cho chấm điểm ở backend và trả về cho app
 * (để app không phải chép cứng, lệch với backend).
 */
public final class JourneyRules {

    /** Bán kính check-in GPS mặc định tại điểm đến (mét), khi điểm đến chưa cấu hình riêng. */
    public static final int DEFAULT_CHECK_IN_RADIUS_METERS = 100;

    /** Điểm thưởng khi đi trọn hành trình. */
    public static final int COMPLETION_BONUS_POINTS = 50;

    private JourneyRules() {
    }
}
