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
            if (!userRepository.existsByEmail("admin@journeygo.com")) {
                User admin = User.builder()
                        .email("admin@journeygo.com")
                        .password(passwordEncoder.encode("Admin@123456"))
                        .fullName("Hệ Thống Quản Trị")
                        .phone("0900000001")
                        .role(Role.ADMIN)
                        .active(true)
                        .build();
                userRepository.save(admin);
                log.info("Khởi tạo tài khoản Quản trị viên mặc định: admin@journeygo.com / Admin@123456");
            }

            if (!userRepository.existsByEmail("user@journeygo.com")) {
                User user = User.builder()
                        .email("user@journeygo.com")
                        .password(passwordEncoder.encode("User@123456"))
                        .fullName("Nguyễn Du Khách")
                        .phone("0900000002")
                        .role(Role.USER)
                        .active(true)
                        .build();
                userRepository.save(user);
                log.info("Khởi tạo tài khoản Người dùng mặc định: user@journeygo.com / User@123456");
            }
        };
    }
}
