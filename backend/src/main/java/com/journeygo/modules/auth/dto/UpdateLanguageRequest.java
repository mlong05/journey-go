package com.journeygo.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateLanguageRequest(
        @NotBlank(message = "Ngôn ngữ không được để trống")
        @Pattern(regexp = "^(vi|en|ja)$", message = "Ngôn ngữ chỉ hỗ trợ vi, en hoặc ja")
        String preferredLanguage
) {
}
