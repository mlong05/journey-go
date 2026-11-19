package com.journeygo.modules.aiguide.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.aiguide.dto.AiChatMessageDto;
import com.journeygo.modules.aiguide.dto.AiChatRequest;
import com.journeygo.modules.aiguide.dto.AiChatResponse;
import com.journeygo.modules.aiguide.dto.AiChatSessionDto;
import com.journeygo.modules.aiguide.service.VirtualGuideChatService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai-guide")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
@Tag(name = "AI Virtual Guide", description = "Các API hỏi đáp thuyết minh viên ảo du lịch RAG và gợi ý nhiệm vụ")
@SecurityRequirement(name = "Bearer Authentication")
public class AiGuideChatController {

    private final VirtualGuideChatService virtualGuideChatService;

    @Operation(summary = "Gửi câu hỏi tới AI Virtual Guide",
            description = "Tự động phân biệt Normal Guide Mode và Task Hint Mode (khi có taskId), tìm kiếm vector kiến thức và phản hồi thông minh.")
    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatResponse>> chat(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody AiChatRequest request) {
        log.info("Du khách userId={} đặt câu hỏi cho AI Guide, destinationId={}, taskId={}",
                currentUser.getId(), request.getDestinationId(), request.getTaskId());

        AiChatResponse response = virtualGuideChatService.chat(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Phản hồi từ AI Virtual Guide thành công", response));
    }

    @Operation(summary = "Tạo mới hoặc lấy phiên hội thoại",
            description = "Khởi tạo một phiên trò chuyện mới cho du khách (forceNew=true) hoặc lấy lại phiên gần nhất.")
    @PostMapping("/sessions")
    public ResponseEntity<ApiResponse<AiChatSessionDto>> createOrGetSession(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam(required = false) Long destinationId,
            @RequestParam(defaultValue = "false") boolean forceNew) {
        AiChatSessionDto session = virtualGuideChatService.getOrCreateSession(
                currentUser.getId(), destinationId, forceNew);
        return ResponseEntity.ok(ApiResponse.success("Khởi tạo phiên hội thoại thành công", session));
    }

    @Operation(summary = "Lấy danh sách các phiên trò chuyện của du khách",
            description = "Trả về lịch sử các phiên chat của du khách hiện tại có phân trang.")
    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<PageResponse<AiChatSessionDto>>> getUserSessions(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<AiChatSessionDto> sessions = virtualGuideChatService.getUserSessions(currentUser.getId(), pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách phiên hội thoại thành công", PageResponse.from(sessions)));
    }

    @Operation(summary = "Lấy lịch sử tin nhắn trong phiên",
            description = "Trả về toàn bộ tin nhắn đã trao đổi trong một phiên trò chuyện của du khách.")
    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<ApiResponse<List<AiChatMessageDto>>> getSessionMessages(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Parameter(description = "ID phiên trò chuyện") @PathVariable UUID sessionId) {
        List<AiChatMessageDto> messages = virtualGuideChatService.getSessionMessages(sessionId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử tin nhắn thành công", messages));
    }

    @Operation(summary = "Xóa phiên trò chuyện",
            description = "Xóa vĩnh viễn một phiên trò chuyện và lịch sử tin nhắn thuộc quyền sở hữu của du khách.")
    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Parameter(description = "ID phiên trò chuyện") @PathVariable UUID sessionId) {
        virtualGuideChatService.deleteSession(sessionId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Xóa phiên trò chuyện thành công", null));
    }
}
