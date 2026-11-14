package com.journeygo.modules.tour.importer;

import com.journeygo.common.exception.AppException;
import com.journeygo.modules.destination.repository.RegionRepository;
import com.journeygo.modules.destination.repository.ThemeRepository;
import com.journeygo.modules.tour.dto.wizard.TourValidationIssue;
import com.journeygo.modules.tour.dto.wizard.TourWizardRequests;
import com.journeygo.modules.tour.importer.dto.TourImportIssue;
import com.journeygo.modules.tour.importer.dto.TourImportResult;
import com.journeygo.modules.tour.service.TourDraftService;
import com.journeygo.modules.tour.service.TourSubmissionValidator;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.text.Collator;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;

import static com.journeygo.modules.tour.importer.TourImportLayout.*;

/**
 * Nhập tour từ file Excel: tải file mẫu → kiểm tra (chạy thử) → tạo bản nháp.
 *
 * <p>File được đổi thành đúng các request của luồng tạo tour 5 bước rồi gọi lại
 * {@link TourDraftService} — không có đường lưu riêng. Kết quả luôn là một bản nháp (DRAFT),
 * đối tác vẫn phải mở wizard kiểm tra và gửi duyệt như bình thường.
 *
 * <p>Kiểm tra gồm 3 lớp:
 * <ol>
 *   <li>Dạng dữ liệu theo từng ô ({@link TourExcelParser}) — lỗi chặn.</li>
 *   <li>Bean Validation trên các request (độ dài, miền giá trị) — lỗi chặn, đổi về đúng ô.</li>
 *   <li>Chạy thật trong transaction rồi rollback: bắt lỗi nghiệp vụ của service (lỗi chặn) và
 *       {@link TourSubmissionValidator} (cảnh báo: mục còn thiếu để gửi duyệt).</li>
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TourImportService {

    public static final long MAX_FILE_BYTES = 5L * 1024 * 1024;

    private final RegionRepository regionRepository;
    private final ThemeRepository themeRepository;
    private final TourDraftService draftService;
    private final Validator validator;
    private final PlatformTransactionManager transactionManager;

    // ── File mẫu ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public byte[] template(boolean sample) {
        Collator vi = Collator.getInstance(Locale.forLanguageTag("vi"));
        List<String> regions = regionRepository.findByDeletedFalse().stream()
                .map(r -> r.getName()).filter(Objects::nonNull).distinct().sorted(vi).toList();
        List<String> themes = themeRepository.findByDeletedFalse().stream()
                .map(t -> t.getName()).filter(Objects::nonNull).distinct().sorted(vi).toList();
        return new TourImportTemplateBuilder(regions, themes, sample, today()).build();
    }

    // ── Kiểm tra / nhập ─────────────────────────────────────────────────────

    /** Chạy thử: không lưu gì, trả về lỗi + cảnh báo + tóm tắt. */
    public TourImportResult preview(MultipartFile file, Long userId) {
        return run(file, userId, false);
    }

    /** Tạo bản nháp từ file. {@code valid = false} = không lưu gì. */
    public TourImportResult importTour(MultipartFile file, Long userId) {
        return run(file, userId, true);
    }

    private TourImportResult run(MultipartFile file, Long userId, boolean commit) {
        String fileError = checkFile(file);
        if (fileError != null) return invalid(null, List.of(TourImportIssue.general(fileError)), List.of());

        TourExcelParser.Result parsed;
        try (InputStream in = file.getInputStream(); XSSFWorkbook workbook = new XSSFWorkbook(in)) {
            parsed = new TourExcelParser(nameIndex(regionRepository.findByDeletedFalse(), r -> r.getName(), r -> r.getId()),
                    nameIndex(themeRepository.findByDeletedFalse(), t -> t.getName(), t -> t.getId()),
                    today()).parse(workbook);
        } catch (IOException | RuntimeException e) {
            log.warn("[TourImport] user={} không đọc được file {}: {}", userId, file.getOriginalFilename(), e.toString());
            return invalid(null, List.of(TourImportIssue.general(
                    "Không đọc được file. Hãy dùng file .xlsx tải từ nút \"Tải file mẫu\" (không đặt mật khẩu).")), List.of());
        }
        if (parsed.basicInfo == null) return invalid(null, parsed.errors, parsed.warnings);

        List<TourImportIssue> errors = new ArrayList<>(parsed.errors);
        validateBean(parsed.basicInfo, "basic.", parsed, errors);
        validateBean(parsed.pricing, "pricing.", parsed, errors);
        validateBean(parsed.stops, "stops.", parsed, errors);
        validateBean(parsed.schedule, "schedule.", parsed, errors);
        TourImportResult.Summary summary = parsed.summary();
        if (!errors.isEmpty()) return invalid(summary, errors, parsed.warnings);

        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        return tx.execute(status -> {
            try {
                Long tourId = draftService.create(new TourWizardRequests.CreateDraft(parsed.title), userId).tourId();
                draftService.updateBasicInfo(tourId, parsed.basicInfo, userId);
                draftService.updatePricing(tourId, parsed.pricing, userId);
                draftService.updateStops(tourId, parsed.stops, userId);
                draftService.updateSchedule(tourId, parsed.schedule, userId);

                List<TourImportIssue> warnings = new ArrayList<>(parsed.warnings);
                for (TourValidationIssue issue : draftService.validate(tourId, userId)) {
                    if ("REVIEW".equals(issue.step())) continue; // ô cam kết: tích lúc gửi duyệt
                    warnings.add(toWarning(issue, parsed));
                }
                if (commit) {
                    log.info("[TourImport] user={} tạo bản nháp tour={} từ file {}", userId, tourId,
                            file.getOriginalFilename());
                } else {
                    status.setRollbackOnly();
                }
                return new TourImportResult(true, commit ? tourId : null, summary, List.of(), warnings);
            } catch (AppException e) {
                // Lỗi nghiệp vụ (chưa được duyệt làm đối tác, khu vực vừa bị xóa…): không lưu gì.
                status.setRollbackOnly();
                return invalid(summary, List.of(TourImportIssue.general(e.getMessage())), parsed.warnings);
            }
        });
    }

    private static String checkFile(MultipartFile file) {
        if (file == null || file.isEmpty()) return "Vui lòng chọn file Excel cần nhập";
        if (file.getSize() > MAX_FILE_BYTES) return "File quá lớn: tối đa 5MB";
        String name = file.getOriginalFilename();
        if (name == null || !name.toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
            return "Chỉ nhận file Excel định dạng .xlsx (tải từ nút \"Tải file mẫu\")";
        }
        return null;
    }

    // ── Bean Validation → ô Excel ───────────────────────────────────────────

    private void validateBean(Object request, String prefix, TourExcelParser.Result parsed, List<TourImportIssue> errors) {
        Set<TourImportIssue> unique = new LinkedHashSet<>();
        for (ConstraintViolation<Object> violation : validator.validate(request)) {
            String path = prefix + violation.getPropertyPath().toString().replaceAll("\\.<[^>]+>", "");
            unique.add(parsed.locator.issue(path, null, friendlyMessage(violation)));
        }
        List<TourImportIssue> sorted = new ArrayList<>(unique);
        sorted.sort(Comparator.comparing((TourImportIssue i) -> String.valueOf(i.sheet()))
                .thenComparing(i -> i.row() == null ? 0 : i.row()));
        errors.addAll(sorted);
    }

    /** Thông báo tiếng Việt; constraint không có message riêng thì tự viết theo tham số. */
    static String friendlyMessage(ConstraintViolation<?> violation) {
        if (!violation.getMessageTemplate().startsWith("{")) return violation.getMessage();
        return switch (violation.getConstraintDescriptor().getAnnotation()) {
            case Size s -> violation.getInvalidValue() instanceof CharSequence
                    ? "Tối đa " + s.max() + " ký tự"
                    : "Tối đa " + s.max() + " mục";
            case Max m -> "Giá trị tối đa là " + m.value();
            case Min m -> "Giá trị tối thiểu là " + m.value();
            case DecimalMax d -> "Giá trị tối đa là " + d.value();
            case DecimalMin d -> "Giá trị tối thiểu là " + d.value();
            case Digits d -> "Số quá lớn (tối đa " + d.integer() + " chữ số, " + d.fraction() + " chữ số thập phân)";
            case NotNull n -> "Không được để trống";
            default -> violation.getMessage();
        };
    }

    // ── Cảnh báo gửi duyệt → ô Excel ────────────────────────────────────────

    private static TourImportIssue toWarning(TourValidationIssue issue, TourExcelParser.Result parsed) {
        String field = issue.field() == null ? "" : issue.field();
        return switch (issue.step()) {
            case "BASIC_INFO" -> parsed.locator.issue("basic." + field, SHEET_GENERAL, issue.message());
            case "PRICING" -> parsed.locator.issue("pricing." + field, SHEET_PRICES, issue.message());
            case "STOPS" -> parsed.locator.issue(issue.stopIndex() == null
                    ? "stops." + field
                    : "stops.stops[" + issue.stopIndex() + "]." + field, SHEET_STOPS, issue.message());
            case "SCHEDULE" -> parsed.locator.issue("schedule." + field, SHEET_DATES, issue.message());
            default -> TourImportIssue.general(issue.message());
        };
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private static <T> Map<String, Long> nameIndex(List<T> items, Function<T, String> name, Function<T, Long> id) {
        Map<String, Long> index = new HashMap<>();
        for (T item : items) {
            String n = name.apply(item);
            if (n != null && !n.isBlank()) index.putIfAbsent(normalize(n), id.apply(item));
        }
        return index;
    }

    private static TourImportResult invalid(TourImportResult.Summary summary, List<TourImportIssue> errors,
                                            List<TourImportIssue> warnings) {
        return new TourImportResult(false, null, summary, List.copyOf(errors), List.copyOf(warnings));
    }

    private static LocalDate today() {
        return LocalDate.now(TourSubmissionValidator.ZONE);
    }
}
