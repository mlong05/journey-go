package com.journeygo.modules.export;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Ghi bảng dữ liệu phẳng ra file tải về (CSV hoặc XLSX).
 *
 * <p>CSV: UTF-8 có BOM (để Excel mở đúng tiếng Việt), phân cách `;` (Excel VN
 * hiểu `;` là dấu phân cách cột theo locale). XLSX: dùng POI (đã có sẵn trong dự án).
 */
@Component
public class ExportFileWriter {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;

    /** Ký tự tách cột cho CSV (Excel tiếng Việt dùng `;`). */
    private static final char CSV_DELIMITER = ';';

    /** Ký tự thoát cho CSV (nhân đôi ký tự tách). */
    private static final char CSV_ESCAPE = '"';

    // ── CSV ──────────────────────────────────────────────────────────────────

    /**
     * Ghi bảng ra CSV (UTF-8 có BOM).
     */
    public byte[] toCsv(ExportDataService.ExportTable table) {
        StringBuilder sb = new StringBuilder();
        // BOM ⇒ Excel nhận đúng UTF-8.
        sb.append('﻿');

        appendCsvRow(sb, table.columns());
        for (List<Object> row : table.rows()) {
            List<String> cells = new java.util.ArrayList<>(row.size());
            for (Object value : row) {
                cells.add(formatCell(value));
            }
            appendCsvRow(sb, cells);
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private void appendCsvRow(StringBuilder sb, List<String> cells) {
        for (int i = 0; i < cells.size(); i++) {
            if (i > 0) {
                sb.append(CSV_DELIMITER);
            }
            sb.append(escapeCsv(cells.get(i)));
        }
        sb.append("\r\n");
    }

    private String escapeCsv(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        boolean needQuote = value.indexOf(CSV_DELIMITER) >= 0
                || value.indexOf('\n') >= 0
                || value.indexOf('\r') >= 0
                || value.indexOf(CSV_ESCAPE) >= 0;
        if (!needQuote) {
            return value;
        }
        return CSV_ESCAPE
                + value.replace(String.valueOf(CSV_ESCAPE), "" + CSV_ESCAPE + CSV_ESCAPE)
                + CSV_ESCAPE;
    }

    // ── XLSX ─────────────────────────────────────────────────────────────────

    /**
     * Ghi bảng ra file Excel (.xlsx).
     */
    public byte[] toXlsx(ExportDataService.ExportTable table, String sheetName) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sanitizeSheetName(sheetName));
            sheet.createFreezePane(0, 1);

            CellStyle headerStyle = buildHeaderStyle(workbook);
            CellStyle textStyle = buildTextStyle(workbook);
            CellStyle moneyStyle = buildMoneyStyle(workbook);

            Row header = sheet.createRow(0);
            header.setHeightInPoints(26);
            for (int c = 0; c < table.columns().size(); c++) {
                Cell cell = header.createCell(c);
                cell.setCellValue(table.columns().get(c));
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(c, 22 * 256);
            }

            int rowIndex = 1;
            for (List<Object> row : table.rows()) {
                Row sheetRow = sheet.createRow(rowIndex++);
                for (int c = 0; c < row.size(); c++) {
                    Object value = row.get(c);
                    Cell cell = sheetRow.createCell(c);
                    if (value instanceof BigDecimal decimal) {
                        cell.setCellValue(decimal.doubleValue());
                        cell.setCellStyle(moneyStyle);
                    } else if (value instanceof Integer intValue) {
                        cell.setCellValue(intValue);
                        cell.setCellStyle(textStyle);
                    } else {
                        cell.setCellValue(formatCell(value));
                        cell.setCellStyle(textStyle);
                    }
                }
            }
            // Cột đầu tiên (mã / tên) rộng hơn cho dễ đọc.
            sheet.setColumnWidth(0, 30 * 256);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private String sanitizeSheetName(String name) {
        if (name == null || name.isBlank()) {
            return "DuLieu";
        }
        // Excel: tên sheet tối đa 31 ký tự và không chứa : \ / ? * [ ]
        String cleaned = name.replaceAll("[\\\\/:*?\\[\\]]", " ").trim();
        return cleaned.length() > 31 ? cleaned.substring(0, 31) : cleaned;
    }

    private CellStyle buildHeaderStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);
        applyBorders(style);
        return style;
    }

    private CellStyle buildTextStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setVerticalAlignment(VerticalAlignment.TOP);
        style.setWrapText(true);
        applyBorders(style);
        return style;
    }

    private CellStyle buildMoneyStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setDataFormat(workbook.getCreationHelper().createDataFormat().getFormat("#,##0"));
        style.setVerticalAlignment(VerticalAlignment.TOP);
        applyBorders(style);
        return style;
    }

    private void applyBorders(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }

    // ── Format ô ────────────────────────────────────────────────────────────

    private String formatCell(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof BigDecimal decimal) {
            return decimal.stripTrailingZeros().toPlainString();
        }
        if (value instanceof LocalDate date) {
            return DATE_FORMAT.format(date);
        }
        return String.valueOf(value);
    }
}
