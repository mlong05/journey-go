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
@Schema(description = "Thông tin chi tiết của một tin nhắn trong phiên trò chuyện")
public class AiChatMessageDto {

    @Schema(description = "ID của tin nhắn")
    private UUID id;

    @Schema(description = "ID của phiên")
    private UUID sessionId;

    @Schema(description = "Vai trò người gửi: USER, ASSISTANT, HUMAN_AGENT hoặc SYSTEM", example = "USER")
    private String role;

    @Schema(description = "Nội dung tin nhắn")
    private String content;

    @Schema(description = "ID người gửi (nếu là USER hoặc nhân viên hỗ trợ)")
    private Long senderId;

    @Schema(description = "Tên hiển thị người gửi (VD: AI Hướng dẫn viên hoặc tên Admin/Moderator)")
    private String senderName;

    @Schema(description = "Vai trò định danh người gửi: AI, USER, ADMIN, CONTENT_MODERATOR, SYSTEM")
    private String senderRole;

    @Schema(description = "Thời gian gửi")
    private Instant createdAt;
}
