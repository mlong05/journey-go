"use client";
/* eslint-disable @next/next/no-img-element -- ảnh bìa tour đến từ nhiều nguồn (Cloudinary, Wikimedia) */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Users, AlertTriangle, ChevronRight, Compass } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import AccountLayout from "./AccountLayout";
import TransitionLink from "./TransitionLink";
import { touristService, getTourPreview } from "../services/touristService";
import { BOOKING_STATUS, longDate, todayIso, vnd } from "../utils";

const TABS = [
  ["upcoming", "Sắp đi", (b, t) => b.status === "CONFIRMED" && b.experienceDate >= t],
  ["pending", "Chờ thanh toán", (b) => b.status === "PENDING_PAYMENT"],
  ["done", "Đã đi", (b, t) => b.status === "COMPLETED" || (b.status === "CONFIRMED" && b.experienceDate < t)],
  ["closed", "Đã hủy / hết hạn", (b) => b.status === "CANCELLED" || b.status === "EXPIRED"],
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

function TripsList() {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [tab, setTab] = useState(null);

  useEffect(() => {
    // Tải song song danh sách tour công khai để có ảnh bìa (lỗi thì vẫn hiện đơn, không ảnh).
    Promise.all([touristService.myBookings(), touristService.publishedTours().catch(() => null)])
      .then(([items]) => setState({ loading: false, items, error: "" }))
      .catch((err) => setState({ loading: false, items: [], error: err?.message || "Không tải được chuyến đi." }));
  }, []);

  const today = todayIso();
  const groups = useMemo(() => Object.fromEntries(TABS.map(([k, , f]) => [k, state.items.filter((b) => f(b, today))])), [state.items, today]);
  // Mặc định mở tab đầu tiên có đơn.
  const active = tab || TABS.find(([k]) => groups[k]?.length)?.[0] || "upcoming";
  const list = [...(groups[active] || [])].sort((a, b) =>
    active === "upcoming" || active === "pending" ? a.experienceDate.localeCompare(b.experienceDate) : b.experienceDate.localeCompare(a.experienceDate));

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
      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap" role="tablist" aria-label="Lọc chuyến đi">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={active === k} onClick={() => setTab(k)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer ${active === k ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
            {label} <span className={active === k ? "text-white/70" : "text-slate-400"}>{groups[k]?.length || 0}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3" role="tabpanel">
        {list.length ? list.map((b) => {
          const st = BOOKING_STATUS[b.status] || BOOKING_STATUS.CANCELLED;
          return (
            <TransitionLink key={b.id} href={ROUTES.TRIP_DETAIL(b.id)} type="forward"
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-teal-300 sm:gap-4">
              <Thumb booking={b} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                  <span className="text-xs text-slate-400">Mã {b.bookingCode}</span>
                </div>
                <p className="mt-1 line-clamp-1 font-bold text-slate-900">{b.tourTitle}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-slate-500">
                  <span className="inline-flex items-center gap-1"><CalendarDays size={13} />{longDate(b.experienceDate)}</span>
                  <span className="inline-flex items-center gap-1"><Users size={13} />{b.activePassengerCount || b.passengerCount} khách</span>
                  <span className="font-semibold tabular-nums text-slate-700">{vnd(b.totalAmount)}</span>
                </p>
              </div>
              <ChevronRight size={18} className="hidden shrink-0 text-slate-300 sm:block" />
            </TransitionLink>
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
