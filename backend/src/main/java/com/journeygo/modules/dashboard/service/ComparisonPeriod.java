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
        /** Tất cả thời gian (từ khi hệ thống có dữ liệu → hiện tại). */
        ALL,
        /** Hôm nay (so với hôm qua). */
        TODAY,
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

        /** Khung theo GIỜ — bucket = từng giờ trong ngày (chỉ dùng cho khung "Hôm nay"). */
        public boolean isHourlyFrame() {
            return this == TODAY;
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
         * Khung này có "kỳ trước" để so sánh hay không.
         *
         * <p>⚠️ Khung "Tất cả" (ALL) <b>KHÔNG</b> có mốc so sánh: "toàn bộ lịch sử"
         * không có kỳ trước tự nhiên. Nếu cứ lùi ngược một khoảng bằng độ dài kỳ
         * hiện tại, ta sẽ vẽ ra những năm không hề có dữ liệu (VD: 2013) ⇒ người
         * đọc tưởng doanh thu sụt giảm. Vì vậy ALL chỉ hiển thị MỘT chuỗi liên tục
         * từ bản ghi cũ nhất trong DB tới hiện tại.
         */
        public boolean hasBaseline() {
            return key != FrameKey.ALL;
        }

        /** Số NGÀY LỊCH của kỳ hiện tại.
         *
         * <p>⚠️ Không dùng {@code Duration.toDays()} — nó TRẦN về 0 ngày khi chưa đủ
         * 24 giờ, nên "từ 1/11 đến 21/10 giờ" ra 23 thay vì 24. Số ngày lịch phải
         * đếm theo NGÀY (1/11 = ngày 1, 24/11 = ngày 24 ⇒ 24 ngày).
         */
        public int currentDays() {
            // Khung "Hôm nay": bucket theo GIỜ ⇒ "ngày" luôn = 1.
            if (isHourlyBucket()) return 1;
            return calendarDays(currentFrom, currentTo);
        }

        /** Số ngày lịch của kỳ baseline. */
        public int baselineDays() {
            if (isHourlyBucket()) return 1;
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
         * Kỳ hiện tại có chia theo THÁNG không (khung "Năm" và "Tất cả" chia theo tháng).
         *
         * <p>Khung "7 ngày qua" và "Tháng" luôn chia theo NGÀY.
         */
        public boolean isMonthlyBucket() {
            return key.isYearlyFrame() || key == FrameKey.ALL;
        }

        /**
         * Kỳ hiện tại có chia theo GIỜ không (khung "Hôm nay" chia theo giờ).
         */
        public boolean isHourlyBucket() {
            return key.isHourlyFrame();
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
        if (isHourlyBucket()) {
            long index = ChronoUnit.HOURS.between(currentFrom.atZone(VN_ZONE), zoned);
            return index >= 0 && index < bucketCount ? (int) index : -1;
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
        if (isHourlyBucket()) {
            long index = ChronoUnit.HOURS.between(baselineFrom.atZone(VN_ZONE), zoned);
            // ⚠️ Khung "Hôm nay": baseline chỉ kéo dài tới CÙNG GIỜ hiện tại ⇒ các giờ
            // chưa "đã qua" ở hôm nay không có dữ liệu tương ứng ở hôm qua ⇒ bỏ qua.
            if (!instant.isBefore(baselineTo)) return -1;
            return index >= 0 && index < bucketCount ? (int) index : -1;
        }
        LocalDate startDate = baselineFrom.atZone(VN_ZONE).toLocalDate();
        long index = ChronoUnit.DAYS.between(startDate, zoned.toLocalDate());
        return index >= 0 && index < bucketCount ? (int) index : -1;
    }

    /**
     * Mốc bắt đầu của bucket thứ {@code index} trong KỲ HIỆN TẠI.
     *
     * <p>Dùng để biết bucket nào đã "diễn ra" (dữ liệu có thật) và bucket nào
     * nằm trong tương lai (chưa có dữ liệu ⇒ vẽ null cho khỏi vẽ đường xuống 0).
     */
    public Instant bucketStart(int index) {
        if (isHourlyBucket())
                return currentFrom.plus(Duration.ofHours(index));
        if (isMonthlyBucket())
                return currentFrom.atZone(VN_ZONE).plusMonths(index).toInstant();
        return currentFrom.plus(Duration.ofDays(index));
    }

    /**
     * Mốc bắt đầu của bucket thứ {@code index} trong Kỳ BASELINE.
     *
     * <p>Chỉ dùng cho khung "Hôm nay" (bucket theo giờ) — để biết giờ nào của
     * hôm qua đã "qua" (tương ứng giờ đã qua của hôm nay) và giờ nào chưa.
     */
    public Instant baselineBucketStart(int index) {
        return isHourlyBucket()
                ? baselineFrom.plus(Duration.ofHours(index))
                : baselineFrom.plus(Duration.ofDays(index));
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

            if (key == FrameKey.ALL) {
                // Khung "Tất cả": bucket theo THÁNG từ 2020-01 ⇒ nhãn "T01/2020"…
                if (index >= bucketCount) return "";
                ZonedDateTime start = currentFrom.atZone(VN_ZONE);
                ZonedDateTime bucket = start.plusMonths(index);
                return String.format("T%02d/%d", bucket.getMonthValue(), bucket.getYear());
            }

            if (key == FrameKey.MONTHLY) {
                // ⚠️ Khung "Tháng": bucket = TỪNG NGÀY của tháng hiện tại (xem `monthly()`),
                // nên nhãn phải là NGÀY ("01/11", "02/11"…) — KHÔNG phải tháng.
                // Trước đây nhãn là "T11/26, T12/26…" ⇒ trục ngang hiện sai hoàn toàn.
                // ⚠️ Ô vượt quá số ngày của tháng hiện tại (VD: ô 31 khi tháng 11 chỉ có
                // 30 ngày) ⇒ trả về "" để trục ngang KHÔNG vẽ nhãn ngày của tháng sau.
                // Ô đó vẫn tồn tại trên biểu đồ (đường nét đứt vẽ tới 31/10).
                LocalDate start = currentFrom.atZone(VN_ZONE).toLocalDate();
                LocalDate date = start.plusDays(index);
                if (!currentBucketExists(index)) return "";
                return String.format("%02d/%02d", date.getDayOfMonth(), date.getMonthValue());
            }

            // TODAY: bucket theo GIỜ trong ngày ⇒ nhãn "14:00".
            // ⚠️ Phải xử lý TRƯỚC nhánh fallback bên dưới vì currentDays() = 1
            // (chỉ 1 ngày) nhưng bucketCount = 24 (24 giờ).
            if (isHourlyBucket()) {
                ZonedDateTime h = currentFrom.atZone(VN_ZONE).plusHours(index);
                return String.format("%02d:00", h.getHour());
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

        /**
         * Bucket thứ {@code index} có tồn tại trong KỲ HIỆN TẠI không.
         *
         * <p>⚠️ Khung "Tháng": tháng hiện tại có thể NGẮN hơn tháng trước
         * (VD: tháng 11 có 30 ngày, tháng 10 có 31) ⇒ bucket thứ 31 không có
         * ngày tương ứng trong tháng hiện tại ⇒ ô đó không có dữ liệu kỳ này.
         */
        public boolean currentBucketExists(int index) {
            if (key != FrameKey.MONTHLY) return true;
            LocalDate start = currentFrom.atZone(VN_ZONE).toLocalDate();
            LocalDate date = start.plusDays(index);
            return date.getMonth() == start.getMonth() && date.getYear() == start.getYear();
        }

        /**
         * Bucket thứ {@code index} có tồn tại trong KỲ BASELINE không.
         *
         * <p>⚠️ Ngược với {@link #currentBucketExists}: tháng trước có thể DÀI hơn
         * tháng hiện tại ⇒ bucket 31 có ngày ở tháng trước (31/10) nhưng không có
         * ở tháng hiện tại ⇒ đường nét đứt vẽ tới ô đó, đường nét liền thì dừng trước.
         */
        public boolean baselineBucketExists(int index) {
            if (key != FrameKey.MONTHLY) return true;
            LocalDate start = baselineFrom.atZone(VN_ZONE).toLocalDate();
            LocalDate date = start.plusDays(index);
            return date.getMonth() == start.getMonth() && date.getYear() == start.getYear();
        }

        /**
         * Nhãn hiển thị cho bucket thứ {@code index} của KỲ BASELINE.
         *
         * <p>⚠️ Vì sao cần hàm RIÊNG (thay vì dùng chung {@link #bucketLabel})?
         * 2 kỳ nằm ở 2 tháng khác nhau (tháng này vs tháng trước) ⇒ cùng một vị trí
         * trục ngang là 2 ngày khác nhau. Nếu dùng chung nhãn thì tooltip sẽ báo
         * nhầm ("23/11" cho cả 2 đường) ⇒ người đọc tưởng đang so 23/11 với 23/11.
         * Backend phát nhãn baseline ⇒ frontend không phải tự tính toán ngày
         * (dễ sai khi đổi tháng có 30/31 ngày, sang năm, …).
         */
        public String baselineBucketLabel(int index) {
            if (key == FrameKey.YEARLY) {
                // Yearly: cùng tháng, chỉ khác NĂN ⇒ gắn năm của kỳ baseline
                // (VD: "T06/2025") để tooltip nói rõ đang so với năm nào.
                ZonedDateTime b = baselineFrom.atZone(VN_ZONE);
                return String.format("T%02d/%04d", index + 1, b.getYear());
            }
            if (key == FrameKey.ALL) {
                // Khung "Tất cả": baseline lùi đúng số tháng ⇒ gắn năm của kỳ baseline.
                if (index >= bucketCount) return "";
                ZonedDateTime b = baselineFrom.atZone(VN_ZONE).plusMonths(index);
                return String.format("T%02d/%d", b.getMonthValue(), b.getYear());
            }
            if (key == FrameKey.MONTHLY) {
                LocalDate start = baselineFrom.atZone(VN_ZONE).toLocalDate();
                LocalDate date = start.plusDays(index);
                // ⚠️ Tháng trước NGẮN hơn tháng hiện tại (VD: tháng 10 có 30 ngày,
                // tháng 11 có 31) ⇒ ô 31 không có ngày ở tháng trước ⇒ không nhãn.
                if (!baselineBucketExists(index)) return "";
                return String.format("%02d/%02d", date.getDayOfMonth(), date.getMonthValue());
            }
            if (isHourlyBucket()) {
                // Khung "Hôm nay": giờ tương ứng của HÔM QUA (VD: "14:00").
                ZonedDateTime h = baselineFrom.atZone(VN_ZONE).plusHours(index);
                return String.format("%02d:00", h.getHour());
            }
            LocalDate date = baselineFrom.atZone(VN_ZONE).toLocalDate().plusDays(index);
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
        return resolve(range, from, to, null);
    }

    /**
     * Dựng khung so sánh theo {@code range} của API.
     *
     * @param range    weekly | monthly | yearly | custom | all
     * @param from     ngày bắt đầu (chỉ dùng khi range = custom, yyyy-MM-dd)
     * @param to       ngày kết thúc (chỉ dùng khi range = custom, yyyy-MM-dd)
     * @param earliest ngày có dữ liệu đầu tiên trong DB — chỉ dùng cho khung "Tất cả"
     *                 để chuỗi bắt đầu đúng chỗ có dữ liệu thay vì một mốc cố định
     */
    public static Frame resolve(String range, String from, String to, LocalDate earliest) {
        String key = (range == null || range.isBlank()) ? "all" : range.trim().toLowerCase();
        return switch (key) {
            case "all" -> all(earliest);
            case "today", "day" -> today();
            case "weekly", "week", "rolling" -> weekly();
            case "monthly", "thismonth", "month" -> monthly();
            case "yearly", "year", "thisyear" -> yearly();
            case "custom" -> custom(from, to);
            default -> all(earliest);
        };
    }

    /**
     * Khung TẤT CẢ — toàn bộ dữ liệu từ bản ghi CŨ NHẤT trong DB → hiện tại.
     *
     * <p><b>⚠️ Vì sao KHÔNG có kỳ trước?</b>
     * "Toàn bộ lịch sử" không có mốc so sánh tự nhiên. Nếu cứ lùi ngược một khoảng
     * bằng đúng độ dài kỳ hiện tại thì ta sẽ vẽ ra những năm hệ thống chưa tồn tại
     * (VD: 2013) ⇒ người đọc tưởng doanh thu sụt giảm mạnh. Vì vậy khung này chỉ
     * hiển thị MỘT chuỗi liên tục: từ tháng có dữ liệu đầu tiên tới tháng hiện tại.
     *
     * <p><b>⚠️ Vì sao bucket = THÁNG chứ không phải NGÀY?</b>
     * Kỳ "tất cả" có thể dài hàng năm ⇒ chia theo ngày sẽ ra hàng nghìn bucket ⇒ biểu đồ
     * không đọc được. Ta dùng bucket theo THÁNG ⇒ trục ngang gọn, vẫn thấy được xu hướng
     * dài hạn.
     *
     * @param earliest ngày có dữ liệu đầu tiên (null = dùng mốc mặc định)
     */
    private static Frame all(LocalDate earliest) {
        ZonedDateTime now = ZonedDateTime.now(VN_ZONE);
        LocalDate today = now.toLocalDate();
        // Mốc bắt đầu: bản ghi CŨ NHẤT có trong DB (lùi về đầu tháng cho gọn trục ngang).
        LocalDate startDate = (earliest != null && !earliest.isAfter(today))
                ? earliest
                : DEFAULT_EARLIEST;
        YearMonth startMonth = YearMonth.from(startDate);
        YearMonth lastMonth = YearMonth.from(today);

        Instant currentFrom = startMonth.atDay(1).atStartOfDay(VN_ZONE).toInstant();
        Instant currentTo = today.plusDays(1).atStartOfDay(VN_ZONE).toInstant();

        int months = (int) Math.max(1, ChronoUnit.MONTHS.between(startMonth, lastMonth) + 1);

        // ⚠️ KHÔNG có baseline: baselineFrom == baselineTo == currentFrom ⇒ lát cắt
        // dữ liệu chỉ gồm kỳ hiện tại, không tải thêm dữ liệu "trước 2013".
        return new Frame(FrameKey.ALL,
                "Tất cả",
                dateRangeWithYear(currentFrom, currentTo),
                "",
                currentFrom, currentTo, currentFrom, currentFrom, months);
    }

    /** Mốc dự phòng khi không xác định được ngày có dữ liệu đầu tiên. */
    private static final LocalDate DEFAULT_EARLIEST = LocalDate.of(2020, 1, 1);

    /**
     * Khung TẤT CẢ với mốc bắt đầu mặc định (dùng khi chưa biết dữ liệu đầu tiên).
     */
    static Frame all() {
        return all(null);
    }

    /**
     * Khung HÔM NAY — hôm nay (00:00 → hết ngày) so với hôm qua (00:00 → cùng giờ).
     *
     * <p><b>⚠️ Vì sao baseline là "hôm qua đến CÙNG GIỜ" chứ không phải cả ngày qua?</b>
     * Nếu hiện tại là 20:00 thì "hôm nay" mới có 20 giờ dữ liệu, còn "hôm qua" có đủ 24 giờ
     * ⇒ so sánh luôn nghiêng về kỳ trước (giảm giả ~17%). Nguyên tắc chung của trang là
     * <b>so sánh cùng số thời gian đã qua</b> ⇒ baseline cắt tại đúng giờ hiện tại.
     *
     * <p><b>Bucket = GIỜ</b> (24 ô) thay vì ngày: nếu chỉ có 1 điểm thì biểu đồ đường
     * không vẽ được đường ⇒ mất ý nghĩa. Chia theo giờ cho thấy dòng tiền phát sinh
     * trong ngày và so được với đúng giờ của hôm qua.
     */
    private static Frame today() {
        ZonedDateTime now = ZonedDateTime.now(VN_ZONE);
        int hours = 24;
        LocalDate today = now.toLocalDate();
        Instant currentFrom = today.atStartOfDay(VN_ZONE).toInstant();
        Instant currentTo = today.plusDays(1).atStartOfDay(VN_ZONE).toInstant();
        Instant baselineFrom = today.minusDays(1).atStartOfDay(VN_ZONE).toInstant();
        // Baseline kết thúc ở CÙNG GIỜ của hôm qua ⇒ 2 kỳ dài bằng nhau.
        Duration elapsed = Duration.between(currentFrom, now);
        Instant baselineTo = baselineFrom.plus(elapsed);
        return new Frame(FrameKey.TODAY,
                "Hôm nay",
                "Hôm nay",
                "hôm qua",
                currentFrom, currentTo, baselineFrom, baselineTo, hours);
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
     * <p><b>Trục ngang (bucketCount)</b>: Dùng số ngày THẬT của tháng hiện tại
     * (28/29/30/31) để trục ngang khớp đúng với tháng đang xem.
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

        // ⚠️ bucketCount = MAX số ngày của HAI tháng (tháng này & tháng trước).
        // VD: tháng 11 có 30 ngày, tháng 10 có 31 ngày ⇒ cần 31 ô để chứa đủ
        // NGÀY TRÙNG nhau (1/10↔1/11 … 30/10↔30/11) VÀ ngày 31 chỉ có ở tháng trước.
        // Ô 31: kỳ hiện tại không có ngày 31 (tháng 11) ⇒ đường nét liền dừng ở ô 30,
        // đường nét đứt (mốc so sánh) vẫn có giá trị tới ô 31 (31/10).
        int maxDays = Math.max(currentMonth.lengthOfMonth(), previousMonth.lengthOfMonth());

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
        // ⚠️ Khoảng 1 ngày (khung "Hôm nay") ⇒ hiển thị 1 ngày thay vì "25/11 – 25/11".
        if (fromDate.equals(toDate)) {
            return String.format("%02d/%02d", fromDate.getDayOfMonth(), fromDate.getMonthValue());
        }
        return String.format("%02d/%02d – %02d/%02d",
                fromDate.getDayOfMonth(), fromDate.getMonthValue(),
                toDate.getDayOfMonth(), toDate.getMonthValue());
    }

    /** "01/01/2020 – 26/11/2026" — dạng có NĂM, dùng cho khung "Tất cả". */
    private static String dateRangeWithYear(Instant from, Instant to) {
        LocalDate fromDate = from.atZone(VN_ZONE).toLocalDate();
        LocalDate toDate = to.atZone(VN_ZONE).toLocalDate().minusDays(1);
        return String.format("%02d/%02d/%d – %02d/%02d/%d",
                fromDate.getDayOfMonth(), fromDate.getMonthValue(), fromDate.getYear(),
                toDate.getDayOfMonth(), toDate.getMonthValue(), toDate.getYear());
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
