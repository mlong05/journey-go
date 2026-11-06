package com.journeygo.modules.experience.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.experience.dto.request.CheckInRequest;
import com.journeygo.modules.experience.dto.response.UserCheckInResponse;
import com.journeygo.modules.experience.service.UserCheckInPointService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "UserCheckInPoint", description = "Check-in vi mô của Tourist tại CheckInPoint")
public class UserCheckInPointController {

    private final UserCheckInPointService userCheckInPointService;


    @PostMapping("/check-in-points/{id}/check-in")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('TOURIST', 'ADMIN')")
    @Operation(summary = "Tourist check-in tại CheckInPoint",
            description = "GPS: gửi latitude/longitude; QR: gửi qrValue; MANUAL: admin duyệt")
    public ResponseEntity<ApiResponse<UserCheckInResponse>> checkIn(
            @PathVariable Long id,
            @Valid @RequestBody CheckInRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        UserCheckInResponse r = userCheckInPointService.checkIn(id, request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Check-in thành công", r));
    }


    @GetMapping("/me/check-in-points")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('TOURIST', 'ADMIN')")
    @Operation(summary = "Lịch sử check-in của tôi (lấy từ JWT)")
    public ResponseEntity<ApiResponse<List<UserCheckInResponse>>> myHistory(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                userCheckInPointService.listByUser(principal.getId())));
    }


    @GetMapping("/me/experiences/{experienceId}/check-in-points")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('TOURIST', 'ADMIN')")
    @Operation(summary = "Check-in của tôi theo Experience (lấy từ JWT)")
    public ResponseEntity<ApiResponse<List<UserCheckInResponse>>> myHistoryByExperience(
            @PathVariable Long experienceId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                userCheckInPointService.listByUserAndExperience(principal.getId(), experienceId)));
    }
}
