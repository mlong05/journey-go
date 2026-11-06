package com.journeygo.modules.user.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.auth.dto.UserResponse;
import com.journeygo.modules.auth.service.RefreshTokenService;
import com.journeygo.modules.providerprofile.service.ProviderProfileService;
import com.journeygo.modules.user.dto.AdminCreateUserRequest;
import com.journeygo.modules.user.dto.AdminUpdateUserRequest;
import com.journeygo.modules.user.dto.UpdateRoleRequest;
import com.journeygo.modules.user.entity.AuthProvider;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.RoleRepository;
import com.journeygo.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private ProviderProfileService providerProfileService;

    @InjectMocks
    private UserService userService;

    private User sampleUser;
    private User adminUser;
    private Role touristRole;
    private Role adminRole;
    private Role moderatorRole;
    private Role providerRole;

    @BeforeEach
    void setUp() {
        touristRole = new Role(1L, Role.TOURIST);
        adminRole = new Role(2L, Role.ADMIN);
        moderatorRole = new Role(3L, Role.CONTENT_MODERATOR);
        providerRole = new Role(4L, Role.CONTENT_PROVIDER);

        sampleUser = User.builder()
                .id(2L)
                .email("user@journeygo.com")
                .password("encoded_password")
                .fullName("Nguyen Van B")
                .phone("0987654321")
                .role(touristRole)
                .authProvider(AuthProvider.LOCAL)
                .active(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        adminUser = User.builder()
                .id(1L)
                .email("admin@journeygo.com")
                .password("encoded_admin_pass")
                .fullName("Admin User")
                .role(adminRole)
                .authProvider(AuthProvider.LOCAL)
                .active(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("Admin tạo tài khoản thành công")
    void createUser_Success() {
        AdminCreateUserRequest request = new AdminCreateUserRequest(
                "newuser@journeygo.com",
                "Password123@",
                "Tran Van C",
                "0911223344",
                moderatorRole,
                true,
                null,
                null
        );

        when(userRepository.existsByEmail("newuser@journeygo.com")).thenReturn(false);
        when(roleRepository.findByName(Role.CONTENT_MODERATOR)).thenReturn(Optional.of(moderatorRole));
        when(passwordEncoder.encode("Password123@")).thenReturn("encoded_pass");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(3L);
            return u;
        });

        UserResponse response = userService.createUser(request);

        assertNotNull(response);
        assertEquals(3L, response.id());
        assertEquals("newuser@journeygo.com", response.email());
        assertEquals(moderatorRole, response.role());
        assertTrue(response.active());
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Admin tạo tài khoản thất bại do email đã tồn tại")
    void createUser_EmailExists_ThrowsException() {
        AdminCreateUserRequest request = new AdminCreateUserRequest(
                "user@journeygo.com",
                "Password123@",
                "Nguyen Van B",
                null,
                null,
                null,
                null,
                null
        );

        when(userRepository.existsByEmail("user@journeygo.com")).thenReturn(true);

        AppException ex = assertThrows(AppException.class, () -> userService.createUser(request));
        assertEquals(ErrorCode.USER_EXISTED, ex.getErrorCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Lấy danh sách người dùng có phân trang và bộ lọc thành công")
    void getAllUsers_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<User> page = new PageImpl<>(List.of(sampleUser, adminUser), pageable, 2);

        when(userRepository.searchUsers("journey", touristRole, true, pageable)).thenReturn(page);

        Page<UserResponse> result = userService.getAllUsers("  journey  ", touristRole, true, pageable);

        assertNotNull(result);
        assertEquals(2, result.getTotalElements());
        assertEquals("user@journeygo.com", result.getContent().get(0).email());
        verify(userRepository).searchUsers("journey", touristRole, true, pageable);
    }

    @Test
    @DisplayName("Lấy danh sách người dùng với trường sort không hợp lệ (như 'string' từ Swagger) sẽ tự động fallback về sort id an toàn")
    void getAllUsers_InvalidSort_FallbackToDefaultSort() {
        Pageable pageable = PageRequest.of(0, 10, org.springframework.data.domain.Sort.by("string"));
        Pageable expectedPageable = PageRequest.of(0, 10, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "id"));
        Page<User> page = new PageImpl<>(List.of(sampleUser), expectedPageable, 1);

        when(userRepository.searchUsers(null, null, null, expectedPageable)).thenReturn(page);

        Page<UserResponse> result = userService.getAllUsers(null, null, null, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(userRepository).searchUsers(null, null, null, expectedPageable);
    }

    @Test
    @DisplayName("Lấy chi tiết người dùng theo ID thành công")
    void getUserById_Success() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(sampleUser));

        UserResponse response = userService.getUserById(2L);

        assertNotNull(response);
        assertEquals(2L, response.id());
        assertEquals("user@journeygo.com", response.email());
    }

    @Test
    @DisplayName("Lấy chi tiết người dùng thất bại khi ID không tồn tại")
    void getUserById_NotFound_ThrowsException() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class, () -> userService.getUserById(99L));
        assertEquals(ErrorCode.USER_NOT_EXISTED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Cập nhật vai trò người dùng thành công và thu hồi refresh tokens")
    void updateUserRole_Success() {
        UpdateRoleRequest request = new UpdateRoleRequest(moderatorRole);
        when(userRepository.findById(2L)).thenReturn(Optional.of(sampleUser));
        when(roleRepository.findByName(Role.CONTENT_MODERATOR)).thenReturn(Optional.of(moderatorRole));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        UserResponse response = userService.updateUserRole(2L, request, 1L);

        assertNotNull(response);
        assertEquals(moderatorRole, response.role());
        verify(refreshTokenService).revokeAllUserTokens(sampleUser);
        verify(userRepository).save(sampleUser);
    }

    @Test
    @DisplayName("Admin không thể tự cập nhật vai trò của chính mình")
    void updateUserRole_SelfModification_ThrowsException() {
        UpdateRoleRequest request = new UpdateRoleRequest(touristRole);

        AppException ex = assertThrows(AppException.class, () -> userService.updateUserRole(1L, request, 1L));
        assertEquals(ErrorCode.CANNOT_MODIFY_OWN_ROLE, ex.getErrorCode());
        verify(userRepository, never()).save(any());
        verify(refreshTokenService, never()).revokeAllUserTokens(any());
    }

    @Test
    @DisplayName("Cập nhật chi tiết người dùng thành công")
    void updateUser_Success() {
        AdminUpdateUserRequest request = new AdminUpdateUserRequest(
                "Nguyen Van Updated",
                "0999888777",
                providerRole,
                true,
                null,
                null
        );

        when(userRepository.findById(2L)).thenReturn(Optional.of(sampleUser));
        when(roleRepository.findByName(Role.CONTENT_PROVIDER)).thenReturn(Optional.of(providerRole));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        UserResponse response = userService.updateUser(2L, request, 1L);

        assertNotNull(response);
        assertEquals("Nguyen Van Updated", response.fullName());
        assertEquals("0999888777", response.phone());
        assertEquals(providerRole, response.role());
        verify(refreshTokenService).revokeAllUserTokens(sampleUser);
        verify(userRepository).save(sampleUser);
        // Cấp role CONTENT_PROVIDER → phải tự động bảo đảm ProviderProfile + Wallet.
        verify(providerProfileService).ensureProfileAndWallet(sampleUser);
    }

    @Test
    @DisplayName("Vô hiệu hóa (khóa) người dùng thành công và thu hồi refresh tokens")
    void setUserActiveStatus_Deactivate_Success() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        UserResponse response = userService.setUserActiveStatus(2L, false, 1L);

        assertNotNull(response);
        assertFalse(response.active());
        verify(refreshTokenService).revokeAllUserTokens(sampleUser);
        verify(userRepository).save(sampleUser);
    }

    @Test
    @DisplayName("Kích hoạt (mở khóa) người dùng thành công")
    void setUserActiveStatus_Activate_Success() {
        sampleUser.setActive(false);
        when(userRepository.findById(2L)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        UserResponse response = userService.setUserActiveStatus(2L, true, 1L);

        assertNotNull(response);
        assertTrue(response.active());
        verify(refreshTokenService, never()).revokeAllUserTokens(sampleUser);
        verify(userRepository).save(sampleUser);
    }

    @Test
    @DisplayName("Admin không thể tự vô hiệu hóa (khóa) tài khoản của mình")
    void setUserActiveStatus_DeactivateSelf_ThrowsException() {
        AppException ex = assertThrows(AppException.class, () -> userService.setUserActiveStatus(1L, false, 1L));
        assertEquals(ErrorCode.CANNOT_DEACTIVATE_SELF, ex.getErrorCode());
        verify(userRepository, never()).save(any());
        verify(refreshTokenService, never()).revokeAllUserTokens(any());
    }

    @Test
    @DisplayName("Admin không thể vô hiệu hóa (khóa) tài khoản của Admin khác")
    void setUserActiveStatus_DeactivateOtherAdmin_ThrowsException() {
        User otherAdmin = User.builder()
                .id(99L)
                .email("other.admin@journeygo.com")
                .fullName("Other Admin")
                .role(adminRole)
                .active(true)
                .build();

        when(userRepository.findById(99L)).thenReturn(Optional.of(otherAdmin));

        AppException ex = assertThrows(AppException.class, () -> userService.setUserActiveStatus(99L, false, 1L));
        assertEquals(ErrorCode.CANNOT_DEACTIVATE_ADMIN, ex.getErrorCode());
        verify(userRepository, never()).save(any());
        verify(refreshTokenService, never()).revokeAllUserTokens(any());
    }

    @Test
    @DisplayName("Admin cập nhật người dùng thất bại khi cố gắng vô hiệu hóa Admin khác")
    void updateUser_DeactivateOtherAdmin_ThrowsException() {
        User otherAdmin = User.builder()
                .id(99L)
                .email("other.admin@journeygo.com")
                .fullName("Other Admin")
                .role(adminRole)
                .active(true)
                .build();

        AdminUpdateUserRequest request = new AdminUpdateUserRequest(
                "Other Admin Updated",
                null,
                null,
                false,
                null,
                null
        );

        when(userRepository.findById(99L)).thenReturn(Optional.of(otherAdmin));

        AppException ex = assertThrows(AppException.class, () -> userService.updateUser(99L, request, 1L));
        assertEquals(ErrorCode.CANNOT_DEACTIVATE_ADMIN, ex.getErrorCode());
        verify(userRepository, never()).save(any());
    }
}
