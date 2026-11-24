package com.journeygo.modules.dashboard.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Định nghĩa 3 KHUNG SO SÁNH của trang Tổng quan vận hành (Admin).
 *
 * <p><b>Vì sao cần class riêng?</b> Dashboard có 3 câu hỏi khác nhau và mỗi câu hỏi cần
 * một cách so sánh khác nhau:
 * <ol>
 *   <li><b>Kỳ động</b> (30 ngày qua) — so với 30 ngày liền trước. Cùng độ dài ⇒ công bằng.</li>
 *   <li><b>Tháng</b> — tháng này so với <b>cùng số ngày</b> của tháng trước.</li>
 *   <li><b>Năm</b> — năm nay so với <b>cùng số ngày</b> của năm trước.</li>
 * </ol>
 *
 * <p><b>⚠️ Vì sao phải "cùng số ngày" mà không so cả kỳ trước?</b>
 * Nếu hôm nay là 24/11 và ta so "tháng này (24 ngày)" với "cả tháng trước (31 ngày)" thì
 * kết quả LUÔN ÂM ~23% — dù kinh doanh có tăng hay không. Người đọc báo cáo mất niềm tin
 * vào mọi con số trên dashboard. Nguyên tắc: <b>so sánh cùng số ngày đã qua</b>, ghi rõ
 * mốc thời gian cụ thể ra UI (VD: "24/10–24/11") để người đọc không phải suy nghĩ.
 *
 * <p><b>Vì sao tách "frame" (khung so sánh) khỏi "bucket" (ô thời gian)?</b>
 * Chuỗi xu hướng cần <b>cùng số điểm, cùng vị trí</b> giữa kỳ hiện tại và kỳ trước để
 * 2 đường trên biểu đồ chồng khít. {@link #bucketIndex} dùng VỊ TRÍ (index) thay vì
 * chuỗi khoá ⇒ 2 frame luôn cùng hình dạng dù độ dài thực tế lệch nhau (28 vs 31 ngày).
 */
public final class ComparisonPeriod {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /** Khoá khung so sánh — dùng làm tham số {@code range} của API. */
    public enum FrameKey {
        /** 7 ngày gần nhất (tuần). */
        WEEKLY,
        /** Tháng dương lịch hiện tại. */
        MONTHLY,
        /** Năm dương lịch hiện tại. */
        YEARLY,
        /** Khoảng ngày tùy chỉnh. */
        CUSTOM;

        /** Khung theo tháng (dùng cho {@link #isMonthlyFrame()}). */
        public boolean isMonthlyFrame() {
            return this == MONTHLY;
        }
    
        /** Khung theo năm — bucket = từng tháng trong năm. */
        public boolean isYearlyFrame() {
            return this == YEARLY;
        }
    }

    /**
     * Một KHUNG SO SÁNH: kỳ hiện tại + kỳ baseline (mốc so sánh).
     *
     * @param key            khung so sánh
     * @param label          nhãn ngắn của kỳ hiện tại (VD: "Tháng 11/2026")
     * @param currentLabel   khoảng ngày/tháng kỳ hiện tại (VD: "1/11 – 24/11")
     * @param baselineLabel  nhãn của mốc so sánh (VD: "1/10 – 24/10") — ghi rõ để dễ hiểu
     * @param currentFrom    mốc bắt đầu kỳ hiện tại
     * @param currentTo      mốc kết thúc kỳ hiện tại (exclusive)
     * @param baselineFrom   mốc bắt đầu kỳ baseline
     * @param baselineTo     mốc kết thúc kỳ baseline (exclusive)
     * @param bucketCount    số ô thời gian (ngày / tháng) của BẢN FRAME HIỆN TẠI
     */
    public record Frame(FrameKey key, String label, String currentLabel, String baselineLabel,
            Instant currentFrom, Instant currentTo,
            Instant baselineFrom, Instant baselineTo,
            int bucketCount) {

        // ── Kỳ hiện tại ──────────────────────────────────────────────────────

        /**
         * Số NGÀY LỊCH của kỳ hiện tại.
         *
         * <p>⚠️ Không dùng {@code Duration.toDays()} — nó TRẦN về 0 ngày khi chưa đủ
         * 24 giờ, nên "từ 1/11 đến 21/10 giờ" ra 23 thay vì 24. Số ngày lịch phải
         * đếm theo NGÀY (1/11 = ngày 1, 24/11 = ngày 24 ⇒ 24 ngày).
         */
        public int currentDays() {
            return calendarDays(currentFrom, currentTo);
        }

        /** Số ngày lịch của kỳ baseline. */
        public int baselineDays() {
            return calendarDays(baselineFrom, baselineTo);
        }

        /**
         * Đếm số ngày lịch trong khoảng [from, to).
         *
         * <p>Vì {@code to} là mốc EXCLUSIVE nên ngày cuối được tính là {@code to − 1 ngày}.
         * Ví dụ [01/11 00:00, 25/11 00:00) = 24 ngày (1/11 → 24/11).
         */
        private static int calendarDays(Instant from, Instant to) {
            LocalDate start = from.atZone(VN_ZONE).toLocalDate();
            LocalDate end = to.atZone(VN_ZONE).toLocalDate().minusDays(1);
            long days = ChronoUnit.DAYS.between(start, end) + 1;
            return (int) Math.max(1, days);
        }

        // ── Bucket (ô thời gian) ─────────────────────────────────────────────

        /**
         * Kỳ hiện tại có chia theo THÁNG không (khung "Năm" chia theo tháng).
         *
         * <p>Khung "Kỳ động" và "Tháng" luôn chia theo NGÀY.
         */
        public boolean isMonthlyBucket() {
            return key.isYearlyFrame();
        }

        /**
         * Vị trí bucket (ô thời gian) của một thời điểm trong KỲ HIỆN TẠI.
         *
         * @return index bucket, hoặc {@code -1} nếu thời điểm nằm ngoài kỳ
         */
        public int bucketIndex(Instant instant) {
            ZonedDateTime zoned = instant.atZone(VN_ZONE);
            if (isMonthlyBucket()) {
                ZonedDateTime start = currentFrom.atZone(VN_ZONE);
                int index = (zoned.getYear() - start.getYear()) * 12
                        + (zoned.getMonthValue() - start.getMonthValue());
                return index >= 0 && index < bucketCount ? index : -1;
            }
            LocalDate startDate = currentFrom.atZone(VN_ZONE).toLocalDate();
            long index = ChronoUnit.DAYS.between(startDate, zoned.toLocalDate());
            return index >= 0 && index < bucketCount ? (int) index : -1;
        }

        /**
         * Vị trí bucket của một thời điểm trong KỲ BASELINE.
         *
         * <p>⚠️ Dùng CHUNG hệ tọa độ với kỳ hiện tại (cùng độ dài theo bucket) ⇒ 2 đường
         * trên biểu đồ chồng khít và so sánh được đúng theo vị trí.
         */
        public int baselineBucketIndex(Instant instant) {
            ZonedDateTime zoned = instant.atZone(VN_ZONE);
            if (isMonthlyBucket()) {
                ZonedDateTime start = baselineFrom.atZone(VN_ZONE);
                int index = (zoned.getYear() - start.getYear()) * 12
                        + (zoned.getMonthValue() - start.getMonthValue());
                return index >= 0 && index < bucketCount ? index : -1;
            }
            LocalDate startDate = baselineFrom.atZone(VN_ZONE).toLocalDate();
            long index = ChronoUnit.DAYS.between(startDate, zoned.toLocalDate());
            return index >= 0 && index < bucketCount ? (int) index : -1;
        }

        /** Nhãn hiển thị cho bucket thứ {@code index} của kỳ hiện tại. */
        public String bucketLabel(int index) {
            if (key == FrameKey.YEARLY) {
                // Yearly: hiển thị T01, T02, ..., T12 (tháng)
                // Nếu hôm nay là tháng 11 (index 0-10), chỉ show T01-T11
                // Index chính là (tháng - 1)
                if (index >= bucketCount) return "";
                int month = index + 1;
                return String.format("T%02d", month);
            }
            
            if (key == FrameKey.MONTHLY) {
                ZonedDateTime m = currentFrom.atZone(VN_ZONE).plusMonths(index);
                return String.format("T%02d/%02d", m.getMonthValue(), m.getYear() % 100);
            }
            
            // ROLLING, CUSTOM: hiển thị dd/mm theo ngày
            // ⚠️ Khi index >= currentDays(): nằm ngoài kỳ hiện tại
            // Dùng baseline bucket label thay vì current
            int currentDays = currentDays();
            if (index >= currentDays) {
                // Offset từ baselineFrom
                LocalDate date = baselineFrom.atZone(VN_ZONE).toLocalDate().plusDays(index);
                return String.format("%02d/%02d", date.getDayOfMonth(), date.getMonthValue());
            }
            
            LocalDate date = currentFrom.atZone(VN_ZONE).toLocalDate().plusDays(index);
            return String.format("%02d/%02d", date.getDayOfMonth(), date.getMonthValue());
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Factory — dựng 3 khung so sánh
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Dựng khung so sánh theo {@code range} của API.
     *
     * @param range    weekly | monthly | yearly | custom
     * @param from     ngày bắt đầu (chỉ dùng khi range = custom, yyyy-MM-dd)
     * @param to       ngày kết thúc (chỉ dùng khi range = custom, yyyy-MM-dd)
     */
    public static Frame resolve(String range, String from, String to) {
        String key = (range == null || range.isBlank()) ? "weekly" : range.trim().toLowerCase();
        return switch (key) {
            case "monthly", "thismonth", "month" -> monthly();
            case "yearly", "year", "thisyear" -> yearly();
            case "custom" -> custom(from, to);
            default -> weekly();
        };
    }

    /**
     * Khung TUẦN — 7 ngày gần nhất vs 7 ngày liền trước.
     *
     * <p>Hai kỳ dài BẰNG NHAU ⇒ so sánh luôn công bằng, không cần "cùng số ngày".
     */
    private static Frame weekly() {
        ZonedDateTime now = ZonedDateTime.now(VN_ZONE);
        int days = 7;
        LocalDate today = now.toLocalDate();
        Instant currentTo = today.plusDays(1).atStartOfDay(VN_ZONE).toInstant();
        Instant currentFrom = today.minusDays(days - 1L).atStartOfDay(VN_ZONE).toInstant();
        Instant baselineFrom = today.minusDays(days * 2L - 1L).atStartOfDay(VN_ZONE).toInstant();
        return new Frame(FrameKey.WEEKLY,
                "7 ngày qua",
                dateRange(currentFrom, currentTo),
                dateRange(baselineFrom, currentFrom),
                currentFrom, currentTo, baselineFrom, currentFrom, days);
    }

    /**
     * Khung THÁNG — tháng này (01/11 → hôm nay) vs tháng trước cùng số ngày.
     *
     * <p>⚠️ NGUYÊN TẮC: So sánh CÙNG SỐ NGÀY, không phải tháng đầyđủ.
     * Logic: Dữ liệu hôm nay (25/11) vẫn incomplete (đang diễn ra), nên so sánh:
     * 01/11 – 25/11 (hôm nay) so với 01/10 – 25/10 (cùng ngày tháng trước).
     * Khi qua hết ngày 25 (vào 00:00 ngày 26), hôm nay trở thành 26/11 → update lại so sánh.
     * 
     * <p><b>Trục ngang (bucketCount)</b>: Dùng số ngày CÓ CẤP MAX (31) để hiển thị
     * đủ dữ liệu cả hai tháng.
     */
    private static Frame monthly() {
        ZonedDateTime now = ZonedDateTime.now(VN_ZONE);
        YearMonth currentMonth = YearMonth.from(now);
        YearMonth previousMonth = currentMonth.minusMonths(1);

        // Tháng này: từ ngày 1 đến hôm nay (inclusive)
        // Dữ liệu hôm nay chưa complete, nhưng vẫn được tính trong mốc so sánh
        Instant currentFrom = currentMonth.atDay(1).atStartOfDay(VN_ZONE).toInstant();
        Instant currentTo = now.toLocalDate().plusDays(1).atStartOfDay(VN_ZONE).toInstant();

        // Tháng trước: từ ngày 1 đến (cùng ngày tháng trước + 1 ngày) — cùng số ngày
        Instant baselineFrom = previousMonth.atDay(1).atStartOfDay(VN_ZONE).toInstant();
        Instant baselineTo = now.minusMonths(1).toLocalDate().plusDays(1).atStartOfDay(VN_ZONE).toInstant();

        // bucketCount = 31 (số ngày max)
        int maxDays = 31;

        return new Frame(FrameKey.MONTHLY,
                "Tháng " + currentMonth.getMonthValue() + "/" + currentMonth.getYear(),
                dateRange(currentFrom, currentTo),
                dateRange(baselineFrom, baselineTo),
                currentFrom, currentTo, baselineFrom, baselineTo, maxDays);
    }

    /**
     * Khung NĂM — năm nay (từ 1/1 → hôm nay) vs cùng số tháng năm trước.
     *
     * <p>Bucket = từng tháng trong năm (12 tháng) ⇒ biểu đồ đường so sánh theo tháng.
     * Baseline cũng chia 12 tháng tương ứng (tháng 1 năm trước ↔ tháng 1 năm nay).
     */
    private static Frame yearly() {
        ZonedDateTime now = ZonedDateTime.now(VN_ZONE);
        int currentYear = now.getYear();
        int previousYear = currentYear - 1;

        Instant currentFrom = LocalDate.of(currentYear, 1, 1).atStartOfDay(VN_ZONE).toInstant();
        Instant currentTo = now.toLocalDate().plusDays(1).atStartOfDay(VN_ZONE).toInstant();

        Instant baselineFrom = LocalDate.of(previousYear, 1, 1).atStartOfDay(VN_ZONE).toInstant();
        // Cùng ngày/tháng năm trước (nếu hôm nay 25/11, baseline = 25/11 năm trước)
        Instant baselineTo = now.minusYears(1).toLocalDate().plusDays(1).atStartOfDay(VN_ZONE).toInstant();

        return new Frame(FrameKey.YEARLY,
                "Năm " + currentYear,
                dateRangeYearly(currentFrom, currentTo, currentYear),
                dateRangeYearly(baselineFrom, baselineTo, previousYear),
                currentFrom, currentTo, baselineFrom, baselineTo, 12);
    }

    /**
     * Khung TÙY CHỌNH — do Admin chọn từ/đến.
     *
     * <p>Baseline = khoảng liền trước CÙNG ĐỘ DÀI (giống hành vi cũ của trang).
     */
    private static Frame custom(String fromParam, String toParam) {
        ZonedDateTime now = ZonedDateTime.now(VN_ZONE);
        LocalDate today = now.toLocalDate();

        LocalDate fromDate = parseDate(fromParam, today.minusDays(29));
        LocalDate toDate = parseDate(toParam, today);
        if (toDate.isBefore(fromDate)) {
            LocalDate tmp = fromDate;
            fromDate = toDate;
            toDate = tmp;
        }
        // "Đến ngày" là ngày CUỐI ⇒ mốc kết thúc exclusive = ngày đó + 1 ngày.
        Instant currentFrom = fromDate.atStartOfDay(VN_ZONE).toInstant();
        Instant currentTo = toDate.plusDays(1).atStartOfDay(VN_ZONE).toInstant();
        // Số ô thời gian = số ngày lịch (cả hai mốc đều 00:00 nên toDays() cũng đúng,
        // nhưng dùng calendarDays cho nhất quán với các khung khác).
        int days = (int) Math.max(1, ChronoUnit.DAYS.between(fromDate, toDate) + 1);

        Instant baselineFrom = currentFrom.minus(Duration.ofDays(days));
        Instant baselineTo = currentFrom; // Exclusive mốc cuối
        return new Frame(FrameKey.CUSTOM,
                "Tùy chỉnh",
                dateRange(currentFrom, currentTo),
                dateRange(baselineFrom, baselineTo),
                currentFrom, currentTo, baselineFrom, baselineTo, days);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════════════════

    private static LocalDate parseDate(String value, LocalDate fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            String trimmed = value.trim();
            // Thử parse định dạng dd/mm/yyyy trước (người dùng nhập từ UI)
            if (trimmed.contains("/")) {
                String[] parts = trimmed.split("/");
                if (parts.length == 3) {
                    int day = Integer.parseInt(parts[0]);
                    int month = Integer.parseInt(parts[1]);
                    int year = Integer.parseInt(parts[2]);
                    return LocalDate.of(year, month, day);
                }
            }
            // Fallback: thử parse yyyy-MM-dd (API request)
            return LocalDate.parse(trimmed.substring(0, Math.min(10, trimmed.length())));
        } catch (RuntimeException ex) {
            return fallback;
        }
    }

    /** "01/10 – 24/10" — nhãn mốc so sánh cụ thể, dễ hiểu hơn "kỳ trước". */
    private static String dateRange(Instant from, Instant to) {
        LocalDate fromDate = from.atZone(VN_ZONE).toLocalDate();
        // "to" là mốc EXCLUSIVE ⇒ ngày cuối hiển thị = to − 1 ngày.
        LocalDate toDate = to.atZone(VN_ZONE).toLocalDate().minusDays(1);
        return String.format("%02d/%02d – %02d/%02d",
                fromDate.getDayOfMonth(), fromDate.getMonthValue(),
                toDate.getDayOfMonth(), toDate.getMonthValue());
    }

    /** Format "01/01/2026 – 25/11/2026" cho yearly (kèm năm). */
    private static String dateRangeYearly(Instant from, Instant to, int year) {
        LocalDate fromDate = from.atZone(VN_ZONE).toLocalDate();
        LocalDate toDate = to.atZone(VN_ZONE).toLocalDate().minusDays(1);
        return String.format("%02d/%02d/%d – %02d/%02d/%d",
                fromDate.getDayOfMonth(), fromDate.getMonthValue(), year,
                toDate.getDayOfMonth(), toDate.getMonthValue(), year);
    }
}
