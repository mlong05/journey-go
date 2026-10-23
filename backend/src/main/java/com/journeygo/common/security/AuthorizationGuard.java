package com.journeygo.common.security;

import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.security.UserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Set;

/**
 * Helper kiểm tra quyền truy cập dùng chung cho module experience.
 *
 * Quy tắc chung:
 *   - ADMIN: full quyền, bypass ownership check.
 *   - PROVIDER: được CRUD Experience/Task/CheckInPoint/Question/Answer/Slot
 *     mà mình là owner (createdBy = currentUserId).
 *   - TOURIST: chỉ đọc + check-in.
 *   - Chưa authenticated: Authentication null → trả 401.
 *
 * Ném {@link BusinessException} với mã "FORBIDDEN-..." để FE biết phân biệt
 * với 401 (chưa login) và 404 (không tồn tại).
 */
public final class AuthorizationGuard {

    public static final String FORBIDDEN_NOT_OWNER = "FORBIDDEN-OWNER";
    public static final String FORBIDDEN_NOT_ADMIN = "FORBIDDEN-ADMIN";
    public static final String FORBIDDEN_NOT_PROVIDER = "FORBIDDEN-PROVIDER";

    private AuthorizationGuard() {}

    /**
     * Lấy principal hiện tại. Nếu null (request không qua JWT filter) → 401.
     */
    public static UserPrincipal currentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UserPrincipal up)) {
            throw new BusinessException("UNAUTH-001", "Bạn cần đăng nhập để thực hiện thao tác này");
        }
        return up;
    }

    public static Long currentUserId() {
        return currentPrincipal().getId();
    }

    public static boolean isAdmin() {
        return hasRole("ADMIN");
    }

    public static boolean isProviderOrAdmin() {
        return hasRole("ADMIN") || hasRole("PROVIDER");
    }

    public static boolean hasRole(String roleName) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        String target = "ROLE_" + roleName;
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(target::equals);
    }

    /**
     * Yêu cầu role ADMIN. Ném BusinessException 403 nếu không phải.
     */
    public static void requireAdmin() {
        if (!isAdmin()) {
            throw new BusinessException(FORBIDDEN_NOT_ADMIN,
                    "Chỉ Admin mới có quyền thực hiện thao tác này");
        }
    }

    /**
     * Yêu cầu role ADMIN hoặc PROVIDER.
     */
    public static void requireProviderOrAdmin() {
        if (!isProviderOrAdmin()) {
            throw new BusinessException(FORBIDDEN_NOT_PROVIDER,
                    "Chỉ Provider hoặc Admin mới có quyền thực hiện thao tác này");
        }
    }

    /**
     * Yêu cầu caller là owner của resource (createdById == principal.id) HOẶC là ADMIN.
     *
     * @param ownerId        userId đã tạo resource
     * @param resourceLabel  tên resource (VD: "Experience", "Task") để ghi log
     */
    public static void requireOwnerOrAdmin(Long ownerId, String resourceLabel) {
        if (isAdmin()) return;
        if (ownerId == null) {
            throw new BusinessException(FORBIDDEN_NOT_OWNER,
                    resourceLabel + " không có chủ sở hữu — chỉ Admin mới được phép");
        }
        if (!ownerId.equals(currentUserId())) {
            throw new BusinessException(FORBIDDEN_NOT_OWNER,
                    "Bạn không phải chủ sở hữu của " + resourceLabel + " này");
        }
    }
}
