package com.journeygo.security.oauth2;

import lombok.Builder;

@Builder
public record GoogleUserInfo(
        String sub,
        String email,
        boolean emailVerified,
        String name,
        String picture
) {
}
