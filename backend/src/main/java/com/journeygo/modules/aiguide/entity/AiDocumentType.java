package com.journeygo.modules.aiguide.entity;

/**
 * Phân loại tài liệu Context / Rule do Quản trị viên nạp vào hệ thống AI RAG.
 */
public enum AiDocumentType {
    /** Chính sách nền tảng (hoàn tiền, đặt tour, bảo mật, điều khoản...) -> Nạp vào RAG Vector Store */
    PLATFORM_POLICY,
    /** Tài liệu bổ sung văn hóa/lịch sử/hướng dẫn cho điểm đến -> Nạp vào RAG Vector Store */
    CULTURAL_SUPPLEMENT,
    /** Bộ câu hỏi thường gặp -> Nạp vào RAG Vector Store */
    FAQ,
    /** Quy tắc hành vi bắt buộc cho AI -> Tiêm trực tiếp vào System Prompt */
    AI_RULE;

    /**
     * Trả về true nếu loại tài liệu này cần cắt chunk + nhúng vector vào bảng {@code ai_knowledge_chunks}.
     */
    public boolean isRagIndexed() {
        return this != AI_RULE;
    }
}
