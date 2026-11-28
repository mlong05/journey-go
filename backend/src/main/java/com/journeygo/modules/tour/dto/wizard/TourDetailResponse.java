package com.journeygo.modules.tour.dto.wizard;

import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.QuestionType;
import com.journeygo.modules.tour.entity.StopQuestionKind;
import com.journeygo.modules.tour.entity.TourFormat;
import com.journeygo.modules.tour.entity.TourSlotStatus;
import com.journeygo.modules.tour.entity.VideoSource;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.entity.enums.TourVisibility;
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
        TourVisibility visibility,
        String specificUserEmail,
        Long tourRequestId,
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
        @Schema(description = "Lịch trình theo ngày (dạng chữ)") List<ItineraryDay> itinerary,
        @Schema(description = "Những thông tin cần lưu ý") String priceIncludes,
        String priceExcludes,
        String forceMajeure,
        String refundPolicy,
        String contactInfo,

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
        @Schema(description = "Giờ khởi hành (chữ tự do)") String departureTime,
        @Schema(description = "Địa điểm tập trung") String meetingPoint,
        @Schema(description = "Giờ đón và điểm đón") String pickupInfo,

        // Bước 5
        boolean contentRightsConfirmed,

        @Schema(description = "Lần kiểm duyệt gần nhất (kèm ghi chú khi bị yêu cầu chỉnh sửa / từ chối)") LatestReview latestReview
) {
    public record Ref(Long id, String name) {}

    public record Price(GuestType guestType, String label, String ageRange, BigDecimal price,
                        boolean countsTowardSlot, boolean alwaysFree) {}

    /** @param matchText câu nối cột: cột B ghép đúng với dòng này */
    public record Answer(Long id, String content, boolean correct, String imageUrl, String matchText) {
        public Answer(Long id, String content, boolean correct) {
            this(id, content, correct, null, null);
        }
    }

    /** Cặp ảnh xưa và nay của điểm đến. */
    public record ThenNow(Long id, String thenImageUrl, String nowImageUrl, String thenLabel, String caption,
                          String credit) {}

    /** Mốc thời gian lịch sử trong câu chuyện văn hóa. */
    public record TimelineItem(String period, String event) {}

    /** Thuật ngữ văn hóa & giải thích ngắn. */
    public record GlossaryItem(String term, String meaning) {}

    /** dayNumber bắt đầu từ 1. */
    public record ItineraryDay(int dayNumber, String title, String mainActivity, String content) {}

    public record Question(Long id, StopQuestionKind kind, QuestionType type, String content, Integer points,
                           List<Answer> answers, String referenceAnswer, String explanation,
                           Integer numberMin, Integer numberMax, Integer numberCorrect, Integer numberTolerance) {
        public Question(Long id, StopQuestionKind kind, QuestionType type, String content, Integer points,
                        List<Answer> answers, String referenceAnswer, String explanation) {
            this(id, kind, type, content, points, answers, referenceAnswer, explanation, null, null, null, null);
        }
    }

    public record Artifact(Long id, String name, String imageUrl, String shortDescription,
                           String videoUrl, VideoSource videoSource) {}

    public record Experience(Long id, String activityName, BigDecimal checkpointLatitude,
                             BigDecimal checkpointLongitude, Integer radiusMeters, Integer durationSeconds,
                             @Schema(description = "Mã QR xác nhận hoàn thành (in và dán tại điểm)") String qrToken,
                             Integer points, Question question) {}

    public record Stop(Long id, int sequenceOrder, String name, String shortDescription, String guestNote,
                       String imageUrl, String videoUrl, VideoSource videoSource,
                       String culturalContent, List<String> culturalImages,
                       List<Artifact> artifacts, List<Question> quiz, List<Experience> experiences,
                       @Schema(description = "Tổng điểm tối đa của điểm đến") int maxPoints,
                       @Schema(description = "Vĩ độ vị trí check-in trạm") BigDecimal latitude,
                       @Schema(description = "Kinh độ vị trí check-in trạm") BigDecimal longitude,
                       @Schema(description = "Bán kính check-in trạm (mét)") Integer checkInRadiusMeters,
                       @Schema(description = "Mã QR check-in trạm (chỉ đối tác / Moderator thấy)") String qrToken,
                       @Schema(description = "Ảnh xưa và nay") List<ThenNow> thenNow,
                       @Schema(description = "Điểm nhấn / Bạn có biết?") String funFact,
                       @Schema(description = "Dòng thời gian lịch sử") List<TimelineItem> timeline,
                       @Schema(description = "Từ điển thuật ngữ văn hóa") List<GlossaryItem> glossary) {
        public Stop(Long id, int sequenceOrder, String name, String shortDescription, String guestNote,
                    String imageUrl, String videoUrl, VideoSource videoSource,
                    String culturalContent, List<String> culturalImages,
                    List<Artifact> artifacts, List<Question> quiz, List<Experience> experiences, int maxPoints,
                    BigDecimal latitude, BigDecimal longitude, Integer checkInRadiusMeters, String qrToken) {
            this(id, sequenceOrder, name, shortDescription, guestNote, imageUrl, videoUrl, videoSource, culturalContent,
                    culturalImages, artifacts, quiz, experiences, maxPoints, latitude, longitude, checkInRadiusMeters,
                    qrToken, List.of(), null, List.of(), List.of());
        }

        public Stop(Long id, int sequenceOrder, String name, String shortDescription, String guestNote,
                    String imageUrl, String videoUrl, VideoSource videoSource,
                    String culturalContent, List<String> culturalImages,
                    List<Artifact> artifacts, List<Question> quiz, List<Experience> experiences, int maxPoints,
                    BigDecimal latitude, BigDecimal longitude, Integer checkInRadiusMeters, String qrToken,
                    List<ThenNow> thenNow) {
            this(id, sequenceOrder, name, shortDescription, guestNote, imageUrl, videoUrl, videoSource, culturalContent,
                    culturalImages, artifacts, quiz, experiences, maxPoints, latitude, longitude, checkInRadiusMeters,
                    qrToken, thenNow, null, List.of(), List.of());
        }
    }

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
