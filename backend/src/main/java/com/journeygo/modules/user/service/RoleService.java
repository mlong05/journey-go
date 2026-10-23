package com.journeygo.modules.user.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.user.dto.CreateRoleRequest;
import com.journeygo.modules.user.dto.RoleResponse;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;

    /**
     * Lấy danh sách tất cả các vai trò hiện có trong hệ thống, sắp xếp theo ID tăng dần.
     */
    @Transactional(readOnly = true)
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll(Sort.by(Sort.Direction.ASC, "id"))
                .stream()
                .map(RoleResponse::fromEntity)
                .toList();
    }

    /**
     * Tạo mới một vai trò trong hệ thống (vai trò tùy chỉnh có is_system = false).
     */
    @Transactional
    public RoleResponse createRole(CreateRoleRequest request) {
        String roleName = request.name().trim().toUpperCase();

        if (roleRepository.existsByName(roleName)) {
            throw new AppException(ErrorCode.ROLE_EXISTED);
        }

        Role role = Role.builder()
                .name(roleName)
                .description(request.description() != null && !request.description().isBlank()
                        ? request.description().trim()
                        : null)
                .isSystem(false)
                .build();

        Role saved = roleRepository.save(role);
        log.info("Admin created new role id={} name={}", saved.getId(), saved.getName());
        return RoleResponse.fromEntity(saved);
    }
}
