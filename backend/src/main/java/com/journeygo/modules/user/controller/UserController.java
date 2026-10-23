package com.journeygo.modules.user.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.auth.dto.UserResponse;
import com.journeygo.modules.user.dto.AdminCreateUserRequest;
import com.journeygo.modules.user.dto.AdminUpdateUserRequest;
import com.journeygo.modules.user.dto.UpdateRoleRequest;
import com.journeygo.modules.user.dto.UpdateUserStatusRequest;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.service.UserService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "User Management (Admin)", description = "APIs quản lý người dùng dành riêng cho vai trò ADMIN")
public class UserController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "Xem danh sách người dùng", description = "Hỗ trợ tìm kiếm theo từ khóa (email, tên, sđt), lọc theo vai trò (role), trạng thái kích hoạt (active) và phân trang. Để sort, truyền 'id,asc' hoặc 'createdAt,desc'.")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getAllUsers(
            @Parameter(description = "Từ khóa tìm kiếm (email, họ tên hoặc số điện thoại)")
            @RequestParam(required = false) String keyword,
            @Parameter(description = "Lọc theo vai trò (TOURIST, MODERATOR, PROVIDER, ADMIN)")
            @RequestParam(required = false) Role role,
            @Parameter(description = "Lọc theo trạng thái kích hoạt (true/false)")
            @RequestParam(required = false) Boolean active,
            @ParameterObject @PageableDefault(size = 20, sort = "id") Pageable pageable
    ) {
        Page<UserResponse> users = userService.getAllUsers(keyword, role, active, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách người dùng thành công", users));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết người dùng theo ID")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(
            @PathVariable Long id
    ) {
        UserResponse user = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin người dùng thành công", user));
    }

    @PostMapping
    @Operation(summary = "Tạo mới người dùng bởi Admin")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody AdminCreateUserRequest request
    ) {
        UserResponse user = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo người dùng mới thành công", user));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin người dùng")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody AdminUpdateUserRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        UserResponse updated = userService.updateUser(id, request, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin người dùng thành công", updated));
    }

    @PatchMapping("/{id}/role")
    @Operation(summary = "Cập nhật vai trò (Role) của người dùng")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRoleRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        UserResponse updated = userService.updateUserRole(id, request, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật vai trò người dùng thành công", updated));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Cập nhật trạng thái kích hoạt/vô hiệu hóa của người dùng")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        UserResponse updated = userService.setUserActiveStatus(id, request.active(), currentUser.getId());
        String msg = Boolean.TRUE.equals(request.active())
                ? "Kích hoạt người dùng thành công"
                : "Vô hiệu hóa người dùng thành công";
        return ResponseEntity.ok(ApiResponse.success(msg, updated));
    }

    @PostMapping("/{id}/deactivate")
    @Operation(summary = "Vô hiệu hóa (khóa) người dùng nhanh")
    public ResponseEntity<ApiResponse<UserResponse>> deactivateUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        UserResponse updated = userService.setUserActiveStatus(id, false, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Vô hiệu hóa người dùng thành công", updated));
    }

    @PostMapping("/{id}/activate")
    @Operation(summary = "Kích hoạt (mở khóa) người dùng nhanh")
    public ResponseEntity<ApiResponse<UserResponse>> activateUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        UserResponse updated = userService.setUserActiveStatus(id, true, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Kích hoạt người dùng thành công", updated));
    }
}
