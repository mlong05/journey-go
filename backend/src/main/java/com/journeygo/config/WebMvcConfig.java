package com.journeygo.config;

import com.journeygo.modules.user.entity.Role;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.format.FormatterRegistry;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Set;

/**
 * Cấu hình converter cho Web MVC.
 *
 * <p><b>Vì sao cần?</b> {@link Role} là <b>entity JPA</b> (bảng {@code roles}), KHÔNG phải
 * enum ⇒ Spring MVC mặc định <b>không</b> tự chuyển đổi chuỗi query param
 * ({@code ?role=TOURIST}) thành đối tượng {@code Role}. Kết quả là mọi request có tham số
 * {@code role} đều trả về HTTP 400:
 * <pre>
 *   Tham số 'role' không đúng định dạng. Giá trị nhận: 'TOURIST'. Kiểu yêu cầu: Role
 * </pre>
 *
 * <p>Converter bổ sung dưới đây chuyển {@code String → Role} bằng {@link Role#fromString(String)}
 * (đã dùng cho JSON body) ⇒ các API lọc theo vai trò hoạt động đúng như thiết kế.
 *
 * <p>Chỉ nhận 4 role chính thức của hệ thống; giá trị khác ⇒ trả 400 với thông báo rõ ràng
 * thay vì lọc theo tên role không tồn tại (luôn rỗng).
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    /** 4 role chính thức — đồng bộ với {@code Role.TOURIST / ADMIN / CONTENT_MODERATOR / CONTENT_PROVIDER}. */
    private static final Set<String> ALLOWED_ROLE_NAMES = Set.of(
            Role.TOURIST,
            Role.ADMIN,
            Role.CONTENT_MODERATOR,
            Role.CONTENT_PROVIDER
    );

    /**
     * Converter {@code String → Role} cho query param / form param.
     * Trả về {@code null} khi giá trị rỗng (⇒ Spring coi như không có tham số).
     */
    private static final class StringToRoleConverter implements Converter<String, Role> {
        @Override
        @Nullable
        public Role convert(@NonNull String source) {
            String value = source == null ? "" : source.trim();
            if (value.isEmpty()) {
                return null;
            }
            String upper = value.toUpperCase();
            if (!ALLOWED_ROLE_NAMES.contains(upper)) {
                throw new IllegalArgumentException(
                        "Vai trò '" + value + "' không hợp lệ. Chỉ chấp nhận: "
                                + String.join(", ", ALLOWED_ROLE_NAMES)
                );
            }
            return Role.fromString(upper);
        }
    }

    @Override
    public void addFormatters(@NonNull FormatterRegistry registry) {
        registry.addConverter(new StringToRoleConverter());
    }
}
