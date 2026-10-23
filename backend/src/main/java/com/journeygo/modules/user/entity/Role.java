package com.journeygo.modules.user.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum Role {
    TOURIST,
    ADMIN,
    MODERATOR,
    PROVIDER;

    @JsonCreator
    public static Role fromString(String value) {
        if (value == null) return null;
        String upper = value.trim().toUpperCase();
        if ("USER".equals(upper)) {
            return TOURIST;
        }
        return Role.valueOf(upper);
    }
}
