package com.journeygo.common.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.service.CloudinaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/upload")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Upload Quản lý Tệp & Ảnh (Cloudinary)", description = "APIs tải ảnh lên dịch vụ Cloudinary")
public class UploadController {

    private final CloudinaryService cloudinaryService;

    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Tải ảnh lên Cloudinary", description = "Tải tệp ảnh trực tiếp lên Cloudinary và nhận lại URL an toàn (https)")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadImage(
            @Parameter(description = "Tệp hình ảnh cần tải lên (PNG, JPG, WEBP,...)")
            @RequestParam("file") MultipartFile file,
            @Parameter(description = "Thư mục lưu trữ trên Cloudinary (mặc định: journeygo/uploads)")
            @RequestParam(value = "folder", defaultValue = "journeygo/uploads") String folder
    ) {
        String imageUrl = cloudinaryService.uploadImage(file, folder);
        return ResponseEntity.ok(ApiResponse.success(
                "Tải ảnh lên thành công",
                Map.of(
                        "url", imageUrl,
                        "avatarUrl", imageUrl,
                        "avatar", imageUrl
                )
        ));
    }
}
