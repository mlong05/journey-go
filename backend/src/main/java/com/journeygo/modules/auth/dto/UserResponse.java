package com.journeygo.modules.auth.dto;

import com.journeygo.modules.user.entity.AuthProvider;
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
        AuthProvider authProvider,
        String avatarUrl,
        String avatar,
        String coverImageUrl,
        String preferredLanguage,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
    public static UserResponse fromEntity(User user) {
        String avatar = user.getAvatarUrl();
        String lang = user.getPreferredLanguage();
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole())
                .authProvider(user.getAuthProvider())
                .avatarUrl(avatar)
                .avatar(avatar)
                .coverImageUrl(user.getCoverImageUrl())
                .preferredLanguage((lang != null && !lang.isBlank()) ? lang : "vi")
                .active(user.isActive())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
