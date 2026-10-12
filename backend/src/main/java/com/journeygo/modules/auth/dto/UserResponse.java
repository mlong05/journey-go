package com.journeygo.modules.auth.dto;

import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import lombok.Builder;

import java.time.Instant;

@Builder
public record UserResponse(
        Long id,
        String email,
        String fullName,
        String phone,
        Role role,
        boolean active,
        Instant createdAt
) {
    public static UserResponse fromEntity(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole())
                .active(user.isActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
