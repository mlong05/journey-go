"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Ticket, Smartphone, TrendingUp, TrendingDown, Trophy, ArrowRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import AccountLayout from "./AccountLayout";
import { touristService } from "../services/touristService";
import { dateTime, longDate, vnd } from "../utils";

const VOUCHER_STATUS = {
  AVAILABLE: { label: "Dùng được", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  USED: { label: "Đã dùng", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  EXPIRED: { label: "Hết hạn", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};
const discountLabel = (v) => (v.discountType === "PERCENTAGE" ? `Giảm ${Number(v.discountValue)}%` : `Giảm ${vnd(v.discountValue)}`);

/** Trang /account/rewards — số dư điểm, lịch sử điểm, voucher của tôi, voucher có thể đổi (chỉ xem). */
export default function RewardsScreen() {
  const [data, setData] = useState({ loading: true, points: null, history: [], mine: [], shop: [] });
  useEffect(() => {
    Promise.all([
      touristService.myPoints().catch(() => null),
      touristService.pointHistory().catch(() => []),
      touristService.myVouchers().catch(() => []),
      touristService.vouchers().catch(() => []),
    ]).then(([points, history, mine, shop]) => setData({ loading: false, points, history, mine, shop }));
  }, []);
  const { loading, points, history, mine, shop } = data;

  return (
    <AccountLayout title="Điểm thưởng & voucher">
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-busy="true"><div className="jg-shimmer h-28 rounded-3xl" /><div className="jg-shimmer h-28 rounded-3xl" /><div className="jg-shimmer h-28 rounded-3xl" /></div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-[linear-gradient(150deg,#0b5d56,#0f766e)] p-5 text-white sm:col-span-1">
              <p className="flex items-center gap-1.5 text-sm text-teal-50/85"><Sparkles size={15} />Điểm khả dụng</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums">{(points?.currentBalance ?? 0).toLocaleString("vi-VN")}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Tổng điểm đã nhận</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{(points?.lifetimeEarned ?? 0).toLocaleString("vi-VN")}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Đã dùng đổi voucher</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{(points?.lifetimeSpent ?? 0).toLocaleString("vi-VN")}</p>
            </div>
          </div>
          <Link
            href={ROUTES.ACCOUNT_ACHIEVEMENTS}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,#fffbeb,#fef3c7)] p-4 text-amber-950 transition hover:border-amber-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-sm">
                <Trophy size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-amber-950">Sổ Thành tựu & Huy hiệu</p>
                <p className="truncate text-xs text-amber-800/85">Khám phá các cột mốc hành trình và nhận thưởng Journey Points</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-xs transition group-hover:bg-white">
              Mở ngay <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          <p className="flex items-start gap-2 rounded-2xl border border-teal-200 bg-teal-50 p-3.5 text-sm text-teal-900">
            <Smartphone size={17} className="mt-0.5 shrink-0" />Đổi điểm lấy voucher và xem huy hiệu trong app JourneyGo (mục Cá nhân). Trên web bạn xem được số điểm, lịch sử và voucher đang có.
          </p>

          <section className="rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="my-vouchers">
            <h2 id="my-vouchers" className="flex items-center gap-2 font-extrabold text-slate-900"><Ticket size={17} className="text-teal-700" />Voucher của tôi ({mine.length})</h2>
            {mine.length ? (
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {mine.map((v) => {
                  const st = VOUCHER_STATUS[v.status] || VOUCHER_STATUS.EXPIRED;
                  return (
                    <li key={v.id} className="min-w-0 rounded-2xl border border-dashed border-slate-300 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 font-bold text-slate-900">{v.voucherTitle}</p>
                        <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                      </div>
                      <p className="mt-1 break-all font-mono text-sm text-teal-800">{v.userVoucherCode}</p>
                      <p className="mt-1 text-xs text-slate-500">{v.expiryDate ? `Hạn dùng ${longDate(v.expiryDate.slice(0, 10))}` : ""}{v.pointsSpent ? ` · Đổi bằng ${v.pointsSpent} điểm` : ""}</p>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-2 text-sm text-slate-500">Bạn chưa có voucher nào.</p>}
          </section>

          {shop.length > 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="shop-vouchers">
              <h2 id="shop-vouchers" className="font-extrabold text-slate-900">Voucher có thể đổi trong app</h2>
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {shop.slice(0, 6).map((v) => (
                  <li key={v.id} className="min-w-0 rounded-2xl bg-slate-50 p-3.5">
                    <p className="font-bold text-slate-900">{v.title}</p>
                    <p className="text-sm text-orange-700">{discountLabel(v)}{v.maxDiscountAmount ? ` (tối đa ${vnd(v.maxDiscountAmount)})` : ""}</p>
                    <p className="mt-1 text-xs text-slate-500">{v.pointsRequired} điểm{v.minOrderAmount ? ` · đơn từ ${vnd(v.minOrderAmount)}` : ""}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="point-history">
            <h2 id="point-history" className="font-extrabold text-slate-900">Lịch sử điểm gần đây</h2>
            {history.length ? (
              <ul className="mt-3 divide-y divide-slate-100">
                {history.map((h) => {
                  const plus = Number(h.amount) >= 0;
                  return (
                    <li key={h.id} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${plus ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{plus ? <TrendingUp size={15} /> : <TrendingDown size={15} />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-slate-800">{h.description || h.transactionType}</span>
                        <span className="text-xs text-slate-400">{dateTime(h.createdAt)}</span>
                      </span>
                      <span className={`shrink-0 font-bold tabular-nums ${plus ? "text-emerald-700" : "text-rose-600"}`}>{plus ? "+" : ""}{h.amount}</span>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-2 text-sm text-slate-500">Chưa có giao dịch điểm. Đi tour và trả lời quiz trong app để nhận điểm.</p>}
          </section>
        </div>
      )}
    </AccountLayout>
  );
}
