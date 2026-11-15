"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2, Sparkles, Ticket, Smartphone, TrendingUp, TrendingDown, Award, CheckCircle2, AlertTriangle,
} from "lucide-react";
import AccountLayout from "./AccountLayout";
import { touristService } from "../services/touristService";
import { dateTime, longDate, vnd } from "../utils";

const VOUCHER_STATUS = {
  AVAILABLE: { label: "Dùng được", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  USED: { label: "Đã dùng", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  EXPIRED: { label: "Hết hạn", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};
const discountLabel = (v) => (v.discountType === "PERCENTAGE" ? `Giảm ${Number(v.discountValue)}%` : `Giảm ${vnd(v.discountValue)}`);

/**
 * Trang /account/rewards — số dư điểm, lịch sử điểm, voucher của tôi,
 * bộ sưu tập huy hiệu và đổi voucher NGAY TRÊN WEB.
 */
export default function RewardsScreen() {
  const [data, setData] = useState({
    loading: true, points: null, history: [], mine: [], shop: [], badges: [], myBadges: [],
  });
  const [redeeming, setRedeeming] = useState(null);
  const [notice, setNotice] = useState({ ok: "", err: "" });

  const load = useCallback(() => {
    Promise.all([
      touristService.myPoints().catch(() => null),
      touristService.pointHistory().catch(() => []),
      touristService.myVouchers().catch(() => []),
      touristService.vouchers().catch(() => []),
      touristService.allBadges().catch(() => []),
      touristService.myBadges().catch(() => []),
    ]).then(([points, history, mine, shop, badges, myBadges]) => {
      setData({ loading: false, points, history, mine, shop, badges, myBadges });
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const { loading, points, history, mine, shop, badges, myBadges } = data;
  const balance = Number(points?.currentBalance ?? 0);
  /** Mã huy hiệu đã đạt — đối chiếu với danh mục để đánh dấu đã nhận. */
  const earnedCodes = new Set(myBadges.map((b) => b.badgeCode));

  const redeem = async (voucher) => {
    setRedeeming(voucher.id); setNotice({ ok: "", err: "" });
    try {
      const res = await touristService.redeemVoucher(voucher.id);
      setNotice({
        ok: `Đã đổi voucher "${voucher.title}". Mã: ${res?.userVoucherCode || "xem trong ví voucher"}`,
        err: "",
      });
      load();
    } catch (err) {
      setNotice({ ok: "", err: err?.message || "Không đổi được voucher." });
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <AccountLayout title="Điểm thưởng & voucher">
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-busy="true"><div className="jg-shimmer h-28 rounded-3xl" /><div className="jg-shimmer h-28 rounded-3xl" /><div className="jg-shimmer h-28 rounded-3xl" /></div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-[linear-gradient(150deg,#0b5d56,#0f766e)] p-5 text-white sm:col-span-1">
              <p className="flex items-center gap-1.5 text-sm text-teal-50/85"><Sparkles size={15} />Điểm khả dụng</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums">{balance.toLocaleString("vi-VN")}</p>
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

          <p className="flex items-start gap-2 rounded-2xl border border-teal-200 bg-teal-50 p-3.5 text-sm text-teal-900">
            <Smartphone size={17} className="mt-0.5 shrink-0" />
            Bạn có thể đổi điểm lấy voucher ngay tại đây. Điểm thưởng và huy hiệu được cộng khi trả lời quiz và hoàn thành hoạt động tại điểm dừng trong app JourneyGo.
          </p>

          {notice.ok && (
            <p role="status" className="flex items-start gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />{notice.ok}
            </p>
          )}
          {notice.err && (
            <p role="alert" className="flex items-start gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />{notice.err}
            </p>
          )}

          {/* ── Bộ sưu tập huy hiệu ── */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="my-badges">
            <h2 id="my-badges" className="flex items-center gap-2 font-extrabold text-slate-900">
              <Award size={17} className="text-teal-700" />Huy hiệu của tôi ({myBadges.length})
            </h2>
            {myBadges.length ? (
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {myBadges.map((b) => (
                  <li key={b.id} className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                    {b.badgeIconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.badgeIconUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                        <Award size={20} />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{b.badgeName}</p>
                      {b.badgeDescription && <p className="mt-0.5 text-xs text-slate-600">{b.badgeDescription}</p>}
                      <p className="mt-1 text-xs text-slate-400">Nhận lúc {dateTime(b.earnedAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Bạn chưa có huy hiệu nào. Đi tour và trả lời quiz trong app để nhận huy hiệu đầu tiên.
              </p>
            )}
          </section>

          {/* ── Danh mục huy hiệu ── */}
          {badges.length > 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="all-badges">
              <h2 id="all-badges" className="font-extrabold text-slate-900">Danh mục huy hiệu ({badges.length})</h2>
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {badges.map((b) => {
                  const earned = earnedCodes.has(b.code);
                  return (
                    <li key={b.id} className={`min-w-0 rounded-2xl border p-3.5 ${earned ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex items-center gap-2.5">
                        {b.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.iconUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                        ) : (
                          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${earned ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                            <Award size={18} />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{b.name}</p>
                          {b.bonusPoints > 0 && (
                            <p className="text-[11px] font-semibold text-amber-700">+{b.bonusPoints} điểm</p>
                          )}
                        </div>
                      </div>
                      {b.description && <p className="mt-2 text-xs leading-relaxed text-slate-600">{b.description}</p>}
                      {earned && (
                        <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 size={12} />Đã đạt
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="my-vouchers">
            <h2 id="my-vouchers" className="flex items-center gap-2 font-extrabold text-slate-900">
              <Ticket size={17} className="text-teal-700" />Voucher của tôi ({mine.length})
            </h2>
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
                      <p className="mt-1 text-xs text-slate-500">
                        {v.expiryDate ? `Hạn dùng ${longDate(v.expiryDate.slice(0, 10))}` : ""}
                        {v.pointsSpent ? ` · Đổi bằng ${v.pointsSpent} điểm` : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-2 text-sm text-slate-500">Bạn chưa có voucher nào.</p>}
          </section>

          {shop.length > 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="shop-vouchers">
              <h2 id="shop-vouchers" className="font-extrabold text-slate-900">Đổi voucher</h2>
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {shop.map((v) => {
                  const need = Number(v.pointsRequired || 0);
                  const can = balance >= need && v.active !== false && (v.remainingQuantity == null || v.remainingQuantity > 0);
                  return (
                    <li key={v.id} className="min-w-0 rounded-2xl bg-slate-50 p-3.5">
                      <p className="font-bold text-slate-900">{v.title}</p>
                      {v.description && <p className="mt-0.5 text-xs text-slate-600">{v.description}</p>}
                      <p className="mt-1 text-sm font-semibold text-orange-700">
                        {discountLabel(v)}{v.maxDiscountAmount ? ` (tối đa ${vnd(v.maxDiscountAmount)})` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {need.toLocaleString("vi-VN")} điểm
                        {v.minOrderAmount ? ` · đơn từ ${vnd(v.minOrderAmount)}` : ""}
                        {v.validDays ? ` · dùng trong ${v.validDays} ngày` : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => redeem(v)}
                        disabled={!can || redeeming === v.id}
                        className="mt-2.5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                      >
                        {redeeming === v.id && <Loader2 size={14} className="animate-spin" />}
                        {can ? "Đổi voucher" : balance < need ? `Cần thêm ${(need - balance).toLocaleString("vi-VN")} điểm` : "Không còn voucher"}
                      </button>
                    </li>
                  );
                })}
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
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${plus ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                        {plus ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-slate-800">{h.description || h.transactionType}</span>
                        <span className="text-xs text-slate-400">{dateTime(h.createdAt)}</span>
                      </span>
                      <span className={`shrink-0 font-bold tabular-nums ${plus ? "text-emerald-700" : "text-rose-600"}`}>
                        {plus ? "+" : ""}{h.amount}
                      </span>
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
