package com.journeygo.modules.tour.service;

import com.journeygo.modules.moderation.entity.TourReview;
import com.journeygo.modules.moderation.repository.TourReviewRepository;
import com.journeygo.modules.reward.entity.RewardSettingCode;
import com.journeygo.modules.reward.service.RewardSettingService;
import com.journeygo.modules.tour.dto.wizard.TourDetailResponse;
import com.journeygo.modules.tour.entity.*;
import com.journeygo.modules.tour.repository.TourSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Dựng {@link TourDetailResponse} từ entity (cần chạy trong transaction vì đọc các quan hệ LAZY). */
@Component
@RequiredArgsConstructor
public class TourDetailMapper {

    private final RewardSettingService rewardSettingService;
    private final TourReviewRepository reviewRepository;
    private final TourSlotRepository slotRepository;

    @Transactional(readOnly = true)
    public TourDetailResponse toResponse(Tour tour) {
        int quizPoints = rewardSettingService.pointsFor(RewardSettingCode.QUIZ_QUESTION);
        int experiencePoints = rewardSettingService.pointsFor(RewardSettingCode.REAL_WORLD_EXPERIENCE);
        boolean snapshot = tour.getPublishedAt() != null;

        List<TourDetailResponse.Stop> stops = new ArrayList<>();
        int maxTotal = 0;
        for (TourStop stop : tour.getStops()) {
            TourDetailResponse.Stop mapped = toStop(stop, quizPoints, experiencePoints);
            maxTotal += mapped.maxPoints();
            stops.add(mapped);
        }

        return TourDetailResponse.builder()
                .tourId(tour.getTourId())
                .status(tour.getStatus())
                .versionNumber(tour.getVersionNumber())
                .createdById(tour.getCreatedBy() != null ? tour.getCreatedBy().getId() : null)
                .createdByName(tour.getCreatedBy() != null ? tour.getCreatedBy().getFullName() : null)
                .createdAt(tour.getCreatedAt())
                .updatedAt(tour.getUpdatedAt())
                .submittedAt(tour.getSubmittedAt())
                .publishedAt(tour.getPublishedAt())
                .title(tour.getTitle())
                .tourFormat(tour.getTourFormat())
                .durationMinutes(tour.getDurationMinutes())
                .durationDays(tour.getTourFormat() == TourFormat.MULTI_DAY ? tour.getDurationDays() : null)
                .durationNights(tour.getDurationNights())
                .region(tour.getRegion() == null ? null
                        : new TourDetailResponse.Ref(tour.getRegion().getId(), tour.getRegion().getName()))
                .theme(tour.getTheme() == null ? null
                        : new TourDetailResponse.Ref(tour.getTheme().getId(), tour.getTheme().getName()))
                .description(tour.getDescription())
                .highlights(List.copyOf(tour.getHighlights()))
                .itinerary(java.util.stream.IntStream.range(0, tour.getItinerary().size())
                        .mapToObj(i -> {
                            // Ngày bỏ trống hoàn toàn: Hibernate không lưu dòng → nạp lại thành null.
                            var d = tour.getItinerary().get(i);
                            return d == null
                                    ? new TourDetailResponse.ItineraryDay(i + 1, null, null, null)
                                    : new TourDetailResponse.ItineraryDay(i + 1, d.getTitle(), d.getMainActivity(), d.getContent());
                        })
                        .toList())
                .priceIncludes(tour.getPriceIncludes())
                .priceExcludes(tour.getPriceExcludes())
                .forceMajeure(tour.getForceMajeure())
                .contactInfo(tour.getContactInfo())
                .images(List.copyOf(tour.getImages()))
                .coverImageUrl(tour.getCoverImageUrl())
                .prices(toPrices(tour))
                .maxGuestsPerSlot(tour.getMaxGuestsPerSlot())
                .cancellationPolicy(tour.getCancellationPolicy())
                .stops(stops)
                .rewardPoints(new TourDetailResponse.RewardPoints(quizPoints, experiencePoints, maxTotal, snapshot))
                .departureDates(tour.getDepartureDates().stream().map(TourDepartureDate::getDepartureDate).sorted().toList())
                .slots(slotRepository.findByTour_TourIdOrderBySlotDateAsc(tour.getTourId()).stream()
                        .map(s -> new TourDetailResponse.Slot(s.getId(), s.getSlotDate(), s.getCapacity(),
                                s.getBookedCount(), s.getStatus()))
                        .toList())
                .contentRightsConfirmed(tour.isContentRightsConfirmed())
                .latestReview(reviewRepository.findByTour_TourId(tour.getTourId()).map(this::toLatestReview).orElse(null))
                .build();
    }

    /** Luôn trả đủ 4 loại khách (loại chưa nhập giá thì price = null) để frontend dựng bảng cố định. */
    private List<TourDetailResponse.Price> toPrices(Tour tour) {
        List<TourDetailResponse.Price> result = new ArrayList<>();
        for (GuestType type : GuestType.values()) {
            TourPrice price = tour.getPrices().stream()
                    .filter(p -> p.getGuestType() == type).findFirst().orElse(null);
            result.add(new TourDetailResponse.Price(type, type.getLabel(), type.getAgeRange(),
                    price == null ? null : price.getPrice(),
                    price != null && price.isCountsTowardSlot(),
                    type.isAlwaysFree()));
        }
        return result;
    }

    private TourDetailResponse.Stop toStop(TourStop stop, int quizPoints, int experiencePoints) {
        List<TourDetailResponse.Question> quiz = stop.getQuizQuestions().stream()
                .sorted(Comparator.comparingInt(TourStopQuestion::getSequenceOrder))
                .map(q -> toQuestion(q, q.getPointsReward() != null ? q.getPointsReward() : quizPoints))
                .toList();
        List<TourDetailResponse.Experience> experiences = stop.getExperiences().stream()
                .sorted(Comparator.comparingInt(TourStopExperience::getSequenceOrder))
                .map(e -> new TourDetailResponse.Experience(e.getId(), e.getActivityName(),
                        e.getCheckpointLatitude(), e.getCheckpointLongitude(), e.getRadiusMeters(),
                        e.getDurationSeconds(),
                        e.getPointsReward() != null ? e.getPointsReward() : experiencePoints,
                        e.getQuestion() == null ? null : toQuestion(e.getQuestion(), null)))
                .toList();
        int maxPoints = quiz.stream().mapToInt(q -> q.points() == null ? 0 : q.points()).sum()
                + experiences.stream().mapToInt(e -> e.points() == null ? 0 : e.points()).sum();
        return new TourDetailResponse.Stop(stop.getId(), stop.getSequenceOrder(), stop.getName(),
                stop.getShortDescription(), stop.getGuestNote(), stop.getImageUrl(),
                stop.getVideoUrl(), stop.getVideoSource(), stop.getCulturalContent(),
                List.copyOf(stop.getCulturalImages()),
                stop.getArtifacts().stream()
                        .sorted(Comparator.comparingInt(TourStopArtifact::getSequenceOrder))
                        .map(a -> new TourDetailResponse.Artifact(a.getId(), a.getName(), a.getImageUrl(),
                                a.getShortDescription(), a.getVideoUrl(), a.getVideoSource()))
                        .toList(),
                quiz, experiences, maxPoints);
    }

    private TourDetailResponse.Question toQuestion(TourStopQuestion q, Integer points) {
        return new TourDetailResponse.Question(q.getId(), q.getKind(), q.getQuestionType(), q.getContent(), points,
                q.getAnswers().stream()
                        .sorted(Comparator.comparingInt(TourStopAnswer::getSequenceOrder))
                        .map(a -> new TourDetailResponse.Answer(a.getId(), a.getContent(), a.isCorrect()))
                        .toList(),
                q.getReferenceAnswer());
    }

    private TourDetailResponse.LatestReview toLatestReview(TourReview review) {
        return new TourDetailResponse.LatestReview(review.getId(), review.getStatus().name(), review.getTourVersion(),
                review.getReviewer() != null ? review.getReviewer().getFullName() : null,
                review.getDecisionNote(), review.getReason(), review.getOtherReason(),
                review.getSubmittedAt(), review.getReviewedAt(),
                review.getNotes().stream()
                        .map(n -> new TourDetailResponse.Note(n.getId(), n.getStep().name(), n.getStopId(),
                                n.getField(), n.getNote(), n.getCreatedAt()))
                        .toList());
    }
}
