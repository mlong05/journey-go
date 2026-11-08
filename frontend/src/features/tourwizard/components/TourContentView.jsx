"use client";

import React, { useState } from "react";
import { Pencil, ChevronDown, ChevronUp, CheckCircle2, MapPin, Timer, Film, Clock, CalendarDays, Users } from "lucide-react";
import { GUEST_TYPES } from "../constants";
import NoticeAccordion from "./NoticeAccordion";
import ItineraryView from "./ItineraryView";
import StopsOverviewMap, { stopLocation, stopExperiences, googleMapsUrl } from "./stops/StopsOverviewMap";
import CheckpointMap from "./stops/CheckpointMap";

const money = (v) => (v == null ? "—" : `${Number(v).toLocaleString("vi-VN")} đ`);
const fmtDate = (s) => { const [y, m, d] = (s || "").split("-"); return d ? `${d}/${m}/${y}` : s; };

export function durationText(tour) {
  if (tour.tourFormat === "MULTI_DAY") return `${tour.durationDays || "?"} ngày ${tour.durationNights ?? "?"} đêm`;
  const m = tour.durationMinutes;
  if (!m) return "Trong ngày (chưa nhập thời lượng)";
  const h = Math.floor(m / 60);
  return `Trong ngày · ${h ? `${h} giờ ` : ""}${m % 60 ? `${m % 60} phút` : ""}`.trim();
}

/** Khối mặc định — Moderator thay bằng khối có nút gắn cờ qua prop `Block`. */
function DefaultBlock({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

function Section({ title, step, onEdit, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <header className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {onEdit && (
          <button type="button" onClick={() => onEdit(step)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer">
            <Pencil size={12} /> Sửa
          </button>
        )}
      </header>
      <div className="p-4 space-y-3">{children}</div>
    </section>
  );
}

function QuestionView({ q, label, points }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">
          {label}
          {q?.type === "TEXT" && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-bold align-middle">Tự luận</span>}
          : {q?.content || <i className="text-slate-400">chưa nhập</i>}
        </p>
        {points != null && <span className="shrink-0 text-[11px] font-bold text-slate-400">+{points} điểm</span>}
      </div>
      {q?.type === "TEXT" ? (
        <p className="px-2 py-1.5 rounded-md bg-slate-50 text-xs text-slate-600">
          Khách nhập câu trả lời bằng chữ.
          {q.referenceAnswer ? <> Đáp án gợi ý: <b className="text-slate-800">{q.referenceAnswer}</b></> : " Không có đáp án gợi ý."}
        </p>
      ) : (
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {(q?.answers || []).map((a, i) => (
          <li key={i} className={`px-2 py-1 rounded-md text-xs flex items-center gap-1.5 ${a.correct ? "bg-emerald-50 text-emerald-800 font-bold" : "bg-slate-50 text-slate-600"}`}>
            {a.correct && <CheckCircle2 size={12} />} {String.fromCharCode(65 + i)}. {a.content || "—"}
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}

/**
 * Nội dung tour chỉ đọc.
 * - onEdit(step): hiện nút "Sửa" mỗi mục (bước 5 của đối tác).
 * - Block({ anchor, label, children }): bọc từng khối (Moderator gắn cờ). anchor = { step, stopId, field }.
 * - collapsibleStops: điểm đến thu gọn, có nút "Xem chi tiết".
 */
export default function TourContentView({ tour, onEdit, Block = DefaultBlock, collapsibleStops = false, showSchedule = true }) {
  const [openStops, setOpenStops] = useState({});
  const rp = tour.rewardPoints || {};
  const slotTypes = (tour.prices || []).filter((p) => p.countsTowardSlot).map((p) => p.label);

  return (
    <div className="space-y-4">
      <Section title="1. Tour" step="BASIC_INFO" onEdit={onEdit}>
        <Block anchor={{ step: "BASIC_INFO", field: "title" }} label="Tên, hình thức, khu vực, chủ đề">
          <h4 className="text-lg font-bold text-slate-900">{tour.title}</h4>
          <div className="flex flex-wrap gap-2 mt-1.5 text-xs">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1"><Clock size={12} />{durationText(tour)}</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">Khu vực: {tour.region?.name || "—"}</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">Chủ đề: {tour.theme?.name || "—"}</span>
          </div>
        </Block>
        <Block anchor={{ step: "BASIC_INFO", field: "description" }} label="Mô tả và điểm nổi bật">
          <p className="text-sm text-slate-700 whitespace-pre-line">{tour.description || <i className="text-slate-400">Chưa có mô tả</i>}</p>
          {tour.highlights?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {tour.highlights.map((h, i) => (
                <li key={i} className="text-sm text-slate-700 flex items-start gap-1.5"><CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />{h}</li>
              ))}
            </ul>
          )}
        </Block>
        <Block anchor={{ step: "BASIC_INFO", field: "notices" }} label="Những thông tin cần lưu ý">
          {/* Hiện đủ 4 mục (mục trống ghi "Chưa nhập") để người duyệt thấy mục nào còn thiếu */}
          <NoticeAccordion tour={tour} showEmpty />
        </Block>
        <Block anchor={{ step: "BASIC_INFO", field: "images" }} label="Hình ảnh">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {(tour.images || []).map((url) => (
              <div key={url} className={`relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 border-2 ${url === tour.coverImageUrl ? "border-amber-400" : "border-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                {url === tour.coverImageUrl && <span className="absolute top-1 left-1 px-1 rounded bg-amber-400 text-[10px] font-bold">Bìa</span>}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{(tour.images || []).length} ảnh</p>
        </Block>
      </Section>

      <Section title="2. Giá vé" step="PRICING" onEdit={onEdit}>
        <Block anchor={{ step: "PRICING", field: "prices" }} label="Bảng giá và số chỗ">
          <div className="flex flex-wrap gap-2 text-xs mb-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold inline-flex items-center gap-1"><Users size={12} />{tour.maxGuestsPerSlot ?? "—"} chỗ / slot</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">Tính slot: {slotTypes.join(", ") || "—"}</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {GUEST_TYPES.map((g) => {
                const p = (tour.prices || []).find((x) => x.guestType === g.key);
                return (
                  <tr key={g.key} className="border-t border-slate-100">
                    <td className="py-1.5 font-semibold text-slate-800">{g.label}</td>
                    <td className="py-1.5 text-xs text-slate-500">{g.age}</td>
                    <td className="py-1.5 text-right font-bold text-slate-900">{g.alwaysFree ? "Miễn phí" : money(p?.price)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Block>
        <Block anchor={{ step: "PRICING", field: "cancellationPolicy" }} label="Chính sách hủy">
          <p className="text-xs font-bold text-slate-500 mb-1">Chính sách hủy</p>
          <p className="text-sm text-slate-700 whitespace-pre-line">{tour.cancellationPolicy || <i className="text-slate-400">Chưa nhập</i>}</p>
        </Block>
      </Section>

      <Section title={`3. Điểm đến (${(tour.stops || []).length})`} step="STOPS" onEdit={onEdit}>
        <p className="text-[11px] text-slate-500">
          Điểm thưởng {rp.snapshot ? "đã chốt" : "theo cấu hình hiện tại"}: {rp.perTask ?? "—"} điểm / nhiệm vụ · tối đa {rp.maxTotalPoints ?? 0} điểm
        </p>
        <div>
          <p className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1"><MapPin size={12} />Bản đồ hành trình</p>
          <StopsOverviewMap stops={tour.stops || []} />
        </div>
        {(tour.stops || []).map((s, i) => {
          const open = !collapsibleStops || openStops[s.id];
          const loc = stopLocation(s);
          return (
            <div key={s.id} id={`stop-${s.id}`} className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2.5 bg-slate-50 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-800 truncate">{i + 1}. {s.name || "Chưa đặt tên"}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-500">{s.tasks?.length || 0} nhiệm vụ · {stopExperiences(s).length} trải nghiệm · +{s.maxPoints} điểm</span>
                  {collapsibleStops && (
                    <button type="button" onClick={() => setOpenStops((o) => ({ ...o, [s.id]: !o[s.id] }))}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 inline-flex items-center gap-1 cursor-pointer">
                      {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {open ? "Thu gọn" : "Xem chi tiết"}
                    </button>
                  )}
                </span>
              </div>
              {open && (
                <div className="p-3 space-y-3">
                  <Block anchor={{ step: "STOPS", stopId: s.id, field: "info" }} label={`Điểm ${i + 1} – Thông tin`}>
                    <div className="flex gap-3">
                      {s.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.imageUrl} alt="" className="w-28 h-20 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="space-y-1">
                        <p className="text-sm text-slate-700">{s.shortDescription}</p>
                        {s.guestNote && <p className="text-xs text-amber-800 bg-amber-50 px-2 py-1 rounded">Lưu ý: {s.guestNote}</p>}
                        <p className="text-xs text-slate-500 inline-flex items-center gap-1">
                          <MapPin size={11} className="shrink-0" />
                          {loc ? (
                            <a href={googleMapsUrl(loc.lat, loc.lng)} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 hover:underline">
                              {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)} · Xem trên Google Maps
                            </a>
                          ) : <i className="text-slate-400">Chưa có vị trí (chưa chọn checkpoint trải nghiệm)</i>}
                        </p>
                      </div>
                    </div>
                  </Block>
                  <Block anchor={{ step: "STOPS", stopId: s.id, field: "culturalContent" }} label={`Điểm ${i + 1} – Nội dung văn hóa`}>
                    {s.videoUrl && (
                      <a href={s.videoUrl} target="_blank" rel="noreferrer"
                        className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline break-all">
                        <Film size={13} className="shrink-0" />Video giới thiệu điểm đến
                      </a>
                    )}
                    <p className="text-xs font-bold text-slate-500 mb-1">Câu chuyện (mở sau check-in)</p>
                    <p className="text-sm text-slate-700 whitespace-pre-line">{s.culturalContent || <i className="text-slate-400">Chưa nhập</i>}</p>
                    {s.culturalImages?.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {s.culturalImages.map((u) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={u} src={u} alt="" className="w-16 h-12 rounded object-cover" />
                        ))}
                      </div>
                    )}
                    {s.artifacts?.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {s.artifacts.map((a) => (
                          <div key={a.id} className="flex items-center gap-2 text-xs text-slate-700">
                            {a.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={a.imageUrl} alt="" className="w-10 h-10 rounded object-cover" />
                            )}
                            <span><b>{a.name}</b> — {a.shortDescription}</span>
                            {a.videoUrl && (
                              <a href={a.videoUrl} target="_blank" rel="noreferrer" className="text-emerald-700 inline-flex items-center gap-0.5 font-bold"><Film size={11} />Video</a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Block>
                  {(s.tasks || []).length === 0 && <p className="text-xs italic text-slate-400">Chưa có nhiệm vụ.</p>}
                  {(s.tasks || []).map((t, ti) => (
                    <Block key={t.id || ti} anchor={{ step: "STOPS", stopId: s.id, field: `tasks[${ti}]` }} label={`Điểm ${i + 1} – Nhiệm vụ ${ti + 1}`}>
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-2.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-800">
                            Nhiệm vụ {ti + 1}: {t.title || <i className="text-slate-400 font-normal">chưa nhập tên</i>}
                          </p>
                          <span className="text-[11px] font-bold text-slate-400 shrink-0">+{t.points ?? 0} điểm</span>
                        </div>
                        {t.description && <p className="text-xs text-slate-600 whitespace-pre-line">{t.description}</p>}

                        {(t.quiz || []).map((q, qi) => (
                          <QuestionView key={q.id || qi} q={q} label={`Quiz câu ${qi + 1}`} />
                        ))}

                        {(t.experiences || []).map((e, ei) => (
                          <div key={e.id || ei} className="rounded-lg border border-slate-200 bg-white p-2.5">
                            <p className="text-sm font-bold text-slate-800">Trải nghiệm {ei + 1}: {e.activityName || "—"}</p>
                            <p className="text-xs text-slate-500 flex flex-wrap gap-3 my-1">
                              <span className="inline-flex items-center gap-1"><MapPin size={11} />{e.checkpointLatitude ?? "—"}, {e.checkpointLongitude ?? "—"} · {e.radiusMeters}m</span>
                              <span className="inline-flex items-center gap-1"><Timer size={11} />{e.durationSeconds ? `${Math.floor(e.durationSeconds / 60)} phút ${e.durationSeconds % 60 ? `${e.durationSeconds % 60} giây` : ""}` : "—"}</span>
                            </p>
                            <div className="mb-2"><CheckpointMap latitude={e.checkpointLatitude} longitude={e.checkpointLongitude} radius={e.radiusMeters} /></div>
                            <QuestionView q={e.question} label="Câu hỏi sau trải nghiệm" />
                          </div>
                        ))}
                      </div>
                    </Block>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Section>

      <Section title="4. Lịch trình" step="ITINERARY" onEdit={onEdit}>
        <Block anchor={{ step: "ITINERARY", field: "itinerary" }} label="Lịch trình">
          <ItineraryView tour={tour} title={null} showEmpty />
        </Block>
      </Section>

      {showSchedule && (
        <Section title="5. Lịch khởi hành" step="SCHEDULE" onEdit={onEdit}>
          <Block anchor={{ step: "SCHEDULE", field: "departureDates" }} label="Ngày khởi hành">
            <p className="text-xs text-slate-500 mb-2 inline-flex items-center gap-1"><CalendarDays size={12} />{(tour.departureDates || []).length} ngày mở bán</p>
            <div className="flex flex-wrap gap-1.5">
              {(tour.departureDates || []).map((d) => (
                <span key={d} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-semibold">{fmtDate(d)}</span>
              ))}
            </div>
          </Block>
        </Section>
      )}
    </div>
  );
}
