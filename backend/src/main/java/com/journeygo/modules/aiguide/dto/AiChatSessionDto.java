package com.journeygo.modules.aiguide.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thông tin phiên trò chuyện của du khách")
public class AiChatSessionDto {

    @Schema(description = "ID của phiên")
    private UUID id;

    @Schema(description = "ID người dùng sở hữu")
    private Long userId;

    @Schema(description = "ID điểm đến gắn với phiên")
    private Long currentDestinationId;

    @Schema(description = "Đoạn xem trước tin nhắn gần nhất trong phiên")
    private String lastMessagePreview;

    @Schema(description = "Tổng số tin nhắn trong phiên")
    private long messageCount;

    @Schema(description = "Trạng thái chuyển tiếp người thật: AI_ACTIVE, WAITING_HUMAN, HUMAN_ACTIVE")
    private String handoffStatus;

    @Schema(description = "Thời điểm du khách gửi yêu cầu gặp nhân viên hỗ trợ")
    private Instant handoffRequestedAt;

    @Schema(description = "Lý do / ghi chú cần hỗ trợ")
    private String handoffReason;

    @Schema(description = "ID nhân sự Admin/Moderator đang tiếp nhận")
    private Long assignedStaffId;

    @Schema(description = "Tên hiển thị của Admin/Moderator đang hỗ trợ")
    private String assignedStaffName;

    @Schema(description = "Vai trò của nhân sự hỗ trợ: ADMIN hoặc CONTENT_MODERATOR")
    private String assignedStaffRole;

    @Schema(description = "Họ tên du khách sở hữu phiên")
    private String userFullName;

    @Schema(description = "Email du khách sở hữu phiên")
    private String userEmail;

    @Schema(description = "Thời gian tạo phiên")
    private Instant createdAt;

    @Schema(description = "Thời gian tương tác gần nhất")
    private Instant updatedAt;
}
