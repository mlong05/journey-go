package com.journeygo.modules.aiguide.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Nội dung phản hồi trực tiếp của Admin / Moderator gửi tới du khách")
public class AdminStaffReplyRequest {

    @NotBlank(message = "Nội dung phản hồi không được để trống")
    @Size(max = 2000, message = "Nội dung phản hồi tối đa 2000 ký tự")
    @Schema(description = "Nội dung tin nhắn phản hồi trực tiếp")
    private String content;
}
