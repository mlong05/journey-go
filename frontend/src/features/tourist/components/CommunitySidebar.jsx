"use client";
/* eslint-disable @next/next/no-img-element -- ảnh bìa tour đến từ nhiều nguồn (Cloudinary, Wikimedia) */

import { PenLine, TrendingUp, ShieldCheck, Camera, Heart, Ban, Sparkles } from "lucide-react";
import { getTourPreview } from "../services/touristService";
import { Avatar } from "./CommunityUI";
import { useT } from "@/i18n";

/** Thẻ "Chia sẻ chuyến đi của bạn" — bấm vào mở hộp viết bài. */
export function ShareCard({ user, onCompose }) {
  const t = useT();
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <Avatar name={user?.fullName || t("community.you")} url={user?.avatarUrl} size={40} />
        <button type="button" onClick={onCompose}
          className="flex-1 cursor-pointer rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-sm text-slate-500 transition hover:border-teal-300 hover:bg-white">
          {t("community.whereDidYouGo")}
        </button>
      </div>
      <ul className="mt-3 space-y-1.5 text-xs text-slate-500">
        <li className="flex items-center gap-2"><Sparkles size={13} className="shrink-0 text-amber-500" />{t("community.tipMoment")}</li>
        <li className="flex items-center gap-2"><Camera size={13} className="shrink-0 text-teal-600" />{t("community.tipPhoto")}</li>
        <li className="flex items-center gap-2"><PenLine size={13} className="shrink-0 text-orange-500" />{t("community.tipAdvice")}</li>
      </ul>
    </section>
  );
}

/** "Tour được nhắc nhiều" — đếm từ các bài đang tải; bấm để lọc bảng tin theo tour. */
export function TopToursCard({ tours, activeTourId, onPick }) {
  const tr = useT();
  if (!tours.length) return null;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><TrendingUp size={16} className="text-orange-600" />{tr("community.topTours")}</h2>
      <ul className="mt-3 space-y-1">
        {tours.map((t, i) => {
          const cover = getTourPreview(t.tourId)?.coverImageUrl;
          const on = String(activeTourId) === String(t.tourId);
          return (
            <li key={t.tourId}>
              <button type="button" onClick={() => onPick(on ? "" : String(t.tourId))} aria-pressed={on}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl p-2 text-left transition ${on ? "bg-teal-50 ring-1 ring-teal-200" : "hover:bg-slate-50"}`}>
                <span className="relative shrink-0">
                  {cover ? <img src={cover} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <span className="block h-12 w-12 rounded-xl bg-slate-100" />}
                  <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[10px] font-bold text-white ring-2 ring-white">{i + 1}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-bold leading-snug text-slate-800">{t.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{tr("community.postCount", { count: t.count })}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Quy tắc cộng đồng ngắn gọn. */
export function GuidelinesCard() {
  const t = useT();
  return (
    <section className="rounded-3xl border border-slate-200 bg-gradient-to-b from-teal-50/70 to-white p-4">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><ShieldCheck size={16} className="text-teal-700" />{t("community.guidelines")}</h2>
      <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
        <li className="flex gap-2"><Camera size={14} className="mt-px shrink-0 text-teal-600" />{t("community.ruleRealPhotos")}</li>
        <li className="flex gap-2"><Heart size={14} className="mt-px shrink-0 text-rose-500" />{t("community.ruleRespect")}</li>
        <li className="flex gap-2"><Ban size={14} className="mt-px shrink-0 text-slate-500" />{t("community.ruleNoAds")}</li>
      </ul>
      <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-[11px] text-slate-500 ring-1 ring-slate-100">{t("community.moderated")}</p>
    </section>
  );
}
