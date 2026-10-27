package com.journeygo.modules.content.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.content.dto.CulturalContentRequest;
import com.journeygo.modules.content.dto.CulturalContentResponse;
import com.journeygo.modules.content.service.CulturalContentService;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.servlet.http.Part;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Nội dung văn hóa (Cultural Contents)", description = "Quản lý nội dung văn hóa, câu chuyện, thuyết minh đa phương tiện")
public class CulturalContentController {

    private final CulturalContentService culturalContentService;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    // ── Public endpoints ──────────────────────────────────────────────────────

    @GetMapping("/api/v1/cultural-contents/approved")
    @Operation(summary = "Lấy toàn bộ cultural content đã được duyệt",
            description = "Chỉ trả về nội dung chưa bị xóa và đã được duyệt; nội dung cũ chưa có bản ghi kiểm duyệt vẫn được xem là công khai")
    public ResponseEntity<ApiResponse<List<CulturalContentResponse>>> getAllApproved() {
        return ResponseEntity.ok(ApiResponse.success("Lấy toàn bộ nội dung văn hóa đã duyệt thành công",
                culturalContentService.getAllApproved()));
    }

    @GetMapping("/api/v1/destinations/{destinationId}/contents")
    @Operation(summary = "Lấy danh sách nội dung văn hóa của điểm đến",
            description = "Trả về danh sách nội dung được sắp xếp theo thứ tự (sequenceOrder)")
    public ResponseEntity<ApiResponse<List<CulturalContentResponse>>> getByDestination(@PathVariable Long destinationId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách nội dung văn hóa thành công",
                culturalContentService.getByDestinationId(destinationId)));
    }

    @GetMapping("/api/v1/cultural-contents/{id}")
    @Operation(summary = "Lấy chi tiết một nội dung văn hóa theo ID")
    public ResponseEntity<ApiResponse<CulturalContentResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin nội dung văn hóa thành công",
                culturalContentService.getById(id)));
    }

    @GetMapping("/api/v1/cultural-contents/{id}/play")
    @Operation(summary = "Phát / xem nội dung (play)",
            description = "Tăng lượt phát (playCount) và trả về thông tin đa phương tiện để phát trực tiếp")
    public ResponseEntity<ApiResponse<CulturalContentResponse>> play(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Phát nội dung văn hóa thành công",
                culturalContentService.play(id)));
    }

    // ── Protected endpoints (Admin / Moderator / Provider) ────────────────────

    @PostMapping("/api/v1/destinations/{destinationId}/contents")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo nội dung văn hóa mới cho điểm đến",
            description = "PROVIDER chỉ được thêm nội dung vào điểm đến của chính mình")
    public ResponseEntity<ApiResponse<CulturalContentResponse>> create(
            @PathVariable Long destinationId,
            @Valid @RequestBody CulturalContentRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo nội dung văn hóa thành công",
                        culturalContentService.create(destinationId, request, userPrincipal.getId(), callerRole)));
    }

    @PostMapping(value = "/api/v1/destinations/{destinationId}/contents/with-image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo cultural content và tải ảnh cùng lúc",
            description = "Gửi multipart/form-data gồm phần content (JSON) và image (file ảnh); backend tải ảnh lên Cloudinary rồi tạo content ở trạng thái chờ kiểm duyệt",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true,
                    content = @io.swagger.v3.oas.annotations.media.Content(
                            mediaType = MediaType.MULTIPART_FORM_DATA_VALUE,
                            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.journeygo.modules.content.dto.CulturalContentWithImageForm.class),
                            encoding = {
                                    @io.swagger.v3.oas.annotations.media.Encoding(name = "content", contentType = MediaType.APPLICATION_JSON_VALUE),
                                    @io.swagger.v3.oas.annotations.media.Encoding(name = "image", contentType = "image/*")
                            })))
    public ResponseEntity<ApiResponse<CulturalContentResponse>> createWithImage(
            @PathVariable Long destinationId,
            @RequestPart("content") Part contentPart,
            @RequestPart("image") MultipartFile image,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        CulturalContentRequest request = parseContentPart(contentPart);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo nội dung và tải ảnh thành công; nội dung đang chờ kiểm duyệt",
                        culturalContentService.createWithImage(destinationId, request, image,
                                userPrincipal.getId(), callerRole)));
    }

    @PostMapping(value = "/api/v1/destinations/{destinationId}/contents/with-image-url",
            consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo cultural content bằng JSON với ảnh đã có URL",
            description = "Dùng khi ảnh đã được tải lên Cloudinary; gửi mediaUrl và mediaPublicId trong JSON")
    public ResponseEntity<ApiResponse<CulturalContentResponse>> createWithImageJson(
            @PathVariable Long destinationId,
            @Valid @RequestBody CulturalContentRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo nội dung thành công; nội dung đang chờ kiểm duyệt",
                        culturalContentService.create(destinationId, request, userPrincipal.getId(), callerRole)));
    }

    @PutMapping("/api/v1/cultural-contents/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Cập nhật nội dung văn hóa",
            description = "PROVIDER chỉ được sửa nội dung thuộc điểm đến của mình")
    public ResponseEntity<ApiResponse<CulturalContentResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody CulturalContentRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật nội dung văn hóa thành công",
                culturalContentService.update(id, request, userPrincipal.getId(), callerRole)));
    }

    @PutMapping(value = "/api/v1/cultural-contents/{id}/with-image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Cập nhật cultural content và thay ảnh cùng lúc",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true,
                    content = @io.swagger.v3.oas.annotations.media.Content(
                            mediaType = MediaType.MULTIPART_FORM_DATA_VALUE,
                            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = com.journeygo.modules.content.dto.CulturalContentWithImageForm.class),
                            encoding = {
                                    @io.swagger.v3.oas.annotations.media.Encoding(name = "content", contentType = MediaType.APPLICATION_JSON_VALUE),
                                    @io.swagger.v3.oas.annotations.media.Encoding(name = "image", contentType = "image/*")
                            })))
    public ResponseEntity<ApiResponse<CulturalContentResponse>> updateWithImage(
            @PathVariable Long id,
            @RequestPart("content") Part contentPart,
            @RequestPart("image") MultipartFile image,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        CulturalContentRequest request = parseContentPart(contentPart);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật nội dung và ảnh thành công; nội dung đang chờ kiểm duyệt",
                culturalContentService.updateWithImage(id, request, image, userPrincipal.getId(), callerRole)));
    }

    private CulturalContentRequest parseContentPart(Part contentPart) {
        try {
            String json = new String(contentPart.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            CulturalContentRequest request = objectMapper.readValue(json, CulturalContentRequest.class);
            var violations = validator.validate(request);
            if (!violations.isEmpty()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, violations.iterator().next().getMessage());
            }
            return request;
        } catch (IOException exception) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Không đọc được phần JSON content trong multipart request");
        }
    }

    @DeleteMapping("/api/v1/cultural-contents/{id}/image")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Gỡ ảnh khỏi nội dung văn hóa", description = "Xóa ảnh Cloudinary đang gắn với nội dung; nội dung được gửi kiểm duyệt lại")
    public ResponseEntity<ApiResponse<CulturalContentResponse>> removeImage(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        return ResponseEntity.ok(ApiResponse.success("Đã gỡ ảnh khỏi nội dung văn hóa",
                culturalContentService.removeImage(id, userPrincipal.getId(), callerRole)));
    }

    @DeleteMapping("/api/v1/cultural-contents/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xóa mềm nội dung văn hóa",
            description = "PROVIDER chỉ được xóa nội dung thuộc điểm đến của mình")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        culturalContentService.delete(id, userPrincipal.getId(), callerRole);
        return ResponseEntity.ok(ApiResponse.success("Xóa mềm nội dung văn hóa thành công"));
    }

    @PatchMapping("/api/v1/cultural-contents/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Khôi phục nội dung văn hóa đã xóa mềm",
            description = "Khôi phục nội dung văn hóa bị xóa mềm")
    public ResponseEntity<ApiResponse<CulturalContentResponse>> restore(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        return ResponseEntity.ok(ApiResponse.success("Khôi phục nội dung văn hóa thành công",
                culturalContentService.restore(id, userPrincipal.getId(), callerRole)));
    }

    @GetMapping("/api/v1/destinations/{destinationId}/contents/manage")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy toàn bộ nội dung văn hóa của điểm đến để quản lý",
            description = "Gồm cả nội dung đang chờ duyệt hoặc bị từ chối; PROVIDER chỉ xem được điểm đến của chính mình")
    public ResponseEntity<ApiResponse<List<CulturalContentResponse>>> getForManagement(
            @PathVariable Long destinationId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách nội dung văn hóa thành công",
                culturalContentService.getManageByDestinationId(destinationId, userPrincipal.getId(), callerRole)));
    }

    @GetMapping("/api/v1/destinations/{destinationId}/contents/deleted")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PROVIDER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy danh sách nội dung văn hóa đã bị xóa mềm",
            description = "Trả về danh sách nội dung văn hóa đã bị xóa mềm của điểm đến")
    public ResponseEntity<ApiResponse<List<CulturalContentResponse>>> getDeleted(
            @PathVariable Long destinationId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Role callerRole = extractRole(userPrincipal);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách nội dung văn hóa đã xóa thành công",
                culturalContentService.getDeletedByDestinationId(destinationId, userPrincipal.getId(), callerRole)));
    }

    private Role extractRole(UserPrincipal userPrincipal) {
        return Role.valueOf(
                userPrincipal.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "")
        );
    }
}
