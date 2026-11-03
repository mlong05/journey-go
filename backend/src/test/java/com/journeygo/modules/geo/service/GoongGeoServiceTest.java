package com.journeygo.modules.geo.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GoongGeoServiceTest {

    /** Đường tổng quát trong ví dụ Directions v2 của Goong (11 Trần Cung, Hà Nội). */
    private static final String GOONG_SAMPLE = "mtm_C{cudSh@C^Ch@C?o@A[?oC?s@?mE?wBAuB@qCAwK?gB?iA?s@k@@aA@W?k@?cE@_C?}@?iE@kAAkF?cA?Q?C??f@?dAE~L@hK@lOGb@KPQHs@?qB@aG@wLAw@??[";

    @Test
    @DisplayName("Giải mã polyline mẫu của Goong ra toạ độ ở Hà Nội")
    void decodesGoongSampleNearOrigin() {
        List<double[]> points = GoongGeoService.decodePolyline(GOONG_SAMPLE, 21.0466, 105.7901);

        assertTrue(points.size() > 10);
        assertEquals(21.0466, points.get(0)[0], 0.001);
        assertEquals(105.7901, points.get(0)[1], 0.001);
        for (double[] p : points) {
            assertEquals(21.05, p[0], 0.05);
            assertEquals(105.79, p[1], 0.05);
        }
    }

    @Test
    @DisplayName("Polyline bị cắt cụt vẫn trả các điểm đã giải mã được")
    void truncatedPolylineKeepsDecodedPoints() {
        List<double[]> points = GoongGeoService.decodePolyline(GOONG_SAMPLE.substring(0, 11), 21.0466, 105.7901);

        assertFalse(points.isEmpty());
        assertEquals(21.0466, points.get(0)[0], 0.001);
    }

    @Test
    @DisplayName("Đi bộ: thời gian tính theo ~4.7 km/h và hiển thị phút/giờ")
    void walkDurationFromDistance() {
        assertEquals(769, GoongGeoService.walkSeconds(1000));
        assertEquals("13 phút", GoongGeoService.durationText(769));
        assertEquals("1 phút", GoongGeoService.durationText(10));
        assertEquals("1 giờ 15 phút", GoongGeoService.durationText(4500));
        assertEquals("2 giờ", GoongGeoService.durationText(7200));
    }
}
