package com.journeygo.modules.aiguide.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.aiguide.dto.AdminStaffReplyRequest;
import com.journeygo.modules.aiguide.dto.AiChatMessageDto;
import com.journeygo.modules.aiguide.dto.AiChatSessionDto;
import com.journeygo.modules.aiguide.service.VirtualGuideChatService;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller dành cho Admin và Content Moderator tiếp nhận và trò chuyện trực tiếp
 * với các phiên hội thoại du khách yêu cầu hỗ trợ.
 */
@RestController
@RequestMapping("/api/v1/admin/ai/handoff")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "AI Guide Admin Handoff", description = "Quản lý và phản hồi trực tiếp các phiên chat chờ xử lý")
public class AdminAiHandoffController {

    private final VirtualGuideChatService virtualGuideChatService;

    @Operation(summary = "Danh sách các phiên chat theo trạng thái xử lý")
    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<PageResponse<AiChatSessionDto>>> listSessions(
            @RequestParam(defaultValue = "WAITING_HUMAN") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<AiChatSessionDto> result = virtualGuideChatService.getAdminHandoffSessions(status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách phiên chat thành công", PageResponse.from(result)));
    }

    @Operation(summary = "Lấy lịch sử tin nhắn của một phiên chat")
    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<ApiResponse<List<AiChatMessageDto>>> getSessionMessages(
            @Parameter(description = "ID phiên trò chuyện") @PathVariable UUID sessionId) {
        List<AiChatMessageDto> messages = virtualGuideChatService.getAdminSessionMessages(sessionId);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử tin nhắn thành công", messages));
    }

    @Operation(summary = "Tiếp nhận hỗ trợ trực tiếp phiên chat đang chờ")
    @PostMapping("/sessions/{sessionId}/claim")
    public ResponseEntity<ApiResponse<AiChatSessionDto>> claimSession(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Parameter(description = "ID phiên trò chuyện") @PathVariable UUID sessionId) {
        AiChatSessionDto session = virtualGuideChatService.claimHandoffSession(
                sessionId,
                currentUser.getId(),
                resolveStaffName(currentUser),
                resolveStaffRole(currentUser)
        );
        return ResponseEntity.ok(ApiResponse.success("Đã tiếp nhận phiên chat thành công", session));
    }

    @Operation(summary = "Gửi tin nhắn phản hồi trực tiếp tới du khách")
    @PostMapping("/sessions/{sessionId}/reply")
    public ResponseEntity<ApiResponse<AiChatMessageDto>> replySession(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Parameter(description = "ID phiên trò chuyện") @PathVariable UUID sessionId,
            @Valid @RequestBody AdminStaffReplyRequest request) {
        AiChatMessageDto msg = virtualGuideChatService.sendStaffReply(
                sessionId,
                currentUser.getId(),
                resolveStaffName(currentUser),
                resolveStaffRole(currentUser),
                request.getContent()
        );
        return ResponseEntity.ok(ApiResponse.success("Gửi phản hồi trực tiếp thành công", msg));
    }

    @Operation(summary = "Kết thúc hỗ trợ trực tiếp và trả phiên chat về cho AI")
    @PostMapping("/sessions/{sessionId}/resolve")
    public ResponseEntity<ApiResponse<AiChatSessionDto>> resolveSession(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Parameter(description = "ID phiên trò chuyện") @PathVariable UUID sessionId) {
        AiChatSessionDto session = virtualGuideChatService.resolveHandoffSession(
                sessionId,
                currentUser.getId(),
                resolveStaffName(currentUser),
                resolveStaffRole(currentUser)
        );
        return ResponseEntity.ok(ApiResponse.success("Đã kết thúc hỗ trợ trực tiếp", session));
    }

    private String resolveStaffName(UserPrincipal user) {
        if (user == null) {
            return null;
        }
        return StringUtils.hasText(user.getFullName()) ? user.getFullName() : user.getEmail();
    }

    private String resolveStaffRole(UserPrincipal user) {
        if (user != null && user.getAuthorities() != null) {
            boolean isAdmin = user.getAuthorities().stream()
                    .anyMatch(a -> ("ROLE_" + Role.ADMIN).equalsIgnoreCase(a.getAuthority()));
            if (isAdmin) {
                return Role.ADMIN;
            }
        }
        return Role.CONTENT_MODERATOR;
    }
}
