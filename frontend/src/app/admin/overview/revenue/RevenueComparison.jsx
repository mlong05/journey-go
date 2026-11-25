"use client";

import { Skeleton } from "../KpiCard";
import Hint from "../Hint";
import { REVENUE_HINTS } from "../glossary";
import DeltaBadge from "./DeltaBadge";
import { money, monthName, pctChange, previousMonthKey, shortDate } from "./format";

/** Một ô số liệu so sánh. */
function Tile({ label, hint, value, footer, emphasis = false, loading }) {
  return (
    <div
      className={`rounded-xl border p-3.5 flex flex-col gap-1.5 min-w-0 ${
        emphasis ? "bg-indigo-50/60 border-indigo-200/70" : "bg-white border-slate-200/80"
      }`}
    >
      <p className="text-[11px] font-semibold text-slate-500 truncate">
        <Hint text={hint}>{label}</Hint>
      </p>
      {loading ? (
        <Skeleton className="h-6 w-28 rounded-md bg-slate-100" />
      ) : (
        <p
          className={`font-bold tracking-tight tabular-nums leading-none text-slate-900 ${
            emphasis ? "text-[22px]" : "text-[18px]"
          }`}
        >
          {money(value)}
        </p>
      )}
      <div className="min-h-[20px] flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500">
        {!loading && footer}
      </div>
    </div>
  );
}

/** Một chỉ số phụ ở hàng dưới. */
function Fact({ label, hint, children }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-slate-500">
        <Hint text={hint}>{label}</Hint>:
      </span>
      <span className="font-bold text-slate-800 tabular-nums">{children}</span>
    </div>
  );
}

/**
 * So sánh doanh thu: tháng này (đến hôm nay) · cùng kỳ tháng trước · cả tháng trước · dự kiến hết tháng.
 *
 * So "tháng này" với CÙNG SỐ NGÀY của tháng trước — so với cả tháng trước thì giữa
 * tháng lúc nào cũng thấy giảm, gây hiểu nhầm.
 */
export default function RevenueComparison({ report, isLoading }) {
  const r = report || {};
  const mtd = r.monthToDate || {};
  const same = r.previousSameDays || {};
  const full = r.previousMonthFull || {};
  const curName = monthName(r.currentMonth);
  const prevName = monthName(previousMonthKey(r.currentMonth));
  const loading = isLoading && !report;

  const vsSame = pctChange(mtd.revenue, same.revenue);
  const projectedVsFull = pctChange(r.projectedRevenue, full.revenue);
  const takeRateDelta = (Number(mtd.takeRate) || 0) - (Number(same.takeRate) || 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Tile
          emphasis
          loading={loading}
          label={`Doanh thu ${curName} (${shortDate(mtd.from)}–${shortDate(mtd.to)})`}
          hint={REVENUE_HINTS.monthToDate}
          value={mtd.revenue}
          footer={
            <>
              <DeltaBadge value={vsSame} title={`So với ${shortDate(same.from)}–${shortDate(same.to)}`} />
              <span>so với cùng kỳ {prevName}</span>
            </>
          }
        />
        <Tile
          loading={loading}
          label={`Cùng kỳ ${prevName} (${shortDate(same.from)}–${shortDate(same.to)})`}
          hint={REVENUE_HINTS.sameDays}
          value={same.revenue}
          footer={<span>{(same.bookings ?? 0).toLocaleString("vi-VN")} booking đã thanh toán</span>}
        />
        <Tile
          loading={loading}
          label={`Cả ${prevName}`}
          hint={REVENUE_HINTS.previousFull}
          value={full.revenue}
          footer={
            <span>
              GMV {money(full.gmv)} · {(full.bookings ?? 0).toLocaleString("vi-VN")} booking
            </span>
          }
        />
        <Tile
          loading={loading}
          label={`Dự kiến hết ${curName}`}
          hint={REVENUE_HINTS.projected}
          value={r.projectedRevenue}
          footer={
            <>
              <DeltaBadge value={projectedVsFull} title={`So với cả ${prevName}`} />
              <span>so với cả {prevName}</span>
            </>
          }
        />
      </div>

      {!loading && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-[11.5px]">
          <Fact label={`GMV ${curName}`} hint={REVENUE_HINTS.gmv}>
            {money(mtd.gmv)}
          </Fact>
          <Fact label="Tỷ lệ hoa hồng thực tế" hint={REVENUE_HINTS.takeRate}>
            {(Number(mtd.takeRate) || 0).toFixed(1)}%
            {Number(same.gmv) > 0 && (
              <span
                className={`ml-1 text-[10.5px] font-semibold ${
                  takeRateDelta >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                ({takeRateDelta >= 0 ? "+" : "−"}
                {Math.abs(takeRateDelta).toFixed(1)} điểm)
              </span>
            )}
          </Fact>
          <Fact label="Đã hoàn cho khách" hint={REVENUE_HINTS.refund}>
            {money(mtd.refund)}
          </Fact>
          <Fact label="Booking đã thanh toán" hint={REVENUE_HINTS.bookings}>
            {(mtd.bookings ?? 0).toLocaleString("vi-VN")}
          </Fact>
        </div>
      )}
    </div>
  );
}
