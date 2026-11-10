package com.journeygo.modules.tour.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.tour.importer.TourImportService;
import com.journeygo.modules.tour.importer.dto.TourImportResult;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;

/**
 * Đối tác nhập tour từ file Excel: tải file mẫu → kiểm tra → tạo bản nháp.
 * Bản nháp tạo ra đi tiếp luồng 5 bước bình thường (sửa trong wizard, gửi duyệt).
 */
@RestController
@RequestMapping("/api/v1/provider/tours/import")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CONTENT_PROVIDER')")
@Tag(name = "Đối tác – Nhập tour từ Excel")
@SecurityRequirement(name = "Bearer Authentication")
public class ProviderTourImportController {

    private static final MediaType XLSX =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final TourImportService service;

    @GetMapping("/template")
    @Operation(summary = "Tải file mẫu (.xlsx)",
            description = "Danh sách khu vực / chủ đề lấy theo hệ thống lúc tải. sample=true: file đã điền sẵn một tour ví dụ")
    public ResponseEntity<byte[]> template(
            @Parameter(description = "true = file ví dụ đã điền sẵn") @RequestParam(defaultValue = "false") boolean sample) {
        String filename = sample ? "vi-du-nhap-tour.xlsx" : "mau-nhap-tour.xlsx";
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build().toString())
                .body(service.template(sample));
    }

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Kiểm tra file (không lưu)",
            description = "Trả về tóm tắt, lỗi chặn {sheet, row, column, message} và cảnh báo (mục còn thiếu để gửi duyệt)")
    public ResponseEntity<ApiResponse<TourImportResult>> preview(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) {
        TourImportResult result = service.preview(file, principal.getId());
        return ResponseEntity.ok(ApiResponse.success(
                result.valid() ? "File hợp lệ" : "File còn lỗi, vui lòng sửa và tải lên lại", result));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tạo bản nháp tour từ file",
            description = "Thành công: HTTP 201, data.tourId = bản nháp mới. File còn lỗi: HTTP 400, data = kết quả kiểm tra, không lưu gì")
    public ResponseEntity<ApiResponse<TourImportResult>> importTour(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) {
        TourImportResult result = service.importTour(file, principal.getId());
        if (!result.valid()) {
            return ResponseEntity.badRequest().body(ApiResponse.<TourImportResult>builder()
                    .code(HttpStatus.BAD_REQUEST.value())
                    .message("File còn lỗi, vui lòng sửa và tải lên lại")
                    .data(result)
                    .build());
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã tạo bản nháp tour từ file Excel", result));
    }
}
