package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

@Schema(description = "Cập nhật expectedText cho Question")
public record SetExpectedTextRequest(

        @Schema(description = "Đáp án mới cho câu TEXT")
        @Size(max = 500, message = "Expected text tối đa 500 ký tự")
        String expectedText
) {}
