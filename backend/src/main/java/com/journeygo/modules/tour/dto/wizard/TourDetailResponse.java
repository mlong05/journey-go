package com.journeygo.modules.tour.dto.wizard;

import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.QuestionType;
import com.journeygo.modules.tour.entity.StopQuestionKind;
import com.journeygo.modules.tour.entity.TourFormat;
import com.journeygo.modules.tour.entity.TourSlotStatus;
import com.journeygo.modules.tour.entity.VideoSource;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Toàn bộ dữ liệu một tour của luồng 5 bước — dùng cho màn hình tạo/sửa (đối tác),
 * trang Xem lại (bước 5) và màn hình Moderator kiểm duyệt.
 */
@Builder
@Schema(description = "Chi tiết tour (luồng tạo tour 5 bước)")
public record TourDetailResponse(
        Long tourId,
        TourStatus status,
        int versionNumber,
        String createdByName,
        Long createdById,
        Instant createdAt,
        @Schema(description = "Thời điểm lưu gần nhất — hiển thị \"Đã lưu lúc hh:mm\"") Instant updatedAt,
        Instant submittedAt,
        Instant publishedAt,

        // Bước 1
        String title,
        TourFormat tourFormat,
        Integer durationMinutes,
        Integer durationDays,
        Integer durationNights,
        Ref region,
        Ref theme,
        String description,
        List<String> highlights,
        List<String> images,
        String coverImageUrl,

        // Bước 2
        List<Price> prices,
        Integer maxGuestsPerSlot,
        String cancellationPolicy,

        // Bước 3
        List<Stop> stops,
        @Schema(description = "Điểm thưởng (đối tác chỉ xem, không sửa)") RewardPoints rewardPoints,

        // Bước 4
        List<LocalDate> departureDates,
        @Schema(description = "Slot đã sinh (sau khi duyệt)") List<Slot> slots,

        // Bước 5
        boolean contentRightsConfirmed,

        @Schema(description = "Lần kiểm duyệt gần nhất (kèm ghi chú khi bị yêu cầu chỉnh sửa / từ chối)") LatestReview latestReview
) {
    public record Ref(Long id, String name) {}

    public record Price(GuestType guestType, String label, String ageRange, BigDecimal price,
                        boolean countsTowardSlot, boolean alwaysFree) {}

    public record Answer(Long id, String content, boolean correct) {}

    public record Question(Long id, StopQuestionKind kind, QuestionType type, String content, Integer points,
                           List<Answer> answers, String referenceAnswer) {}

    public record Artifact(Long id, String name, String imageUrl, String shortDescription,
                           String videoUrl, VideoSource videoSource) {}

    public record Experience(Long id, String activityName, BigDecimal checkpointLatitude,
                             BigDecimal checkpointLongitude, Integer radiusMeters, Integer durationSeconds,
                             Integer points, Question question) {}

    public record Stop(Long id, int sequenceOrder, String name, String shortDescription, String guestNote,
                       String imageUrl, String videoUrl, VideoSource videoSource,
                       String culturalContent, List<String> culturalImages,
                       List<Artifact> artifacts, List<Question> quiz, List<Experience> experiences,
                       @Schema(description = "Tổng điểm tối đa của điểm đến") int maxPoints) {}

    /**
     * @param snapshot true = điểm đã chốt lúc duyệt; false = đang hiển thị theo cấu hình Admin hiện hành
     */
    public record RewardPoints(int quizPerQuestion, int perExperience, int maxTotalPoints, boolean snapshot) {}

    public record Slot(Long id, LocalDate slotDate, int capacity, int bookedCount, TourSlotStatus status) {}

    public record Note(Long id, String step, Long stopId, String field, String note, Instant createdAt) {}

    public record LatestReview(Long reviewId, String status, Integer tourVersion, String reviewerName,
                               String decisionNote, String reason, String otherReason,
                               Instant submittedAt, Instant reviewedAt, List<Note> notes) {}
}
