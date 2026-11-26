package com.journeygo.modules.tourmerge.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.tourmerge.dto.request.ReviewTourMergeRequest;
import com.journeygo.modules.tourmerge.dto.response.TourMergeResponse;
import com.journeygo.modules.tourmerge.entity.enums.TourMergeStatus;
import com.journeygo.modules.tourmerge.service.TourMergeService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/moderation/tour-merges")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CONTENT_MODERATOR')")
@Tag(name = "Kiểm duyệt – Ghép tour B2B 1-1")
@SecurityRequirement(name = "Bearer Authentication")
public class ModTourMergeController {

    private final TourMergeService tourMergeService;

    @GetMapping
    @Operation(summary = "Danh sách yêu cầu ghép tour cho Moderator (mặc định PENDING_MOD)")
    public ResponseEntity<ApiResponse<PageResponse<TourMergeResponse>>> list(
            @RequestParam(required = false) TourMergeStatus status,
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách yêu cầu ghép tour thành công",
                tourMergeService.listModMerges(status, pageable)));
    }

    @PatchMapping("/{mergeId}/review")
    @Operation(summary = "Moderator duyệt (APPROVED) hoặc từ chối (REJECTED) yêu cầu ghép tour")
    public ResponseEntity<ApiResponse<TourMergeResponse>> review(
            @PathVariable Long mergeId,
            @Valid @RequestBody ReviewTourMergeRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        String message = Boolean.TRUE.equals(request.approved())
                ? "Đã duyệt yêu cầu ghép tour"
                : "Đã từ chối yêu cầu ghép tour";
        return ResponseEntity.ok(ApiResponse.success(message,
                tourMergeService.reviewByMod(mergeId, request, principal.getId())));
    }
}
