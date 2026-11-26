"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Columns2,
  GitCompareArrows,
  LineChart as LineChartIcon,
  Table2,
  TrendingUp,
  X,
} from "lucide-react";
import { percentChange } from "@/features/dashboard";

/**
 * Biểu đồ "Diễn biến theo thời gian":
 *   • Chế độ thường: 1 biểu đồ đơn của kỳ đang chọn + tùy chọn bật "Dự báo cuối kỳ" (tuần / tháng / quý).
 *   • Chế độ So sánh: 2 biểu đồ đặt cạnh nhau (Kỳ này ↔ Mốc đối chiếu tùy chọn: 1 kỳ trước, 2 kỳ trước,
 *     4 tuần trước, cùng kỳ năm trước), khóa chung trục tung Y và đồng bộ hover.
 */

const COLOR_CURRENT = "#047857";
const COLOR_PREVIOUS = "#0369a1";
const COLOR_PREVIOUS_OVERLAY = "#94a3b8";
const COLOR_FORECAST = "#d97706";

const METRICS = {
  revenue: { label: "Doanh thu", cur: "revenue", prev: "prevRevenue", forecast: "forecastRevenue", money: true },
  bookings: { label: "Lượt đặt", cur: "bookings", prev: "prevBookings", unit: "đơn" },
  guests: { label: "Số khách", cur: "guests", prev: "prevGuests", forecast: "forecastGuests", unit: "khách" },
  checkIns: { label: "Check-in", cur: "checkIns", prev: "prevCheckIns", unit: "lượt" },
};

const COMPARE_MODE_OPTIONS = {
  today: [
    { id: "prev_1", label: "Hôm qua" },
    { id: "prev_2", label: "2 ngày trước" },
    { id: "prev_7", label: "Cùng thứ tuần trước" },
  ],
  week: [
    { id: "prev_1", label: "Tuần trước" },
    { id: "prev_2", label: "2 tuần trước" },
    { id: "prev_4", label: "4 tuần trước" },
    { id: "yoy", label: "Cùng tuần năm trước" },
  ],
  month: [
    { id: "prev_1", label: "1 tháng trước" },
    { id: "prev_2", label: "2 tháng trước" },
    { id: "prev_3", label: "3 tháng trước" },
  ],
  quarter: [
    { id: "prev_1", label: "Quý trước" },
    { id: "prev_2", label: "2 quý trước" },
    { id: "yoy", label: "Cùng quý năm trước" },
  ],
  year: [
    { id: "prev_1", label: "Năm trước" },
    { id: "prev_2", label: "2 năm trước" },
  ],
};

const fmtInt = (n) => Number(n || 0).toLocaleString("vi-VN");
const fmtMoney = (n) => `${fmtInt(n)} ₫`;

function compactMoney(n) {
  const v = Number(n) || 0;
  const f = (x) => x.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
  if (v >= 1e9) return `${f(v / 1e9)} tỷ`;
  if (v >= 1e6) return `${f(v / 1e6)} tr`;
  if (v >= 1e3) return `${f(v / 1e3)} k`;
  return f(v);
}

const VN_TZ = "Asia/Ho_Chi_Minh";

function formatPoint(iso, unit, index = 0, long = false) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  if (unit === "hour") {
    const hour = new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: VN_TZ,
    }).format(d);
    if (!long) return `${hour}h`;
    const day = new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      timeZone: VN_TZ,
    }).format(d);
    return `${hour}:00, ${day}`;
  }

  if (unit === "week") {
    const startDm = new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      timeZone: VN_TZ,
    }).format(d);
    if (!long) return `Tuần ${index + 1}`;
    const endD = new Date(d.getTime() + 6 * 86400000);
    const endDm = new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      timeZone: VN_TZ,
    }).format(endD);
    return `Tuần ${index + 1} (${startDm} – ${endDm})`;
  }

  if (unit === "month") {
    const monthNum = new Intl.DateTimeFormat("en-US", {
      month: "2-digit",
      timeZone: VN_TZ,
    }).format(d);
    if (!long) return `T${monthNum}`;
    const yearNum = new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      timeZone: VN_TZ,
    }).format(d);
    return `Tháng ${Number(monthNum)}/${yearNum}`;
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    long
      ? { weekday: "short", day: "2-digit", month: "2-digit", timeZone: VN_TZ }
      : { day: "2-digit", month: "2-digit", timeZone: VN_TZ },
  ).format(d);
}

function unitColumnHeader(unit) {
  switch (unit) {
    case "hour":
      return "Khung giờ";
    case "week":
      return "Tuần trong quý";
    case "month":
      return "Tháng";
    default:
      return "Ngày";
  }
}

function SingleSeriesTooltip({ active, payload, metric, unit, color }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  const m = METRICS[metric];
  const fmt = (v) => (v == null ? "—" : m.money ? fmtMoney(v) : `${fmtInt(v)} ${m.unit}`);

  return (
    <div className="min-w-[180px] rounded-xl border border-slate-700/60 bg-slate-900 px-3 py-2 shadow-xl">
      <p className="text-[11px] font-medium text-slate-300">
        {formatPoint(row.iso, unit, row.idx, true)}
      </p>
      {row.val != null && (
        <p className="mt-0.5 flex items-center gap-2 text-xs font-bold tabular-nums text-white">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
          Thực tế: {fmt(row.val)}
        </p>
      )}
      {row.forecast != null && (row.val == null || row.forecast !== row.val) && (
        <p className="mt-0.5 flex items-center gap-2 text-xs font-semibold tabular-nums text-amber-300">
          <span className="h-2 w-2 rounded-full" style={{ background: COLOR_FORECAST }} aria-hidden="true" />
          Dự báo: {fmt(row.forecast)}
        </p>
      )}
    </div>
  );
}

function OverlayTooltip({ active, payload, metric, unit, prevShortLabel }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  const m = METRICS[metric];
  const fmt = (v) => (v == null ? "—" : m.money ? fmtMoney(v) : `${fmtInt(v)} ${m.unit}`);
  const pct = row.cur == null || row.prev == null ? null : percentChange(row.cur, row.prev);
  const diff = row.cur == null || row.prev == null ? null : row.cur - row.prev;

  return (
    <div className="min-w-[230px] rounded-xl border border-slate-700/60 bg-slate-900 px-3.5 py-2.5 shadow-xl">
      {row.start && (
        <p className="flex items-center justify-between gap-3 text-[11.5px] font-bold text-white">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: COLOR_CURRENT }} aria-hidden="true" />
            {formatPoint(row.start, unit, row.idx, true)}
          </span>
          <span className="tabular-nums">{row.cur != null ? fmt(row.cur) : "—"}</span>
        </p>
      )}
      {row.forecast != null && row.cur == null && (
        <p className="mt-0.5 flex items-center justify-between gap-3 text-[11px] font-semibold text-amber-300">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: COLOR_FORECAST }} aria-hidden="true" />
            Dự báo ({formatPoint(row.start, unit, row.idx, false)})
          </span>
          <span className="tabular-nums">{fmt(row.forecast)}</span>
        </p>
      )}
      <p className="mt-1 flex items-center justify-between gap-3 text-[11px] font-medium text-slate-300">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-0 w-3.5 border-t-2 border-dashed"
            style={{ borderColor: COLOR_PREVIOUS_OVERLAY }}
            aria-hidden="true"
          />
          {row.prevStart
            ? formatPoint(row.prevStart, unit, row.idx, true)
            : `${prevShortLabel}: không có mốc`}
        </span>
        <span className="tabular-nums">{fmt(row.prev)}</span>
      </p>
      {diff !== null && (
        <div className="mt-1.5 flex items-center justify-between border-t border-slate-700/70 pt-1.5 text-[10.5px] font-semibold">
          <span className="text-slate-400">Chênh lệch</span>
          <span className={diff >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {diff >= 0 ? "+" : "-"}
            {m.money ? fmtMoney(Math.abs(diff)) : `${fmtInt(Math.abs(diff))} ${m.unit}`}
            {pct !== null
              ? ` (${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%)`
              : row.cur > 0
                ? " (Mới)"
                : ""}
          </span>
        </div>
      )}
    </div>
  );
}

function ForecastStrip({ forecast, metric, rangeLabel }) {
  if (!forecast || forecast.remainingDays <= 0) return null;
  const isMoney = metric === "revenue";
  const actual = isMoney ? forecast.actualRevenue : forecast.actualGuests;
  const confirmedFuture = isMoney ? forecast.confirmedFutureRevenue : forecast.confirmedFutureGuests;
  const estimatedNew = isMoney ? forecast.estimatedNewRevenue : forecast.estimatedNewGuests;
  const projected = isMoney ? forecast.projectedTotalRevenue : forecast.projectedTotalGuests;
  const fmt = (v) => (isMoney ? fmtMoney(v) : `${fmtInt(v)} khách`);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5 border-b border-amber-200/70 bg-amber-50/50 px-4 py-2 text-[11px]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-bold text-amber-900">
          Dự báo hết {rangeLabel.toLowerCase()} (còn {forecast.remainingDays} ngày):
        </span>
        <span className="font-bold tabular-nums text-amber-800">{fmt(projected)}</span>
        <span className="text-slate-600">
          Đã ghi nhận: <strong className="tabular-nums text-slate-800">{fmt(actual)}</strong>
        </span>
        <span className="text-slate-600">
          Đã đặt sắp tới: <strong className="tabular-nums text-emerald-700">{fmt(confirmedFuture)}</strong>
        </span>
        <span className="text-slate-600">
          Ước tính đặt thêm: <strong className="tabular-nums text-slate-800">+{fmt(estimatedNew)}</strong>
        </span>
      </div>
      {forecast.remainingCapacity != null && (
        <span className="font-semibold text-slate-600">
          Chỗ trống còn lại: <strong className="tabular-nums text-emerald-800">{fmtInt(forecast.remainingCapacity)} chỗ</strong>
        </span>
      )}
    </div>
  );
}

export default function ProviderTrendChart({
  series,
  rangeId = "month",
  unit = "day",
  rangeLabel = "Tháng này",
  prevShortLabel = "Tháng trước",
  currentSpan,
  previousSpan,
  compareEnabled = false,
  compareScope = "same_span",
  compareMode = "prev_1",
  onChangeCompareScope,
  onChangeCompareMode,
  onExitCompare,
  forecast = null,
  forecastEnabled = false,
  onToggleForecast,
  loading,
}) {
  const [metric, setMetric] = useState("revenue");
  const [singleTable, setSingleTable] = useState(false);
  const [compareView, setCompareView] = useState("split");
  const m = METRICS[metric];
  const supportsForecast = ["week", "month", "quarter"].includes(rangeId);
  const compareModeChoices = COMPARE_MODE_OPTIONS[rangeId] || COMPARE_MODE_OPTIONS.month;

  const rows = useMemo(
    () =>
      (series || []).map((p, idx) => {
        const refIso = p.start || p.prevStart;
        const fKey = m.forecast;
        return {
          idx,
          start: p.start,
          prevStart: p.prevStart,
          label: formatPoint(refIso, unit, idx, false),
          curLabel: formatPoint(p.start, unit, idx, false),
          prevLabel: formatPoint(p.prevStart, unit, idx, false),
          cur: p[m.cur] == null ? null : Number(p[m.cur]) || 0,
          prev: p[m.prev] == null ? null : Number(p[m.prev]) || 0,
          forecast: fKey && p[fKey] != null ? Number(p[fKey]) || 0 : null,
        };
      }),
    [series, unit, m],
  );

  const curOnlyRows = useMemo(
    () =>
      rows
        .filter((r) => r.start != null && (r.cur != null || (forecastEnabled && r.forecast != null)))
        .map((r) => ({
          idx: r.idx,
          iso: r.start,
          label: r.curLabel,
          val: r.cur,
          forecast: forecastEnabled ? r.forecast : null,
        })),
    [rows, forecastEnabled],
  );

  const prevOnlyRows = useMemo(
    () =>
      rows
        .filter((r) => r.prevStart != null && r.prev != null)
        .map((r) => ({ idx: r.idx, iso: r.prevStart, label: r.prevLabel, val: r.prev })),
    [rows],
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          cur: acc.cur + (r.cur || 0),
          prev: acc.prev + (r.prev || 0),
        }),
        { cur: 0, prev: 0 },
      ),
    [rows],
  );

  const sharedMax = useMemo(() => {
    let max = 0;
    for (const r of rows) {
      if (r.cur != null && r.cur > max) max = r.cur;
      if (r.prev != null && r.prev > max) max = r.prev;
      if (forecastEnabled && r.forecast != null && r.forecast > max) max = r.forecast;
    }
    return max > 0 ? max : 1;
  }, [rows, forecastEnabled]);

  const pct = percentChange(totals.cur, totals.prev);
  const diff = totals.cur - totals.prev;
  const fmtTotal = (v) => (m.money ? fmtMoney(v) : `${fmtInt(v)} ${m.unit}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHẾ ĐỘ 1: XEM ĐƠN KỲ (MẶC ĐỊNH)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!compareEnabled) {
    const isSingleEmpty = curOnlyRows.every((r) => !r.val && !r.forecast);

    return (
      <section
        className="flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-xs"
        aria-labelledby="trend-title"
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp size={16} />
            </span>
            <div className="min-w-0">
              <h2 id="trend-title" className="truncate text-sm font-bold text-slate-900">
                Diễn biến theo thời gian
              </h2>
              <p className="truncate text-[11px] text-slate-500">
                {currentSpan ? `${rangeLabel} · ${currentSpan}` : rangeLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex w-fit gap-0.5 rounded-lg bg-slate-100 p-1" role="radiogroup" aria-label="Chọn chỉ số">
              {Object.entries(METRICS).map(([id, def]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={metric === id}
                  onClick={() => setMetric(id)}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    metric === id ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {def.label}
                </button>
              ))}
            </div>

            {supportsForecast && onToggleForecast && (
              <button
                type="button"
                onClick={onToggleForecast}
                aria-pressed={forecastEnabled}
                title="Bật/tắt dự báo lượng khách và doanh thu đến cuối kỳ"
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  forecastEnabled
                    ? "border-amber-600 bg-amber-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800"
                }`}
              >
                Dự báo
              </button>
            )}

            <button
              type="button"
              onClick={() => setSingleTable((v) => !v)}
              aria-pressed={singleTable}
              title={singleTable ? "Xem dạng biểu đồ" : "Xem dạng bảng"}
              aria-label={singleTable ? "Xem dạng biểu đồ" : "Xem dạng bảng"}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              {singleTable ? <LineChartIcon size={15} /> : <Table2 size={15} />}
            </button>
          </div>
        </div>

        {forecastEnabled && supportsForecast && (
          <ForecastStrip forecast={forecast} metric={metric === "revenue" ? "revenue" : "guests"} rangeLabel={rangeLabel} />
        )}

        <div className="flex flex-wrap items-end justify-between gap-4 px-4 pt-3">
          <div>
            <p className="text-[11px] text-slate-500">
              Tổng {m.label.toLowerCase()} · {rangeLabel.toLowerCase()}
            </p>
            <p className={`text-xl font-bold tabular-nums ${loading ? "text-slate-300" : "text-slate-900"}`}>
              {loading ? "…" : fmtTotal(totals.cur)}
            </p>
          </div>
          {forecastEnabled && supportsForecast && m.forecast && (
            <ul className="flex items-center gap-4 text-[11px] font-semibold text-slate-600">
              <li className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full" style={{ background: COLOR_CURRENT }} />
                Thực tế
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: COLOR_FORECAST }} />
                Dự báo cuối kỳ
              </li>
            </ul>
          )}
        </div>

        <div className="h-[244px] px-2 pb-3 pt-2">
          {loading ? (
            <div className="jg-shimmer h-full rounded-lg" />
          ) : isSingleEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
              <p className="text-sm font-semibold text-slate-600">
                Chưa có {m.label.toLowerCase()} trong {rangeLabel.toLowerCase()}
              </p>
              <p className="text-xs text-slate-400">
                Số liệu sẽ tự động cập nhật khi du khách đặt tour hoặc check-in tại điểm dừng của bạn.
              </p>
            </div>
          ) : singleTable ? (
            <div className="h-full overflow-auto [scrollbar-width:thin]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="px-3 py-2">{unitColumnHeader(unit)}</th>
                    <th className="px-3 py-2 text-right">{rangeLabel}</th>
                    {forecastEnabled && m.forecast && <th className="px-3 py-2 text-right">Dự báo</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {curOnlyRows.map((r) => (
                    <tr key={r.iso} className="hover:bg-slate-50/70">
                      <td className="px-3 py-1.5 text-slate-600">{formatPoint(r.iso, unit, r.idx, true)}</td>
                      <td className="px-3 py-1.5 text-right font-semibold text-slate-900">
                        {r.val == null ? "—" : m.money ? fmtMoney(r.val) : fmtInt(r.val)}
                      </td>
                      {forecastEnabled && m.forecast && (
                        <td className="px-3 py-1.5 text-right font-semibold text-amber-700">
                          {r.forecast == null ? "—" : m.money ? fmtMoney(r.forecast) : fmtInt(r.forecast)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={curOnlyRows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="providerSingleFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_CURRENT} stopOpacity={0.14} />
                    <stop offset="95%" stopColor={COLOR_CURRENT} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  minTickGap={16}
                  interval="preserveStartEnd"
                />
                <YAxis
                  width={54}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(v) => (m.money ? compactMoney(v) : fmtInt(v))}
                />
                <Tooltip
                  cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                  content={<SingleSeriesTooltip metric={metric} unit={unit} color={COLOR_CURRENT} />}
                />
                <Area
                  type="monotone"
                  dataKey="val"
                  name={rangeLabel}
                  stroke={COLOR_CURRENT}
                  strokeWidth={2.25}
                  fill="url(#providerSingleFill)"
                  connectNulls={false}
                  dot={curOnlyRows.length <= 12 ? { r: 3.5, fill: COLOR_CURRENT, stroke: "#fff", strokeWidth: 1.75 } : false}
                  activeDot={{ r: 5, fill: COLOR_CURRENT, stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                {forecastEnabled && m.forecast && (
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name="Dự báo"
                    stroke={COLOR_FORECAST}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    connectNulls={false}
                    dot={{ r: 3, fill: COLOR_FORECAST, stroke: "#fff", strokeWidth: 1.5 }}
                    activeDot={{ r: 5, fill: COLOR_FORECAST, stroke: "#fff", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHẾ ĐỘ 2: ĐỐI CHIẾU HAI BIỂU ĐỒ KỲ NÀY ↔ MỐC ĐỐI CHIẾU + DỰ BÁO
  // ═══════════════════════════════════════════════════════════════════════════
  const bothEmpty = totals.cur === 0 && totals.prev === 0 && rows.every((r) => !r.cur && !r.prev && !r.forecast);

  return (
    <section
      className="flex min-w-0 flex-col rounded-xl border border-emerald-700/25 bg-white shadow-xs"
      aria-labelledby="compare-title"
    >
      {/* Thanh điều khiển So sánh */}
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-emerald-50/40 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white">
              <GitCompareArrows size={16} />
            </span>
            <div className="min-w-0">
              <h2 id="compare-title" className="truncate text-sm font-bold text-slate-900">
                So sánh {rangeLabel.toLowerCase()} với {prevShortLabel.toLowerCase()}
              </h2>
              <p className="truncate text-[11px] text-slate-500">
                {currentSpan && previousSpan
                  ? `${currentSpan} ↔ ${previousSpan} · cùng thang trục tung để đối chiếu trực quan`
                  : "Hai biểu đồ đặt cạnh nhau trên cùng thang đo"}
              </p>
            </div>
          </div>

          {/* Chọn mốc đối chiếu: 1 kỳ trước | 2 kỳ trước | 4 tuần trước | Cùng kỳ năm trước */}
          {onChangeCompareMode && (
            <select
              value={compareMode}
              onChange={(e) => onChangeCompareMode(e.target.value)}
              aria-label="Chọn mốc đối chiếu"
              className="h-8 rounded-lg border border-emerald-800/20 bg-white px-2.5 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none"
            >
              {compareModeChoices.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  So với: {opt.label}
                </option>
              ))}
            </select>
          )}

          {onChangeCompareScope && (
            <div
              className="inline-flex items-center gap-0.5 rounded-lg border border-emerald-800/15 bg-white p-0.5 text-[11px]"
              role="radiogroup"
              aria-label="Phạm vi kỳ trước"
            >
              <button
                type="button"
                role="radio"
                aria-checked={compareScope === "same_span"}
                onClick={() => onChangeCompareScope("same_span")}
                className={`rounded-md px-2.5 py-1 font-semibold transition ${
                  compareScope === "same_span"
                    ? "bg-emerald-700 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Cùng thời lượng
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={compareScope === "full_prev"}
                onClick={() => onChangeCompareScope("full_prev")}
                className={`rounded-md px-2.5 py-1 font-semibold transition ${
                  compareScope === "full_prev"
                    ? "bg-emerald-700 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Trọn kỳ đối chiếu
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-fit gap-0.5 rounded-lg bg-slate-200/70 p-1" role="radiogroup" aria-label="Chọn chỉ số">
            {Object.entries(METRICS).map(([id, def]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={metric === id}
                onClick={() => setMetric(id)}
                className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  metric === id ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {def.label}
              </button>
            ))}
          </div>

          {supportsForecast && onToggleForecast && (
            <button
              type="button"
              onClick={onToggleForecast}
              aria-pressed={forecastEnabled}
              title="Bật/tắt dự báo lượng khách và doanh thu đến cuối kỳ"
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                forecastEnabled
                  ? "border-amber-600 bg-amber-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800"
              }`}
            >
              Dự báo
            </button>
          )}

          <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setCompareView("split")}
              title="Đặt 2 biểu đồ cạnh nhau"
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition ${
                compareView === "split" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Columns2 size={13} />
              2 biểu đồ
            </button>
            <button
              type="button"
              onClick={() => setCompareView("overlay")}
              title="Chồng 2 đường trên cùng 1 biểu đồ"
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition ${
                compareView === "overlay" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LineChartIcon size={13} />
              Gộp chung
            </button>
            <button
              type="button"
              onClick={() => setCompareView("table")}
              title="Xem bảng đối chiếu"
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition ${
                compareView === "table" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Table2 size={13} />
              Bảng
            </button>
          </div>

          {onExitCompare && (
            <button
              type="button"
              onClick={onExitCompare}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              title="Đóng chế độ so sánh"
            >
              <X size={14} />
              Đóng
            </button>
          )}
        </div>
      </div>

      {forecastEnabled && supportsForecast && (
        <ForecastStrip forecast={forecast} metric={metric === "revenue" ? "revenue" : "guests"} rangeLabel={rangeLabel} />
      )}

      {/* Thanh tóm tắt kết quả chênh lệch */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-4 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_CURRENT }} aria-hidden="true" />
            <span className="text-slate-500">{rangeLabel}:</span>
            <strong className="text-sm font-bold tabular-nums text-slate-900">
              {loading ? "…" : fmtTotal(totals.cur)}
            </strong>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_PREVIOUS }} aria-hidden="true" />
            <span className="text-slate-500">{prevShortLabel}:</span>
            <strong className="text-sm font-bold tabular-nums text-slate-700">
              {loading ? "…" : fmtTotal(totals.prev)}
            </strong>
          </div>
        </div>

        {!loading && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Chênh lệch:</span>
            <span
              className={`font-bold tabular-nums ${
                diff > 0 ? "text-emerald-700" : diff < 0 ? "text-rose-600" : "text-slate-600"
              }`}
            >
              {diff > 0 ? "+" : diff < 0 ? "-" : "±"}
              {fmtTotal(Math.abs(diff))}
            </span>
            {pct !== null ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  pct >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                }`}
              >
                {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
              </span>
            ) : totals.cur > 0 ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                Mới phát sinh
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Vùng hiển thị chính */}
      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="jg-shimmer h-[250px] rounded-xl" />
            <div className="jg-shimmer h-[250px] rounded-xl" />
          </div>
        ) : bothEmpty ? (
          <div className="flex h-[220px] flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm font-semibold text-slate-600">
              Chưa phát sinh {m.label.toLowerCase()} ở cả {rangeLabel.toLowerCase()} lẫn {prevShortLabel.toLowerCase()}
            </p>
            <p className="text-xs text-slate-400">
              Bạn có thể chuyển sang chỉ số khác hoặc chọn mốc đối chiếu khác phía trên.
            </p>
          </div>
        ) : compareView === "split" ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Biểu đồ Trái: Kỳ hiện tại (+ đường Dự báo nếu bật) */}
            <div className="flex flex-col rounded-xl border border-emerald-700/20 bg-emerald-50/20 p-3">
              <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <span className="h-2 w-2 rounded-full" style={{ background: COLOR_CURRENT }} />
                    {rangeLabel}
                    {forecastEnabled && supportsForecast && m.forecast && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        + Dự báo
                      </span>
                    )}
                  </p>
                  {currentSpan && <p className="text-[11px] text-slate-500">{currentSpan}</p>}
                </div>
                <span className="text-base font-bold tabular-nums text-emerald-800">{fmtTotal(totals.cur)}</span>
              </div>

              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={curOnlyRows}
                    syncId="provider-dual-compare"
                    margin={{ top: 8, right: 10, bottom: 0, left: 0 }}
                  >
                    <defs>
                      <linearGradient id="dualCurFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLOR_CURRENT} stopOpacity={0.18} />
                        <stop offset="95%" stopColor={COLOR_CURRENT} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      minTickGap={14}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      width={52}
                      domain={[0, sharedMax]}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(v) => (m.money ? compactMoney(v) : fmtInt(v))}
                    />
                    <Tooltip
                      cursor={{ stroke: "#94a3b8", strokeWidth: 1 }}
                      content={<SingleSeriesTooltip metric={metric} unit={unit} color={COLOR_CURRENT} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="val"
                      name={rangeLabel}
                      stroke={COLOR_CURRENT}
                      strokeWidth={2.25}
                      fill="url(#dualCurFill)"
                      connectNulls={false}
                      dot={curOnlyRows.length <= 12 ? { r: 3, fill: COLOR_CURRENT, stroke: "#fff", strokeWidth: 1.5 } : false}
                      activeDot={{ r: 5, fill: COLOR_CURRENT, stroke: "#fff", strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                    {forecastEnabled && m.forecast && (
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        name="Dự báo"
                        stroke={COLOR_FORECAST}
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        connectNulls={false}
                        dot={{ r: 3, fill: COLOR_FORECAST, stroke: "#fff", strokeWidth: 1.5 }}
                        activeDot={{ r: 5, fill: COLOR_FORECAST, stroke: "#fff", strokeWidth: 2 }}
                        isAnimationActive={false}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Biểu đồ Phải: Mốc đối chiếu */}
            <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <span className="h-2 w-2 rounded-full" style={{ background: COLOR_PREVIOUS }} />
                    {prevShortLabel}
                    {compareScope === "full_prev" ? " (trọn kỳ)" : " (cùng kỳ)"}
                  </p>
                  {previousSpan && <p className="text-[11px] text-slate-500">{previousSpan}</p>}
                </div>
                <span className="text-base font-bold tabular-nums text-slate-700">{fmtTotal(totals.prev)}</span>
              </div>

              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={prevOnlyRows}
                    syncId="provider-dual-compare"
                    margin={{ top: 8, right: 10, bottom: 0, left: 0 }}
                  >
                    <defs>
                      <linearGradient id="dualPrevFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLOR_PREVIOUS} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={COLOR_PREVIOUS} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      minTickGap={14}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      width={52}
                      domain={[0, sharedMax]}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(v) => (m.money ? compactMoney(v) : fmtInt(v))}
                    />
                    <Tooltip
                      cursor={{ stroke: "#94a3b8", strokeWidth: 1 }}
                      content={<SingleSeriesTooltip metric={metric} unit={unit} color={COLOR_PREVIOUS} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="val"
                      name={prevShortLabel}
                      stroke={COLOR_PREVIOUS}
                      strokeWidth={2.25}
                      fill="url(#dualPrevFill)"
                      dot={prevOnlyRows.length <= 12 ? { r: 3, fill: COLOR_PREVIOUS, stroke: "#fff", strokeWidth: 1.5 } : false}
                      activeDot={{ r: 5, fill: COLOR_PREVIOUS, stroke: "#fff", strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : compareView === "overlay" ? (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="overlayCurFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_CURRENT} stopOpacity={0.14} />
                    <stop offset="95%" stopColor={COLOR_CURRENT} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  minTickGap={16}
                  interval="preserveStartEnd"
                />
                <YAxis
                  width={54}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(v) => (m.money ? compactMoney(v) : fmtInt(v))}
                />
                <Tooltip
                  cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                  content={<OverlayTooltip metric={metric} unit={unit} prevShortLabel={prevShortLabel} />}
                />
                <Line
                  type="monotone"
                  dataKey="prev"
                  name={prevShortLabel}
                  stroke={COLOR_PREVIOUS_OVERLAY}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="cur"
                  name={rangeLabel}
                  stroke={COLOR_CURRENT}
                  strokeWidth={2.25}
                  fill="url(#overlayCurFill)"
                  connectNulls={false}
                  dot={rows.length <= 12 ? { r: 3.5, fill: COLOR_CURRENT, stroke: "#fff", strokeWidth: 1.75 } : false}
                  activeDot={{ r: 5, fill: COLOR_CURRENT, stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                {forecastEnabled && m.forecast && (
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name="Dự báo"
                    stroke={COLOR_FORECAST}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    connectNulls={false}
                    dot={{ r: 3, fill: COLOR_FORECAST, stroke: "#fff", strokeWidth: 1.5 }}
                    activeDot={{ r: 5, fill: COLOR_FORECAST, stroke: "#fff", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="max-h-[260px] overflow-auto [scrollbar-width:thin]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="px-3 py-2">Mốc {rangeLabel.toLowerCase()}</th>
                  <th className="px-3 py-2 text-right">{rangeLabel}</th>
                  {forecastEnabled && m.forecast && <th className="px-3 py-2 text-right">Dự báo</th>}
                  <th className="px-3 py-2">Mốc {prevShortLabel.toLowerCase()}</th>
                  <th className="px-3 py-2 text-right">{prevShortLabel}</th>
                  <th className="px-3 py-2 text-right">Chênh lệch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {rows.map((r) => {
                  const rowDiff = r.cur == null || r.prev == null ? null : r.cur - r.prev;
                  return (
                    <tr key={`${r.idx}-${r.start || r.prevStart}`} className="hover:bg-slate-50/70">
                      <td className="px-3 py-1.5 text-slate-600">
                        {r.start ? formatPoint(r.start, unit, r.idx, true) : "—"}
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold text-slate-900">
                        {r.cur == null ? "—" : m.money ? fmtMoney(r.cur) : fmtInt(r.cur)}
                      </td>
                      {forecastEnabled && m.forecast && (
                        <td className="px-3 py-1.5 text-right font-semibold text-amber-700">
                          {r.forecast == null ? "—" : m.money ? fmtMoney(r.forecast) : fmtInt(r.forecast)}
                        </td>
                      )}
                      <td className="px-3 py-1.5 text-slate-500">
                        {r.prevStart ? formatPoint(r.prevStart, unit, r.idx, true) : "—"}
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-600">
                        {r.prev == null ? "—" : m.money ? fmtMoney(r.prev) : fmtInt(r.prev)}
                      </td>
                      <td
                        className={`px-3 py-1.5 text-right font-semibold ${
                          rowDiff == null
                            ? "text-slate-400"
                            : rowDiff > 0
                              ? "text-emerald-700"
                              : rowDiff < 0
                                ? "text-rose-600"
                                : "text-slate-400"
                        }`}
                      >
                        {rowDiff == null
                          ? "—"
                          : `${rowDiff > 0 ? "+" : rowDiff < 0 ? "-" : ""}${
                              m.money ? fmtMoney(Math.abs(rowDiff)) : fmtInt(Math.abs(rowDiff))
                            }`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
