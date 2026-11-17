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

    @Schema(description = "Thời gian tạo phiên")
    private Instant createdAt;

    @Schema(description = "Thời gian tương tác gần nhất")
    private Instant updatedAt;
}
