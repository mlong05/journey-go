package com.journeygo.config;

import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.experience.entity.PointRule;
import com.journeygo.modules.experience.entity.TaskType;
import com.journeygo.modules.experience.entity.enums.VerificationMethod;
import com.journeygo.modules.experience.repository.PointRuleRepository;
import com.journeygo.modules.experience.repository.TaskTypeRepository;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.journeygo.modules.gamification.entity.Badge;
import com.journeygo.modules.gamification.entity.UserPoint;
import com.journeygo.modules.gamification.entity.Voucher;
import com.journeygo.modules.gamification.entity.enums.BadgeType;
import com.journeygo.modules.gamification.entity.enums.DiscountType;
import com.journeygo.modules.gamification.repository.BadgeRepository;
import com.journeygo.modules.gamification.repository.UserPointRepository;
import com.journeygo.modules.gamification.repository.VoucherRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataInitializer {

    private final UserRepository userRepository;
    private final DestinationRepository destinationRepository;
    private final TaskTypeRepository taskTypeRepository;
    private final PointRuleRepository pointRuleRepository;
    private final PasswordEncoder passwordEncoder;
    private final BadgeRepository badgeRepository;
    private final VoucherRepository voucherRepository;
    private final UserPointRepository userPointRepository;

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

            // ── Seed TaskType + PointRule ─────────────────────────────────────────────────
            // Theo CONTEXT §3 mới: chỉ 2 loại TaskType.
            //   - QUIZ: câu hỏi trắc nghiệm / text 4 phương án.
            //   - REAL_WORLD_INTERACTIVE: câu hỏi tương tác ngoài thực tế (GPS check-in trước khi trả lời text).
            //
            // Logic: LUÔN đồng bộ về đúng 2 loại này.
            //   - Nếu chưa có code mới → tạo mới.
            //   - Nếu đã có code mới → cập nhật name + flag.
            //   - Nếu còn code cũ (FIELD_CLUE, LOCATION_VISIT, QR_CHECKPOINT, PHOTO_CHALLENGE)
            //     → XÓA (chỉ khi chưa có Task nào dùng).
            List<String> desiredCodes = List.of("QUIZ", "REAL_WORLD_INTERACTIVE");
            List<String> legacyCodes = List.of("FIELD_CLUE", "LOCATION_VISIT", "QR_CHECKPOINT", "PHOTO_CHALLENGE");

            // 1. Xóa các TaskType cũ không dùng
            legacyCodes.forEach(code -> {
                taskTypeRepository.findAll().stream()
                        .filter(tt -> code.equals(tt.getCode()))
                        .findFirst()
                        .ifPresent(tt -> {
                            boolean hasTask = !taskTypeRepository.findById(tt.getId())
                                    .map(t -> taskTypeRepository.count() > 0)
                                    .orElse(false);
                            // Chỉ xóa khi chắc chắn không có Task dùng (check FK thông qua Task)
                            // Đơn giản: xóa PointRule trước, sau đó xóa TaskType
                            // Nếu có Task FK thì DB sẽ reject → log warning
                            try {
                                pointRuleRepository.findAll().stream()
                                        .filter(pr -> pr.getTaskType() != null && code.equals(pr.getTaskType().getCode()))
                                        .forEach(pr -> pointRuleRepository.deleteById(pr.getId()));
                                taskTypeRepository.deleteById(tt.getId());
                                log.info("Đã xóa legacy TaskType: {}", code);
                            } catch (Exception e) {
                                log.warn("Không thể xóa TaskType {} (có Task đang dùng): {}", code, e.getMessage());
                            }
                        });
            });

            // 2. Đảm bảo 2 TaskType mới tồn tại
            desiredCodes.forEach(code -> {
                TaskType existing = taskTypeRepository.findAll().stream()
                        .filter(tt -> code.equals(tt.getCode()))
                        .findFirst().orElse(null);

                if (existing == null) {
                    TaskType tt = switch (code) {
                        case "QUIZ" -> TaskType.builder()
                                .code("QUIZ").name("Câu hỏi trắc nghiệm / text (4 phương án)")
                                .hasQuestions(true).requiresLocation(false)
                                .verificationMethod(VerificationMethod.ANSWER_MATCH)
                                .build();
                        case "REAL_WORLD_INTERACTIVE" -> TaskType.builder()
                                .code("REAL_WORLD_INTERACTIVE").name("Câu hỏi tương tác ngoài thực tế (GPS check-in trước khi trả lời)")
                                .hasQuestions(true).requiresLocation(true)
                                .verificationMethod(VerificationMethod.ANSWER_MATCH)
                                .build();
                        default -> null;
                    };
                    if (tt != null) {
                        TaskType saved = taskTypeRepository.save(tt);
                        log.info("Đã tạo TaskType: {} (id={})", saved.getCode(), saved.getId());
                    }
                }
            });

            // 3. Đảm bảo PointRule cho 2 TaskType mới
            desiredCodes.forEach(code -> {
                TaskType tt = taskTypeRepository.findAll().stream()
                        .filter(t -> code.equals(t.getCode()))
                        .findFirst().orElse(null);
                if (tt == null) return;

                // Fetch id một lần để tránh LazyInitializationException (so sánh bằng id thay vì gọi getCode() trên lazy proxy)
                long taskTypeId = tt.getId();

                boolean hasRule = pointRuleRepository.findAll().stream()
                        .anyMatch(pr -> {
                            if (pr.getTaskType() == null) return false;
                            return taskTypeId == pr.getTaskType().getId();
                        });
                if (!hasRule) {
                    switch (code) {
                        case "QUIZ" -> pointRuleRepository.save(PointRule.builder()
                                .taskType(tt).basePoints(10)
                                .bonusMultiplier(new BigDecimal("1.50"))
                                .conditions(Map.of("firstAttempt", 1.5, "perfectScore", 1.2))
                                .build());
                        case "REAL_WORLD_INTERACTIVE" -> pointRuleRepository.save(PointRule.builder()
                                .taskType(tt).basePoints(20)
                                .bonusMultiplier(new BigDecimal("2.00"))
                                .conditions(Map.of("firstAttempt", 2.0, "onSiteVerified", 1.3, "perfectScore", 1.2))
                                .build());
                    }
                    log.info("Đã tạo PointRule cho TaskType: {}", code);
                }
            });

            log.info("Đồng bộ TaskType + PointRule hoàn tất. Tổng TaskType: {}", taskTypeRepository.count());

            // ── Seed Badges mẫu ────────────────────────────────────────────────────────
            if (badgeRepository.count() == 0) {
                badgeRepository.save(Badge.builder()
                        .code("BADGE_VAN_MIEU")
                        .name("Dấu ấn Văn Miếu Quốc Tử Giám")
                        .description("Đã đặt chân và khám phá trường đại học đầu tiên của Việt Nam")
                        .iconUrl("https://assets.journeygo.com/badges/van_mieu.png")
                        .badgeType(BadgeType.DESTINATION_CHECKIN)
                        .bonusPoints(10)
                        .active(true)
                        .build());
                badgeRepository.save(Badge.builder()
                        .code("BADGE_HOANG_THANH")
                        .name("Chiến tích Hoàng Thành Thăng Long")
                        .description("Khám phá trung tâm quyền lực lịch sử của kinh thành xưa")
                        .iconUrl("https://assets.journeygo.com/badges/hoang_thanh.png")
                        .badgeType(BadgeType.DESTINATION_CHECKIN)
                        .bonusPoints(10)
                        .active(true)
                        .build());
                badgeRepository.save(Badge.builder()
                        .code("BADGE_BAT_TRANG")
                        .name("Nghệ nhân Gốm Sứ Bát Tràng")
                        .description("Tự tay trải nghiệm nét đẹp làng nghề gốm sứ truyền thống")
                        .iconUrl("https://assets.journeygo.com/badges/bat_trang.png")
                        .badgeType(BadgeType.DESTINATION_CHECKIN)
                        .bonusPoints(10)
                        .active(true)
                        .build());
                badgeRepository.save(Badge.builder()
                        .code("BADGE_TRANG_AN")
                        .name("Tuyệt tác Di sản Tràng An")
                        .description("Khám phá quần thể di sản thiên nhiên và văn hóa thế giới")
                        .iconUrl("https://assets.journeygo.com/badges/trang_an.png")
                        .badgeType(BadgeType.DESTINATION_CHECKIN)
                        .bonusPoints(10)
                        .active(true)
                        .build());
                log.info("Khởi tạo danh mục Huy hiệu di sản mẫu thành công!");
            }

            // ── Seed Vouchers mẫu ──────────────────────────────────────────────────────
            if (voucherRepository.count() == 0) {
                voucherRepository.save(Voucher.builder()
                        .code("JG-VOUCHER-50K")
                        .title("Giảm 50.000đ khi đặt Tour di sản")
                        .description("Áp dụng cho mọi tour trải nghiệm trên hệ thống JourneyGo")
                        .discountType(DiscountType.FIXED_AMOUNT)
                        .discountValue(new BigDecimal("50000.00"))
                        .minOrderAmount(new BigDecimal("150000.00"))
                        .pointsRequired(50)
                        .totalQuantity(100)
                        .remainingQuantity(100)
                        .validDays(30)
                        .active(true)
                        .build());
                voucherRepository.save(Voucher.builder()
                        .code("JG-VOUCHER-10PCT")
                        .title("Giảm 10% Tour văn hóa lịch sử")
                        .description("Giảm tối đa 100.000đ cho đơn đặt tour bất kỳ")
                        .discountType(DiscountType.PERCENTAGE)
                        .discountValue(new BigDecimal("10.00"))
                        .minOrderAmount(new BigDecimal("200000.00"))
                        .maxDiscountAmount(new BigDecimal("100000.00"))
                        .pointsRequired(80)
                        .totalQuantity(50)
                        .remainingQuantity(50)
                        .validDays(45)
                        .active(true)
                        .build());
                log.info("Khởi tạo danh mục Voucher giảm giá mẫu thành công!");
            }

            // ── Khởi tạo 100 điểm thưởng ban đầu cho tourist@journeygo.com để test ────
            userRepository.findByEmail("tourist@journeygo.com").ifPresent(tourist -> {
                if (userPointRepository.findByUserId(tourist.getId()).isEmpty()) {
                    userPointRepository.save(UserPoint.builder()
                            .userId(tourist.getId())
                            .currentBalance(100)
                            .lifetimeEarned(100)
                            .lifetimeSpent(0)
                            .build());
                    log.info("Khởi tạo 100 điểm ban đầu cho tài khoản tourist@journeygo.com");
                }
            });

            log.info("Khởi tạo và đồng bộ tài khoản mẫu (ADMIN, MODERATOR, PROVIDER, TOURIST) thành công với mật khẩu Password123@");
        };
    }
}
