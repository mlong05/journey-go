package com.journeygo.modules.moderation.entity.enums;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Trạng thái của Destination Request trong quy trình kiểm duyệt")
public enum DestinationRequestStatus {
    @Schema(description = "Đối tác đã gửi request")
    SUBMITTED,

    @Schema(description = "Moderator đang xem xét tính hợp lệ ban đầu")
    UNDER_REVIEW,

    @Schema(description = "Moderator từ chối request (Lần 1)")
    REJECTED,

    @Schema(description = "Moderator phê duyệt tính hợp lệ, chờ Admin phân công CP")
    APPROVED,

    @Schema(description = "Admin đã phân công request cho Content Provider (CP)")
    ASSIGNED,

    @Schema(description = "Content Provider đang nghiên cứu, thiết kế nội dung")
    IN_PROGRESS,

    @Schema(description = "Content Provider đã nộp nội dung hoàn chỉnh, chờ Moderator duyệt (Lần 2)")
    PENDING_CONTENT_REVIEW,

    @Schema(description = "Moderator duyệt nội dung hoàn chỉnh, điểm đến đã xuất bản thành công")
    COMPLETED,

    @Schema(description = "Đối tác đã rút/hủy request")
    CANCELLED
}
