package com.journeygo.modules.export;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.export.ExportDataService.ExportTable;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * API xuất dữ liệu (D2).
 *
 * <p>Endpoint:
 * <ul>
 *   <li>{@code GET /api/v1/admin/exports/datasets} — danh sách tập dữ liệu có thể xuất.</li>
 *   <li>{@code GET /api/v1/admin/exports/{dataset}} — tải file (xlsx mặc định, csv tuỳ chọn).</li>
 *   <li>{@code GET /api/v1/admin/exports/{dataset}/preview} — xem trước N dòng đầu (JSON).</li>
 * </ul>
 *
 * <p>Chỉ ADMIN được gọi (mọi lần xuất đều được ghi vào {@code system_audit_logs}).
 */
@RestController
@RequestMapping("/api/v1/admin/exports")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Quản trị xuất dữ liệu (Admin Exports)", description = "Các API xuất dữ liệu ra CSV / Excel cho báo cáo và đối soát")
public class DataExportController {

    private final ExportDataService exportDataService;
    private final ExportFileWriter exportFileWriter;

    /** Số dòng trả về cho endpoint xem trước. */
    private static final int PREVIEW_ROWS = 50;

    // ── Danh sách tập dữ liệu ───────────────────────────────────────────────

    @GetMapping("/datasets")
    @Operation(summary = "Danh sách tập dữ liệu có thể xuất",
            description = "Trả về các tập dữ liệu (đơn đặt tour, hoàn tiền, doanh thu, đánh giá, nhật ký kiểm toán) kèm nhãn hiển thị")
    public ResponseEntity<ApiResponse<Map<String, Object>>> datasets() {
        Map<String, Object> body = new LinkedHashMap<>();
        for (ExportDataset dataset : ExportDataset.values()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("slug", dataset.slug());
            item.put("label", dataset.label());
            body.put(dataset.name(), item);
        }
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tập dữ liệu xuất thành công", body));
    }

    // ── Xem trước ────────────────────────────────────────────────────────────

    @GetMapping("/{dataset}/preview")
    @Operation(summary = "Xem trước dữ liệu trước khi xuất",
            description = "Trả về tối đa 50 dòng đầu của tập dữ liệu (kèm bộ lọc) để người dùng kiểm tra trước khi tải file")
    public ResponseEntity<ApiResponse<Map<String, Object>>> preview(
            @PathVariable String dataset,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {

        ExportDataset resolved = resolve(dataset);
        ExportTable table = exportDataService.collect(resolved, from, to, normalize(status), normalize(keyword));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("dataset", resolved.name());
        body.put("slug", resolved.slug());
        body.put("label", resolved.label());
        body.put("columns", table.columns());
        body.put("totalRows", table.rowCount());
        body.put("rows", table.rows().stream().limit(PREVIEW_ROWS).map(this::toPreviewRow).toList());
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu xem trước thành công", body));
    }

    // ── Tải file ─────────────────────────────────────────────────────────────

    @GetMapping("/{dataset}")
    @Operation(summary = "Tải file xuất dữ liệu",
            description = "Xuất tập dữ liệu ra file Excel (.xlsx) hoặc CSV để tải về. Có thể lọc theo khoảng ngày, trạng thái và từ khoá")
    public ResponseEntity<byte[]> download(
            @PathVariable String dataset,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "xlsx") String format) {

        ExportDataset resolved = resolve(dataset);
        ExportTable table = exportDataService.collect(resolved, from, to, normalize(status), normalize(keyword));

        String formatLower = format == null ? "xlsx" : format.trim().toLowerCase();
        byte[] payload;
        String extension;
        String contentType;
        if ("csv".equals(formatLower)) {
            payload = exportFileWriter.toCsv(table);
            extension = "csv";
            contentType = "text/csv;charset=UTF-8";
        } else {
            payload = exportFileWriter.toXlsx(table, resolved.label());
            extension = "xlsx";
            contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        }

        String filename = buildFilename(resolved, extension);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(contentType));
        headers.setContentLength(payload.length);
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build());

        log.info("Xuất dữ liệu: dataset={} format={} rows={}", resolved.name(), extension, table.rowCount());
        return new ResponseEntity<>(payload, headers, HttpStatus.OK);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private ExportDataset resolve(String raw) {
        ExportDataset dataset = ExportDataset.fromSlug(raw);
        if (dataset == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tập dữ liệu không hợp lệ: " + raw);
        }
        return dataset;
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Map<String, Object> toPreviewRow(List<Object> row) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < row.size(); i++) {
            map.put(String.valueOf(i), String.valueOf(row.get(i)));
        }
        return map;
    }

    private String buildFilename(ExportDataset dataset, String extension) {
        return "journeygo_" + dataset.slug() + "_" + LocalDate.now() + "." + extension;
    }
}
