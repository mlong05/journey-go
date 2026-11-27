package com.journeygo.modules.audit.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.audit.dto.SystemAuditLogResponse;
import com.journeygo.modules.audit.service.SystemAuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Nhật ký kiểm toán hệ thống")
@SecurityRequirement(name = "Bearer Authentication")
public class SystemAuditLogController {

    private final SystemAuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Danh sách nhật ký kiểm toán hệ thống (Admin)")
    public ResponseEntity<ApiResponse<PageResponse<SystemAuditLogResponse>>> list(
            @Parameter(description = "Nhóm thao tác: AUTH / RBAC / CONTENT / FINANCE / MODERATION / REVIEW / SYSTEM")
            @RequestParam(required = false) String category,
            @Parameter(description = "Hành động cụ thể")
            @RequestParam(required = false) String action,
            @Parameter(description = "ID người thực hiện")
            @RequestParam(required = false) Long actorId,
            @Parameter(description = "Từ khoá tìm kiếm")
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<SystemAuditLogResponse> page = PageResponse.from(
                auditLogService.list(category, action, actorId, keyword, pageable));
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách nhật ký kiểm toán thành công", page));
    }

    @GetMapping("/actions")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Danh sách hành động có trong nhật ký (dùng cho bộ lọc)")
    public ResponseEntity<ApiResponse<List<String>>> actions() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách hành động thành công",
                auditLogService.knownActions()));
    }

    /** Lấy IP thật của client (ưu tiên {@code X-Forwarded-For}). */
    private String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
