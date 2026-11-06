package com.journeygo.modules.user.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.user.dto.CreateRoleRequest;
import com.journeygo.modules.user.dto.RoleResponse;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.repository.RoleRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoleServiceTest {

    @Mock
    private RoleRepository roleRepository;

    @InjectMocks
    private RoleService roleService;

    @Test
    @DisplayName("Lấy danh sách tất cả các vai trò thành công")
    void getAllRoles_Success() {
        Role r1 = new Role(1L, "TOURIST");
        Role r2 = new Role(2L, "ADMIN");
        when(roleRepository.findAll(any(Sort.class))).thenReturn(List.of(r1, r2));

        List<RoleResponse> results = roleService.getAllRoles();

        assertNotNull(results);
        assertEquals(2, results.size());
        assertEquals("TOURIST", results.get(0).name());
        assertEquals("ADMIN", results.get(1).name());
        verify(roleRepository).findAll(any(Sort.class));
    }

    @Test
    @DisplayName("Tạo vai trò mới thành công với tên được chuẩn hóa chữ hoa")
    void createRole_Success() {
        CreateRoleRequest request = new CreateRoleRequest("content_provider", "Đối tác cung cấp nội dung");

        when(roleRepository.existsByName("CONTENT_PROVIDER")).thenReturn(false);
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> {
            Role r = invocation.getArgument(0);
            r.setId(10L);
            return r;
        });

        RoleResponse response = roleService.createRole(request);

        assertNotNull(response);
        assertEquals(10L, response.id());
        assertEquals("CONTENT_PROVIDER", response.name());
        assertEquals("Đối tác cung cấp nội dung", response.description());
        assertFalse(response.isSystem());
        verify(roleRepository).save(any(Role.class));
    }

    @Test
    @DisplayName("Tạo vai trò thất bại do tên vai trò đã tồn tại")
    void createRole_NameExists_ThrowsException() {
        CreateRoleRequest request = new CreateRoleRequest("ADMIN", "Quản trị");

        when(roleRepository.existsByName("ADMIN")).thenReturn(true);

        AppException ex = assertThrows(AppException.class, () -> roleService.createRole(request));
        assertEquals(ErrorCode.ROLE_EXISTED, ex.getErrorCode());
        verify(roleRepository, never()).save(any());
    }
}
