package com.journeygo.modules.aiguide.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.aiguide.dto.AiKnowledgeDocumentDto;
import com.journeygo.modules.aiguide.dto.AiKnowledgeDocumentUpdateRequest;
import com.journeygo.modules.aiguide.entity.AiDocumentScope;
import com.journeygo.modules.aiguide.entity.AiDocumentType;
import com.journeygo.modules.aiguide.service.AiKnowledgeDocumentService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * Controller quản lý các tệp Context và Rule do Quản trị viên bổ sung cho AI RAG.
 */
@RestController
@RequestMapping("/api/v1/admin/ai/documents")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "AI Guide Admin Documents", description = "Quản lý tài liệu Context (.txt, .md, .docx, .pdf) và Quy tắc hành vi AI (AI_RULE)")
public class AdminAiDocumentController {

    private final AiKnowledgeDocumentService documentService;

    @Operation(summary = "Danh sách tài liệu Context & Rule cho AI (có lọc & phân trang)")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AiKnowledgeDocumentDto>>> listDocuments(
            @RequestParam(required = false) AiDocumentType docType,
            @RequestParam(required = false) AiDocumentScope scope,
            @RequestParam(required = false) Long destinationId,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách tài liệu AI thành công",
                documentService.listDocuments(docType, scope, destinationId, active, pageable)
        ));
    }

    @Operation(summary = "Xem chi tiết và toàn bộ văn bản đã trích xuất của một tài liệu")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AiKnowledgeDocumentDto>> getDocument(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết tài liệu thành công", documentService.getDocument(id)));
    }

    @Operation(summary = "Tải lên file Context/Rule (.txt, .md, .docx, .pdf) hoặc tạo trực tiếp từ văn bản")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AiKnowledgeDocumentDto>> createDocument(
            @RequestParam String title,
            @RequestParam AiDocumentType docType,
            @RequestParam(defaultValue = "GLOBAL") AiDocumentScope scope,
            @RequestParam(required = false) Long destinationId,
            @RequestParam(required = false) String rawText,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @RequestParam(defaultValue = "true") boolean active,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Long userId = currentUser != null ? currentUser.getId() : null;
        AiKnowledgeDocumentDto created = documentService.createDocument(
                title, docType, scope, destinationId, rawText, file, active, userId
        );
        return ResponseEntity.ok(ApiResponse.success("Nạp tài liệu AI thành công", created));
    }

    @Operation(summary = "Cập nhật thông tin hoặc nội dung tài liệu và đồng bộ lại Vector Store")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AiKnowledgeDocumentDto>> updateDocument(
            @PathVariable Long id,
            @Valid @RequestBody AiKnowledgeDocumentUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tài liệu thành công", documentService.updateDocument(id, request)));
    }

    @Operation(summary = "Bật/tắt áp dụng tài liệu (tự động nạp hoặc gỡ vector / rule)")
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<AiKnowledgeDocumentDto>> toggleStatus(
            @PathVariable Long id,
            @RequestParam boolean active) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái tài liệu thành công", documentService.toggleActive(id, active)));
    }

    @Operation(summary = "Đánh chỉ mục (embedding) lại cho tài liệu")
    @PostMapping("/{id}/reindex")
    public ResponseEntity<ApiResponse<AiKnowledgeDocumentDto>> reindexDocument(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Đồng bộ lại vector tài liệu thành công", documentService.reindexDocument(id)));
    }

    @Operation(summary = "Xóa tài liệu và toàn bộ vector chunks / file gốc liên quan")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable Long id) {
        documentService.deleteDocument(id);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa tài liệu AI thành công", null));
    }
}
