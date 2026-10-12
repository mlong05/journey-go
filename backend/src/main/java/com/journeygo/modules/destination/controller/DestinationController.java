package com.journeygo.modules.destination.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.destination.dto.DestinationRequest;
import com.journeygo.modules.destination.dto.DestinationResponse;
import com.journeygo.modules.destination.service.DestinationService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/destinations")
@RequiredArgsConstructor
@Tag(name = "Điểm đến (Destinations)", description = "Quản lý điểm đến du lịch")
public class DestinationController {

    private final DestinationService destinationService;

    @GetMapping
    @Operation(summary = "Lấy tất cả điểm đến", description = "Trả về danh sách tất cả điểm đến chưa bị xóa")
    public ResponseEntity<ApiResponse<List<DestinationResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách điểm đến thành công", destinationService.getAll()));
    }

    @GetMapping("/approved")
    @Operation(summary = "Lấy điểm đến đã duyệt", description = "Trả về danh sách điểm đến đã được phê duyệt")
    public ResponseEntity<ApiResponse<List<DestinationResponse>>> getApproved() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách điểm đến đã duyệt thành công", destinationService.getApproved()));
    }

    @GetMapping("/deleted")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy điểm đến đã xóa", description = "Trả về danh sách điểm đến đã bị xóa mềm (admin)")
    public ResponseEntity<ApiResponse<List<DestinationResponse>>> getDeleted() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách điểm đến đã xóa thành công", destinationService.getDeleted()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy điểm đến theo ID", description = "Trả về thông tin chi tiết một điểm đến")
    public ResponseEntity<ApiResponse<DestinationResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin điểm đến thành công", destinationService.getById(id)));
    }

    @PostMapping
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo điểm đến mới", description = "Tạo điểm đến mới, mặc định chưa được phê duyệt")
    public ResponseEntity<ApiResponse<DestinationResponse>> create(
            @Valid @RequestBody DestinationRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo điểm đến thành công", destinationService.create(request, userPrincipal.getId())));
    }

    @PutMapping("/{id}")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Cập nhật điểm đến", description = "Cập nhật thông tin điểm đến, tự động hủy phê duyệt")
    public ResponseEntity<ApiResponse<DestinationResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody DestinationRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật điểm đến thành công", destinationService.update(id, request)));
    }

    @PatchMapping("/{id}/approve")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Phê duyệt điểm đến", description = "Phê duyệt hoặc hủy phê duyệt điểm đến")
    public ResponseEntity<ApiResponse<DestinationResponse>> setApproval(
            @PathVariable Long id,
            @RequestParam boolean approved) {
        String message = approved ? "Phê duyệt điểm đến thành công" : "Hủy phê duyệt điểm đến thành công";
        return ResponseEntity.ok(ApiResponse.success(message, destinationService.setApproval(id, approved)));
    }

    @DeleteMapping("/{id}")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xóa điểm đến", description = "Xóa mềm điểm đến (không xóa khỏi database)")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        destinationService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa điểm đến thành công"));
    }

    @PatchMapping("/{id}/restore")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Khôi phục điểm đến", description = "Khôi phục điểm đến đã bị xóa mềm, tự động hủy phê duyệt")
    public ResponseEntity<ApiResponse<DestinationResponse>> restore(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Khôi phục điểm đến thành công", destinationService.restore(id)));
    }
}
