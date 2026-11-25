package com.journeygo.modules.tourrequest.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.tourrequest.dto.TourRequestResponse;
import com.journeygo.modules.tourrequest.service.TourRequestService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@RequestMapping("/api/v1/provider/tour-requests")
@RequiredArgsConstructor
@Tag(name = "Đối tác – Nhận yêu cầu tạo tour", description = "Dành cho Content Provider xem và nhận các bài đăng yêu cầu tour của du khách")
@SecurityRequirement(name = "Bearer Authentication")
@PreAuthorize("hasRole('CONTENT_PROVIDER')")
public class ProviderTourRequestController {

    private final TourRequestService tourRequestService;

    @GetMapping
    @Operation(summary = "Danh sách yêu cầu tour đang mở (OPEN)",
            description = "Trả về danh sách các yêu cầu tạo tour từ du khách đang chờ đối tác nhận.")
    public ResponseEntity<ApiResponse<PageResponse<TourRequestResponse>>> listOpen(
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách yêu cầu mở thành công",
                tourRequestService.listOpenRequests(pageable)));
    }

    @GetMapping("/my-accepted")
    @Operation(summary = "Danh sách yêu cầu mà tôi đã nhận",
            description = "Trả về danh sách các yêu cầu tour mà đối tác hiện tại đã bấm nhận để lên tour.")
    public ResponseEntity<ApiResponse<PageResponse<TourRequestResponse>>> listMyAccepted(
            @AuthenticationPrincipal UserPrincipal principal,
            @ParameterObject @PageableDefault(size = 10, sort = "acceptedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách yêu cầu đã nhận thành công",
                tourRequestService.listMyAcceptedRequests(principal.getId(), pageable)));
    }

    @GetMapping("/{requestId}")
    @Operation(summary = "Xem chi tiết một yêu cầu tour")
    public ResponseEntity<ApiResponse<TourRequestResponse>> getDetail(
            @PathVariable Long requestId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết yêu cầu thành công",
                tourRequestService.getDetail(requestId, principal.getId())));
    }

    @PostMapping("/{requestId}/accept")
    @Operation(summary = "Đối tác nhận yêu cầu tạo tour",
            description = "Đối tác bấm nhận để bắt đầu lên lịch trình và tạo tour riêng cho khách theo yêu cầu.")
    public ResponseEntity<ApiResponse<TourRequestResponse>> accept(
            @PathVariable Long requestId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Nhận yêu cầu tạo tour thành công",
                tourRequestService.acceptRequest(requestId, principal.getId())));
    }
}
