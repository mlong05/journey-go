"use client";

import React from "react";
import {
  Clock, MapPin, Lock, Star, Users, CheckCircle2, Gift, ChevronLeft, Heart, Share2, Signal, Wifi, BatteryFull, Smartphone,
} from "lucide-react";
import { durationText } from "@/features/tourwizard/components/TourContentView";
import NoticeAccordion from "@/features/tourwizard/components/NoticeAccordion";
import ItineraryView from "@/features/tourwizard/components/ItineraryView";

const HIDE_SCROLLBAR = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/**
 * Xem trước NỘI DUNG trang tour phía khách (không có giá / nút đặt — kiểm duyệt viên chỉ duyệt nội dung),
 * đặt trong khung điện thoại vừa khít vùng xem trước. Nội dung app cuộn bên trong khung.
 */
export default function CustomerPreview({ tour }) {
  const firstSentence = (tour.description || "").split(/(?<=[.!?])\s/)[0];
  const stops = tour.stops || [];
  const images = tour.images || [];

  return (
    <div className="flex flex-col items-center gap-2 pb-2 xl:h-full">
      <p className="shrink-0 text-[11px] text-slate-500 inline-flex items-center gap-1">
        <Smartphone size={12} /> Mô phỏng trang tour trên ứng dụng của khách
      </p>

      {/* Khung điện thoại.
          xl: cao = phần còn lại của cột (flex-1), rộng tự suy ra theo tỉ lệ 9:19.5 → luôn nằm trọn trong khung.
          Màn hình nhỏ hơn: rộng tối đa 340px, cao theo tỉ lệ.
          overflow-hidden để nội dung bên trong không kéo giãn bề ngang khung. */}
      <div className="relative w-full max-w-[340px] xl:w-auto xl:max-w-full xl:flex-1 xl:min-h-0 xl:max-h-[820px] aspect-[9/19.5] overflow-hidden rounded-[2.4rem] bg-slate-900 p-[9px] shadow-[0_20px_50px_-15px_rgba(15,23,42,0.45)] ring-1 ring-slate-700">
        {/* Màn hình */}
        <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-white flex flex-col">
          {/* Thanh trạng thái + tai thỏ */}
          <div className="relative shrink-0 h-8 px-5 flex items-center justify-between text-[10px] font-bold text-slate-900 bg-white z-20">
            <span className="tabular-nums">9:41</span>
            <span className="absolute left-1/2 top-1.5 -translate-x-1/2 h-[18px] w-24 rounded-full bg-slate-900" aria-hidden />
            <span className="inline-flex items-center gap-1"><Signal size={11} /><Wifi size={11} /><BatteryFull size={13} /></span>
          </div>

          {/* Nội dung app — cuộn trong khung */}
          <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${HIDE_SCROLLBAR}`}>
            {/* Ảnh bìa + nút điều hướng */}
            <div className="relative aspect-[2/1] bg-slate-200">
              {tour.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tour.coverImageUrl} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-x-0 top-0 p-3 flex justify-between">
                <span className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-slate-700 shadow-sm"><ChevronLeft size={16} /></span>
                <span className="flex gap-1.5">
                  <span className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-slate-700 shadow-sm"><Share2 size={14} /></span>
                  <span className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-rose-500 shadow-sm"><Heart size={14} /></span>
                </span>
              </div>
              {images.length > 0 && (
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/70 text-white text-[10px] font-bold">1/{images.length}</span>
              )}
            </div>

            <div className="px-4 pt-3.5 pb-8 space-y-3.5">
              {/* Tiêu đề */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide truncate">
                  {[tour.theme?.name, tour.region?.name].filter(Boolean).join(" · ")}
                </p>
                <h2 className="text-[17px] font-bold leading-snug text-slate-900 break-words">{tour.title || "Tour chưa đặt tên"}</h2>
                {firstSentence && <p className="text-xs text-slate-600 leading-relaxed">{firstSentence}</p>}
              </div>

              {/* Thông tin nhanh.
                  Thời gian một dòng riêng, được xuống dòng → "Trong ngày · 4 giờ 30 phút" hay "3 ngày 2 đêm" luôn đọc hết.
                  3 thông tin ngắn còn lại: ô nhỏ, biểu tượng trên – chữ dưới. */}
              <div className="space-y-1.5">
                <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-emerald-50/70 border border-emerald-100">
                  <Clock size={14} className="text-emerald-600 shrink-0 mt-px" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-emerald-700 leading-none">Thời gian</p>
                    <p className="text-xs font-bold text-slate-800 leading-snug mt-0.5 break-words">{durationText(tour)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { Icon: MapPin, value: stops.length, label: "điểm đến" },
                    { Icon: Users, value: tour.maxGuestsPerSlot ?? "—", label: "khách / ngày" },
                    { Icon: Gift, value: tour.rewardPoints?.maxTotalPoints ?? 0, label: "điểm thưởng" },
                  ].map(({ Icon, value, label }) => (
                    <div key={label} className="flex flex-col items-center text-center gap-0.5 px-1 py-1.5 rounded-lg bg-slate-50">
                      <Icon size={13} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-800 tabular-nums leading-none">{value}</span>
                      <span className="text-[10px] text-slate-500 leading-tight">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Điểm nổi bật */}
              {(tour.highlights || []).length > 0 && (
                <section className="space-y-1.5">
                  <h3 className="text-[13px] font-bold text-slate-900">Điểm nổi bật</h3>
                  <ul className="space-y-1">
                    {tour.highlights.map((h, i) => (
                      <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5"><Star size={12} className="text-amber-500 mt-0.5 shrink-0" />{h}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Ảnh — vuốt ngang */}
              {images.length > 0 && (
                <div className={`-mx-4 px-4 flex gap-1.5 overflow-x-auto ${HIDE_SCROLLBAR}`}>
                  {images.map((u) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={u} src={u} alt="" className="w-20 h-20 shrink-0 rounded-lg object-cover" />
                  ))}
                </div>
              )}

              {/* Lịch trình theo ngày (dạng chữ) */}
              <ItineraryView tour={tour} compact />

              {/* Điểm đến */}
              <section className="space-y-1.5">
                <h3 className="text-[13px] font-bold text-slate-900">Điểm đến</h3>
                <ol className="relative space-y-2 before:absolute before:left-[13px] before:top-3 before:bottom-3 before:w-px before:bg-emerald-200">
                  {stops.map((s, i) => (
                    <li key={s.id || i} className="relative flex gap-2.5">
                      <span className="relative z-10 w-7 h-7 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="min-w-0 flex-1 p-2 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-800 break-words">{s.name || "Điểm đến chưa đặt tên"}</p>
                        {s.shortDescription && <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{s.shortDescription}</p>}
                        <p className="text-[10px] text-slate-400 mt-1 inline-flex items-center gap-1">
                          <Lock size={9} />Mở câu chuyện khi check-in · {s.quiz?.length || 0} câu hỏi · {s.experiences?.length || 0} trải nghiệm
                        </p>
                      </div>
                    </li>
                  ))}
                  {stops.length === 0 && <li className="text-[11px] text-slate-400">Chưa có điểm đến.</li>}
                </ol>
              </section>

              {/* Những thông tin cần lưu ý — bấm từng mục để xổ nội dung */}
              <NoticeAccordion tour={tour} compact />

              {/* Chính sách hủy */}
              {tour.cancellationPolicy && (
                <section className="p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-600">
                  <p className="font-bold text-slate-700 mb-1 inline-flex items-center gap-1"><CheckCircle2 size={12} />Chính sách hủy</p>
                  <p className="whitespace-pre-line leading-relaxed">{tour.cancellationPolicy}</p>
                </section>
              )}
            </div>
          </div>

          {/* Thanh home */}
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-24 rounded-full bg-slate-900/80" aria-hidden />
        </div>
      </div>
    </div>
  );
}
