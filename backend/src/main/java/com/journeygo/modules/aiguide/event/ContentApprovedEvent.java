package com.journeygo.modules.aiguide.event;

/**
 * Sự kiện phát ra khi một nội dung văn hóa được Moderator phê duyệt (APPROVED).
 * Được AI Guide Module lắng nghe để tự động băm nhỏ và sinh vector nhúng.
 */
public record ContentApprovedEvent(
        Long contentId,
        Long destinationId,
        String destinationName,
        String category,
        String title,
        String contentText
) {}
