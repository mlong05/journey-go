"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, Table2, LineChart as LineChartIcon } from "lucide-react";
import { percentChange } from "@/features/dashboard";

/**
 * Biểu đồ "Diễn biến theo thời gian" — kỳ này (đường liền) đặt cạnh kỳ trước (đường đứt) trên
 * MỘT trục, chuyển chỉ số bằng nút: Doanh thu | Lượt đặt | Check-in.
 * Dữ liệu: stats.series (GET /dashboard/provider) — mỗi mốc là 1 giờ (Hôm nay) hoặc 1 ngày.
 *
 * Màu đã kiểm bằng validate_palette: kỳ này #047857 (đạt CVD / normal-vision), kỳ trước #94a3b8
 * cố ý nhạt (ngữ cảnh) ⇒ luôn kèm nét đứt + chú thích + bảng số liệu để không phụ thuộc màu.
 */

const COLOR_CURRENT = "#047857";
const COLOR_PREVIOUS = "#94a3b8";

const METRICS = {
  revenue: { label: "Doanh thu", cur: "revenue", prev: "prevRevenue", money: true },
  bookings: { label: "Lượt đặt", cur: "bookings", prev: "prevBookings", unit: "đơn" },
  checkIns: { label: "Check-in", cur: "checkIns", prev: "prevCheckIns", unit: "lượt" },
};

const fmtInt = (n) => Number(n || 0).toLocaleString("vi-VN");
const fmtMoney = (n) => `${fmtInt(n)} ₫`;
/** Trục Y gọn: 1,2 tr · 850 k · 2 tỷ. */
function compactMoney(n) {
  const v = Number(n) || 0;
  const f = (x) => x.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
  if (v >= 1e9) return `${f(v / 1e9)} tỷ`;
  if (v >= 1e6) return `${f(v / 1e6)} tr`;
  if (v >= 1e3) return `${f(v / 1e3)} k`;
  return f(v);
}

const VN_TZ = "Asia/Ho_Chi_Minh";
function formatPoint(iso, unit, long = false) {
  if (!iso) return "";
  const d = new Date(iso);
  if (unit === "hour") {
    const hour = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", hourCycle: "h23", timeZone: VN_TZ }).format(d);
    if (!long) return `${hour}h`;
    const day = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: VN_TZ }).format(d);
    return `${hour}h, ${day}`;
  }
  return new Intl.DateTimeFormat("vi-VN", long
    ? { weekday: "short", day: "2-digit", month: "2-digit", timeZone: VN_TZ }
    : { day: "2-digit", month: "2-digit", timeZone: VN_TZ }).format(d);
}

function TrendTooltip({ active, payload, metric, unit, previousLabel }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  const m = METRICS[metric];
  const fmt = (v) => (v == null ? "—" : m.money ? fmtMoney(v) : `${fmtInt(v)} ${m.unit}`);
  const pct = row.prev == null ? null : percentChange(row.cur, row.prev);
  return (
    <div className="min-w-[210px] rounded-xl border border-slate-700/50 bg-slate-900 px-3 py-2 shadow-xl">
      <p className="flex items-center gap-2 text-[11.5px] font-bold text-white">
        <span className="h-0.5 w-4 rounded-full" style={{ background: COLOR_CURRENT }} aria-hidden="true" />
        {formatPoint(row.start, unit, true)}: {fmt(row.cur)}
      </p>
      <p className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-slate-300">
        <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: COLOR_PREVIOUS }} aria-hidden="true" />
        {row.prevStart ? `${formatPoint(row.prevStart, unit, true)}: ${fmt(row.prev)}` : `${previousLabel}: không có mốc tương ứng`}
      </p>
      {pct !== null && (
        <p className="mt-1 text-[10.5px] font-semibold text-slate-400">
          {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% so với kỳ trước
        </p>
      )}
    </div>
  );
}

export default function ProviderTrendChart({ series, unit = "day", rangeLabel, previousLabel, loading }) {
  const [metric, setMetric] = useState("revenue");
  const [asTable, setAsTable] = useState(false);
  const m = METRICS[metric];

  const rows = useMemo(() => (series || []).map((p) => ({
    start: p.start,
    prevStart: p.prevStart,
    label: formatPoint(p.start, unit),
    cur: Number(p[m.cur]) || 0,
    prev: p[m.prev] == null ? null : Number(p[m.prev]) || 0,
  })), [series, unit, m]);

  const totals = useMemo(() => rows.reduce(
    (acc, r) => ({ cur: acc.cur + r.cur, prev: acc.prev + (r.prev || 0) }), { cur: 0, prev: 0 }), [rows]);
  const pct = percentChange(totals.cur, totals.prev);
  const isEmpty = rows.every((r) => !r.cur && !r.prev);
  const fmtTotal = (v) => (m.money ? fmtMoney(v) : `${fmtInt(v)} ${m.unit}`);

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-xs" aria-labelledby="trend-title">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <TrendingUp size={16} />
          </span>
          <div className="min-w-0">
            <h2 id="trend-title" className="truncate text-sm font-bold text-slate-900">Diễn biến theo thời gian</h2>
            <p className="truncate text-[11px] text-slate-500">{rangeLabel} so với {previousLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex w-fit gap-0.5 rounded-lg bg-slate-100 p-1" role="radiogroup" aria-label="Chọn chỉ số">
            {Object.entries(METRICS).map(([id, def]) => (
              <button key={id} type="button" role="radio" aria-checked={metric === id} onClick={() => setMetric(id)}
                className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  metric === id ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}>
                {def.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}
            title={asTable ? "Xem dạng biểu đồ" : "Xem dạng bảng"} aria-label={asTable ? "Xem dạng biểu đồ" : "Xem dạng bảng"}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:text-slate-900">
            {asTable ? <LineChartIcon size={15} /> : <Table2 size={15} />}
          </button>
        </div>
      </div>

      {/* Tổng của kỳ + chú thích (luôn hiện, nhận diện không chỉ bằng màu) */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-4 pt-3">
        <div>
          <p className="text-[11px] text-slate-500">Tổng {m.label.toLowerCase()} · {rangeLabel.toLowerCase()}</p>
          <p className="flex items-baseline gap-2">
            <span className={`text-xl font-bold tabular-nums ${loading ? "text-slate-300" : "text-slate-900"}`}>
              {loading ? "…" : fmtTotal(totals.cur)}
            </span>
            {!loading && pct !== null && (
              <span className={`rounded-full px-1.5 text-[10.5px] font-bold ${pct >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
              </span>
            )}
            {!loading && <span className="text-[11px] text-slate-400">kỳ trước {fmtTotal(totals.prev)}</span>}
          </p>
        </div>
        <ul className="flex items-center gap-4 text-[11px] font-semibold text-slate-600" aria-label="Chú thích">
          <li className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded-full" style={{ background: COLOR_CURRENT }} aria-hidden="true" />{rangeLabel}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-0 w-5 border-t-2 border-dashed" style={{ borderColor: COLOR_PREVIOUS }} aria-hidden="true" />Kỳ trước
          </li>
        </ul>
      </div>

      <div className="h-[240px] px-2 pb-3 pt-2">
        {loading ? (
          <div className="jg-shimmer h-full rounded-lg" />
        ) : isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm font-semibold text-slate-600">Chưa có {m.label.toLowerCase()} trong khoảng này</p>
            <p className="text-xs text-slate-400">Số liệu sẽ hiện khi du khách đặt tour hoặc check-in tại điểm đến của bạn.</p>
          </div>
        ) : asTable ? (
          <div className="h-full overflow-auto [scrollbar-width:thin]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="px-3 py-2">{unit === "hour" ? "Giờ" : "Ngày"}</th>
                  <th className="px-3 py-2 text-right">{rangeLabel}</th>
                  <th className="px-3 py-2 text-right">Kỳ trước</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {rows.map((r) => (
                  <tr key={r.start}>
                    <td className="px-3 py-1.5 text-slate-600">{formatPoint(r.start, unit, true)}</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-slate-900">{m.money ? fmtMoney(r.cur) : fmtInt(r.cur)}</td>
                    <td className="px-3 py-1.5 text-right text-slate-500">{r.prev == null ? "—" : m.money ? fmtMoney(r.prev) : fmtInt(r.prev)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#e2e8f0" }} tick={{ fontSize: 11, fill: "#64748b" }}
                minTickGap={16} interval="preserveStartEnd" />
              <YAxis width={52} tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={(v) => (m.money ? compactMoney(v) : fmtInt(v))} />
              <Tooltip cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                content={<TrendTooltip metric={metric} unit={unit} previousLabel={previousLabel} />} />
              <Line type="monotone" dataKey="prev" name="Kỳ trước" stroke={COLOR_PREVIOUS} strokeWidth={2} strokeDasharray="5 4"
                dot={false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="cur" name={rangeLabel} stroke={COLOR_CURRENT} strokeWidth={2}
                dot={rows.length <= 8 ? { r: 4, fill: COLOR_CURRENT, stroke: "#fff", strokeWidth: 2 } : false}
                activeDot={{ r: 5, fill: COLOR_CURRENT, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
