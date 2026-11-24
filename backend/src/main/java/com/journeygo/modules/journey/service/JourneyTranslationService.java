package com.journeygo.modules.journey.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.journeygo.common.i18n.ContentTranslationService;
import com.journeygo.modules.journey.dto.PuzzleClueResponse;
import com.journeygo.modules.journey.dto.TaskQuestionsResponse;
import com.journeygo.modules.tour.dto.StopCultureResponse;
import com.journeygo.modules.tour.dto.wizard.TourDetailResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Dịch tự động (kèm cache DB {@code content_translations}) cho nội dung trải nghiệm thực địa
 * trên Mobile App: câu chuyện văn hóa điểm dừng, hiện vật, câu hỏi quiz và manh mối nhiệm vụ.
 */
@Service
@RequiredArgsConstructor
public class JourneyTranslationService {

    private final ContentTranslationService translationService;
    private final ObjectMapper objectMapper;

    public StopCultureResponse localizeStopCulture(StopCultureResponse culture, Locale locale) {
        if (culture == null || culture.stopId() == null) return culture;
        String lang = translationService.resolveTargetLang(locale);
        if (lang == null) return culture;

        ObjectNode payload = objectMapper.createObjectNode();
        putIfText(payload, "name", culture.name());
        putIfText(payload, "shortDescription", culture.shortDescription());
        putIfText(payload, "culturalContent", culture.culturalContent());
        if (culture.artifacts() != null && !culture.artifacts().isEmpty()) {
            ArrayNode arr = payload.putArray("artifacts");
            for (TourDetailResponse.Artifact a : culture.artifacts()) {
                ObjectNode item = arr.addObject();
                putIfText(item, "name", a.name());
                putIfText(item, "shortDescription", a.shortDescription());
            }
        }

        JsonNode t = translationService.translateObject("STOP_CULTURE", culture.stopId(), lang, payload);
        if (t == null || !t.isObject()) return culture;

        List<TourDetailResponse.Artifact> artifacts = culture.artifacts();
        if (artifacts != null && t.has("artifacts") && t.get("artifacts").isArray()
                && t.get("artifacts").size() == artifacts.size()) {
            List<TourDetailResponse.Artifact> next = new ArrayList<>(artifacts.size());
            for (int i = 0; i < artifacts.size(); i++) {
                TourDetailResponse.Artifact orig = artifacts.get(i);
                JsonNode an = t.get("artifacts").get(i);
                next.add(new TourDetailResponse.Artifact(
                        orig.id(),
                        textOr(an, "name", orig.name()),
                        orig.imageUrl(),
                        textOr(an, "shortDescription", orig.shortDescription()),
                        orig.videoUrl(),
                        orig.videoSource()
                ));
            }
            artifacts = next;
        }

        return new StopCultureResponse(
                culture.stopId(),
                culture.sequenceOrder(),
                textOr(t, "name", culture.name()),
                textOr(t, "shortDescription", culture.shortDescription()),
                culture.imageUrl(),
                culture.videoUrl(),
                culture.videoSource(),
                textOr(t, "culturalContent", culture.culturalContent()),
                culture.culturalImages(),
                artifacts
        );
    }

    public TaskQuestionsResponse localizeTaskQuestions(TaskQuestionsResponse resp, Locale locale) {
        if (resp == null || resp.taskId() == null) return resp;
        String lang = translationService.resolveTargetLang(locale);
        if (lang == null) return resp;

        ObjectNode payload = objectMapper.createObjectNode();
        putIfText(payload, "taskName", resp.taskName());
        putIfText(payload, "description", resp.description());
        if (resp.station() != null) {
            putIfText(payload, "stationName", resp.station().name());
        }
        if (resp.stations() != null && !resp.stations().isEmpty()) {
            ArrayNode arr = payload.putArray("stationNames");
            for (TaskQuestionsResponse.Station s : resp.stations()) {
                arr.add(s.name() != null ? s.name() : "");
            }
        }
        if (resp.questions() != null && !resp.questions().isEmpty()) {
            ArrayNode qArr = payload.putArray("questions");
            for (TaskQuestionsResponse.Question q : resp.questions()) {
                ObjectNode qNode = qArr.addObject();
                putIfText(qNode, "content", q.content());
                if (q.options() != null && !q.options().isEmpty()) {
                    ArrayNode optArr = qNode.putArray("options");
                    for (TaskQuestionsResponse.Option o : q.options()) {
                        optArr.add(o.content() != null ? o.content() : "");
                    }
                }
            }
        }

        // Nhiệm vụ tuần tự có nhiều bước (questionIndex) và 2 trạng thái unlocked ⇒ tách entityType để cache riêng từng bước
        String entityType = "TASK_Q_" + (resp.questionIndex() != null ? resp.questionIndex() : 0)
                + "_" + (resp.unlocked() ? "1" : "0");
        JsonNode t = translationService.translateObject(entityType, resp.taskId(), lang, payload);
        if (t == null || !t.isObject()) return resp;

        TaskQuestionsResponse.Station station = resp.station() == null ? null
                : new TaskQuestionsResponse.Station(
                        textOr(t, "stationName", resp.station().name()),
                        resp.station().latitude(),
                        resp.station().longitude(),
                        resp.station().radiusMeters());

        List<TaskQuestionsResponse.Station> stations = resp.stations();
        if (stations != null && t.has("stationNames") && t.get("stationNames").isArray()
                && t.get("stationNames").size() == stations.size()) {
            List<TaskQuestionsResponse.Station> next = new ArrayList<>(stations.size());
            for (int i = 0; i < stations.size(); i++) {
                TaskQuestionsResponse.Station s = stations.get(i);
                String name = t.get("stationNames").get(i).asText("");
                next.add(new TaskQuestionsResponse.Station(
                        StringUtils.hasText(name) ? name : s.name(),
                        s.latitude(),
                        s.longitude(),
                        s.radiusMeters()));
            }
            stations = next;
        }

        List<TaskQuestionsResponse.Question> questions = resp.questions();
        if (questions != null && t.has("questions") && t.get("questions").isArray()
                && t.get("questions").size() == questions.size()) {
            List<TaskQuestionsResponse.Question> nextQs = new ArrayList<>(questions.size());
            for (int i = 0; i < questions.size(); i++) {
                TaskQuestionsResponse.Question orig = questions.get(i);
                JsonNode qn = t.get("questions").get(i);
                List<TaskQuestionsResponse.Option> opts = orig.options();
                if (opts != null && qn.has("options") && qn.get("options").isArray()
                        && qn.get("options").size() == opts.size()) {
                    List<TaskQuestionsResponse.Option> nextOpts = new ArrayList<>(opts.size());
                    for (int j = 0; j < opts.size(); j++) {
                        TaskQuestionsResponse.Option oo = opts.get(j);
                        String translatedOpt = qn.get("options").get(j).asText("");
                        nextOpts.add(new TaskQuestionsResponse.Option(
                                oo.id(),
                                StringUtils.hasText(translatedOpt) ? translatedOpt : oo.content(),
                                oo.orderIndex()));
                    }
                    opts = nextOpts;
                }
                nextQs.add(new TaskQuestionsResponse.Question(
                        orig.id(),
                        textOr(qn, "content", orig.content()),
                        orig.questionType(),
                        orig.orderIndex(),
                        opts));
            }
            questions = nextQs;
        }

        return TaskQuestionsResponse.builder()
                .taskId(resp.taskId())
                .taskName(textOr(t, "taskName", resp.taskName()))
                .taskType(resp.taskType())
                .description(textOr(t, "description", resp.description()))
                .pointsReward(resp.pointsReward())
                .maxAttempts(resp.maxAttempts())
                .attempts(resp.attempts())
                .attemptsRemaining(resp.attemptsRemaining())
                .status(resp.status())
                .requiresLocation(resp.requiresLocation())
                .sequential(resp.sequential())
                .questionIndex(resp.questionIndex())
                .totalQuestions(resp.totalQuestions())
                .unlocked(resp.unlocked())
                .station(station)
                .stations(stations)
                .distanceMeters(resp.distanceMeters())
                .questions(questions)
                .durationSeconds(resp.durationSeconds())
                .qrRequired(resp.qrRequired())
                .perQuestionPoints(resp.perQuestionPoints())
                .build();
    }

    public PuzzleClueResponse localizePuzzleClue(PuzzleClueResponse resp, Locale locale) {
        if (resp == null || resp.taskId() == null) return resp;
        String lang = translationService.resolveTargetLang(locale);
        if (lang == null) return resp;

        ObjectNode payload = objectMapper.createObjectNode();
        putIfText(payload, "taskName", resp.taskName());
        putIfText(payload, "clue", resp.clue());
        putIfText(payload, "hint", resp.hint());

        JsonNode t = translationService.translateObject("PUZZLE_CLUE", resp.taskId(), lang, payload);
        if (t == null || !t.isObject()) return resp;

        return PuzzleClueResponse.builder()
                .taskId(resp.taskId())
                .taskName(textOr(t, "taskName", resp.taskName()))
                .taskType(resp.taskType())
                .clue(textOr(t, "clue", resp.clue()))
                .targetLatitude(resp.targetLatitude())
                .targetLongitude(resp.targetLongitude())
                .targetRadiusMeters(resp.targetRadiusMeters())
                .hint(textOr(t, "hint", resp.hint()))
                .attempts(resp.attempts())
                .completed(resp.completed())
                .build();
    }

    private void putIfText(ObjectNode node, String field, String value) {
        if (StringUtils.hasText(value)) node.put(field, value);
    }

    private String textOr(JsonNode node, String field, String fallback) {
        if (node == null || !node.has(field) || node.get(field).isNull()) return fallback;
        String v = node.get(field).asText("");
        return StringUtils.hasText(v) ? v : fallback;
    }
}
