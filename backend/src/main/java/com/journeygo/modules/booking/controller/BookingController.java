package com.journeygo.modules.booking.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.security.AuthorizationGuard;
import com.journeygo.modules.booking.dto.request.CancelBookingRequest;
import com.journeygo.modules.booking.dto.request.CreateBookingRequest;
import com.journeygo.modules.booking.dto.response.BookingResponse;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.service.BookingService;
import com.journeygo.modules.tour.service.TourTranslationService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.context.i18n.LocaleContextHolder;
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
    private final TourTranslationService tourTranslationService;

    @PostMapping
    @PreAuthorize("hasAnyRole('TOURIST', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo booking mới",
            description = "Kiểm tra tour còn hoạt động, ngày hợp lệ, còn sức chứa; chốt giá tại thời điểm đặt; "
                    + "giữ slot nguyên tử và tạo booking ở trạng thái PENDING_PAYMENT với hạn thanh toán 10 phút.")
    public ResponseEntity<ApiResponse<BookingResponse>> create(
            @Valid @RequestBody CreateBookingRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        BookingResponse created = bookingService.createBooking(request, userPrincipal.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đặt tour thành công",
                        tourTranslationService.localizeBooking(created, LocaleContextHolder.getLocale())));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('TOURIST', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách booking của tôi")
    public ResponseEntity<ApiResponse<PageResponse<BookingResponse>>> getMyBookings(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<BookingResponse> page = bookingService.getMyBookings(userPrincipal.getId(), pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách booking thành công",
                tourTranslationService.localizeBookingPage(page, LocaleContextHolder.getLocale())));
    }

    @GetMapping("/my/pending")
    @PreAuthorize("hasAnyRole('TOURIST', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Đơn đang giữ chỗ của tôi",
            description = "Các booking PENDING_PAYMENT còn hạn thanh toán, mới nhất trước. Truyền tourId để chỉ lấy đơn của tour đó.")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getMyPendingBookings(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) Long tourId) {
        List<BookingResponse> list = bookingService.getMyActivePendingBookings(userPrincipal.getId(), tourId);
        return ResponseEntity.ok(ApiResponse.success("Lấy đơn đang giữ chỗ thành công",
                tourTranslationService.localizeBookings(list, LocaleContextHolder.getLocale())));
    }

    @GetMapping("/accessible")
    @PreAuthorize("hasAnyRole('TOURIST', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách booking tôi có quyền xem",
            description = "Gồm booking tôi đặt và booking tôi được mời tham gia (hành khách được mời). "
                    + "Hành khách được mời không thấy thông tin cá nhân của hành khách khác.")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getAccessibleBookings(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        List<BookingResponse> list = bookingService.getAccessibleBookings(userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách booking thành công",
                tourTranslationService.localizeBookings(list, LocaleContextHolder.getLocale())));
    }

    @GetMapping("/{bookingId}")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Chi tiết booking")
    public ResponseEntity<ApiResponse<BookingResponse>> getById(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        boolean isAdmin = AuthorizationGuard.isAdmin();
        BookingResponse detail = bookingService.getById(bookingId, userPrincipal.getId(), isAdmin);
        if (!isAdmin) {
            detail = tourTranslationService.localizeBooking(detail, LocaleContextHolder.getLocale());
        }
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin booking thành công", detail));
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
        BookingResponse cancelled = bookingService.cancelBooking(bookingId, userPrincipal.getId(), isAdmin, reason);
        if (!isAdmin) {
            cancelled = tourTranslationService.localizeBooking(cancelled, LocaleContextHolder.getLocale());
        }
        return ResponseEntity.ok(ApiResponse.success("Hủy booking thành công", cancelled));
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
