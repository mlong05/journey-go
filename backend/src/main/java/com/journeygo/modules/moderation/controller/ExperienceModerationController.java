package com.journeygo.modules.moderation.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.experience.dto.response.ExperienceResponse;
import com.journeygo.modules.moderation.dto.ExperienceReviewDecisionRequest;
import com.journeygo.modules.moderation.service.ExperienceModerationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/moderation/experiences")
@RequiredArgsConstructor
@Tag(name = "Kiểm duyệt gói trải nghiệm")
@SecurityRequirement(name = "Bearer Authentication")
public class ExperienceModerationController {

    private final ExperienceModerationService moderationService;

    @PatchMapping("/{experienceId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    @Operation(summary = "Duyệt gói trải nghiệm (phát hành khi điểm đến đã được duyệt)")
    public ResponseEntity<ApiResponse<ExperienceResponse>> approve(@PathVariable Long experienceId,
            @Valid @RequestBody(required = false) ExperienceReviewDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã duyệt gói trải nghiệm",
                moderationService.approve(experienceId, request == null ? null : request.note())));
    }

    @PatchMapping("/{experienceId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    @Operation(summary = "Từ chối gói trải nghiệm, trả về bản nháp cho đối tác sửa")
    public ResponseEntity<ApiResponse<ExperienceResponse>> reject(@PathVariable Long experienceId,
            @Valid @RequestBody ExperienceReviewDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối gói trải nghiệm",
                moderationService.reject(experienceId, request.note())));
    }
}
