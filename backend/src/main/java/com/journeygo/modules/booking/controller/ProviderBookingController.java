package com.journeygo.modules.booking.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.booking.dto.response.BookingResponse;
import com.journeygo.modules.booking.service.ProviderBookingService;
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

/**
 * Góc nhìn đối tác (Content Provider) — xem khách hàng đã đặt tour của mình
 * và danh sách hành khách đầy đủ.
 */
@RestController
@RequestMapping("/api/v1/provider/bookings")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('CONTENT_PROVIDER', 'ADMIN')")
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Provider (Booking của khách)",
        description = "Đối tác xem danh sách khách đặt tour và hành khách trong nhóm")
public class ProviderBookingController {

    private final ProviderBookingService providerBookingService;

    @GetMapping
    @Operation(summary = "Danh sách booking của các tour tôi tạo",
            description = "Có thể lọc theo tourId cụ thể.")
    public ResponseEntity<ApiResponse<PageResponse<BookingResponse>>> list(
            @RequestParam(required = false) Long tourId,
            @ParameterObject @PageableDefault(page = 0, size = 20, sort = "createdAt",
                    direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách booking thành công",
                providerBookingService.listProviderBookings(userPrincipal.getId(), tourId, pageable)));
    }

    @GetMapping("/{bookingId}")
    @Operation(summary = "Chi tiết booking kèm danh sách hành khách")
    public ResponseEntity<ApiResponse<BookingResponse>> getById(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin booking thành công",
                providerBookingService.getProviderBooking(bookingId, userPrincipal.getId())));
    }
}
