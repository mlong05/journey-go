package com.journeygo.modules.user.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.Objects;

/**
 * Role — vai trò của người dùng trong hệ thống.
 *
 * <p>Hệ thống chỉ có 4 role chính thức:
 * <ul>
 *   <li>{@link #ADMIN} — Quản trị nền tảng.</li>
 *   <li>{@link #CONTENT_MODERATOR} — Kiểm duyệt nội dung.</li>
 *   <li>{@link #CONTENT_PROVIDER} — Đối tác cung cấp nội dung (Destination, Tour,
 *       Experience, Task, Cultural Content) và quản lý doanh thu, Wallet, Settlement.</li>
 *   <li>{@link #TOURIST} — Khách du lịch.</li>
 * </ul>
 *
 * <p>Role cũ {@code PROVIDER}, {@code MODERATOR}, {@code PARTNER} đã được hợp nhất và
 * <b>không</b> giữ lại dưới dạng alias.
 */
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
    public static final String CONTENT_MODERATOR = "CONTENT_MODERATOR";

    /**
     * Đối tác cung cấp nội dung — vừa tạo/quản lý nội dung, vừa là đối tượng
     * hưởng doanh thu và sở hữu Wallet nội bộ.
     */
    public static final String CONTENT_PROVIDER = "CONTENT_PROVIDER";

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
        // Không giữ alias cho role cũ (PARTNER / PROVIDER / MODERATOR / USER).
        return Role.builder().name(upper).build();
    }

    public static Role valueOf(String name) {
        return fromString(name);
    }

    /** Đối tác cung cấp nội dung — đồng thời là người nhận doanh thu. */
    public boolean isContentProvider() {
        return CONTENT_PROVIDER.equalsIgnoreCase(this.name);
    }

    public boolean isAdmin() {
        return ADMIN.equalsIgnoreCase(this.name);
    }

    /** Kiểm duyệt viên nội dung. */
    public boolean isContentModerator() {
        return CONTENT_MODERATOR.equalsIgnoreCase(this.name);
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
