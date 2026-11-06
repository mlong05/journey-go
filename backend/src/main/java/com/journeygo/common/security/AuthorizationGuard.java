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
    public static final String FORBIDDEN_NOT_CONTENT_PROVIDER = "FORBIDDEN-PROVIDER";

    /**
     * Mã lỗi khi Content Provider cố xem dữ liệu tài chính của đối tác khác.
     * Dùng chung cho Wallet / Revenue / Settlement / ProviderProfile.
     */
    public static final String FORBIDDEN_NOT_FINANCE_OWNER = "FORBIDDEN-FINANCE-OWNER";

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

    public static boolean isContentProviderOrAdmin() {
        return hasRole("ADMIN") || hasRole("CONTENT_PROVIDER");
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
    public static void requireContentProviderOrAdmin() {
        if (!isContentProviderOrAdmin()) {
            throw new BusinessException(FORBIDDEN_NOT_CONTENT_PROVIDER,
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

    /**
     * Yêu cầu caller được xem dữ liệu tài chính của một ProviderProfile.
     *
     * <p>Quy tắc cô lập dữ liệu tài chính:
     * <ul>
     *   <li><b>ADMIN</b> — xem được mọi ProviderProfile.</li>
     *   <li><b>CONTENT_PROVIDER</b> — CHỈ xem được dữ liệu của chính mình
     *       (ProviderProfile.user.id == principal.id).</li>
     *   <li><b>Mọi role khác</b> (TOURIST, CONTENT_MODERATOR) — bị chặn hoàn toàn,
     *       kể cả khi trùng {@code userId} với chủ sở hữu hồ sơ.</li>
     * </ul>
     *
     * <p>{@code @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_PROVIDER')}") chỉ chặn được
     * TOURIST/MODERATOR ở tầng controller, nhưng KHÔNG chặn được việc một Content Provider đọc
     * số dư ví và doanh thu của đối tác khác (chỉ cần đổi {@code providerProfileId} trong URL).
     * Hàm này bịt lỗ đó, đồng thời là lớp phòng thủ thứ hai nếu controller bị cấu hình lỏng.
     *
     * @param providerProfileOwnerUserId userId sở hữu ProviderProfile (null nếu hồ sơ không có user)
     */
    public static void requireFinanceOwnerOrAdmin(Long providerProfileOwnerUserId) {
        if (isAdmin()) return;

        // Chỉ CONTENT_PROVIDER mới được phép xem dữ liệu tài chính — và chỉ của chính mình.
        if (!isContentProviderOrAdmin()) {
            throw new BusinessException(FORBIDDEN_NOT_FINANCE_OWNER,
                    "Bạn không có quyền xem dữ liệu tài chính của đối tác");
        }
        if (providerProfileOwnerUserId == null) {
            throw new BusinessException(FORBIDDEN_NOT_FINANCE_OWNER,
                    "Hồ sơ đối tác này không có chủ sở hữu — chỉ Admin mới được xem dữ liệu tài chính");
        }
        if (!providerProfileOwnerUserId.equals(currentUserId())) {
            throw new BusinessException(FORBIDDEN_NOT_FINANCE_OWNER,
                    "Bạn không có quyền xem dữ liệu tài chính của đối tác khác");
        }
    }
}
