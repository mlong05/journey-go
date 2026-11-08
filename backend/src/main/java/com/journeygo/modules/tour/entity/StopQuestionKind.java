package com.journeygo.modules.tour.entity;

public enum StopQuestionKind {
    /** Câu hỏi quiz của một nhiệm vụ (1–4 câu). */
    QUIZ,
    /** Câu hỏi hiện ra khi hết thời gian trải nghiệm thực tế (đúng 1 câu mỗi trải nghiệm). */
    POST_EXPERIENCE,
    /**
     * Dữ liệu tạm (bản trước: câu hỏi của nhiệm vụ nằm trong trải nghiệm). Được đổi lại thành
     * POST_EXPERIENCE khi khởi động — xem SchemaMigration.migrateTourStopsToTasks.
     */
    @Deprecated
    TASK
}
