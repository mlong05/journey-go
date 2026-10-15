package com.journeygo.modules.experience.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Tiện ích tính toán địa lý cho module Experience.
 *
 * <p>CONTEXT §3.4 / §5.2 yêu cầu validate check-in GPS bằng công thức Haversine
 * (CONTEXT ghi "đã có trong core module" — thực tế chưa có → tự tạo ở đây).</p>
 *
 * <p>BR-UCIP-2: Check-in hợp lệ khi distance <= radius_meters.</p>
 */
public final class GeoUtils {

    /** Bán kính Trái Đất theo mét (trung bình). */
    private static final double EARTH_RADIUS_METERS = 6_371_000d;

    private static final BigDecimal MIN_LAT = new BigDecimal("-90");
    private static final BigDecimal MAX_LAT = new BigDecimal("90");
    private static final BigDecimal MIN_LNG = new BigDecimal("-180");
    private static final BigDecimal MAX_LNG = new BigDecimal("180");

    private GeoUtils() {
        // utility class
    }

    /**
     * Tính khoảng cách giữa 2 điểm GPS theo công thức Haversine.
     *
     * @param lat1 vĩ độ điểm 1 (độ)
     * @param lng1 kinh độ điểm 1 (độ)
     * @param lat2 vĩ độ điểm 2 (độ)
     * @param lng2 kinh độ điểm 2 (độ)
     * @return khoảng cách tính bằng mét, làm tròn 2 chữ số thập phân
     * @throws IllegalArgumentException nếu input null / out of range / NaN / infinite
     */
    public static BigDecimal haversineMeters(BigDecimal lat1, BigDecimal lng1,
                                             BigDecimal lat2, BigDecimal lng2) {
        Objects.requireNonNull(lat1, "lat1 must not be null");
        Objects.requireNonNull(lng1, "lng1 must not be null");
        Objects.requireNonNull(lat2, "lat2 must not be null");
        Objects.requireNonNull(lng2, "lng2 must not be null");

        validateLat(lat1);
        validateLat(lat2);
        validateLng(lng1);
        validateLng(lng2);

        double phi1 = Math.toRadians(lat1.doubleValue());
        double phi2 = Math.toRadians(lat2.doubleValue());
        double dPhi = Math.toRadians(lat2.subtract(lat1).doubleValue());
        double dLambda = Math.toRadians(lng2.subtract(lng1).doubleValue());

        double a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2)
                + Math.cos(phi1) * Math.cos(phi2)
                * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        double meters = EARTH_RADIUS_METERS * c;
        if (!Double.isFinite(meters)) {
            throw new IllegalArgumentException(
                    "Haversine trả về giá trị không hợp lệ (NaN/Infinite) — kiểm tra lại tọa độ đầu vào");
        }
        return BigDecimal.valueOf(meters).setScale(2, RoundingMode.HALF_UP);
    }

    private static void validateLat(BigDecimal lat) {
        if (lat.compareTo(MIN_LAT) < 0 || lat.compareTo(MAX_LAT) > 0) {
            throw new IllegalArgumentException("Latitude out of range [-90, 90]: " + lat);
        }
    }

    private static void validateLng(BigDecimal lng) {
        if (lng.compareTo(MIN_LNG) < 0 || lng.compareTo(MAX_LNG) > 0) {
            throw new IllegalArgumentException("Longitude out of range [-180, 180]: " + lng);
        }
    }

    /**
     * Check-in hợp lệ khi distance <= radius_meters (BR-UCIP-2).
     *
     * <p>Dùng {@code BigDecimal.compareTo}, KHÔNG dùng {@code intValue()} (sẽ truncate
     * gây false-positive cho các điểm sát biên radius — ví dụ 50.99m với radius=50m).</p>
     *
     * @return true nếu điểm check-in nằm trong bán kính cho phép
     */
    public static boolean isWithinRadius(BigDecimal userLat, BigDecimal userLng,
                                         BigDecimal pointLat, BigDecimal pointLng,
                                         int radiusMeters) {
        BigDecimal distance = haversineMeters(userLat, userLng, pointLat, pointLng);
        BigDecimal radius = BigDecimal.valueOf(radiusMeters);
        return distance.compareTo(radius) <= 0;
    }
}
