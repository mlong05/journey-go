package com.journeygo.modules.tour.importer;

import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.importer.TourImportLayout.Field;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static com.journeygo.modules.tour.importer.TourImportLayout.*;

/**
 * Sinh file mẫu nhập tour (.xlsx): các sheet theo {@link TourImportLayout}, danh sách thả xuống
 * cho khu vực / chủ đề (lấy từ hệ thống lúc tải), loại khách, hình thức, đáp án đúng.
 * {@code sample = true} điền sẵn một tour ví dụ hợp lệ để đối tác tham khảo.
 */
final class TourImportTemplateBuilder {

    private static final int DROPDOWN_LAST_ROW = MAX_ROWS_PER_SHEET;

    private final List<String> regions;
    private final List<String> themes;
    private final boolean sample;
    private final LocalDate today;

    private XSSFWorkbook wb;
    private CellStyle headerStyle, labelStyle, noteStyle, wrapStyle, titleStyle, dateStyle;

    TourImportTemplateBuilder(List<String> regions, List<String> themes, boolean sample, LocalDate today) {
        this.regions = regions;
        this.themes = themes;
        this.sample = sample;
        this.today = today;
    }

    byte[] build() {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            this.wb = workbook;
            createStyles();
            guideSheet();
            Sheet lists = listsSheet();
            generalSheet();
            imagesSheet();
            pricesSheet();
            itinerarySheet();
            stopsSheet();
            quizSheet();
            experiencesSheet();
            artifactsSheet();
            datesSheet();
            // Sheet danh mục để cuối và ẩn đi (không được là sheet đang mở).
            wb.setSheetOrder(lists.getSheetName(), wb.getNumberOfSheets() - 1);
            wb.setSheetHidden(wb.getSheetIndex(lists), true);
            wb.setActiveSheet(wb.getSheetIndex(SHEET_GENERAL));
            wb.setFirstVisibleTab(0);
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    // ── Styles ──────────────────────────────────────────────────────────────

    private void createStyles() {
        Font white = wb.createFont();
        white.setBold(true);
        white.setColor(IndexedColors.WHITE.getIndex());
        XSSFCellStyle header = wb.createCellStyle();
        header.setFont(white);
        header.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 0x05, (byte) 0x96, (byte) 0x69}, null));
        header.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        header.setWrapText(true);
        header.setVerticalAlignment(VerticalAlignment.CENTER);
        headerStyle = header;

        Font bold = wb.createFont();
        bold.setBold(true);
        XSSFCellStyle label = wb.createCellStyle();
        label.setFont(bold);
        label.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 0xF1, (byte) 0xF5, (byte) 0xF9}, null));
        label.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        label.setVerticalAlignment(VerticalAlignment.TOP);
        labelStyle = label;

        Font grey = wb.createFont();
        grey.setItalic(true);
        grey.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
        noteStyle = wb.createCellStyle();
        noteStyle.setFont(grey);
        noteStyle.setWrapText(true);
        noteStyle.setVerticalAlignment(VerticalAlignment.TOP);

        wrapStyle = wb.createCellStyle();
        wrapStyle.setWrapText(true);
        wrapStyle.setVerticalAlignment(VerticalAlignment.TOP);

        Font big = wb.createFont();
        big.setBold(true);
        big.setFontHeightInPoints((short) 14);
        titleStyle = wb.createCellStyle();
        titleStyle.setFont(big);

        dateStyle = wb.createCellStyle();
        dateStyle.setDataFormat(wb.getCreationHelper().createDataFormat().getFormat("dd/mm/yyyy"));
    }

    // ── Sheets ──────────────────────────────────────────────────────────────

    private void guideSheet() {
        Sheet sheet = wb.createSheet(SHEET_GUIDE);
        sheet.setColumnWidth(0, 120 * 256);
        String[] lines = {
                "HƯỚNG DẪN NHẬP TOUR TỪ FILE EXCEL",
                "",
                "1. Mỗi file là 1 tour. Sau khi nhập, hệ thống tạo một BẢN NHÁP — bạn mở lại trong màn hình tạo tour để kiểm tra, "
                        + "bổ sung ảnh (nếu thiếu) rồi bấm Gửi duyệt như bình thường.",
                "2. KHÔNG đổi tên sheet, KHÔNG đổi tên / thêm / xóa cột, KHÔNG xóa dòng tiêu đề. Dòng trống sẽ được bỏ qua.",
                "3. Các ô có danh sách thả xuống: Hình thức, Khu vực, Chủ đề, Loại khách, Có / Không, Đáp án đúng.",
                "",
                "CÁC SHEET",
                "• " + SHEET_GENERAL + ": tên, hình thức, thời lượng, khu vực, chủ đề, mô tả, điểm nổi bật, số chỗ, các chính sách.",
                "• " + SHEET_IMAGES + ": mỗi dòng 1 đường dẫn ảnh https. Đánh \"Có\" ở cột Ảnh bìa cho 1 ảnh (bỏ trống = ảnh đầu tiên).",
                "• " + SHEET_PRICES + ": giá cho từng loại khách. Em bé luôn miễn phí.",
                "• " + SHEET_ITINERARY + ": mỗi dòng 1 ngày, theo thứ tự 1, 2, 3… Tour trong ngày chỉ cần 1 dòng.",
                "• " + SHEET_STOPS + ": mỗi dòng 1 điểm đến, thứ tự dòng = thứ tự tham quan. Tự đặt Mã điểm đến (D1, D2…).",
                "• " + SHEET_QUIZ + ", " + SHEET_EXPERIENCES + ", " + SHEET_ARTIFACTS
                        + ": mỗi dòng ghi Mã điểm đến để gắn vào đúng điểm đến.",
                "• " + SHEET_DATES + ": mỗi dòng 1 ngày khởi hành (dd/mm/yyyy).",
                "",
                "LƯU Ý",
                "• Ảnh / video: dán đường dẫn https (ảnh đã tải lên, link YouTube hoặc file MP4). Có thể để trống và tải lên sau trong màn hình tạo tour.",
                "• Mã QR xác nhận trải nghiệm do hệ thống tự sinh, không cần nhập.",
                "• Vĩ độ / kinh độ: lấy từ Google Maps (chuột phải vào địa điểm → dòng số đầu tiên), ví dụ 15.8771 và 108.3269. "
                        + "Nên kiểm tra lại vị trí trên bản đồ trong màn hình tạo tour.",
                "",
                "ĐIỀU KIỆN ĐỂ GỬI DUYỆT (thiếu vẫn nhập được, hệ thống sẽ liệt kê mục cần bổ sung)",
                "• Ít nhất 5 ảnh https, 3–5 điểm nổi bật, đã chọn khu vực và chủ đề, có mô tả.",
                "• Có giá cho cả 4 loại khách, ít nhất 1 loại khách tính vào số chỗ, có số chỗ tối đa và chính sách hủy.",
                "• Ít nhất 1 điểm đến; mỗi điểm đến có mô tả ngắn, nội dung văn hóa, 1–4 câu quiz (đủ 4 đáp án, 1 đáp án đúng) "
                        + "và 1–5 trải nghiệm (có tọa độ, thời gian, câu hỏi và đáp án).",
                "• Ít nhất 1 ngày khởi hành trong tương lai.",
        };
        for (int i = 0; i < lines.length; i++) {
            Cell cell = sheet.createRow(i).createCell(0);
            cell.setCellValue(lines[i]);
            cell.setCellStyle(i == 0 ? titleStyle : wrapStyle);
        }
    }

    private Sheet listsSheet() {
        Sheet sheet = wb.createSheet(SHEET_LISTS);
        header(sheet, new String[]{"Khu vực", "Chủ đề"}, new int[]{40, 40});
        int rows = Math.max(regions.size(), themes.size());
        for (int i = 0; i < rows; i++) {
            Row row = sheet.createRow(i + 1);
            if (i < regions.size()) row.createCell(0).setCellValue(regions.get(i));
            if (i < themes.size()) row.createCell(1).setCellValue(themes.get(i));
        }
        return sheet;
    }

    private void generalSheet() {
        Sheet sheet = wb.createSheet(SHEET_GENERAL);
        header(sheet, new String[]{"Trường", "Giá trị", "Ghi chú"}, new int[]{30, 70, 60});
        Field[] fields = Field.values();
        for (int i = 0; i < fields.length; i++) {
            Field field = fields[i];
            Row row = sheet.createRow(GENERAL_FIRST_ROW + i);
            cell(row, 0, field.label, labelStyle);
            cell(row, 1, sample ? sampleValue(field) : null, wrapStyle);
            cell(row, 2, field.note, noteStyle);
            int r = row.getRowNum();
            switch (field) {
                case FORMAT -> explicitDropdown(sheet, r, r, 1, FORMAT_DAY_TRIP, FORMAT_MULTI_DAY);
                case REGION -> listDropdown(sheet, r, 1, 0, regions.size());
                case THEME -> listDropdown(sheet, r, 1, 1, themes.size());
                default -> { }
            }
        }
    }

    private void imagesSheet() {
        Sheet sheet = wb.createSheet(SHEET_IMAGES);
        header(sheet, IMAGE_COLUMNS, new int[]{80, 24});
        explicitDropdown(sheet, 1, DROPDOWN_LAST_ROW, 1, YES);
        if (!sample) return;
        for (int i = 1; i <= 5; i++) {
            rowOf(sheet, i, "https://picsum.photos/seed/journeygo-hoian-" + i + "/1200/800", i == 1 ? YES : null);
        }
    }

    private void pricesSheet() {
        Sheet sheet = wb.createSheet(SHEET_PRICES);
        header(sheet, PRICE_COLUMNS, new int[]{20, 18, 30});
        explicitDropdown(sheet, 1, DROPDOWN_LAST_ROW, 0,
                Arrays.stream(GuestType.values()).map(GuestType::getLabel).toArray(String[]::new));
        explicitDropdown(sheet, 1, DROPDOWN_LAST_ROW, 2, YES, NO);
        Object[][] defaults = {
                {GuestType.ADULT, sample ? 650000d : null, YES},
                {GuestType.CHILD, sample ? 450000d : null, YES},
                {GuestType.TODDLER, sample ? 150000d : null, NO},
                {GuestType.INFANT, 0d, NO},
        };
        for (int i = 0; i < defaults.length; i++) {
            Row row = sheet.createRow(i + 1);
            row.createCell(0).setCellValue(((GuestType) defaults[i][0]).getLabel());
            if (defaults[i][1] != null) row.createCell(1).setCellValue((Double) defaults[i][1]);
            row.createCell(2).setCellValue((String) defaults[i][2]);
        }
    }

    private void itinerarySheet() {
        Sheet sheet = wb.createSheet(SHEET_ITINERARY);
        header(sheet, ITINERARY_COLUMNS, new int[]{8, 30, 36, 80});
        if (sample) {
            rowOf(sheet, 1, 1d, "Phố cổ Hội An", "Đi bộ khám phá kiến trúc gỗ",
                    "**Sáng:** gặp hướng dẫn viên tại Chùa Cầu\nTham quan nhà cổ Tấn Ký\n**Trưa:** thưởng thức cao lầu");
        }
    }

    private void stopsSheet() {
        Sheet sheet = wb.createSheet(SHEET_STOPS);
        header(sheet, STOP_COLUMNS, new int[]{14, 28, 40, 34, 40, 40, 70});
        if (sample) {
            rowOf(sheet, 1, "D1", "Chùa Cầu", "Biểu tượng của phố cổ, xây dựng từ thế kỷ 17.",
                    "Giữ trật tự khi vào bên trong chùa.", "https://picsum.photos/seed/journeygo-chuacau/1200/800",
                    null,
                    "Chùa Cầu do các thương nhân Nhật Bản xây dựng để nối khu phố người Nhật với khu phố người Hoa…");
            rowOf(sheet, 2, "D2", "Nhà cổ Tấn Ký", "Ngôi nhà gỗ hơn 200 năm tuổi của một gia đình thương nhân.",
                    null, "https://picsum.photos/seed/journeygo-tanky/1200/800", null,
                    "Nhà cổ Tấn Ký là sự giao thoa giữa kiến trúc Việt, Nhật và Hoa…");
        }
    }

    private void quizSheet() {
        Sheet sheet = wb.createSheet(SHEET_QUIZ);
        header(sheet, QUIZ_COLUMNS, new int[]{14, 50, 24, 24, 24, 24, 18});
        explicitDropdown(sheet, 1, DROPDOWN_LAST_ROW, 6, ANSWER_LETTERS.toArray(String[]::new));
        if (sample) {
            rowOf(sheet, 1, "D1", "Chùa Cầu được xây dựng bởi cộng đồng nào?", "Người Nhật", "Người Pháp",
                    "Người Hà Lan", "Người Bồ Đào Nha", "A");
            rowOf(sheet, 2, "D2", "Nhà cổ Tấn Ký có tuổi đời khoảng bao nhiêu năm?", "50 năm", "100 năm",
                    "Hơn 200 năm", "Hơn 500 năm", "C");
        }
    }

    private void experiencesSheet() {
        Sheet sheet = wb.createSheet(SHEET_EXPERIENCES);
        header(sheet, EXPERIENCE_COLUMNS, new int[]{14, 30, 14, 14, 14, 18, 44, 36});
        if (sample) {
            rowOf(sheet, 1, "D1", "Tìm linh vật ở hai đầu cầu", 15.8771d, 108.3262d, 50d, 10d,
                    "Hai đầu Chùa Cầu có tượng con vật gì?", "khỉ và chó;chó và khỉ");
            rowOf(sheet, 2, "D2", "Đếm số cột gỗ trong gian chính", 15.8768d, 108.3291d, 40d, 15d,
                    "Gian chính có bao nhiêu cột gỗ?", "12;mười hai");
        }
    }

    private void artifactsSheet() {
        Sheet sheet = wb.createSheet(SHEET_ARTIFACTS);
        header(sheet, ARTIFACT_COLUMNS, new int[]{14, 30, 40, 44, 40});
        if (sample) {
            rowOf(sheet, 1, "D2", "Bộ bàn ghế khảm xà cừ", "https://picsum.photos/seed/journeygo-xacu/1200/800",
                    "Đồ gỗ khảm xà cừ được truyền qua 7 đời.", null);
        }
    }

    private void datesSheet() {
        Sheet sheet = wb.createSheet(SHEET_DATES);
        header(sheet, DATE_COLUMNS, new int[]{28});
        sheet.setDefaultColumnStyle(0, dateStyle);
        if (!sample) return;
        for (int i = 1; i <= 3; i++) {
            Cell cell = sheet.createRow(i).createCell(0);
            cell.setCellValue(today.plusWeeks(i));
            cell.setCellStyle(dateStyle);
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private void header(Sheet sheet, String[] columns, int[] widths) {
        Row row = sheet.createRow(0);
        row.setHeightInPoints(30);
        for (int c = 0; c < columns.length; c++) {
            cell(row, c, columns[c], headerStyle);
            sheet.setColumnWidth(c, widths[c] * 256);
        }
        sheet.createFreezePane(0, 1);
    }

    private static void cell(Row row, int col, String value, CellStyle style) {
        Cell cell = row.createCell(col);
        if (value != null) cell.setCellValue(value);
        if (style != null) cell.setCellStyle(style);
    }

    private void rowOf(Sheet sheet, int rowIndex, Object... values) {
        Row row = sheet.createRow(rowIndex);
        for (int c = 0; c < values.length; c++) {
            Object value = values[c];
            if (value == null) continue;
            Cell cell = row.createCell(c);
            if (value instanceof Double d) {
                cell.setCellValue(d);
            } else {
                cell.setCellValue(value.toString());
                cell.setCellStyle(wrapStyle);
            }
        }
    }

    private static void explicitDropdown(Sheet sheet, int firstRow, int lastRow, int col, String... values) {
        DataValidationHelper helper = sheet.getDataValidationHelper();
        addValidation(sheet, helper, helper.createExplicitListConstraint(values), firstRow, lastRow, col);
    }

    /** Danh sách lấy từ cột {@code listCol} của sheet danh mục (ẩn). */
    private static void listDropdown(Sheet sheet, int row, int col, int listCol, int count) {
        if (count == 0) return;
        char letter = (char) ('A' + listCol);
        String formula = "'" + SHEET_LISTS + "'!$" + letter + "$2:$" + letter + "$" + (count + 1);
        DataValidationHelper helper = sheet.getDataValidationHelper();
        addValidation(sheet, helper, helper.createFormulaListConstraint(formula), row, row, col);
    }

    private static void addValidation(Sheet sheet, DataValidationHelper helper, DataValidationConstraint constraint,
                                      int firstRow, int lastRow, int col) {
        DataValidation validation = helper.createValidation(constraint,
                new CellRangeAddressList(firstRow, lastRow, col, col));
        validation.setShowErrorBox(true);
        validation.setErrorStyle(DataValidation.ErrorStyle.STOP);
        validation.createErrorBox("Giá trị không hợp lệ", "Hãy chọn một giá trị trong danh sách thả xuống.");
        validation.setSuppressDropDownArrow(true); // XSSF: true = hiện mũi tên thả xuống
        sheet.addValidationData(validation);
    }

    private String sampleValue(Field field) {
        return switch (field) {
            case TITLE -> "Theo chân thợ mộc khám phá kiến trúc gỗ Hội An";
            case FORMAT -> FORMAT_DAY_TRIP;
            case DURATION_HOURS -> "4";
            case DURATION_MINUTES -> "30";
            case REGION -> regions.isEmpty() ? null : regions.get(0);
            case THEME -> themes.isEmpty() ? null : themes.get(0);
            case DESCRIPTION -> "Hành trình nửa ngày đi bộ qua phố cổ Hội An, nghe nghệ nhân kể chuyện về nghề mộc Kim Bồng.";
            case HIGHLIGHT_1 -> "Tham quan Chùa Cầu và nhà cổ Tấn Ký";
            case HIGHLIGHT_2 -> "Gặp nghệ nhân mộc Kim Bồng";
            case HIGHLIGHT_3 -> "Thưởng thức cao lầu chính gốc";
            case MAX_GUESTS -> "15";
            case CANCELLATION -> "Hủy trước 48 giờ: hoàn 100%. Hủy trong vòng 48 giờ: không hoàn tiền.";
            case PRICE_INCLUDES -> "Hướng dẫn viên\nVé tham quan\nNước uống";
            case PRICE_EXCLUDES -> "Chi phí cá nhân";
            case FORCE_MAJEURE -> "Tour có thể đổi lịch khi thời tiết xấu.";
            case REFUND_POLICY -> "Hoàn tiền trong 7 ngày làm việc.";
            case CONTACT -> "0900 000 000 — hotro@example.com";
            default -> null;
        };
    }
}
