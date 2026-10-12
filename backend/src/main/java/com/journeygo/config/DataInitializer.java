package com.journeygo.config;

import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataInitializer {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner initDefaultUsers() {
        return args -> {
            // Tài khoản admin mặc định
            userRepository.findByEmail("admin@journeygo.com").ifPresentOrElse(admin -> {
                admin.setPassword(passwordEncoder.encode("Password123@"));
                admin.setRole(Role.ADMIN);
                userRepository.save(admin);
            }, () -> {
                userRepository.save(User.builder()
                        .email("admin@journeygo.com")
                        .password(passwordEncoder.encode("Password123@"))
                        .fullName("Hệ Thống Quản Trị")
                        .phone("0900000001")
                        .role(Role.ADMIN)
                        .active(true)
                        .build());
            });

            // Tài khoản user@journeygo.com đóng vai trò ADMIN theo yêu cầu
            userRepository.findByEmail("user@journeygo.com").ifPresentOrElse(user -> {
                user.setPassword(passwordEncoder.encode("Password123@"));
                user.setRole(Role.ADMIN);
                userRepository.save(user);
            }, () -> {
                userRepository.save(User.builder()
                        .email("user@journeygo.com")
                        .password(passwordEncoder.encode("Password123@"))
                        .fullName("Quản Trị Viên (User)")
                        .phone("0900000002")
                        .role(Role.ADMIN)
                        .active(true)
                        .build());
            });

            // Tài khoản Kiểm duyệt viên (MODERATOR)
            userRepository.findByEmail("moderator@journeygo.com").ifPresentOrElse(mod -> {
                mod.setPassword(passwordEncoder.encode("Password123@"));
                mod.setRole(Role.MODERATOR);
                userRepository.save(mod);
            }, () -> {
                userRepository.save(User.builder()
                        .email("moderator@journeygo.com")
                        .password(passwordEncoder.encode("Password123@"))
                        .fullName("Chuyên Viên Thẩm Định")
                        .phone("0900000003")
                        .role(Role.MODERATOR)
                        .active(true)
                        .build());
            });

            // Tài khoản Đối tác điểm đến (PROVIDER)
            userRepository.findByEmail("provider@journeygo.com").ifPresentOrElse(provider -> {
                provider.setPassword(passwordEncoder.encode("Password123@"));
                provider.setRole(Role.PROVIDER);
                userRepository.save(provider);
            }, () -> {
                userRepository.save(User.builder()
                        .email("provider@journeygo.com")
                        .password(passwordEncoder.encode("Password123@"))
                        .fullName("Ban Quản Lý Tràng An")
                        .phone("0900000004")
                        .role(Role.PROVIDER)
                        .active(true)
                        .build());
            });

            log.info("Khởi tạo và đồng bộ tài khoản mẫu (ADMIN, MODERATOR, PROVIDER) thành công với mật khẩu Password123@");
        };
    }
}
