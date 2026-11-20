package com.journeygo.config;

import com.journeygo.modules.destination.entity.Region;
import com.journeygo.modules.destination.entity.Theme;
import com.journeygo.modules.destination.repository.RegionRepository;
import com.journeygo.modules.destination.repository.ThemeRepository;
import com.journeygo.modules.experience.entity.PointRule;
import com.journeygo.modules.experience.entity.TaskType;
import com.journeygo.modules.experience.entity.enums.VerificationMethod;
import com.journeygo.modules.experience.repository.PointRuleRepository;
import com.journeygo.modules.experience.repository.TaskTypeRepository;
import com.journeygo.modules.finance.entity.CommissionPolicy;
import com.journeygo.modules.finance.repository.CommissionPolicyRepository;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Khởi tạo <b>dữ liệu nền tảng cố định</b> của JourneyGo.
 *
 * <p><b>Nguyên tắc:</b> file này CHỈ chứa dữ liệu có tính chất cố định, do Developer
 * định nghĩa trước và <b>phải tồn tại trên mọi môi trường</b> (dev / staging / prod).
 * Mỗi lần Backend khởi động, runner này tự động bổ sung những dữ liệu còn thiếu —
 * thao tác idempotent, không ghi đè dữ liệu Admin đã tự chỉnh.
 *
 * <p>Nội dung:
 * <ol>
 *   <li><b>Role hệ thống</b> — {@code ADMIN}, {@code CONTENT_MODERATOR},
 *       {@code CONTENT_PROVIDER}, {@code TOURIST}. Mọi môi trường đều cần.</li>
 *   <li><b>TaskType + PointRule</b> — 2 loại task duy nhất của nền tảng
 *       ({@code QUIZ}, {@code REAL_WORLD_INTERACTIVE}) kèm bảng điểm thưởng mặc định.</li>
 *   <li><b>Phân loại vùng miền</b> — Khu vực (Region) & Chủ đề (Theme): danh mục cố định
 *       mà mọi tour đều cần để gán.</li>
 *   <li><b>Chính sách hoa hồng mặc định</b> — 20% cho đối tác mới.</li>
 * </ol>
 *
 * <p><b>KHÔNG có ở đây:</b> tài khoản demo/Admin, tour, booking, payment, refund, doanh thu,
 * đợt tất toán… Tất cả dữ liệu demo nằm ở {@code src/main/resources/seed/*.sql} và được
 * chạy <b>thủ công</b> bằng {@link com.journeygo.config.seeder.SeedRunner}
 * ({@code SEED_ENABLED=true} hoặc {@code docker compose run --rm backend-seed}).
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataInitializer {

    private final RoleRepository roleRepository;
    private final TaskTypeRepository taskTypeRepository;
    private final PointRuleRepository pointRuleRepository;
    private final RegionRepository regionRepository;
    private final ThemeRepository themeRepository;
    private final CommissionPolicyRepository commissionPolicyRepository;

    /**
     * Bước 1 — Dữ liệu nền tảng cố định.
     *
     * <p>Chạy tự động khi Backend khởi động. Idempotent: chỉ tạo những bản ghi còn thiếu.
     */
    @Bean
    @org.springframework.core.annotation.Order(1)
    public CommandLineRunner initBaselineData() {
        return args -> {
            ensureRoles();
            ensureTaskTypesAndPointRules();
            ensureCatalogTaxonomy();
            ensureDefaultCommissionPolicy();

            log.info("Khởi tạo dữ liệu nền tảng hoàn tất — {} role, {} task type, {} khu vực, {} chủ đề.",
                    roleRepository.count(), taskTypeRepository.count(),
                    regionRepository.count(), themeRepository.count());
        };
    }

    // ── Role hệ thống ─────────────────────────────────────────────────────────

    /** Bảo đảm đủ 4 role cốt lõi của nền tảng. */
    private void ensureRoles() {
        ensureRole(Role.ADMIN, "Quản trị viên");
        ensureRole(Role.CONTENT_MODERATOR, "Kiểm duyệt viên");
        ensureRole(Role.CONTENT_PROVIDER, "Đối tác cung cấp nội dung và trải nghiệm");
        ensureRole(Role.TOURIST, "Khách du lịch");
    }

    private void ensureRole(String name, String description) {
        if (roleRepository.findByName(name).isEmpty()) {
            roleRepository.save(new Role(name, description));
            log.info("Đã tạo role: {}", name);
        }
    }

    // ── TaskType + PointRule ──────────────────────────────────────────────────

    /**
     * Đồng bộ về đúng 2 loại TaskType của nền tảng:
     * <ul>
     *   <li>{@code QUIZ} — câu hỏi trắc nghiệm / text 4 phương án.</li>
     *   <li>{@code REAL_WORLD_INTERACTIVE} — câu hỏi tương tác ngoài thực tế (GPS check-in).</li>
     * </ul>
     *
     * <p>Logic: LUÔN đồng bộ — xoá các TaskType cũ không dùng và tạo lại bảng điểm thưởng
     * mặc định cho 2 loại trên.
     */
    private void ensureTaskTypesAndPointRules() {
        List<String> desiredCodes = List.of("QUIZ", "REAL_WORLD_INTERACTIVE");
        List<String> legacyCodes = List.of("FIELD_CLUE", "LOCATION_VISIT", "QR_CHECKPOINT", "PHOTO_CHALLENGE");

        // 1. Xoá các TaskType cũ không dùng (kèm PointRule của chúng).
        for (String code : legacyCodes) {
            taskTypeRepository.findAll().stream()
                    .filter(tt -> code.equals(tt.getCode()))
                    .findFirst()
                    .ifPresent(tt -> {
                        try {
                            pointRuleRepository.findAll().stream()
                                    .filter(pr -> pr.getTaskType() != null && code.equals(pr.getTaskType().getCode()))
                                    .forEach(pr -> pointRuleRepository.deleteById(pr.getId()));
                            taskTypeRepository.deleteById(tt.getId());
                            log.info("Đã xoá legacy TaskType: {}", code);
                        } catch (Exception e) {
                            log.warn("Không thể xoá TaskType {} (có Task đang dùng): {}", code, e.getMessage());
                        }
                    });
        }

        // 2. Bảo đảm 2 TaskType mới tồn tại.
        for (String code : desiredCodes) {
            TaskType existing = taskTypeRepository.findAll().stream()
                    .filter(tt -> code.equals(tt.getCode()))
                    .findFirst().orElse(null);
            if (existing != null) {
                continue;
            }
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

        // 3. Bảo đảm PointRule cho 2 TaskType mới.
        for (String code : desiredCodes) {
            TaskType tt = taskTypeRepository.findAll().stream()
                    .filter(t -> code.equals(t.getCode()))
                    .findFirst().orElse(null);
            if (tt == null) {
                continue;
            }
            // Fetch id một lần để tránh LazyInitializationException.
            long taskTypeId = tt.getId();

            boolean hasRule = pointRuleRepository.findAll().stream()
                    .anyMatch(pr -> pr.getTaskType() != null && taskTypeId == pr.getTaskType().getId());
            if (hasRule) {
                continue;
            }
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
                default -> {
                    // Không có TaskType nào khác — bỏ qua.
                }
            }
            log.info("Đã tạo PointRule cho TaskType: {}", code);
        }
    }

    // ── Khu vực & Chủ đề ──────────────────────────────────────────────────────

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

    private void ensureRegion(String slug, String name) {
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
    }

    private void ensureTheme(String slug, String name) {
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
    }

    // ── Chính sách hoa hồng ───────────────────────────────────────────────────

    /** Chính sách hoa hồng mặc định (20%) — áp dụng cho đối tác mới. */
    private void ensureDefaultCommissionPolicy() {
        if (commissionPolicyRepository.count() > 0) {
            return;
        }
        commissionPolicyRepository.save(CommissionPolicy.builder()
                .name("Chính sách hoa hồng mặc định")
                .commissionRate(new BigDecimal("0.2000"))
                .effectiveFrom(Instant.now())
                .effectiveTo(null)
                .changeReason("Khởi tạo chính sách hoa hồng mặc định của nền tảng")
                .cancelled(false)
                .build());
        log.info("Đã khởi tạo chính sách hoa hồng mặc định 20%");
    }
}
