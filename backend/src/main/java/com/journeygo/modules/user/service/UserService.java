package com.journeygo.modules.user.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.auth.dto.UserResponse;
import com.journeygo.modules.auth.service.RefreshTokenService;
import com.journeygo.modules.user.dto.AdminCreateUserRequest;
import com.journeygo.modules.user.dto.AdminUpdateUserRequest;
import com.journeygo.modules.user.dto.UpdateRoleRequest;
import com.journeygo.modules.user.entity.AuthProvider;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private static final Set<String> ALLOWED_SORT_PROPERTIES = Set.of(
            "id", "email", "fullName", "phone", "role", "authProvider", "active", "createdAt", "updatedAt"
    );

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;

    /**
     * Lấy danh sách người dùng có phân trang và bộ lọc (từ khóa, vai trò, trạng thái kích hoạt).
     */
    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(String keyword, Role role, Boolean active, Pageable pageable) {
        String cleanKeyword = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null;
        Pageable sanitizedPageable = sanitizePageable(pageable);
        return userRepository.searchUsers(cleanKeyword, role, active, sanitizedPageable)
                .map(UserResponse::fromEntity);
    }

    private Pageable sanitizePageable(Pageable pageable) {
        if (pageable == null) {
            return PageRequest.of(0, 20, Sort.by(Sort.Direction.ASC, "id"));
        }
        if (pageable.getSort().isUnsorted()) {
            return pageable;
        }

        List<Sort.Order> validOrders = pageable.getSort().stream()
                .filter(order -> ALLOWED_SORT_PROPERTIES.contains(order.getProperty()))
                .toList();

        Sort sanitizedSort = validOrders.isEmpty()
                ? Sort.by(Sort.Direction.ASC, "id")
                : Sort.by(validOrders);

        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sanitizedSort);
    }

    /**
     * Lấy chi tiết thông tin một người dùng theo ID.
     */
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        User user = findUserOrThrow(id);
        return UserResponse.fromEntity(user);
    }

    /**
     * Admin tạo tài khoản người dùng mới.
     */
    @Transactional
    public UserResponse createUser(AdminCreateUserRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        Role userRole = request.role() != null ? request.role() : Role.TOURIST;
        boolean isActive = request.active() != null ? request.active() : true;

        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .phone(request.phone())
                .role(userRole)
                .authProvider(AuthProvider.LOCAL)
                .active(isActive)
                .build();

        User savedUser = userRepository.save(user);
        log.info("Admin created new user id={}, email={}, role={}", savedUser.getId(), savedUser.getEmail(), savedUser.getRole());
        return UserResponse.fromEntity(savedUser);
    }

    /**
     * Cập nhật vai trò (Role) của người dùng.
     * Admin không được tự đổi role của chính mình để tránh mất quyền quản trị.
     */
    @Transactional
    public UserResponse updateUserRole(Long id, UpdateRoleRequest request, Long currentAdminId) {
        if (id.equals(currentAdminId)) {
            throw new AppException(ErrorCode.CANNOT_MODIFY_OWN_ROLE);
        }

        User user = findUserOrThrow(id);
        if (user.getRole() != request.role()) {
            user.setRole(request.role());
            // Thu hồi các refresh token cũ để buộc người dùng làm mới phiên đăng nhập với quyền mới
            refreshTokenService.revokeAllUserTokens(user);
        }

        User updatedUser = userRepository.save(user);
        log.info("Admin id={} updated role for user id={} to {}", currentAdminId, updatedUser.getId(), updatedUser.getRole());
        return UserResponse.fromEntity(updatedUser);
    }

    /**
     * Cập nhật thông tin chi tiết người dùng bởi Admin.
     */
    @Transactional
    public UserResponse updateUser(Long id, AdminUpdateUserRequest request, Long currentAdminId) {
        User user = findUserOrThrow(id);

        if (request.role() != null && request.role() != user.getRole()) {
            if (id.equals(currentAdminId)) {
                throw new AppException(ErrorCode.CANNOT_MODIFY_OWN_ROLE);
            }
            user.setRole(request.role());
            refreshTokenService.revokeAllUserTokens(user);
        }

        if (request.active() != null && request.active() != user.isActive()) {
            if (id.equals(currentAdminId) && !request.active()) {
                throw new AppException(ErrorCode.CANNOT_DEACTIVATE_SELF);
            }
            user.setActive(request.active());
            if (!user.isActive()) {
                refreshTokenService.revokeAllUserTokens(user);
            }
        }

        user.setFullName(request.fullName());
        if (request.phone() != null) {
            user.setPhone(request.phone());
        }

        User updatedUser = userRepository.save(user);
        log.info("Admin id={} updated user details for user id={}", currentAdminId, updatedUser.getId());
        return UserResponse.fromEntity(updatedUser);
    }

    /**
     * Kích hoạt hoặc vô hiệu hóa tài khoản người dùng.
     * Admin không được tự khóa tài khoản của chính mình.
     */
    @Transactional
    public UserResponse setUserActiveStatus(Long id, boolean active, Long currentAdminId) {
        if (id.equals(currentAdminId) && !active) {
            throw new AppException(ErrorCode.CANNOT_DEACTIVATE_SELF);
        }

        User user = findUserOrThrow(id);
        if (user.isActive() != active) {
            user.setActive(active);
            if (!active) {
                // Vô hiệu hóa tài khoản -> thu hồi mọi refresh token ngay lập tức
                refreshTokenService.revokeAllUserTokens(user);
            }
        }

        User updatedUser = userRepository.save(user);
        log.info("Admin id={} set active status for user id={} to {}", currentAdminId, updatedUser.getId(), active);
        return UserResponse.fromEntity(updatedUser);
    }

    private User findUserOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }
}
