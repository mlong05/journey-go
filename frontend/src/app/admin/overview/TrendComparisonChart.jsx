"use client";

import React, { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { CardHeader, Skeleton } from "./KpiCard";
import Hint from "./Hint";
import YearAxisTick, { PlainAxisTick } from "@/components/charts/YearAxisTick";
import { CARD } from "@/app/admin/overview.tokens";
import { formatVNDNumber } from "@/lib/money";

/** Màu 2 đường: hiện tại (đậm) vs mốc so sánh (mờ, nét đứt). */
const COLORS = { current: "#4f46e5", baseline: "#94a3b8" };

/**
 * "T09/2025" → "Th09/2025" — nhãn tháng dễ đọc hơn cho TOOLTIP.
 *
 * ⚠️ Trục ngang của khung "Tất cả" chỉ hiện NĂM ⇒ tooltip là nơi DUY NHẤT
 * hiện tháng ⇒ cần nhãn đầy đủ "Th09/2025" để người đọc biết chính xác.
 * Nhãn không theo mẫu "TMM/YYYY" thì giữ nguyên.
 */
function formatMonthLabel(value) {
  if (!value) return "";
  const m = /^T(\d{2})\/(\d{4})$/.exec(String(value));
  return m ? `Th${m[1]}/${m[2]}` : "";
}

function TrendTooltip({ active, payload, label, unit, baselineLabel, periodKey, hasBaseline = true }) {
  if (!active || !payload?.length) return null;

  // ⚠️ Recharts CHỈ đưa các series có giá trị khác null vào payload.
  // ⇒ Ở ô mà kỳ hiện tại KHÔNG có ngày tương ứng (VD: ô 31 của tháng 11),
  // series "current" bị loại khỏi payload ⇒ dòng "Kỳ này" không hiện.
  // ⇒ Dựng cả 2 dòng từ row data (payload[0].payload) thay vì duyệt payload.
  const row = payload[0]?.payload ?? {};

  let baselineDisplay = baselineLabel || "";

  // Khi tab = "yearly": label = "T06" (tháng) → hiển thị "T06/năm_trước"
  if (periodKey === 'yearly' && label?.startsWith('T')) {
    const monthPart = label.substring(1); // "06" từ "T06"
    const yearFromBaseline = baselineLabel?.match(/\/(\d{4})/)?.[1]; // "2025" từ "01/01/2025"
    if (yearFromBaseline) {
      baselineDisplay = `T${monthPart}/${yearFromBaseline}`;
    }
  }
  // Khi tab = "today": label = "14:00" (giờ) - baseline là CÙNG GIỜ của hôm qua
  // ⇒ hiển thị "hôm qua 14:00" để người đọc thấy đúng giờ được so.
  else if (periodKey === 'today' && label) {
    baselineDisplay = baselineLabel ? `${baselineLabel} ${label}` : label;
  }

  // Nhãn ngày của TỪNG kỳ — do backend phát sẵn (không tự tính toán ở frontend
  // vì dễ sai khi đổi tháng có 30/31 ngày, sang năm, …).
  // ⚠️ Khung "Tất cả": trục ngang CHỈ hiện NĂM ⇒ tooltip phải hiện ĐẦY ĐỦ
  // "Th09/2025" để người đọc biết chính xác tháng nào, năm nào.
  const currentDateLabel = formatMonthLabel(row.axisLabel || label) || row.axisLabel || label || "";
  // ⚠️ Khung "Hôm nay": nhãn baseline chỉ là giờ ("14:00") ⇒ thêm ngữ cảnh "hôm qua".
  const baselineDateLabel = periodKey === 'today'
    ? (row.baselineLabel ? `hôm qua ${row.baselineLabel}` : baselineDisplay)
    : (row.baselineLabel || baselineDisplay);

  /** Dựng 1 dòng tooltip cho 1 kỳ. */
  const buildRow = (isBaseline) => {
    const value = isBaseline ? row.baseline : row.current;
    const missing = isBaseline ? row.baselineMissing : row.currentMissing;
    const dateLabel = isBaseline ? baselineDateLabel : currentDateLabel;
    const prefix = isBaseline ? 'Kỳ trước' : 'Kỳ này';

    // Ô không có ngày ở kỳ này (VD: tháng 11 không có ngày 31) ⇒ hiện "-".
    if (missing) {
      return {
        key: isBaseline ? 'baseline' : 'current',
        text: isBaseline ? `${prefix} - ${dateLabel}` : `${prefix} - (không có ngày này)`,
        valueText: '-',
        muted: true,
      };
    }
    // value null = thời điểm chưa diễn ra (chỉ có thể xảy ra ở kỳ hiện tại).
    if (value === null || value === undefined) {
      return {
        key: isBaseline ? 'baseline' : 'current',
        text: `${prefix} - ${dateLabel}`,
        valueText: periodKey === 'today' ? 'Chưa đến giờ' : 'Chưa có dữ liệu',
        muted: true,
      };
    }
    return {
      key: isBaseline ? 'baseline' : 'current',
      text: `${prefix} - ${dateLabel}`,
      valueText: `${formatVNDNumber(value)} ${unit}`,
      muted: isBaseline,
    };
  };

  // Mốc so sánh trước, kỳ hiện tại sau (đúng thứ tự đọc).
  // ⚠️ Khung "Tất cả" không có mốc so sánh ⇒ chỉ hiện dòng kỳ hiện tại.
  const rows = hasBaseline ? [buildRow(true), buildRow(false)] : [buildRow(false)];

  return (
    <div className="rounded-lg bg-white px-3 py-2 shadow-lg border border-slate-200">
      {rows.map((r) => (
        <p
          key={r.key}
          className={`text-[11px] font-semibold leading-snug ${
            r.muted ? 'text-slate-500' : 'text-slate-900'
          }`}
        >
          {r.text}: <span className="font-bold">{r.valueText}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * Hàm định dạng trục Y (rút gọn Tr/Tỷ, không hiển thị .000).
 * VD: 1500000000 → "1.5Tỷ", 500000 → "0.5Tr", 50000 → "50K"
 */
function formatAxisValue(value) {
  if (value === 0) return "0";
  const num = Math.abs(value);
  if (num >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1) + "Tỷ";
  }
  if (num >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + "Tr";
  }
  if (num >= 1_000) {
    return (value / 1_000).toFixed(1) + "K";
  }
  return value.toFixed(0);
}

/**
 * Biểu đồ đường so sánh 2 kỳ: kỳ hiện tại vs mốc so sánh.
 *
 * Cả 2 chuỗi có CÙNG số điểm và CÙNG vị trí trục ngang (backend đảm bảo) ⇒ 2 đường
 * chồng khít theo vị trí, người đọc thấy ngay kỳ này vượt hay lùi mốc.
 */
export default function TrendComparisonChart({
  title,
  titleHint,
  subtitle,
  current,
  baseline,
  baselineLabel,
  currentLabel,
  period,
  periodKey,
  unit = "đ",
  isLoading,
}) {
  // ⚠️ Khung "Tất cả" KHÔNG có mốc so sánh ⇒ chỉ vẽ MỘT đường liên tục
  // (không đường nét đứt, không badge %, không chú giải "Mốc so sánh").
  const hasBaseline = periodKey !== "all";

  const data = useMemo(() => {
    const cur = current || [];
    const base = baseline || [];
    const rows = [];
    for (let i = 0; i < cur.length; i += 1) {
      const curLabel = cur[i]?.label ?? "";
      const baseLabel = base[i]?.label ?? "";
      rows.push({
        // ⚠️ Ô vượt quá số ngày của tháng hiện tại (VD: ô 31 khi tháng 11 chỉ có
        // 30 ngày, còn tháng 10 có 31 ngày) ⇒ kỳ hiện tại KHÔNG có nhãn.
        // Trục ngang vẫn phải hiện ô đó ⇒ dùng nhãn ĐẦY ĐỦ của mốc so sánh
        // ("31/10") để người đọc biết đây là ngày nào của tháng trước.
        label: curLabel || baseLabel,
        // ⚠️ Nhãn riêng cho đường baseline: 2 kỳ ở 2 khoảng thời gian khác nhau
        // (VD: tháng 11 vs tháng 10) ⇒ cùng vị trí là 2 ngày khác nhau.
        baselineLabel: baseLabel,
        // Ô không có ngày tương ứng trong tháng của kỳ đó ⇒ tooltip hiện "-"
        // thay vì null (VD: ô 31 — tháng 11 không có ngày 31).
        currentMissing: Boolean(cur[i]?.noSuchDay),
        baselineMissing: Boolean(base[i]?.noSuchDay),
        current: cur[i]?.value !== null && cur[i]?.value !== undefined ? Number(cur[i]?.value) : null,
        baseline: base[i]?.value !== null && base[i]?.value !== undefined ? Number(base[i]?.value) : null,
      });
    }
    return rows;
  }, [current, baseline]);

  /**
   * Nhãn trục ngang — khung "Tất cả" chỉ hiện **NĂM**; các khung khác giữ nguyên.
   *
   * ⚠️ Vì sao chỉ hiện NĂM?
   * Khung "Tất cả" trải qua nhiều năm (VD: 01/2024 → 11/2026 = 35 tháng). Nếu hiện
   * từng tháng ("T01/2026") thì Recharts co trục lại ⇒ TỰ ẨN nhãn (đo thực tế:
   * 35 tháng chỉ còn 7 nhãn ⇒ mất "T10/2026", người đọc tưởng THIẾU dữ liệu
   * tháng 10). Ép vẽ đủ 35 nhãn thì mỗi nhãn chỉ được ~8px ⇒ chồng lấn toàn bộ.
   *
   * ⇒ Chỉ hiện NĂM ("2024", "2025", "2026") ⇒ 3 nhãn, vừa khít, KHÔNG chồng lấn,
   *   KHÔNG cần xoay. Tháng cụ thể xem khi rê chuột — tooltip hiện ĐẦY ĐỦ
   *   ("Th09/2025") ⇒ không mất thông tin nào.
   *
   * ⚠️ Tooltip dùng nhãn GỐC (`row.label` = "T09/2025") ⇒ giữ nguyên, không rút gọn.
   */
  const isMonthRange = periodKey === "all";

  const chartData = useMemo(() => {
    if (!isMonthRange) return data;
    // Giữ nguyên `label` gốc ("T09/2025") cho TOOLTIP; trục ngang sẽ tự rút
    // ra năm qua `YearAxisTick`.
    return data;
  }, [data, isMonthRange]);

  // ⚠️ % so sánh phải chỉ tính trên CÁC NGÀY TRÙNG NHAU giữa 2 kỳ.
  // Khung "Tháng": đường nét đứt vẽ tới hết tháng trước (VD: 31/10) còn đường
  // nét liền chỉ tới 30/11 ⇒ nếu cộng hết sẽ so 30 ngày với 31 ngày ⇒ % SAI.
  // ⇒ Chỉ cộng các ô mà kỳ hiện tại có dữ liệu (current ≠ null).
  const matched = data.filter((r) => r.current !== null && r.current !== undefined);
  const totalCurrent = matched.reduce((s, r) => s + (r.current ?? 0), 0);
  const totalBaseline = matched.reduce((s, r) => s + (r.baseline ?? 0), 0);
  const delta =
    hasBaseline && totalBaseline > 0 ? ((totalCurrent - totalBaseline) / totalBaseline) * 100 : null;

  /**
   * Khoảng cách tối thiểu giữa 2 nhãn (px).
   *
   * ⚠️ `minTickGap` mặc định của Recharts = 5 nhưng khi nhãn DÀI hơn khoảng
   * cách ô thì Recharts vẫn ẩn nhãn. Đặt = 0 + `interval={0}` ⇒ ép vẽ ĐỦ mọi
   * nhãn (đã rút gọn nên vẫn vừa khít).
   */
  const axisGap = periodKey === "all" ? 0 : 16;

  /**
   * Tick trục ngang.
   *
   * ⚠️ Khung "Tất cả": dùng `YearAxisTick` ⇒ chỉ hiện NĂM, nằm ngang, không xoay.
   *   Các khung khác (Hôm nay/Tuần/Tháng/Năm/Tùy chỉnh) dùng `PlainAxisTick` ⇒
   *   mọi nhãn nằm ngang như cũ.
   */
  const xAxisTick = useMemo(() => {
    if (!isMonthRange) return { fontSize: 10, fill: "#94a3b8" };
    // ⚠️ Đặt TÊN hàm để ESLint `react/display-name` không báo lỗi.
    function YearTick(props) {
      return <YearAxisTick {...props} fontSize={10} fill="#94a3b8" />;
    }
    return YearTick;
  }, [isMonthRange]);

  // ⚠️ CÔNG THỨC TÍNH — hiển thị khi rê vào "So với mốc" để người đọc thấy
  // đúng cách con số % được ra (không phải chỉ biết kết quả).
  // ⇒ Liệt kê TỪNG bước với số liệu thật, kèm phép tính.
  const formula = delta !== null ? (
    <span className="block space-y-1">
      <span className="block font-semibold text-white/60 uppercase tracking-wider text-[10px]">
        Cách tính
      </span>
      <span className="block">
        Tổng kỳ này ={" "}
        <span className="font-bold text-white">{formatVNDNumber(totalCurrent)}</span>
      </span>
      <span className="block">
        Tổng kỳ trước ={" "}
        <span className="font-bold text-white">{formatVNDNumber(totalBaseline)}</span>
      </span>
      <span className="block">
        % = (Kỳ này − Kỳ trước) ÷ Kỳ trước × 100
      </span>
      <span className="block">
        = ({formatVNDNumber(totalCurrent)} − {formatVNDNumber(totalBaseline)}) ÷{" "}
        {formatVNDNumber(totalBaseline)} × 100 ={" "}
        <span className="font-bold text-white">
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
      </span>
      {matched.length < data.length ? (
        <span className="block border-t border-white/15 pt-1 text-[10.5px] text-white/70">
          ⚠️ Chỉ tính trên {matched.length} ngày trùng nhau giữa 2 kỳ (bỏ qua{" "}
          {data.length - matched.length} ngày chỉ có ở một kỳ).
        </span>
      ) : null}
    </span>
  ) : null;

  return (
    <section className={CARD.shell + " flex flex-col h-full"}>
      <CardHeader
        icon={TrendingUp}
        tone="indigo"
        title={title}
        titleHint={titleHint}
        subtitle={subtitle}
      >
        {delta !== null && (
          <div className="text-right">
            <Hint
              text={`${currentLabel} so với ${period?.baselineLabelForCurrentDays}`}
              formula={formula}
            >
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider leading-none cursor-help">
                So với mốc
              </p>
            </Hint>
            <p
              className={`text-lg font-bold tracking-tight tabular-nums leading-tight mt-0.5 ${
                delta >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}%
            </p>
          </div>
        )}
      </CardHeader>

      <div className="p-4 flex-1 min-h-[210px]">
        {isLoading && !data.length ? (
          <div className="h-[210px] flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-xl bg-slate-50" />
          </div>
        ) : (
          // ⚠️ height="100%": biểu đồ co giãn theo chiều cao thực của card ⇒ 2 ô
          // trong cùng hàng luôn cao bằng nhau, không để lại khoảng trống.
          <ResponsiveContainer width="100%" height="100%" minHeight={225}>
            <LineChart data={chartData} margin={{ top: 6, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={xAxisTick}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
                minTickGap={axisGap}
                interval={periodKey === "all" ? 0 : "preserveStartEnd"}
              />
              <YAxis
                type="number"
                tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={formatAxisValue}
              />
              <Tooltip
                content={<TrendTooltip unit={unit} baselineLabel={baselineLabel} periodKey={periodKey} hasBaseline={hasBaseline} />}
                cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={26}
                iconType="plainline"
                iconSize={16}
                wrapperStyle={{ fontSize: 10.5, fontWeight: 600 }}
              />
              {hasBaseline && (
                <Line
                  type="monotone"
                  dataKey="baseline"
                  name={baselineLabel || "Mốc so sánh"}
                  stroke={COLORS.baseline}
                  strokeWidth={1.75}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              <Line
                type="monotone"
                dataKey="current"
                name={currentLabel || "Kỳ hiện tại"}
                stroke={COLORS.current}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 3.5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
