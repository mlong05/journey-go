package com.journeygo.modules.user.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "roles", indexes = {
        @Index(name = "idx_roles_name", columnList = "name", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Role {

    public static final String TOURIST = "TOURIST";
    public static final String ADMIN = "ADMIN";
    public static final String MODERATOR = "MODERATOR";
    public static final String PROVIDER = "PROVIDER";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(length = 255)
    private String description;

    @Column(name = "is_system", nullable = false)
    @Builder.Default
    private boolean isSystem = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public Role(String name, String description) {
        this.name = name;
        this.description = description;
        this.isSystem = true;
    }

    public Role(Long id, String name) {
        this.id = id;
        this.name = name;
        this.isSystem = true;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    @JsonValue
    public String getName() {
        return name;
    }

    @JsonCreator
    public static Role fromString(String value) {
        if (value == null) return null;
        String upper = value.trim().toUpperCase();
        if ("USER".equals(upper)) {
            upper = TOURIST;
        }
        return Role.builder().name(upper).build();
    }

    public static Role valueOf(String name) {
        return fromString(name);
    }

    public boolean isProvider() {
        return PROVIDER.equalsIgnoreCase(this.name);
    }

    public boolean isAdmin() {
        return ADMIN.equalsIgnoreCase(this.name);
    }

    public boolean isModerator() {
        return MODERATOR.equalsIgnoreCase(this.name);
    }

    public static Role of(String name) {
        return fromString(name);
    }

    public boolean isTourist() {
        return TOURIST.equalsIgnoreCase(this.name);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Role role)) return false;
        return Objects.equals(name, role.name);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(name);
    }

    @Override
    public String toString() {
        return name != null ? name : "";
    }
}
