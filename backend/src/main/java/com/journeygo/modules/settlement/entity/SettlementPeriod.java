package com.journeygo.modules.settlement.entity;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import lombok.Getter;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;

/**
 * Kỳ tất toán — chia tháng thành các CHU KỲ 10 NGÀY.
 *
 * <p><b>Quy tắc (theo yêu cầu "tất toán 10 ngày 1 lần")</b>:
 * <ul>
 *   <li>Chu kỳ 1 — ngày 1 → 10 của tháng.</li>
 *   <li>Chu kỳ 2 — ngày 11 → 20 của tháng.</li>
 *   <li>Chu kỳ 3 — ngày 21 → ngày cuối cùng của tháng
 *       (có thể dài 8/9/10/11 ngày tuỳ tháng có 28/29/30/31 ngày).</li>
 * </ul>
 *
 * <p><b>Định dạng {@code revenuePeriod}</b>: {@code yyyy-MM-D} — D là số thứ tự chu kỳ (1, 2, 3).
 * Ví dụ: {@code 2026-10-1} = 01/10 → 10/10/2026, {@code 2026-10-3} = 21/10 → 31/10/2026.
 *
 * <p>Định dạng này giữ nguyên tính chất "so sánh được bằng chuỗi" của {@code yyyy-MM}
 * (sắp xếp & so sánh trước/sau vẫn đúng) ⇒ các truy vấn gom nhóm theo kỳ không phải sửa.
 *
 * <p>⚠️ <b>Tương thích ngược</b>: kỳ cũ theo tháng ({@code yyyy-MM}) vẫn được đọc được —
 * xem {@link #parse(String)}. Việc quy đổi dữ liệu cũ sang kỳ 10 ngày do migration lo.
 */
@Getter
public final class SettlementPeriod {

    /** Số chu kỳ trong một tháng: 1 (1-10), 2 (11-20), 3 (21-cuối tháng). */
    public static final int CYCLE_COUNT = 3;

    /** Ngày bắt đầu chu kỳ 1. */
    private static final int CYCLE_1_START = 1;
    /** Ngày kết thúc chu kỳ 1. */
    private static final int CYCLE_1_END = 10;
    /** Ngày bắt đầu chu kỳ 2. */
    private static final int CYCLE_2_START = 11;
    /** Ngày kết thúc chu kỳ 2. */
    private static final int CYCLE_2_END = 20;
    /** Ngày bắt đầu chu kỳ 3. */
    private static final int CYCLE_3_START = 21;

    private final YearMonth yearMonth;
    /** Số thứ tự chu kỳ trong tháng: 1, 2 hoặc 3. */
    private final int cycle;

    private SettlementPeriod(YearMonth yearMonth, int cycle) {
        this.yearMonth = yearMonth;
        this.cycle = cycle;
    }

    // ── Tạo kỳ ───────────────────────────────────────────────────────────────

    /**
     * Kỳ chứa ngày {@code date} — dùng để gán {@code revenuePeriod} cho khoản doanh thu.
     */
    public static SettlementPeriod of(LocalDate date) {
        if (date == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ngày không được để trống");
        }
        YearMonth ym = YearMonth.of(date.getYear(), date.getMonth());
        int day = date.getDayOfMonth();
        int cycle = day <= CYCLE_1_END ? 1 : (day <= CYCLE_2_END ? 2 : 3);
        return new SettlementPeriod(ym, cycle);
    }

    /**
     * Kỳ 10 ngày có số thứ tự {@code cycle} của tháng {@code yearMonth}.
     */
    public static SettlementPeriod of(YearMonth yearMonth, int cycle) {
        if (yearMonth == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tháng không được để trống");
        }
        if (cycle < 1 || cycle > CYCLE_COUNT) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Số thứ tự kỳ tất toán phải từ 1 đến " + CYCLE_COUNT + " (nhận: " + cycle + ")");
        }
        return new SettlementPeriod(yearMonth, cycle);
    }

    /**
     * Lùi {@code count} chu kỳ (1 = kỳ trước, 2 = kỳ trước nữa, ...).
     *
     * <p>Khác với {@code of(date.minusDays(n))}: mỗi bước lùi luôn nhảy đúng 1 chu kỳ
     * ⇒ dùng để duyệt lùi danh sách kỳ đã đóng.
     */
    public SettlementPeriod minusCycles(int count) {
        return shiftCycles(-count);
    }

    /**
     * Tiến {@code count} chu kỳ (1 = kỳ sau, 2 = kỳ sau nữa, ...).
     *
     * <p>Dùng để biết kỳ nào sẽ xét lại các khoản doanh thu đang bị giữ lại.
     */
    public SettlementPeriod plusCycles(int count) {
        return shiftCycles(count);
    }

    /** Dịch chuyển {@code delta} chu kỳ (dương = tiến, âm = lùi). */
    private SettlementPeriod shiftCycles(int delta) {
        if (delta == 0) {
            return this;
        }
        int total = (yearMonth.getYear() * 12 + (yearMonth.getMonthValue() - 1)) * CYCLE_COUNT
                + (cycle - 1)
                + delta;
        int year = Math.floorDiv(total, 12 * CYCLE_COUNT);
        int rem = Math.floorMod(total, 12 * CYCLE_COUNT);
        int month = rem / CYCLE_COUNT + 1;
        int newCycle = rem % CYCLE_COUNT + 1;
        return new SettlementPeriod(YearMonth.of(year, month), newCycle);
    }

    // ── Biên đầu / cuối ───────────────────────────────────────────────────────

    /** Ngày bắt đầu của kỳ. */
    public LocalDate getStart() {
        return switch (cycle) {
            case 1 -> yearMonth.atDay(CYCLE_1_START);
            case 2 -> yearMonth.atDay(CYCLE_2_START);
            default -> yearMonth.atDay(CYCLE_3_START);
        };
    }

    /** Ngày kết thúc của kỳ (bao gồm). */
    public LocalDate getEnd() {
        return switch (cycle) {
            case 1 -> yearMonth.atDay(CYCLE_1_END);
            case 2 -> yearMonth.atDay(CYCLE_2_END);
            default -> yearMonth.atEndOfMonth();
        };
    }

    /** Số ngày của kỳ (8 / 9 / 10 / 11 ngày). */
    public long getLengthInDays() {
        return ChronoUnit.DAYS.between(getStart(), getEnd()) + 1;
    }

    // ── Định dạng ────────────────────────────────────────────────────────────

    /** Chuỗi {@code revenuePeriod}: {@code yyyy-MM-D}. */
    public String toPeriodString() {
        return String.format("%04d-%02d-%d", yearMonth.getYear(), yearMonth.getMonthValue(), cycle);
    }

    /** Nhãn tiếng Việt: "01/10 – 10/10/2026". */
    public String toDisplayLabel() {
        return String.format("%02d/%02d – %02d/%02d/%04d",
                getStart().getDayOfMonth(), getStart().getMonthValue(),
                getEnd().getDayOfMonth(), getEnd().getMonthValue(),
                yearMonth.getYear());
    }

    /** Nhãn ngắn: "Kỳ 1 · 01–10/10/2026". */
    public String toShortLabel() {
        return String.format("Kỳ %d · %02d–%02d/%02d/%04d",
                cycle,
                getStart().getDayOfMonth(), getEnd().getDayOfMonth(),
                yearMonth.getMonthValue(), yearMonth.getYear());
    }

    @Override
    public String toString() {
        return toPeriodString();
    }

    // ── Đọc chuỗi ────────────────────────────────────────────────────────────

    /**
     * Đọc chuỗi kỳ tất toán.
     *
     * <p>Hỗ trợ 2 định dạng:
     * <ul>
     *   <li>{@code yyyy-MM-D} — kỳ 10 ngày (định dạng mới).</li>
     *   <li>{@code yyyy-MM} — kỳ THÁNG cũ ⇒ quy đổi sang chu kỳ 3 (21 → cuối tháng)
     *       vì đây là kỳ cuối cùng của tháng. Dùng cho dữ liệu cũ chưa migrate.</li>
     * </ul>
     *
     * @throws AppException nếu chuỗi không hợp lệ.
     */
    public static SettlementPeriod parse(String period) {
        if (period == null || period.isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Kỳ doanh thu không được để trống");
        }
        String raw = period.trim();

        // Định dạng mới: yyyy-MM-D
        if (raw.length() >= 9 && raw.charAt(7) == '-') {
            try {
                YearMonth ym = YearMonth.parse(raw.substring(0, 7));
                int cycle = Integer.parseInt(raw.substring(8).trim());
                return of(ym, cycle);
            } catch (AppException e) {
                throw e;
            } catch (Exception e) {
                throw new AppException(ErrorCode.VALIDATION_ERROR,
                        "Kỳ doanh thu không hợp lệ (kỳ 10 ngày yyyy-MM-D): " + period);
            }
        }

        // Định dạng cũ: yyyy-MM ⇒ coi như chu kỳ cuối của tháng.
        try {
            YearMonth ym = YearMonth.parse(raw.length() > 7 ? raw.substring(0, 7) : raw);
            return of(ym, CYCLE_COUNT);
        } catch (Exception e) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Kỳ doanh thu không hợp lệ (kỳ 10 ngày yyyy-MM-D): " + period);
        }
    }

    /**
     * Đọc chuỗi kỳ mà KHÔNG ném lỗi — trả {@code null} nếu không đọc được.
     */
    public static SettlementPeriod parseOrNull(String period) {
        if (period == null || period.isBlank()) {
            return null;
        }
        try {
            return parse(period);
        } catch (Exception e) {
            return null;
        }
    }

    // ── So sánh ──────────────────────────────────────────────────────────────

    /**
     * Kỳ này có nằm TRƯỚC kỳ {@code reference} không (theo thời gian thực tế).
     *
     * <p>So sánh theo ngày BẮT ĐẦU ⇒ đơn giản & đúng với nghĩa "kỳ trước".
     */
    public boolean isBefore(SettlementPeriod reference) {
        return reference != null && getStart().isBefore(reference.getStart());
    }

    /**
     * Kỳ này đã KẾT THÚC chưa (tính tới {@code today}).
     *
     * <p>Một kỳ 10 ngày chỉ coi là đã đóng khi đã qua NGÀY CUỐI của kỳ.
     */
    public boolean isClosed(LocalDate today) {
        return today != null && !today.isBefore(getEnd());
    }
}
