package com.journeygo.modules.journey.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.journey.dto.*;
import com.journeygo.modules.journey.entity.enums.JourneyStatus;
import com.journeygo.modules.journey.service.JourneyService;
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
@RequestMapping("/api/v1/journeys")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Hành trình trải nghiệm (Tourist Journey)", description = "Các API dẫn đường, check-in GPS, làm nhiệm vụ và theo dõi tiến độ hành trình du lịch thực tế")
public class JourneyController {

    private final JourneyService journeyService;

    @PostMapping
    @Operation(summary = "Bắt đầu chuyến đi mới", description = "Khởi tạo phiên hành trình thực tế cho du khách từ đơn đặt tour")
    public ResponseEntity<ApiResponse<JourneyResponse>> startJourney(
            @Valid @RequestBody StartJourneyRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        JourneyResponse response = journeyService.startJourney(userPrincipal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Bắt đầu chuyến đi thành công", response));
    }

    @GetMapping("/my")
    @Operation(summary = "Lấy danh sách chuyến đi của tôi", description = "Trả về lịch sử hoặc các chuyến đi đang diễn ra của du khách")
    public ResponseEntity<ApiResponse<List<JourneyResponse>>> getMyJourneys(
            @RequestParam(required = false) JourneyStatus status,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        List<JourneyResponse> list = journeyService.getMyJourneys(userPrincipal.getId(), status);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách chuyến đi thành công", list));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết tiến độ chuyến đi", description = "Trả về chi tiết trạng thái từng điểm đến và nhiệm vụ trong chuyến đi")
    public ResponseEntity<ApiResponse<JourneyResponse>> getJourneyDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        JourneyResponse response = journeyService.getJourneyDetail(id, userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin tiến độ chuyến đi thành công", response));
    }

    @PostMapping("/{id}/destinations/{destinationId}/check-in")
    @Operation(summary = "Check-in GPS tại điểm đến", description = "Xác thực vị trí GPS của du khách tại điểm di tích và tự động cấp huy hiệu di sản")
    public ResponseEntity<ApiResponse<CheckInResultResponse>> checkInDestination(
            @PathVariable Long id,
            @PathVariable Long destinationId,
            @Valid @RequestBody CheckInJourneyRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        CheckInResultResponse result = journeyService.checkInDestination(id, destinationId, request, userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success(result.message(), result));
    }

    @PostMapping("/{id}/tasks/{taskId}/submit")
    @Operation(summary = "Nộp bài nhiệm vụ (Quiz hoặc GPS Puzzle)", description = "Chấm điểm câu trả lời trắc nghiệm hoặc đáp án giải đố thực địa và cộng điểm tích lũy")
    public ResponseEntity<ApiResponse<JourneyTaskProgressResponse>> submitTask(
            @PathVariable Long id,
            @PathVariable Long taskId,
            @Valid @RequestBody SubmitTaskRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        JourneyTaskProgressResponse response = journeyService.submitTask(id, taskId, request, userPrincipal.getId());
        String msg = Boolean.TRUE.equals(response.isCorrect())
                ? "Chính xác! Bạn đã hoàn thành nhiệm vụ và nhận được điểm thưởng"
                : "Chưa chính xác, hãy thử lại nhé!";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PatchMapping("/{id}/destinations/{destinationId}/skip")
    @Operation(summary = "Bỏ qua điểm đến", description = "Bỏ qua điểm đến khi du khách bị nhỡ lịch hẹn để tiếp tục hành trình")
    public ResponseEntity<ApiResponse<JourneyDestinationProgressResponse>> skipDestination(
            @PathVariable Long id,
            @PathVariable Long destinationId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        JourneyDestinationProgressResponse response = journeyService.skipDestination(id, destinationId, userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success("Đã bỏ qua điểm đến này thành công", response));
    }
}
