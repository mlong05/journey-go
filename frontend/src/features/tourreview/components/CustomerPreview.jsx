"use client";

import React from "react";
import { Clock, MapPin, Lock, Star, Users, CheckCircle2, Gift } from "lucide-react";
import { durationText } from "@/features/tourwizard/components/TourContentView";

const money = (v) => (v == null ? "—" : `${Number(v).toLocaleString("vi-VN")}đ`);

/** Xem trước trang tour phía khách (mô phỏng giao diện khách sẽ thấy khi tour được duyệt). */
export default function CustomerPreview({ tour }) {
  const adult = (tour.prices || []).find((p) => p.guestType === "ADULT");
  const firstSentence = (tour.description || "").split(/(?<=[.!?])\s/)[0];
  return (
    <div className="max-w-3xl mx-auto rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="relative aspect-[16/7] bg-slate-200">
        {tour.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tour.coverImageUrl} alt="" className="w-full h-full object-cover" />
        )}
        <span className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-white/95 text-[11px] font-bold text-slate-700">Xem trước phía khách</span>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-[11px] font-bold text-emerald-700 uppercase">{tour.theme?.name} · {tour.region?.name}</p>
          <h2 className="text-xl font-bold text-slate-900">{tour.title}</h2>
          <p className="text-sm text-slate-600 mt-1">{firstSentence}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1"><Clock size={13} />{durationText(tour)}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={13} />{(tour.stops || []).length} điểm đến</span>
            <span className="inline-flex items-center gap-1"><Users size={13} />Tối đa {tour.maxGuestsPerSlot ?? "—"} khách / ngày</span>
            <span className="inline-flex items-center gap-1"><Gift size={13} />Tối đa {tour.rewardPoints?.maxTotalPoints ?? 0} điểm thưởng</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <div>
            <p className="text-[11px] text-emerald-700 font-bold">Giá từ</p>
            <p className="text-xl font-bold text-emerald-900">{money(adult?.price)} <span className="text-xs font-semibold">/ người lớn</span></p>
          </div>
          <span className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold">Đặt tour</span>
        </div>

        {(tour.highlights || []).length > 0 && (
          <ul className="space-y-1">
            {tour.highlights.map((h, i) => (
              <li key={i} className="text-sm text-slate-700 flex items-start gap-1.5"><Star size={14} className="text-amber-500 mt-0.5 shrink-0" />{h}</li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-4 gap-1.5">
          {(tour.images || []).slice(0, 4).map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={u} alt="" className="aspect-square rounded-lg object-cover" />
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900">Hành trình</h3>
          {(tour.stops || []).map((s, i) => (
            <div key={s.id} className="flex gap-3 p-2.5 rounded-xl border border-slate-100">
              <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800">{s.name}</p>
                <p className="text-xs text-slate-500">{s.shortDescription}</p>
                <p className="text-[11px] text-slate-400 mt-1 inline-flex items-center gap-1"><Lock size={10} />Câu chuyện văn hóa mở khi check-in · {s.quiz?.length || 0} câu hỏi · {s.experiences?.length || 0} trải nghiệm</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600">
          <p className="font-bold text-slate-700 mb-1 inline-flex items-center gap-1"><CheckCircle2 size={13} />Chính sách hủy</p>
          <p className="whitespace-pre-line">{tour.cancellationPolicy}</p>
        </div>
      </div>
    </div>
  );
}
