package com.journeygo.modules.aiguide.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Phản hồi từ AI Virtual Guide")
public class AiChatResponse {

    @Schema(description = "ID phiên trò chuyện hiện tại")
    private UUID sessionId;

    @Schema(description = "ID tin nhắn trả lời của AI")
    private UUID messageId;

    @Schema(description = "Nội dung câu trả lời từ AI Virtual Guide")
    private String answer;

    @Schema(description = "Chế độ hội thoại đã áp dụng", example = "NORMAL_GUIDE hoặc TASK_HINT")
    private String mode;

    @Schema(description = "Các trích dẫn/nguồn tài liệu đã sử dụng để trả lời")
    private List<String> citations;

    @Schema(description = "Thời điểm phản hồi")
    private Instant createdAt;
}
