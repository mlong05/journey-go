package com.journeygo.modules.tour.importer;

import com.journeygo.modules.tour.dto.wizard.TourWizardRequests;
import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.TourFormat;
import com.journeygo.modules.tour.entity.VideoSource;
import com.journeygo.modules.tour.importer.TourImportLayout.Field;
import com.journeygo.modules.tour.importer.dto.TourImportIssue;
import com.journeygo.modules.tour.importer.dto.TourImportResult;
import com.journeygo.modules.tour.service.TourSubmissionValidator;
import org.apache.poi.ss.usermodel.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

import static com.journeygo.modules.tour.importer.TourImportLayout.*;

/**
 * Đọc workbook theo {@link TourImportLayout} và dựng các request của luồng tạo tour 5 bước.
 *
 * <p>Chỉ báo lỗi về <b>dạng dữ liệu</b> (ô phải là số / ngày, giá trị phải nằm trong danh sách,
 * mã điểm đến không tồn tại…). Giới hạn độ dài / miền giá trị do Bean Validation trên các request
 * kiểm tra sau; điều kiện đầy đủ để gửi duyệt do {@link TourSubmissionValidator} báo thành cảnh báo.
 */
final class TourExcelParser {

    private static final DateTimeFormatter DMY = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    /** STRICT: 31/02 là lỗi, không tự lùi về 28/02. */
    private static final List<DateTimeFormatter> DATE_FORMATS = java.util.stream.Stream.of("d/M/uuuu", "d-M-uuuu", "d.M.uuuu", "uuuu-M-d")
            .map(p -> DateTimeFormatter.ofPattern(p).withResolverStyle(java.time.format.ResolverStyle.STRICT))
            .toList();
    /** Sheet "Thông tin chung" chỉ có vài chục dòng — không đọc quá mức này. */
    private static final int GENERAL_MAX_ROWS = 200;

    /** Kết quả đọc file. */
    static final class Result {
        String title;
        TourWizardRequests.BasicInfo basicInfo;
        TourWizardRequests.Pricing pricing;
        TourWizardRequests.Stops stops;
        TourWizardRequests.Schedule schedule;
        final CellLocator locator = new CellLocator();
        final List<TourImportIssue> errors = new ArrayList<>();
        final List<TourImportIssue> warnings = new ArrayList<>();

        TourImportResult.Summary summary() {
            if (basicInfo == null) return null;
            List<TourWizardRequests.StopItem> stopItems = stops == null ? List.of() : stops.stops();
            return new TourImportResult.Summary(
                    title,
                    basicInfo.tourFormat() == null ? null : basicInfo.tourFormat().name(),
                    size(basicInfo.images()),
                    size(basicInfo.highlights()),
                    pricing == null ? 0 : size(pricing.prices()),
                    size(basicInfo.itinerary()),
                    stopItems.size(),
                    stopItems.stream().mapToInt(s -> size(s.quiz())).sum(),
                    stopItems.stream().mapToInt(s -> size(s.experiences())).sum(),
                    stopItems.stream().mapToInt(s -> size(s.artifacts())).sum(),
                    schedule == null ? 0 : size(schedule.departureDates()));
        }

        private static int size(List<?> list) {
            return list == null ? 0 : list.size();
        }
    }

    /** Điểm đến đang dựng — gom quiz / trải nghiệm / cổ vật theo mã. */
    private static final class StopDraft {
        final int index;
        final String name, shortDescription, guestNote, imageUrl, videoUrl, culturalContent;
        final List<TourWizardRequests.QuestionItem> quiz = new ArrayList<>();
        final List<TourWizardRequests.ExperienceItem> experiences = new ArrayList<>();
        final List<TourWizardRequests.ArtifactItem> artifacts = new ArrayList<>();

        StopDraft(int index, String name, String shortDescription, String guestNote, String imageUrl,
                  String videoUrl, String culturalContent) {
            this.index = index;
            this.name = name;
            this.shortDescription = shortDescription;
            this.guestNote = guestNote;
            this.imageUrl = imageUrl;
            this.videoUrl = videoUrl;
            this.culturalContent = culturalContent;
        }

        TourWizardRequests.StopItem toItem() {
            return new TourWizardRequests.StopItem(null, name, shortDescription, guestNote, imageUrl,
                    videoUrl, videoSourceOf(videoUrl), culturalContent, List.of(),
                    List.copyOf(artifacts), List.copyOf(quiz), List.copyOf(experiences));
        }
    }

    private final Map<String, Long> regionIds;
    private final Map<String, Long> themeIds;
    private final LocalDate today;
    private final Result result = new Result();

    /**
     * @param regionIds tên khu vực đã {@link TourImportLayout#normalize chuẩn hóa} → id
     * @param themeIds  tên chủ đề đã chuẩn hóa → id
     */
    TourExcelParser(Map<String, Long> regionIds, Map<String, Long> themeIds, LocalDate today) {
        this.regionIds = regionIds;
        this.themeIds = themeIds;
        this.today = today;
    }

    Result parse(Workbook workbook) {
        Sheet general = workbook.getSheet(SHEET_GENERAL);
        if (general == null) {
            result.errors.add(TourImportIssue.general("File không đúng mẫu: thiếu sheet \"" + SHEET_GENERAL
                    + "\". Hãy tải file mẫu mới nhất và điền lại."));
            return result;
        }
        Map<Field, Integer> fieldRows = readFieldRows(general);
        TourFormat format = readFormat(general, fieldRows);

        List<String> images = new ArrayList<>();
        String cover = readImages(workbook.getSheet(SHEET_IMAGES), images);
        List<TourWizardRequests.ItineraryDayItem> itinerary =
                readItinerary(workbook.getSheet(SHEET_ITINERARY), format);

        result.title = readText(general, fieldRows, Field.TITLE, "basic.title");
        if (result.title != null) {
            String titleError = TourSubmissionValidator.titleError(result.title);
            if (titleError != null) fieldError(fieldRows, Field.TITLE, titleError);
        }

        Integer durationMinutes = null, durationDays = null, durationNights = null;
        if (format == TourFormat.DAY_TRIP) {
            durationMinutes = readDayTripMinutes(general, fieldRows);
        } else if (format == TourFormat.MULTI_DAY) {
            durationDays = readInteger(general, fieldRows, Field.DAYS, "basic.durationDays");
            durationNights = readInteger(general, fieldRows, Field.NIGHTS, "basic.durationNights");
            if (durationDays != null && durationNights != null && durationNights > durationDays) {
                fieldError(fieldRows, Field.NIGHTS, "Số đêm không được lớn hơn số ngày");
            }
        }

        result.basicInfo = new TourWizardRequests.BasicInfo(
                result.title,
                format,
                durationMinutes,
                durationDays,
                durationNights,
                readCatalog(general, fieldRows, Field.REGION, "basic.regionId", regionIds, "Khu vực"),
                readCatalog(general, fieldRows, Field.THEME, "basic.themeId", themeIds, "Chủ đề"),
                readText(general, fieldRows, Field.DESCRIPTION, "basic.description"),
                readHighlights(general, fieldRows),
                images,
                cover,
                itinerary,
                readText(general, fieldRows, Field.PRICE_INCLUDES, "basic.priceIncludes"),
                readText(general, fieldRows, Field.PRICE_EXCLUDES, "basic.priceExcludes"),
                readText(general, fieldRows, Field.FORCE_MAJEURE, "basic.forceMajeure"),
                readText(general, fieldRows, Field.REFUND_POLICY, "basic.refundPolicy"),
                readText(general, fieldRows, Field.CONTACT, "basic.contactInfo"));

        result.pricing = new TourWizardRequests.Pricing(
                readPrices(workbook.getSheet(SHEET_PRICES)),
                readInteger(general, fieldRows, Field.MAX_GUESTS, "pricing.maxGuestsPerSlot"),
                readText(general, fieldRows, Field.CANCELLATION, "pricing.cancellationPolicy"));

        result.stops = new TourWizardRequests.Stops(readStops(workbook));
        result.schedule = new TourWizardRequests.Schedule(readDates(workbook.getSheet(SHEET_DATES)));
        return result;
    }

    // ── Thông tin chung ─────────────────────────────────────────────────────

    private Map<Field, Integer> readFieldRows(Sheet sheet) {
        Map<Field, Integer> rows = new EnumMap<>(Field.class);
        int last = Math.min(sheet.getLastRowNum(), GENERAL_MAX_ROWS);
        for (int r = 0; r <= last; r++) {
            Row row = sheet.getRow(r);
            Field field = row == null ? null : Field.byLabel(cellText(row.getCell(0)));
            if (field != null) rows.putIfAbsent(field, r);
        }
        if (rows.isEmpty()) {
            result.errors.add(TourImportIssue.general("Sheet \"" + SHEET_GENERAL
                    + "\" không đúng mẫu: không tìm thấy trường nào ở cột A (Tên tour, Hình thức…)."));
        }
        return rows;
    }

    private Cell valueCell(Sheet sheet, Map<Field, Integer> rows, Field field) {
        Integer r = rows.get(field);
        if (r == null) return null;
        Row row = sheet.getRow(r);
        return row == null ? null : row.getCell(1);
    }

    private void locate(Map<Field, Integer> rows, Field field, String path) {
        result.locator.put(path, SHEET_GENERAL, rows.get(field), field.label);
    }

    private void fieldError(Map<Field, Integer> rows, Field field, String message) {
        result.errors.add(issue(SHEET_GENERAL, rows.get(field), field.label, message));
    }

    private String readText(Sheet sheet, Map<Field, Integer> rows, Field field, String path) {
        locate(rows, field, path);
        return cellText(valueCell(sheet, rows, field));
    }

    private Integer readInteger(Sheet sheet, Map<Field, Integer> rows, Field field, String path) {
        locate(rows, field, path);
        return toInteger(valueCell(sheet, rows, field), SHEET_GENERAL, rows.get(field), field.label);
    }

    private TourFormat readFormat(Sheet sheet, Map<Field, Integer> rows) {
        locate(rows, Field.FORMAT, "basic.tourFormat");
        String value = cellText(valueCell(sheet, rows, Field.FORMAT));
        if (value != null) {
            String key = normalize(value);
            if (key.equals(normalize(FORMAT_DAY_TRIP)) || key.equals("day_trip")) return TourFormat.DAY_TRIP;
            if (key.equals(normalize(FORMAT_MULTI_DAY)) || key.equals("multi_day")) return TourFormat.MULTI_DAY;
            fieldError(rows, Field.FORMAT, "Hình thức phải là \"" + FORMAT_DAY_TRIP + "\" hoặc \"" + FORMAT_MULTI_DAY + "\"");
            return null;
        }
        // Không chọn hình thức: có nhập số ngày / số đêm thì hiểu là tour nhiều ngày.
        boolean hasDays = cellText(valueCell(sheet, rows, Field.DAYS)) != null
                || cellText(valueCell(sheet, rows, Field.NIGHTS)) != null;
        return hasDays ? TourFormat.MULTI_DAY : TourFormat.DAY_TRIP;
    }

    private Integer readDayTripMinutes(Sheet sheet, Map<Field, Integer> rows) {
        locate(rows, Field.DURATION_HOURS, "basic.durationMinutes");
        BigDecimal hours = toNumber(valueCell(sheet, rows, Field.DURATION_HOURS), false,
                SHEET_GENERAL, rows.get(Field.DURATION_HOURS), Field.DURATION_HOURS.label);
        Integer minutes = toInteger(valueCell(sheet, rows, Field.DURATION_MINUTES),
                SHEET_GENERAL, rows.get(Field.DURATION_MINUTES), Field.DURATION_MINUTES.label);
        if (hours == null && minutes == null) return null;
        if ((hours != null && hours.signum() < 0) || (minutes != null && minutes < 0)) {
            fieldError(rows, Field.DURATION_HOURS, "Thời lượng không được âm");
            return null;
        }
        BigDecimal total = (hours == null ? BigDecimal.ZERO : hours.multiply(BigDecimal.valueOf(60)))
                .add(BigDecimal.valueOf(minutes == null ? 0 : minutes))
                .setScale(0, RoundingMode.HALF_UP);
        if (total.compareTo(BigDecimal.valueOf(Integer.MAX_VALUE)) > 0) {
            fieldError(rows, Field.DURATION_HOURS, "Thời lượng quá lớn");
            return null;
        }
        return total.intValue();
    }

    private Long readCatalog(Sheet sheet, Map<Field, Integer> rows, Field field, String path,
                             Map<String, Long> ids, String label) {
        locate(rows, field, path);
        String value = cellText(valueCell(sheet, rows, field));
        if (value == null) return null;
        Long id = ids.get(normalize(value));
        if (id == null) {
            fieldError(rows, field, label + " \"" + value + "\" không có trong hệ thống — hãy chọn từ danh sách thả xuống");
        }
        return id;
    }

    private List<String> readHighlights(Sheet sheet, Map<Field, Integer> rows) {
        Field[] fields = {Field.HIGHLIGHT_1, Field.HIGHLIGHT_2, Field.HIGHLIGHT_3, Field.HIGHLIGHT_4, Field.HIGHLIGHT_5};
        locate(rows, Field.HIGHLIGHT_1, "basic.highlights");
        List<String> highlights = new ArrayList<>();
        for (Field field : fields) {
            String value = cellText(valueCell(sheet, rows, field));
            if (value == null) continue;
            locate(rows, field, "basic.highlights[" + highlights.size() + "]");
            highlights.add(value);
        }
        return highlights;
    }

    // ── Ảnh tour ────────────────────────────────────────────────────────────

    /** @return ảnh bìa (ô "Có" đầu tiên; không đánh dấu thì lấy ảnh đầu tiên) */
    private String readImages(Sheet sheet, List<String> images) {
        result.locator.put("basic.images", SHEET_IMAGES, null, IMAGE_COLUMNS[0]);
        result.locator.put("basic.coverImageUrl", SHEET_IMAGES, null, IMAGE_COLUMNS[1]);
        String[] cover = {null};
        eachDataRow(sheet, SHEET_IMAGES, IMAGE_COLUMNS, (row, r) -> {
            String url = cellText(row.getCell(0));
            Boolean isCover = toYesNo(row.getCell(1), SHEET_IMAGES, r, IMAGE_COLUMNS[1]);
            if (url == null) {
                result.errors.add(issue(SHEET_IMAGES, r, IMAGE_COLUMNS[0], "Thiếu đường dẫn ảnh"));
                return;
            }
            result.locator.put("basic.images[" + images.size() + "]", SHEET_IMAGES, r, IMAGE_COLUMNS[0]);
            images.add(url);
            if (Boolean.TRUE.equals(isCover)) {
                if (cover[0] != null) {
                    result.errors.add(issue(SHEET_IMAGES, r, IMAGE_COLUMNS[1], "Chỉ chọn 1 ảnh làm ảnh bìa"));
                } else {
                    cover[0] = url;
                    result.locator.put("basic.coverImageUrl", SHEET_IMAGES, r, IMAGE_COLUMNS[1]);
                }
            }
        });
        return cover[0] != null ? cover[0] : (images.isEmpty() ? null : images.get(0));
    }

    // ── Giá vé ──────────────────────────────────────────────────────────────

    private List<TourWizardRequests.PriceItem> readPrices(Sheet sheet) {
        result.locator.put("pricing.prices", SHEET_PRICES, null, null);
        result.locator.put("pricing.prices.countsTowardSlot", SHEET_PRICES, null, PRICE_COLUMNS[2]);
        List<TourWizardRequests.PriceItem> prices = new ArrayList<>();
        Set<GuestType> seen = EnumSet.noneOf(GuestType.class);
        eachDataRow(sheet, SHEET_PRICES, PRICE_COLUMNS, (row, r) -> {
            String label = cellText(row.getCell(0));
            GuestType type = guestTypeByLabel(label);
            if (type == null) {
                result.errors.add(issue(SHEET_PRICES, r, PRICE_COLUMNS[0], label == null
                        ? "Thiếu loại khách"
                        : "Loại khách \"" + label + "\" không hợp lệ — chọn Người lớn / Trẻ em / Trẻ nhỏ / Em bé"));
                return;
            }
            if (!seen.add(type)) {
                result.errors.add(issue(SHEET_PRICES, r, PRICE_COLUMNS[0], "Loại khách \"" + type.getLabel() + "\" bị trùng"));
                return;
            }
            BigDecimal price = toNumber(row.getCell(1), true, SHEET_PRICES, r, PRICE_COLUMNS[1]);
            if (type.isAlwaysFree()) price = BigDecimal.ZERO;
            Boolean counts = toYesNo(row.getCell(2), SHEET_PRICES, r, PRICE_COLUMNS[2]);
            int i = prices.size();
            result.locator.put("pricing.prices[" + i + "]", SHEET_PRICES, r, null);
            result.locator.put("pricing.prices[" + i + "].price", SHEET_PRICES, r, PRICE_COLUMNS[1]);
            result.locator.put("pricing.prices." + type.name(), SHEET_PRICES, r, PRICE_COLUMNS[1]);
            prices.add(new TourWizardRequests.PriceItem(type, price, Boolean.TRUE.equals(counts)));
        });
        return prices;
    }

    // ── Lịch trình ──────────────────────────────────────────────────────────

    private List<TourWizardRequests.ItineraryDayItem> readItinerary(Sheet sheet, TourFormat format) {
        List<TourWizardRequests.ItineraryDayItem> days = new ArrayList<>();
        eachDataRow(sheet, SHEET_ITINERARY, ITINERARY_COLUMNS, (row, r) -> {
            int expected = days.size() + 1;
            Integer day = toInteger(row.getCell(0), SHEET_ITINERARY, r, ITINERARY_COLUMNS[0]);
            if (day != null && day != expected) {
                result.errors.add(issue(SHEET_ITINERARY, r, ITINERARY_COLUMNS[0],
                        "Các ngày phải theo thứ tự 1, 2, 3… — dòng này phải là ngày " + expected));
            }
            String path = "basic.itinerary[" + days.size() + "]";
            result.locator.put(path, SHEET_ITINERARY, r, null);
            result.locator.put(path + ".title", SHEET_ITINERARY, r, ITINERARY_COLUMNS[1]);
            result.locator.put(path + ".mainActivity", SHEET_ITINERARY, r, ITINERARY_COLUMNS[2]);
            result.locator.put(path + ".content", SHEET_ITINERARY, r, ITINERARY_COLUMNS[3]);
            days.add(new TourWizardRequests.ItineraryDayItem(
                    cellText(row.getCell(1)), cellText(row.getCell(2)), cellText(row.getCell(3))));
        });
        if (format == TourFormat.DAY_TRIP && days.size() > 1) {
            result.warnings.add(new TourImportIssue(SHEET_ITINERARY, null, null,
                    "Tour trong ngày chỉ dùng 1 mục lịch trình — " + (days.size() - 1) + " dòng sau sẽ bị bỏ qua"));
        }
        return days;
    }

    // ── Điểm đến + quiz / trải nghiệm / cổ vật ─────────────────────────────

    private List<TourWizardRequests.StopItem> readStops(Workbook workbook) {
        result.locator.put("stops.stops", SHEET_STOPS, null, null);
        Map<String, StopDraft> byCode = new LinkedHashMap<>();
        eachDataRow(workbook.getSheet(SHEET_STOPS), SHEET_STOPS, STOP_COLUMNS, (row, r) -> {
            String code = cellText(row.getCell(0));
            if (code == null) {
                result.errors.add(issue(SHEET_STOPS, r, STOP_COLUMNS[0], "Thiếu mã điểm đến (ví dụ D1, D2…)"));
                return;
            }
            String key = normalize(code);
            if (byCode.containsKey(key)) {
                result.errors.add(issue(SHEET_STOPS, r, STOP_COLUMNS[0], "Mã điểm đến \"" + code + "\" bị trùng"));
                return;
            }
            int i = byCode.size();
            String path = "stops.stops[" + i + "]";
            result.locator.put(path, SHEET_STOPS, r, null);
            String[] fields = {null, "name", "shortDescription", "guestNote", "imageUrl", "videoUrl", "culturalContent"};
            for (int c = 1; c < fields.length; c++) {
                result.locator.put(path + "." + fields[c], SHEET_STOPS, r, STOP_COLUMNS[c]);
            }
            result.locator.put(path + ".videoSource", SHEET_STOPS, r, STOP_COLUMNS[5]);
            byCode.put(key, new StopDraft(i, cellText(row.getCell(1)), cellText(row.getCell(2)),
                    cellText(row.getCell(3)), cellText(row.getCell(4)), cellText(row.getCell(5)),
                    cellText(row.getCell(6))));
        });

        eachDataRow(workbook.getSheet(SHEET_QUIZ), SHEET_QUIZ, QUIZ_COLUMNS, (row, r) -> {
            StopDraft stop = stopOf(byCode, row, r, SHEET_QUIZ);
            if (stop == null) return;
            String path = "stops.stops[" + stop.index + "].quiz[" + stop.quiz.size() + "]";
            result.locator.put(path, SHEET_QUIZ, r, null);
            result.locator.put(path + ".content", SHEET_QUIZ, r, QUIZ_COLUMNS[1]);
            result.locator.put(path + ".answers", SHEET_QUIZ, r, QUIZ_COLUMNS[6]);

            String correct = cellText(row.getCell(6));
            int correctIndex = -1;
            if (correct != null) {
                correctIndex = ANSWER_LETTERS.indexOf(correct.trim().toUpperCase(Locale.ROOT));
                if (correctIndex < 0) {
                    result.errors.add(issue(SHEET_QUIZ, r, QUIZ_COLUMNS[6], "Đáp án đúng phải là A, B, C hoặc D"));
                }
            }
            List<TourWizardRequests.AnswerItem> answers = new ArrayList<>();
            boolean anyAnswer = false;
            for (int k = 0; k < 4; k++) {
                String content = cellText(row.getCell(2 + k));
                anyAnswer |= content != null;
                result.locator.put(path + ".answers[" + k + "]", SHEET_QUIZ, r, QUIZ_COLUMNS[2 + k]);
                answers.add(new TourWizardRequests.AnswerItem(content, k == correctIndex));
            }
            stop.quiz.add(new TourWizardRequests.QuestionItem(null, cellText(row.getCell(1)),
                    anyAnswer || correctIndex >= 0 ? answers : List.of(), null));
        });

        eachDataRow(workbook.getSheet(SHEET_EXPERIENCES), SHEET_EXPERIENCES, EXPERIENCE_COLUMNS, (row, r) -> {
            StopDraft stop = stopOf(byCode, row, r, SHEET_EXPERIENCES);
            if (stop == null) return;
            String path = "stops.stops[" + stop.index + "].experiences[" + stop.experiences.size() + "]";
            result.locator.put(path, SHEET_EXPERIENCES, r, null);
            String[] fields = {null, "activityName", "checkpointLatitude", "checkpointLongitude", "radiusMeters",
                    "durationSeconds", "question.content", "question.referenceAnswer"};
            for (int c = 1; c < fields.length; c++) {
                result.locator.put(path + "." + fields[c], SHEET_EXPERIENCES, r, EXPERIENCE_COLUMNS[c]);
            }
            result.locator.put(path + ".checkpoint", SHEET_EXPERIENCES, r, EXPERIENCE_COLUMNS[2]);
            result.locator.put(path + ".question", SHEET_EXPERIENCES, r, EXPERIENCE_COLUMNS[6]);

            BigDecimal minutes = toNumber(row.getCell(5), false, SHEET_EXPERIENCES, r, EXPERIENCE_COLUMNS[5]);
            Integer seconds = null;
            if (minutes != null) {
                BigDecimal s = minutes.multiply(BigDecimal.valueOf(60)).setScale(0, RoundingMode.HALF_UP);
                if (s.compareTo(BigDecimal.valueOf(Integer.MAX_VALUE)) > 0) {
                    result.errors.add(issue(SHEET_EXPERIENCES, r, EXPERIENCE_COLUMNS[5], "Thời gian quá lớn"));
                } else {
                    seconds = s.intValue();
                }
            }
            String question = cellText(row.getCell(6));
            String answer = cellText(row.getCell(7));
            stop.experiences.add(new TourWizardRequests.ExperienceItem(
                    cellText(row.getCell(1)),
                    toNumber(row.getCell(2), false, SHEET_EXPERIENCES, r, EXPERIENCE_COLUMNS[2]),
                    toNumber(row.getCell(3), false, SHEET_EXPERIENCES, r, EXPERIENCE_COLUMNS[3]),
                    toInteger(row.getCell(4), SHEET_EXPERIENCES, r, EXPERIENCE_COLUMNS[4]),
                    seconds,
                    null, // mã QR luôn do hệ thống sinh
                    question == null && answer == null ? null
                            : new TourWizardRequests.QuestionItem(null, question, null, answer)));
        });

        eachDataRow(workbook.getSheet(SHEET_ARTIFACTS), SHEET_ARTIFACTS, ARTIFACT_COLUMNS, (row, r) -> {
            StopDraft stop = stopOf(byCode, row, r, SHEET_ARTIFACTS);
            if (stop == null) return;
            String path = "stops.stops[" + stop.index + "].artifacts[" + stop.artifacts.size() + "]";
            result.locator.put(path, SHEET_ARTIFACTS, r, null);
            String[] fields = {null, "name", "imageUrl", "shortDescription", "videoUrl"};
            for (int c = 1; c < fields.length; c++) {
                result.locator.put(path + "." + fields[c], SHEET_ARTIFACTS, r, ARTIFACT_COLUMNS[c]);
            }
            result.locator.put(path + ".videoSource", SHEET_ARTIFACTS, r, ARTIFACT_COLUMNS[4]);
            String videoUrl = cellText(row.getCell(4));
            stop.artifacts.add(new TourWizardRequests.ArtifactItem(cellText(row.getCell(1)),
                    cellText(row.getCell(2)), cellText(row.getCell(3)), videoUrl, videoSourceOf(videoUrl)));
        });

        return byCode.values().stream().map(StopDraft::toItem).toList();
    }

    private StopDraft stopOf(Map<String, StopDraft> byCode, Row row, int r, String sheet) {
        String code = cellText(row.getCell(0));
        if (code == null) {
            result.errors.add(issue(sheet, r, "Mã điểm đến", "Thiếu mã điểm đến"));
            return null;
        }
        StopDraft stop = byCode.get(normalize(code));
        if (stop == null) {
            result.errors.add(issue(sheet, r, "Mã điểm đến",
                    "Mã \"" + code + "\" không có trong sheet \"" + SHEET_STOPS + "\""));
        }
        return stop;
    }

    // ── Ngày khởi hành ──────────────────────────────────────────────────────

    private List<LocalDate> readDates(Sheet sheet) {
        result.locator.put("schedule.departureDates", SHEET_DATES, null, DATE_COLUMNS[0]);
        Set<LocalDate> dates = new TreeSet<>();
        int[] past = {0};
        eachDataRow(sheet, SHEET_DATES, DATE_COLUMNS, (row, r) -> {
            LocalDate date = toDate(row.getCell(0), SHEET_DATES, r, DATE_COLUMNS[0]);
            if (date == null) return;
            if (!date.isAfter(today)) past[0]++;
            dates.add(date);
        });
        if (past[0] > 0) {
            result.warnings.add(new TourImportIssue(SHEET_DATES, null, DATE_COLUMNS[0],
                    past[0] + " ngày khởi hành đã qua hoặc là hôm nay — khách sẽ không đặt được các ngày này"));
        }
        List<LocalDate> list = List.copyOf(dates);
        // Giữ đúng dòng cho lỗi theo vị trí: danh sách đã sắp xếp nên chỉ gắn lỗi về cả sheet.
        for (int i = 0; i < list.size(); i++) {
            result.locator.put("schedule.departureDates[" + i + "]", SHEET_DATES, null, DATE_COLUMNS[0]);
        }
        return list;
    }

    // ── Duyệt dòng ──────────────────────────────────────────────────────────

    private interface RowHandler {
        void handle(Row row, int rowIndex);
    }

    /** Duyệt các dòng dữ liệu (bỏ qua dòng trống) sau khi kiểm tra dòng tiêu đề. Thiếu sheet = không có dữ liệu. */
    private void eachDataRow(Sheet sheet, String sheetName, String[] columns, RowHandler handler) {
        if (sheet == null || !checkHeader(sheet, sheetName, columns)) return;
        int count = 0;
        for (int r = 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (isBlankRow(row, columns.length)) continue;
            if (++count > MAX_ROWS_PER_SHEET) {
                result.errors.add(issue(sheetName, r, null, "Mỗi sheet tối đa " + MAX_ROWS_PER_SHEET + " dòng dữ liệu"));
                return;
            }
            handler.handle(row, r);
        }
    }

    private boolean checkHeader(Sheet sheet, String sheetName, String[] columns) {
        Row header = sheet.getRow(0);
        boolean ok = true;
        for (int c = 0; c < columns.length; c++) {
            String actual = header == null ? null : cellText(header.getCell(c));
            if (actual == null || !normalize(actual).equals(normalize(columns[c]))) {
                result.errors.add(issue(sheetName, 0, columns[c], "Sheet không đúng mẫu: cột " + (char) ('A' + c)
                        + " phải có tiêu đề \"" + columns[c] + "\" (không đổi tên, thêm hoặc xóa cột)"));
                ok = false;
            }
        }
        return ok;
    }

    private static boolean isBlankRow(Row row, int columns) {
        if (row == null) return true;
        for (int c = 0; c < columns; c++) {
            if (cellText(row.getCell(c)) != null) return false;
        }
        return true;
    }

    // ── Đọc ô ───────────────────────────────────────────────────────────────

    private static CellType typeOf(Cell cell) {
        return cell.getCellType() == CellType.FORMULA ? cell.getCachedFormulaResultType() : cell.getCellType();
    }

    /** Giá trị ô dạng chữ (đã trim), null nếu trống. Công thức lấy kết quả đã tính, không tính lại. */
    static String cellText(Cell cell) {
        if (cell == null) return null;
        String value = switch (typeOf(cell)) {
            case STRING -> cell.getRichStringCellValue().getString();
            case NUMERIC -> DateUtil.isCellDateFormatted(cell)
                    ? cell.getLocalDateTimeCellValue().toLocalDate().format(DMY)
                    : BigDecimal.valueOf(cell.getNumericCellValue()).stripTrailingZeros().toPlainString();
            case BOOLEAN -> cell.getBooleanCellValue() ? YES : NO;
            default -> null;
        };
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** @param money cho phép dấu phân cách hàng nghìn ("350.000", "1,200,000") và hậu tố đ / VNĐ */
    private BigDecimal toNumber(Cell cell, boolean money, String sheet, Integer r, String column) {
        if (cell == null) return null;
        if (typeOf(cell) == CellType.NUMERIC) return BigDecimal.valueOf(cell.getNumericCellValue());
        String text = cellText(cell);
        if (text == null) return null;
        BigDecimal value = parseNumber(text, money);
        if (value == null) result.errors.add(issue(sheet, r, column, "Phải là số (đang là \"" + text + "\")"));
        return value;
    }

    static BigDecimal parseNumber(String raw, boolean money) {
        String s = raw.replaceAll("\\s", "");
        if (money) {
            s = s.replaceAll("(?i)(vnđ|vnd|đ)$", "");
            if (s.matches("-?\\d{1,3}([.,]\\d{3})+")) s = s.replaceAll("[.,]", "");
        }
        s = s.replace(',', '.');
        try {
            return new BigDecimal(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer toInteger(Cell cell, String sheet, Integer r, String column) {
        BigDecimal value = toNumber(cell, false, sheet, r, column);
        if (value == null) return null;
        try {
            return value.stripTrailingZeros().intValueExact();
        } catch (ArithmeticException e) {
            result.errors.add(issue(sheet, r, column, "Phải là số nguyên"));
            return null;
        }
    }

    private LocalDate toDate(Cell cell, String sheet, int r, String column) {
        if (cell == null) return null;
        if (typeOf(cell) == CellType.NUMERIC) {
            double value = cell.getNumericCellValue();
            if (DateUtil.isValidExcelDate(value)) return DateUtil.getLocalDateTime(value).toLocalDate();
        }
        String text = cellText(cell);
        if (text == null) return null;
        for (DateTimeFormatter format : DATE_FORMATS) {
            try {
                return LocalDate.parse(text, format);
            } catch (DateTimeParseException ignored) {
                // thử định dạng tiếp theo
            }
        }
        result.errors.add(issue(sheet, r, column, "Ngày không hợp lệ: \"" + text + "\" (định dạng dd/mm/yyyy)"));
        return null;
    }

    private Boolean toYesNo(Cell cell, String sheet, int r, String column) {
        String text = cellText(cell);
        if (text == null) return null;
        String key = normalize(text);
        if (Set.of("có", "co", "x", "yes", "true", "1").contains(key)) return true;
        if (Set.of("không", "khong", "no", "false", "0").contains(key)) return false;
        result.errors.add(issue(sheet, r, column, "Chỉ nhập \"" + YES + "\" hoặc \"" + NO + "\""));
        return null;
    }

    static VideoSource videoSourceOf(String url) {
        if (url == null) return null;
        String lower = url.toLowerCase(Locale.ROOT);
        return lower.contains("youtube.com") || lower.contains("youtu.be") ? VideoSource.YOUTUBE : VideoSource.MP4_LINK;
    }

    private static TourImportIssue issue(String sheet, Integer rowIndex, String column, String message) {
        return new TourImportIssue(sheet, rowIndex == null ? null : rowIndex + 1, column, message);
    }
}
