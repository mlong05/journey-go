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

    @Schema(description = "Vai trò người gửi: USER hoặc ASSISTANT", example = "USER")
    private String role;

    @Schema(description = "Nội dung tin nhắn")
    private String content;

    @Schema(description = "Thời gian gửi")
    private Instant createdAt;
}
