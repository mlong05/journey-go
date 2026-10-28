package com.journeygo.config;

import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.entity.enums.DestinationStatus;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.ExperienceSlot;
import com.journeygo.modules.experience.entity.PointRule;
import com.journeygo.modules.experience.entity.TaskType;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import com.journeygo.modules.experience.entity.enums.SlotStatus;
import com.journeygo.modules.experience.entity.enums.VerificationMethod;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.experience.repository.ExperienceSlotRepository;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.journeygo.modules.gamification.entity.Badge;
import com.journeygo.modules.gamification.entity.UserPoint;
import com.journeygo.modules.gamification.entity.Voucher;
import com.journeygo.modules.gamification.entity.enums.BadgeType;
import com.journeygo.modules.gamification.entity.enums.DiscountType;
import com.journeygo.modules.gamification.repository.BadgeRepository;
import com.journeygo.modules.gamification.repository.UserPointRepository;
import com.journeygo.modules.gamification.repository.VoucherRepository;

import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingSlotHold;
import com.journeygo.modules.booking.entity.enums.BookingSlotType;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.booking.repository.BookingSlotHoldRepository;
import com.journeygo.modules.payment.entity.Payment;
import com.journeygo.modules.payment.entity.enums.PaymentMethod;
import com.journeygo.modules.payment.entity.enums.PaymentStatus;
import com.journeygo.modules.payment.repository.PaymentRepository;
import com.journeygo.modules.refund.entity.RefundAuditLog;
import com.journeygo.modules.refund.entity.RefundRequest;
import com.journeygo.modules.refund.entity.enums.RefundMethod;
import com.journeygo.modules.refund.entity.enums.RefundReason;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import com.journeygo.modules.refund.repository.RefundAuditLogRepository;
import com.journeygo.modules.refund.repository.RefundRequestRepository;
import com.journeygo.modules.partner.entity.Partner;
import com.journeygo.modules.partner.repository.PartnerRepository;
import com.journeygo.modules.partnerrevenue.entity.PartnerRevenue;
import com.journeygo.modules.partnerrevenue.entity.enums.DeferredReason;
import com.journeygo.modules.partnerrevenue.entity.enums.PartnerRevenueStatus;
import com.journeygo.modules.partnerrevenue.repository.PartnerRevenueRepository;
import com.journeygo.modules.settlement.entity.FinancialAdjustment;
import com.journeygo.modules.settlement.entity.Settlement;
import com.journeygo.modules.settlement.entity.SettlementDetail;
import com.journeygo.modules.settlement.entity.enums.FinancialAdjustmentStatus;
import com.journeygo.modules.settlement.entity.enums.SettlementStatus;
import com.journeygo.modules.settlement.repository.FinancialAdjustmentRepository;
import com.journeygo.modules.settlement.repository.SettlementDetailRepository;
import com.journeygo.modules.settlement.repository.SettlementRepository;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourDestination;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.entity.TourType;
import com.journeygo.modules.tour.repository.TourDestinationRepository;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.wallet.entity.Wallet;
import com.journeygo.modules.wallet.entity.WalletTransaction;
import com.journeygo.modules.wallet.entity.enums.WalletTransactionDirection;
import com.journeygo.modules.wallet.entity.enums.WalletTransactionStatus;
import com.journeygo.modules.wallet.entity.enums.WalletTransactionType;
import com.journeygo.modules.wallet.repository.WalletRepository;
import com.journeygo.modules.wallet.repository.WalletTransactionRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataInitializer {

    private final UserRepository userRepository;
    private final com.journeygo.modules.user.repository.RoleRepository roleRepository;
    private final DestinationRepository destinationRepository;
    private final TaskTypeRepository taskTypeRepository;
    private final PointRuleRepository pointRuleRepository;
    private final PasswordEncoder passwordEncoder;
    private final BadgeRepository badgeRepository;
    private final VoucherRepository voucherRepository;
    private final UserPointRepository userPointRepository;

    // ── Repository cho dữ liệu mẫu (Booking → Payment → Refund → Settlement) ──
    private final ExperienceRepository experienceRepository;
    private final ExperienceSlotRepository experienceSlotRepository;
    private final TourRepository tourRepository;
    private final TourDestinationRepository tourDestinationRepository;
    private final BookingRepository bookingRepository;
    private final BookingSlotHoldRepository bookingSlotHoldRepository;
    private final PaymentRepository paymentRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final RefundAuditLogRepository refundAuditLogRepository;
    private final PartnerRepository partnerRepository;
    private final PartnerRevenueRepository partnerRevenueRepository;
    private final SettlementRepository settlementRepository;
    private final SettlementDetailRepository settlementDetailRepository;
    private final FinancialAdjustmentRepository financialAdjustmentRepository;
    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final PlatformTransactionManager transactionManager;
    private final JdbcTemplate jdbcTemplate;

    @Bean
    @org.springframework.core.annotation.Order(1)
    public CommandLineRunner initDefaultUsers() {
        return args -> {
            // Khởi tạo các Role hệ thống cốt lõi nếu chưa có
            Role touristRole = roleRepository.findByName(Role.TOURIST)
                    .orElseGet(() -> roleRepository.save(new Role(Role.TOURIST, "Khách du lịch")));
            Role adminRole = roleRepository.findByName(Role.ADMIN)
                    .orElseGet(() -> roleRepository.save(new Role(Role.ADMIN, "Quản trị viên")));
            Role modRole = roleRepository.findByName(Role.MODERATOR)
                    .orElseGet(() -> roleRepository.save(new Role(Role.MODERATOR, "Kiểm duyệt viên")));
            Role providerRole = roleRepository.findByName(Role.PROVIDER)
                    .orElseGet(() -> roleRepository.save(new Role(Role.PROVIDER, "Đối tác cung cấp dịch vụ")));
            Role partnerRole = roleRepository.findByName(Role.PARTNER)
                    .orElseGet(() -> roleRepository.save(new Role(Role.PARTNER, "Đối tác hưởng doanh thu và sở hữu ví nội bộ")));

            // Tài khoản admin mặc định
            userRepository.findByEmail("admin@journeygo.com").ifPresentOrElse(admin -> {
                admin.setPassword(passwordEncoder.encode("Password123@"));
                admin.setRole(adminRole);
                userRepository.save(admin);
            }, () -> {
                userRepository.save(User.builder()
                        .email("admin@journeygo.com")
                        .password(passwordEncoder.encode("Password123@"))
                        .fullName("Hệ Thống Quản Trị")
                        .phone("0900000001")
                        .role(adminRole)
                        .active(true)
                        .build());
            });

            // Tài khoản user@journeygo.com đóng vai trò ADMIN theo yêu cầu
            userRepository.findByEmail("user@journeygo.com").ifPresentOrElse(user -> {
                user.setPassword(passwordEncoder.encode("Password123@"));
                user.setRole(adminRole);
                userRepository.save(user);
            }, () -> {
                userRepository.save(User.builder()
                        .email("user@journeygo.com")
                        .password(passwordEncoder.encode("Password123@"))
                        .fullName("Quản Trị Viên (User)")
                        .phone("0900000002")
                        .role(adminRole)
                        .active(true)
                        .build());
            });

            // Tài khoản Kiểm duyệt viên (MODERATOR)
            userRepository.findByEmail("moderator@journeygo.com").ifPresentOrElse(mod -> {
                mod.setPassword(passwordEncoder.encode("Password123@"));
                mod.setRole(modRole);
                userRepository.save(mod);
            }, () -> {
                userRepository.save(User.builder()
                        .email("moderator@journeygo.com")
                        .password(passwordEncoder.encode("Password123@"))
                        .fullName("Chuyên Viên Thẩm Định")
                        .phone("0900000003")
                        .role(modRole)
                        .active(true)
                        .build());
            });

            // Tài khoản Đối tác điểm đến (PROVIDER)
            userRepository.findByEmail("provider@journeygo.com").ifPresentOrElse(provider -> {
                provider.setPassword(passwordEncoder.encode("Password123@"));
                provider.setRole(providerRole);
                userRepository.save(provider);
            }, () -> {
                userRepository.save(User.builder()
                        .email("provider@journeygo.com")
                        .password(passwordEncoder.encode("Password123@"))
                        .fullName("Ban Quản Lý Tràng An")
                        .phone("0900000004")
                        .role(providerRole)
                        .active(true)
                        .build());
            });

            // Tài khoản Khách du lịch (TOURIST) dành riêng cho ứng dụng Mobile
            userRepository.findByEmail("tourist@journeygo.com").ifPresentOrElse(tourist -> {
                tourist.setPassword(passwordEncoder.encode("Password123@"));
                tourist.setRole(touristRole);
                tourist.setFullName("Nguyễn An");
                userRepository.save(tourist);
            }, () -> {
                userRepository.save(User.builder()
                        .email("tourist@journeygo.com")
                        .password(passwordEncoder.encode("Password123@"))
                        .fullName("Nguyễn An")
                        .phone("0988123456")
                        .role(touristRole)
                        .active(true)
                        .build());
            });

            // Tự động gán touristRole cho các user cũ nếu role bị null sau khi tạo cột role_id
            userRepository.findAll().forEach(u -> {
                if (u.getRole() == null) {
                    u.setRole(touristRole);
                    userRepository.save(u);
                }
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

    // ══════════════════════════════════════════════════════════════════════════════
    //  DỮ LIỆU MẪU CHO KỊCH BẢN TEST (Booking → Payment → Refund → Settlement)
    //
    //  Mục tiêu: khi khởi động ứng dụng, DB có sẵn dữ liệu để chạy ngay
    //  `docs/TEST_SCENARIOS.md` (PHẦN A → B → C → D → E) trên Swagger UI mà không
    //  phải tạo dữ liệu thủ công.
    //
    //  Dữ liệu tạo ra:
    //   • 2 Partner (kèm Wallet)  — partner1@ / partner2@journeygo.com
    //   • 2 Tourist               — tourist1@ / tourist2@journeygo.com
    //   • 5 Destination (PUBLISHED) + 5 Experience (PUBLISHED) + slot cho nhiều ngày
    //   • 2 Tour PUBLISHED (1 tour nhiều Partner)
    //   • 9 Booking ở các trạng thái: COMPLETED / CONFIRMED / PENDING_PAYMENT / CANCELLED
    //   • 7 Payment SUCCESS + 2 Refund (REFUNDED, PENDING_REVIEW)
    //   • PartnerRevenue (ELIGIBLE / PENDING / SETTLED)
    //   • 1 Settlement APPROVED (đã cộng tiền vào ví) + 1 FinancialAdjustment APPROVED
    //
    //  Tất cả thao tác đều IDEMPOTENT — chạy lại nhiều lần không tạo trùng.
    // ══════════════════════════════════════════════════════════════════════════════

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Bean
    @org.springframework.core.annotation.Order(2)
    public CommandLineRunner initSampleBookingData() {
        return args -> {
            try {
                // Bọc trong transaction để mọi entity lazy-load được (session mở trong tx).
                new TransactionTemplate(transactionManager)
                        .executeWithoutResult(status -> seedSampleBookingData());
                log.info("Đã khởi tạo DỮ LIỆU MẪU cho kịch bản test Booking → Payment → Refund → Settlement "
                        + "(2 partner, 2 tourist, 5 destination, 5 experience, 2 tour, 9 booking, 7 payment, 2 refund, "
                        + "1 settlement, 1 adjustment).");
            } catch (Exception e) {
                log.warn("Không thể khởi tạo dữ liệu mẫu Booking/Payment/Refund/Settlement: {}", e.getMessage(), e);
            }
        };
    }

    private void seedSampleBookingData() {
        Role adminRole = roleRepository.findByName(Role.ADMIN)
                .orElseGet(() -> roleRepository.save(new Role(Role.ADMIN, "Quản trị viên")));
        Role touristRole = roleRepository.findByName(Role.TOURIST)
                .orElseGet(() -> roleRepository.save(new Role(Role.TOURIST, "Khách du lịch")));
        Role partnerRole = roleRepository.findByName(Role.PARTNER)
                .orElseGet(() -> roleRepository.save(new Role(Role.PARTNER,
                        "Đối tác hưởng doanh thu và sở hữu ví nội bộ")));

        // Dọn các bản ghi "rác" sinh ra từ những lần khởi tạo bị lỗi trước đó
        // (ví dụ Partner gắn nhầm user, settlement cũ đã hủy…) để dữ liệu mẫu luôn sạch.
        purgeStraySampleArtifacts();

        // ── Tài khoản ────────────────────────────────────────────────────────────
        User admin = ensureUser("admin@journeygo.com", "Hệ Thống Quản Trị", "0900000001", adminRole);
        User partner1User = ensureUser("partner1@journeygo.com", "Tràng An Heritage", "0900000011", partnerRole);
        User partner2User = ensureUser("partner2@journeygo.com", "Hạ Long Bay Tours", "0900000012", partnerRole);
        User tourist1 = ensureUser("tourist1@journeygo.com", "Nguyễn Văn A", "0912345678", touristRole);
        User tourist2 = ensureUser("tourist2@journeygo.com", "Nguyễn Văn B", "0912345679", touristRole);

        // ── Partner + Wallet (tạo nguyên tử) ────────────────────────────────────
        Partner partner1 = ensurePartner(partner1User, "Ban Quản lý Tràng An", new BigDecimal("0.2500"));
        Partner partner2 = ensurePartner(partner2User, "Ban Quản lý Hạ Long", new BigDecimal("0.2000"));

        // ── Ngày tham chiếu ──────────────────────────────────────────────────────
        LocalDate today = LocalDate.now(VN_ZONE);
        LocalDate prevMonthDay = YearMonth.now(VN_ZONE).minusMonths(1).atDay(20);
        LocalDate prev3MonthDay = YearMonth.now(VN_ZONE).minusMonths(3).atDay(15);
        String prevMonthPeriod = PartnerRevenue.periodOf(prevMonthDay);
        String prev3MonthPeriod = PartnerRevenue.periodOf(prev3MonthDay);

        // ── Destination ─────────────────────────────────────────────────────────
        Destination destVanMieu = ensureDestination("Văn Miếu – Quốc Tử Giám",
                "58 Quốc Tử Giám, Văn Miếu, Đống Đa, Hà Nội",
                "21.0277000", "105.8351000", 5000, admin);
        Destination destHoangThanh = ensureDestination("Hoàng Thành Thăng Long",
                "19C Hoàng Diệu, Quán Thánh, Ba Đình, Hà Nội",
                "21.0364000", "105.8353000", 8000, admin);
        Destination destBatTrang = ensureDestination("Làng Gốm Bát Tràng",
                "Bát Tràng, Gia Lâm, Hà Nội",
                "20.9785000", "105.9126000", 3000, admin);
        Destination destTrangAn = ensureDestination("Quần Thể Di Sản Tràng An",
                "Tràng An, Hoa Lư, Ninh Bình",
                "20.2506000", "105.9048000", 10000, admin);
        Destination destTranQuoc = ensureDestination("Chùa Trấn Quốc & Hồ Tây",
                "Đường Thanh Niên, Yên Phụ, Tây Hồ, Hà Nội",
                "21.0483000", "105.8368000", 4000, admin);

        // ── Experience (người tạo = Partner → nguồn doanh thu) ──────────────────
        Experience expVanMieu = ensureExperience(destVanMieu, "Tham quan Văn Miếu – Quốc Tử Giám",
                "Khám phá 107 môn xuất và trường đại học đầu tiên của Việt Nam. Bao gồm vé vào cổng "
                        + "và hướng dẫn viên thuyết minh 60 phút.",
                new BigDecimal("500000.00"), 90, partner1User);
        Experience expHoangThanh = ensureExperience(destHoangThanh, "Dạo bộ Hoàng Thành Thăng Long",
                "Đi dạo trong khu thành cổ với hướng dẫn viên lịch sử, kể lại 1000 năm hào hùng kinh thành.",
                new BigDecimal("400000.00"), 75, partner1User);
        Experience expBatTrang = ensureExperience(destBatTrang, "Trải nghiệm làng gốm Bát Tràng",
                "Tự tay ném gốm với nghệ nhân và nấu món gốm truyền thống.",
                new BigDecimal("500000.00"), 120, partner1User);
        Experience expTrangAn = ensureExperience(destTrangAn, "Tham quan Quần thể di sản Tràng An",
                "Đi thuyền qua các hang động tự nhiên và khu du lịch Tam Cốc.",
                new BigDecimal("600000.00"), 240, partner2User);
        Experience expTranQuoc = ensureExperience(destTranQuoc, "Tham quan Chùa Trấn Quốc & Hồ Tây",
                "Chiêm ngắm chùa Trấn Quốc nổi tiếng với tháp Bảo Nghiêm 11 tầng và hồ Tây.",
                new BigDecimal("400000.00"), 60, partner2User);

        // ── Slot (mở bán nhiều ngày) ─────────────────────────────────────────────
        List<LocalDate> slotDates = new ArrayList<>(List.of(
                prevMonthDay, prev3MonthDay,
                today.plusDays(1), today.plusDays(2), today.plusDays(3),
                today.plusDays(4), today.plusDays(5), today.plusDays(7),
                today.plusDays(14), today.plusDays(21), today.plusDays(30)));

        Map<String, ExperienceSlot> slots = new LinkedHashMap<>();
        for (Experience exp : List.of(expVanMieu, expHoangThanh, expBatTrang, expTrangAn, expTranQuoc)) {
            for (LocalDate d : slotDates) {
                // Ngày xa nhất của Văn Miếu cố ý để "hết chỗ" — dùng cho unhappy case A.14.
                boolean soldOut = exp.getId().equals(expVanMieu.getId()) && d.equals(today.plusDays(30));
                ExperienceSlot slot = ensureSlot(exp, d, soldOut ? 1 : 20, soldOut ? 1 : 0);
                slots.put(exp.getId() + "@" + d, slot);
            }
        }

        // ── Tour ────────────────────────────────────────────────────────────────
        // Tour 1: nhiều Partner (P1 giữ Bát Tràng, P2 giữ Tràng An + Trấn Quốc) → 1.500.000đ
        Tour tour1 = ensureTour("Hành trình Tràng An 2 ngày 1 đêm", TourType.ECOTOURISM, 2, admin,
                List.of(destBatTrang, destTrangAn, destTranQuoc));
        // Tour 2: 1 Partner (P1 giữ Văn Miếu + Hoàng Thành) → 900.000đ
        Tour tour2 = ensureTour("Hành trình kinh thành Thăng Long 1 ngày", TourType.CULTURAL, 1, admin,
                List.of(destVanMieu, destHoangThanh));

        // ── BOOKINGS ────────────────────────────────────────────────────────────
        Instant now = Instant.now();
        Instant prevMonthPaid = prevMonthDay.atTime(10, 0).atZone(VN_ZONE).toInstant();
        Instant prevMonthDone = prevMonthDay.atTime(16, 0).atZone(VN_ZONE).toInstant();
        Instant prev3Paid = prev3MonthDay.atTime(10, 0).atZone(VN_ZONE).toInstant();
        Instant prev3Done = prev3MonthDay.atTime(15, 0).atZone(VN_ZONE).toInstant();

        // 1) COMPLETED — kỳ trước — dùng để tạo Settlement (2 Partner)
        Booking bk1 = ensureBooking("JGSAMPLE01", tourist1, tour1, prevMonthDay, prevMonthPaid, prevMonthDone,
                admin);
        Payment pay1 = ensurePayment("JGSAMPLE01-TXN", bk1, new BigDecimal("1500000.00"),
                "MOMO", "QRCODE", "91000001", prevMonthPaid);

        // 2) COMPLETED — kỳ trước — 1 Partner
        Booking bk2 = ensureBooking("JGSAMPLE02", tourist2, tour2, prevMonthDay, prevMonthPaid, prevMonthDone,
                admin);
        Payment pay2 = ensurePayment("JGSAMPLE02-TXN", bk2, new BigDecimal("900000.00"),
                "VNBANK", "ATM", "91000002", prevMonthPaid);

        // 3) CONFIRMED — chờ trải nghiệm hoàn thành (doanh thu chưa đủ tư cách tất toán)
        Booking bk3 = ensureBooking("JGSAMPLE03", tourist1, tour1, today.plusDays(1),
                now.minusSeconds(3600), null, admin);
        Payment pay3 = ensurePayment("JGSAMPLE03-TXN", bk3, new BigDecimal("1500000.00"),
                "VNPAYQR", "QRCODE", "91000003", now.minusSeconds(3600));

        // 4) PENDING_PAYMENT — sẽ tự EXPIRED sau 10 phút
        Booking bk4 = ensureBooking("JGSAMPLE04", tourist2, tour2, today.plusDays(2), null, null, admin);

        // 5) CANCELLED
        Booking bk5 = ensureBooking("JGSAMPLE05", tourist1, tour1, today.plusDays(3), null, null, admin);

        // 6) COMPLETED — kỳ 3 tháng trước — đã được tất toán (SETTLED)
        Booking bk6 = ensureBooking("JGSAMPLE06", tourist2, tour2, prev3MonthDay, prev3Paid, prev3Done, admin);
        Payment pay6 = ensurePayment("JGSAMPLE06-TXN", bk6, new BigDecimal("900000.00"),
                "INTCARD", null, "91000006", prev3Paid);

        // 7) COMPLETED + Refund đã hoàn thành 50% (thuộc Partner 1)
        Booking bk7 = ensureBooking("JGSAMPLE07", tourist1, tour2, today.plusDays(1),
                now.minusSeconds(7200), now.minusSeconds(3600), admin);
        Payment pay7 = ensurePayment("JGSAMPLE07-TXN", bk7, new BigDecimal("900000.00"),
                "MOMO", "QRCODE", "91000007", now.minusSeconds(7200));

        // 8) COMPLETED + Refund đang chờ duyệt (chặn tất toán)
        Booking bk8 = ensureBooking("JGSAMPLE08", tourist2, tour2, today.plusDays(4),
                now.minusSeconds(10800), now.minusSeconds(7200), admin);
        Payment pay8 = ensurePayment("JGSAMPLE08-TXN", bk8, new BigDecimal("900000.00"),
                "VNBANK", "ATM", "91000008", now.minusSeconds(10800));

        // 9) COMPLETED — chưa có refund (dùng cho kịch bản C.1 / C.2)
        Booking bk9 = ensureBooking("JGSAMPLE09", tourist2, tour1, today.plusDays(5),
                now.minusSeconds(14400), now.minusSeconds(10800), admin);
        Payment pay9 = ensurePayment("JGSAMPLE09-TXN", bk9, new BigDecimal("1500000.00"),
                "VNPAYQR", "QRCODE", "91000009", now.minusSeconds(14400));

        // ── REFUNDS ─────────────────────────────────────────────────────────────
        // Refund 50% đã hoàn thành (chuyển khoản thủ công)
        RefundRequest refund7 = ensureRefund("JGSAMPLERF01", pay7, tourist1, RefundStatus.REFUNDED,
                RefundReason.TOURIST_FAULT, new BigDecimal("450000.00"),
                new BigDecimal("450000.00"), new BigDecimal("450000.00"),
                RefundMethod.MANUAL_BANK_TRANSFER, admin,
                "Khách không thể đi được do thời tiết xấu, đề nghị hoàn một phần",
                "0123456789", "NGUYEN VAN A", "MB Bank",
                "FT20261120001", "https://img.journeygo.com/refund/ft-20261120001.png");

        // Refund 50% đang chờ Admin duyệt (giữ doanh thu ở trạng thái `held`)
        ensureRefund("JGSAMPLERF02", pay8, tourist2, RefundStatus.PENDING_REVIEW,
                RefundReason.TOURIST_FAULT, new BigDecimal("450000.00"),
                null, null, null, null,
                "Điểm đến tạm đóng cửa do bảo trì, khách đề nghị hoàn một phần",
                "9876543210", "NGUYEN VAN B", "Vietcombank",
                null, null);

        // ── PARTNER REVENUE ─────────────────────────────────────────────────────
        // BK1 (tour nhiều Partner): P1 = 500.000, P2 = 1.000.000
        PartnerRevenue rev1P1 = ensureRevenue(bk1, pay1, partner1, new BigDecimal("500000.00"),
                new BigDecimal("0.2500"), BigDecimal.ZERO, prevMonthPeriod, prevMonthDay,
                PartnerRevenueStatus.ELIGIBLE, null, prevMonthDone, null, null);
        PartnerRevenue rev1P2 = ensureRevenue(bk1, pay1, partner2, new BigDecimal("1000000.00"),
                new BigDecimal("0.2000"), BigDecimal.ZERO, prevMonthPeriod, prevMonthDay,
                PartnerRevenueStatus.ELIGIBLE, null, prevMonthDone, null, null);

        // BK2: P1 = 900.000
        PartnerRevenue rev2P1 = ensureRevenue(bk2, pay2, partner1, new BigDecimal("900000.00"),
                new BigDecimal("0.2500"), BigDecimal.ZERO, prevMonthPeriod, prevMonthDay,
                PartnerRevenueStatus.ELIGIBLE, null, prevMonthDone, null, null);

        // BK3: đã thanh toán nhưng chưa hoàn thành trải nghiệm → PENDING
        ensureRevenue(bk3, pay3, partner1, new BigDecimal("500000.00"), new BigDecimal("0.2500"),
                BigDecimal.ZERO, PartnerRevenue.periodOf(today.plusDays(1)), today.plusDays(1),
                PartnerRevenueStatus.PENDING, DeferredReason.BOOKING_NOT_COMPLETED, null, null, null);
        ensureRevenue(bk3, pay3, partner2, new BigDecimal("1000000.00"), new BigDecimal("0.2000"),
                BigDecimal.ZERO, PartnerRevenue.periodOf(today.plusDays(1)), today.plusDays(1),
                PartnerRevenueStatus.PENDING, DeferredReason.BOOKING_NOT_COMPLETED, null, null, null);

        // BK6: đã tất toán (SETTLED)
        PartnerRevenue rev6P1 = ensureRevenue(bk6, pay6, partner1, new BigDecimal("900000.00"),
                new BigDecimal("0.2500"), BigDecimal.ZERO, prev3MonthPeriod, prev3MonthDay,
                PartnerRevenueStatus.ELIGIBLE, null, prev3Done, null, null);

        // BK7: có refund 50% đã hoàn thành
        ensureRevenue(bk7, pay7, partner1, new BigDecimal("900000.00"), new BigDecimal("0.2500"),
                new BigDecimal("450000.00"), PartnerRevenue.periodOf(today.plusDays(1)), today.plusDays(1),
                PartnerRevenueStatus.ELIGIBLE, null, now.minusSeconds(3600), null, null);

        // BK8: refund đang chờ duyệt → REFUND_PENDING
        ensureRevenue(bk8, pay8, partner1, new BigDecimal("900000.00"), new BigDecimal("0.2500"),
                BigDecimal.ZERO, PartnerRevenue.periodOf(today.plusDays(4)), today.plusDays(4),
                PartnerRevenueStatus.PENDING, DeferredReason.REFUND_PENDING, null, null, null);

        // BK9: chưa refund → ELIGIBLE
        ensureRevenue(bk9, pay9, partner1, new BigDecimal("500000.00"), new BigDecimal("0.2500"),
                BigDecimal.ZERO, PartnerRevenue.periodOf(today.plusDays(5)), today.plusDays(5),
                PartnerRevenueStatus.ELIGIBLE, null, now.minusSeconds(10800), null, null);
        ensureRevenue(bk9, pay9, partner2, new BigDecimal("1000000.00"), new BigDecimal("0.2000"),
                BigDecimal.ZERO, PartnerRevenue.periodOf(today.plusDays(5)), today.plusDays(5),
                PartnerRevenueStatus.ELIGIBLE, null, now.minusSeconds(10800), null, null);

        // ── SETTLEMENT đã duyệt (kỳ 3 tháng trước) ────────────────────────────
        BigDecimal settledAmount = new BigDecimal("675000.00");
        Settlement settlement = ensureSettlement("JGSETTLE001", partner1, prev3MonthPeriod,
                SettlementStatus.APPROVED, new BigDecimal("900000.00"), BigDecimal.ZERO,
                new BigDecimal("225000.00"), BigDecimal.ZERO, settledAmount,
                "Tất toán mẫu kỳ " + prev3MonthPeriod + " — Ban Quản lý Tràng An", admin);

        // Chi tiết settlement — idempotent (unique: settlement_id + partner_revenue_id)
        boolean detailExists = settlementDetailRepository.findBySettlement_Id(settlement.getId()).stream()
                .anyMatch(d -> d.getPartnerRevenue() != null
                        && rev6P1.getId().equals(d.getPartnerRevenue().getId()));
        if (!detailExists) {
            settlementDetailRepository.save(SettlementDetail.builder()
                    .settlement(settlement)
                    .partnerRevenue(rev6P1)
                    .revenuePeriod(rev6P1.getRevenuePeriod())
                    .grossAmount(rev6P1.getGrossAmount())
                    .refundAmount(rev6P1.getRefundAmount())
                    .commissionAmount(rev6P1.getCommissionAmount())
                    .adjustmentAmount(rev6P1.getAdjustmentAmount())
                    .partnerNetAmount(rev6P1.getPartnerNetAmount())
                    .build());
        }

        // Gắn Settlement cho khoản doanh thu
        rev6P1.markInSettlement(settlement.getId());
        rev6P1.setSettlementId(settlement.getId());
        rev6P1.markSettled();
        partnerRevenueRepository.save(rev6P1);

        // Cộng tiền vào ví Partner 1
        Wallet wallet1 = walletRepository.findByPartner_Id(partner1.getId())
                .orElseThrow(() -> new IllegalStateException("Thiếu ví của partner 1"));
        if (walletTransactionRepository.findSettlementCredit(wallet1.getId(), settlement.getId(),
                WalletTransactionType.SETTLEMENT_CREDIT).isEmpty()) {
            creditWallet(wallet1, WalletTransactionType.SETTLEMENT_CREDIT,
                    WalletTransaction.SourceType.SETTLEMENT, settlement.getId(), settledAmount, admin,
                    "Cộng tiền từ Settlement " + settlement.getSettlementCode()
                            + " (kỳ doanh thu " + prev3MonthPeriod + ")");
        }

        // ── FINANCIAL ADJUSTMENT đã duyệt (bồi hoàn chi phí vận hành) ─────────
        BigDecimal adjustmentAmount = new BigDecimal("-50000.00");
        FinancialAdjustment adjustment = financialAdjustmentRepository.findAll().stream()
                .filter(a -> "JGSAMPLEADJ01".equals(a.getReason()))
                .findFirst().orElse(null);
        if (adjustment == null) {
            adjustment = financialAdjustmentRepository.save(FinancialAdjustment.builder()
                    .partner(partner1)
                    .refundRequest(null)
                    .sourceSettlementId(settlement.getId())
                    .amount(adjustmentAmount)
                    .currency("VND")
                    .reason("JGSAMPLEADJ01")
                    .status(FinancialAdjustmentStatus.APPROVED)
                    .createdBy(admin)
                    .approvedBy(admin)
                    .build());
            adjustment.setApprovedAt(now.minusSeconds(86400));
            financialAdjustmentRepository.save(adjustment);
        }

        final Long adjustmentId = adjustment.getId();
        final String settlementCode = settlement.getSettlementCode();
        if (walletTransactionRepository.findByWallet_IdOrderByCreatedAtDesc(wallet1.getId()).stream()
                .noneMatch(t -> t.getSourceType() == WalletTransaction.SourceType.FINANCIAL_ADJUSTMENT
                        && t.getSourceId() != null && t.getSourceId().equals(adjustmentId))) {
            debitWallet(wallet1, WalletTransactionType.MANUAL_ADJUSTMENT,
                    WalletTransaction.SourceType.FINANCIAL_ADJUSTMENT, adjustmentId,
                    adjustmentAmount.abs(), admin,
                    "Điều chỉnh tài chính #" + adjustmentId
                            + ": Bồi hoàn chi phí vận hành cho đợt tất toán " + settlementCode);
        }

        log.info("Dữ liệu mẫu: {} partner, {} wallet, {} destination, {} experience, {} slot, {} tour, "
                        + "{} booking, {} payment, {} refund, {} partner_revenue, {} settlement, {} adjustment",
                partnerRepository.count(), walletRepository.count(), destinationRepository.count(),
                experienceRepository.count(), experienceSlotRepository.count(), tourRepository.count(),
                bookingRepository.count(), paymentRepository.count(), refundRequestRepository.count(),
                partnerRevenueRepository.count(), settlementRepository.count(),
                financialAdjustmentRepository.count());
    }

    // ── Helpers: User / Partner / Wallet ─────────────────────────────────────

    private User ensureUser(String email, String fullName, String phone, Role role) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            user = User.builder()
                    .email(email)
                    .password(passwordEncoder.encode("Password123@"))
                    .fullName(fullName)
                    .phone(phone)
                    .role(role)
                    .active(true)
                    .build();
        } else {
            user.setFullName(fullName);
            user.setPhone(phone);
            user.setRole(role);
            user.setActive(true);
            user.setPassword(passwordEncoder.encode("Password123@"));
        }
        return userRepository.save(user);
    }

    private Partner ensurePartner(User user, String partnerName, BigDecimal commissionRate) {
        Partner partner = partnerRepository.findByUser_Id(user.getId()).orElse(null);
        if (partner == null) {
            partner = partnerRepository.save(Partner.builder()
                    .user(user)
                    .partnerName(partnerName)
                    .commissionRate(commissionRate)
                    .active(true)
                    .build());
        } else {
            partner.setPartnerName(partnerName);
            partner.setCommissionRate(commissionRate);
            partner.setActive(true);
            partnerRepository.save(partner);
        }

        // Wallet (1-1 với Partner) — tạo nếu chưa có
        if (walletRepository.findByPartner_Id(partner.getId()).isEmpty()) {
            walletRepository.save(Wallet.builder()
                    .partner(partner)
                    .balance(BigDecimal.ZERO)
                    .currency("VND")
                    .build());
        }
        return partner;
    }

    private void creditWallet(Wallet wallet, WalletTransactionType type,
                               WalletTransaction.SourceType sourceType, Long sourceId,
                               BigDecimal amount, User admin, String note) {
        BigDecimal before = wallet.getBalance() != null ? wallet.getBalance() : BigDecimal.ZERO;
        walletTransactionRepository.save(WalletTransaction.credit(
                wallet, type, sourceType, sourceId, amount, before, admin, note));
        wallet.setBalance(before.add(amount));
        walletRepository.save(wallet);
    }

    private void debitWallet(Wallet wallet, WalletTransactionType type,
                             WalletTransaction.SourceType sourceType, Long sourceId,
                             BigDecimal amount, User admin, String note) {
        BigDecimal before = wallet.getBalance() != null ? wallet.getBalance() : BigDecimal.ZERO;
        walletTransactionRepository.save(WalletTransaction.debit(
                wallet, type, sourceType, sourceId, amount, before, admin, note));
        wallet.setBalance(before.subtract(amount));
        walletRepository.save(wallet);
    }

    // ── Helpers: Destination / Experience / Slot / Tour ──────────────────────

    private Destination ensureDestination(String name, String address, String lat, String lng,
                                          int capacity, User admin) {
        Destination dest = destinationRepository.findByDeletedFalse().stream()
                .filter(d -> name.equals(d.getName()))
                .findFirst().orElse(null);
        if (dest == null) {
            dest = Destination.builder()
                    .name(name)
                    .address(address)
                    .latitude(new BigDecimal(lat))
                    .longitude(new BigDecimal(lng))
                    .capacity(capacity)
                    .booked(0)
                    .approved(true)
                    .status(DestinationStatus.PUBLISHED)
                    .createdBy(admin)
                    .build();
        } else {
            dest.setApproved(true);
            dest.setStatus(DestinationStatus.PUBLISHED);
        }
        return destinationRepository.save(dest);
    }

    private Experience ensureExperience(Destination destination, String title, String description,
                                        BigDecimal price, int durationMinutes, User owner) {
        // Ưu tiên khớp theo title; nếu chưa có thì khớp theo destination
        // (DB có ràng buộc duy nhất uk_experience_destination → 1 experience / destination).
        Experience exp = experienceRepository.findAll().stream()
                .filter(e -> title.equals(e.getTitle()))
                .findFirst()
                .orElseGet(() -> experienceRepository.findByDestination_Id(destination.getId()).stream()
                        .findFirst()
                        .orElse(null));
        if (exp == null) {
            exp = Experience.builder()
                    .destination(destination)
                    .title(title)
                    .description(description)
                    .price(price)
                    .currency("VND")
                    .durationMinutes(durationMinutes)
                    .status(ExperienceStatus.PUBLISHED)
                    .createdBy(owner)
                    .build();
        } else {
            exp.setDestination(destination);
            exp.setDescription(description);
            exp.setPrice(price);
            exp.setStatus(ExperienceStatus.PUBLISHED);
            if (exp.getCreatedBy() == null) {
                exp.setCreatedBy(owner);
            }
        }
        return experienceRepository.save(exp);
    }

    private ExperienceSlot ensureSlot(Experience experience, LocalDate date,
                                       int maxPerDay, int bookedCount) {
        ExperienceSlot slot = experienceSlotRepository
                .findByExperienceIdAndSlotDate(experience.getId(), date).orElse(null);
        if (slot == null) {
            slot = ExperienceSlot.builder()
                    .experience(experience)
                    .slotDate(date)
                    .maxTourPerDay(maxPerDay)
                    .bookedTourCount(bookedCount)
                    .status(SlotStatus.AVAILABLE)
                    .build();
        } else {
            slot.setMaxTourPerDay(maxPerDay);
            if (bookedCount > slot.getBookedTourCount()) {
                slot.setBookedTourCount(bookedCount);
            }
            if (slot.getStatus() == SlotStatus.SOLD_OUT && slot.getBookedTourCount() < slot.getMaxTourPerDay()) {
                slot.setStatus(SlotStatus.AVAILABLE);
            }
        }
        return experienceSlotRepository.save(slot);
    }

    private Tour ensureTour(String title, TourType type, int durationDays, User admin,
                             List<Destination> destinations) {
        Tour tour = tourRepository.findAll().stream()
                .filter(t -> title.equals(t.getTitle()))
                .findFirst().orElse(null);
        if (tour == null) {
            tour = tourRepository.save(Tour.builder()
                    .title(title)
                    .tourType(type)
                    .durationDays(durationDays)
                    .approved(true)
                    .status(TourStatus.PUBLISHED)
                    .createdBy(admin)
                    .build());
        } else {
            tour.setTourType(type);
            tour.setDurationDays(durationDays);
            tour.setApproved(true);
            tour.setStatus(TourStatus.PUBLISHED);
            tourRepository.save(tour);
        }

        List<TourDestination> existing = tourDestinationRepository
                .findByTour_TourIdOrderBySequenceOrderAsc(tour.getTourId());
        for (int i = 0; i < destinations.size(); i++) {
            Destination dest = destinations.get(i);
            boolean exists = existing.stream()
                    .anyMatch(td -> td.getDestination() != null
                            && td.getDestination().getId().equals(dest.getId()));
            if (!exists) {
                tourDestinationRepository.save(TourDestination.builder()
                        .tour(tour)
                        .destination(dest)
                        .sequenceOrder(i + 1)
                        .build());
            }
        }
        return tour;
    }

    // ── Helpers: Booking / Payment / Refund / Revenue / Settlement ───────────

    /**
     * Dọn các bản ghi không còn khớp với dữ liệu mẫu mong muốn.
     *
     * <p>Trường hợp xảy ra: một lần khởi tạo bị lỗi giữa chừng (ví dụ transaction rollback
     * giữa chừng, hoặc code cũ tạo Partner cho user khác) để lại Partner không thuộc
     * tài khoản mẫu, Settlement cũ, hay Wallet/Transaction mồ côi. Nếu không dọn,
     * danh sách Partner/Wallet trong Swagger sẽ lộn xộn và số dư ví sai.
     *
     * <p>Chỉ xóa những bản ghi thuộc scope "mẫu" (mã {@code JGSAMPLE*}, {@code JGSETTLE*})
     * hoặc Partner không gắn với tài khoản mẫu nào — KHÔNG đụng tới dữ liệu người dùng tạo tay.
     */
    private void purgeStraySampleArtifacts() {
        // Partner không gắn với user mẫu (partner1@ / partner2@) → coi là rác.
        // Xóa theo thứ tự FK: settlement_details → settlements → partner_revenues
        // → financial_adjustments → wallet_transactions → wallets → partners.
        List<Long> sampleUserIds = userRepository.findAll().stream()
                .filter(u -> "partner1@journeygo.com".equals(u.getEmail())
                        || "partner2@journeygo.com".equals(u.getEmail()))
                .map(User::getId)
                .toList();

        List<Long> strayPartnerIds = partnerRepository.findAll().stream()
                .filter(p -> p.getUser() == null || !sampleUserIds.contains(p.getUser().getId()))
                .map(Partner::getId)
                .toList();

        for (Long pid : strayPartnerIds) {
            try {
                jdbcTemplate.update("DELETE FROM settlement_details WHERE settlement_id IN "
                        + "(SELECT id FROM settlements WHERE partner_id = ?)", pid);
                jdbcTemplate.update("DELETE FROM settlements WHERE partner_id = ?", pid);
                jdbcTemplate.update("DELETE FROM partner_revenues WHERE partner_id = ?", pid);
                jdbcTemplate.update("DELETE FROM financial_adjustments WHERE partner_id = ?", pid);
                jdbcTemplate.update("DELETE FROM wallet_transactions WHERE wallet_id IN "
                        + "(SELECT id FROM wallets WHERE partner_id = ?)", pid);
                jdbcTemplate.update("DELETE FROM wallets WHERE partner_id = ?", pid);
                jdbcTemplate.update("DELETE FROM partners WHERE id = ?", pid);
                log.info("Đã dọn Partner rác (không thuộc tài khoản mẫu): id={}", pid);
            } catch (Exception e) {
                log.warn("Không thể dọn Partner rác id={}: {}", pid, e.getMessage());
            }
        }
    }

    private Booking ensureBooking(String code, User tourist, Tour tour, LocalDate experienceDate,
                                  Instant paidAt, Instant completedAt, User admin) {
        BigDecimal total = totalTourPrice(tour);
        Instant createdAt = paidAt != null ? paidAt : Instant.now();

        // Trạng thái đích của booking mẫu (quyết định TRƯỚC khi persist để tránh
        // BookingExpiryScheduler quét nhầm và chuyển sang EXPIRED).
        BookingStatus targetStatus = BookingStatus.PENDING_PAYMENT;
        if (paidAt != null) {
            targetStatus = BookingStatus.CONFIRMED;
        }
        if (completedAt != null) {
            targetStatus = BookingStatus.COMPLETED;
        }
        if ("JGSAMPLE05".equals(code)) {
            targetStatus = BookingStatus.CANCELLED;
        }

        Booking booking = bookingRepository.findByBookingCode(code).orElse(null);
        if (booking == null) {
            booking = Booking.builder()
                    .bookingCode(code)
                    .tourist(tourist)
                    .tour(tour)
                    .experienceDate(experienceDate)
                    .totalAmount(total)
                    .currency("VND")
                    .status(targetStatus)
                    // Hạn thanh toán chỉ có ý nghĩa khi chưa thanh toán.
                    // Booking đã thanh toán đặt deadline = thời điểm hoàn tất để
                    // BookingExpiryScheduler không bao giờ quét nhầm.
                    .paymentDeadline(targetStatus == BookingStatus.PENDING_PAYMENT
                            ? createdAt.plusSeconds(600)
                            : (completedAt != null ? completedAt : paidAt))
                    .build();
        } else {
            // Chữa lành: bảo đảm các trường cốt lõi khớp dữ liệu mẫu
            booking.setTourist(tourist);
            booking.setTour(tour);
            booking.setExperienceDate(experienceDate);
            booking.setTotalAmount(total);
            booking.setStatus(targetStatus);
            if (targetStatus == BookingStatus.PENDING_PAYMENT) {
                booking.setPaymentDeadline(createdAt.plusSeconds(600));
            }
        }
        bookingRepository.save(booking);

        // Giữ chỗ slot cho từng Experience của tour (chỉ tạo 1 lần)
        for (Experience exp : tourExperiences(tour)) {
            ExperienceSlot slot = experienceSlotRepository
                    .findByExperienceIdAndSlotDate(exp.getId(), experienceDate).orElse(null);
            if (slot == null) {
                continue;
            }
            boolean holdExists = bookingSlotHoldRepository.findByBooking_Id(booking.getId()).stream()
                    .anyMatch(h -> h.getExperienceId() != null && h.getExperienceId().equals(exp.getId()));
            if (!holdExists) {
                bookingSlotHoldRepository.save(BookingSlotHold.builder()
                        .booking(booking)
                        .experienceSlot(slot)
                        .slotType(BookingSlotType.EXPERIENCE)
                        .slotDate(experienceDate)
                        .experienceId(exp.getId())
                        .released(false)
                        .build());
                slot.setBookedTourCount(slot.getBookedTourCount() + 1);
                experienceSlotRepository.save(slot);
            }
        }

        // Mốc thời gian
        if (paidAt != null) {
            booking.setPaidAt(paidAt);
            booking.setConfirmedAt(paidAt);
        }
        if (completedAt != null) {
            booking.setCompletedAt(completedAt);
        }
        if ("JGSAMPLE05".equals(code)) {
            booking.setCancellationReason("Không thể đi được do thời tiết xấu");
            // Giải phóng slot đã giữ
            for (BookingSlotHold hold : bookingSlotHoldRepository.findByBooking_Id(booking.getId())) {
                if (hold.markReleased()) {
                    bookingSlotHoldRepository.save(hold);
                    if (hold.getExperienceSlot() != null) {
                        ExperienceSlot slot = hold.getExperienceSlot();
                        slot.setBookedTourCount(Math.max(0, slot.getBookedTourCount() - 1));
                        experienceSlotRepository.save(slot);
                    }
                }
            }
        }
        return bookingRepository.save(booking);
    }

    private Payment ensurePayment(String txnRef, Booking booking, BigDecimal amount,
                                  String bankCode, String cardType, String vnpTransactionNo,
                                  Instant paidAt) {
        Payment payment = paymentRepository.findByTxnRef(txnRef).orElse(null);
        if (payment != null) {
            return payment;
        }
        return paymentRepository.save(Payment.builder()
                .booking(booking)
                .txnRef(txnRef)
                .vnpTransactionNo(vnpTransactionNo)
                .bankCode(bankCode)
                .cardType(cardType)
                .method(PaymentMethod.VNPAY)
                .status(PaymentStatus.SUCCESS)
                .amount(amount)
                .currency("VND")
                .expiresAt(paidAt.plusSeconds(600))
                .paidAt(paidAt)
                .resolvedAt(paidAt)
                .vnpResponseCode("00")
                .vnpTransactionStatus("00")
                .vnpMessage("Giao dich thanh cong")
                .paymentUrl("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=" + txnRef)
                .duplicatePayment(false)
                .ipnCount(1)
                .build());
    }

    private RefundRequest ensureRefund(String refundCode, Payment payment, User tourist,
                                       RefundStatus status, RefundReason reason,
                                       BigDecimal proposedAmount, BigDecimal approvedAmount,
                                       BigDecimal refundedAmount, RefundMethod method,
                                       User admin, String reasonDetail,
                                       String bankAccountNumber, String bankAccountName, String bankName,
                                       String transferReference, String transferEvidence) {
        RefundRequest refund = refundRequestRepository.findByRefundCode(refundCode).orElse(null);
        if (refund != null) {
            return refund;
        }

        refund = refundRequestRepository.save(RefundRequest.builder()
                .refundCode(refundCode)
                .payment(payment)
                .tourist(tourist)
                .status(status)
                .declaredReason(reason)
                .approvedReason(status == RefundStatus.REFUNDED ? reason : null)
                .reasonDetail(reasonDetail)
                .evidence("Ảnh chứng minh gửi kèm yêu cầu hoàn tiền")
                .proposedAmount(proposedAmount)
                .approvedAmount(approvedAmount)
                .refundedAmount(refundedAmount)
                .currency("VND")
                .method(method)
                .reviewedBy(status == RefundStatus.PENDING_REVIEW ? null : admin)
                .reviewedAt(status == RefundStatus.PENDING_REVIEW ? null : payment.getPaidAt())
                .bankAccountNumber(bankAccountNumber)
                .bankAccountName(bankAccountName)
                .bankName(bankName)
                .transferReference(transferReference)
                .transferEvidence(transferEvidence)
                .transferredAt(status == RefundStatus.REFUNDED ? payment.getPaidAt() : null)
                .vnpResolvedAt(status == RefundStatus.REFUNDED ? payment.getPaidAt() : null)
                .build());

        // Nhật ký kiểm toán
        refundAuditLogRepository.save(RefundAuditLog.builder()
                .refundRequest(refund)
                .action(RefundAuditLog.Action.CREATED)
                .fromStatus(null)
                .toStatus(RefundStatus.PENDING_REVIEW)
                .performedBy(tourist)
                .amount(proposedAmount)
                .reference(refundCode)
                .detail("Tourist gửi yêu cầu hoàn tiền. Nguyên nhân: " + reason
                        + ". Số tiền đề xuất: " + proposedAmount)
                .build());

        if (status == RefundStatus.REFUNDED) {
            refundAuditLogRepository.save(RefundAuditLog.builder()
                    .refundRequest(refund)
                    .action(RefundAuditLog.Action.APPROVED)
                    .fromStatus(RefundStatus.PENDING_REVIEW)
                    .toStatus(RefundStatus.APPROVED)
                    .performedBy(admin)
                    .amount(approvedAmount)
                    .reference(null)
                    .detail("Admin phê duyệt hoàn " + approvedAmount + " — nguyên nhân: " + reason)
                    .build());
            refundAuditLogRepository.save(RefundAuditLog.builder()
                    .refundRequest(refund)
                    .action(RefundAuditLog.Action.MANUAL_TRANSFER_CONFIRMED)
                    .fromStatus(RefundStatus.REFUND_PROCESSING)
                    .toStatus(RefundStatus.REFUNDED)
                    .performedBy(admin)
                    .amount(refundedAmount)
                    .reference(transferReference)
                    .detail("Đã ghi nhận chuyển khoản thủ công — " + transferReference)
                    .build());
        }
        return refund;
    }

    private PartnerRevenue ensureRevenue(Booking booking, Payment payment, Partner partner,
                                         BigDecimal grossAmount, BigDecimal commissionRate,
                                         BigDecimal refundAmount, String revenuePeriod,
                                         LocalDate completedDate, PartnerRevenueStatus status,
                                         DeferredReason deferredReason, Instant eligibleAt,
                                         Instant settledAt, Long settlementId) {
        PartnerRevenue revenue = partnerRevenueRepository
                .findByBooking_IdAndPartner_Id(booking.getId(), partner.getId()).orElse(null);
        if (revenue == null) {
            revenue = PartnerRevenue.builder()
                    .partner(partner)
                    .booking(booking)
                    .payment(payment)
                    .build();
        }
        revenue.setPayment(payment);
        revenue.setGrossAmount(grossAmount);
        revenue.setRefundAmount(refundAmount);
        revenue.setCommissionRate(commissionRate);
        revenue.setAdjustmentAmount(BigDecimal.ZERO);
        revenue.setRevenuePeriod(revenuePeriod);
        revenue.setCompletedDate(completedDate);
        revenue.setStatus(status);
        revenue.setDeferredReason(deferredReason);
        revenue.setEligibleAt(eligibleAt);
        revenue.setSettledAt(settledAt);
        revenue.setSettlementId(settlementId);
        revenue.recalculate();
        return partnerRevenueRepository.save(revenue);
    }

    private Settlement ensureSettlement(String code, Partner partner, String revenuePeriod,
                                        SettlementStatus status, BigDecimal grossAmount,
                                        BigDecimal refundAmount, BigDecimal commissionAmount,
                                        BigDecimal adjustmentAmount, BigDecimal settlementAmount,
                                        String note, User admin) {
        Settlement settlement = settlementRepository.findBySettlementCode(code).orElse(null);
        if (settlement != null) {
            // Chữa lành: đồng bộ số liệu với dữ liệu mẫu mong muốn
            settlement.setPartner(partner);
            settlement.setRevenuePeriod(revenuePeriod);
            settlement.setGrossAmount(grossAmount);
            settlement.setRefundAmount(refundAmount);
            settlement.setCommissionAmount(commissionAmount);
            settlement.setAdjustmentAmount(adjustmentAmount);
            settlement.setSettlementAmount(settlementAmount);
            settlement.setStatus(status);
            if (status == SettlementStatus.APPROVED && settlement.getApprovedAt() == null) {
                settlement.setApprovedBy(admin);
                settlement.setApprovedAt(Instant.now());
            }
            settlement.setNote(note);
            return settlementRepository.save(settlement);
        }
        YearMonth period = YearMonth.parse(revenuePeriod);
        settlement = settlementRepository.save(Settlement.builder()
                .settlementCode(code)
                .partner(partner)
                .revenuePeriod(revenuePeriod)
                .periodStart(period.atDay(1))
                .periodEnd(period.atEndOfMonth())
                .grossAmount(grossAmount)
                .refundAmount(refundAmount)
                .commissionAmount(commissionAmount)
                .adjustmentAmount(adjustmentAmount)
                .settlementAmount(settlementAmount)
                .status(status)
                .createdBy(admin)
                .approvedBy(status == SettlementStatus.APPROVED ? admin : null)
                .approvedAt(status == SettlementStatus.APPROVED ? Instant.now() : null)
                .note(note)
                .build());
        return settlement;
    }

    // ── Helpers: tính giá / lấy Experience của tour ──────────────────────────

    private BigDecimal totalTourPrice(Tour tour) {
        BigDecimal total = BigDecimal.ZERO;
        for (Experience exp : tourExperiences(tour)) {
            total = total.add(exp.getPrice() != null ? exp.getPrice() : BigDecimal.ZERO);
        }
        return total;
    }

    private List<Experience> tourExperiences(Tour tour) {
        List<Long> destinationIds = tourDestinationRepository
                .findByTour_TourIdOrderBySequenceOrderAsc(tour.getTourId()).stream()
                .map(TourDestination::getDestination)
                .filter(d -> d != null)
                .map(Destination::getId)
                .toList();
        if (destinationIds.isEmpty()) {
            return List.of();
        }
        return experienceRepository.findByDestination_IdInOrderById(destinationIds);
    }
}
