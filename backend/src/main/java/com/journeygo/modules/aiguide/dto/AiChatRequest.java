package com.journeygo.modules.aiguide.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Yêu cầu trò chuyện với AI Virtual Guide")
public class AiChatRequest {

    @JsonIgnore
    @Schema(hidden = true)
    private UUID sessionId;

    @Schema(description = "ID điểm đến du khách đang đứng hoặc quét mã QR", example = "1")
    private Long destinationId;

    @Schema(description = "ID nhiệm vụ du khách đang thực hiện (Nếu có, bot sẽ kích hoạt Task Hint Mode)", example = "10")
    private Long taskId;

    @NotBlank(message = "Câu hỏi của du khách không được để trống")
    @Schema(description = "Nội dung câu hỏi của du khách", example = "Chùa Một Cột được xây dựng từ triều đại nào?")
    private String question;
}
