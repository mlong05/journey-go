"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Users, Loader2, AlertTriangle, ChevronRight, Compass } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import AccountLayout from "./AccountLayout";
import { touristService } from "../services/touristService";
import { BOOKING_STATUS, longDate, todayIso, vnd } from "../utils";

const TABS = [
  ["upcoming", "Sắp đi", (b, t) => b.status === "CONFIRMED" && b.experienceDate >= t],
  ["pending", "Chờ thanh toán", (b) => b.status === "PENDING_PAYMENT"],
  ["done", "Đã đi", (b, t) => b.status === "COMPLETED" || (b.status === "CONFIRMED" && b.experienceDate < t)],
  ["closed", "Đã hủy / hết hạn", (b) => b.status === "CANCELLED" || b.status === "EXPIRED"],
];

function TripsList() {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [tab, setTab] = useState(null);

  useEffect(() => {
    touristService.myBookings()
      .then((items) => setState({ loading: false, items, error: "" }))
      .catch((err) => setState({ loading: false, items: [], error: err?.message || "Không tải được chuyến đi." }));
  }, []);

  const today = todayIso();
  const groups = useMemo(() => Object.fromEntries(TABS.map(([k, , f]) => [k, state.items.filter((b) => f(b, today))])), [state.items, today]);
  // Mặc định mở tab đầu tiên có đơn.
  const active = tab || TABS.find(([k]) => groups[k]?.length)?.[0] || "upcoming";
  const list = [...(groups[active] || [])].sort((a, b) =>
    active === "upcoming" || active === "pending" ? a.experienceDate.localeCompare(b.experienceDate) : b.experienceDate.localeCompare(a.experienceDate));

  return (
    <div className="min-w-0">
      <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900">Chuyến đi của tôi</h1>
      <p className="mt-1 text-sm text-slate-500">Ngày đi tour, đăng nhập app JourneyGo bằng cùng tài khoản để check-in tại từng điểm dừng.</p>

      <div className="mt-6 flex flex-wrap gap-1.5" role="tablist" aria-label="Lọc chuyến đi">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={active === k} onClick={() => setTab(k)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold cursor-pointer ${active === k ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
            {label} <span className={active === k ? "text-white/70" : "text-slate-400"}>{groups[k]?.length || 0}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3" role="tabpanel">
        {state.loading ? (
          <p className="flex justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Đang tải…</p>
        ) : state.error ? (
          <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"><AlertTriangle size={16} />{state.error}</p>
        ) : list.length ? list.map((b) => {
          const st = BOOKING_STATUS[b.status] || BOOKING_STATUS.CANCELLED;
          return (
            <Link key={b.id} href={ROUTES.TRIP_DETAIL(b.id)}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 hover:border-teal-300">
              <div className="hidden w-16 shrink-0 rounded-xl bg-teal-50 py-2 text-center text-teal-800 sm:block">
                <span className="block text-xl font-extrabold leading-none tabular-nums">{b.experienceDate?.slice(8, 10)}</span>
                <span className="text-xs font-semibold">Th {Number(b.experienceDate?.slice(5, 7))}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
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
            </Link>
          );
        }) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Compass size={30} className="mx-auto text-teal-600" />
            <p className="mt-2 font-bold text-slate-800">Chưa có chuyến đi nào ở mục này</p>
            <Link href={ROUTES.TOURS} className="mt-4 inline-flex rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700">Tìm tour</Link>
          </div>
        )}
      </div>
    </div>
  );
}

/** Trang /trips — đơn đặt tour của du khách. */
export default function TripsScreen() {
  return (
    <AccountLayout wide>
      <TripsList />
    </AccountLayout>
  );
}
