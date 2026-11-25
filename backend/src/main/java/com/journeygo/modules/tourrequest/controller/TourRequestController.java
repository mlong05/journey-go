package com.journeygo.modules.tourrequest.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.tourrequest.dto.CreateTourRequestRequest;
import com.journeygo.modules.tourrequest.dto.TourRequestResponse;
import com.journeygo.modules.tourrequest.service.TourRequestService;
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
@RequestMapping("/api/v1/tour-requests")
@RequiredArgsConstructor
@Tag(name = "Yêu cầu tạo tour (Tour Requests)", description = "Du khách đăng bài yêu cầu tạo tour theo nhu cầu riêng")
@SecurityRequirement(name = "Bearer Authentication")
public class TourRequestController {

    private final TourRequestService tourRequestService;

    @PostMapping
    @PreAuthorize("hasRole('TOURIST')")
    @Operation(summary = "Đăng yêu cầu tạo tour riêng theo nhu cầu",
            description = "Du khách đăng bài mô tả các yêu cầu về điểm đến, thời gian, ngân sách, số lượng khách...")
    public ResponseEntity<ApiResponse<TourRequestResponse>> create(
            @Valid @RequestBody CreateTourRequestRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đăng yêu cầu tạo tour thành công",
                        tourRequestService.create(request, principal.getId())));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Danh sách yêu cầu tour của tôi",
            description = "Trả về danh sách các yêu cầu tạo tour do người dùng hiện tại đã đăng, có phân trang.")
    public ResponseEntity<ApiResponse<PageResponse<TourRequestResponse>>> getMyRequests(
            @AuthenticationPrincipal UserPrincipal principal,
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách yêu cầu thành công",
                tourRequestService.getMyRequests(principal.getId(), pageable)));
    }

    @GetMapping("/{requestId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Chi tiết một yêu cầu tạo tour")
    public ResponseEntity<ApiResponse<TourRequestResponse>> getDetail(
            @PathVariable Long requestId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết yêu cầu thành công",
                tourRequestService.getDetail(requestId, principal.getId())));
    }

    @DeleteMapping("/{requestId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Hủy yêu cầu tạo tour",
            description = "Chỉ người đăng mới có quyền hủy và chỉ được hủy khi yêu cầu chưa có đối tác nào nhận (OPEN).")
    public ResponseEntity<ApiResponse<Void>> cancel(
            @PathVariable Long requestId,
            @AuthenticationPrincipal UserPrincipal principal) {
        tourRequestService.cancel(requestId, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Hủy yêu cầu thành công"));
    }
}
