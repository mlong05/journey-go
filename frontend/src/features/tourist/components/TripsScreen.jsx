"use client";
/* eslint-disable @next/next/no-img-element -- ảnh bìa tour đến từ nhiều nguồn (Cloudinary, Wikimedia) */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays, Users, Loader2, AlertTriangle, ChevronRight, Compass, Undo2, RotateCcw, UserRoundPlus,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import AccountLayout from "./AccountLayout";
import TransitionLink from "./TransitionLink";
import { touristService, getTourPreview } from "../services/touristService";
import {
  BOOKING_STATUS, REFUND_STATUS, REFUND_PENDING_STATUSES, longDate, todayIso, vnd,
} from "../utils";

/**
 * Phân loại đơn — MỖI ĐƠN CHỈ THUỘC ĐÚNG MỘT NHÓM.
 *
 * ⚠️ Thứ tự ưu tiên rất quan trọng (đơn chỉ bay tiền / đã bay tiền thì không
 * được hiện ở nhóm "đã mua"):
 *   1. Đang hoàn tiền — yêu cầu hoàn đang mở (tiền đang bay).
 *   2. Đã hoàn tiền   — đã có kết quả (đã hoàn / bị từ chối / lỗi / huỷ).
 *   3. Đã hoàn thành  — tour đã đi xong.
 *   4. Đã mua         — đã thanh toán, còn hiệu lực đi tour.
 *   5. Chờ thanh toán — còn trong hạn 10 phút.
 *   6. Đã hủy/Hết hạn — phần còn lại (CANCELLED / EXPIRED).
 *
 * @param {"processing"|"resolved"|"none"} refundState
 * @returns {string} khoá nhóm
 */
export function tripGroupOf(b, today, refundState) {
  if (refundState === "processing") return "refunding";
  if (refundState === "resolved") return "refunded";
  if (b.status === "COMPLETED") return "completed";
  // Đơn đã xác nhận nhưng ngày đi tour đã qua mà backend chưa kịp đánh dấu
  // COMPLETED ⇒ vẫn coi là "đã hoàn thành" cho đúng trải nghiệm người dùng.
  if (b.status === "CONFIRMED" && b.experienceDate && b.experienceDate < today) return "completed";
  if (b.status === "CONFIRMED") return "purchased";
  if (b.status === "PENDING_PAYMENT") return "pending";
  return "closed";
}

/** Danh sách tab "Chuyến đi của tôi". */
export const TRIP_TABS = [
  ["all", "Tất cả"],
  ["purchased", "Đã mua"],
  ["pending", "Chờ thanh toán"],
  ["completed", "Đã hoàn thành"],
  ["refunding", "Đang hoàn tiền"],
  ["refunded", "Đã hoàn tiền"],
  ["closed", "Đã hủy / Hết hạn"],
];
const EMPTY = {
  upcoming: "Chưa có chuyến nào sắp đi.",
  pending: "Không có đơn nào chờ thanh toán.",
  done: "Bạn chưa hoàn thành chuyến đi nào.",
  closed: "Không có đơn đã hủy hoặc hết hạn.",
};

/** Ảnh bìa tour (lấy từ danh sách tour công khai); không có ảnh thì hiện ô ngày. */
function Thumb({ booking }) {
  const cover = getTourPreview(booking.tourId)?.coverImageUrl;
  if (cover) return <img src={cover} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover sm:h-[88px] sm:w-32" />;
  return (
    <div className="grid h-20 w-24 shrink-0 place-items-center rounded-xl bg-teal-50 text-center text-teal-800 sm:h-[88px] sm:w-32">
      <span>
        <span className="block text-2xl font-extrabold leading-none tabular-nums">{booking.experienceDate?.slice(8, 10)}</span>
        <span className="text-xs font-semibold">Tháng {Number(booking.experienceDate?.slice(5, 7))}</span>
      </span>
    </div>
  );
}


/**
 * Trạng thái yêu cầu hoàn tiền rút gọn cho một đơn.
 *
 * @param {"processing"|"resolved"|"none"} kind
 *   • "processing" — đã gửi, chưa có kết quả cuối (chưa nên đặt lại tour).
 *   • "resolved"   — đã có kết quả (đã hoàn / bị từ chối / lỗi / huỷ) ⇒ có thể đặt lại.
 *   • "none"       — chưa có yêu cầu hoàn tiền nào.
 */
export function refundStateOf(latest) {
  if (!latest) return "none";
  if (REFUND_PENDING_STATUSES.includes(latest.status)) return "processing";
  if (["REFUNDED", "REJECTED", "FAILED", "CANCELLED"].includes(latest.status)) return "resolved";
  return "none";
}

/**
 * Yêu cầu hoàn tiền MỚI NHẤT của một đơn (nhiều đơn có thể có nhiều yêu cầu).
 */
export function latestRefundOf(bookingId, refundByBooking) {
  const list = refundByBooking.get(bookingId);
  if (!list?.length) return null;
  return [...list].sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0];
}

/**
 * Nhãn trạng thái hoàn tiền gắn với đơn — lấy từ danh sách yêu cầu hoàn tiền của tôi
 * (nhiều đơn có thể có nhiều yêu cầu ⇒ lấy yêu cầu MỚI NHẤT).
 */
function refundBadgeFor(bookingId, refundByBooking) {
  const latest = latestRefundOf(bookingId, refundByBooking);
  if (!latest) return null;
  const st = REFUND_STATUS[latest.status];
  if (!st) return null;
  return { label: st.label, cls: st.cls, status: latest.status };
}

function TripsList() {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [guestIds, setGuestIds] = useState(() => new Set());
  const [refundByBooking, setRefundByBooking] = useState(new Map());
  const [tab, setTab] = useState(null);

  useEffect(() => {
    let alive = true;
    // ⚠️ `/bookings/accessible` = đơn tôi đặt + đơn tôi được MỜI tham gia (hành khách
    // được mời). `/bookings/my` chỉ có đơn tôi đặt ⇒ du khách được mời sẽ không
    // thấy chuyến đi của mình trên web.
    // Tải song song danh sách tour công khai để có ảnh bìa (lỗi thì vẫn hiện đơn, không ảnh).
    Promise.all([
      touristService.myBookings(),
      touristService.accessibleBookings().catch(() => []),
      touristService.publishedTours().catch(() => null),
    ]).then(([mine, accessible]) => {
      if (!alive) return;
      const mineIds = new Set(mine.map((b) => String(b.id)));
      const invited = accessible.filter((b) => !mineIds.has(String(b.id)));
      setGuestIds(new Set(invited.map((b) => String(b.id))));
      // Gộp: đơn tôi đặt + đơn được mời, không trùng lặp, sắp xếp mới nhất trước.
      const merged = [...mine, ...invited].sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      setState({ loading: false, items: merged, error: "" });
    }).catch((err) => {
      if (!alive) return;
      setState({ loading: false, items: [], error: err?.message || "Không tải được chuyến đi." });
    });
    return () => { alive = false; };
  }, []);

  // Nạp yêu cầu hoàn tiền để gắn nhãn trạng thái lên từng đơn (không chặn render).
  useEffect(() => {
    let alive = true;
    touristService.myRefunds()
      .then((refunds) => {
        if (!alive) return;
        const map = new Map();
        refunds.forEach((r) => {
          if (!r.bookingId) return;
          const list = map.get(r.bookingId) || [];
          list.push(r);
          map.set(r.bookingId, list);
        });
        setRefundByBooking(map);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const today = todayIso();

  /**
   * Nhóm của từng đơn — tính 1 lần rồi dùng lại cho cả đếm tab lẫi lọc.
   * ⚠️ Phụ thuộc `refundByBooking` nên phải tính SAU khi tải xong yêu cầu hoàn.
   */
  const groupOf = useMemo(() => {
    const map = new Map();
    state.items.forEach((b) => {
      const rs = refundStateOf(latestRefundOf(b.id, refundByBooking));
      map.set(String(b.id), tripGroupOf(b, today, rs));
    });
    return map;
  }, [state.items, refundByBooking, today]);

  const groups = useMemo(() => {
    const g = {};
    TRIP_TABS.forEach(([k]) => { g[k] = []; });
    state.items.forEach((b) => {
      const key = groupOf.get(String(b.id));
      if (g[key]) g[key].push(b);
      // "Tất cả" = toàn bộ đơn (kể cả đơn không rơi vào nhóm nào).
      g.all.push(b);
    });
    return g;
  }, [state.items, groupOf]);

  // Mặc định mở tab "Tất cả" (không tự nhảy sang nhóm con — người dùng tự chọn).
  const active = tab || "all";
  // Sắp xếp: nhóm "chưa đi" thì ngày tăng dần (sắp đi trước), nhóm đã đóng thì giảm dần.
  const ascending = active === "all" || active === "purchased" || active === "pending";
  const list = [...(groups[active] || [])].sort((a, b) =>
    ascending
      ? String(a.experienceDate || "").localeCompare(String(b.experienceDate || ""))
      : String(b.experienceDate || "").localeCompare(String(a.experienceDate || "")));

  if (state.loading) {
    return <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="jg-shimmer h-[112px] rounded-2xl" />)}</div>;
  }
  if (state.error) {
    return <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"><AlertTriangle size={16} />{state.error}</p>;
  }
  if (!state.items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Compass size={30} className="mx-auto text-teal-600" />
        <p className="mt-2 font-bold text-slate-800">Bạn chưa đặt tour nào</p>
        <p className="mt-1 text-sm text-slate-500">Khám phá các tour trong ngày do người địa phương dẫn.</p>
        <Link href={ROUTES.TOURS} className="mt-4 inline-flex rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700 active:scale-[0.97]">Tìm tour</Link>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mt-6 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible" role="tablist" aria-label="Lọc chuyến đi">
        {TRIP_TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={active === k} onClick={() => setTab(k)}
            className={`shrink-0 cursor-pointer whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-colors ${active === k ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
            {label} <span className={active === k ? "text-white/70" : "text-slate-400"}>{groups[k]?.length || 0}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3" role="tabpanel">
        {list.length ? list.map((b) => {
          const st = BOOKING_STATUS[b.status] || BOOKING_STATUS.CANCELLED;
          const refund = refundBadgeFor(b.id, refundByBooking);
          const refundState = refundStateOf(latestRefundOf(b.id, refundByBooking));
          const isGuest = guestIds.has(String(b.id));
          const closed = b.status === "CANCELLED" || b.status === "EXPIRED";
          // ⚠️ "Đặt lại tour" chỉ hiện khi đơn ĐÃ xử lý xong hoàn tiền (tránh mua
          // trùng lúc tiền hoàn còn bay) hoặc đơn đã hủy/hết hạn.
          // Hành khách được mời không đặt lại được (đơn không thuộc họ).
          const canRebook = !isGuest && (refundState === "resolved" || (closed && refundState === "none"));
          return (
            <div key={b.id} className="rounded-2xl border border-slate-200 bg-white">
              <TransitionLink href={ROUTES.TRIP_DETAIL(b.id)} type="forward"
                className="flex items-center gap-4 p-4 hover:bg-teal-50/40">
                <Thumb booking={b} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                    {refund && (
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${refund.cls}`}>
                        <Undo2 size={11} />{refund.label}
                      </span>
                    )}
                    {isGuest && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                        <UserRoundPlus size={11} />Bạn được mời
                      </span>
                    )}
                    <span className="text-xs text-slate-400">Mã {b.bookingCode}</span>
                  </div>
                  <p className="mt-1 truncate font-bold text-slate-900">{b.tourTitle}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-[13px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><CalendarDays size={13} />{longDate(b.experienceDate)}</span>
                    <span className="inline-flex items-center gap-1"><Users size={13} />{b.activePassengerCount || b.passengerCount} khách</span>
                    <span className="font-semibold tabular-nums text-slate-700">{vnd(b.totalAmount)}</span>
                  </p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-slate-300" />
              </TransitionLink>

              {/* Cảnh báo: đã ghi nhận thanh toán nhưng đơn đã hủy/hết hạn ⇒ cần hỗ trợ hoàn tiền. */}
              {closed && b.paidAt && refundState === "none" && !isGuest && (
                <p className="mx-4 mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-800">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  Khoản tiền đã được ghi nhận nhưng chỗ đã được trả lại. Mở chi tiết đơn để gửi yêu cầu hoàn tiền.
                </p>
              )}

              {canRebook && b.tourId && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <TransitionLink
                    href={ROUTES.TOUR_DETAIL(b.tourId)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-2 text-xs font-bold text-teal-800 transition-colors hover:bg-teal-50"
                  >
                    <RotateCcw size={14} />Đặt lại tour
                  </TransitionLink>
                </div>
              )}
            </div>
          );
        }) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{EMPTY[active]}</p>
        )}
      </div>
    </div>
  );
}

/** Trang /trips — đơn đặt tour của du khách. */
export default function TripsScreen() {
  return (
    <AccountLayout title="Chuyến đi của tôi" wide>
      <TripsList />
    </AccountLayout>
  );
}
