package com.journeygo.modules.tourmerge.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.tourmerge.dto.request.ConfirmTourMergeRequest;
import com.journeygo.modules.tourmerge.dto.request.CreateTourMergeRequest;
import com.journeygo.modules.tourmerge.dto.request.ValidateTourMergeRequest;
import com.journeygo.modules.tourmerge.dto.response.MergedPassengerManifestResponse;
import com.journeygo.modules.tourmerge.dto.response.TourMergeResponse;
import com.journeygo.modules.tourmerge.dto.response.TourMergeValidationResponse;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/provider/tour-merges")
@RequiredArgsConstructor
@Tag(name = "Đối tác – Ghép tour B2B 1-1")
@SecurityRequirement(name = "Bearer Authentication")
public class ProviderTourMergeController {

    private final TourMergeService tourMergeService;

    @PostMapping("/validate")
    @PreAuthorize("hasRole('CONTENT_PROVIDER')")
    @Operation(summary = "Kiểm tra điều kiện ghép giữa 2 slot trước khi gửi yêu cầu")
    public ResponseEntity<ApiResponse<TourMergeValidationResponse>> validate(
            @Valid @RequestBody ValidateTourMergeRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Kiểm tra điều kiện ghép tour thành công",
                tourMergeService.validateMerge(request, principal.getId())));
    }

    @PostMapping
    @PreAuthorize("hasRole('CONTENT_PROVIDER')")
    @Operation(summary = "Tạo yêu cầu ghép tour B2B 1-1 (PENDING_PROVIDER)")
    public ResponseEntity<ApiResponse<TourMergeResponse>> create(
            @Valid @RequestBody CreateTourMergeRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã gửi yêu cầu ghép tour",
                        tourMergeService.createMergeRequest(request, principal.getId())));
    }

    @GetMapping
    @PreAuthorize("hasRole('CONTENT_PROVIDER')")
    @Operation(summary = "Danh sách yêu cầu ghép tour đã gửi hoặc nhận của đối tác")
    public ResponseEntity<ApiResponse<PageResponse<TourMergeResponse>>> listMine(
            @RequestParam(required = false) TourMergeStatus status,
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách yêu cầu ghép tour thành công",
                tourMergeService.listProviderMerges(principal.getId(), status, pageable)));
    }

    @PatchMapping("/{mergeId}/confirm")
    @PreAuthorize("hasRole('CONTENT_PROVIDER')")
    @Operation(summary = "Đối tác nhận yêu cầu đồng ý (PENDING_MOD) hoặc từ chối (REJECTED)")
    public ResponseEntity<ApiResponse<TourMergeResponse>> confirm(
            @PathVariable Long mergeId,
            @Valid @RequestBody ConfirmTourMergeRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        String message = Boolean.TRUE.equals(request.confirm())
                ? "Đã xác nhận ghép tour, chuyển sang chờ Moderator duyệt"
                : "Đã từ chối yêu cầu ghép tour";
        return ResponseEntity.ok(ApiResponse.success(message,
                tourMergeService.confirmOrReject(mergeId, request, principal.getId())));
    }

    @GetMapping("/{mergeId}/passengers")
    @PreAuthorize("hasAnyRole('CONTENT_PROVIDER', 'CONTENT_MODERATOR')")
    @Operation(summary = "Danh sách hành khách gộp của 2 slot (gắn nhãn tour/provider gốc)")
    public ResponseEntity<ApiResponse<MergedPassengerManifestResponse>> passengers(
            @PathVariable Long mergeId,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean isModerator = principal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_CONTENT_MODERATOR".equals(a.getAuthority()));
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách hành khách đoàn ghép thành công",
                tourMergeService.getPassengerManifest(mergeId, principal.getId(), isModerator)));
    }
}
