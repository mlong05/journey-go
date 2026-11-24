package com.journeygo.modules.aiguide.entity;

/**
 * Phạm vi áp dụng của tài liệu tri thức / quy tắc AI do Admin tải lên.
 */
public enum AiDocumentScope {
    /** Áp dụng toàn nền tảng (mọi điểm đến và phiên chat chung) */
    GLOBAL,
    /** Gắn riêng với một điểm đến cụ thể */
    DESTINATION
}
