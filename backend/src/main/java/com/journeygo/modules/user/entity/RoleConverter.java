package com.journeygo.modules.user.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class RoleConverter implements AttributeConverter<Role, String> {

    @Override
    public String convertToDatabaseColumn(Role role) {
        return role != null ? role.name() : null;
    }

    @Override
    public Role convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        String trimmed = dbData.trim();
        if ("USER".equalsIgnoreCase(trimmed)) {
            return Role.TOURIST;
        }
        return Role.valueOf(trimmed.toUpperCase());
    }
}
