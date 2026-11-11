package com.journeygo.modules.booking.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.security.AuthorizationGuard;
import com.journeygo.modules.booking.dto.request.CancelBookingRequest;
import com.journeygo.modules.booking.dto.request.CreateBookingRequest;
import com.journeygo.modules.booking.dto.response.BookingResponse;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.service.BookingService;
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

import java.util.List;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
@Tag(name = "Booking (Đặt tour)", description = "Đặt chỗ, giữ slot, timeout 10 phút, hủy booking")
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    @PreAuthorize("hasAnyRole('TOURIST', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo booking mới",
            description = "Kiểm tra tour còn hoạt động, ngày hợp lệ, còn sức chứa; chốt giá tại thời điểm đặt; "
                    + "giữ slot nguyên tử và tạo booking ở trạng thái PENDING_PAYMENT với hạn thanh toán 10 phút.")
    public ResponseEntity<ApiResponse<BookingResponse>> create(
            @Valid @RequestBody CreateBookingRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đặt tour thành công",
                        bookingService.createBooking(request, userPrincipal.getId())));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('TOURIST', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách booking của tôi")
    public ResponseEntity<ApiResponse<PageResponse<BookingResponse>>> getMyBookings(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách booking thành công",
                bookingService.getMyBookings(userPrincipal.getId(), pageable)));
    }

    @GetMapping("/accessible")
    @PreAuthorize("hasAnyRole('TOURIST', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách booking tôi có quyền xem",
            description = "Gồm booking tôi đặt và booking tôi được mời tham gia (hành khách được mời). "
                    + "Hành khách được mời không thấy thông tin cá nhân của hành khách khác.")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getAccessibleBookings(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách booking thành công",
                bookingService.getAccessibleBookings(userPrincipal.getId())));
    }

    @GetMapping("/{bookingId}")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Chi tiết booking")
    public ResponseEntity<ApiResponse<BookingResponse>> getById(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        boolean isAdmin = AuthorizationGuard.isAdmin();
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin booking thành công",
                bookingService.getById(bookingId, userPrincipal.getId(), isAdmin)));
    }

    @PostMapping("/{bookingId}/cancel")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Hủy booking",
            description = "Chỉ hủy được khi booking chưa thanh toán. Slot đã giữ được giải phóng đúng một lần.")
    public ResponseEntity<ApiResponse<BookingResponse>> cancel(
            @PathVariable Long bookingId,
            @RequestBody(required = false) @Valid CancelBookingRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        boolean isAdmin = AuthorizationGuard.isAdmin();
        String reason = request != null ? request.reason() : null;
        return ResponseEntity.ok(ApiResponse.success("Hủy booking thành công",
                bookingService.cancelBooking(bookingId, userPrincipal.getId(), isAdmin, reason)));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách toàn bộ booking (ADMIN)")
    public ResponseEntity<ApiResponse<PageResponse<BookingResponse>>> getAll(
            @RequestParam(required = false) BookingStatus status,
            @ParameterObject @PageableDefault(page = 0, size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách booking thành công",
                bookingService.getAll(status, pageable)));
    }
}
