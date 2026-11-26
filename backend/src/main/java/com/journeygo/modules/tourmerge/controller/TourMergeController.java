package com.journeygo.modules.tourmerge.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.tourmerge.dto.request.CancelTourMergeRequest;
import com.journeygo.modules.tourmerge.dto.response.TourMergeResponse;
import com.journeygo.modules.tourmerge.service.TourMergeService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tour-merges")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('CONTENT_PROVIDER', 'CONTENT_MODERATOR')")
@Tag(name = "Ghép tour B2B 1-1 – Hủy / tách đoàn")
@SecurityRequirement(name = "Bearer Authentication")
public class TourMergeController {

    private final TourMergeService tourMergeService;

    @PatchMapping("/{mergeId}/cancel")
    @Operation(summary = "Hủy ghép / tách đoàn (chuyển sang CANCELLED, giữ nguyên booking gốc)")
    public ResponseEntity<ApiResponse<TourMergeResponse>> cancel(
            @PathVariable Long mergeId,
            @RequestBody(required = false) CancelTourMergeRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean isModerator = principal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_CONTENT_MODERATOR".equals(a.getAuthority()));
        return ResponseEntity.ok(ApiResponse.success("Đã hủy ghép / tách đoàn thành công",
                tourMergeService.cancelMerge(mergeId, request, principal.getId(), isModerator)));
    }
}
