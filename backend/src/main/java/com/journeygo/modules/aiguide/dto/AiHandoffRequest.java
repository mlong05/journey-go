package com.journeygo.modules.aiguide.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Yêu cầu kết nối trò chuyện trực tiếp với Admin / Moderator")
public class AiHandoffRequest {

    @Size(max = 500, message = "Lý do hỗ trợ tối đa 500 ký tự")
    @Schema(description = "Nội dung tóm tắt hoặc lý do cần hỗ trợ (tùy chọn)")
    private String reason;
}
