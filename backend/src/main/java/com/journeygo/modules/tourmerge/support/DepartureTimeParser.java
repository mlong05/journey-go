package com.journeygo.modules.tourmerge.support;

import java.time.Duration;
import java.time.LocalTime;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Chuẩn hóa chuỗi giờ khởi hành tự do trên {@code tours.departure_time}
 * (ví dụ: {@code "08:00 sáng"}, {@code "07:30"}, {@code "8h30"}, {@code "02:15 PM"})
 * sang {@link LocalTime} để tính độ lệch phút khi ghép tour.
 */
public final class DepartureTimeParser {

    private static final Pattern TIME_PATTERN = Pattern.compile(
            "(?<!\\d)(\\d{1,2})(?:\\s*[:hH]|\\s*giờ|\\s*gio)\\s*(\\d{1,2})?(?!\\d)|(?<!\\d)(\\d{1,2})\\s*(?:sáng|sang|chiều|chieu|tối|toi|trưa|trua|am|pm)\\b"
    );

    private DepartureTimeParser() {
    }

    public static Optional<LocalTime> parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        Matcher matcher = TIME_PATTERN.matcher(normalized);
        if (!matcher.find()) {
            return Optional.empty();
        }

        String hourGroup = matcher.group(1) != null ? matcher.group(1) : matcher.group(3);
        String minuteGroup = matcher.group(2);
        if (hourGroup == null) {
            return Optional.empty();
        }

        int hour;
        int minute = 0;
        try {
            hour = Integer.parseInt(hourGroup);
            if (minuteGroup != null && !minuteGroup.isBlank()) {
                minute = Integer.parseInt(minuteGroup);
            }
        } catch (NumberFormatException e) {
            return Optional.empty();
        }

        boolean isPm = normalized.contains("chiều")
                || normalized.contains("chieu")
                || normalized.contains("tối")
                || normalized.contains("toi")
                || normalized.contains("pm")
                || normalized.contains("p.m");
        boolean isAm = normalized.contains("sáng")
                || normalized.contains("sang")
                || normalized.contains("am")
                || normalized.contains("a.m");

        if (isPm && hour >= 1 && hour <= 11) {
            hour += 12;
        } else if (isAm && hour == 12) {
            hour = 0;
        }

        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            return Optional.empty();
        }
        return Optional.of(LocalTime.of(hour, minute));
    }

    public static long minutesDiff(LocalTime first, LocalTime second) {
        if (first == null || second == null) {
            return Long.MAX_VALUE;
        }
        return Math.abs(Duration.between(first, second).toMinutes());
    }
}
