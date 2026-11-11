package com.journeygo.modules.tour.dto;

import com.journeygo.modules.tour.dto.wizard.TourDetailResponse;
import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.TourFormat;
import com.journeygo.modules.tour.entity.VideoSource;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

/**
 * Chi tiết tour cho du khách (trang chi tiết trên mobile/web).
 *
 * <p>Chỉ chứa thông tin công khai: KHÔNG có đáp án quiz, đáp án tự luận, mã QR của hoạt động
 * hay ghi chú kiểm duyệt. Tour luồng cũ ({@code wizardTour = false}) chỉ có phần thông tin chung.
 */
@Builder
@Schema(description = "Chi tiết tour công khai cho du khách")
public record TourPublicDetailResponse(
        Long tourId,
        String title,
        @Schema(description = "true = tour tạo theo luồng 5 bước (có điểm dừng, lịch trình, bảng giá)") boolean wizardTour,
        TourFormat tourFormat,
        Integer durationMinutes,
        Integer durationDays,
        Integer durationNights,
        TourDetailResponse.Ref region,
        TourDetailResponse.Ref theme,
        String providerName,
        @Schema(description = "ID nhà tour — dùng để mở chat hỗ trợ trước khi mua tour") Long providerId,
        String description,
        List<String> highlights,
        @Schema(description = "Ảnh bìa đứng đầu, sau đó là album ảnh của tour") List<String> images,
        String coverImageUrl,
        List<TourDetailResponse.ItineraryDay> itinerary,
        String priceIncludes,
        String priceExcludes,
        String forceMajeure,
        String refundPolicy,
        String cancellationPolicy,
        String contactInfo,
        @Schema(description = "Giá hiển thị (giá người lớn với tour 5 bước)") BigDecimal price,
        @Schema(description = "Bảng giá theo loại khách — chỉ để hiển thị") List<Price> prices,
        Integer maxGuestsPerSlot,
        @Schema(description = "Ngày khởi hành từ hôm nay trở đi") List<LocalDate> upcomingDepartureDates,
        List<Stop> stops,
        @Schema(description = "Tổng số nhiệm vụ (câu quiz + hoạt động thực địa)") int taskCount,
        @Schema(description = "Tổng điểm thưởng tối đa") int totalPoints
) {
    public record Price(GuestType guestType, String label, String ageRange, BigDecimal price,
                        boolean alwaysFree, boolean countsTowardSlot) {}

    /** Hoạt động thực địa: tên, thời lượng và điểm. Không có mã QR hay câu hỏi kèm đáp án. */
    public record Activity(String activityName, Integer durationSeconds, Integer points) {}

    public record Stop(Long id, int sequenceOrder, String name, String shortDescription, String guestNote,
                       String imageUrl, String videoUrl, VideoSource videoSource,
                       String culturalContent, List<String> culturalImages,
                       List<TourDetailResponse.Artifact> artifacts,
                       @Schema(description = "Số câu quiz tại điểm dừng") int quizCount,
                       List<Activity> activities,
                       @Schema(description = "Toạ độ checkpoint đầu tiên có toạ độ (để vẽ bản đồ)") BigDecimal latitude,
                       BigDecimal longitude,
                       int maxPoints) {}

    /** Lọc dữ liệu của luồng 5 bước xuống phần công khai. */
    public static TourPublicDetailResponse fromWizard(TourDetailResponse d, BigDecimal price, LocalDate today) {
        List<Stop> stops = d.stops().stream().map(TourPublicDetailResponse::toStop).toList();
        int taskCount = stops.stream().mapToInt(s -> s.quizCount() + s.activities().size()).sum();
        List<String> images = new java.util.ArrayList<>();
        if (d.coverImageUrl() != null && !d.coverImageUrl().isBlank()) images.add(d.coverImageUrl());
        d.images().stream().filter(url -> !images.contains(url)).forEach(images::add);
        return TourPublicDetailResponse.builder()
                .tourId(d.tourId())
                .title(d.title())
                .wizardTour(true)
                .tourFormat(d.tourFormat())
                .durationMinutes(d.durationMinutes())
                .durationDays(d.durationDays())
                .durationNights(d.durationNights())
                .region(d.region())
                .theme(d.theme())
                .providerName(d.createdByName())
                .providerId(d.createdById())
                .description(d.description())
                .highlights(d.highlights())
                .images(images)
                .coverImageUrl(d.coverImageUrl())
                // Bỏ những ngày đối tác để trống hoàn toàn
                .itinerary(d.itinerary().stream()
                        .filter(day -> day.title() != null || day.mainActivity() != null || day.content() != null)
                        .toList())
                .priceIncludes(d.priceIncludes())
                .priceExcludes(d.priceExcludes())
                .forceMajeure(d.forceMajeure())
                .refundPolicy(d.refundPolicy())
                .cancellationPolicy(d.cancellationPolicy())
                .contactInfo(d.contactInfo())
                .price(price)
                // Chỉ hiện loại khách đã có giá, hoặc luôn miễn phí (em bé)
                .prices(d.prices().stream()
                        .filter(p -> p.price() != null || p.alwaysFree())
                        .map(p -> new Price(p.guestType(), p.label(), p.ageRange(),
                                p.alwaysFree() ? BigDecimal.ZERO : p.price(), p.alwaysFree(),
                                // Em bé luôn không chiếm chỗ; các loại khác theo cấu hình đối tác.
                                p.alwaysFree() ? false : p.countsTowardSlot()))
                        .toList())
                .maxGuestsPerSlot(d.maxGuestsPerSlot())
                .upcomingDepartureDates(d.departureDates().stream().filter(day -> !day.isBefore(today)).toList())
                .stops(stops)
                .taskCount(taskCount)
                .totalPoints(stops.stream().mapToInt(Stop::maxPoints).sum())
                .build();
    }

    private static Stop toStop(TourDetailResponse.Stop s) {
        TourDetailResponse.Experience located = s.experiences().stream()
                .filter(e -> e.checkpointLatitude() != null && e.checkpointLongitude() != null)
                .findFirst().orElse(null);
        return new Stop(s.id(), s.sequenceOrder(), s.name(), s.shortDescription(), s.guestNote(),
                s.imageUrl(), s.videoUrl(), s.videoSource(), s.culturalContent(), s.culturalImages(),
                s.artifacts(), s.quiz().size(),
                s.experiences().stream()
                        .map(e -> new Activity(e.activityName(), e.durationSeconds(), e.points()))
                        .toList(),
                located == null ? null : located.checkpointLatitude(),
                located == null ? null : located.checkpointLongitude(),
                s.maxPoints());
    }

    /** Tour luồng cũ: chỉ có thông tin chung, điểm đến xem qua {@code GET /tours/{id}}. */
    public static TourPublicDetailResponse fromLegacy(TourResponse t) {
        return TourPublicDetailResponse.builder()
                .tourId(t.tourId())
                .title(t.title())
                .wizardTour(false)
                .durationDays(t.durationDays())
                .providerName(t.createdBy())
                .providerId(t.providerId())
                .highlights(List.of())
                .images(t.coverImageUrl() == null ? List.of() : List.of(t.coverImageUrl()))
                .coverImageUrl(t.coverImageUrl())
                .itinerary(List.of())
                .price(Objects.requireNonNullElse(t.price(), BigDecimal.ZERO))
                .prices(List.of())
                .upcomingDepartureDates(List.of())
                .stops(List.of())
                .taskCount(t.taskCount())
                .totalPoints(t.totalTaskPoints())
                .build();
    }
}
