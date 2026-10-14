package com.journeygo.config;

import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.repository.DestinationRepository;
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
    private final DestinationRepository destinationRepository;
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

            // Tài khoản Khách du lịch (USER/TOURIST) dành riêng cho ứng dụng Mobile
            userRepository.findByEmail("tourist@journeygo.com").ifPresentOrElse(tourist -> {
                tourist.setPassword(passwordEncoder.encode("Password123@"));
                tourist.setRole(Role.USER);
                tourist.setFullName("Nguyễn An");
                userRepository.save(tourist);
            }, () -> {
                userRepository.save(User.builder()
                        .email("tourist@journeygo.com")
                        .password(passwordEncoder.encode("Password123@"))
                        .fullName("Nguyễn An")
                        .phone("0988123456")
                        .role(Role.USER)
                        .active(true)
                        .build());
            });

            // Khởi tạo các điểm di tích văn hóa lịch sử mẫu nếu chưa có
            if (destinationRepository.count() == 0) {
                User admin = userRepository.findByEmail("admin@journeygo.com").orElse(null);
                destinationRepository.save(Destination.builder()
                        .name("Văn Miếu – Quốc Tử Giám")
                        .address("58 Quốc Tử Giám, Văn Miếu, Đống Đa, Hà Nội")
                        .latitude(new java.math.BigDecimal("21.0277000"))
                        .longitude(new java.math.BigDecimal("105.8351000"))
                        .capacity(5000)
                        .approved(true)
                        .createdBy(admin)
                        .build());
                destinationRepository.save(Destination.builder()
                        .name("Hoàng Thành Thăng Long")
                        .address("19C Hoàng Diệu, Quán Thánh, Ba Đình, Hà Nội")
                        .latitude(new java.math.BigDecimal("21.0364000"))
                        .longitude(new java.math.BigDecimal("105.8353000"))
                        .capacity(8000)
                        .approved(true)
                        .createdBy(admin)
                        .build());
                destinationRepository.save(Destination.builder()
                        .name("Làng Gốm Bát Tràng")
                        .address("Bát Tràng, Gia Lâm, Hà Nội")
                        .latitude(new java.math.BigDecimal("20.9785000"))
                        .longitude(new java.math.BigDecimal("105.9126000"))
                        .capacity(3000)
                        .approved(true)
                        .createdBy(admin)
                        .build());
                destinationRepository.save(Destination.builder()
                        .name("Quần Thể Di Sản Tràng An")
                        .address("Tràng An, Hoa Lư, Ninh Bình")
                        .latitude(new java.math.BigDecimal("20.2506000"))
                        .longitude(new java.math.BigDecimal("105.9048000"))
                        .capacity(10000)
                        .approved(true)
                        .createdBy(admin)
                        .build());
                destinationRepository.save(Destination.builder()
                        .name("Chùa Trấn Quốc & Hồ Tây")
                        .address("Đường Thanh Niên, Yên Phụ, Tây Hồ, Hà Nội")
                        .latitude(new java.math.BigDecimal("21.0483000"))
                        .longitude(new java.math.BigDecimal("105.8368000"))
                        .capacity(4000)
                        .approved(true)
                        .createdBy(admin)
                        .build());
                log.info("Khởi tạo danh mục di sản văn hóa trọng điểm thành công!");
            }

            log.info("Khởi tạo và đồng bộ tài khoản mẫu (ADMIN, MODERATOR, PROVIDER, TOURIST) thành công với mật khẩu Password123@");
        };
    }
}
