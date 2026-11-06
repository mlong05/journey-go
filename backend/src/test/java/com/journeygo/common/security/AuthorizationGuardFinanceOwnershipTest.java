package com.journeygo.common.security;

import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.security.UserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Kiểm tra lớp cô lập dữ liệu tài chính {@link AuthorizationGuard#requireFinanceOwnerOrAdmin}.
 *
 * <p>Đây là hồi quy cho lỗi phát hiện trong đợt Post-Refactor Verification: trước đó
 * {@code @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_PROVIDER')")} chỉ chặn được
 * TOURIST/MODERATOR mà KHÔNG chặn được việc một Content Provider đọc số dư ví / doanh thu
 * của đối tác khác.
 */
@DisplayName("AuthorizationGuard — cô lập dữ liệu tài chính giữa các Content Provider")
class AuthorizationGuardFinanceOwnershipTest {

    private static final Long OWNER_USER_ID = 11L;
    private static final Long OTHER_USER_ID = 22L;

    @BeforeEach
    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(String roleName, Long userId) {
        UserPrincipal principal = new UserPrincipal(userId, "user@example.com", "pass",
                "Test User", true, List.of(new SimpleGrantedAuthority("ROLE_" + roleName)));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @Test
    @DisplayName("ADMIN được xem dữ liệu tài chính của mọi đối tác")
    void adminCanAccessAnyProvider() {
        authenticateAs(Role.ADMIN, 1L);

        assertDoesNotThrow(() -> AuthorizationGuard.requireFinanceOwnerOrAdmin(OWNER_USER_ID));
        assertDoesNotThrow(() -> AuthorizationGuard.requireFinanceOwnerOrAdmin(OTHER_USER_ID));
    }

    @Test
    @DisplayName("CONTENT_PROVIDER được xem dữ liệu của chính mình")
    void providerCanAccessOwnData() {
        authenticateAs(Role.CONTENT_PROVIDER, OWNER_USER_ID);

        assertDoesNotThrow(() -> AuthorizationGuard.requireFinanceOwnerOrAdmin(OWNER_USER_ID));
    }

    @Test
    @DisplayName("CONTENT_PROVIDER bị chặn khi xem dữ liệu của đối tác khác")
    void providerCannotAccessOtherProviderData() {
        authenticateAs(Role.CONTENT_PROVIDER, OWNER_USER_ID);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> AuthorizationGuard.requireFinanceOwnerOrAdmin(OTHER_USER_ID));
        assertEquals(AuthorizationGuard.FORBIDDEN_NOT_FINANCE_OWNER, ex.getCode());
    }

    @Test
    @DisplayName("CONTENT_PROVIDER bị chặn khi hồ sơ đối tác không có chủ sở hữu")
    void providerCannotAccessOrphanProfile() {
        authenticateAs(Role.CONTENT_PROVIDER, OWNER_USER_ID);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> AuthorizationGuard.requireFinanceOwnerOrAdmin(null));
        assertEquals(AuthorizationGuard.FORBIDDEN_NOT_FINANCE_OWNER, ex.getCode());
    }

    @Test
    @DisplayName("TOURIST và CONTENT_MODERATOR bị chặn toàn bộ dữ liệu tài chính")
    void touristAndModeratorAreBlocked() {
        for (String role : List.of(Role.TOURIST, Role.CONTENT_MODERATOR)) {
            authenticateAs(role, OWNER_USER_ID);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> AuthorizationGuard.requireFinanceOwnerOrAdmin(OWNER_USER_ID),
                    "Role " + role + " phải bị chặn");
            assertEquals(AuthorizationGuard.FORBIDDEN_NOT_FINANCE_OWNER, ex.getCode());
        }
    }

    @Test
    @DisplayName("Chưa xác thực thì bị chặn, không rò rỉ dữ liệu")
    void unauthenticatedIsBlocked() {
        BusinessException ex = assertThrows(BusinessException.class,
                () -> AuthorizationGuard.requireFinanceOwnerOrAdmin(OWNER_USER_ID));
        assertTrue(ex.getCode().startsWith("UNAUTH") || ex.getCode().equals(AuthorizationGuard.FORBIDDEN_NOT_FINANCE_OWNER));
    }
}
