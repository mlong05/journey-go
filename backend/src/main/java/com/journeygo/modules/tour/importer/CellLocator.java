package com.journeygo.modules.tour.importer;

import com.journeygo.modules.tour.importer.dto.TourImportIssue;

import java.util.HashMap;
import java.util.Map;

/**
 * Ghi nhớ trường nào của request được đọc từ ô nào, để đổi lỗi theo đường dẫn
 * (ví dụ {@code stops.stops[1].quiz[0].answers[2].content}) về đúng sheet / dòng / cột Excel.
 *
 * <p>Tra cứu theo tiền tố dài nhất: không có {@code ...answers[2].content} thì thử
 * {@code ...answers[2]}, {@code ...answers}, {@code ...quiz[0]}, …
 */
final class CellLocator {

    record Location(String sheet, Integer row, String column) {}

    private final Map<String, Location> locations = new HashMap<>();

    /** @param rowIndex chỉ số dòng của POI (bắt đầu từ 0), null = không gắn dòng */
    void put(String path, String sheet, Integer rowIndex, String column) {
        locations.put(path, new Location(sheet, rowIndex == null ? null : rowIndex + 1, column));
    }

    Location find(String path) {
        String current = path;
        while (current != null && !current.isEmpty()) {
            Location location = locations.get(current);
            if (location != null) return location;
            current = parent(current);
        }
        return null;
    }

    TourImportIssue issue(String path, String fallbackSheet, String message) {
        Location location = find(path);
        if (location == null) return new TourImportIssue(fallbackSheet, null, null, message);
        return new TourImportIssue(location.sheet(), location.row(), location.column(), message);
    }

    /** "a.b[1].c" → "a.b[1]" → "a.b" → "a" → null */
    static String parent(String path) {
        if (path.endsWith("]")) {
            int open = path.lastIndexOf('[');
            return open <= 0 ? null : path.substring(0, open);
        }
        int dot = path.lastIndexOf('.');
        return dot <= 0 ? null : path.substring(0, dot);
    }
}
