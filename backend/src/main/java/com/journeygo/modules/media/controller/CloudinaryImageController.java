package com.journeygo.modules.media.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.media.dto.CloudinaryUploadSignatureResponse;
import com.journeygo.modules.media.service.CloudinaryImageService;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/media/cloudinary")
@RequiredArgsConstructor
@Tag(name = "Cloudinary media")
@SecurityRequirement(name = "Bearer Authentication")
public class CloudinaryImageController {
    private final CloudinaryImageService cloudinaryImageService;

    @PostMapping("/signature")
    @PreAuthorize("hasAnyRole('CONTENT_MODERATOR', 'CONTENT_PROVIDER')")
    public ResponseEntity<ApiResponse<CloudinaryUploadSignatureResponse>> createSignature(
            @RequestParam Long destinationId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Role role = Role.valueOf(principal.getAuthorities().iterator().next().getAuthority().replace("ROLE_", ""));
        return ResponseEntity.ok(ApiResponse.success("Tạo chữ ký upload ảnh thành công",
                cloudinaryImageService.createUploadSignature(destinationId, principal.getId(), role)));
    }
}
