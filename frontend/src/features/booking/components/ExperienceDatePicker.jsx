"use client";

/**
 * ExperienceDatePicker — thành phần CHỌN NGÀY TRẢI NGHIỆM dùng chung cho web.
 *
 * ── Vì sao cần component dùng chung? ──
 * Trước đây mỗi màn tự lo: `/tours/[id]` dùng lưới nút, còn `(dashboard)/trips/[tourId]`
 * dùng `<input type="date">` thô ⇒ chỗ chọn ngày TRÙNG kiểu, hành vi khác nhau
 * (một bên chỉ cho chọn ngày còn slot, bên kia cho chọn ngày bất kỳ rồi mới báo lỗi).
 *
 * ⇒ Component này là nguồn DUY NHẤT cho việc chọn ngày trên web:
 *   • Luôn lấy danh sách ngày THỰC SỰ còn chỗ từ API (`getTourAvailableDates`).
 *   • Chỉ hiện ngày còn slot ⇒ không bao giờ bị backend từ chối vì hết chỗ.
 *   • Giao diện giống hệt nhau ở mọi màn ⇒ không còn "trùng chọn ngày".
 *
 * ── Thiết kế ──
 * Lịch THÁNG dạng lưới 7×6 (T2 → CN), mỗi ô hiện:
 *   • số ngày trong tháng,
 *   • số slot CÒN LẠI (màu xanh = còn nhiều, vàng = sắp hết, xám = hết chỗ).
 * Có nút ‹ › để chuyển tháng và nút "Hôm nay" để quay lại tháng hiện tại.
 *
 * ── API ──
 *   <ExperienceDatePicker
 *     tour={tour}
 *     value={selectedDate}
 *     onChange={(date) => setSelectedDate(date)}
 *   />
 */

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatLocalDate } from "@/lib/money";
import { getTourAvailableDates } from "../services/tourAvailabilityService";

/** Số ngày tối đa xem trước. */
const DEFAULT_HORIZON_DAYS = 60;

/** Tên cột lịch (tiếng Việt, bắt đầu từ Thứ 2). */
const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Tên tháng tiếng Việt. */
const MONTH_LABELS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

/** `YYYY-MM-DD` của ngày hôm nay theo giờ Việt Nam. */
function todayIso() {
  const now = new Date();
  // Đẩy sang UTC+7 rồi cắt ngày ⇒ không lệch ngày quanh nửa đêm.
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vn.toISOString().slice(0, 10);
}

/** `YYYY-MM` của 1 ngày. */
function monthKeyOf(dateIso) {
  return dateIso.slice(0, 7);
}

/** Ngày 1 của tháng `YYYY-MM` → `YYYY-MM-01`. */
function firstDayOfMonth(monthKey) {
  return `${monthKey}-01`;
}

/**
 * Dựng lưới lịch 7 cột (T2 → CN) × 6 hàng cho tháng `monthKey`.
 *
 * @returns {Array<Array<{date: string, inMonth: boolean} | null>>}
 *          Ô `null` = ngày của tháng trước/sau (không hiển thị).
 */
function buildMonthGrid(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  // `getUTCDay()`: 0 = Chủ nhật. Dịch sang Thứ 2 = 0.
  const leadingBlanks = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells = [];
  for (let i = 0; i < leadingBlanks; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: `${monthKey}-${String(day).padStart(2, "0")}`,
      inMonth: true,
    });
  }
  // Luôn đủ 6 hàng ⇒ chiều cao lịch không nhảy khi chuyển tháng.
  while (cells.length < 42) cells.push(null);

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

/**
 * Màu badge số slot còn lại theo mức độ khan hiếm.
 * - nhiều  → xanh (an tâm)
 * - ít     → hổ phách (sắp hết)
 * - hết    → xám (không chọn được)
 */
function slotTone(remaining, available) {
  if (!available || remaining <= 0) return "full";
  if (remaining <= 3) return "low";
  return "ok";
}

export default function ExperienceDatePicker({
  tour,
  value,
  onChange,
  horizonDays = DEFAULT_HORIZON_DAYS,
  className = "",
}) {
  /**
   * `loadedFor` = tour mà `dates` đang tương ứng.
   * Dùng để suy ra trạng thái "đang tải" mà KHÔNG cần setState đồng bộ trong effect:
   * khi `tour` đổi ⇒ `loadedFor !== tour` ⇒ đang tải.
   */
  const [loadedFor, setLoadedFor] = useState(null);
  const [dates, setDates] = useState([]);
  const [failed, setFailed] = useState(false);
  // Tháng đang xem trên lịch (YYYY-MM).
  const [viewMonth, setViewMonth] = useState(() => monthKeyOf(todayIso()));

  useEffect(() => {
    if (!tour) return undefined;
    let active = true;

    getTourAvailableDates(tour, { horizonDays })
      .then((available) => {
        if (!active) return;
        setDates(available);
        setFailed(false);
        setLoadedFor(tour);
        // Tự nhảy sang tháng ĐẦU TIÊN còn lịch ⇒ khách không phải mò nút ›.
        const firstAvailable = available.find((d) => d.available);
        if (firstAvailable) {
          setViewMonth(monthKeyOf(firstAvailable.date));
        }
      })
      .catch(() => {
        if (!active) return;
        setDates([]);
        setFailed(true);
        setLoadedFor(tour);
      });

    return () => {
      active = false;
    };
  }, [tour, horizonDays]);

  const loading = !tour || loadedFor !== tour;

  /** Map `YYYY-MM-DD` → thông tin ngày (số slot còn lại). */
  const byDate = useMemo(() => {
    const map = new Map();
    for (const item of dates) map.set(item.date, item);
    return map;
  }, [dates]);

  /** Tháng đang xem có ngày nào còn chỗ không. */
  const monthHasAvailable = useMemo(
    () => dates.some((d) => d.available && monthKeyOf(d.date) === viewMonth),
    [dates, viewMonth],
  );

  /** Các tháng có ngày còn chỗ ⇒ dùng để bật/tắt nút chuyển tháng. */
  const availableMonths = useMemo(
    () => new Set(dates.filter((d) => d.available).map((d) => monthKeyOf(d.date))),
    [dates],
  );

  const rows = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  /**
   * Tháng trước / tháng sau (dùng để dựng nút điều hướng).
   *
   * ⚠️ Dùng số học nguyên thuần (`year * 12 + (month - 1) + delta`) CHỨ KHÔNG
   * dùng `new Date(Date.UTC(year, month - 1 + delta, 1))`: cách đó dễ sai ở ranh
   * giới năm và phụ thuộc múi giờ ⇒ mỗi lần bấm có thể nhảy cóc nhiều tháng hoặc
   * đứng yên không sang tháng kế tiếp.
   */
  const shiftMonth = (monthKey, delta) => {
    const [year, month] = monthKey.split("-").map(Number);
    // Tổng số tháng kể từ năm 0 ⇒ cộng/trừ luôn đúng 1 tháng.
    const totalMonths = year * 12 + (month - 1) + delta;
    const newYear = Math.floor(totalMonths / 12);
    const newMonth = (totalMonths % 12) + 1;
    return `${newYear}-${String(newMonth).padStart(2, "0")}`;
  };

  const prevMonth = shiftMonth(viewMonth, -1);
  const nextMonth = shiftMonth(viewMonth, 1);
  const today = todayIso();

  /** Đưa lịch về tháng hiện tại. */
  const goToday = () => setViewMonth(monthKeyOf(today));

  return (
    <div className={className}>
      {/* ── Ô chọn ngày đang chọn ── */}
      <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-900 dark:bg-blue-950/40">
        <CalendarDays size={16} className="shrink-0 text-blue-600" />
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Ngày trải nghiệm
          </p>
          <p className="truncate text-sm font-bold text-blue-900 dark:text-blue-100">
            {value ? formatLocalDate(value) : "Chưa chọn ngày"}
          </p>
        </div>
      </div>

      {/* ── Lịch tháng ── */}
      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
        {/* Thanh điều hướng tháng */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setViewMonth(prevMonth)}
            aria-label="Tháng trước"
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {MONTH_LABELS[Number(viewMonth.slice(5, 7)) - 1]} {viewMonth.slice(0, 4)}
            </span>
            <span className="text-[11px] text-gray-500">
              {monthHasAvailable ? "Còn lịch" : "Không có lịch"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setViewMonth(nextMonth)}
            aria-label="Tháng sau"
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Tên cột */}
        <div className="mt-2 grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Các ô ngày */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
            <Loader2 size={14} className="animate-spin" /> Đang tải lịch trải nghiệm...
          </div>
        ) : (
          <div className="space-y-1">
            {rows.map((week, wi) => (
              <div key={`row-${wi}`} className="grid grid-cols-7 gap-1">
                {week.map((cell, ci) => {
                  if (!cell) {
                    return (
                      <div
                        key={`empty-${wi}-${ci}`}
                        aria-hidden="true"
                        className="h-12 rounded-lg"
                      />
                    );
                  }

                  const info = byDate.get(cell.date);
                  const remaining = info?.remaining ?? 0;
                  const available = Boolean(info?.available) && remaining > 0;
                  const selected = cell.date === value;
                  const isToday = cell.date === today;
                  const tone = slotTone(remaining, available);

                  // Ngày không mở bán ⇒ không bấm được.
                  const disabled = !available;

                  return (
                    <button
                      key={cell.date}
                      type="button"
                      disabled={disabled}
                      onClick={() => onChange?.(cell.date)}
                      aria-pressed={selected}
                      aria-label={
                        available
                          ? `${formatLocalDate(cell.date)}, còn ${remaining} chỗ`
                          : `${formatLocalDate(cell.date)}, hết chỗ`
                      }
                      title={
                        available
                          ? `${formatLocalDate(cell.date)} — còn ${remaining} chỗ`
                          : `${formatLocalDate(cell.date)} — hết chỗ`
                      }
                      className={`relative flex h-12 flex-col items-center justify-center rounded-lg border text-center transition-colors ${
                        selected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : disabled
                            ? "cursor-not-allowed border-transparent bg-gray-50 text-gray-300 dark:bg-gray-800/40 dark:text-gray-600"
                            : "border-gray-200 bg-white text-gray-800 hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:bg-gray-700"
                      } ${isToday && !selected ? "ring-1 ring-blue-400 dark:ring-blue-500" : ""}`}
                    >
                      <span className="text-[13px] font-bold leading-none">
                        {Number(cell.date.slice(8, 10))}
                      </span>
                      {available ? (
                        <span
                          className={`mt-1 rounded-full px-1 text-[9px] font-bold leading-none ${
                            selected
                              ? "bg-white/25 text-white"
                              : tone === "low"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                          }`}
                        >
                          {remaining}
                        </span>
                      ) : (
                        <span
                          className={`mt-1 text-[9px] font-semibold leading-none ${
                            selected ? "bg-white/25 text-white" : "text-gray-300 dark:text-gray-600"
                          }`}
                        >
                          —
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Chú thích màu */}
        {!loading && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 pt-2 text-[10px] text-gray-500 dark:border-gray-800">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Còn chỗ
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> Sắp hết (≤ 3)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" /> Hết chỗ
            </span>
            <button
              type="button"
              onClick={goToday}
              className="ml-auto font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Về tháng này
            </button>
          </div>
        )}
      </div>

      {/* ── Thông báo ── */}
      {failed && !loading && (
        <p className="mt-2 text-xs text-red-600">
          Không tải được lịch trải nghiệm. Bạn vẫn có thể thử đặt tour.
        </p>
      )}

      {(!loading && !failed && dates.length === 0) && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Hiện chưa có ngày nào còn chỗ cho tour này. Vui lòng quay lại sau.
        </p>
      )}

      {!loading && !failed && dates.length > 0 && availableMonths.size > 0 && (
        <p className="mt-2 text-[11px] text-gray-400">
          {availableMonths.size} tháng còn lịch trong {horizonDays} ngày tới. Chọn ngày để đặt tour.
        </p>
      )}
    </div>
  );
}
