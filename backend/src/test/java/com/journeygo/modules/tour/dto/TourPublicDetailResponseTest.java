package com.journeygo.modules.tour.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.journeygo.modules.tour.dto.wizard.TourDetailResponse;
import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.QuestionType;
import com.journeygo.modules.tour.entity.StopQuestionKind;
import com.journeygo.modules.tour.entity.TourFormat;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TourPublicDetailResponseTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 9);

    private TourDetailResponse wizardDetail() {
        var quiz = new TourDetailResponse.Question(1L, StopQuestionKind.QUIZ, QuestionType.MULTIPLE_CHOICE,
                "Văn Miếu xây năm nào?", 10,
                List.of(new TourDetailResponse.Answer(11L, "1070", true),
                        new TourDetailResponse.Answer(12L, "1010", false)),
                null);
        var postQuestion = new TourDetailResponse.Question(2L, StopQuestionKind.POST_EXPERIENCE, QuestionType.TEXT,
                "Tên bia tiến sĩ đầu tiên?", null, List.of(), "SECRET-ANSWER");
        var experience = new TourDetailResponse.Experience(5L, "Tìm bia tiến sĩ",
                new BigDecimal("21.0293"), new BigDecimal("105.8356"), 50, 300,
                "JGE-0123456789ABCDEF", 20, postQuestion);
        var stop = new TourDetailResponse.Stop(7L, 1, "Văn Miếu", "Trường đại học đầu tiên", null,
                "https://img/stop.jpg", null, null, "SECRET-CULTURE-STORY", List.of("https://img/culture-1.jpg"),
                List.of(new TourDetailResponse.Artifact(3L, "Bia tiến sĩ", "https://img/artifact.jpg", "Bia đá", null, null)),
                List.of(quiz), List.of(experience), 30);
        return TourDetailResponse.builder()
                .tourId(99L)
                .title("Hà Nội ngàn năm")
                .tourFormat(TourFormat.DAY_TRIP)
                .durationMinutes(240)
                .createdByName("Đối tác A")
                .highlights(List.of("Văn Miếu"))
                .images(List.of("https://img/a.jpg", "https://img/cover.jpg"))
                .coverImageUrl("https://img/cover.jpg")
                .itinerary(List.of(new TourDetailResponse.ItineraryDay(1, "Sáng", null, null),
                        new TourDetailResponse.ItineraryDay(2, null, null, null)))
                .prices(List.of(
                        new TourDetailResponse.Price(GuestType.ADULT, "Người lớn", "12+", new BigDecimal("450000"), true, false),
                        new TourDetailResponse.Price(GuestType.CHILD, "Trẻ em", "5-11", null, false, false),
                        new TourDetailResponse.Price(GuestType.INFANT, "Em bé", "<2", null, false, true)))
                .stops(List.of(stop))
                .departureDates(List.of(TODAY.minusDays(1), TODAY, TODAY.plusDays(3)))
                .latestReview(new TourDetailResponse.LatestReview(1L, "APPROVED", 1, "Mod", "ghi chú nội bộ",
                        null, null, null, null, List.of()))
                .build();
    }

    @Test
    void fromWizard_hidesAnswersQrTokensAndReviewNotes() throws Exception {
        var result = TourPublicDetailResponse.fromWizard(wizardDetail(), new BigDecimal("450000"), TODAY);

        String json = new ObjectMapper().registerModule(new JavaTimeModule()).writeValueAsString(result);
        assertThat(json)
                .doesNotContain("JGE-0123456789ABCDEF")
                .doesNotContain("SECRET-ANSWER")
                .doesNotContain("\"correct\"")
                .doesNotContain("ghi chú nội bộ");
    }

    @Test
    void fromWizard_locksCulturalContentAndKeepsOnlyCounts() throws Exception {
        var result = TourPublicDetailResponse.fromWizard(wizardDetail(), new BigDecimal("450000"), TODAY);

        String json = new ObjectMapper().registerModule(new JavaTimeModule()).writeValueAsString(result);
        assertThat(json)
                .doesNotContain("SECRET-CULTURE-STORY")
                .doesNotContain("https://img/culture-1.jpg")
                .doesNotContain("https://img/artifact.jpg");
        var stop = result.stops().get(0);
        assertThat(stop.hasCulturalStory()).isTrue();
        assertThat(stop.culturalImageCount()).isEqualTo(1);
        assertThat(stop.artifactCount()).isEqualTo(1);
    }

    @Test
    void fromWizard_summarisesStopsAndKeepsOnlyUsefulData() {
        var result = TourPublicDetailResponse.fromWizard(wizardDetail(), new BigDecimal("450000"), TODAY);

        assertThat(result.wizardTour()).isTrue();
        assertThat(result.images()).containsExactly("https://img/cover.jpg", "https://img/a.jpg");
        assertThat(result.itinerary()).hasSize(1);
        assertThat(result.prices()).extracting(TourPublicDetailResponse.Price::guestType)
                .containsExactly(GuestType.ADULT, GuestType.INFANT);
        assertThat(result.upcomingDepartureDates()).containsExactly(TODAY, TODAY.plusDays(3));

        var stop = result.stops().get(0);
        assertThat(stop.quizCount()).isEqualTo(1);
        assertThat(stop.activities()).singleElement()
                .satisfies(a -> assertThat(a.activityName()).isEqualTo("Tìm bia tiến sĩ"));
        assertThat(stop.latitude()).isEqualByComparingTo("21.0293");
        assertThat(result.taskCount()).isEqualTo(2);
        assertThat(result.totalPoints()).isEqualTo(30);
    }

    @Test
    void searchFilter_defaultsToNewestAndDatabaseOnly() {
        assertThat(new TourSearchFilter("  ", null, 1L, null, null).databaseOnly()).isTrue();
        assertThat(new TourSearchFilter("hue", null, null, null, null).databaseOnly()).isFalse();
        assertThat(new TourSearchFilter(null, null, null, null, TourSearchFilter.Order.PRICE_ASC).databaseOnly()).isFalse();
    }
}
