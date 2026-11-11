package com.journeygo.modules.booking.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.dto.request.ChangePassengerRequest;
import com.journeygo.modules.booking.dto.request.SendMessageRequest;
import com.journeygo.modules.booking.dto.response.BookingMessageResponse;
import com.journeygo.modules.booking.dto.response.BookingPassengerResponse;
import com.journeygo.modules.booking.dto.response.BookingResponse;
import com.journeygo.modules.booking.dto.response.InvitationResponse;
import com.journeygo.modules.booking.dto.response.PassengerChangeResponse;
import com.journeygo.modules.booking.dto.response.PendingInvitationResponse;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.entity.BookingPassengerChange;
import com.journeygo.modules.booking.entity.enums.BookingPassengerStatus;
import com.journeygo.modules.booking.entity.enums.PassengerChangeStatus;
import com.journeygo.modules.booking.repository.BookingPassengerChangeRepository;
import com.journeygo.modules.booking.repository.BookingPassengerRepository;
import com.journeygo.modules.booking.service.BookingChatService;
import com.journeygo.modules.booking.service.BookingInvitationNotificationService;
import com.journeygo.modules.booking.service.BookingInvitationService;
import com.journeygo.modules.booking.service.BookingPassengerChangeService;
import com.journeygo.modules.booking.service.BookingService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * API quản lý hành khách trong Booking:
 * lời mời (Tour Invitation), yêu cầu thay đổi hành khách và khung chat hỗ trợ.
 */
@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
@Tag(name = "Booking (Hành khách & Lời mời)",
        description = "Mời hành khách, thay đổi hành khách, chat hỗ trợ trong booking")
public class BookingPassengerController {

    private final BookingService bookingService;
    private final BookingInvitationService invitationService;
    private final BookingInvitationNotificationService invitationNotificationService;
    private final BookingPassengerChangeService changeService;
    private final BookingChatService chatService;
    private final BookingPassengerRepository passengerRepository;
    private final BookingPassengerChangeRepository changeRepository;

    // ── Hành khách ───────────────────────────────────────────────────────────

    @GetMapping("/{bookingId}/passengers")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách hành khách trong booking",
            description = "Hành khách được mời chỉ thấy thông tin cá nhân của chính mình; "
                    + "thông tin của hành khách khác bị ẩn.")
    public ResponseEntity<ApiResponse<List<BookingPassengerResponse>>> listPassengers(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Booking booking = bookingService.findOrThrow(bookingId);
        requireAccess(booking, userPrincipal.getId());
        BookingResponse detail = bookingService.buildResponse(booking, userPrincipal.getId(), false);
        List<BookingPassengerResponse> passengers =
                detail.passengers() != null ? detail.passengers() : List.of();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách hành khách thành công", passengers));
    }

    // ── Lời mời ──────────────────────────────────────────────────────────────

    @PostMapping("/{bookingId}/passengers/{passengerId}/invitations")
    @PreAuthorize("hasAnyRole('TOURIST', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Gửi lời mời tham gia tour cho một hành khách",
            description = "Chỉ người đặt tour được gửi lời mời. Lời mời hết hạn sau 24 giờ, "
                    + "chỉ dùng được một lần và bị thu hồi khi booking bị hủy.")
    public ResponseEntity<ApiResponse<InvitationResponse>> invite(
            @PathVariable Long bookingId,
            @PathVariable Long passengerId,
            @RequestParam(required = false) String email,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Booking booking = bookingService.findOrThrow(bookingId);
        requireOwner(booking, userPrincipal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Đã gửi lời mời",
                invitationService.invite(booking, passengerId, userPrincipal.getId(), email)));
    }

    @GetMapping("/invitations/{token}")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xem thông tin lời mời (trước khi xác nhận)")
    public ResponseEntity<ApiResponse<InvitationResponse>> previewInvitation(@PathVariable String token) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin lời mời thành công",
                invitationService.preview(token)));
    }

    @PostMapping("/invitations/{token}/accept")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xác nhận lời mời tham gia tour",
            description = "Email đang đăng nhập phải trùng email được mời. Xác nhận một lần duy nhất.")
    public ResponseEntity<ApiResponse<InvitationResponse>> acceptInvitation(
            @PathVariable String token,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.success("Xác nhận lời mời thành công",
                invitationService.accept(token, userPrincipal.getId())));
    }

    // ── Lời mời trong app (không cần deep link) ───────────────────────────────
    //
    // ⚠️ Đường dẫn cố tình KHÁC `/invitations/{token}` (đang public) để không bị
    // matcher `/api/v1/bookings/invitations/*` mở ra ngoài — endpoint này phải
    // yêu cầu đăng nhập.

    @GetMapping("/my-invitations")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Các lời mời tham gia tour đang chờ tôi xác nhận",
            description = "Dùng khi người dùng đăng nhập/đăng ký bằng email đã được gửi lời mời: "
                    + "lời mời sẽ hiện trong trung tâm thông báo của app và có thể xác nhận tại đây. "
                    + "Lần gọi này cũng tạo thông báo cho các lời mời chưa được báo trước đó.")
    public ResponseEntity<ApiResponse<List<PendingInvitationResponse>>> listMyPendingInvitations(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        String email = userPrincipal.getEmail();
        // Đồng bộ thông báo cho các lời mời chưa từng báo (VD: lời mời gửi sau lần đăng nhập).
        invitationNotificationService.notifyPendingInvitations(userPrincipal.getId(), email);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách lời mời thành công",
                invitationNotificationService.listPending(userPrincipal.getId(), email)));
    }

    @PostMapping("/my-invitations/{invitationId}/confirm")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xác nhận lời mời tham gia tour trong app",
            description = "Xác nhận bằng ID lời mời (từ thông báo trong app) — không cần deep link. "
                    + "Email đang đăng nhập phải trùng email được mời. "
                    + "Sau khi xác nhận, hành khách được liên kết với tài khoản và có quyền xem booking.")
    public ResponseEntity<ApiResponse<InvitationResponse>> confirmInvitation(
            @PathVariable Long invitationId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.success("Xác nhận lời mời thành công",
                invitationService.acceptById(invitationId, userPrincipal.getId())));
    }

    // ── Thay đổi hành khách ──────────────────────────────────────────────────

    @PostMapping("/{bookingId}/passengers/{passengerId}/change-requests")
    @PreAuthorize("hasAnyRole('TOURIST', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Gửi yêu cầu thay đổi hành khách",
            description = "Chỉ người đặt tour được gửi yêu cầu. Đối tác duyệt/từ chối sau đó.")
    public ResponseEntity<ApiResponse<PassengerChangeResponse>> requestChange(
            @PathVariable Long bookingId,
            @PathVariable Long passengerId,
            @Valid @RequestBody ChangePassengerRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Booking booking = bookingService.findOrThrow(bookingId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Đã gửi yêu cầu thay đổi hành khách",
                changeService.requestChange(booking, passengerId, userPrincipal.getId(), request)));
    }

    @GetMapping("/{bookingId}/change-requests")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lịch sử yêu cầu thay đổi hành khách của booking")
    public ResponseEntity<ApiResponse<List<PassengerChangeResponse>>> listChanges(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Booking booking = bookingService.findOrThrow(bookingId);
        requireAccess(booking, userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử thay đổi hành khách thành công",
                changeService.listChanges(bookingId)));
    }

    @PostMapping("/{bookingId}/change-requests/{changeId}/approve")
    @PreAuthorize("hasAnyRole('CONTENT_PROVIDER', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Đối tác duyệt yêu cầu thay đổi hành khách",
            description = "Chỉ đối tác sở hữu tour mới được xử lý. Nếu chênh lệch giá khác 0, "
                    + "đối tác phải xác nhận đã xử lý phần chênh lệch.")
    public ResponseEntity<ApiResponse<PassengerChangeResponse>> approveChange(
            @PathVariable Long bookingId,
            @PathVariable Long changeId,
            @RequestParam(defaultValue = "false") boolean acceptPriceDifference,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Booking booking = bookingService.findOrThrow(bookingId);
        requireTourProvider(booking, userPrincipal.getId());
        BookingPassengerChange change = findChange(bookingId, changeId);
        return ResponseEntity.ok(ApiResponse.success("Đã duyệt yêu cầu thay đổi hành khách",
                changeService.approve(change, userPrincipal.getId(), acceptPriceDifference)));
    }

    @PostMapping("/{bookingId}/change-requests/{changeId}/reject")
    @PreAuthorize("hasAnyRole('CONTENT_PROVIDER', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Đối tác từ chối yêu cầu thay đổi hành khách")
    public ResponseEntity<ApiResponse<PassengerChangeResponse>> rejectChange(
            @PathVariable Long bookingId,
            @PathVariable Long changeId,
            @RequestParam(required = false) String reason,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Booking booking = bookingService.findOrThrow(bookingId);
        requireTourProvider(booking, userPrincipal.getId());
        BookingPassengerChange change = findChange(bookingId, changeId);
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối yêu cầu thay đổi hành khách",
                changeService.reject(change, userPrincipal.getId(), reason)));
    }

    // ── Chat hỗ trợ ──────────────────────────────────────────────────────────

    @GetMapping("/{bookingId}/messages")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách tin nhắn hỗ trợ của booking")
    public ResponseEntity<ApiResponse<List<BookingMessageResponse>>> listMessages(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Booking booking = bookingService.findOrThrow(bookingId);
        requireAccess(booking, userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tin nhắn thành công",
                chatService.list(booking)));
    }

    @PostMapping("/{bookingId}/messages")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Gửi tin nhắn hỗ trợ trong booking")
    public ResponseEntity<ApiResponse<BookingMessageResponse>> sendMessage(
            @PathVariable Long bookingId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Booking booking = bookingService.findOrThrow(bookingId);
        requireAccess(booking, userPrincipal.getId());
        BookingMessageResponse response = chatService.send(booking, userPrincipal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Đã gửi tin nhắn", response));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private BookingPassengerChange findChange(Long bookingId, Long changeId) {
        BookingPassengerChange change = changeRepository.findById(changeId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_PASSENGER_CHANGE_NOT_FOUND));
        if (change.getBooking() == null || !change.getBooking().getId().equals(bookingId)) {
            throw new AppException(ErrorCode.BOOKING_PASSENGER_CHANGE_NOT_FOUND);
        }
        return change;
    }

    /** Người đặt tour — quyền quản lý booking. */
    private void requireOwner(Booking booking, Long userId) {
        if (booking.getTourist() == null || !booking.getTourist().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED,
                    "Chỉ người đặt tour mới được thực hiện thao tác này");
        }
    }

    /** Đối tác sở hữu tour. */
    private void requireTourProvider(Booking booking, Long userId) {
        if (booking.getTour() == null || booking.getTour().getCreatedBy() == null
                || !booking.getTour().getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED,
                    "Chỉ đối tác sở hữu tour mới được thực hiện thao tác này");
        }
    }

    /** Người đặt, đối tác sở hữu tour, hoặc hành khách đã liên kết tài khoản. */
    private void requireAccess(Booking booking, Long userId) {
        if (!chatService.canAccess(booking, userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED,
                    "Bạn không có quyền truy cập thông tin của booking này");
        }
    }

    /** Danh sách hành khách chỉ hiển thị hành khách còn hiệu lực. */
    private List<BookingPassenger> activeOnly(List<BookingPassenger> passengers) {
        return passengers.stream()
                .filter(p -> p.getStatus() == BookingPassengerStatus.ACTIVE)
                .toList();
    }

    /** Yêu cầu thay đổi đang chờ xử lý. */
    private boolean hasPendingChange(Long bookingId) {
        return changeRepository
                .findByBooking_IdAndStatusOrderByCreatedAtDesc(bookingId, PassengerChangeStatus.PENDING)
                .stream()
                .findAny()
                .isPresent();
    }
}
