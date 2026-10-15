package com.journeygo.modules.experience.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

public final class GeoUtils {


    private static final double EARTH_RADIUS_METERS = 6_371_000d;

    private static final BigDecimal MIN_LAT = new BigDecimal("-90");
    private static final BigDecimal MAX_LAT = new BigDecimal("90");
    private static final BigDecimal MIN_LNG = new BigDecimal("-180");
    private static final BigDecimal MAX_LNG = new BigDecimal("180");

    private GeoUtils() {

    }


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


    public static boolean isWithinRadius(BigDecimal userLat, BigDecimal userLng,
                                         BigDecimal pointLat, BigDecimal pointLng,
                                         int radiusMeters) {
        BigDecimal distance = haversineMeters(userLat, userLng, pointLat, pointLng);
        BigDecimal radius = BigDecimal.valueOf(radiusMeters);
        return distance.compareTo(radius) <= 0;
    }
}
