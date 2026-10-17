package com.journeygo.modules.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Yêu cầu kích hoạt hoặc vô hiệu hóa tài khoản")
public record UpdateUserStatusRequest(
        @Schema(description = "Trạng thái kích hoạt (true = mở khóa/kích hoạt, false = vô hiệu hóa/khóa)", example = "false")
        @NotNull(message = "Trạng thái không được để trống")
        Boolean active
) {}
