package com.journeygo.modules.providerchat.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.providerchat.dto.request.SendProviderMessageRequest;
import com.journeygo.modules.providerchat.dto.request.StartProviderConversationRequest;
import com.journeygo.modules.providerchat.dto.response.ProviderConversationResponse;
import com.journeygo.modules.providerchat.dto.response.ProviderMessageResponse;
import com.journeygo.modules.providerchat.service.ProviderChatService;
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
 * API chat trực tiếp với nhà tour — KHÔNG cần đã mua tour.
 *
 * <p>Du khách mở từ chi tiết tour ("Chat với bên ..."), xem lại lịch sử ở mục
 * Tài khoản → Vé & hỗ trợ → "Hỗ trợ từ nhà tour".
 */
@RestController
@RequestMapping("/api/v1/provider-chat")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Provider Chat (Hỗ trợ từ nhà tour)",
        description = "Chat trực tiếp giữa du khách và nhà tour, không cần đã mua tour")
public class ProviderChatController {

    private final ProviderChatService chatService;

    // ── Du khách ──────────────────────────────────────────────────────────────

    @PostMapping("/conversations")
    @PreAuthorize("hasAnyRole('TOURIST', 'ADMIN')")
    @Operation(summary = "Mở (hoặc lấy lại) cuộc trò chuyện với nhà tour",
            description = "Nhận tourId để xác định nhà tour. Mỗi cặp du khách – nhà tour chỉ có "
                    + "một cuộc trò chuyện nên lịch sử được gom lại theo từng nhà tour.")
    public ResponseEntity<ApiResponse<ProviderConversationResponse>> start(
            @RequestBody(required = false) StartProviderConversationRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.success("Mở cuộc trò chuyện thành công",
                chatService.start(userPrincipal.getId(), request)));
    }

    @GetMapping("/conversations")
    @PreAuthorize("hasAnyRole('TOURIST', 'ADMIN')")
    @Operation(summary = "Danh sách cuộc trò chuyện của tôi (tab \"Hỗ trợ từ nhà tour\")")
    public ResponseEntity<ApiResponse<List<ProviderConversationResponse>>> listConversations(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách cuộc trò chuyện thành công",
                chatService.listForTouristSorted(userPrincipal.getId())));
    }

    @GetMapping("/conversations/{conversationId}/messages")
    @Operation(summary = "Danh sách tin nhắn của cuộc trò chuyện")
    public ResponseEntity<ApiResponse<List<ProviderMessageResponse>>> listMessages(
            @PathVariable Long conversationId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tin nhắn thành công",
                chatService.listMessages(conversationId, userPrincipal.getId())));
    }

    @PostMapping("/conversations/{conversationId}/messages")
    @Operation(summary = "Gửi tin nhắn cho nhà tour")
    public ResponseEntity<ApiResponse<ProviderMessageResponse>> sendMessage(
            @PathVariable Long conversationId,
            @Valid @RequestBody SendProviderMessageRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Đã gửi tin nhắn",
                chatService.send(conversationId, userPrincipal.getId(), request)));
    }

    // ── Nhà tour ──────────────────────────────────────────────────────────────

    @GetMapping("/provider/conversations")
    @PreAuthorize("hasAnyRole('CONTENT_PROVIDER', 'ADMIN')")
    @Operation(summary = "Danh sách cuộc trò chuyện khách hàng gửi tới tôi")
    public ResponseEntity<ApiResponse<List<ProviderConversationResponse>>> listProviderConversations(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách cuộc trò chuyện thành công",
                chatService.listForProvider(userPrincipal.getId())));
    }
}
