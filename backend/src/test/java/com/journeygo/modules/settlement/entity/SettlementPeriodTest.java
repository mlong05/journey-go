package com.journeygo.modules.settlement.entity;

import com.journeygo.common.exception.AppException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.YearMonth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Kỳ tất toán 10 NGÀY — chia tháng thành 3 chu kỳ (01-10, 11-20, 21-cuối tháng).
 *
 * <p>Đây là "hợp đồng" của toàn bộ luồng tất toán:
 * <ul>
 *   <li>{@code revenuePeriod} = {@code yyyy-MM-D} (D = 1|2|3).</li>
 *   <li>Chu kỳ 3 dài 8/9/10/11 ngày tuỳ tháng có 28/29/30/31 ngày.</li>
 *   <li>Kỳ chỉ "đóng" khi đã qua ngày CUỐI của kỳ.</li>
 * </ul>
 */
class SettlementPeriodTest {

    // ── Xác định chu kỳ từ ngày ────────────────────────────────────────────

    @Test
    @DisplayName("Ngày 01-10 thuộc kỳ 1")
    void day_01_to_10_belongsToCycle1() {
        assertEquals(1, SettlementPeriod.of(LocalDate.of(2026, 10, 1)).getCycle());
        assertEquals(1, SettlementPeriod.of(LocalDate.of(2026, 10, 10)).getCycle());
    }

    @Test
    @DisplayName("Ngày 11-20 thuộc kỳ 2")
    void day_11_to_20_belongsToCycle2() {
        assertEquals(2, SettlementPeriod.of(LocalDate.of(2026, 10, 11)).getCycle());
        assertEquals(2, SettlementPeriod.of(LocalDate.of(2026, 10, 20)).getCycle());
    }

    @Test
    @DisplayName("Ngày 21 trở đi thuộc kỳ 3")
    void day_21_plus_belongsToCycle3() {
        assertEquals(3, SettlementPeriod.of(LocalDate.of(2026, 10, 21)).getCycle());
        assertEquals(3, SettlementPeriod.of(LocalDate.of(2026, 10, 31)).getCycle());
        assertEquals(3, SettlementPeriod.of(LocalDate.of(2026, 2, 28)).getCycle());
    }

    // ── Biên đầu / cuối ────────────────────────────────────────────────────

    @Test
    @DisplayName("Kỳ 1 = 01 → 10, kỳ 2 = 11 → 20")
    void cycle1And2_boundaries() {
        SettlementPeriod c1 = SettlementPeriod.of(YearMonth.of(2026, 10), 1);
        assertEquals(LocalDate.of(2026, 10, 1), c1.getStart());
        assertEquals(LocalDate.of(2026, 10, 10), c1.getEnd());

        SettlementPeriod c2 = SettlementPeriod.of(YearMonth.of(2026, 10), 2);
        assertEquals(LocalDate.of(2026, 10, 11), c2.getStart());
        assertEquals(LocalDate.of(2026, 10, 20), c2.getEnd());
    }

    @Test
    @DisplayName("Kỳ 3 = 21 → ngày cuối tháng (dài 8/9/10/11 ngày)")
    void cycle3_endsAtMonthEnd_withVariableLength() {
        // Tháng có 31 ngày ⇒ kỳ 3 dài 11 ngày.
        SettlementPeriod march = SettlementPeriod.of(YearMonth.of(2026, 3), 3);
        assertEquals(LocalDate.of(2026, 3, 21), march.getStart());
        assertEquals(LocalDate.of(2026, 3, 31), march.getEnd());
        assertEquals(11, march.getLengthInDays());

        // Tháng có 30 ngày ⇒ kỳ 3 dài 10 ngày.
        SettlementPeriod april = SettlementPeriod.of(YearMonth.of(2026, 4), 3);
        assertEquals(LocalDate.of(2026, 4, 30), april.getEnd());
        assertEquals(10, april.getLengthInDays());

        // Năm nhuận ⇒ tháng 2 có 29 ngày ⇒ kỳ 3 dài 9 ngày.
        SettlementPeriod febLeap = SettlementPeriod.of(YearMonth.of(2028, 2), 3);
        assertEquals(LocalDate.of(2028, 2, 29), febLeap.getEnd());
        assertEquals(9, febLeap.getLengthInDays());

        // Tháng có 28 ngày ⇒ kỳ 3 dài 8 ngày.
        SettlementPeriod feb = SettlementPeriod.of(YearMonth.of(2027, 2), 3);
        assertEquals(LocalDate.of(2027, 2, 28), feb.getEnd());
        assertEquals(8, feb.getLengthInDays());
    }

    @Test
    @DisplayName("Kỳ 1 và kỳ 2 luôn dài 10 ngày")
    void cycle1And2_alwaysTenDays() {
        for (int month = 1; month <= 12; month++) {
            YearMonth ym = YearMonth.of(2026, month);
            assertEquals(10, SettlementPeriod.of(ym, 1).getLengthInDays());
            assertEquals(10, SettlementPeriod.of(ym, 2).getLengthInDays());
        }
    }

    // ── Định dạng ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("Chuỗi kỳ = yyyy-MM-D")
    void periodString_format() {
        assertEquals("2026-10-1", SettlementPeriod.of(YearMonth.of(2026, 10), 1).toPeriodString());
        assertEquals("2026-10-2", SettlementPeriod.of(YearMonth.of(2026, 10), 2).toPeriodString());
        assertEquals("2026-10-3", SettlementPeriod.of(YearMonth.of(2026, 10), 3).toPeriodString());
        // Tháng 1 chỉ có 1 chữ số ⇒ phải đệm 2 chữ số.
        assertEquals("2026-01-1", SettlementPeriod.of(YearMonth.of(2026, 1), 1).toPeriodString());
    }

    @Test
    @DisplayName("Nhãn hiển thị = 'dd/mm – dd/mm/yyyy'")
    void displayLabel() {
        assertEquals("01/10 – 10/10/2026",
                SettlementPeriod.of(YearMonth.of(2026, 10), 1).toDisplayLabel());
        assertEquals("11/10 – 20/10/2026",
                SettlementPeriod.of(YearMonth.of(2026, 10), 2).toDisplayLabel());
        assertEquals("21/10 – 31/10/2026",
                SettlementPeriod.of(YearMonth.of(2026, 10), 3).toDisplayLabel());
    }

    // ── Đọc chuỗi ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("Parse chuỗi kỳ 10 ngày")
    void parse_tenDayFormat() {
        SettlementPeriod p = SettlementPeriod.parse("2026-10-2");
        assertEquals(2026, p.getYearMonth().getYear());
        assertEquals(10, p.getYearMonth().getMonthValue());
        assertEquals(2, p.getCycle());
        assertEquals(LocalDate.of(2026, 10, 11), p.getStart());
        assertEquals(LocalDate.of(2026, 10, 20), p.getEnd());
    }

    @Test
    @DisplayName("Parse chuỗi kỳ THÁNG cũ → quy về kỳ 3 (cuối tháng)")
    void parse_legacyMonthlyFormat_fallsBackToCycle3() {
        SettlementPeriod p = SettlementPeriod.parse("2026-10");
        assertEquals(3, p.getCycle());
        assertEquals(LocalDate.of(2026, 10, 21), p.getStart());
        assertEquals(LocalDate.of(2026, 10, 31), p.getEnd());
    }

    @Test
    @DisplayName("Parse chuỗi không hợp lệ → ném lỗi")
    void parse_invalid_throws() {
        assertThrows(AppException.class, () -> SettlementPeriod.parse("abc"));
        assertThrows(AppException.class, () -> SettlementPeriod.parse("2026-10-9"));
        assertThrows(AppException.class, () -> SettlementPeriod.parse(""));
        assertThrows(AppException.class, () -> SettlementPeriod.parse(null));
    }

    @Test
    @DisplayName("ParseOrNull trả null thay vì ném lỗi")
    void parseOrNull_returnsNull() {
        assertNull(SettlementPeriod.parseOrNull("abc"));
        assertNull(SettlementPeriod.parseOrNull(null));
        assertNull(SettlementPeriod.parseOrNull(""));
        assertEquals(1, SettlementPeriod.parseOrNull("2026-10-1").getCycle());
    }

    // ── Kỳ đóng ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Kỳ chỉ đóng khi đã qua ngày CUỐI của kỳ")
    void isClosed_onlyAfterPeriodEnd() {
        SettlementPeriod c1 = SettlementPeriod.of(YearMonth.of(2026, 10), 1);

        assertFalse(c1.isClosed(LocalDate.of(2026, 10, 9)), "09/10 — kỳ 1 chưa kết thúc");
        assertTrue(c1.isClosed(LocalDate.of(2026, 10, 10)), "10/10 — kỳ 1 vừa kết thúc");
        assertTrue(c1.isClosed(LocalDate.of(2026, 10, 11)), "11/10 — kỳ 1 đã kết thúc");
    }

    @Test
    @DisplayName("Kỳ 3 chỉ đóng khi đã qua ngày cuối tháng")
    void isClosed_cycle3_afterMonthEnd() {
        SettlementPeriod c3 = SettlementPeriod.of(YearMonth.of(2026, 10), 3);

        assertFalse(c3.isClosed(LocalDate.of(2026, 10, 30)), "30/10 — kỳ 3 chưa kết thúc");
        assertTrue(c3.isClosed(LocalDate.of(2026, 10, 31)), "31/10 — kỳ 3 kết thúc");
        assertTrue(c3.isClosed(LocalDate.of(2026, 11, 1)), "01/11 — kỳ 3 đã kết thúc");
    }

    // ── So sánh ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("So sánh kỳ trước/sau theo thứ tự thời gian")
    void isBefore_compare() {
        SettlementPeriod c1 = SettlementPeriod.of(YearMonth.of(2026, 10), 1);
        SettlementPeriod c2 = SettlementPeriod.of(YearMonth.of(2026, 10), 2);
        SettlementPeriod c3 = SettlementPeriod.of(YearMonth.of(2026, 10), 3);
        SettlementPeriod nextMonthC1 = SettlementPeriod.of(YearMonth.of(2026, 11), 1);

        assertTrue(c1.isBefore(c2));
        assertTrue(c2.isBefore(c3));
        assertTrue(c3.isBefore(nextMonthC1));
        assertFalse(c3.isBefore(c1));
        assertFalse(c1.isBefore(c1));
    }

    // ── Lùi chu kỳ ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("Lùi 1 chu kỳ: kỳ 1 → kỳ 3 của tháng trước")
    void minusCycles_oneStepBack() {
        SettlementPeriod c1 = SettlementPeriod.of(YearMonth.of(2026, 10), 1);
        SettlementPeriod prev = c1.minusCycles(1);

        assertEquals(2026, prev.getYearMonth().getYear());
        assertEquals(9, prev.getYearMonth().getMonthValue());
        assertEquals(3, prev.getCycle());
        assertEquals("2026-09-3", prev.toPeriodString());
    }

    @Test
    @DisplayName("Lùi khi qua ranh giới tháng/năm")
    void minusCycles_acrossMonthAndYearBoundary() {
        // Kỳ 1 của tháng 1 → lùi 1 = kỳ 3 của tháng 12 năm trước.
        SettlementPeriod janC1 = SettlementPeriod.of(YearMonth.of(2026, 1), 1);
        SettlementPeriod prev = janC1.minusCycles(1);
        assertEquals(2025, prev.getYearMonth().getYear());
        assertEquals(12, prev.getYearMonth().getMonthValue());
        assertEquals(3, prev.getCycle());

        // Lùi 3 chu kỳ từ kỳ 1 tháng 2 ⇒ kỳ 1 tháng 1.
        SettlementPeriod febC1 = SettlementPeriod.of(YearMonth.of(2026, 2), 1);
        assertEquals("2026-01-1", febC1.minusCycles(3).toPeriodString());

        // Lùi 4 chu kỳ từ kỳ 1 tháng 2 ⇒ kỳ 3 tháng 12 năm trước.
        assertEquals("2025-12-3", febC1.minusCycles(4).toPeriodString());
    }

    @Test
    @DisplayName("Lùi 0 chu kỳ ⇒ giữ nguyên kỳ hiện tại")
    void minusCycles_zeroReturnsSamePeriod() {
        SettlementPeriod c2 = SettlementPeriod.of(YearMonth.of(2026, 10), 2);
        assertEquals(c2.toPeriodString(), c2.minusCycles(0).toPeriodString());
    }

    @Test
    @DisplayName("Lùi rồi đi lùi tiếp là khớp với lùi một lần (tính đúng số chu kỳ)")
    void minusCycles_countsPeriodsNotDays() {
        SettlementPeriod current = SettlementPeriod.of(LocalDate.of(2026, 10, 1));

        // Lùi 1 chu kỳ từ kỳ 1 (01/10) ⇒ kỳ 3 tháng 9 (21→30/09).
        assertEquals("2026-09-3", current.minusCycles(1).toPeriodString());
        // Lùi 3 chu kỳ ⇒ kỳ 1 tháng 9 (01/09).
        assertEquals("2026-09-1", current.minusCycles(3).toPeriodString());
        // Lùi 4 chu kỳ ⇒ kỳ 3 tháng 8 (21→31/08).
        assertEquals("2026-08-3", current.minusCycles(4).toPeriodString());
        // Lùi 9 chu kỳ ⇒ kỳ 1 tháng 7 (01/07).
        assertEquals("2026-07-1", current.minusCycles(9).toPeriodString());
    }

    @Test
    @DisplayName("Tiến chu kỳ là phép ngược của lùi chu kỳ")
    void plusCycles_isInverseOfMinusCycles() {
        SettlementPeriod current = SettlementPeriod.of(LocalDate.of(2026, 10, 1));

        // Tiến 1 chu kỳ từ kỳ 1 (01/10) ⇒ kỳ 2 tháng 10 (11→20/10).
        assertEquals("2026-10-2", current.plusCycles(1).toPeriodString());
        // Tiến 3 chu kỳ ⇒ kỳ 1 tháng 11 (01/11).
        assertEquals("2026-11-1", current.plusCycles(3).toPeriodString());
        // Lùi rồi tiến ⇒ về đúng kỳ ban đầu.
        assertEquals(current.toPeriodString(),
                current.minusCycles(2).plusCycles(2).toPeriodString());
        // Tiến qua ranh giới năm.
        assertEquals("2027-01-1",
                SettlementPeriod.of(YearMonth.of(2026, 12), 3).plusCycles(1).toPeriodString());
    }
}
