package com.journeygo.modules.tour.service;

import com.journeygo.modules.reward.entity.RewardSettingCode;
import com.journeygo.modules.reward.service.RewardSettingService;
import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.providerprofile.repository.ProviderProfileRepository;
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
    public static final int IMAGES_MIN = 5;
    public static final int QUIZ_MIN = 1;
    public static final int QUIZ_MAX = 4;
    public static final int EXPERIENCES_MIN = 1;
    public static final int EXPERIENCES_MAX = 5;
    public static final int TASKS_MIN = 1;
    public static final int TASKS_MAX = 5;
    public static final int RADIUS_MIN = 10;
    public static final int RADIUS_MAX = 500;

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
        if (images.size() < IMAGES_MIN) {
            issues.add(TourValidationIssue.of(step, "images", "Cần ít nhất " + IMAGES_MIN + " ảnh thật của tour"));
        }
        if (images.stream().anyMatch(url -> !isHttps(url))) {
            issues.add(TourValidationIssue.of(step, "images", "Ảnh tour phải là đường dẫn https hợp lệ"));
        }
        if (isBlank(tour.getCoverImageUrl())) {
            issues.add(TourValidationIssue.of(step, "coverImageUrl", "Vui lòng chọn 1 ảnh làm ảnh bìa"));
        } else if (!images.contains(tour.getCoverImageUrl())) {
            issues.add(TourValidationIssue.of(step, "coverImageUrl", "Ảnh bìa phải là một trong các ảnh của tour"));
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
            if (type.isAlwaysFree() && price.getPrice().compareTo(BigDecimal.ZERO) != 0) {
                issues.add(TourValidationIssue.of(step, field, type.getLabel() + " luôn miễn phí"));
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

            int taskCount = stop.getTasks().size();
            if (taskCount < TASKS_MIN || taskCount > TASKS_MAX) {
                issues.add(TourValidationIssue.stop(i, "tasks", "Cần từ " + TASKS_MIN + " đến " + TASKS_MAX + " nhiệm vụ"));
            }
            for (int t = 0; t < taskCount; t++) {
                validateTask(stop.getTasks().get(t), i, "tasks[" + t + "]", issues);
            }
        }
    }

    /** Nhiệm vụ: tên, quiz 1–4 câu, trải nghiệm thực tế 1–5. */
    private void validateTask(TourStopTask task, int stopIndex, String path, List<TourValidationIssue> issues) {
        if (isBlank(task.getTitle())) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".title", "Vui lòng nhập tên nhiệm vụ"));
        }

        int quizCount = task.getQuizQuestions().size();
        if (quizCount < QUIZ_MIN || quizCount > QUIZ_MAX) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".quiz",
                    "Quiz cần từ " + QUIZ_MIN + " đến " + QUIZ_MAX + " câu"));
        }
        for (int q = 0; q < quizCount; q++) {
            validateQuestion(task.getQuizQuestions().get(q), stopIndex, path + ".quiz[" + q + "]", issues);
        }

        int experienceCount = task.getExperiences().size();
        if (experienceCount < EXPERIENCES_MIN || experienceCount > EXPERIENCES_MAX) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".experiences",
                    "Cần từ " + EXPERIENCES_MIN + " đến " + EXPERIENCES_MAX + " trải nghiệm thực tế"));
        }
        for (int e = 0; e < experienceCount; e++) {
            validateExperience(task.getExperiences().get(e), stopIndex, path + ".experiences[" + e + "]", issues);
        }
    }

    private void validateExperience(TourStopExperience exp, int stopIndex, String path, List<TourValidationIssue> issues) {
        if (isBlank(exp.getActivityName())) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".activityName", "Vui lòng nhập tên hoạt động"));
        }
        if (exp.getCheckpointLatitude() == null || exp.getCheckpointLongitude() == null
                || exp.getCheckpointLatitude().abs().compareTo(BigDecimal.valueOf(90)) > 0
                || exp.getCheckpointLongitude().abs().compareTo(BigDecimal.valueOf(180)) > 0) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".checkpoint", "Vui lòng chọn checkpoint hợp lệ trên bản đồ"));
        }
        if (exp.getRadiusMeters() == null || exp.getRadiusMeters() < RADIUS_MIN || exp.getRadiusMeters() > RADIUS_MAX) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".radiusMeters",
                    "Bán kính phải từ " + RADIUS_MIN + " đến " + RADIUS_MAX + " mét"));
        }
        if (exp.getDurationSeconds() == null || exp.getDurationSeconds() <= 0) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".durationSeconds", "Vui lòng nhập thời gian trải nghiệm"));
        }
        if (exp.getQuestions().size() != 1) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".question", "Cần đúng 1 câu hỏi sau trải nghiệm"));
        } else {
            validateQuestion(exp.getQuestion(), stopIndex, path + ".question", issues);
        }
    }

    private void validateQuestion(TourStopQuestion question, int stopIndex, String path, List<TourValidationIssue> issues) {
        if (isBlank(question.getContent())) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".content", "Vui lòng nhập nội dung câu hỏi"));
        }
        if (question.isTextQuestion()) return; // tự luận: chỉ cần nội dung câu hỏi
        List<TourStopAnswer> answers = question.getAnswers();
        if (answers.size() != TourStopQuestion.ANSWER_COUNT || answers.stream().anyMatch(a -> isBlank(a.getContent()))) {
            issues.add(TourValidationIssue.stop(stopIndex, path + ".answers", "Câu hỏi cần đủ 4 đáp án"));
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
    }

    static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    static boolean isHttps(String url) {
        return url != null && url.trim().toLowerCase(Locale.ROOT).startsWith("https://");
    }
}
