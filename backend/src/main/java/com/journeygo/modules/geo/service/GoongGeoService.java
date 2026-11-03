package com.journeygo.modules.geo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.MissingNode;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.geo.config.GoongProperties;
import com.journeygo.modules.geo.dto.GeoAddress;
import com.journeygo.modules.geo.dto.GeoRoute;
import com.journeygo.modules.geo.dto.GeoRouteStep;
import com.journeygo.modules.geo.dto.GeoSuggestion;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Tra cứu địa chỉ và chỉ đường qua Goong REST API v2. Mặc định v2 trả về đơn vị hành chính mới 2 cấp:
 * {@code compound = { commune, province }} (không còn quận/huyện).
 * Mỗi lần gọi tính 1 request vào hạn mức của key.
 *
 * @see <a href="https://help.goong.io/kb/rest-api-v2/">Goong REST API v2</a>
 */
@Slf4j
@Service
public class GoongGeoService {

    private static final int SUGGESTION_LIMIT = 8;

    /** Phương tiện Goong Directions hỗ trợ. */
    private static final Set<String> ROUTE_VEHICLES = Set.of("car", "bike", "taxi", "truck", "hd");

    /** Goong không có chế độ đi bộ: "walk" đi theo tuyến xe 2 bánh, thời gian tính lại theo tốc độ đi bộ. */
    private static final String WALK = "walk";

    /** Tốc độ đi bộ trung bình (m/s), ~4.7 km/h. */
    private static final double WALK_SPEED_MPS = 1.3;

    private final GoongProperties properties;
    private final RestClient restClient;

    public GoongGeoService(GoongProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) properties.getTimeout().toMillis());
        factory.setReadTimeout((int) properties.getTimeout().toMillis());
        this.restClient = restClientBuilder.requestFactory(factory).build();
    }

    /** Gợi ý địa chỉ khi gõ; {@code focus} ("lat,lng") giúp ưu tiên kết quả gần khu vực đang xem. */
    public List<GeoSuggestion> autocomplete(String text, String focus) {
        String query = text == null ? "" : text.trim();
        if (query.length() < 2) return List.of();

        UriComponentsBuilder uri = endpoint("/place/autocomplete")
                .queryParam("input", query)
                .queryParam("limit", SUGGESTION_LIMIT);
        if (focus != null && focus.matches("^-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?$")) {
            uri.queryParam("location", focus);
        }

        List<GeoSuggestion> result = new ArrayList<>();
        for (JsonNode p : call(uri).path("predictions")) {
            JsonNode fmt = p.path("structured_formatting");
            result.add(new GeoSuggestion(
                    text(p, "place_id"),
                    text(fmt, "main_text"),
                    text(fmt, "secondary_text"),
                    text(p, "description")));
        }
        return result;
    }

    /** Chi tiết + tọa độ của một gợi ý đã chọn. */
    public GeoAddress place(String placeId) {
        if (placeId == null || placeId.isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Thiếu mã tham chiếu địa điểm");
        }
        JsonNode result = call(endpoint("/place/detail").queryParam("place_id", placeId)).path("result");
        return result.isObject() ? toAddress(result) : null;
    }

    /** Địa chỉ gần nhất với một tọa độ (khi bấm / kéo ghim trên bản đồ); null nếu không có dữ liệu. */
    public GeoAddress reverse(double lat, double lng) {
        JsonNode results = call(endpoint("/geocode")
                .queryParam("latlng", lat + "," + lng)
                .queryParam("limit", 1))
                .path("results");
        if (!results.isArray() || results.isEmpty()) return null;
        GeoAddress addr = toAddress(results.get(0));
        // Giữ đúng điểm người dùng ghim, không nhảy về tọa độ của địa chỉ gần nhất
        return new GeoAddress(addr.display(), addr.detail(), addr.ward(), addr.province(), lat, lng);
    }

    /**
     * Đường đi từ {@code origin} tới {@code destination} (Directions v2); null nếu Goong không tìm được tuyến.
     * Đường vẽ ghép từ polyline của từng bước để bám sát mặt đường hơn đường tổng quát.
     */
    public GeoRoute direction(double fromLat, double fromLng, double toLat, double toLng, String vehicle) {
        boolean walking = WALK.equals(vehicle);
        String mode = vehicle != null && ROUTE_VEHICLES.contains(vehicle) ? vehicle : "bike";
        JsonNode routes = call(endpoint("/direction")
                .queryParam("origin", fromLat + "," + fromLng)
                .queryParam("destination", toLat + "," + toLng)
                .queryParam("vehicle", mode))
                .path("routes");
        if (!routes.isArray() || routes.isEmpty()) return null;

        JsonNode route = routes.get(0);
        JsonNode leg = route.path("legs").path(0);
        List<double[]> points = new ArrayList<>();
        List<GeoRouteStep> steps = new ArrayList<>();
        for (JsonNode s : leg.path("steps")) {
            JsonNode start = s.path("start_location");
            int stepDistance = s.path("distance").path("value").asInt();
            steps.add(new GeoRouteStep(
                    plainText(text(s, "html_instructions")),
                    text(s, "maneuver"),
                    stepDistance,
                    walking ? walkSeconds(stepDistance) : s.path("duration").path("value").asInt(),
                    start.path("lat").asDouble(),
                    start.path("lng").asDouble()));
            String encoded = text(s.path("polyline"), "points");
            if (encoded != null) {
                List<double[]> part = decodePolyline(encoded, start.path("lat").asDouble(), start.path("lng").asDouble());
                // Điểm đầu bước trùng điểm cuối bước trước
                points.addAll(points.isEmpty() || part.isEmpty() ? part : part.subList(1, part.size()));
            }
        }
        if (points.size() < 2) {
            String overview = text(route.path("overview_polyline"), "points");
            if (overview != null) points = decodePolyline(overview, fromLat, fromLng);
        }
        if (points.size() < 2) {
            points = List.of(new double[]{fromLat, fromLng}, new double[]{toLat, toLng});
        }

        int distance = leg.path("distance").path("value").asInt();
        int duration = walking ? walkSeconds(distance) : leg.path("duration").path("value").asInt();
        return new GeoRoute(
                distance,
                duration,
                text(leg.path("distance"), "text"),
                walking ? durationText(duration) : text(leg.path("duration"), "text"),
                points,
                steps);
    }

    static int walkSeconds(int meters) {
        return (int) Math.round(meters / WALK_SPEED_MPS);
    }

    /** 125 -> "3 phút", 4500 -> "1 giờ 15 phút". */
    static String durationText(int seconds) {
        int minutes = Math.max(1, (int) Math.round(seconds / 60.0));
        if (minutes < 60) return minutes + " phút";
        int rest = minutes % 60;
        return (minutes / 60) + " giờ" + (rest > 0 ? " " + rest + " phút" : "");
    }

    /**
     * Giải mã polyline kiểu Google. Tài liệu Goong không ghi độ chính xác, nên thử 1e5 trước;
     * nếu điểm đầu lệch xa {@code nearLat/nearLng} (quá ~2 km) thì dùng 1e6.
     */
    static List<double[]> decodePolyline(String encoded, double nearLat, double nearLng) {
        List<double[]> p5 = decodePolyline(encoded, 1e5);
        if (p5.isEmpty() || Math.abs(p5.get(0)[0] - nearLat) + Math.abs(p5.get(0)[1] - nearLng) < 0.02) return p5;
        List<double[]> p6 = decodePolyline(encoded, 1e6);
        return !p6.isEmpty() && Math.abs(p6.get(0)[0] - nearLat) + Math.abs(p6.get(0)[1] - nearLng) < 0.02 ? p6 : p5;
    }

    private static List<double[]> decodePolyline(String encoded, double factor) {
        List<double[]> points = new ArrayList<>();
        int index = 0;
        long lat = 0;
        long lng = 0;
        try {
            while (index < encoded.length()) {
                long[] delta = new long[2];
                for (int k = 0; k < 2; k++) {
                    long result = 0;
                    int shift = 0;
                    int b;
                    do {
                        b = encoded.charAt(index++) - 63;
                        result |= (long) (b & 0x1f) << shift;
                        shift += 5;
                    } while (b >= 0x20);
                    delta[k] = (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
                }
                lat += delta[0];
                lng += delta[1];
                points.add(new double[]{lat / factor, lng / factor});
            }
        } catch (StringIndexOutOfBoundsException e) {
            log.warn("[GOONG] polyline truncated after {} points", points.size());
        }
        return points;
    }

    /** "Rẽ <b>trái</b> vào &quot;A&quot;" -> "Rẽ trái vào \"A\"". */
    private static String plainText(String html) {
        if (html == null) return null;
        return html.replaceAll("<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&amp;", "&")
                .replaceAll("\\s+", " ")
                .trim();
    }

    /** Ánh xạ một kết quả Goong (geocode / place detail) sang địa chỉ 2 cấp. */
    private static GeoAddress toAddress(JsonNode node) {
        JsonNode compound = node.path("compound");
        JsonNode location = node.path("geometry").path("location");
        return new GeoAddress(
                text(node, "formatted_address"),
                text(node, "name"),
                text(compound, "commune"),
                text(compound, "province"),
                number(location, "lat"),
                number(location, "lng"));
    }

    private UriComponentsBuilder endpoint(String path) {
        if (!properties.isConfigured()) {
            throw new AppException(ErrorCode.GEOCODING_NOT_CONFIGURED);
        }
        return UriComponentsBuilder.fromHttpUrl(properties.getBaseUrl() + path)
                .queryParam("api_key", properties.getApiKey());
    }

    private JsonNode call(UriComponentsBuilder uri) {
        URI target = uri.encode().build().toUri();
        try {
            JsonNode body = restClient.get().uri(target).retrieve().body(JsonNode.class);
            return body == null ? MissingNode.getInstance() : body;
        } catch (RestClientResponseException e) {
            // Sai key, key bị giới hạn IP/tên miền, hoặc hết hạn mức
            int status = e.getStatusCode().value();
            log.warn("[GOONG] HTTP {} at {}", status, uri.build().getPath());
            throw new AppException(ErrorCode.GEOCODING_UNAVAILABLE, status == 401 || status == 403
                    ? "Goong từ chối API key (sai key, bị giới hạn IP/tên miền hoặc hết hạn mức)"
                    : "Không lấy được dữ liệu bản đồ từ Goong (HTTP " + status + "), vui lòng thử lại");
        } catch (RestClientException e) {
            log.warn("[GOONG] request failed: {}", e.getMessage());
            throw new AppException(ErrorCode.GEOCODING_UNAVAILABLE);
        }
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        if (v.isMissingNode() || v.isNull()) return null;
        String s = v.asText().trim();
        return s.isEmpty() ? null : s;
    }

    private static Double number(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return v.isNumber() ? v.asDouble() : null;
    }
}
