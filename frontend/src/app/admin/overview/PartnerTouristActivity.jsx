"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Handshake, Users } from "lucide-react";
import { CardHeader, MetricTile } from "./KpiCard";
import { CARD } from "@/app/admin/overview.tokens";

/** Vòng cung Donut phân bổ trạng thái đối tác (vẽ bằng SVG, không cần thư viện chart). */
function DonutChart({ segments, total }) {
  const radius = 52;
  const stroke = 16;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = total > 0 ? total : 1;

  // Tính sẵn độ lệch của từng cung — dùng reduce để không gán lại biến trong render.
  // ⚠️ Các cung PHẢI phân vỡ toàn bộ "Tổng" ⇒ tổng giá trị cung = total. Nếu vượt quá
  // (VD: cộng thêm "mới tham gia" vào "đang hoạt động" trong khi mới tham gia vốn đã nằm
  // trong đang hoạt động) thì vòng cung vẽ vượt 100% ⇒ SVG vỡ hình.
  // ⚠️ React Compiler (eslint react-hooks/immutability) cấm GÁN LẠI biến sau khi render
  // xong ⇒ tính offset bằng TỔNG LŨY KẾ (cộng dồn các dash trước đó) thay vì `cursor +=`.
  const arcs = React.useMemo(() => {
    const sum = segments.reduce((acc, s) => acc + Math.max(0, Number(s.value) || 0), 0);
    const scale = sum > total && total > 0 ? total / sum : 1;

    // Độ dài vòng cung (theo chu kỳ) của từng cung.
    const dashes = segments.map((segment) => {
      const value = Math.max(0, Number(segment.value) || 0) * scale;
      return (value / safeTotal) * circumference;
    });

    return segments.map((segment, index) => {
      const dash = dashes[index];
      // Offset = tổng độ dài các cung phía trước (cộng dồn thuần túy, không mutate).
      const offset = dashes.slice(0, index).reduce((a, b) => a + b, 0);
      return { ...segment, dash: Math.max(0, dash - 2), offset };
    });
  }, [segments, safeTotal, circumference, total]);

  return (
    <div className="relative w-[132px] h-[132px] shrink-0">
      <svg viewBox="0 0 132 132" className="w-full h-full -rotate-90">
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={stroke}
        />
        {arcs.map((arc) => (
          <circle
            key={arc.key}
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            strokeDasharray={`${arc.dash} ${circumference}`}
            strokeDashoffset={-arc.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums leading-none">
          {total.toLocaleString("vi-VN")}
        </span>
        <span className="text-[10px] font-semibold text-slate-400 mt-1">Tổng đối tác</span>
      </div>
    </div>
  );
}

/** Khối "Khách du lịch" — 4 chỉ số + tỷ lệ khách quay lại nổi bật. */
export function TouristActivityCard({ tourists, isLoading }) {
  const stats = tourists || {};
  const returningRate = stats.returningRate ?? 0;
  const delta = stats.returningRateDelta ?? 0;
  const positive = delta >= 0;

  return (
    <section className={CARD.shell + " flex flex-col h-full"}>
      <CardHeader
        icon={Users}
        tone="sky"
        title="Hoạt động khách du lịch"
        subtitle="Khách hàng trên nền tảng JourneyGo"
      >
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Xem tất cả
          <ChevronRight size={13} />
        </Link>
      </CardHeader>

      <div className="p-4 grid grid-cols-2 gap-2.5">
        <MetricTile
          label="Tổng tài khoản Tourist"
          value={Number(stats.total || 0).toLocaleString("vi-VN")}
          tone="sky"
        />
        <MetricTile
          label="Tourist mới trong kỳ"
          value={Number(stats.newInPeriod || 0).toLocaleString("vi-VN")}
          tone="indigo"
        />
        <MetricTile
          label="Tourist đang hoạt động"
          value={Number(stats.active || 0).toLocaleString("vi-VN")}
          tone="emerald"
        />
        <MetricTile
          label="Hoàn thành ≥ 1 tour"
          value={Number(stats.completedAtLeastOne || 0).toLocaleString("vi-VN")}
          tone="amber"
        />
      </div>

      {/* Khối nổi bật: tỷ lệ khách quay lại */}
      <div className="px-4 pb-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 border border-indigo-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600/80">
            Tỷ lệ khách quay lại đặt tour
          </p>
          <div className="mt-1 flex items-end gap-2.5">
            <span className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums leading-none">
              {isLoading ? "…" : `${returningRate.toFixed(1)}%`}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[10.5px] font-bold ${
                positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}
            >
              {positive ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
              <span className="font-medium text-slate-500">vs kỳ trước</span>
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-white/70 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${Math.min(100, returningRate)}%` }}
            />
          </div>
          <p className="mt-2 text-[10.5px] text-slate-500">
            Khách đặt từ 2 lượt trở lên trong kỳ so với tổng khách có đặt tour.
          </p>
        </div>
      </div>
    </section>
  );
}

/** Khối "Đối tác" — donut trạng thái + 4 chỉ số chi tiết. */
export function PartnerActivityCard({ partners, isLoading }) {
  const stats = partners || {};

  const segments = [
    { key: "active", label: "Hồ sơ đang hoạt động", value: Number(stats.active || 0), color: "#10b981" },
    { key: "inactive", label: "Hồ sơ không hoạt động", value: Number(stats.inactive || 0), color: "#f43f5e" },
  ];
  const total = Number(stats.total || 0);

  return (
    <section className={CARD.shell + " flex flex-col h-full"}>
      <CardHeader
        icon={Handshake}
        tone="emerald"
        title="Hoạt động đối tác"
        subtitle="Content Provider trên nền tảng"
      >
        <Link
          href="/admin/partners"
          className="inline-flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Xem tất cả
          <ChevronRight size={13} />
        </Link>
      </CardHeader>

      <div className="p-4 flex flex-col sm:flex-row gap-4 items-center">
        <DonutChart segments={segments} total={total} />

        <ul className="flex-1 min-w-0 space-y-2 w-full">
          {segments.map((segment) => (
            <li key={segment.key} className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: segment.color }}
              />
              <span className="text-[11.5px] text-slate-600 truncate flex-1">{segment.label}</span>
              <span className="text-[12.5px] font-bold text-slate-900 tabular-nums shrink-0">
                {isLoading ? "…" : segment.value.toLocaleString("vi-VN")}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-4 pb-4 grid grid-cols-2 gap-2.5">
        <MetricTile
          label="Có tour đang mở bán"
          value={Number(stats.withPublishedTours || 0).toLocaleString("vi-VN")}
          tone="indigo"
        />
        <MetricTile
          label="Đối tác mới tham gia"
          value={Number(stats.newInPeriod || 0).toLocaleString("vi-VN")}
          tone="sky"
        />
        <MetricTile
          label="Chờ xét duyệt"
          value={Number(stats.pendingApproval || 0).toLocaleString("vi-VN")}
          tone="amber"
        />
        <MetricTile
          label="Hồ sơ không hoạt động"
          value={Number(stats.inactive || 0).toLocaleString("vi-VN")}
          tone="rose"
        />
      </div>
    </section>
  );
}
