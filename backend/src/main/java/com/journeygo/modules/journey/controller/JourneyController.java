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

import java.math.BigDecimal;
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

    @GetMapping("/{id}/tasks/{taskId}/puzzle-clue")
    @Operation(summary = "Xem manh mối giải đố GPS Puzzle", description = "Lấy gợi ý và tọa độ vị trí thực địa để du khách đến giải mật mã tại di tích")
    public ResponseEntity<ApiResponse<PuzzleClueResponse>> getPuzzleClue(
            @PathVariable Long id,
            @PathVariable Long taskId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        PuzzleClueResponse response = journeyService.getPuzzleClue(id, taskId, userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy manh mối câu đố thành công", response));
    }

    @GetMapping("/{id}/tasks/{taskId}/questions")
    @Operation(summary = "Xem câu hỏi của nhiệm vụ",
            description = "Trả các câu hỏi (không kèm đáp án đúng). Nhiệm vụ cần vị trí chỉ mở câu hỏi khi gửi latitude/longitude trong bán kính của trạm, hoặc qrValue đúng mã QR của trạm; chưa tới nơi thì chỉ trả thông tin trạm với unlocked=false")
    public ResponseEntity<ApiResponse<TaskQuestionsResponse>> getTaskQuestions(
            @PathVariable Long id,
            @PathVariable Long taskId,
            @RequestParam(required = false) BigDecimal latitude,
            @RequestParam(required = false) BigDecimal longitude,
            @RequestParam(required = false) String qrValue,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        TaskQuestionsResponse response = journeyService.getTaskQuestions(id, taskId, userPrincipal.getId(), latitude, longitude, qrValue);
        String msg = response.unlocked()
                ? "Lấy câu hỏi nhiệm vụ thành công"
                : "Hãy đến đúng địa điểm hoặc quét mã QR để mở câu hỏi";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @PostMapping("/{id}/tasks/{taskId}/submit")
    @Operation(summary = "Nộp bài cả nhiệm vụ",
            description = "Nộp câu trả lời của mọi câu hỏi trong một lần. Đúng hết thì nhận trọn điểm nhiệm vụ (một lần); chưa đúng hết thì không có điểm và phải làm lại cả nhiệm vụ, mỗi lần nộp tính một lượt (maxAttempts)")
    public ResponseEntity<ApiResponse<JourneyTaskProgressResponse>> submitTask(
            @PathVariable Long id,
            @PathVariable Long taskId,
            @Valid @RequestBody SubmitTaskRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        JourneyTaskProgressResponse response = journeyService.submitTask(id, taskId, request, userPrincipal.getId());
        String msg;
        if (response.status() == com.journeygo.modules.journey.entity.enums.TaskProgressStatus.COMPLETED) {
            msg = "Chính xác! Bạn đã hoàn thành nhiệm vụ và nhận được điểm thưởng";
        } else if (Boolean.TRUE.equals(response.lastAnswerCorrect())) {
            msg = String.format("Chính xác! Hãy đến địa điểm tiếp theo để trả lời câu hỏi kế tiếp (%d/%d câu).",
                    response.questionIndex(), response.totalQuestions());
        } else if (response.totalQuestions() != null) {
            msg = String.format("Chưa đạt: đúng %d/%d câu. Cần trả lời đúng tất cả câu hỏi để nhận điểm. %s",
                    response.correctCount(), response.totalQuestions(),
                    response.attemptsRemaining() != null && response.attemptsRemaining() > 0
                            ? "Còn " + response.attemptsRemaining() + " lần làm lại nhiệm vụ."
                            : "Bạn đã hết số lần làm nhiệm vụ này.");
        } else {
            msg = "Chưa chính xác, hãy thử lại nhé!";
        }
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
