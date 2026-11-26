package com.journeygo.modules.tour.service;

import com.journeygo.modules.experience.util.GeoUtils;
import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.providerprofile.repository.ProviderProfileRepository;
import com.journeygo.modules.reward.entity.RewardSettingCode;
import com.journeygo.modules.reward.service.RewardSettingService;
import com.journeygo.modules.tour.dto.wizard.TourValidationIssue;
import com.journeygo.modules.tour.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Kiểm tra toàn bộ dữ liệu tour trước khi gửi duyệt và trước khi Moderator duyệt (mục 7.2).
 * Không dựa vào validation phía frontend. Trả về danh sách lỗi chỉ rõ bước và trường.
 * Không kiểm tra trạng thái tour — việc đó do nơi gọi đảm nhiệm.
 */
@Component
@RequiredArgsConstructor
public class TourSubmissionValidator {

    public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    public static final int TITLE_MAX = 80;
    public static final int HIGHLIGHTS_MIN = 3;
    public static final int HIGHLIGHTS_MAX = 5;
    /** Ảnh tour (ngoài ảnh bìa): đúng 5 ảnh. */
    public static final int IMAGES_MIN = 5;
    public static final int IMAGES_MAX = 5;
    /** Tour trong ngày phải dưới 24 giờ (tối đa 23 giờ 59 phút). */
    public static final int DAY_TRIP_MAX_MINUTES = 24 * 60;
    public static final int QUIZ_MIN = 1;
    public static final int QUIZ_MAX = 4;
    public static final int ORDERING_MIN = 3;
    public static final int ORDERING_MAX = 5;
    public static final int MATCHING_MIN = 3;
    public static final int MATCHING_MAX = 5;
    /** Thanh trượt quá rộng thì trên điện thoại không kéo chính xác được. */
    public static final int NUMBER_RANGE_MAX = 1000;
    public static final int EXPERIENCES_MIN = 1;
    public static final int EXPERIENCES_MAX = 5;
    public static final int RADIUS_MIN = 10;
    public static final int RADIUS_MAX = 100;
    /** Bán kính check-in trạm (đối tác tự nhập). */
    public static final int STOP_RADIUS_MIN = 50;
    public static final int STOP_RADIUS_MAX = 500;
    /**
     * Checkpoint hoạt động xa vị trí điểm đến quá mức này ⇒ chặn gửi duyệt (gần như chắc chắn đặt nhầm ghim).
     * Từ {@code CHECKPOINT_WARN_METERS} (1 km) đến mức này chỉ cảnh báo — hiển thị ở frontend cho đối tác / Moderator.
     */
    public static final int CHECKPOINT_MAX_DISTANCE_METERS = 3000;
    public static final int CHECKPOINT_WARN_METERS = 1000;

    /** Từ ngữ quảng cáo không được dùng trong tên tour. */
    static final List<String> BANNED_TITLE_WORDS = List.of("rẻ nhất", "độc quyền", "tốt nhất", "số 1", "số một");

    private final ProviderProfileRepository providerProfileRepository;
    private final RewardSettingService rewardSettingService;

    @Transactional(readOnly = true)
    public List<TourValidationIssue> validate(Tour tour) {
        List<TourValidationIssue> issues = new ArrayList<>();
        validateAccount(tour, issues);
        validateBasicInfo(tour, issues);
        validatePricing(tour, issues);
        validateStops(tour, issues);
        validateRewards(issues);
        validateSchedule(tour, issues);
        if (!tour.isContentRightsConfirmed()) {
            issues.add(TourValidationIssue.of("REVIEW", "contentRightsConfirmed",
                    "Vui lòng tích ô cam kết quyền sử dụng hình ảnh, video và nội dung"));
        }
        return issues;
    }

    /** Lỗi của tên tour (dùng cả khi lưu nháp). Trả về null nếu hợp lệ. */
    public static String titleError(String title) {
        if (title == null || title.isBlank()) return "Tên tour không được để trống";
        String trimmed = title.trim();
        if (trimmed.length() > TITLE_MAX) return "Tên tour tối đa " + TITLE_MAX + " ký tự";
        long letters = trimmed.chars().filter(Character::isLetter).count();
        if (letters >= 4 && trimmed.equals(trimmed.toUpperCase(Locale.ROOT))
                && !trimmed.equals(trimmed.toLowerCase(Locale.ROOT))) {
            return "Tên tour không được viết hoa toàn bộ";
        }
        String lower = trimmed.toLowerCase(Locale.ROOT);
        for (String word : BANNED_TITLE_WORDS) {
            if (lower.contains(word)) return "Tên tour không được dùng từ \"" + word + "\"";
        }
        return null;
    }

    private void validateAccount(Tour tour, List<TourValidationIssue> issues) {
        Long ownerId = tour.getCreatedBy() == null ? null : tour.getCreatedBy().getId();
        ProviderProfile profile = ownerId == null ? null : providerProfileRepository.findByUser_Id(ownerId).orElse(null);
        if (profile == null || !profile.canManageTours()) {
            issues.add(TourValidationIssue.of("ACCOUNT", "provider",
                    "Tài khoản đối tác chưa được duyệt hoặc đang bị khóa"));
        }
    }

    private void validateBasicInfo(Tour tour, List<TourValidationIssue> issues) {
        String step = "BASIC_INFO";
        String titleError = titleError(tour.getTitle());
        if (titleError != null) issues.add(TourValidationIssue.of(step, "title", titleError));

        if (tour.getTourFormat() == null) {
            issues.add(TourValidationIssue.of(step, "tourFormat", "Vui lòng chọn hình thức tour"));
        } else if (tour.getTourFormat() == TourFormat.DAY_TRIP) {
            if (tour.getDurationMinutes() == null || tour.getDurationMinutes() <= 0) {
                issues.add(TourValidationIssue.of(step, "durationMinutes", "Vui lòng nhập thời lượng tour"));
            } else if (tour.getDurationMinutes() >= DAY_TRIP_MAX_MINUTES) {
                issues.add(TourValidationIssue.of(step, "durationMinutes",
                        "Tour trong ngày phải dưới 24 giờ — tour dài hơn hãy chọn \"Nhiều ngày\""));
            }
        } else {
            Integer days = tour.getDurationDays() > 0 ? tour.getDurationDays() : null;
            if (days == null || days < 2) {
                issues.add(TourValidationIssue.of(step, "durationDays", "Tour nhiều ngày phải có ít nhất 2 ngày"));
            }
            if (tour.getDurationNights() == null || tour.getDurationNights() < 0) {
                issues.add(TourValidationIssue.of(step, "durationNights", "Vui lòng nhập số đêm"));
            } else if (days != null && tour.getDurationNights() > days) {
                issues.add(TourValidationIssue.of(step, "durationNights", "Số đêm không được lớn hơn số ngày"));
            }
        }

        if (tour.getRegion() == null || tour.getRegion().isDeleted()) {
            issues.add(TourValidationIssue.of(step, "regionId", "Vui lòng chọn khu vực"));
        }
        if (tour.getTheme() == null || tour.getTheme().isDeleted()) {
            issues.add(TourValidationIssue.of(step, "themeId", "Vui lòng chọn chủ đề"));
        }
        if (isBlank(tour.getDescription())) {
            issues.add(TourValidationIssue.of(step, "description", "Vui lòng nhập mô tả tour"));
        }

        long highlights = tour.getHighlights().stream().filter(h -> !isBlank(h)).count();
        if (highlights < HIGHLIGHTS_MIN || highlights > HIGHLIGHTS_MAX) {
            issues.add(TourValidationIssue.of(step, "highlights",
                    "Cần từ " + HIGHLIGHTS_MIN + " đến " + HIGHLIGHTS_MAX + " điểm nổi bật"));
        }

        List<String> images = tour.getImages();
        if (images.size() != IMAGES_MIN) {
            issues.add(TourValidationIssue.of(step, "images", "Cần đúng " + IMAGES_MIN + " ảnh tour (hiện có " + images.size() + " ảnh)"));
        }
        if (images.stream().anyMatch(url -> !isHttps(url))) {
            issues.add(TourValidationIssue.of(step, "images", "Ảnh tour phải là đường dẫn https hợp lệ"));
        }
        if (isBlank(tour.getCoverImageUrl())) {
            issues.add(TourValidationIssue.of(step, "coverImageUrl", "Vui lòng tải lên 1 ảnh bìa"));
        } else if (!isHttps(tour.getCoverImageUrl())) {
            issues.add(TourValidationIssue.of(step, "coverImageUrl", "Ảnh bìa phải là đường dẫn https hợp lệ"));
        } else if (images.contains(tour.getCoverImageUrl())) {
            issues.add(TourValidationIssue.of(step, "coverImageUrl", "Ảnh bìa là ảnh riêng, không trùng với 5 ảnh tour"));
        }
    }

    private void validatePricing(Tour tour, List<TourValidationIssue> issues) {
        String step = "PRICING";
        boolean anyCountsSlot = false;
        for (GuestType type : GuestType.values()) {
            TourPrice price = tour.getPrices().stream().filter(p -> p.getGuestType() == type).findFirst().orElse(null);
            String field = "prices." + type.name();
            if (price == null || price.getPrice() == null) {
                issues.add(TourValidationIssue.of(step, field, "Vui lòng nhập giá cho " + type.getLabel()));
                continue;
            }
            if (price.getPrice().signum() < 0) {
                issues.add(TourValidationIssue.of(step, field, "Giá " + type.getLabel() + " không được âm"));
            }
            anyCountsSlot |= price.isCountsTowardSlot();
        }
        if (!anyCountsSlot) {
            issues.add(TourValidationIssue.of(step, "prices.countsTowardSlot", "Cần ít nhất 1 loại khách tính slot"));
        }
        if (tour.getMaxGuestsPerSlot() == null || tour.getMaxGuestsPerSlot() <= 0) {
            issues.add(TourValidationIssue.of(step, "maxGuestsPerSlot", "Số chỗ tối đa mỗi slot phải lớn hơn 0"));
        }
        if (isBlank(tour.getCancellationPolicy())) {
            issues.add(TourValidationIssue.of(step, "cancellationPolicy", "Vui lòng nhập chính sách hủy"));
        }
    }

    private void validateStops(Tour tour, List<TourValidationIssue> issues) {
        if (tour.getStops().isEmpty()) {
            issues.add(TourValidationIssue.of("STOPS", "stops", "Tour phải có ít nhất 1 điểm đến"));
            return;
        }
        List<TourStop> stops = tour.getStops();
        for (int i = 0; i < stops.size(); i++) {
            TourStop stop = stops.get(i);
            if (isBlank(stop.getName())) issues.add(TourValidationIssue.stop(i, "name", "Vui lòng nhập tên điểm đến"));
            boolean stopLocated = isValidCoordinate(stop.getLatitude(), stop.getLongitude());
            if (!stopLocated) {
                issues.add(TourValidationIssue.stop(i, "location",
                        "Vui lòng chọn vị trí check-in của điểm đến trên bản đồ (nên đặt tại cổng / lối vào chính)"));
            }
            Integer stopRadius = stop.getCheckInRadiusMeters();
            if (stopRadius == null || stopRadius < STOP_RADIUS_MIN || stopRadius > STOP_RADIUS_MAX) {
                issues.add(TourValidationIssue.stop(i, "checkInRadiusMeters",
                        "Bán kính check-in phải từ " + STOP_RADIUS_MIN + " đến " + STOP_RADIUS_MAX + " mét"));
            }
            if (isBlank(stop.getShortDescription())) {
                issues.add(TourValidationIssue.stop(i, "shortDescription", "Vui lòng nhập mô tả ngắn"));
            }
            if (isBlank(stop.getCulturalContent())) {
                issues.add(TourValidationIssue.stop(i, "culturalContent", "Vui lòng nhập nội dung văn hóa (câu chuyện)"));
            }
            if (!isBlank(stop.getVideoUrl()) && stop.getVideoSource() == null) {
                issues.add(TourValidationIssue.stop(i, "videoSource", "Vui lòng chọn nguồn video"));
            }
            for (int a = 0; a < stop.getArtifacts().size(); a++) {
                TourStopArtifact artifact = stop.getArtifacts().get(a);
                if (isBlank(artifact.getName())) {
                    issues.add(TourValidationIssue.stop(i, "artifacts[" + a + "].name", "Vui lòng nhập tên cổ vật"));
                }
                if (isBlank(artifact.getImageUrl())) {
                    issues.add(TourValidationIssue.stop(i, "artifacts[" + a + "].imageUrl", "Cổ vật cần có ảnh"));
                }
                if (!isBlank(artifact.getVideoUrl()) && artifact.getVideoSource() == null) {
                    issues.add(TourValidationIssue.stop(i, "artifacts[" + a + "].videoSource", "Vui lòng chọn nguồn video"));
                }
            }

            int quizCount = stop.getQuizQuestions().size();
            if (quizCount < QUIZ_MIN || quizCount > QUIZ_MAX) {
                issues.add(TourValidationIssue.stop(i, "quiz", "Câu đố văn hóa cần từ " + QUIZ_MIN + " đến " + QUIZ_MAX + " câu"));
            }
            for (int q = 0; q < quizCount; q++) {
                TourStopQuestion question = stop.getQuizQuestions().get(q);
                if (question.isTextQuestion()) {
                    issues.add(TourValidationIssue.stop(i, "quiz[" + q + "]", "Câu đố văn hóa không dùng dạng nhập chữ"));
                    continue;
                }
                validateQuestion(question, i, "quiz[" + q + "]", issues);
            }

            int experienceCount = stop.getExperiences().size();
            if (experienceCount < EXPERIENCES_MIN || experienceCount > EXPERIENCES_MAX) {
                issues.add(TourValidationIssue.stop(i, "experiences",
                        "Cần từ " + EXPERIENCES_MIN + " đến " + EXPERIENCES_MAX + " trải nghiệm thực tế"));
            }
            for (int e = 0; e < experienceCount; e++) {
                validateExperience(stop, stopLocated, stop.getExperiences().get(e), i, "experiences[" + e + "]", issues);
            }
        }
    }

    private static boolean isValidCoordinate(BigDecimal latitude, BigDecimal longitude) {
        return latitude != null && longitude != null
                && latitude.abs().compareTo(BigDecimal.valueOf(90)) <= 0
                && longitude.abs().compareTo(BigDecimal.valueOf(180)) <= 0;
    }

    /** Khoảng cách (mét, làm tròn) từ vị trí điểm đến tới checkpoint của hoạt động. */
    public static int distanceFromStopMeters(TourStop stop, TourStopExperience exp) {
        return GeoUtils.haversineMeters(stop.getLatitude(), stop.getLongitude(),
                exp.getCheckpointLatitude(), exp.getCheckpointLongitude()).intValue();
    }

    private void validateExperience(TourStop stop, boolean stopLocated, TourStopExperience exp, int stopIndex,
                                    String path, List<TourValidationIssue> issues) {
        if (isBlank(exp.getActivityName())) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".activityName", "Vui lòng nhập tên hoạt động"));
        }
        if (!isValidCoordinate(exp.getCheckpointLatitude(), exp.getCheckpointLongitude())) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".checkpoint", "Vui lòng chọn checkpoint hợp lệ trên bản đồ"));
        } else if (stopLocated) {
            int distance = distanceFromStopMeters(stop, exp);
            if (distance > CHECKPOINT_MAX_DISTANCE_METERS) {
                issues.add(TourValidationIssue.stop(stopIndex, path + ".checkpoint", String.format(Locale.ROOT,
                        "Checkpoint cách vị trí điểm đến %.1f km (tối đa %d km) — hãy kiểm tra lại vị trí trên bản đồ",
                        distance / 1000.0, CHECKPOINT_MAX_DISTANCE_METERS / 1000)));
            }
        }
        if (exp.getRadiusMeters() == null || exp.getRadiusMeters() < RADIUS_MIN || exp.getRadiusMeters() > RADIUS_MAX) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".radiusMeters",
                    "Bán kính phải từ " + RADIUS_MIN + " đến " + RADIUS_MAX + " mét"));
        }
        if (exp.getDurationSeconds() == null || exp.getDurationSeconds() <= 0) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".durationSeconds", "Vui lòng nhập thời gian trải nghiệm"));
        }
        // Câu hỏi sau trải nghiệm: đúng 1 câu, khách nhập chữ, có đáp án đúng.
        if (exp.getQuestions().size() != 1) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".question", "Cần đúng 1 câu hỏi sau trải nghiệm"));
        } else if (!exp.getQuestion().isTextQuestion()) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".question", "Câu hỏi sau trải nghiệm phải là dạng nhập chữ"));
        } else {
            validateQuestion(exp.getQuestion(), stopIndex, path + ".question", issues);
        }
    }

    private void validateQuestion(TourStopQuestion question, int stopIndex, String path, List<TourValidationIssue> issues) {
        if (isBlank(question.getContent())) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".content", "Vui lòng nhập nội dung câu hỏi"));
        }
        if (question.isTextQuestion()) {
            if (TextAnswerMatcher.acceptedAnswers(question.getReferenceAnswer()).isEmpty()) {
                issues.add(TourValidationIssue.stop(stopIndex, path + ".referenceAnswer", "Vui lòng nhập đáp án đúng"));
            }
            return;
        }
        List<TourStopAnswer> answers = question.getAnswers();
        QuestionType type = question.getQuestionType();
        if (type == QuestionType.NUMBER) {
            Integer min = question.getNumberMin(), max = question.getNumberMax(), correct = question.getNumberCorrect();
            if (min == null || max == null || min >= max) {
                issues.add(TourValidationIssue.stop(stopIndex, path + ".numberRange", "Khoảng thanh trượt cần có giá trị nhỏ nhất < lớn nhất"));
            } else if (max - min > NUMBER_RANGE_MAX) {
                issues.add(TourValidationIssue.stop(stopIndex, path + ".numberRange", "Khoảng thanh trượt tối đa " + NUMBER_RANGE_MAX + " đơn vị"));
            }
            if (correct == null || (min != null && correct < min) || (max != null && correct > max)) {
                issues.add(TourValidationIssue.stop(stopIndex, path + ".numberCorrect", "Đáp án đúng phải nằm trong khoảng thanh trượt"));
            }
            return;
        }
        if (type == QuestionType.MATCHING) {
            if (answers.size() < MATCHING_MIN || answers.size() > MATCHING_MAX) {
                issues.add(TourValidationIssue.stop(stopIndex, path + ".answers",
                        "Câu nối cột cần từ " + MATCHING_MIN + " đến " + MATCHING_MAX + " cặp"));
            }
            if (answers.stream().anyMatch(a -> (isBlank(a.getContent()) && isBlank(a.getImageUrl())) || isBlank(a.getMatchText()))) {
                issues.add(TourValidationIssue.stop(stopIndex, path + ".answers",
                        "Mỗi cặp cần có cột A (chữ hoặc ảnh) và cột B"));
            }
            List<String> rights = answers.stream().filter(a -> !isBlank(a.getMatchText()))
                    .map(a -> a.getMatchText().trim().toLowerCase(java.util.Locale.ROOT)).toList();
            if (rights.stream().distinct().count() < rights.size()) {
                issues.add(TourValidationIssue.stop(stopIndex, path + ".answers",
                        "Cột B có nội dung trùng nhau — mỗi mục cột B phải khác nhau"));
            }
            return;
        }
        if (type == QuestionType.ORDERING) {
            if (answers.size() < ORDERING_MIN || answers.size() > ORDERING_MAX || answers.stream().anyMatch(a -> isBlank(a.getContent()))) {
                issues.add(TourValidationIssue.stop(stopIndex, path + ".answers",
                        "Câu xếp thứ tự cần từ " + ORDERING_MIN + " đến " + ORDERING_MAX + " mục, mục nào cũng có nội dung"));
            }
            return;
        }
        boolean image = type == QuestionType.IMAGE_CHOICE;
        if (answers.size() != TourStopQuestion.ANSWER_COUNT
                || answers.stream().anyMatch(a -> image ? isBlank(a.getImageUrl()) : isBlank(a.getContent()))) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".answers",
                    image ? "Câu chọn ảnh cần đủ 4 ảnh đáp án" : "Câu hỏi cần đủ 4 đáp án"));
        }
        long correct = answers.stream().filter(TourStopAnswer::isCorrect).count();
        if (correct != 1) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".answers", "Câu hỏi phải có đúng 1 đáp án đúng"));
        }
    }

    private void validateRewards(List<TourValidationIssue> issues) {
        for (RewardSettingCode code : RewardSettingCode.values()) {
            if (rewardSettingService.pointsFor(code) <= 0) {
                issues.add(TourValidationIssue.of("STOPS", "rewardPoints",
                        "Điểm thưởng \"" + code.getLabel() + "\" chưa được Admin cấu hình"));
            }
        }
    }

    private void validateSchedule(Tour tour, List<TourValidationIssue> issues) {
        LocalDate today = LocalDate.now(ZONE);
        boolean hasFuture = tour.getDepartureDates().stream().anyMatch(d -> d.getDepartureDate().isAfter(today));
        if (!hasFuture) {
            issues.add(TourValidationIssue.of("SCHEDULE", "departureDates", "Cần ít nhất 1 ngày mở bán ở tương lai"));
        }
        if (isBlank(tour.getDepartureTime())) {
            issues.add(TourValidationIssue.of("SCHEDULE", "departureTime", "Vui lòng nhập giờ khởi hành"));
        }
        if (isBlank(tour.getMeetingPoint())) {
            issues.add(TourValidationIssue.of("SCHEDULE", "meetingPoint", "Vui lòng nhập địa điểm tập trung"));
        }
    }

    static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    static boolean isHttps(String url) {
        return url != null && url.trim().toLowerCase(Locale.ROOT).startsWith("https://");
    }
}
