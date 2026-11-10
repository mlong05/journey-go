package com.journeygo.modules.tour.importer;

import com.journeygo.modules.tour.dto.wizard.TourWizardRequests;
import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.TourFormat;
import com.journeygo.modules.tour.importer.dto.TourImportIssue;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static com.journeygo.modules.tour.importer.TourImportLayout.*;
import static org.junit.jupiter.api.Assertions.*;

class TourExcelParserTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 10);
    private static final Map<String, Long> REGIONS = Map.of(normalize("Miền Trung"), 1L);
    private static final Map<String, Long> THEMES = Map.of(normalize("Kiến trúc"), 7L);

    private static XSSFWorkbook template(boolean sample) throws IOException {
        byte[] bytes = new TourImportTemplateBuilder(List.of("Miền Trung"), List.of("Kiến trúc"), sample, TODAY).build();
        return new XSSFWorkbook(new ByteArrayInputStream(bytes));
    }

    private static TourExcelParser.Result parse(XSSFWorkbook wb) {
        return new TourExcelParser(REGIONS, THEMES, TODAY).parse(wb);
    }

    private static void set(Sheet sheet, int rowIndex, int col, String value) {
        Row row = sheet.getRow(rowIndex) == null ? sheet.createRow(rowIndex) : sheet.getRow(rowIndex);
        row.createCell(col).setCellValue(value);
    }

    private static int generalRow(Field field) {
        return GENERAL_FIRST_ROW + field.ordinal();
    }

    @Test
    @DisplayName("File ví dụ đọc lại được đầy đủ, không có lỗi")
    void sampleRoundTrip() throws IOException {
        try (XSSFWorkbook wb = template(true)) {
            TourExcelParser.Result r = parse(wb);

            assertTrue(r.errors.isEmpty(), () -> "Không mong có lỗi: " + r.errors);
            TourWizardRequests.BasicInfo basic = r.basicInfo;
            assertEquals("Theo chân thợ mộc khám phá kiến trúc gỗ Hội An", r.title);
            assertEquals(TourFormat.DAY_TRIP, basic.tourFormat());
            assertEquals(270, basic.durationMinutes());
            assertEquals(1L, basic.regionId());
            assertEquals(7L, basic.themeId());
            assertEquals(3, basic.highlights().size());
            assertEquals(5, basic.images().size());
            assertEquals(basic.images().get(0), basic.coverImageUrl());
            assertEquals(1, basic.itinerary().size());

            assertEquals(4, r.pricing.prices().size());
            assertEquals(0, new BigDecimal("650000").compareTo(r.pricing.prices().get(0).price()));
            assertTrue(r.pricing.prices().get(0).countsTowardSlot());
            assertEquals(GuestType.INFANT, r.pricing.prices().get(3).guestType());
            assertEquals(15, r.pricing.maxGuestsPerSlot());

            List<TourWizardRequests.StopItem> stops = r.stops.stops();
            assertEquals(2, stops.size());
            assertEquals("Chùa Cầu", stops.get(0).name());
            TourWizardRequests.QuestionItem quiz = stops.get(0).quiz().get(0);
            assertEquals(4, quiz.answers().size());
            assertTrue(quiz.answers().get(0).correct());
            assertFalse(quiz.answers().get(1).correct());
            TourWizardRequests.ExperienceItem exp = stops.get(0).experiences().get(0);
            assertEquals(600, exp.durationSeconds());
            assertEquals(50, exp.radiusMeters());
            assertEquals(0, new BigDecimal("15.8771").compareTo(exp.checkpointLatitude()));
            assertEquals("khỉ và chó;chó và khỉ", exp.question().referenceAnswer());
            assertNull(exp.qrToken());
            assertEquals(1, stops.get(1).artifacts().size());

            assertEquals(List.of(TODAY.plusWeeks(1), TODAY.plusWeeks(2), TODAY.plusWeeks(3)),
                    r.schedule.departureDates());
            assertEquals(2, r.summary().stops());
        }
    }

    @Test
    @DisplayName("File mẫu trống: không lỗi, tạo được bản nháp rỗng")
    void emptyTemplate() throws IOException {
        try (XSSFWorkbook wb = template(false)) {
            TourExcelParser.Result r = parse(wb);
            assertTrue(r.errors.isEmpty(), () -> "Không mong có lỗi: " + r.errors);
            assertNull(r.title);
            assertEquals(TourFormat.DAY_TRIP, r.basicInfo.tourFormat());
            assertTrue(r.stops.stops().isEmpty());
            assertTrue(r.basicInfo.images().isEmpty());
            // 4 loại khách có sẵn trong mẫu, chưa có giá (trừ Em bé)
            assertEquals(4, r.pricing.prices().size());
            assertNull(r.pricing.prices().get(0).price());
        }
    }

    @Test
    @DisplayName("Lỗi dạng dữ liệu chỉ rõ sheet / dòng / cột")
    void cellErrors() throws IOException {
        try (XSSFWorkbook wb = template(true)) {
            set(wb.getSheet(SHEET_GENERAL), generalRow(Field.REGION), 1, "Sao Hỏa");
            set(wb.getSheet(SHEET_PRICES), 2, 1, "abc");
            set(wb.getSheet(SHEET_QUIZ), 1, 6, "E");
            set(wb.getSheet(SHEET_EXPERIENCES), 2, 0, "D9");
            set(wb.getSheet(SHEET_DATES), 4, 0, "31/02/2027");

            List<TourImportIssue> errors = parse(wb).errors;

            assertTrue(errors.contains(new TourImportIssue(SHEET_GENERAL, generalRow(Field.REGION) + 1, "Khu vực",
                    "Khu vực \"Sao Hỏa\" không có trong hệ thống — hãy chọn từ danh sách thả xuống")), errors::toString);
            assertTrue(errors.contains(new TourImportIssue(SHEET_PRICES, 3, "Giá (VNĐ)", "Phải là số (đang là \"abc\")")));
            assertTrue(errors.contains(new TourImportIssue(SHEET_QUIZ, 2, "Đáp án đúng (A–D)", "Đáp án đúng phải là A, B, C hoặc D")));
            assertTrue(errors.contains(new TourImportIssue(SHEET_EXPERIENCES, 3, "Mã điểm đến",
                    "Mã \"D9\" không có trong sheet \"Điểm đến\"")));
            assertTrue(errors.stream().anyMatch(e -> SHEET_DATES.equals(e.sheet()) && e.row() == 5));
            assertEquals(5, errors.size(), errors::toString);
        }
    }

    @Test
    @DisplayName("Đổi tên cột hoặc thiếu sheet chính → báo không đúng mẫu")
    void wrongLayout() throws IOException {
        try (XSSFWorkbook wb = template(true)) {
            set(wb.getSheet(SHEET_STOPS), 0, 1, "Tên");
            TourExcelParser.Result r = parse(wb);
            assertTrue(r.errors.stream().anyMatch(e -> SHEET_STOPS.equals(e.sheet()) && e.row() == 1
                    && e.message().startsWith("Sheet không đúng mẫu")));
            // Không đọc được sheet điểm đến → quiz / trải nghiệm / cổ vật trỏ tới mã không tồn tại
            assertTrue(r.stops.stops().isEmpty());
        }
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            wb.createSheet("Sheet1");
            TourExcelParser.Result r = parse(wb);
            assertNull(r.basicInfo);
            assertEquals(1, r.errors.size());
            assertNull(r.errors.get(0).sheet());
        }
    }

    @Test
    @DisplayName("Tour nhiều ngày: số đêm lớn hơn số ngày bị chặn; giá dạng chữ có dấu chấm nghìn")
    void multiDayAndMoneyText() throws IOException {
        try (XSSFWorkbook wb = template(true)) {
            Sheet general = wb.getSheet(SHEET_GENERAL);
            set(general, generalRow(Field.FORMAT), 1, FORMAT_MULTI_DAY);
            set(general, generalRow(Field.DAYS), 1, "2");
            set(general, generalRow(Field.NIGHTS), 1, "3");
            set(wb.getSheet(SHEET_PRICES), 1, 1, "1.250.000đ");

            TourExcelParser.Result r = parse(wb);
            assertEquals(TourFormat.MULTI_DAY, r.basicInfo.tourFormat());
            assertNull(r.basicInfo.durationMinutes());
            assertEquals(0, new BigDecimal("1250000").compareTo(r.pricing.prices().get(0).price()));
            assertEquals(List.of(new TourImportIssue(SHEET_GENERAL, generalRow(Field.NIGHTS) + 1, "Số đêm",
                    "Số đêm không được lớn hơn số ngày")), r.errors);
            // Tour nhiều ngày giữ toàn bộ lịch trình, không cảnh báo
            assertTrue(r.warnings.isEmpty());
        }
    }

    @Test
    void locatorFallsBackToParentPath() {
        CellLocator locator = new CellLocator();
        locator.put("stops.stops[1].quiz[0]", SHEET_QUIZ, 2, null);
        assertEquals(new CellLocator.Location(SHEET_QUIZ, 3, null), locator.find("stops.stops[1].quiz[0].answers[2].content"));
        assertNull(locator.find("stops.stops[0].name"));
    }
}
