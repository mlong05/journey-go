package com.journeygo.modules.tour.service;

import com.journeygo.modules.destination.entity.Region;
import com.journeygo.modules.destination.entity.Theme;
import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.providerprofile.repository.ProviderProfileRepository;
import com.journeygo.modules.reward.service.RewardSettingService;
import com.journeygo.modules.tour.dto.wizard.TourValidationIssue;
import com.journeygo.modules.tour.entity.*;
import com.journeygo.modules.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TourSubmissionValidatorTest {

    @Mock
    private ProviderProfileRepository providerProfileRepository;
    @Mock
    private RewardSettingService rewardSettingService;

    @InjectMocks
    private TourSubmissionValidator validator;

    private ProviderProfile profile;

    @BeforeEach
    void setUp() {
        profile = ProviderProfile.builder().id(1L).active(true).build();
        when(providerProfileRepository.findByUser_Id(7L)).thenReturn(Optional.of(profile));
        when(rewardSettingService.pointsFor(any())).thenReturn(50);
    }

    @Test
    @DisplayName("Tour đầy đủ dữ liệu thì không có lỗi")
    void validTourHasNoIssues() {
        assertEquals(List.of(), validator.validate(validTour()));
    }

    @Test
    @DisplayName("Đối tác bị khóa thì bị chặn (BR-01)")
    void inactiveProviderIsBlocked() {
        profile.setActive(false);
        assertTrue(hasIssue(validator.validate(validTour()), "ACCOUNT", "provider"));
    }

    @Test
    @DisplayName("Chưa có hồ sơ đối tác (đơn đăng ký chưa được duyệt) thì bị chặn (BR-01)")
    void providerWithoutProfileIsBlocked() {
        when(providerProfileRepository.findByUser_Id(7L)).thenReturn(Optional.empty());
        assertTrue(hasIssue(validator.validate(validTour()), "ACCOUNT", "provider"));
    }

    @Test
    @DisplayName("Thiếu ảnh, thiếu điểm nổi bật, ảnh bìa không thuộc bộ ảnh")
    void basicInfoRules() {
        Tour tour = validTour();
        tour.getImages().subList(0, 2).clear();
        tour.getHighlights().subList(0, 1).clear();
        tour.setCoverImageUrl("https://cdn/khac.jpg");
        List<TourValidationIssue> issues = validator.validate(tour);
        assertTrue(hasIssue(issues, "BASIC_INFO", "images"));
        assertTrue(hasIssue(issues, "BASIC_INFO", "highlights"));
        assertTrue(hasIssue(issues, "BASIC_INFO", "coverImageUrl"));
    }

    @Test
    @DisplayName("Tour nhiều ngày: số đêm không lớn hơn số ngày")
    void nightsCannotExceedDays() {
        Tour tour = validTour();
        tour.setTourFormat(TourFormat.MULTI_DAY);
        tour.setDurationMinutes(null);
        tour.setDurationDays(2);
        tour.setDurationNights(3);
        assertTrue(hasIssue(validator.validate(tour), "BASIC_INFO", "durationNights"));
    }

    @Test
    @DisplayName("Quiz của nhiệm vụ có hai đáp án đúng bị báo lỗi kèm vị trí điểm đến")
    void quizMustHaveExactlyOneCorrectAnswer() {
        Tour tour = validTour();
        firstTask(tour).getQuizQuestions().get(0).getAnswers().get(1).setCorrect(true);
        TourValidationIssue issue = validator.validate(tour).stream()
                .filter(i -> "tasks[0].quiz[0].answers".equals(i.field())).findFirst().orElseThrow();
        assertEquals("STOPS", issue.step());
        assertEquals(0, issue.stopIndex());
    }

    @Test
    @DisplayName("Điểm đến không có nhiệm vụ nào thì bị báo lỗi")
    void stopNeedsAtLeastOneTask() {
        Tour tour = validTour();
        tour.getStops().get(0).getTasks().clear();
        assertTrue(hasIssue(validator.validate(tour), "STOPS", "tasks"));
    }

    @Test
    @DisplayName("Nhiệm vụ chưa có tên thì bị báo lỗi")
    void taskNeedsTitle() {
        Tour tour = validTour();
        firstTask(tour).setTitle(" ");
        assertTrue(hasIssue(validator.validate(tour), "STOPS", "tasks[0].title"));
    }

    @Test
    @DisplayName("Nhiệm vụ không có quiz thì bị báo lỗi")
    void taskNeedsQuiz() {
        Tour tour = validTour();
        firstTask(tour).getQuizQuestions().clear();
        assertTrue(hasIssue(validator.validate(tour), "STOPS", "tasks[0].quiz"));
    }

    @Test
    @DisplayName("Nhiệm vụ không có trải nghiệm thực tế thì bị báo lỗi")
    void taskNeedsExperience() {
        Tour tour = validTour();
        firstTask(tour).getExperiences().clear();
        assertTrue(hasIssue(validator.validate(tour), "STOPS", "tasks[0].experiences"));
    }

    @Test
    @DisplayName("Trải nghiệm thực tế thiếu câu hỏi sau trải nghiệm thì bị báo lỗi")
    void experienceNeedsPostQuestion() {
        Tour tour = validTour();
        firstTask(tour).getExperiences().get(0).getQuestions().clear();
        assertTrue(hasIssue(validator.validate(tour), "STOPS", "tasks[0].experiences[0].question"));
    }

    @Test
    @DisplayName("Admin chưa cấu hình điểm mỗi nhiệm vụ thì bị báo lỗi")
    void taskPointsMustBeConfigured() {
        when(rewardSettingService.pointsFor(any())).thenReturn(0);
        assertTrue(hasIssue(validator.validate(validTour()), "STOPS", "rewardPoints"));
    }

    @Test
    @DisplayName("Không có loại khách nào tính slot thì bị báo lỗi")
    void atLeastOneGuestTypeCountsTowardSlot() {
        Tour tour = validTour();
        tour.getPrices().forEach(p -> p.setCountsTowardSlot(false));
        assertTrue(hasIssue(validator.validate(tour), "PRICING", "prices.countsTowardSlot"));
    }

    @Test
    @DisplayName("Chỉ có ngày khởi hành trong quá khứ thì bị báo lỗi")
    void needsFutureDepartureDate() {
        Tour tour = validTour();
        tour.getDepartureDates().clear();
        tour.getDepartureDates().add(TourDepartureDate.builder().tour(tour)
                .departureDate(LocalDate.now(TourSubmissionValidator.ZONE).minusDays(1)).build());
        assertTrue(hasIssue(validator.validate(tour), "SCHEDULE", "departureDates"));
    }

    @Test
    @DisplayName("Chưa tích ô cam kết thì bị báo lỗi")
    void requiresContentRightsConfirmation() {
        Tour tour = validTour();
        tour.setContentRightsConfirmed(false);
        assertTrue(hasIssue(validator.validate(tour), "REVIEW", "contentRightsConfirmed"));
    }

    @Test
    @DisplayName("Tên tour: tối đa 80 ký tự, không viết hoa toàn bộ, không dùng từ cấm")
    void titleRules() {
        assertNull(TourSubmissionValidator.titleError("Theo chân thợ mộc khám phá Hội An"));
        assertNotNull(TourSubmissionValidator.titleError("a".repeat(81)));
        assertNotNull(TourSubmissionValidator.titleError("KHÁM PHÁ HỘI AN"));
        assertNotNull(TourSubmissionValidator.titleError("Tour Hội An rẻ nhất"));
        assertNotNull(TourSubmissionValidator.titleError("Tour độc quyền Huế"));
    }

    // ── Dữ liệu mẫu ──────────────────────────────────────────────────────────

    private static boolean hasIssue(List<TourValidationIssue> issues, String step, String field) {
        return issues.stream().anyMatch(i -> step.equals(i.step()) && field.equals(i.field()));
    }

    private Tour validTour() {
        User owner = User.builder().id(7L).fullName("Đối tác").build();
        Tour tour = Tour.builder()
                .tourId(1L)
                .title("Theo chân thợ mộc khám phá kiến trúc gỗ Hội An")
                .tourFormat(TourFormat.DAY_TRIP)
                .durationMinutes(270)
                .durationDays(1)
                .region(Region.builder().id(1L).name("Miền Trung").deleted(false).build())
                .theme(Theme.builder().id(1L).name("Làng nghề").deleted(false).build())
                .description("Theo chân nghệ nhân. Trải nghiệm đục gỗ.")
                .cancellationPolicy("Hủy trước 24 giờ hoàn 100%")
                .maxGuestsPerSlot(20)
                .contentRightsConfirmed(true)
                .createdBy(owner)
                .build();
        tour.getHighlights().addAll(List.of("Gặp nghệ nhân", "Tự tay đục gỗ", "Thăm nhà cổ"));
        for (int i = 1; i <= 5; i++) tour.getImages().add("https://cdn/anh-" + i + ".jpg");
        tour.setCoverImageUrl("https://cdn/anh-1.jpg");
        for (GuestType type : GuestType.values()) {
            tour.getPrices().add(TourPrice.builder().tour(tour).guestType(type)
                    .price(type.isAlwaysFree() ? BigDecimal.ZERO : BigDecimal.valueOf(300000))
                    .countsTowardSlot(type == GuestType.ADULT).build());
        }

        TourStop stop = TourStop.builder().tour(tour).sequenceOrder(1).name("Xưởng mộc Kim Bồng")
                .shortDescription("Làng mộc 500 năm").culturalContent("Câu chuyện làng mộc").build();
        TourStopTask task = TourStopTask.builder().stop(stop).sequenceOrder(1)
                .title("Khám phá hoa văn gỗ").build();
        TourStopQuestion quiz = question(StopQuestionKind.QUIZ);
        quiz.setTask(task);
        task.getQuizQuestions().add(quiz);
        TourStopExperience experience = TourStopExperience.builder().stop(stop).task(task).sequenceOrder(1)
                .activityName("Đục hoa văn").checkpointLatitude(new BigDecimal("15.8794"))
                .checkpointLongitude(new BigDecimal("108.3350")).radiusMeters(50).durationSeconds(900).build();
        TourStopQuestion post = question(StopQuestionKind.POST_EXPERIENCE);
        post.setExperience(experience);
        experience.getQuestions().add(post);
        task.getExperiences().add(experience);
        stop.getTasks().add(task);
        tour.getStops().add(stop);

        tour.getDepartureDates().add(TourDepartureDate.builder().tour(tour)
                .departureDate(LocalDate.now(TourSubmissionValidator.ZONE).plusDays(7)).build());
        return tour;
    }

    private static TourStopTask firstTask(Tour tour) {
        return tour.getStops().get(0).getTasks().get(0);
    }

    private static TourStopQuestion question(StopQuestionKind kind) {
        TourStopQuestion q = TourStopQuestion.builder().kind(kind).sequenceOrder(1).content("Câu hỏi?").build();
        for (int i = 1; i <= 4; i++) {
            q.getAnswers().add(TourStopAnswer.builder().question(q).sequenceOrder(i)
                    .content("Đáp án " + i).correct(i == 1).build());
        }
        return q;
    }
}
