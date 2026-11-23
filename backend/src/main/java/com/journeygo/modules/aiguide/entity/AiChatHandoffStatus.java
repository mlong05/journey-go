package com.journeygo.modules.aiguide.entity;

/**
 * Trạng thái chuyển tiếp hỗ trợ người thật cho phiên hội thoại AI Virtual Guide.
 */
public enum AiChatHandoffStatus {
    /** Phiên do AI Hướng dẫn viên tự động xử lý. */
    AI_ACTIVE,
    /** Du khách đã yêu cầu gặp Admin/Moderator và đang chờ tiếp nhận. */
    WAITING_HUMAN,
    /** Admin hoặc Content Moderator đang trực tiếp trò chuyện hỗ trợ du khách. */
    HUMAN_ACTIVE
}
