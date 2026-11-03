package com.journeygo.modules.notification.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.notification.dto.NotificationResponse;
import com.journeygo.modules.notification.service.NotificationService;
import com.journeygo.modules.notification.service.SseHub;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Notification (Thông báo)", description = "Thông báo trong ứng dụng và luồng thời gian thực (SSE)")
public class NotificationController {

    private final NotificationService notificationService;
    private final SseHub hub;

    @GetMapping
    @Operation(summary = "Danh sách thông báo của tôi (mới nhất trước)")
    public ResponseEntity<ApiResponse<PageResponse<NotificationResponse>>> getMine(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.getMine(principal.getId(), unreadOnly, pageable)));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Số thông báo chưa đọc")
    public ResponseEntity<ApiResponse<Map<String, Long>>> unreadCount(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", notificationService.unreadCount(principal.getId()))));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Đánh dấu một thông báo đã đọc")
    public ResponseEntity<ApiResponse<Map<String, Long>>> markRead(
            @PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", notificationService.markRead(id, principal.getId()))));
    }

    @PatchMapping("/read-all")
    @Operation(summary = "Đánh dấu tất cả đã đọc")
    public ResponseEntity<ApiResponse<Map<String, Long>>> markAllRead(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", notificationService.markAllRead(principal.getId()))));
    }

    /**
     * Luồng thời gian thực. Gửi kèm header {@code Authorization: Bearer ...} (web đọc bằng fetch stream,
     * không dùng EventSource vì EventSource không gửi được header). Sự kiện: {@code notification},
     * {@code unread-count}, {@code queue-changed}; dòng chú thích {@code :ping} mỗi 25 giây.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Luồng thông báo thời gian thực (Server-Sent Events)")
    public SseEmitter stream(@AuthenticationPrincipal UserPrincipal principal) throws IOException {
        SseEmitter emitter = hub.register(principal.getId());
        // Gửi ngay số chưa đọc: client vừa (kết nối lại) có số đúng mà không cần gọi thêm API
        emitter.send(SseEmitter.event().name(NotificationService.EVENT_UNREAD)
                .data(Map.of("count", notificationService.unreadCount(principal.getId())), MediaType.APPLICATION_JSON));
        return emitter;
    }
}
