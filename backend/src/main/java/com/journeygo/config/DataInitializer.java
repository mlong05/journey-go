package com.journeygo.config;

import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.entity.Region;
import com.journeygo.modules.destination.entity.Theme;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.destination.repository.RegionRepository;
import com.journeygo.modules.destination.repository.ThemeRepository;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.journeygo.modules.finance.entity.CommissionPolicy;
import com.journeygo.modules.gamification.entity.Badge;
import com.journeygo.modules.gamification.entity.UserPoint;
import com.journeygo.modules.voucher.entity.Voucher;
import com.journeygo.modules.gamification.entity.enums.BadgeType;
import com.journeygo.modules.voucher.entity.enums.DiscountType;
import com.journeygo.modules.gamification.repository.BadgeRepository;
import com.journeygo.modules.gamification.repository.UserPointRepository;
import com.journeygo.modules.voucher.repository.VoucherRepository;

import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.entity.BookingSlotHold;
import com.journeygo.modules.booking.entity.enums.BookingPassengerStatus;
import com.journeygo.modules.booking.entity.enums.BookingSlotType;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.repository.BookingPassengerRepository;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.booking.repository.BookingSlotHoldRepository;
import com.journeygo.modules.moderation.entity.TourReview;
import com.journeygo.modules.moderation.entity.TourReviewHistory;
import com.journeygo.modules.moderation.entity.enums.TourReviewAction;
import com.journeygo.modules.moderation.entity.enums.TourReviewStatus;
import com.journeygo.modules.moderation.repository.TourReviewHistoryRepository;
import com.journeygo.modules.moderation.repository.TourReviewRepository;
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
import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.providerprofile.repository.ProviderProfileRepository;
import com.journeygo.modules.providerrevenue.entity.ProviderRevenue;
import com.journeygo.modules.providerrevenue.entity.enums.DeferredReason;
import com.journeygo.modules.providerrevenue.entity.enums.ProviderRevenueStatus;
import com.journeygo.modules.providerrevenue.repository.ProviderRevenueRepository;
import com.journeygo.modules.reward.entity.RewardSettingCode;
import com.journeygo.modules.reward.service.RewardSettingService;
import com.journeygo.modules.settlement.entity.FinancialAdjustment;
import com.journeygo.modules.settlement.entity.Settlement;
import com.journeygo.modules.settlement.entity.SettlementDetail;
import com.journeygo.modules.settlement.entity.enums.FinancialAdjustmentStatus;
import com.journeygo.modules.settlement.entity.enums.SettlementStatus;
import com.journeygo.modules.settlement.repository.FinancialAdjustmentRepository;
import com.journeygo.modules.settlement.repository.SettlementDetailRepository;
import com.journeygo.modules.settlement.repository.SettlementRepository;
import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.QuestionType;
import com.journeygo.modules.tour.entity.StopQuestionKind;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourDepartureDate;
import com.journeygo.modules.tour.entity.TourFormat;
import com.journeygo.modules.tour.entity.TourItineraryDay;
import com.journeygo.modules.tour.entity.TourPrice;
import com.journeygo.modules.tour.entity.TourSlot;
import com.journeygo.modules.tour.entity.TourSlotStatus;
import com.journeygo.modules.tour.entity.TourStop;
import com.journeygo.modules.tour.entity.TourStopAnswer;
import com.journeygo.modules.tour.entity.TourStopArtifact;
import com.journeygo.modules.tour.entity.TourStopExperience;
import com.journeygo.modules.tour.entity.TourStopQuestion;
import com.journeygo.modules.tour.entity.TourType;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.tour.repository.TourSlotRepository;
import com.journeygo.modules.wallet.entity.Wallet;
import com.journeygo.modules.wallet.entity.WalletTransaction;
import com.journeygo.modules.wallet.entity.enums.WalletTransactionDirection;
import com.journeygo.modules.wallet.entity.enums.WalletTransactionStatus;
import com.journeygo.modules.wallet.entity.enums.WalletTransactionType;
import com.journeygo.modules.wallet.repository.WalletRepository;
import com.journeygo.modules.wallet.repository.WalletTransactionRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Khởi tạo dữ liệu nền của JourneyGo.
 *
 * <p>Cấu trúc file được chia làm 3 bước (theo đúng thứ tự khởi động ứng dụng):
 * <ol>
 *   <li>{@code initDefaultUsers} — tài khoản hệ thống, hồ sơ đối tác, ví, danh mục
 *       (khu vực, chủ đề, huy hiệu, voucher, chính sách hoa hồng…).</li>
 *   <li>{@code initCatalogData} — <b>catalog tour</b> được sinh bằng code thuần theo đúng
 *       cấu trúc của luồng "đối tác tạo tour 5 bước" rồi được Moderator duyệt
 *       (giống hệt dữ liệu sinh ra khi tạo thủ công qua UI/API).</li>
 *   <li>{@code initSampleBookingData} — <b>giao dịch mẫu</b> (đặt tour → thanh toán →
 *       hoàn tiền → doanh thu đối tác → tất toán) theo đúng luồng đặt tour nhóm.</li>
 * </ol>
 *
 * <p>⚠️ Bước 2 và 3 chỉ chạy trên DB trống (fresh run):
 * {@code tourRepository.count() == 0} và {@code bookingRepository.count() == 0}.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataInitializer {

    private final UserRepository userRepository;
    private final com.journeygo.modules.user.repository.RoleRepository roleRepository;
    private final DestinationRepository destinationRepository;
    private final RegionRepository regionRepository;
    private final ThemeRepository themeRepository;
    private final TaskTypeRepository taskTypeRepository;
    private final PointRuleRepository pointRuleRepository;
    private final PasswordEncoder passwordEncoder;
    private final BadgeRepository badgeRepository;
    private final VoucherRepository voucherRepository;
    private final UserPointRepository userPointRepository;

    // ── Repository cho dữ liệu mẫu (Booking → Payment → Refund → Settlement) ──
    private final TourRepository tourRepository;
    private final TourSlotRepository tourSlotRepository;
    private final TourReviewRepository tourReviewRepository;
    private final TourReviewHistoryRepository tourReviewHistoryRepository;
    private final BookingRepository bookingRepository;
    private final BookingPassengerRepository bookingPassengerRepository;
    private final BookingSlotHoldRepository bookingSlotHoldRepository;
    private final PaymentRepository paymentRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final RefundAuditLogRepository refundAuditLogRepository;
    private final ProviderProfileRepository providerProfileRepository;
    private final ProviderRevenueRepository providerRevenueRepository;
    private final SettlementRepository settlementRepository;
    private final SettlementDetailRepository settlementDetailRepository;
    private final FinancialAdjustmentRepository financialAdjustmentRepository;
    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final PlatformTransactionManager transactionManager;
    private final com.journeygo.modules.providerprofile.service.ProviderProfileService providerProfileService;
    private final com.journeygo.modules.finance.repository.CommissionPolicyRepository commissionPolicyRepository;
    private final RewardSettingService rewardSettingService;

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    // ══════════════════════════════════════════════════════════════════════════════
    //  BƯỚC 1 — TÀI KHOẢN & DANH MỤC HỆ THỐNG
    // ══════════════════════════════════════════════════════════════════════════════

    @Bean
    @org.springframework.core.annotation.Order(1)
    public CommandLineRunner initDefaultUsers() {
        return args -> {
            // Khởi tạo các Role hệ thống cốt lõi nếu chưa có
            Role touristRole = roleRepository.findByName(Role.TOURIST)
                    .orElseGet(() -> roleRepository.save(new Role(Role.TOURIST, "Khách du lịch")));
            Role adminRole = roleRepository.findByName(Role.ADMIN)
                    .orElseGet(() -> roleRepository.save(new Role(Role.ADMIN, "Quản trị viên")));
            Role modRole = roleRepository.findByName(Role.CONTENT_MODERATOR)
                    .orElseGet(() -> roleRepository.save(new Role(Role.CONTENT_MODERATOR, "Kiểm duyệt viên")));
            Role providerRole = roleRepository.findByName(Role.CONTENT_PROVIDER)
                    .orElseGet(() -> roleRepository.save(new Role(Role.CONTENT_PROVIDER,
                            "Đối tác cung cấp nội dung và trải nghiệm")));

            // ── Tài khoản admin@journeygo.com (ADMIN) ─────────────────────────────────
            User admin = ensureCoreUser("admin@journeygo.com", "Hệ Thống Quản Trị", "0900000001",
                    adminRole, true);
            // `user@journeygo.com` giữ vai trò ADMIN như trước đây.
            ensureCoreUser("user@journeygo.com", "Quản Trị Viên (User)", "0900000002", adminRole, true);

            // ── Tài khoản moderator@journeygo.com (CONTENT_MODERATOR) ────────────────
            User moderator = ensureCoreUser("moderator@journeygo.com", "Chuyên Viên Thẩm Định",
                    "0900000003", modRole, true);

            // ── Tài khoản provider@journeygo.com (CONTENT_PROVIDER) ─────────────────
            // Cấp role CONTENT_PROVIDER => phải có ProviderProfile + Wallet.
            // `UserService` không được gọi ở đây (vòng lặp phụ thuộc), nên gọi trực tiếp
            // `ensureProfileAndWallet` — hàm này idempotent.
            User mainProvider = ensureCoreUser("provider@journeygo.com", "Ban Quản Lý Tràng An",
                    "0900000004", providerRole, true);
            providerProfileService.ensureProfileAndWallet(mainProvider);

            // ── Tài khoản tourist@journeygo.com (TOURIST) ────────────────────────────
            User tourist = ensureCoreUser("tourist@journeygo.com", "Nguyễn An", "0988123456",
                    touristRole, true);

            // ── Hai đối tác mẫu (dùng cho kịch bản doanh thu / tất toán) ──────────
            User provider1 = ensureCoreUser("provider1@journeygo.com", "Tràng An Heritage",
                    "0900000011", providerRole, true);
            User provider2 = ensureCoreUser("provider2@journeygo.com", "Hạ Long Bay Tours",
                    "0900000012", providerRole, true);
            providerProfileService.ensureProfileAndWallet(provider1);
            providerProfileService.ensureProfileAndWallet(provider2);

            // Tự động gán touristRole cho các user cũ nếu role bị null sau khi tạo cột role_id
            userRepository.findAll().forEach(u -> {
                if (u.getRole() == null) {
                    u.setRole(touristRole);
                    userRepository.save(u);
                }
            });

            // ── Khu vực & chủ đề (bước 1 của tour cần region/theme) ──────────────────
            ensureCatalogTaxonomy();

            // ── Khởi tạo các điểm di tích văn hóa lịch sử mẫu nếu chưa có ──────────
            if (destinationRepository.count() == 0) {
                destinationRepository.save(Destination.builder()
                        .name("Văn Miếu – Quốc Tử Giám")
                        .address("58 Quốc Tử Giám, Văn Miếu, Đống Đa, Hà Nội")
                        .latitude(new BigDecimal("21.0277000"))
                        .longitude(new BigDecimal("105.8351000"))
                        .capacity(5000)
                        .approved(true)
                        .createdBy(admin)
                        .build());
                destinationRepository.save(Destination.builder()
                        .name("Hoàng Thành Thăng Long")
                        .address("19C Hoàng Diệu, Quán Thánh, Ba Đình, Hà Nội")
                        .latitude(new BigDecimal("21.0364000"))
                        .longitude(new BigDecimal("105.8353000"))
                        .capacity(8000)
                        .approved(true)
                        .createdBy(admin)
                        .build());
                destinationRepository.save(Destination.builder()
                        .name("Làng Gốm Bát Tràng")
                        .address("Bát Tràng, Gia Lâm, Hà Nội")
                        .latitude(new BigDecimal("20.9785000"))
                        .longitude(new BigDecimal("105.9126000"))
                        .capacity(3000)
                        .approved(true)
                        .createdBy(admin)
                        .build());
                destinationRepository.save(Destination.builder()
                        .name("Quần Thể Di Sản Tràng An")
                        .address("Tràng An, Hoa Lư, Ninh Bình")
                        .latitude(new BigDecimal("20.2506000"))
                        .longitude(new BigDecimal("105.9048000"))
                        .capacity(10000)
                        .approved(true)
                        .createdBy(admin)
                        .build());
                destinationRepository.save(Destination.builder()
                        .name("Chùa Trấn Quốc & Hồ Tây")
                        .address("Đường Thanh Niên, Yên Phụ, Tây Hồ, Hà Nội")
                        .latitude(new BigDecimal("21.0483000"))
                        .longitude(new BigDecimal("105.8368000"))
                        .capacity(4000)
                        .approved(true)
                        .createdBy(admin)
                        .build());
                log.info("Khởi tạo danh mục di sản văn hóa trọng điểm thành công!");
            }

            // ── Seed TaskType + PointRule ──────────────────────────────────────────
            // Theo CONTEXT §3 mới: chỉ 2 loại TaskType.
            //   - QUIZ: câu hỏi trắc nghiệm / text 4 phương án.
            //   - REAL_WORLD_INTERACTIVE: câu hỏi tương tác ngoài thực tế (GPS check-in).
            //
            // Logic: LUÔN đồng bộ về đúng 2 loại này.
            List<String> desiredCodes = List.of("QUIZ", "REAL_WORLD_INTERACTIVE");
            List<String> legacyCodes = List.of("FIELD_CLUE", "LOCATION_VISIT", "QR_CHECKPOINT", "PHOTO_CHALLENGE");

            // 1. Xóa các TaskType cũ không dùng
            legacyCodes.forEach(code -> {
                taskTypeRepository.findAll().stream()
                        .filter(tt -> code.equals(tt.getCode()))
                        .findFirst()
                        .ifPresent(tt -> {
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
                                .code("QUIZ").name("Quiz – câu hỏi trắc nghiệm")
                                .hasQuestions(true).requiresLocation(false)
                                .verificationMethod(VerificationMethod.ANSWER_MATCH)
                                .build();
                        case "REAL_WORLD_INTERACTIVE" -> TaskType.builder()
                                .code("REAL_WORLD_INTERACTIVE").name("Tương tác thực tế")
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

                // Fetch id một lần để tránh LazyInitializationException.
                long taskTypeId = tt.getId();

                boolean hasRule = pointRuleRepository.findAll().stream()
                        .anyMatch(pr -> pr.getTaskType() != null
                                && taskTypeId == pr.getTaskType().getId());
                if (!hasRule) {
                    switch (code) {
                        case "QUIZ" -> pointRuleRepository.save(PointRule.builder()
                                .taskType(tt).basePoints(10)
                                .bonusMultiplier(new BigDecimal("1.50"))
                                .conditions(Map.of("firstAttempt", 1.5, "perfectScore", 1.2))
                                .build());
                        case "REAL_WORLD_INTERACTIVE" -> pointRuleRepository.save(PointRule.builder()
                                .taskType(tt).basePoints(50)
                                .bonusMultiplier(new BigDecimal("2.00"))
                                .conditions(Map.of("firstAttempt", 2.0, "onSiteVerified", 1.3, "perfectScore", 1.2))
                                .build());
                    }
                    log.info("Đã tạo PointRule cho TaskType: {}", code);
                }
            });

            log.info("Đồng bộ TaskType + PointRule hoàn tất. Tổng TaskType: {}", taskTypeRepository.count());

            // ── Seed Badges mẫu ────────────────────────────────────────────────────
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
                        .description("Tự tay trải nghiệm nét đẹp làng nghề gốm truyền thống")
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

            // ── Seed Vouchers mẫu ──────────────────────────────────────────────────
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

            // ── 100 điểm thưởng ban đầu cho tourist@journeygo.com ────────────────
            if (userPointRepository.findByUserId(tourist.getId()).isEmpty()) {
                userPointRepository.save(UserPoint.builder()
                        .userId(tourist.getId())
                        .currentBalance(100)
                        .lifetimeEarned(100)
                        .lifetimeSpent(0)
                        .build());
                log.info("Khởi tạo 100 điểm ban đầu cho tài khoản tourist@journeygo.com");
            }

            // ── Chính sách hoa hồng mặc định (nếu chưa có chính sách nào) ──────────
            if (commissionPolicyRepository.count() == 0) {
                commissionPolicyRepository.save(CommissionPolicy.builder()
                        .name("Chính sách hoa hồng mặc định")
                        .commissionRate(new BigDecimal("0.2000"))
                        .effectiveFrom(Instant.now())
                        .effectiveTo(null)
                        .changeReason("Khởi tạo chính sách hoa hồng mặc định của nền tảng")
                        .cancelled(false)
                        .build());
                log.info("Khởi tạo chính sách hoa hồng mặc định 20%");
            }

            log.info("Bước 1 — Khởi tạo tài khoản & danh mục hệ thống thành công "
                    + "(admin@, user@, moderator@, provider@, tourist@ — mật khẩu Password123@)");
        };
    }

    /**
     * Tài khoản lõi — luôn đồng bộ mật khẩu {@code Password123@} và trạng thái active.
     */
    private User ensureCoreUser(String email, String fullName, String phone, Role role, boolean active) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            user = User.builder()
                    .email(email)
                    .password(passwordEncoder.encode("Password123@"))
                    .fullName(fullName)
                    .phone(phone)
                    .role(role)
                    .active(active)
                    .build();
        } else {
            user.setFullName(fullName);
            user.setPhone(phone);
            user.setRole(role);
            user.setActive(active);
            user.setPassword(passwordEncoder.encode("Password123@"));
        }
        return userRepository.save(user);
    }

    /**
     * Bảo đảm có đủ khu vực & chủ đề dùng cho tour. Idempotent: ưu tiên khớp theo slug,
     * sau đó theo tên (trường hợp Admin đã tạo trước với tên khác).
     */
    private void ensureCatalogTaxonomy() {
        ensureRegion("mien-bac", "Miền Bắc");
        ensureRegion("mien-trung", "Miền Trung");
        ensureRegion("mien-nam", "Miền Nam");
        ensureRegion("mien-tay-nam-bo", "Miền Tây Nam Bộ");

        ensureTheme("di-san", "Di sản");
        ensureTheme("lang-nghe", "Làng nghề");
        ensureTheme("am-thuc", "Ẩm thực");
        ensureTheme("tam-linh", "Tâm linh");
        ensureTheme("le-hoi", "Lễ hội");
    }

    private Region ensureRegion(String slug, String name) {
        Region region = regionRepository.findBySlugAndDeletedFalse(slug).orElse(null);
        if (region == null) {
            region = regionRepository.findByDeletedFalse().stream()
                    .filter(r -> r.getName() != null && r.getName().equalsIgnoreCase(name))
                    .findFirst().orElse(null);
        }
        if (region == null) {
            region = regionRepository.save(Region.builder()
                    .name(name)
                    .slug(slug)
                    .deleted(false)
                    .build());
            log.info("Đã tạo khu vực: {} ({})", name, slug);
        }
        return region;
    }

    private Theme ensureTheme(String slug, String name) {
        Theme theme = themeRepository.findBySlugAndDeletedFalse(slug).orElse(null);
        if (theme == null) {
            theme = themeRepository.findByDeletedFalse().stream()
                    .filter(t -> t.getName() != null && t.getName().equalsIgnoreCase(name))
                    .findFirst().orElse(null);
        }
        if (theme == null) {
            theme = themeRepository.save(Theme.builder()
                    .name(name)
                    .slug(slug)
                    .deleted(false)
                    .build());
            log.info("Đã tạo chủ đề: {} ({})", name, slug);
        }
        return theme;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  BƯỚC 2 — CATALOG TOUR (sinh bằng code, đúng cấu trúc luồng 5 bước + duyệt)
    // ══════════════════════════════════════════════════════════════════════════════

    @Bean
    @org.springframework.core.annotation.Order(2)
    public CommandLineRunner initCatalogData() {
        return args -> {
            if (tourRepository.count() > 0) {
                log.info("Bước 2 — Bỏ qua seed catalog tour: DB đã có {} tour.", tourRepository.count());
                return;
            }
            try {
                new TransactionTemplate(transactionManager).executeWithoutResult(status -> seedCatalogData());
                log.info("Bước 2 — Đã khởi tạo {} tour theo luồng 5 bước (đã duyệt, có slot bán).",
                        tourRepository.count());
            } catch (Exception e) {
                log.warn("Không thể khởi tạo catalog tour: {}", e.getMessage(), e);
            }
        };
    }

    private void seedCatalogData() {
        User providerMain = userRepository.findByEmail("provider@journeygo.com").orElseThrow();
        User provider1 = userRepository.findByEmail("provider1@journeygo.com").orElseThrow();
        User provider2 = userRepository.findByEmail("provider2@journeygo.com").orElseThrow();
        User moderator = userRepository.findByEmail("moderator@journeygo.com").orElseThrow();

        Map<String, Region> regions = new LinkedHashMap<>();
        regions.put("bac", ensureRegion("mien-bac", "Miền Bắc"));
        regions.put("trung", ensureRegion("mien-trung", "Miền Trung"));
        regions.put("nam", ensureRegion("mien-nam", "Miền Nam"));
        regions.put("taynam", ensureRegion("mien-tay-nam-bo", "Miền Tây Nam Bộ"));

        Map<String, Theme> themes = new LinkedHashMap<>();
        themes.put("disan", ensureTheme("di-san", "Di sản"));
        themes.put("langnghe", ensureTheme("lang-nghe", "Làng nghề"));
        themes.put("amthuc", ensureTheme("am-thuc", "Ẩm thực"));
        themes.put("tamlinh", ensureTheme("tam-linh", "Tâm linh"));
        themes.put("lehoi", ensureTheme("le-hoi", "Lễ hội"));

        Map<String, StopSeed> stops = buildStopSeeds();

        LocalDate today = LocalDate.now(VN_ZONE);
        List<LocalDate> futureDates = List.of(
                today.plusDays(3), today.plusDays(4), today.plusDays(10), today.plusDays(11),
                today.plusDays(17), today.plusDays(18), today.plusDays(24), today.plusDays(25),
                today.plusDays(31), today.plusDays(32));
        LocalDate prevMonthDay = YearMonth.now(VN_ZONE).minusMonths(1).atDay(20);
        LocalDate prev3MonthDay = YearMonth.now(VN_ZONE).minusMonths(3).atDay(15);

        int quizPoints = rewardSettingService.pointsFor(RewardSettingCode.QUIZ_QUESTION);
        int experiencePoints = rewardSettingService.pointsFor(RewardSettingCode.REAL_WORLD_EXPERIENCE);

        for (TourSeed seed : buildTourSeeds()) {
            User owner = switch (seed.ownerKey()) {
                case "p1" -> provider1;
                case "p2" -> provider2;
                default -> providerMain;
            };
            List<LocalDate> departureDates = new ArrayList<>(futureDates);
            if (seed.withPastDates()) {
                departureDates.add(prev3MonthDay);
                departureDates.add(prevMonthDay);
            }
            createWizardTour(seed, owner, moderator, regions, themes, stops, departureDates,
                    quizPoints, experiencePoints);
        }
    }

    /**
     * Tạo một tour hoàn chỉnh giống hệt thao tác thủ công:
     * bước 1 (thông tin cơ bản) → bước 2 (giá) → bước 3 (điểm đến) → bước 4 (lịch khởi hành)
     * → bước 5 (gửi duyệt) → Moderator duyệt (chốt điểm thưởng, sinh slot, mở bán).
     */
    private Tour createWizardTour(TourSeed seed, User owner, User moderator,
                                  Map<String, Region> regions, Map<String, Theme> themes,
                                  Map<String, StopSeed> stopSeeds,
                                  List<LocalDate> departureDates,
                                  int quizPoints, int experiencePoints) {
        // ── Bước 1 — Thông tin cơ bản ─────────────────────────────────────────
        Tour tour = Tour.builder()
                .title(seed.title())
                .tourType(TourType.OTHER)
                .tourFormat(seed.format())
                .durationDays(seed.format() == TourFormat.DAY_TRIP ? 1 : seed.durationDays())
                .durationMinutes(seed.format() == TourFormat.DAY_TRIP ? seed.durationMinutes() : null)
                .durationNights(seed.format() == TourFormat.DAY_TRIP ? null : seed.durationNights())
                .region(regions.get(seed.regionKey()))
                .theme(themes.get(seed.themeKey()))
                .description(seed.description())
                .coverImageUrl(null)
                .status(TourStatus.DRAFT)
                .approved(false)
                .deleted(false)
                .contentRightsConfirmed(true)
                .versionNumber(1)
                .createdBy(owner)
                .build();

        // Ảnh tour = gom ảnh của các điểm đến (≥ 5 ảnh https); ảnh bìa = ảnh đầu tiên.
        List<String> images = new ArrayList<>();
        for (String stopKey : seed.stopKeys()) {
            StopSeed stop = stopSeeds.get(stopKey);
            for (String url : stop.images()) {
                if (!images.contains(url)) images.add(url);
            }
        }
        tour.setCoverImageUrl(images.get(0));
        tour.getImages().addAll(images);
        tour.getHighlights().addAll(seed.highlights());

        // Lịch trình theo ngày (dạng chữ) — tour trong ngày chỉ có 1 mục.
        List<TourItineraryDay> itinerary = buildItinerary(seed, stopSeeds);
        tour.getItinerary().addAll(itinerary);

        tour.setPriceIncludes(DEFAULT_PRICE_INCLUDES);
        tour.setPriceExcludes(DEFAULT_PRICE_EXCLUDES);
        tour.setForceMajeure(DEFAULT_FORCE_MAJEURE);
        tour.setRefundPolicy(DEFAULT_REFUND_POLICY);
        tour.setContactInfo(DEFAULT_CONTACT_INFO);

        // ── Bước 2 — Giá vé (đủ 4 loại khách) ────────────────────────────────
        for (GuestType type : GuestType.values()) {
            BigDecimal price = switch (type) {
                case ADULT -> money(seed.adultPrice());
                case CHILD -> money(seed.childPrice());
                case TODDLER -> money(seed.toddlerPrice());
                case INFANT -> BigDecimal.ZERO;
            };
            tour.getPrices().add(TourPrice.builder()
                    .tour(tour)
                    .guestType(type)
                    .price(price)
                    .countsTowardSlot(type != GuestType.TODDLER && type != GuestType.INFANT)
                    .build());
        }
        tour.setMaxGuestsPerSlot(seed.maxGuestsPerSlot());
        tour.setCancellationPolicy(DEFAULT_CANCELLATION_POLICY);

        // ── Bước 3 — Điểm đến (nội dung văn hóa, cổ vật, quiz, trải nghiệm) ───
        int sequence = 1;
        for (String stopKey : seed.stopKeys()) {
            StopSeed stopSeed = stopSeeds.get(stopKey);
            TourStop stop = TourStop.builder()
                    .tour(tour)
                    .sequenceOrder(sequence++)
                    .name(stopSeed.name())
                    .shortDescription(stopSeed.shortDescription())
                    .guestNote(stopSeed.guestNote())
                    .imageUrl(stopSeed.images().get(0))
                    .culturalContent(stopSeed.culturalContent())
                    .build();
            stop.getCulturalImages().addAll(stopSeed.culturalImages());

            int artifactOrder = 1;
            for (ArtifactSeed artifact : stopSeed.artifacts()) {
                stop.getArtifacts().add(TourStopArtifact.builder()
                        .stop(stop)
                        .sequenceOrder(artifactOrder++)
                        .name(artifact.name())
                        .imageUrl(artifact.imageUrl())
                        .shortDescription(artifact.description())
                        .build());
            }

            int quizOrder = 1;
            for (QuizSeed quiz : stopSeed.quizzes()) {
                TourStopQuestion question = TourStopQuestion.builder()
                        .stop(stop)
                        .kind(StopQuestionKind.QUIZ)
                        .sequenceOrder(quizOrder++)
                        .questionType(QuestionType.MULTIPLE_CHOICE)
                        .content(quiz.content())
                        .pointsReward(quizPoints)
                        .build();
                int answerOrder = 1;
                for (int i = 0; i < quiz.answers().size(); i++) {
                    question.getAnswers().add(TourStopAnswer.builder()
                            .question(question)
                            .sequenceOrder(answerOrder++)
                            .content(quiz.answers().get(i))
                            .correct(i == quiz.correctIndex())
                            .build());
                }
                stop.getQuizQuestions().add(question);
            }

            int experienceOrder = 1;
            for (ExperienceSeed experience : stopSeed.experiences()) {
                TourStopExperience entity = TourStopExperience.builder()
                        .stop(stop)
                        .sequenceOrder(experienceOrder++)
                        .activityName(experience.activityName())
                        .checkpointLatitude(new BigDecimal(experience.latitude()))
                        .checkpointLongitude(new BigDecimal(experience.longitude()))
                        .radiusMeters(experience.radiusMeters())
                        .durationSeconds(experience.durationSeconds())
                        .qrToken(TourStopExperience.newQrToken())
                        .pointsReward(experiencePoints)
                        .build();
                TourStopQuestion postQuestion = TourStopQuestion.builder()
                        .experience(entity)
                        .kind(StopQuestionKind.POST_EXPERIENCE)
                        .sequenceOrder(1)
                        .questionType(QuestionType.TEXT)
                        .content(experience.question())
                        .referenceAnswer(experience.referenceAnswer())
                        .build();
                entity.getQuestions().add(postQuestion);
                stop.getExperiences().add(entity);
            }

            tour.getStops().add(stop);
        }

        // ── Bước 4 — Lịch khởi hành ───────────────────────────────────────────
        for (LocalDate date : departureDates.stream().distinct().sorted().toList()) {
            tour.getDepartureDates().add(TourDepartureDate.builder()
                    .tour(tour)
                    .departureDate(date)
                    .build());
        }

        Tour saved = tourRepository.saveAndFlush(tour);

        // ── Bước 5 — Gửi duyệt (đối tác cam kết quyền sử dụng nội dung) ─────────
        Instant submittedAt = Instant.now().minusSeconds(86400L * 3);
        saved.setStatus(TourStatus.PENDING_REVIEW);
        saved.setApproved(false);
        saved.setSubmittedAt(submittedAt);
        tourRepository.save(saved);

        TourReview review = tourReviewRepository.save(TourReview.builder()
                .tour(saved)
                .tourVersion(saved.getVersionNumber())
                .status(TourReviewStatus.PENDING)
                .submittedAt(submittedAt)
                .build());

        tourReviewHistoryRepository.save(TourReviewHistory.builder()
                .review(review)
                .action(TourReviewAction.SUBMITTED)
                .actor(owner)
                .note("Gửi duyệt tour lần 1")
                .fromStatus(TourStatus.DRAFT.name())
                .toStatus(TourStatus.PENDING_REVIEW.name())
                .tourVersion(saved.getVersionNumber())
                .build());

        // ── Moderator duyệt: tick đủ 5 tiêu chí, chốt điểm thưởng, sinh slot ──
        review.setStatus(TourReviewStatus.APPROVED);
        review.setReviewer(moderator);
        review.setDecisionNote("Nội dung đầy đủ, hình ảnh thật, đã kiểm tra hiện trường.");
        review.setReviewedAt(submittedAt.plusSeconds(3600));
        review.setCritInteractive(true);
        review.setCritLocalExpertise(true);
        review.setCritStorytelling(true);
        review.setCritCulturalRatio(true);
        review.setCritAuthenticMedia(true);
        tourReviewRepository.save(review);

        saved.setStatus(TourStatus.PUBLISHED);
        saved.setApproved(true);
        saved.setPublishedAt(review.getReviewedAt());
        tourRepository.save(saved);

        tourReviewHistoryRepository.save(TourReviewHistory.builder()
                .review(review)
                .action(TourReviewAction.APPROVED)
                .actor(moderator)
                .note(review.getDecisionNote())
                .fromStatus(TourStatus.PENDING_REVIEW.name())
                .toStatus(TourStatus.PUBLISHED.name())
                .tourVersion(saved.getVersionNumber())
                .build());

        // Sinh slot bán theo lịch khởi hành (giống TourSlotService.syncSlots).
        for (LocalDate date : saved.getDepartureDates().stream()
                .map(TourDepartureDate::getDepartureDate).toList()) {
            TourSlot slot = tourSlotRepository.findByTour_TourIdAndSlotDate(saved.getTourId(), date)
                    .orElseGet(() -> TourSlot.builder()
                            .tour(saved)
                            .slotDate(date)
                            .capacity(saved.getMaxGuestsPerSlot())
                            .status(TourSlotStatus.OPEN)
                            .build());
            slot.setCapacity(saved.getMaxGuestsPerSlot());
            slot.setStatus(TourSlotStatus.OPEN);
            tourSlotRepository.save(slot);
        }

        log.info("[Catalog] Đã tạo tour '{}' (id={}, {} điểm đến, {} lịch khởi hành)",
                saved.getTitle(), saved.getTourId(), saved.getStops().size(),
                saved.getDepartureDates().size());
        return saved;
    }

    private List<TourItineraryDay> buildItinerary(TourSeed seed, Map<String, StopSeed> stopSeeds) {
        List<TourItineraryDay> days = new ArrayList<>();
        if (seed.format() == TourFormat.DAY_TRIP) {
            StringBuilder content = new StringBuilder();
            for (String key : seed.stopKeys()) {
                StopSeed stop = stopSeeds.get(key);
                content.append("**").append(stop.name()).append("** — ").append(stop.shortDescription())
                        .append("\n");
            }
            days.add(TourItineraryDay.builder()
                    .dayNumber(1)
                    .title(seed.itineraryTitle())
                    .mainActivity(seed.itineraryMainActivity())
                    .content(content.toString().trim())
                    .build());
            return days;
        }
        int day = 1;
        for (String key : seed.stopKeys()) {
            StopSeed stop = stopSeeds.get(key);
            days.add(TourItineraryDay.builder()
                    .dayNumber(day)
                    .title(stop.name())
                    .mainActivity(stop.shortDescription())
                    .content("**" + stop.name() + "**\n" + stop.shortDescription()
                            + "\n" + stop.culturalContent())
                    .build());
            day++;
        }
        return days;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  BƯỚC 3 — GIAO DỊCH MẪU (Booking → Payment → Refund → Revenue → Settlement)
    //
    //  Mục tiêu: khi khởi động ứng dụng, DB có sẵn dữ liệu để chạy ngay
    //  `docs/TEST_SCENARIOS.md` (PHẦN A → B → C → D → E) trên Swagger UI mà không
    //  phải tạo dữ liệu thủ công.
    //
    //  Cấu trúc bám sát luồng thật:
    //   • Booking giữ chỗ trên TourSlot (slotType = TOUR) với slotCount = số hành khách
    //     có countsTowardSlot = TRUE.
    //   • Mỗi hành khách là một BookingPassenger (người đặt có isBookingCustomer = TRUE).
    //   • Payment VNPay SUCCESS gắn với đúng Booking, expiresAt = paymentDeadline.
    //   • ProviderRevenue ghi nhận cho ProviderProfile sở hữu tour (gross = totalAmount).
    //   • Settlement APPROVED + cộng tiền vào ví + FinancialAdjustment APPROVED.
    //
    //  Chỉ chạy trên DB trống: bookingRepository.count() == 0.
    // ══════════════════════════════════════════════════════════════════════════════

    @Bean
    @org.springframework.core.annotation.Order(3)
    public CommandLineRunner initSampleBookingData() {
        return args -> {
            if (bookingRepository.count() > 0) {
                log.info("Bước 3 — Bỏ qua seed giao dịch mẫu: DB đã có {} booking.", bookingRepository.count());
                return;
            }
            try {
                new TransactionTemplate(transactionManager)
                        .executeWithoutResult(status -> seedSampleBookingData());
                log.info("Bước 3 — Đã khởi tại giao dịch mẫu ({} booking, {} payment, {} refund, "
                                + "{} provider_revenue, {} settlement).",
                        bookingRepository.count(), paymentRepository.count(), refundRequestRepository.count(),
                        providerRevenueRepository.count(), settlementRepository.count());
            } catch (Exception e) {
                log.warn("Không thể khởi tạo giao dịch mẫu Booking/Payment/Refund/Settlement: {}",
                        e.getMessage(), e);
            }
        };
    }

    private void seedSampleBookingData() {
        Role adminRole = roleRepository.findByName(Role.ADMIN)
                .orElseGet(() -> roleRepository.save(new Role(Role.ADMIN, "Quản trị viên")));
        Role touristRole = roleRepository.findByName(Role.TOURIST)
                .orElseGet(() -> roleRepository.save(new Role(Role.TOURIST, "Khách du lịch")));

        User admin = ensureUser("admin@journeygo.com", "Hệ Thống Quản Trị", "0900000001", adminRole);
        User tourist1 = ensureUser("tourist1@journeygo.com", "Nguyễn Văn A", "0912345678", touristRole);
        User tourist2 = ensureUser("tourist2@journeygo.com", "Nguyễn Văn B", "0912345679", touristRole);

        // ── Tour dùng cho giao dịch mẫu (đều là tour luồng 5 bước đã duyệt) ─────
        Tour tourCaiRang = findTourByTitle("Chợ nổi Cái Răng và bến Ninh Kiều");
        Tour tourChuaCau = findTourByTitle("Chùa Cầu và phố cổ Hội An trong một buổi chiều");
        Tour tourCauTho = findTourByTitle("Xưởng mì Cần Thơ và bánh kẹo truyền thống");
        Tour tourBinhThuy = findTourByTitle("Nhà cổ Bình Thủy và xưởng mì Cần Thơ");
        Tour tourTanKy = findTourByTitle("Nhà cổ Tấn Ký và chùa Cầu");
        Tour tourNinhKieu = findTourByTitle("Bến Ninh Kiều và nhà cổ Bình Thủy");
        if (tourCaiRang == null || tourChuaCau == null || tourCauTho == null
                || tourBinhThuy == null || tourTanKy == null || tourNinhKieu == null) {
            log.warn("Bước 3 — Thiếu tour mẫu (catalog chưa được seed) — bỏ qua giao dịch mẫu.");
            return;
        }

        // ── ProviderProfile của chủ tour (nguồn doanh thu) ─────────────────────
        ProviderProfile provider1 = providerProfileRepository
                .findByUser_Id(tourCaiRang.getCreatedBy().getId())
                .orElseThrow(() -> new IllegalStateException("Thiếu hồ sơ đối tác của tour mẫu"));
        ProviderProfile provider2 = providerProfileRepository
                .findByUser_Id(tourChuaCau.getCreatedBy().getId())
                .orElseThrow(() -> new IllegalStateException("Thiếu hồ sơ đối tác của tour mẫu"));

        // ── Ngày tham chiếu ─────────────────────────────────────────────────────
        LocalDate today = LocalDate.now(VN_ZONE);
        LocalDate prevMonthDay = YearMonth.now(VN_ZONE).minusMonths(1).atDay(20);
        LocalDate prev3MonthDay = YearMonth.now(VN_ZONE).minusMonths(3).atDay(15);
        String prevMonthPeriod = ProviderRevenue.periodOf(prevMonthDay);
        String prev3MonthPeriod = ProviderRevenue.periodOf(prev3MonthDay);

        Instant now = Instant.now();
        Instant prevMonthPaid = prevMonthDay.atTime(10, 0).atZone(VN_ZONE).toInstant();
        Instant prevMonthDone = prevMonthDay.atTime(16, 0).atZone(VN_ZONE).toInstant();
        Instant prev3Paid = prev3MonthDay.atTime(10, 0).atZone(VN_ZONE).toInstant();
        Instant prev3Done = prev3MonthDay.atTime(15, 0).atZone(VN_ZONE).toInstant();

        // ── 1) COMPLETED — kỳ trước — dùng để tạo Settlement cho đối tác 1 ─────
        Booking bk1 = ensureTourBooking("JGSAMPLE01", tourist1, tourCaiRang, prevMonthDay,
                prevMonthPaid, prevMonthDone, List.of(
                        new PassengerSeed("Nguyễn Văn A", "1988-05-12", "MALE", "tourist1@journeygo.com",
                                GuestType.ADULT, true),
                        new PassengerSeed("Trần Thị B", "1990-09-03", "FEMALE", "tourist1@journeygo.com",
                                GuestType.ADULT, false)));
        Payment pay1 = ensurePayment("JGSAMPLE01-TXN", bk1, bk1.getTotalAmount(),
                "MOMO", "QRCODE", "91000001", prevMonthPaid);

        // ── 2) COMPLETED — kỳ trước — đối tác 2 ────────────────────────────────
        Booking bk2 = ensureTourBooking("JGSAMPLE02", tourist2, tourChuaCau, prevMonthDay,
                prevMonthPaid, prevMonthDone, List.of(
                        new PassengerSeed("Nguyễn Văn B", "1985-02-20", "MALE", "tourist2@journeygo.com",
                                GuestType.ADULT, true),
                        new PassengerSeed("Lê Thị C", "1987-11-08", "FEMALE", "tourist2@journeygo.com",
                                GuestType.ADULT, false)));
        Payment pay2 = ensurePayment("JGSAMPLE02-TXN", bk2, bk2.getTotalAmount(),
                "VNBANK", "ATM", "91000002", prevMonthPaid);

        // ── 3) CONFIRMED — đã thanh toán, chờ trải nghiệm hoàn thành ───────────
        Booking bk3 = ensureTourBooking("JGSAMPLE03", tourist1, tourCauTho, today.plusDays(3),
                now.minusSeconds(3600), null, List.of(
                        new PassengerSeed("Nguyễn Văn A", "1988-05-12", "MALE", "tourist1@journeygo.com",
                                GuestType.ADULT, true),
                        new PassengerSeed("Nguyễn Minh Quân", "2016-04-18", "MALE", null,
                                GuestType.CHILD, false)));
        Payment pay3 = ensurePayment("JGSAMPLE03-TXN", bk3, bk3.getTotalAmount(),
                "VNPAYQR", "QRCODE", "91000003", now.minusSeconds(3600));

        // ── 4) PENDING_PAYMENT — sẽ tự EXPIRED sau 10 phút ───────────────────
        ensureTourBooking("JGSAMPLE04", tourist2, tourTanKy, today.plusDays(4), null, null, List.of(
                new PassengerSeed("Nguyễn Văn B", "1985-02-20", "MALE", "tourist2@journeygo.com",
                        GuestType.ADULT, true)));

        // ── 5) CANCELLED ───────────────────────────────────────────────────────
        Booking bk5 = ensureTourBooking("JGSAMPLE05", tourist1, tourNinhKieu, today.plusDays(5),
                null, null, List.of(
                        new PassengerSeed("Nguyễn Văn A", "1988-05-12", "MALE", "tourist1@journeygo.com",
                                GuestType.ADULT, true)));
        bk5.cancel("Không thể đi được do thời tiết xấu");
        releaseSlotHolds(bk5);

        // ── 6) COMPLETED — kỳ 3 tháng trước — đã được tất toán (SETTLED) ──────
        Booking bk6 = ensureTourBooking("JGSAMPLE06", tourist2, tourBinhThuy, prev3MonthDay,
                prev3Paid, prev3Done, List.of(
                        new PassengerSeed("Nguyễn Văn B", "1985-02-20", "MALE", "tourist2@journeygo.com",
                                GuestType.ADULT, true),
                        new PassengerSeed("Lê Thị C", "1987-11-08", "FEMALE", "tourist2@journeygo.com",
                                GuestType.ADULT, false)));
        Payment pay6 = ensurePayment("JGSAMPLE06-TXN", bk6, bk6.getTotalAmount(),
                "INTCARD", null, "91000006", prev3Paid);

        // ── 7) COMPLETED + Refund đã hoàn thành 50% ───────────────────────────
        Booking bk7 = ensureTourBooking("JGSAMPLE07", tourist1, tourTanKy, prevMonthDay,
                prevMonthPaid, prevMonthDone, List.of(
                        new PassengerSeed("Nguyễn Văn A", "1988-05-12", "MALE", "tourist1@journeygo.com",
                                GuestType.ADULT, true)));
        Payment pay7 = ensurePayment("JGSAMPLE07-TXN", bk7, bk7.getTotalAmount(),
                "MOMO", "QRCODE", "91000007", prevMonthPaid);

        // ── 8) COMPLETED + Refund đang chờ duyệt (chặn tất toán) ─────────────
        Booking bk8 = ensureTourBooking("JGSAMPLE08", tourist2, tourBinhThuy, prevMonthDay,
                prevMonthPaid, prevMonthDone, List.of(
                        new PassengerSeed("Nguyễn Văn B", "1985-02-20", "MALE", "tourist2@journeygo.com",
                                GuestType.ADULT, true)));
        Payment pay8 = ensurePayment("JGSAMPLE08-TXN", bk8, bk8.getTotalAmount(),
                "VNBANK", "ATM", "91000008", prevMonthPaid);

        // ── 9) COMPLETED — chưa có refund (dùng cho kịch bản C.1 / C.2) ──────
        Booking bk9 = ensureTourBooking("JGSAMPLE09", tourist2, tourCaiRang, prevMonthDay,
                prevMonthPaid, prevMonthDone, List.of(
                        new PassengerSeed("Nguyễn Văn B", "1985-02-20", "MALE", "tourist2@journeygo.com",
                                GuestType.ADULT, true)));
        Payment pay9 = ensurePayment("JGSAMPLE09-TXN", bk9, bk9.getTotalAmount(),
                "VNPAY", "QRCODE", "91000009", prevMonthPaid);

        // ── REFUNDS ────────────────────────────────────────────────────────────
        BigDecimal refund7Amount = bk7.getTotalAmount().multiply(new BigDecimal("0.50"))
                .setScale(2, java.math.RoundingMode.HALF_UP);
        ensureRefund("JGSAMPLERF01", pay7, tourist1, RefundStatus.REFUNDED,
                RefundReason.PERSONAL, refund7Amount, refund7Amount, refund7Amount,
                RefundMethod.MANUAL_BANK_TRANSFER, admin,
                "Khách không thể đi được do thời tiết xấu, đề nghị hoàn một phần",
                "0123456789", "NGUYEN VAN A", "MB Bank",
                "FT20261120001", "https://img.journeygo.com/refund/ft-20261120001.png");

        BigDecimal refund8Amount = bk8.getTotalAmount().multiply(new BigDecimal("0.50"))
                .setScale(2, java.math.RoundingMode.HALF_UP);
        ensureRefund("JGSAMPLERF02", pay8, tourist2, RefundStatus.PENDING_REVIEW,
                RefundReason.PERSONAL, refund8Amount, null, null, null, admin,
                "Điểm đến tạm đóng cửa do bảo trì, khách đề nghị hoàn một phần",
                "9876543210", "NGUYEN VAN B", "Vietcombank", null, null);

        // ── PROVIDER REVENUE ────────────────────────────────────────────────────
        ProviderRevenue rev1 = ensureRevenue(bk1, pay1, provider1, bk1.getTotalAmount(),
                provider1.getEffectiveCommissionRate(), BigDecimal.ZERO, prevMonthPeriod, prevMonthDay,
                ProviderRevenueStatus.ELIGIBLE, null, prevMonthDone, null, null);
        ensureRevenue(bk2, pay2, provider2, bk2.getTotalAmount(),
                provider2.getEffectiveCommissionRate(), BigDecimal.ZERO, prevMonthPeriod, prevMonthDay,
                ProviderRevenueStatus.ELIGIBLE, null, prevMonthDone, null, null);
        ensureRevenue(bk3, pay3, provider1, bk3.getTotalAmount(),
                provider1.getEffectiveCommissionRate(), BigDecimal.ZERO,
                ProviderRevenue.periodOf(today.plusDays(3)), today.plusDays(3),
                ProviderRevenueStatus.PENDING, DeferredReason.BOOKING_NOT_COMPLETED, null, null, null);
        ProviderRevenue rev6 = ensureRevenue(bk6, pay6, provider1, bk6.getTotalAmount(),
                provider1.getEffectiveCommissionRate(), BigDecimal.ZERO, prev3MonthPeriod, prev3MonthDay,
                ProviderRevenueStatus.ELIGIBLE, null, prev3Done, null, null);
        ensureRevenue(bk7, pay7, provider2, bk7.getTotalAmount(),
                provider2.getEffectiveCommissionRate(), refund7Amount, prevMonthPeriod, prevMonthDay,
                ProviderRevenueStatus.ELIGIBLE, null, prevMonthDone, null, null);
        ensureRevenue(bk8, pay8, provider1, bk8.getTotalAmount(),
                provider1.getEffectiveCommissionRate(), BigDecimal.ZERO, prevMonthPeriod, prevMonthDay,
                ProviderRevenueStatus.PENDING, DeferredReason.REFUND_PENDING, null, null, null);
        ensureRevenue(bk9, pay9, provider1, bk9.getTotalAmount(),
                provider1.getEffectiveCommissionRate(), BigDecimal.ZERO, prevMonthPeriod, prevMonthDay,
                ProviderRevenueStatus.ELIGIBLE, null, prevMonthDone, null, null);

        // ── SETTLEMENT đã duyệt (kỳ 3 tháng trước) ───────────────────────────
        BigDecimal settlementGross = rev6.getGrossAmount();
        BigDecimal settlementCommission = rev6.getCommissionAmount();
        BigDecimal settlementAmount = rev6.getProviderNetAmount();
        Settlement settlement = ensureSettlement("JGSETTLE001", provider1, prev3MonthPeriod,
                SettlementStatus.APPROVED, settlementGross, BigDecimal.ZERO, settlementCommission,
                BigDecimal.ZERO, settlementAmount,
                "Tất toán mẫu kỳ " + prev3MonthPeriod + " — " + provider1.getProviderName(), admin);

        boolean detailExists = settlementDetailRepository.findBySettlement_Id(settlement.getId()).stream()
                .anyMatch(d -> d.getProviderRevenue() != null
                        && rev6.getId().equals(d.getProviderRevenue().getId()));
        if (!detailExists) {
            settlementDetailRepository.save(SettlementDetail.builder()
                    .settlement(settlement)
                    .providerRevenue(rev6)
                    .revenuePeriod(rev6.getRevenuePeriod())
                    .grossAmount(rev6.getGrossAmount())
                    .refundAmount(rev6.getRefundAmount())
                    .commissionAmount(rev6.getCommissionAmount())
                    .adjustmentAmount(rev6.getAdjustmentAmount())
                    .providerNetAmount(rev6.getProviderNetAmount())
                    .build());
        }

        rev6.markInSettlement(settlement.getId());
        rev6.setSettlementId(settlement.getId());
        rev6.markSettled();
        providerRevenueRepository.save(rev6);

        // Cộng tiền vào ví đối tác
        Wallet wallet1 = walletRepository.findByProviderProfile_Id(provider1.getId())
                .orElseThrow(() -> new IllegalStateException("Thiếu ví của đối tác 1"));
        if (walletTransactionRepository.findSettlementCredit(wallet1.getId(), settlement.getId(),
                WalletTransactionType.SETTLEMENT_CREDIT).isEmpty()) {
            creditWallet(wallet1, WalletTransactionType.SETTLEMENT_CREDIT,
                    WalletTransaction.SourceType.SETTLEMENT, settlement.getId(), settlementAmount, admin,
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
                    .providerProfile(provider1)
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

        log.info("Bước 3 — Dữ liệu mẫu: {} tour, {} booking, {} payment, {} refund, {} provider_revenue, "
                        + "{} settlement, {} adjustment",
                tourRepository.count(), bookingRepository.count(), paymentRepository.count(),
                refundRequestRepository.count(), providerRevenueRepository.count(),
                settlementRepository.count(), financialAdjustmentRepository.count());
    }

    // ── Helpers: User / ProviderProfile / Wallet ───────────────────────────────

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

    // ── Helpers: đặt tour (Booking + Passenger + SlotHold) ────────────────────

    /** Một hành khách trong booking nhóm. */
    private record PassengerSeed(String fullName, String birthDate, String gender, String email,
                                 GuestType guestType, boolean bookingCustomer) {
    }

    private Tour findTourByTitle(String title) {
        return tourRepository.findAll().stream()
                .filter(t -> title.equals(t.getTitle()))
                .findFirst().orElse(null);
    }

    /**
     * Tạo Booking theo đúng luồng đặt tour nhóm:
     * chốt giá theo bảng giá của tour → giữ N slot trên TourSlot → tạo BookingPassenger
     * → ghi BookingSlotHold (slotType = TOUR).
     */
    private Booking ensureTourBooking(String code, User tourist, Tour tour, LocalDate experienceDate,
                                      Instant paidAt, Instant completedAt,
                                      List<PassengerSeed> passengerSeeds) {
        // ── Chốt giá theo bảng giá của tour (giá của tour khi đặt, không đổi sau đó) ──
        BigDecimal total = BigDecimal.ZERO;
        int slotCount = 0;
        List<BigDecimal> passengerPrices = new ArrayList<>();
        for (PassengerSeed seed : passengerSeeds) {
            BigDecimal price = priceFor(tour, seed.guestType());
            passengerPrices.add(price);
            total = total.add(price);
            if (seed.guestType() != GuestType.INFANT && seed.guestType() != GuestType.TODDLER) {
                slotCount++;
            }
        }

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

        Instant createdAt = paidAt != null ? paidAt : Instant.now();
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
                    .slotCount(slotCount)
                    .discountAmount(BigDecimal.ZERO)
                    // Hạn thanh toán = createdAt + 10 phút (đơn chưa thanh toán).
                    // Đơn đã thanh toán: đặt deadline = thời điểm hoàn tất để
                    // BookingExpiryScheduler không bao giờ quét nhầm.
                    // Đơn bị hủy trước khi thanh toán: deadline = createdAt + 10 phút
                    // (cột NOT NULL ⇒ không được để null).
                    .paymentDeadline(paidAt == null
                            ? createdAt.plusSeconds(600)
                            : (completedAt != null ? completedAt : paidAt))
                    .build();
        } else {
            booking.setTourist(tourist);
            booking.setTour(tour);
            booking.setExperienceDate(experienceDate);
            booking.setTotalAmount(total);
            booking.setStatus(targetStatus);
            booking.setSlotCount(slotCount);
        }
        Booking saved = bookingRepository.saveAndFlush(booking);

        // ── Hành khách (BookingPassenger) ──────────────────────────────────────
        if (bookingPassengerRepository.findByBooking_IdOrderByCreatedAtAsc(saved.getId()).isEmpty()) {
            int i = 0;
            for (PassengerSeed seed : passengerSeeds) {
                bookingPassengerRepository.save(BookingPassenger.builder()
                        .booking(saved)
                        .fullName(seed.fullName())
                        .birthDate(LocalDate.parse(seed.birthDate()))
                        .gender(seed.gender())
                        .email(seed.email())
                        .guestType(seed.guestType())
                        .price(passengerPrices.get(i))
                        .countsTowardSlot(seed.guestType() != GuestType.INFANT
                                && seed.guestType() != GuestType.TODDLER)
                        .bookingCustomer(seed.bookingCustomer())
                        .linkedUserId(seed.bookingCustomer() ? tourist.getId() : null)
                        .status(BookingPassengerStatus.ACTIVE)
                        .build());
                i++;
            }
        }

        // ── Giữ chỗ trên TourSlot (slotType = TOUR) ──────────────────────────
        TourSlot tourSlot = tourSlotRepository
                .findByTour_TourIdAndSlotDate(tour.getTourId(), experienceDate)
                .orElseGet(() -> tourSlotRepository.saveAndFlush(TourSlot.builder()
                        .tour(tour)
                        .slotDate(experienceDate)
                        .capacity(tour.getMaxGuestsPerSlot() != null ? tour.getMaxGuestsPerSlot() : 10)
                        .bookedCount(0)
                        .status(TourSlotStatus.OPEN)
                        .build()));

        boolean holdExists = bookingSlotHoldRepository.findByBooking_Id(saved.getId()).stream()
                .anyMatch(h -> h.getTourSlot() != null
                        && h.getTourSlot().getId().equals(tourSlot.getId()));
        if (!holdExists) {
            bookingSlotHoldRepository.save(BookingSlotHold.builder()
                    .booking(saved)
                    .tourSlot(tourSlot)
                    .slotType(BookingSlotType.TOUR)
                    .slotDate(experienceDate)
                    .slotCount(slotCount)
                    .experienceId(null)
                    .released(false)
                    .build());
            tourSlot.setBookedCount((tourSlot.getBookedCount() != null ? tourSlot.getBookedCount() : 0)
                    + slotCount);
            tourSlotRepository.save(tourSlot);
        }

        if (paidAt != null) {
            saved.setPaidAt(paidAt);
            saved.setConfirmedAt(paidAt);
        }
        if (completedAt != null) {
            saved.setCompletedAt(completedAt);
        }
        return bookingRepository.save(saved);
    }

    /** Giá của một loại khách theo bảng giá của tour. */
    private BigDecimal priceFor(Tour tour, GuestType guestType) {
        return tour.getPrices().stream()
                .filter(p -> p.getGuestType() == guestType)
                .map(TourPrice::getPrice)
                .findFirst()
                .orElse(BigDecimal.ZERO);
    }

    /** Giải phóng slot đã giữ (booking bị hủy) — chỉ giải phóng đúng một lần. */
    private void releaseSlotHolds(Booking booking) {
        for (BookingSlotHold hold : bookingSlotHoldRepository.findByBooking_Id(booking.getId())) {
            if (hold.markReleased()) {
                bookingSlotHoldRepository.save(hold);
                if (hold.getTourSlot() != null) {
                    TourSlot slot = hold.getTourSlot();
                    slot.setBookedCount(Math.max(0, (slot.getBookedCount() != null ? slot.getBookedCount() : 0)
                            - (hold.getSlotCount() > 0 ? hold.getSlotCount() : 1)));
                    tourSlotRepository.save(slot);
                }
            }
        }
    }

    // ── Helpers: Payment / Refund / Revenue / Settlement ──────────────────────

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
                .expiresAt(booking.getPaymentDeadline())
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

        refundAuditLogRepository.save(RefundAuditLog.builder()
                .refundRequest(refund)
                .action(RefundAuditLog.Action.CREATED)
                .fromStatus(null)
                .toStatus(RefundStatus.PENDING_REVIEW)
                .performedBy(tourist)
                .amount(proposedAmount)
                .reference(refundCode)
                .detail("Tourist gửi yêu cầu hoàn tiền.")
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
                    .detail("Quản trị viên phê duyệt hoàn tiền.")
                    .build());
            refundAuditLogRepository.save(RefundAuditLog.builder()
                    .refundRequest(refund)
                    .action(RefundAuditLog.Action.MANUAL_TRANSFER_CONFIRMED)
                    .fromStatus(RefundStatus.MANUAL_TRANSFER_PENDING)
                    .toStatus(RefundStatus.REFUNDED)
                    .performedBy(admin)
                    .amount(refundedAmount)
                    .reference(transferReference)
                    .detail("Đã ghi nhận chuyển khoản thủ công — " + transferReference)
                    .build());
        }
        return refund;
    }

    private ProviderRevenue ensureRevenue(Booking booking, Payment payment, ProviderProfile providerProfile,
                                         BigDecimal grossAmount, BigDecimal commissionRate,
                                         BigDecimal refundAmount, String revenuePeriod,
                                         LocalDate completedDate, ProviderRevenueStatus status,
                                         DeferredReason deferredReason, Instant eligibleAt,
                                         Instant settledAt, Long settlementId) {
        ProviderRevenue revenue = providerRevenueRepository
                .findByBooking_IdAndProviderProfile_Id(booking.getId(), providerProfile.getId()).orElse(null);
        if (revenue == null) {
            revenue = ProviderRevenue.builder()
                    .providerProfile(providerProfile)
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
        revenue.setDeferredReason(deferredReason);
        revenue.setEligibleAt(eligibleAt);
        revenue.setSettledAt(settledAt);

        // KHÔNG đụng vào trạng thái / settlementId nếu khoản doanh thu đã được gắn
        // vào một đợt tất toán (IN_SETTLEMENT) hoặc đã tất toán (SETTLED).
        boolean linkedToSettlement = revenue.getSettlementId() != null
                || revenue.getStatus() == ProviderRevenueStatus.IN_SETTLEMENT
                || revenue.getStatus() == ProviderRevenueStatus.SETTLED;
        if (!linkedToSettlement) {
            revenue.setStatus(status);
            revenue.setSettlementId(settlementId);
        }

        revenue.recalculate();
        return providerRevenueRepository.save(revenue);
    }

    private Settlement ensureSettlement(String code, ProviderProfile providerProfile, String revenuePeriod,
                                        SettlementStatus status, BigDecimal grossAmount,
                                        BigDecimal refundAmount, BigDecimal commissionAmount,
                                        BigDecimal adjustmentAmount, BigDecimal settlementAmount,
                                        String note, User admin) {
        Settlement settlement = settlementRepository.findBySettlementCode(code).orElse(null);
        if (settlement != null) {
            settlement.setProviderProfile(providerProfile);
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
        return settlementRepository.save(Settlement.builder()
                .settlementCode(code)
                .providerProfile(providerProfile)
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
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  DỮ LIỆU MẪU — TOÁN HỌC & TIỆN ÍCH
    // ══════════════════════════════════════════════════════════════════════════════

    private static BigDecimal money(long amount) {
        return BigDecimal.valueOf(amount).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    // ── Record mô tả dữ liệu tour (dùng để sinh catalog bằng code) ─────────────

    // Ghi chú giá & chính sách dùng chung cho toàn bộ tour mẫu (giống nội dung
    // mà một đối tác sẽ nhập ở bước 1 và bước 2 của wizard).
    private static final String DEFAULT_PRICE_INCLUDES =
            "Vé tham quan các điểm đến trong tour, hướng dẫn viên chuyên nghiệp "
                    + "xuyên suốt chương trình, nước uống đóng chai theo điểm dừng và "
                    + "bảo hiểm du lịch bắt buộc.";
    private static final String DEFAULT_PRICE_EXCLUDES =
            "Chi phí ăn uống ngoài chương trình, phòng khách sạnh, vé máy bay, "
                    + "tiền boa và các chi phí cá nhân phát sinh ngoài tour.";
    private static final String DEFAULT_FORCE_MAJEURE =
            "Trường hợp bất khả kháng (thiên tai, dịch bệnh, chiến tranh, thay đổi chính sách "
                    + "của Nhà nước), công ty sẽ đề xuất đổi ngày hoặc hoàn tiền theo thỏa thuận.";
    private static final String DEFAULT_REFUND_POLICY =
            "Hoàn 100% khi hủy trước ít nhất 7 ngày; hoàn 50% khi hủy từ 3 đến 6 ngày trước; "
                    + "không hoàn khi hủy trong vòng 2 ngày hoặc sau khi tour khởi hành.";
    private static final String DEFAULT_CONTACT_INFO =
            "Hotline: 1900 1234 | Email: support@journeygo.com | "
                    + "Liên hệ trước 08:00 để được hỗ trợ sắp xếp lịch.";
    private static final String DEFAULT_CANCELLATION_POLICY =
            "Hủy miễn phí trong 7 ngày trước ngày khởi hành. Phí hủy 50% trong khoảng 3-6 ngày "
                    + "trước. Không hoàn tiền trong 48 giờ cuối và sau khi tour bắt đầu.";

    /** Một điểm đến của tour (bước 3). */
    private record StopSeed(String key, String name, String shortDescription, String guestNote,
                            String culturalContent, List<String> culturalImages, List<String> images,
                            List<ArtifactSeed> artifacts, List<QuizSeed> quizzes,
                            List<ExperienceSeed> experiences) {
    }

    private record ArtifactSeed(String name, String imageUrl, String description) {
    }

    private record QuizSeed(String content, List<String> answers, int correctIndex) {
    }

    private record ExperienceSeed(String activityName, String latitude, String longitude,
                                  int radiusMeters, int durationSeconds,
                                  String question, String referenceAnswer) {
    }

    /** Một tour của catalog. */
    private record TourSeed(String title, TourFormat format, int durationMinutes, int durationDays,
                            int durationNights, String regionKey, String themeKey, String ownerKey,
                            boolean withPastDates, String description, List<String> highlights,
                            List<String> stopKeys, int adultPrice, int childPrice, int toddlerPrice,
                            int maxGuestsPerSlot, String itineraryTitle, String itineraryMainActivity) {
    }

    // ── Ảnh (Wikimedia Commons — ảnh chụp thật, giấy phép CC BY / CC BY-SA) ──────

    private static final String WM = "https://upload.wikimedia.org/wikipedia/commons/thumb/";

    private static final String IMG_VAN_MIEU_1 = WM + "2/22/Constellation_of_Literature_pavilion_-_Temple_of_Literature%2C_Hanoi_-_DSC04557.JPG/960px-Constellation_of_Literature_pavilion_-_Temple_of_Literature%2C_Hanoi_-_DSC04557.JPG";
    private static final String IMG_VAN_MIEU_2 = WM + "4/4f/First_courtyard_-_Temple_of_Literature%2C_Hanoi_-_DSC04546.JPG/960px-First_courtyard_-_Temple_of_Literature%2C_Hanoi_-_DSC04546.JPG";
    private static final String IMG_VAN_MIEU_3 = WM + "5/53/Stelae_of_Doctors_-_Temple_of_Literature%2C_Hanoi_-_DSC04680.JPG/960px-Stelae_of_Doctors_-_Temple_of_Literature%2C_Hanoi_-_DSC04680.JPG";
    private static final String IMG_NGOC_SON_1 = WM + "4/45/Hanoi_-_Ngoc_Son_Temple.jpg/960px-Hanoi_-_Ngoc_Son_Temple.jpg";
    private static final String IMG_NGOC_SON_2 = WM + "a/a5/Ngoc_Son_Temple%2C_Hanoi_%2815%29_%2837780892234%29.jpg/960px-Ngoc_Son_Temple%2C_Hanoi_%2815%29_%2837780892234%29.jpg";
    private static final String IMG_NGOC_SON_3 = WM + "e/ef/Temple_of_the_Jade_Mountain%2C_Hanoi%2C_Vietnam%2C_20240204_1309_5741.jpg/960px-Temple_of_the_Jade_Mountain%2C_Hanoi%2C_Vietnam%2C_20240204_1309_5741.jpg";
    private static final String IMG_BAT_TRANG_1 = WM + "f/f7/B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG/960px-B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG";
    private static final String IMG_BAT_TRANG_2 = WM + "c/ca/B%C3%A1t_Tr%C3%A0ng_DSC_0097.JPG/960px-B%C3%A1t_Tr%C3%A0ng_DSC_0097.JPG";
    private static final String IMG_BAT_TRANG_3 = WM + "0/05/B%C3%A1t_Tr%C3%A0ng_DSC_0098.JPG/960px-B%C3%A1t_Tr%C3%A0ng_DSC_0098.JPG";
    private static final String IMG_HOI_AN_1 = WM + "7/7e/M%E1%BB%99t_g%C3%B3c_ph%E1%BB%91_c%E1%BB%95_H%E1%BB%99i_An.JPG/960px-M%E1%BB%99t_g%C3%B3c_ph%E1%BB%91_c%E1%BB%95_H%E1%BB%99i_An.JPG";
    private static final String IMG_HOI_AN_2 = WM + "3/30/2024-12-20_Hoi_An_Old_Town_at_night_4.jpg/960px-2024-12-20_Hoi_An_Old_Town_at_night_4.jpg";
    private static final String IMG_PHU_KIEN_1 = WM + "e/e7/H%E1%BB%99i_An%2C_Fujian_Assembly_Hall%2C_2020-01_CN-01.jpg/960px-H%E1%BB%99i_An%2C_Fujian_Assembly_Hall%2C_2020-01_CN-01.jpg";
    private static final String IMG_PHU_KIEN_2 = WM + "4/4c/Fujian_Assembly_Hall_Hoi_An_7.jpg/960px-Fujian_Assembly_Hall_Hoi_An_7.jpg";
    private static final String IMG_PHU_KIEN_3 = WM + "4/49/H%E1%BB%99i_An_2024_-_Fujian_Assembly_Hall_%28H%E1%BB%99i_qu%C3%A1n_Ph%C3%BAc_Ki%E1%BA%BFn_%2C_%E6%9C%83%E5%AE%89%E7%A6%8F%E5%BB%BA%E6%9C%83%E9%A4%A8%29_-_img_01.jpg/960px-H%E1%BB%99i_An_2024_-_Fujian_Assembly_Hall_%28H%E1%BB%99i_qu%C3%A1n_Ph%C3%BAc_Ki%E1%BA%BFn_%2C_%E6%9C%83%E5%AE%89%E7%A6%8F%E5%BB%BA%E6%9C%83%E9%A4%A8%29_-_img_01.jpg";
    private static final String IMG_CHUA_CAU_1 = WM + "4/4d/H%E1%BB%99i_An%2C_Ch%C3%B9a_C%E1%BA%A7u%2C_2020-01_CN-02.jpg/960px-H%E1%BB%99i_An%2C_Ch%C3%B9a_C%E1%BA%A7u%2C_2020-01_CN-02.jpg";
    private static final String IMG_CHUA_CAU_2 = WM + "c/c5/H%E1%BB%99i_An%2C_Ch%C3%B9a_C%E1%BA%A7u%2C_2020-01_CN-03.jpg/960px-H%E1%BB%99i_An%2C_Ch%C3%B9a_C%E1%BA%A7u%2C_2020-01_CN-03.jpg";
    private static final String IMG_CHUA_CAU_3 = WM + "b/b8/2024_H%E1%BB%99i_An_-_Japanese_Covered_Bridge_%28Ch%C3%B9a_C%E1%BA%A7u%29_after_renovation_-_img_11.jpg/960px-2024_H%E1%BB%99i_An_-_Japanese_Covered_Bridge_%28Ch%C3%B9a_C%E1%BA%A7u%29_after_renovation_-_img_11.jpg";
    private static final String IMG_TAN_KY_1 = WM + "3/3b/DSC1051_-Vecchia_casa_di_Tan_Ky.jpg/960px-DSC1051_-Vecchia_casa_di_Tan_Ky.jpg";
    private static final String IMG_TAN_KY_2 = WM + "7/74/DSC1057_-Vecchia_casa_di_Tan_Ky.jpg/960px-DSC1057_-Vecchia_casa_di_Tan_Ky.jpg";
    private static final String IMG_THIEN_MU_1 = WM + "a/ad/Thien_Mu_Pagoda_in_February_2025.jpg/960px-Thien_Mu_Pagoda_in_February_2025.jpg";
    private static final String IMG_THIEN_MU_2 = WM + "e/e7/Hue_Vietnam_Thien-Mu-Temple-and-Pagoda-01.jpg/960px-Hue_Vietnam_Thien-Mu-Temple-and-Pagoda-01.jpg";
    private static final String IMG_THIEN_MU_3 = WM + "d/dd/Hue_Vietnam_Thien-Mu-Temple-and-Pagoda-04.jpg/960px-Hue_Vietnam_Thien-Mu-Temple-and-Pagoda-04.jpg";
    private static final String IMG_NGOC_MON_1 = WM + "5/52/Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg/960px-Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg";
    private static final String IMG_NGOC_MON_2 = WM + "1/13/Ng%E1%BB%8D_m%C3%B4n%2C_Hu%E1%BA%BF.jpg/960px-Ng%E1%BB%8D_m%C3%B4n%2C_Hu%E1%BA%BF.jpg";
    private static final String IMG_NGOC_MON_3 = WM + "a/ab/Meridian_Gate%2C_Hue_%28I%29.jpg/960px-Meridian_Gate%2C_Hue_%28I%29.jpg";
    private static final String IMG_THAI_HOA_1 = WM + "9/9e/Th%C3%A1i_H%C3%B2a_Palace_%28I%29.jpg/960px-Th%C3%A1i_H%C3%B2a_Palace_%28I%29.jpg";
    private static final String IMG_THAI_HOA_2 = WM + "a/a1/Thai_Hoa_Palace_20190917.jpg/960px-Thai_Hoa_Palace_20190917.jpg";
    private static final String IMG_THAI_HOA_3 = WM + "a/a2/Palace_of_Supreme_Harmony_%28Dien_Thai_Hoa%29%2C_Nguyen_Dynasty_Forbidden_City%2C_Hue_%2815436857392%29.jpg/960px-Palace_of_Supreme_Harmony_%28Dien_Thai_Hoa%29%2C_Nguyen_Dynasty_Forbidden_City%2C_Hue_%2815436857392%29.jpg";
    private static final String IMG_BINH_THUY_1 = WM + "c/cc/Nh%C3%A0_c%E1%BB%95_B%C3%ACnh_Th%E1%BB%A7y.jpg/960px-Nh%C3%A0_c%E1%BB%95_B%C3%ACnh_Th%E1%BB%A7y.jpg";
    private static final String IMG_BINH_THUY_2 = WM + "8/8d/Nh%C3%A0_c%E1%BB%95_B%C3%ACnh_Th%E1%BB%A7y_2.jpg/960px-Nh%C3%A0_c%E1%BB%95_B%C3%ACnh_Th%E1%BB%A7y_2.jpg";
    private static final String IMG_BINH_THUY_3 = WM + "e/e1/Nha_co_Binh_Thuy_1.jpg/960px-Nha_co_Binh_Thuy_1.jpg";
    private static final String IMG_CAI_RANG_1 = WM + "f/fb/Cai_Rang_Floating_Market_1.jpg/960px-Cai_Rang_Floating_Market_1.jpg";
    private static final String IMG_CAI_RANG_2 = WM + "9/93/Cai_Rang_Floating_Market_3.jpg/960px-Cai_Rang_Floating_Market_3.jpg";
    private static final String IMG_CAI_RANG_3 = WM + "f/fe/Cai_Rang_Floating_Market_4.jpg/960px-Cai_Rang_Floating_Market_4.jpg";
    private static final String IMG_CAI_RANG_4 = WM + "6/63/Cai_Rang_Floating_Market_5.jpg/960px-Cai_Rang_Floating_Market_5.jpg";
    private static final String IMG_NINH_KIEU = WM + "5/54/Ninh_Kieu_Quay.jpg/960px-Ninh_Kieu_Quay.jpg";
    private static final String IMG_MI_1 = WM + "9/9d/Rice_noodle_factory_4.jpg/960px-Rice_noodle_factory_4.jpg";
    private static final String IMG_MI_2 = WM + "3/3a/Rice_noodle_factory%2C_Can_Tho_%2844294968960%29.jpg/960px-Rice_noodle_factory%2C_Can_Tho_%2844294968960%29.jpg";
    private static final String IMG_MI_3 = WM + "1/1d/Rice_noodle_factory%2C_Can_Tho_%2845387552894%29.jpg/960px-Rice_noodle_factory%2C_Can_Tho_%2845387552894%29.jpg";

    // ── Bộ điểm đến dùng chung cho các tour ───────────────────────────────────

    private Map<String, StopSeed> buildStopSeeds() {
        Map<String, StopSeed> stops = new LinkedHashMap<>();

        stops.put("van-mieu", new StopSeed(
                "van-mieu",
                "Văn Miếu – Quốc Tử Giám",
                "Trường đại học đầu tiên của Việt Nam với 107 môn xuất và 82 bia đá tiến sĩ.",
                "Đến trước 08:30 để tránh đông đoàn. Áo dài kín, giày êm chân để đi bộ quanh khuôn viên.",
                "Năm 1070, vua Lý Thánh Tông lập Quốc Tử Giám để dạy văn chương, khoa cử. Năm 1075, "
                        + "khi quân nhà Đường đến xâm lược, các sĩ quan và thư sinh đưa bia đá ghi tên môn "
                        + "học và tên khoa bảng đời đình vào trong Văn Miếu. Những tấm bia ấy được gọi là "
                        + "bia Tiến sĩ — với 82 người đỗ khoa cử, 286 người thi và 10 người đạt bảng "
                        + "Đông ngô. Từ đó, Quốc Tử Giám trở thành nơi khai giảng thường xuyên, là "
                        + "hình mẫu của hệ thống giáo dục và khoa cử cổ đại Việt Nam.",
                List.of(IMG_VAN_MIEU_2, IMG_VAN_MIEU_3),
                List.of(IMG_VAN_MIEU_1, IMG_VAN_MIEU_2, IMG_VAN_MIEU_3),
                List.of(new ArtifactSeed("Bia đá Tiến sĩ năm Nhâm Tuất (1072)",
                        IMG_VAN_MIEU_3, "Tấm bia đầu tiên ghi tên khoa bảng thời Lý — nền móng của "
                        + "kỳ thi tiến sĩ.")),
                List.of(
                        new QuizSeed("Văn Miếu – Quốc Tử Giám được lập vào năm nào?",
                                List.of("Năm 1070", "Năm 1397", "Năm 1442", "Năm 1470"), 0),
                        new QuizSeed("Tấm bia đá ghi tên những người nào?",
                                List.of("Người đỗ khoa cử triều đình", "Người đã trúng số đỏ",
                                        "Các quan lộc", "Người đóng thuế"), 0)),
                List.of(new ExperienceSeed("Check-in trước cổng Đại Thành",
                        "21.0277000", "105.8351000", 80, 120,
                        "Ghi lại một câu chuyện bạn tìm hiểu được tại Văn Miếu.",
                        "Bất kỳ câu trả lời nào thật lòng về Văn Miếu (ví dụ: bia đá Tiến sĩ năm 1072)"))));

        stops.put("ngoc-son", new StopSeed(
                "ngoc-son",
                "Chùa Ngọc Sơn và Hồ Hoàn Kiếm",
                "Ngôi chùa trên đảo Ngọc Sơn giữa hồ Hoàn Kiếm — nơi trứ danh của thành Thăng Long.",
                "Đi theo vòng hồ theo chiều kim đồng hồ. Nghỉ chân ở Đền Trấn Ba để ngắm cầu Thê Húc.",
                "Chùa Ngọc Sơn được xây dựng vào cuối thế kỷ 19 theo kiến trúc Tam quan, nối với đảo Ngọc "
                        + "Sơn giữa hồ Hoàn Kiếm. Trước đó, đền Thanh Hà đã được dựng từ năm 1428 để thờ "
                        + "Trần Hưng Đạo. Câu đối nổi tiếng gắn với chùa là một bài thơ về cái đẹp của hồ "
                        + "nước và cảnh sáng trăng: trên hồ tất cả đều lấp lánh, chỉ có trăng giữa trời "
                        + "là không lấp lánh. Ngôi chùa gắn với câu chuyện văn hóa và tâm linh của người "
                        + "Hà Nội, là nơi nghỉ ngơi và chiêm nghiệm giữa lòng thành phố.",
                List.of(IMG_NGOC_SON_2, IMG_NGOC_SON_3),
                List.of(IMG_NGOC_SON_1, IMG_NGOC_SON_2, IMG_NGOC_SON_3),
                List.of(new ArtifactSeed("Bức hoành phi chùa Ngọc Sơn",
                        IMG_NGOC_SON_2, "Hoành phi ghi tên các vị trụ trì và người đã tu sửa chùa qua "
                        + "nhiều thế kỷ.")),
                List.of(
                        new QuizSeed("Chùa Ngọc Sơn nằm trên đảo nào của hồ Hoàn Kiếm?",
                                List.of("Đảo Ngọc Sơn", "Đảo Tiên", "Đảo Cửu Long", "Đảo Rùng"), 0),
                        new QuizSeed("Chùa Ngọc Sơn được xây dựng vào khoảng thời gian nào?",
                                List.of("Cuối thế kỷ 19", "Đầu thế kỷ 14", "Thế kỷ 17",
                                        "Đầu thế kỷ 20"), 0)),
                List.of(new ExperienceSeed("Ngắm cầu Thê Húc và đền Trấn Ba",
                        "21.0483000", "105.8368000", 120, 180,
                        "Bạn hiểu câu đối nổi tiếng của chùa Ngọc Sơn ra sao? Hãy viết lại bằng lời của bạn.",
                        "Một câu tả ngắn gọn về vẻ đẹp hồ Hoàn Kiếm và ánh trăng"))));

        stops.put("bat-trang", new StopSeed(
                "bat-trang",
                "Làng gốm Bát Tràng",
                "Làng nghề gốm hơn 500 năm ven sông Hồng với những món men lam, men rạn nổi tiếng.",
                "Nên mang giày êm, không đi thăm đình lúc giờ lễ. Có thể đặt bàn xoay nặn gốm trước.",
                "Theo sử làng, khi nhà Lý dời đô từ Hoa Lư ra Thăng Long, những người dân làng gốm Bạch "
                        + "Bát theo ra vùng đất bồi bên bờ sông Hồng và lập phường làm gốm. Từ đó, gốm Bát "
                        + "Tràng trở thành dòng gốm dân dụng nổi tiếng nhất miền Bắc, với các dòng men "
                        + "lam, men rạn và men nâu. Ngôi đình làng được dựng lại theo kiến trúc cổ, trước "
                        + "đình là bãi đất đá với những bộ bình vũy cổ làm nghề gốm.",
                List.of(IMG_BAT_TRANG_2, IMG_BAT_TRANG_3),
                List.of(IMG_BAT_TRANG_1, IMG_BAT_TRANG_2, IMG_BAT_TRANG_3),
                List.of(new ArtifactSeed("Bình cổ men rạn",
                        IMG_BAT_TRANG_3, "Sản phẩm men rạn đặc trưng của Bát Tràng, nung ở nhiệt độ cao.")),
                List.of(
                        new QuizSeed("Gốm Bát Tràng nổi tiếng với dòng men nào?",
                                List.of("Men lam", "Men trắng", "Men đen", "Men vàng"), 0),
                        new QuizSeed("Làng gốm Bát Tràng nằm ven dòng sông nào?",
                                List.of("Sông Hồng", "Sông Cầu", "Sông Đuống", "Sông Đà"), 0)),
                List.of(new ExperienceSeed("Nặn gốm trên bàn xoay cùng thợ làng",
                        "20.9785000", "105.9126000", 150, 600,
                        "Mô tả lý do bạn chọn mẫu men này cho sản phẩm của mình.",
                        "Một câu mô tả về men gốm và cảm nhận cá nhân"))));

        stops.put("hoi-an-pho-co", new StopSeed(
                "hoi-an-pho-co",
                "Phố cổ Hội An và hội quán Phúc Kiến",
                "Một trong những phố cổ nổi tiếng nhất thế giới, với hội quán Phúc Kiến thời thương nhân.",
                "Đến sau 17:00 để chụp ảnh phố cổ khi đèn lồng lên. Mang giày êm vì đường đất gạch cũ.",
                "Hội An được UNESCO công nhận là Di sản Thế giới năm 1999 nhờ kiến trúc thương nhân và "
                        + "những thành phố thương mại cổ. Ngôi nhà cổ Tấn Ký và các hội quán Trung Hoa "
                        + "đều thể hiện mô hình thương nhân đặt trọn sức mạnh ở quê nhà, mang theo thờ "
                        + "phong, tín ngưỡng và cả những nghi thức tâm linh của quê hương. Phố cổ vẫn giữ "
                        + "nhịp sống đời thường: hàng rong, tiệm may, quán ăn gia đình và những ngõ nhỏ "
                        + "thò đèn lồng.",
                List.of(IMG_HOI_AN_2, IMG_PHU_KIEN_2),
                List.of(IMG_HOI_AN_1, IMG_HOI_AN_2, IMG_PHU_KIEN_1, IMG_PHU_KIEN_2, IMG_PHU_KIEN_3),
                List.of(new ArtifactSeed("Bộ chén sứ cổ trong hội quán Phúc Kiến",
                        IMG_PHU_KIEN_1, "Sứ men lam và men trắng nhập từ Trung Quốc, thế kỷ 17–18.")),
                List.of(
                        new QuizSeed("Hội An được UNESCO công nhận là di sản thế giới vào năm nào?",
                                List.of("1999", "1985", "2003", "1992"), 0),
                        new QuizSeed("Hội quán Phúc Kiến do ai xây dựng?",
                                List.of("Thương nhân người Phúc Kiến", "Thương nhân người Quảng Đông",
                                        "Người Nhật", "Thương nhân người Hồi"), 0)),
                List.of(new ExperienceSeed("Ngắm hoành phi trang trí hội quán",
                        "15.8790000", "108.3360000", 120, 240,
                        "Bạn nhận ra điều gì đặc biệt trong hoạ tiết trang trí của hội quán?",
                        "Mô tả về hoạ tiết rồng/phượng hoặc bức tranh thủy mặc"))));

        stops.put("chua-cau", new StopSeed(
                "chua-cau",
                "Chùa Cầu (Cầu Nhật)",
                "Cầu gỗ kiến trúc Nhật Bản trên sông Thu Bồ, biểu tượng của Hội An.",
                "Không được dựng hàng rong dưới chân cầu. Đi bộ qua cầu theo chiều gió cho đẹp.",
                "Chùa Cầu hay cầu Nhật Bản được dựng năm 1593 theo kiến trúc của một ngôi cầu Nhật, "
                        + "với mái ngói cong và 15 chân cầu đá. Cầu nối hai bờ sông Thu Bồ, từng là nơi "
                        + "buôn bán và giao lưu quan trọng của thương nhân vùng. Sau nhiều lần được tu sửa, "
                        + "ngày nay chùa Cầu là biểu tượng gắn liền với Hội An, thu hút hàng triệu lượt "
                        + "khách tham quan mỗi năm.",
                List.of(IMG_CHUA_CAU_2, IMG_CHUA_CAU_3),
                List.of(IMG_CHUA_CAU_1, IMG_CHUA_CAU_2, IMG_CHUA_CAU_3),
                List.of(new ArtifactSeed("Bức hoành phi trên chùa Cầu",
                        IMG_CHUA_CAU_3, "Hoành phi ghi công đức tu sửa cầu và tên các ông hội chủ.")),
                List.of(
                        new QuizSeed("Chùa Cầu có bao nhiêu chân cầu?",
                                List.of("15 chân", "12 chân", "18 chân", "9 chân"), 0),
                        new QuizSeed("Chùa Cầu được xây theo kiến trúc của nước nào?",
                                List.of("Nhật Bản", "Trung Hoa", "Hàn Quốc", "Thổ Nhĩ Kỳ"), 0)),
                List.of(new ExperienceSeed("Đếm chân cầu và chụp ảnh trên chùa Cầu",
                        "15.8781000", "108.3382000", 60, 180,
                        "Bạn đếm được bao nhiêu chân cầu? Hãy ghi lại con số và ấn tượng của bạn.",
                        "Con số chân cầu (15) kèm vài từ về ấn tượng cá nhân"))));

        stops.put("tan-ky", new StopSeed(
                "tan-ky",
                "Nhà cổ Tấn Ký",
                "Ngôi nhà thương nhân hơn 400 tuổi giữa phố cổ, nơi lưu giữ kiến trúc Việt – Hoa.",
                "Tham quan bên trong nhà, không chụp flash. Có phí vào cổng và bảo vệ trông coi.",
                "Nhà cổ Tấn Ký được xây vào cuối thế kỷ 17, thuộc nhà cổ Bình Thủy hay Mường Hội An. "
                        + "Ngôi nhà kết hợp kiến trúc truyền thống Việt với phong cách Trung Hoa, thể hiện "
                        + "rõ đời sống của thương nhân người Hoa sinh sống tại Hội An. Bên trong là hệ "
                        + "thống gỗ chạm khắc tinh xảo, bộ bàn ghế xưa và khu vực thờ tổ tiên — nơi mỗi "
                        + "dịp Tết và ngày lễ, gia đình còn giữ nếp sinh hoạt cổ truyền.",
                List.of(IMG_TAN_KY_2),
                List.of(IMG_TAN_KY_1, IMG_TAN_KY_2),
                List.of(new ArtifactSeed("Bộ bàn ghế chạm khắc trong nhà cổ",
                        IMG_TAN_KY_1, "Đồ nội thất gỗ chạm khắc thể hiện đời sống của thương nhân Hội An.")),
                List.of(
                        new QuizSeed("Nhà cổ Tấn Ký có tuổi đời khoảng bao nhiêu năm?",
                                List.of("Hơn 400 năm", "Hơn 100 năm", "Hơn 200 năm", "Khoảng 50 năm"), 0),
                        new QuizSeed("Nhà cổ Tấn Ký kết hợp kiến trúc của những nền văn hóa nào?",
                                List.of("Việt và Trung Hoa", "Việt và Pháp", "Trung Hoa và Nhật", "Chỉ kiến trúc Việt"), 0)),
                List.of(new ExperienceSeed("Quan sát hoạ tiết chạm khắc trong nhà cổ",
                        "15.8765000", "108.3381000", 80, 300,
                        "Bạn tìm thấy chi tiết chạm khắc nào đáng chú ý nhất trong nhà?",
                        "Tên một hoạ tiết chạm khắc đẹp nhất bạn quan sát được"))));

        stops.put("thien-mu", new StopSeed(
                "thien-mu",
                "Chùa Thiên Mụ",
                "Ngôi chùa biểu tượng của Huế với tháp Phước Duyên 7 tầng bên bờ sông Hương.",
                "Đến trước 07:00 để nghe chuông chùa và tránh nắng. Đi thuyền sông Hương sau khi tham quan.",
                "Chùa Thiên Mụ được khởi lập năm 1605 dưới nhà Nguyễn, là nơi thờ Phật Tâm Bổn Mật và là "
                        + "trung tâm của đạo Phật Thiên Mụ bên bờ sông Hương. Tháp Phước Duyên bảy tầng "
                        + "được xây theo lối kiến trúc Phật giáo Ấn Độ, nổi bật giữa bầu trời Huế. Bên "
                        + "cạnh chùa là Đại Hồng Môn và Thế Tổ Miếu, nơi thờ các vua nhà Nguyễn. Ngôi chùa "
                        + "gắn với thiền môn Thiên Mụ và với hồn thơ Đường Thu Hương — những tầng lớp văn "
                        + "hóa của đất Cố đô.",
                List.of(IMG_THIEN_MU_2, IMG_THIEN_MU_3),
                List.of(IMG_THIEN_MU_1, IMG_THIEN_MU_2, IMG_THIEN_MU_3),
                List.of(new ArtifactSeed("Hồng chung Thiên Mụ",
                        IMG_THIEN_MU_2, "Chiếc chuông đúc đồng thời với việc dựng chùa, được ghi là "
                        + "một trong những tượng vật quý của đất Huế.")),
                List.of(
                        new QuizSeed("Tháp Phước Duyên của chùa Thiên Mụ có bao nhiêu tầng?",
                                List.of("7 tầng", "5 tầng", "9 tầng", "11 tầng"), 0),
                        new QuizSeed("Chùa Thiên Mụ được khởi lập vào thế kỷ nào?",
                                List.of("Thế kỷ 17", "Thế kỷ 15", "Thế kỷ 18", "Thế kỷ 19"), 0)),
                List.of(new ExperienceSeed("Nghe chuông chùa và ngắm tháp Phước Duyên",
                        "16.4599000", "107.5852000", 120, 240,
                        "Bạn cảm nhận điều gì đặc biệt khi đứng trước tháp Phước Duyên?",
                        "Một câu cảm nhận về không gian chùa Thiên Mụ"))));

        stops.put("ngoc-mon", new StopSeed(
                "ngoc-mon",
                "Hoàng thành Huế – Ngọ Môn",
                "Cổng thành phía Nam của Hoàng thành Huế, nơi xuất hiện trên nhiều tấm ảnh lịch sử.",
                "Đi sớm khi cổng vắng. Sân trước Ngọ Môn rộng, thích hợp chụp ảnh.",
                "Ngọ Môn là cổng chính phía Nam của Hoàng thành Huế, xây theo kiến trúc Võ Thành của "
                        + "Trấn Bình — 5 cửa, 3 tầng, mái ngói cong hai lớp. Từ đây, con đường Thần Nông "
                        + "dẫn thẳng vào Đại Nội. Ngọ Môn từng chứng kiến nhiều sự kiện lịch sử, từ việc "
                        + "vua Gia Long dựng đài ngũ phụng trước cung đình đến hành trình của các đoàn "
                        + "thương nhân và sứ đoàn ngoại quốc. Ngày nay, quân lính trong lễ hội và du "
                        + "khách vẫn thường xuyên ghé qua nơi đây.",
                List.of(IMG_NGOC_MON_2, IMG_NGOC_MON_3),
                List.of(IMG_NGOC_MON_1, IMG_NGOC_MON_2, IMG_NGOC_MON_3),
                List.of(new ArtifactSeed("Đại bia của Ngọ Môn",
                        IMG_NGOC_MON_3, "Tấm bia đá lớn đặt trước cổng thành ghi công đức của triều đình.")),
                List.of(
                        new QuizSeed("Ngọ Môn là cổng nào của Hoàng thành Huế?",
                                List.of("Cổng phía Nam", "Cổng phía Bắc", "Cổng phía Đông",
                                        "Cổng phía Tây"), 0),
                        new QuizSeed("Hoàng thành Huế được xây theo kiến trúc của nhà nào?",
                                List.of("Nhà Nguyễn", "Nhà Lý", "Nhà Trần", "Nhà Tây Sơn"), 0)),
                List.of(new ExperienceSeed("Đứng trước Ngọ Môn và tìm Đại bia",
                        "16.4635000", "107.5790000", 100, 180,
                        "Bạn tìm thấy Đại bia ở đâu trước cổng Ngọ Môn?",
                        "Mô tả vị trí tấm bia đá trước cổng Ngọ Môn"))));

        stops.put("thai-hoa", new StopSeed(
                "thai-hoa",
                "Điện Thái Hòa và Đại Nội",
                "Cung điện uy nghi của vua nhà Nguyễn trong khu Đại Nội Huế.",
                "Trang phục kín đáo, không mở flash. Giữ trật tự trong không gian thờ tự.",
                "Điện Thái Hòa là nơi ngự thiến của các vua nhà Nguyễn, nằm giữa Đại Nội Huế. Cả cung "
                        + "điện được xây theo quy cách cung đình và triều đình Việt, với hệ thống ngũ "
                        + "điện, hành lang và khu tế lễ trang trọng. Năm 1802, cung điện chứng kiến cuộc "
                        + "hội triều lớn của Nguyễn Ánh trước khi lên ngôi. Ngày nay, Điện Thái Hòa là "
                        + "trung tâm của Di sản Thế giới Đại Nội Huế — một tổng thể kiến trúc cung đình "
                        + "độc đáo ở Việt Nam.",
                List.of(IMG_THAI_HOA_2, IMG_THAI_HOA_3),
                List.of(IMG_THAI_HOA_1, IMG_THAI_HOA_2, IMG_THAI_HOA_3),
                List.of(new ArtifactSeed("Bộ đình đồng ngự trên Điện Thái Hòa",
                        IMG_THAI_HOA_3, "Đình đồng và ngự chiến đồ trang trí cho điện Thái Hòa.")),
                List.of(
                        new QuizSeed("Điện Thái Hòa nằm trong khu vực nào?",
                                List.of("Đại Nội Huế", "Ngoài Thành", "Thái Hòa Lầu",
                                        "Khu phố cổ"), 0),
                        new QuizSeed("Điện Thái Hòa là nơi ngự thiến của nhà nào?",
                                List.of("Nhà Nguyễn", "Nhà Lê", "Nhà Tây Sơn", "Nhà Nguyễn Ánh"), 0)),
                List.of(new ExperienceSeed("Quan sát hệ thống hoành phi trong Điện Thái Hòa",
                        "16.4608000", "107.5843000", 100, 240,
                        "Hoành phi trong Điện Thái Hòa nói về điều gì?",
                        "Nội dung ý nghĩa của hoành phi trong Điện Thái Hòa"))));

        stops.put("binh-thuy", new StopSeed(
                "binh-thuy",
                "Nhà cổ Bình Thủy",
                "Ngôi nhà cổ kiểu Đông Dương nổi tiếng với vườn cây cảnh và bí mật trong vỏ trứng.",
                "Nơi lưu trữ hiện vật cần giữ kín, vui lòng không chụp flash vào khu trưng bày.",
                "Nhà cổ Bình Thủy thuộc làng Bình Thủy (nay là phường Bình Thuỷ, Cần Thơ), được dựng "
                        + "năm 1870 bởi ông Bình Thủy — một thương nhân lớn. Kiến trúc của ngôi nhà mang "
                        + "đậm phong cách Đông Dương, pha trộn các chi tiết kiến trúc phương Tây với nét "
                        + "trang trí cổ Việt. Trong khuôn viên có vườn cây cảnh với hàng trăm loài cây quý, "
                        + "bể cá, vào những bí mật trong vỏ trứng của ngôi nhà. Trong không gian này, "
                        + "người dân Cần Thơ thường nhắc đến câu ca dao: “Trong vỏ trứng có đẻ rồng”.",
                List.of(IMG_BINH_THUY_2, IMG_BINH_THUY_3),
                List.of(IMG_BINH_THUY_1, IMG_BINH_THUY_2, IMG_BINH_THUY_3),
                List.of(new ArtifactSeed("Bộ đình đồng thờ Cần Thơ",
                        IMG_BINH_THUY_3, "Bộ đình đồng lớn được xem là một trong những bộ đình đồng "
                        + "đẹp nhất vùng Đồng bằng sông Cửu Long.")),
                List.of(
                        new QuizSeed("Nhà cổ Bình Thủy mang phong cách kiến trúc nào?",
                                List.of("Đông Dương", "Trung Hoa", "Nhật Bản", "Hy Lạp"), 0),
                        new QuizSeed("Nhà cổ Bình Thủy nằm ở thành phố nào?",
                                List.of("Cần Thơ", "Vĩnh Long", "An Giang", "Bạc Liêu"), 0)),
                List.of(new ExperienceSeed("Dạo vườn cây cảnh và tìm bể cá cổ",
                        "10.0345000", "105.7860000", 120, 300,
                        "Bạn tìm thấy loại cây nào đặc biệt ấn tượng trong vườn?",
                        "Tên một loài cây bạn ghi nhận trong vườn nhà cổ"))));

        stops.put("cai-rang", new StopSeed(
                "cai-rang",
                "Chợ nổi Cái Răng",
                "Khu chợ nổi trên sông Cần Thơ — ẩm thực và sinh hoạt buôn bán từ sáng sớm.",
                "Đi sớm trước 07:00. Thương lượng nhẹ nhàng, không ép giá. Mang theo tiền mặt.",
                "Chợ nổi Cái Răng là nơi giao thương lớn của miền Tây, gồm nhiều chợ nổi và chợ cống "
                        + "trên sông Cần Thơ. Từ khoảng 5 giờ sáng, ghe hàng từ các tỉnh lân cận đã "
                        + "tụ về, treo trên đầu ghe là đặc sản: chuối, dừa, cá, bánh ú, kẹo bảo — đặc "
                        + "sản Cần Thơ được bán theo tạp khoán. Khu chợ cũng gắn với ca dao: “Cá rán, "
                        + "răng cưa, cà chua thơm lửng, mận hậu đặng ngọt bổ máu”.",
                List.of(IMG_CAI_RANG_2, IMG_CAI_RANG_3),
                List.of(IMG_CAI_RANG_1, IMG_CAI_RANG_2, IMG_CAI_RANG_3, IMG_CAI_RANG_4),
                List.of(new ArtifactSeed("Ghe hàng bán kẹo bảo",
                        IMG_CAI_RANG_4, "Kẹo bảo là đặc sản tiêu biểu của miền Tây, được bán trên ghe.")),
                List.of(
                        new QuizSeed("Chợ nổi Cái Răng họp vào khoảng thời gian nào?",
                                List.of("Từ 5 giờ sáng", "Từ 12 giờ trưa", "Từ 18 giờ chiều",
                                        "Suốt đêm"), 0),
                        new QuizSeed("Đặc sản nào sau đây là sản vật tiêu biểu của chợ nổi Cái Răng?",
                                List.of("Kẹo bảo", "Mì Quảng", "Bánh xèo miền Trung", "Bánh xèo Hải Phòng"), 0)),
                List.of(new ExperienceSeed("Thử và ghi nhận đặc sản trên ghe hàng",
                        "10.0450000", "105.7470000", 200, 600,
                        "Bạn đã thử món đặc sản nào trên chợ nổi? Viết lại cảm nhận của bạn.",
                        "Tên món ăn đã thử kèm vài từ cảm nhận"))));

        stops.put("ninh-kieu", new StopSeed(
                "ninh-kieu",
                "Bến Ninh Kiều",
                "Bến sông quen thuộc của Cần Thơ, điểm xuất hiện trong thơ Đường Thu Hương.",
                "Buổi chiều mát mẻ nhất. Có bến đỗ xe và quán cà phê ven sông để ngắm hoàng hôn.",
                "Bến Ninh Kiều nằm bên bờ sông Hậu, thuộc quận Ninh Kiều — Cần Thơ. Nơi đây gắn với "
                        + "những vần thơ Đường Thu Hương và là địa chỉ quen thuộc của người Cần Thơ. Dọc "
                        + "bến sông là những nhà hàng, quán cà phê và bến tàu đưa khách tham quan dọc "
                        + "sông Hậu, nơi có thể ngắm cảnh hai bên bờ sông về chiều.",
                List.of(),
                List.of(IMG_NINH_KIEU, IMG_CAI_RANG_4, IMG_MI_1),
                List.of(new ArtifactSeed("Cà phê ven sông Hậu",
                        IMG_NINH_KIEU, "Không gian bến Ninh Kiều — nơi giao thương và gặp gỡ quen thuộc "
                                + "của người Cần Thơ.")),
                List.of(
                        new QuizSeed("Bến Ninh Kiều nằm bên bờ con sông nào?",
                                List.of("Sông Hậu", "Sông Cửu Long", "Sông Tiền", "Sông Đồng Nai"), 0),
                        new QuizSeed("Bến Ninh Kiều thuộc quận nào của Cần Thơ?",
                                List.of("Ninh Kiều", "Tân Bộ", "Cái Răng", "Hố Nai"), 0)),
                List.of(new ExperienceSeed("Ngắm cảnh sông Hậu từ bến Ninh Kiều",
                        "10.0347000", "105.7880000", 150, 300,
                        "Cảnh vật trên bến Ninh Kiều khiến bạn ấn tượng nhất điều gì?",
                        "Một câu mô tả cảnh bến Ninh Kiều bạn ghi nhận"))));

        stops.put("xuong-mi", new StopSeed(
                "xuong-mi",
                "Xưởng mì Cần Thơ và bánh kẹo truyền thống",
                "Theo dõi quy trình làm mì tay và thưởng món bánh kẹo dừa mặn ngọt đặc trưng.",
                "Vui lòng không đưa thức ăn vào khu sản xuất. Rửa tay trước khi tham gia làm mì.",
                "Nghề làm mì ở Cần Thơ gắn với câu chuyện dân gốc Nam Định, Hải Dương tìm đất lập làng ở "
                        + "miền Tây. Xưởng mì là nơi bánh được làm thủ công hoàn toàn: bột mì được trộn "
                        + "với nước, nắm thành khối, nén qua khuôn rồi cắt bằng móc tre. Bên cạnh là "
                        + "nghề bánh kẹo dừa — đặc sản gắn với câu ca dao “Bánh kẹo giẻ quế, ai đem "
                        + "về cho ăn lấy chồng”. Đây là hai nghề thủ công gắn bó sâu với đời sống người "
                        + "miền Tây.",
                List.of(IMG_MI_2, IMG_MI_3),
                List.of(IMG_MI_1, IMG_MI_2, IMG_MI_3),
                List.of(new ArtifactSeed("Khuôn và móc làm mì thủ công",
                        IMG_MI_1, "Bộ khuôn mì và móc cắt bánh được dùng hàng trăm năm trong xưởng mì.")),
                List.of(
                        new QuizSeed("Bánh kẹo đặc trưng của miền Tây được làm chủ yếu từ gì?",
                                List.of("Nước cốt dừa và đường", "Bột mì và trứng", "Đậu nành",
                                        "Gạo và lá dứa"), 0),
                        new QuizSeed("Bánh mì ở xưởng mì Cần Thơ được làm bằng cách nào?",
                                List.of("Thủ công với khuôn và móc", "Máy đúc tự động",
                                        "Nướng bằng lò điện", "Hấp trong khuôn nhôm"), 0)),
                List.of(new ExperienceSeed("Thử làm mì thủ công cùng nghệ nhân",
                        "10.0452000", "105.7836000", 120, 900,
                        "Bạn thấy khâu nào trong quy trình làm mì thú vị nhất?",
                        "Tên một bước trong quy trình làm mì bạn thấy thú vị"))));

        return stops;
    }

    // ── Danh mục tour (20–30 tour) ────────────────────────────────────────────

    private List<TourSeed> buildTourSeeds() {
        List<TourSeed> seeds = new ArrayList<>();

        // ── Miền Bắc ───────────────────────────────────────────────────────────
        seeds.add(new TourSeed(
                "Văn Miếu và hồ Hoàn Kiếm: trường đại học đầu tiên của Việt Nam",
                TourFormat.DAY_TRIP, 240, 1, 0, "bac", "disan", "main", false,
                "Nửa ngày ở trung tâm Hà Nội với hai điểm đến biểu tượng: Văn Miếu – Quốc Tử Giám — "
                        + "nơi khởi nguồn của hệ thống giáo dục cổ đại — và chùa Ngọc Sơn trên đảo "
                        + "Ngọc Sơn giữa hồ Hoàn Kiếm. Bạn sẽ đi bộ qua khuôn viên Văn Miếu, đọc những "
                        + "tấm bia đá Tiến sĩ và nghe thuyết minh về kỳ thi khoa cử thời Lý. Sau đó "
                        + "dừng chân ở chùa Ngọc Sơn để ngắm hồ Hoàn Kiềm và cầu Thê Húc.",
                List.of("Đi bộ qua 82 tấm bia đá Tiến sĩ tại Văn Miếu",
                        "Nghe chuyện kỳ thi khoa bảng thời Lý Thánh Tông",
                        "Ngắm hồ Hoàn Kiềm và cầu Thê Húc từ đảo Ngọc Sơn",
                        "Trải nghiệm check-in GPS tại hai checkpoint"),
                List.of("van-mieu", "ngoc-son"), 650000, 390000, 150000, 15,
                "Văn Miếu – Quốc Tử Giám và chùa Ngọc Sơn",
                "Tham quan hai di sản văn hóa trung tâm Hà Nội"));

        seeds.add(new TourSeed(
                "Bát Tràng nửa ngày: đình làng, chợ gốm và bàn xoay",
                TourFormat.DAY_TRIP, 300, 1, 0, "bac", "langnghe", "main", false,
                "Nửa ngày ở làng gốm Bát Tràng bên bờ sông Hồng, cách trung tâm Hà Nội khoảng 13 km. "
                        + "Bạn thăm ngôi đình làng dựng lại theo kiến trúc cổ, dạo qua chợ gốm với hàng "
                        + "nghìn món men lam, men rạn và men nâu, rồi ngồi vào bàn xoay để tự tay nặn "
                        + "một chiếc bát dưới sự hướng dẫn của thợ gốm trong làng.",
                List.of("Thăm đình Bát Tràng quay mặt ra sông Hồng",
                        "Dạo chợ gốm, phân biệt men lam, men rạn và men nâu",
                        "Tự tay nặn gốm trên bàn xoay cùng thợ làng",
                        "Nghe chuyện người Bạch Bát theo vua Lý dời đô ra lập phường gốm"),
                List.of("bat-trang", "ngoc-son"), 550000, 330000, 120000, 12,
                "Làng gốm Bát Tràng và chùa Ngọc Sơn",
                "Trải nghiệm nghề gốm truyền thống ven sông Hồng"));

        seeds.add(new TourSeed(
                "Hà Nội văn hiến: Văn Miếu và chùa Ngọc Sơn",
                TourFormat.DAY_TRIP, 300, 1, 0, "bac", "tamlinh", "main", false,
                "Một hành trình ngắn qua hai nơi gắn với đời sống tâm linh và trí tuệ của người Hà Nội. "
                        + "Buổi sáng ở Văn Miếu để ngắm khuôn viên khi vắng, sau đó dừng ở chùa Ngọc Sơn "
                        + "để nghe chuông chùa và ngắm hồ Hoàn Kiếm từ đảo Ngọc Sơn.",
                List.of("Văn Miếu vào sớm khi khuôn viên còn vắng",
                        "Nghe chuông chùa Ngọc Sơn giữa hồ Hoàn Kiếm",
                        "Check-in GPS tại cổng Đại Thành và trên đảo Ngọc Sơn",
                        "Câu đối nổi tiếng của chùa Ngọc Sơn"),
                List.of("van-mieu", "ngoc-son"), 590000, 350000, 130000, 15,
                "Văn Miếu và chùa Ngọc Sơn",
                "Hành trình tìm hiểu đời sống tâm linh của Thăng Long"));

        seeds.add(new TourSeed(
                "Nghệ thuật gốm Bát Tràng: từ men lam đến bàn xoay",
                TourFormat.DAY_TRIP, 360, 1, 0, "bac", "langnghe", "main", false,
                "Chuyên sâu hơn về nghề gốm Bát Tràng: bạn sẽ đến thăm xưởng gốm, tìm hiểu quy trình "
                        + "nung và men men, rồi dành trọn một buổi để thực hành nặn gốm trên bàn xoay. "
                        + "Sản phẩm được nung và giao lại sau 3–5 ngày.",
                List.of("Tìm hiểu quy trình tạo men lam và men rạn",
                        "Thực hành nặn gốm trên bàn xoay với thợ làng",
                        "Thăm đình làng và chợ gốm Bát Tràng",
                        "Nhận sản phẩm gốm đã nung giao tận nơi"),
                List.of("bat-trang", "van-mieu"), 720000, 430000, 160000, 10,
                "Xưởng gốm và Văn Miếu",
                "Một ngày theo dấu nghề gốm và tri thức cổ"));

        // ── Miền Trung ─────────────────────────────────────────────────────────
        seeds.add(new TourSeed(
                "Chùa Cầu và phố cổ Hội An trong một buổi chiều",
                TourFormat.DAY_TRIP, 300, 1, 0, "trung", "disan", "p2", true,
                "Buổi chiều ở Hội An bắt đầu từ Chùa Cầu — cầu gỗ kiến trúc Nhật Bản trên sông Thu Bồ "
                        + "— rồi đi bộ vào phố cổ để ngắm những mái ngói cong và hội quán Phúc Kiến. "
                        + "Khi trời tối, đèn lồng được thắp khắp các ngõ phố và bạn có thể nếm món ăn "
                        + "đặc trưng của địa phương.",
                List.of("Ngắm chùa Cầu kiến trúc Nhật Bản trên sông Thu Bồ",
                        "Dạo hội quán Phúc Kiến và nghe chuyện thương nhân xứ xứ",
                        "Đếm chân cầu và tìm Đại bia trước cổng thành",
                        "Trải nghiệm phố cổ khi đèn lồng lên"),
                List.of("chua-cau", "hoi-an-pho-co"), 620000, 370000, 140000, 15,
                "Chùa Cầu và phố cổ Hội An",
                "Chiều bộ chuồn chân trong phố cổ Hội An"));

        seeds.add(new TourSeed(
                "Phố cổ Hội An: hội quán và nhà cổ Tấn Ký",
                TourFormat.DAY_TRIP, 240, 1, 0, "trung", "disan", "p2", false,
                "Bạn dành trọn nửa ngày để khám phá diện mạo thương nhân của Hội An qua hội quán Phúc "
                        + "Kiến và ngôi nhà cổ Tấn Ký. Hướng dẫn viên sẽ kể về đời sống của thương nhân "
                        + "Hoa kiều và cách họ duy trì nghi thức thờ cúng trong những ngôi nhà này.",
                List.of("Ngắm hoành phi và kiến trúc hội quán Phúc Kiến",
                        "Chiêm nghiệm hoạ tiết chạm khắc trong nhà cổ Tấn Ký",
                        "Nghe chuyện về đời sống thương nhân Hội An thế kỷ 17",
                        "Tự tham quan đồ đạc cổ trong nhà cổ"),
                List.of("hoi-an-pho-co", "tan-ky"), 520000, 310000, 120000, 12,
                "Hội quán Phúc Kiến và nhà cổ Tấn Ký",
                "Đi sâu vào đời sống của thương nhân phố cổ"));

        seeds.add(new TourSeed(
                "Nhà cổ Tấn Ký và chùa Cầu",
                TourFormat.DAY_TRIP, 240, 1, 0, "trung", "disan", "p2", true,
                "Hai điểm đến nhỏ nhưng giàu giá trị của Hội An: ngôi nhà cổ của thương nhân Tấn Ký và "
                        + "cầu Nhật Bản trên sông Thu Bồ. Buổi tham quan nhẹ nhàng, phù hợp với khách "
                        + "muốn hiểu sâu về văn hóa địa phương thay vì đi nhiều điểm.",
                List.of("Vào bên trong nhà cổ hơn 400 tuổi",
                        "Đếm chân cầu Chùa Cầu và ngắm hoàng hôn sông Thu Bồ",
                        "Tìm hiểu hệ thống gỗ chạm khắc trong nhà cổ",
                        "Tham quan hội quán cổ gần chợ trung tâm"),
                List.of("tan-ky", "chua-cau"), 480000, 290000, 110000, 12,
                "Nhà cổ Tấn Ký và Chùa Cầu",
                "Nửa ngày trong không gian di sản Hội An"));

        seeds.add(new TourSeed(
                "Lễ hội đèn lồng Hội An: chùa Cầu và phố cổ",
                TourFormat.DAY_TRIP, 330, 1, 0, "trung", "lehoi", "p2", false,
                "Hội An nổi tiếng với đèn lồng và các lễ hội truyền thống. Tour này bạn sẽ đi qua "
                        + "phố cổ vào buổi chiều tối, khi hàng nghìn chiếc đèn lồng được thắp lên, và "
                        + "ghé chùa Cầu để ngắm phố cổ từ phía sông — góc nhìn được xem là đẹp nhất "
                        + "của Hội An.",
                List.of("Ngắm phố cổ Hội An trong không khí lễ hội đèn lồng",
                        "Chụp ảnh Chùa Cầu vào hoàng hôn",
                        "Tham quan hội quán Phúc Kiến được thắp đèn",
                        "Trải nghiệm check-in vào buổi tối"),
                List.of("hoi-an-pho-co", "chua-cau"), 680000, 400000, 150000, 20,
                "Đèn lồng Hội An và Chùa Cầu",
                "Một tối lễ hội trong phố cổ"));

        seeds.add(new TourSeed(
                "Chùa Thiên Mụ và những bài thơ trên hồ",
                TourFormat.DAY_TRIP, 210, 1, 0, "trung", "tamlinh", "p2", false,
                "Chùa Thiên Mụ đứng yên bên bờ sông Hương với tháp Phước Duyên bảy tầng và hồng chung "
                        + "lịch sử. Hướng dẫn viên kể về thiền môn Thiên Mụ và về hồn thơ Đường Thu "
                        + "Hương gắn với Huế, sau đó bạn có thể đi thuyền ngắm sông Hương.",
                List.of("Nghe chuông Thiên Mụ và ngắm tháp Phước Duyên",
                        "Tìm hiểu hồng chung và Đại Hồng Môn",
                        "Nghe chuyện thiền môn Thiên Mụ và thơ Đường Thu Hương",
                        "Tự do ngắm sông Hương vào buổi sáng"),
                List.of("thien-mu", "ngoc-mon"), 450000, 270000, 100000, 12,
                "Chùa Thiên Mụ và Ngọ Môn",
                "Sáng sớm bên bờ sông Hương"));

        seeds.add(new TourSeed(
                "Hoàng thành Huế: Ngọ Môn và Điện Thái Hòa",
                TourFormat.DAY_TRIP, 360, 1, 0, "trung", "disan", "p2", false,
                "Một nửa ngày trong Đại Nội Huế — Di sản Thế giới. Bạn đi qua Ngọ Môn, con đường Thần "
                        + "Nông và bước vào Điện Thái Hòa, nơi ngự thiến của các vua nhà Nguyễn. Hướng "
                        + "dẫn viên kể về đời vua Gia Long và về hệ thống ngũ điện cung đình.",
                List.of("Đi qua Ngọ Môn và tìm Đại bia trước cổng thành",
                        "Tham quan Điện Thái Hòa và hệ thống ngũ điện",
                        "Nghe chuyện ngự thiến và đời vua nhà Nguyễn",
                        "Chiêm nghiệm không gian tế lễ của cung đình"),
                List.of("ngoc-mon", "thai-hoa"), 680000, 400000, 150000, 15,
                "Ngọ Môn và Điện Thái Hòa",
                "Đi trong Đại Nội Huế giữa ánh nắng sớm"));

        seeds.add(new TourSeed(
                "Đại Nội Huế trọn một ngày",
                TourFormat.DAY_TRIP, 480, 1, 0, "trung", "disan", "p2", false,
                "Cả ngày trong Đại Nội Huế: từ Ngọ Môn đến Điện Thái Hòa, rồi ra chùa Thiên Mụ bên bờ "
                        + "sông Hương. Đây là hành trình dành cho người muốn hiểu kỹ về kiến trúc cung "
                        + "đình và đời sống triều đình Nguyễn.",
                List.of("Đi trọn khu Đại Nội — Di sản Thế giới",
                        "Tham quan Điện Thái Hòa và các điện tiền",
                        "Ra chùa Thiên Mụ và nghe chuông chùa bên sông Hương",
                        "Ăn trưa và nghỉ chân trong không gian cung đình"),
                List.of("thai-hoa", "ngoc-mon", "thien-mu"), 980000, 590000, 220000, 12,
                "Đại Nội và Thiên Mụ",
                "Một ngày đầy đủ trong cố đô Huế"));

        seeds.add(new TourSeed(
                "Tâm linh Huế: chùa Thiên Mụ và Điện Thái Hòa",
                TourFormat.DAY_TRIP, 240, 1, 0, "trung", "tamlinh", "p2", false,
                "Tour dành cho khách muốn tìm hiểu chiều sâu tâm linh của Huế: buổi sớm ở chùa Thiên "
                        + "Mụ khi chùa còn vắng, sau đó vào Điện Thái Hòa để tìm hiểu nghi lễ và kiến "
                        + "trúc cung đình.",
                List.of("Chùa Thiên Mụ lúc sớm, khi chỉ còn hương khói",
                        "Điện Thái Hòa và hệ thống hoành phi",
                        "Nghe tiếng chuông chùa và câu chuyện thiền môn",
                        "Tĩnh lặng quan sát không gian thờ tự"),
                List.of("thien-mu", "thai-hoa"), 520000, 310000, 115000, 10,
                "Thiên Mụ và Điện Thái Hòa",
                "Một buổi sớm tìm không gian tĩnh lặng của Huế"));

        seeds.add(new TourSeed(
                "Di sản Hội An: Chùa Cầu và hội quán Phúc Kiến",
                TourFormat.DAY_TRIP, 300, 1, 0, "trung", "disan", "p2", false,
                "Hai công trình tiêu biểu của Hội An được UNESCO công nhận. Bạn sẽ đến Chùa Cầu vào "
                        + "buổi sáng khi cầu còn vắng, rồi dành phần lớn thời gian ở hội quán Phúc Kiến "
                        + "để ngắm hoạ tiết trang trí và hiểu vai trò của hội quán trong đời sống thương nhân.",
                List.of("Chùa Cầu vào sáng sớm khi chưa nhiều khách",
                        "Hoành phi và kiến trúc hội quán Phúc Kiến",
                        "Kiến trúc Nhật Bản trên sông Thu Bồ",
                        "Tự do thưởng thức không gian phố cổ"),
                List.of("chua-cau", "hoi-an-pho-co"), 660000, 390000, 145000, 15,
                "Chùa Cầu và hội quán Phúc Kiến",
                "Hai di sản tiêu biểu của phố cổ Hội An"));

        seeds.add(new TourSeed(
                "Huế qua Ngọ Môn và Thiên Mụ",
                TourFormat.DAY_TRIP, 240, 1, 0, "trung", "disan", "p2", false,
                "Nửa ngày khép lại bằng hai biểu tượng của Huế: cổng thành Ngọ Môn giữa ánh nắng "
                        + "sớm và chùa Thiên Mụ bên bờ sông Hương chiều. Tour phù hợp cho khách muốn "
                        + "ghé Huế trong ngày đi tiếp.",
                List.of("Ngọ Môn giữa ánh nắng sớm",
                        "Đại bia và lịch sử cổng thành phía Nam",
                        "Tháp Phước Duyên bên bờ sông Hương",
                        "Nghe chuông chùa và ngắm hoàng hôn"),
                List.of("ngoc-mon", "thien-mu"), 500000, 300000, 115000, 12,
                "Ngọ Môn và Thiên Mụ",
                "Hai đầu mốc của ký ức Huế"));

        seeds.add(new TourSeed(
                "Hội An cổ trong hai ngày",
                TourFormat.MULTI_DAY, 0, 2, 1, "trung", "disan", "p2", false,
                "Hai ngày ở phố cổ Hội An để đi sâu vào đời sống thương nhân và văn hóa địa phương. "
                        + "Ngày đầu bạn khám phá Chùa Cầu và phố cổ ban ngày; ngày thứ hai ghé nhà cổ "
                        + "Tấn Ký, hội quán Phúc Kiến và thưởng thức ẩm thực đường phố.",
                List.of("Chùa Cầu, hội quán Phúc Kiến và nhà cổ Tấn Ký",
                        "Hai buổi sáng và chiều riêng trong phố cổ",
                        "Ẩm thực đường phố và chợ trung tâm Hội An",
                        "Trải nghiệm check-in GPS tại bốn điểm dừng"),
                List.of("chua-cau", "hoi-an-pho-co", "tan-ky"), 1450000, 870000, 320000, 15,
                "Hội An hai ngày một đêm",
                "Hai ngày sống trong nhịp sống phố cổ"));

        seeds.add(new TourSeed(
                "Huế cổ đô: Hoàng thành và Thiên Mụ hai ngày một đêm",
                TourFormat.MULTI_DAY, 0, 2, 1, "trung", "tamlinh", "p2", false,
                "Hai ngày ở cố đô Huế: ngày đầu đi trong Đại Nội và Điện Thái Hòa, ngày thứ hai ghé "
                        + "chùa Thiên Mụ và ngắm Hoàng thành. Tour nhẹ nhàng, phù hợp khách lớn tuổi.",
                List.of("Điện Thái Hòa và Ngọ Môn giữa lòng Đại Nội",
                        "Chùa Thiên Mụ bên bờ sông Hương",
                        "Hai buổi sáng tĩnh lặng ở các điểm đến tâm linh",
                        "Thời gian tự do khám phá Huế"),
                List.of("ngoc-mon", "thai-hoa", "thien-mu"), 1550000, 930000, 350000, 12,
                "Huế hai ngày một đêm",
                "Cố đô Huế qua hai ngày trải nghiệm"));

        // ── Miền Tây Nam Bộ ───────────────────────────────────────────────────
        seeds.add(new TourSeed(
                "Chợ nổi Cái Răng và bến Ninh Kiều",
                TourFormat.DAY_TRIP, 240, 1, 0, "taynam", "amthuc", "p1", true,
                "Sáng sớm ở chợ nổi Cái Răng để đón bầy ghe hàng từ các tỉnh lân cận, thưởng thức "
                        + "đặc sản Cần Thơ và mua kẹo bảo. Sau đó bạn đi bộ dọc bến Ninh Kiều để ngắm "
                        + "sông Hậu và nghỉ cà phê ven bờ nước.",
                List.of("Đón bầy ghe hàng lúc 5 giờ sáng",
                        "Thử đặc sản Cần Thơ ngay trên chợ nổi",
                        "Ngắm sông Hậu từ bến Ninh Kiều",
                        "Mua kẹo bảo và đặc sản miền Tây"),
                List.of("cai-rang", "ninh-kieu"), 450000, 270000, 100000, 15,
                "Chợ nổi Cái Răng và bến Ninh Kiều",
                "Bữa sáng miền Tây và chiều bên bờ sông Hậu"));

        seeds.add(new TourSeed(
                "Bến Ninh Kiều và nhà cổ Bình Thủy",
                TourFormat.DAY_TRIP, 300, 1, 0, "taynam", "disan", "p1", true,
                "Bạn ghé nhà cổ Bình Thủy để xem kiến trúc Đông Dương và vườn cây cảnh nổi tiếng, sau "
                        + "đó đi bộ dọc bến Ninh Kiều trên sông Hậu. Tour phù hợp với khách thích "
                        + "kiến trúc cổ và bình yên.",
                List.of("Kiến trúc Đông Dương của nhà cổ Bình Thủy",
                        "Vườn cây cảnh và bộ đình đồng thờ Cần Thơ",
                        "Dạo bến Ninh Kiều ngắm sông Hậu",
                        "Trải nghiệm check-in tại hai điểm đến"),
                List.of("ninh-kieu", "binh-thuy"), 520000, 310000, 115000, 12,
                "Nhà cổ Bình Thủy và bến Ninh Kiều",
                "Kiến trúc cổ và bờ sông Cần Thơ"));

        seeds.add(new TourSeed(
                "Nhà cổ Bình Thủy và xưởng mì Cần Thơ",
                TourFormat.DAY_TRIP, 330, 1, 0, "taynam", "disan", "p1", true,
                "Nửa ngày ở Cần Thơ với hai điểm đến về nghề thủ công và kiến trúc: nhà cổ Bình Thủy "
                        + "với vườn cây cảnh và xưởng mì nơi bạn được thử làm mì cùng nghệ nhân.",
                List.of("Ngôi nhà cổ hơn 100 năm và vườn cây cảnh",
                        "Thử làm mì thủ công cùng nghệ nhân tại xưởng",
                        "Bộ đình đồng thờ Cần Thơ trong nhà cổ",
                        "Nếm bánh kẹo dừa miền Tây"),
                List.of("binh-thuy", "xuong-mi"), 600000, 360000, 135000, 12,
                "Nhà cổ Bình Thủy và xưởng mì",
                "Kiến trúc và nghề thủ công của Cần Thơ"));

        seeds.add(new TourSeed(
                "Xưởng mì Cần Thơ và bánh kẹo truyền thống",
                TourFormat.DAY_TRIP, 300, 1, 0, "taynam", "langnghe", "p1", false,
                "Bạn sẽ bước vào một xưởng mì gia đình để xem bánh mì được làm thủ công như thế nào — "
                        + "từ trộn bột, nắm khối, nén khuôn cho tới cắt bằng móc — và tự thử làm một "
                        + "phần. Tour khép lại bằng phần nếm bánh kẹo dừa đặc trưng của miền Tây.",
                List.of("Theo dõi trọn quy trình làm mì thủ công",
                        "Tự nắm và cắt bánh mì dưới tay nghệ nhân",
                        "Nếm bánh kẹo dừa và nghe chuyện nghề",
                        "Nhận bánh mì mang về"),
                List.of("xuong-mi", "cai-rang"), 580000, 350000, 130000, 12,
                "Xưởng mì và chợ nổi Cái Răng",
                "Một ngày theo nghề làm mì miền Tây"));

        seeds.add(new TourSeed(
                "Miền Tây sông nước: Cần Thơ và chợ nổi hai ngày một đêm",
                TourFormat.MULTI_DAY, 0, 2, 1, "taynam", "amthuc", "p1", true,
                "Hai ngày trải nghiệm miền Tây: sáng thứ nhất dậy sớm đi chợ nổi Cái Răng, trưa thăm "
                        + "nhà cổ Bình Thủy và xưởng mì, chiều ngồi bến Ninh Kiều. Ngày thứ hai tiếp tục "
                        + "khám phá bến sông và thưởng thức ẩm thực địa phương.",
                List.of("Chợ nổi Cái Răng lúc sáng sớm",
                        "Nhà cổ Bình Thủy và xưởng mì Cần Thơ",
                        "Bến Ninh Kiều ngắm sông Hậu chiều",
                        "Ăn uốn đặc sản miền Tây trong hai ngày"),
                List.of("cai-rang", "ninh-kieu", "binh-thuy", "xuong-mi"), 1350000, 810000, 300000, 15,
                "Cần Thơ hai ngày một đêm",
                "Hai ngày miền Tây sông nước"));

        seeds.add(new TourSeed(
                "Kinh nghiệm Cần Thơ: chợ nổi và bến Ninh Kiều",
                TourFormat.DAY_TRIP, 270, 1, 0, "taynam", "amthuc", "p1", false,
                "Tour ẩm thực trọn tâm về Cần Thơ: bạn đi chợ nổi lúc rạng sáng, thử đặc sản trên "
                        + "ghe hàng, rồi dành chiều ngồi bến Ninh Kiều thưởng thức mì Quảng và bánh "
                        + "kẹo miền Tây.",
                List.of("Chợ nổi lúc 5 giờ sáng",
                        "Nếm đặc sản trên ghe hàng",
                        "Chiều ngồi bến Ninh Kiều ngắm sông",
                        "Mua kẹo bảo và đặc sản về làm quà"),
                List.of("cai-rang", "ninh-kieu"), 490000, 290000, 110000, 18,
                "Chợ nổi và bến Ninh Kiều",
                "Một ngày ăn uống và ngắm cảnh miền Tây"));

        seeds.add(new TourSeed(
                "Ẩm thực Cần Thơ: bánh kẹo, xưởng mì và chợ nổi",
                TourFormat.DAY_TRIP, 330, 1, 0, "taynam", "amthuc", "p1", false,
                "Chuyến đi dành cho những người mê ẩm thực miền Tây: bánh kẹo dừa, kẹo bảo, mì tay "
                        + "và đặc sản chợ nổi. Bạn tham gia làm mì tại xưởng và ăn sáng tại chợ nổi.",
                List.of("Thử làm mì và nếm bánh mì khi còn nóng",
                        "Ăn sáng tại ghe hàng chợ nổi Cái Răng",
                        "Nếm kẹo bảo và bánh kẹo dừa",
                        "Mua đặc sản về làm quà"),
                List.of("xuong-mi", "cai-rang", "ninh-kieu"), 640000, 380000, 140000, 12,
                "Xưởng mì, chợ nổi và bến Ninh Kiều",
                "Một ngày nếm thử miền Tây"));

        return seeds;
    }
}
