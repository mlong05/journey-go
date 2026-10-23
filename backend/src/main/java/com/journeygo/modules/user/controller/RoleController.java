package com.journeygo.modules.user.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.user.dto.CreateRoleRequest;
import com.journeygo.modules.user.dto.RoleResponse;
import com.journeygo.modules.user.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Role Management (Admin)", description = "APIs quản lý vai trò người dùng dành riêng cho vai trò ADMIN")
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả vai trò", description = "Lấy toàn bộ danh sách các vai trò hiện có trong hệ thống bao gồm vai trò mặc định và vai trò tùy chỉnh.")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getAllRoles() {
        List<RoleResponse> roles = roleService.getAllRoles();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách vai trò thành công", roles));
    }

    @PostMapping
    @Operation(summary = "Tạo mới một vai trò", description = "Admin tạo vai trò mới cho hệ thống. Tên vai trò tự động được chuẩn hóa thành chữ hoa.")
    public ResponseEntity<ApiResponse<RoleResponse>> createRole(
            @Valid @RequestBody CreateRoleRequest request
    ) {
        RoleResponse role = roleService.createRole(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo vai trò mới thành công", role));
    }
}
