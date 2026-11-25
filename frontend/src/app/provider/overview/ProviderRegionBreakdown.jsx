"use client";

import React from "react";
import { MapPinned, QrCode, Satellite } from "lucide-react";
import { CARD } from "../overview.tokens";
import { formatVNDNumber } from "@/lib/money";

/**
 * Phân rã doanh thu theo khu vực của tour.
 *
 * Tour không gán khu vực được gom vào nhóm "Chưa phân khu vực" — hiển thị rõ để đối tác
 * biết cần bổ sung khu vực cho tour (khu vực là trục tìm kiếm chính của du khách).
 */
export default function ProviderRegionBreakdown({ regions, isLoading }) {
  const rows = regions || [];
  const total = rows.reduce((sum, r) => sum + (Number(r.grossAmount) || 0), 0);
  const totalBookings = rows.reduce((sum, r) => sum + (Number(r.bookings) || 0), 0);
  const avgPerBooking = totalBookings > 0 ? total / totalBookings : 0;
  const topRegion = rows.reduce(
    (best, r) => (!best || (Number(r.grossAmount) || 0) > (Number(best.grossAmount) || 0) ? r : best),
    null,
  );

  return (
    <section className={CARD.shell + " flex h-full flex-col"}>
      <header className={CARD.header}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <MapPinned size={16} strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <h2 className={CARD.title}>Doanh thu theo khu vực</h2>
            <p className={CARD.subtitle}>Khu vực của tour trong kỳ</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-5 py-3">
        {isLoading && rows.length === 0 ? (
          <div className="jg-shimmer h-[110px] w-full rounded-xl" />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
            <p className="text-sm font-semibold text-slate-600">Chưa có doanh thu trong kỳ này</p>
            <p className="max-w-[260px] text-xs text-slate-400">
              Khi có đơn được thanh toán, doanh thu sẽ được gom theo khu vực của tour ở đây.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {rows.map((row) => {
              const share = total > 0 ? ((Number(row.grossAmount) || 0) / total) * 100 : 0;
              return (
                <li key={row.regionId ?? "none"}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[11.5px] font-semibold text-slate-600">
                      {row.regionName || "Chưa phân khu vực"}
                    </span>
                    <span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-900">
                      {formatVNDNumber(row.grossAmount)} ₫
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-sky-500"
                        style={{ width: `${Math.min(100, share)}%` }}
                      />
                    </div>
                    <span className="w-11 shrink-0 text-right text-[10.5px] font-bold tabular-nums text-slate-500">
                      {share.toFixed(1)}%
                    </span>
                    <span className="w-14 shrink-0 text-right text-[10.5px] font-semibold tabular-nums text-slate-400">
                      {row.bookings} đơn
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Tóm tắt khu vực nổi bật — lấp khoảng trống bằng thông tin hữu ích. */}
        {!isLoading && rows.length > 0 && (
          <div className="mt-auto rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
              Khu vực nổi bật
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
                <p className="text-[10px] font-semibold text-slate-500">Khu vực dẫn đầu</p>
                <p className="mt-0.5 truncate text-[13px] font-bold text-slate-900">
                  {topRegion?.regionName || "Chưa phân khu vực"}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-sky-600">
                  {topRegion
                    ? `${(((Number(topRegion.grossAmount) || 0) / (total || 1)) * 100).toFixed(1)}% doanh thu · ${topRegion.bookings} đơn`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
                <p className="text-[10px] font-semibold text-slate-500">Giá trị đơn TB</p>
                <p className="mt-0.5 text-[13px] font-bold tabular-nums text-slate-900">
                  {formatVNDNumber(avgPerBooking)} ₫
                </p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                  Trên {totalBookings} đơn đã thanh toán
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className={CARD.footer + " flex items-center justify-between"}>
          <span className="font-semibold">
            Tổng {rows.length} khu vực · {formatVNDNumber(total)} ₫
          </span>
        </div>
      )}
    </section>
  );
}

/**
 * Check-in theo phương thức xác minh — GPS hay Quét QR.
 *
 * Nếu phần lớn là GPS mà đối tác có điểm đến thiếu tọa độ ⇒ du khách không thể
 * check-in ⇒ đây là chỉ số chẩn đoán chất lượng cấu hình, không chỉ là thống kê.
 */
export function ProviderVerificationBreakdown({ methods, isLoading }) {
  const rows = methods || [];
  const total = rows.reduce((s, r) => s + (Number(r.count) || 0), 0);
  const gpsCount = rows
    .filter((r) => r.method === "GPS")
    .reduce((s, r) => s + (Number(r.count) || 0), 0);
  const gpsShare = total > 0 ? (gpsCount / total) * 100 : 0;

  const ICONS = { GPS: Satellite, QR: QrCode };

  return (
    <section className={CARD.shell + " flex h-full flex-col"}>
      <header className={CARD.header}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Satellite size={16} strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <h2 className={CARD.title}>Check-in theo cách xác minh</h2>
            <p className={CARD.subtitle}>Du khách check-in bằng GPS hay quét QR</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-5 py-3">
        {isLoading && rows.length === 0 ? (
          <div className="jg-shimmer h-[80px] w-full rounded-xl" />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
            <p className="text-sm font-semibold text-slate-600">Chưa có lượt check-in nào</p>
            <p className="max-w-[260px] text-xs text-slate-400">
              Lượt check-in hợp lệ sẽ hiện ở đây kèm phương thức xác minh.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
              const Icon = ICONS[row.method] ?? Satellite;
              const share = total > 0 ? ((Number(row.count) || 0) / total) * 100 : 0;
              return (
                <li key={row.method} className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Icon size={13} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-slate-600">
                    {row.label || row.method}
                  </span>
                  <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${Math.min(100, share)}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-[11px] font-bold tabular-nums text-slate-900">
                    {row.count}
                  </span>
                  <span className="w-11 shrink-0 text-right text-[10.5px] font-semibold tabular-nums text-slate-400">
                    {share.toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {/* Chẩn đoán phương thức xác minh — lấp khoảng trống bằng thông tin hữu ích. */}
        {!isLoading && total > 0 && (
          <div className="mt-auto rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
              Gợi ý cấu hình
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
              {gpsShare >= 50 ? (
                <>
                  <span className="font-bold text-slate-800">
                    {gpsShare.toFixed(0)}% lượt check-in dùng GPS.
                  </span>{" "}
                  Hãy bảo đảm mọi điểm đến của bạn đều có tọa độ chính xác — nếu không, du khách
                  sẽ không check-in được tại điểm đến.
                </>
              ) : (
                <>
                  <span className="font-bold text-slate-800">
                    {gpsShare.toFixed(0)}% lượt check-in dùng GPS.
                  </span>{" "}
                  Nên gán thêm tọa độ cho các điểm đến để du khách có thêm cách xác minh khi
                  không có mạng hoặc GPS yếu.
                </>
              )}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200/70">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${gpsShare}%` }} />
              </div>
              <span className="shrink-0 text-[10.5px] font-bold tabular-nums text-slate-700">
                {gpsShare.toFixed(0)}% GPS
              </span>
            </div>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className={CARD.footer}>Tổng {total.toLocaleString("vi-VN")} lượt check-in hợp lệ</div>
      )}
    </section>
  );
}
