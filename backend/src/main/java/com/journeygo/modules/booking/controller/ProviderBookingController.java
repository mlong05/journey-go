package com.journeygo.modules.booking.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.booking.dto.response.BookingResponse;
import com.journeygo.modules.booking.dto.response.ProviderDepartureResponse;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
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
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

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
            description = "Lọc tuỳ chọn theo tourId, ngày khởi hành (date) và trạng thái (status, nhiều giá trị).")
    public ResponseEntity<ApiResponse<PageResponse<BookingResponse>>> list(
            @RequestParam(required = false) Long tourId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) List<BookingStatus> status,
            @ParameterObject @PageableDefault(page = 0, size = 20, sort = "createdAt",
                    direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách booking thành công",
                providerBookingService.listProviderBookings(userPrincipal.getId(), tourId, date, status, pageable)));
    }

    @GetMapping("/departures")
    @Operation(summary = "Lịch khởi hành (tour × ngày) kèm số khách đã đăng ký",
            description = "scope = UPCOMING (mặc định) | PAST | ALL; from/to ghi đè khoảng ngày. "
                    + "Mặc định chỉ trả ngày đã có đơn; includeEmpty=true trả cả slot chưa có ai đặt. "
                    + "Khách đã đăng ký = đơn CONFIRMED/COMPLETED; đơn PENDING_PAYMENT tính riêng là đang giữ chỗ.")
    public ResponseEntity<ApiResponse<PageResponse<ProviderDepartureResponse>>> departures(
            @RequestParam(required = false) Long tourId,
            @RequestParam(required = false) ProviderBookingService.DepartureScope scope,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "false") boolean includeEmpty,
            @ParameterObject @PageableDefault(page = 0, size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch khởi hành thành công",
                providerBookingService.listDepartures(userPrincipal.getId(), tourId, scope, from, to,
                        includeEmpty, pageable)));
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
