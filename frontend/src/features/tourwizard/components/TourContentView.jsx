"use client";

import React, { useState } from "react";
import { Pencil, ChevronDown, ChevronUp, CheckCircle2, MapPin, Timer, Film, Clock, CalendarDays, Users, BookOpen, Lock, Sparkles, Globe, Mail } from "lucide-react";
import NoticeAccordion from "./NoticeAccordion";
import ItineraryView from "./ItineraryView";
import StopsOverviewMap, { stopLocation, googleMapsUrl } from "./stops/StopsOverviewMap";
import CheckpointMap from "./stops/CheckpointMap";
import { CheckpointDistanceNotice } from "./stops/StopActivitiesEditor";
import ExperienceQr from "./stops/ExperienceQr";
import VideoPreview from "./VideoPreview";
import { formatLocalDate } from "@/lib/money";
import { useGuestTypes } from "@/lib/guestTypes";

const money = (v) => (v == null ? "—" : `${Number(v).toLocaleString("vi-VN")} đ`);
/** Ngày `LocalDate` (YYYY-MM-DD) → "dd/MM/yyyy" — không lệch múi giờ. */
const fmtDate = (s) => formatLocalDate(s) || s;

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

const TYPE_BADGES = { TEXT: "Nhập chữ", IMAGE_CHOICE: "Chọn ảnh", ORDERING: "Xếp thứ tự", NUMBER: "Đoán số", MATCHING: "Nối cột" };

function QuestionView({ q, label, points }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">
          {label}
          {TYPE_BADGES[q?.type] && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-bold align-middle">{TYPE_BADGES[q.type]}</span>}
          : {q?.content || <i className="text-slate-400">chưa nhập</i>}
        </p>
        {points != null && <span className="shrink-0 text-[11px] font-bold text-slate-400">+{points} điểm</span>}
      </div>
      {q?.type === "TEXT" ? (
        <p className="px-2 py-1.5 rounded-md bg-slate-50 text-xs text-slate-600">
          Khách nhập câu trả lời bằng chữ.
          {q.referenceAnswer ? <> Đáp án đúng: <b className="text-slate-800">{q.referenceAnswer}</b></> : <span className="text-rose-600 font-semibold"> Chưa có đáp án đúng.</span>}
        </p>
      ) : q?.type === "NUMBER" ? (
        <p className="px-2 py-1.5 rounded-md bg-slate-50 text-xs text-slate-600">
          Thanh trượt {q.numberMin ?? "?"} – {q.numberMax ?? "?"} · Đáp án đúng: <b className="text-slate-800">{q.numberCorrect ?? "?"}</b>
          {q.numberTolerance ? <> (chấp nhận ±{q.numberTolerance})</> : null}
        </p>
      ) : q?.type === "ORDERING" ? (
        <ol className="space-y-1">
          {(q.answers || []).map((a, i) => (
            <li key={i} className="px-2 py-1 rounded-md bg-slate-50 text-xs text-slate-700">
              <b className="text-emerald-700">{i + 1}.</b> {a.content || "—"}
            </li>
          ))}
        </ol>
      ) : q?.type === "MATCHING" ? (
        <ol className="space-y-1">
          {(q.answers || []).map((a, i) => (
            <li key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-slate-50 text-xs text-slate-700">
              <b className="text-emerald-700 shrink-0">{i + 1}.</b>
              {a.imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={a.imageUrl} alt={a.content || `Cột A ${i + 1}`} className="w-9 h-9 rounded object-cover shrink-0 border border-slate-200" />
              )}
              <span className="flex-1 min-w-0">{a.content || (a.imageUrl ? "[Ảnh]" : "—")}</span>
              <span className="text-slate-400 shrink-0">↔</span>
              <span className="flex-1 min-w-0 font-semibold text-slate-800">{a.matchText || "—"}</span>
            </li>
          ))}
        </ol>
      ) : q?.type === "IMAGE_CHOICE" ? (
        <ul className="grid grid-cols-4 gap-1.5">
          {(q.answers || []).map((a, i) => (
            <li key={i} className={`rounded-md overflow-hidden border-2 ${a.correct ? "border-emerald-500" : "border-transparent"}`}>
              {a.imageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={a.imageUrl} alt={a.content || `Ảnh ${i + 1}`} className="w-full aspect-[4/3] object-cover" />
                : <div className="w-full aspect-[4/3] bg-slate-100" />}
              <p className="px-1 py-0.5 text-[10px] text-slate-600 truncate">{String.fromCharCode(65 + i)}. {a.content || ""}</p>
            </li>
          ))}
        </ul>
      ) : (
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {(q?.answers || []).map((a, i) => (
          <li key={i} className={`px-2 py-1 rounded-md text-xs flex items-center gap-1.5 ${a.correct ? "bg-emerald-50 text-emerald-800 font-bold" : "bg-slate-50 text-slate-600"}`}>
            {a.correct && <CheckCircle2 size={12} />} {String.fromCharCode(65 + i)}. {a.content || "—"}
          </li>
        ))}
      </ul>
      )}
      {q?.explanation && (
        <p className="px-2 py-1.5 rounded-md bg-amber-50 text-xs text-amber-900">
          <b>Giải thích:</b> {q.explanation}
        </p>
      )}
    </div>
  );
}

/**
 * "Câu chuyện (mở sau check-in)" — thẻ 2 cột theo bố cục chữ Z: cột trái nền tối (nhãn, khoá, số chữ)
 * kéo mắt vào trước, cột phải là nội dung + ảnh + cổ vật. Điện thoại: cột tối thành dải đầu thẻ.
 */
function StoryCard({ stop: s, panel = true }) {
  const words = (s.culturalContent || "").trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className={`overflow-hidden rounded-xl border ${panel ? "border-slate-800/10 sm:grid sm:grid-cols-[168px_minmax(0,1fr)]" : "border-slate-200"}`}>
      {panel && <div className="flex items-center gap-3 bg-slate-900 px-4 py-3 text-white sm:flex-col sm:items-start sm:justify-between sm:py-4">
        <div className="flex items-center gap-2.5 sm:flex-col sm:items-start sm:gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-amber-300"><BookOpen size={18} /></span>
          <div>
            <p className="text-sm font-bold leading-tight">Câu chuyện</p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-300"><Lock size={11} />Mở sau khi khách check-in</p>
          </div>
        </div>
        <p className="ml-auto shrink-0 whitespace-nowrap text-[11px] font-semibold tabular-nums text-slate-400 sm:ml-0">{words.toLocaleString("vi-VN")} chữ</p>
      </div>}
      <div className="min-w-0 bg-white p-4">
        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{s.culturalContent || <i className="text-slate-400">Chưa nhập</i>}</p>
        {s.culturalImages?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {s.culturalImages.map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt="" className="h-14 w-20 rounded-lg object-cover" />
            ))}
          </div>
        )}
        {s.artifacts?.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Cổ vật</p>
            {s.artifacts.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs text-slate-700">
                {a.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
                )}
                <span><b>{a.name}</b> — {a.shortDescription}</span>
                {a.videoUrl && (
                  <a href={a.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-bold text-emerald-700"><Film size={11} />Video</a>
                )}
              </div>
            ))}
          </div>
        )}
        {s.thenNow?.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Ảnh xưa và nay</p>
            {s.thenNow.map((t) => (
              <div key={t.id} className="flex items-start gap-2 text-xs text-slate-700">
                {[t.thenImageUrl, t.nowImageUrl].map((u, k) => (u
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img key={k} src={u} alt={k === 0 ? "Ảnh xưa" : "Ảnh nay"} className="h-14 w-20 rounded-lg object-cover" />
                  : <div key={k} className="h-14 w-20 rounded-lg bg-slate-100" />))}
                <span>
                  <b>{t.thenLabel || "?"} → nay</b>{t.caption ? ` — ${t.caption}` : ""}
                  <br />
                  <span className={t.credit ? "text-slate-500" : "text-rose-600 font-semibold"}>
                    Nguồn: {t.credit || "chưa ghi nguồn"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Nội dung tour chỉ đọc.
 * - onEdit(step): hiện nút "Sửa" mỗi mục (bước 5 của đối tác).
 * - Block({ anchor, label, children }): bọc từng khối (Moderator gắn cờ). anchor = { step, stopId, field }.
 * - collapsibleStops: điểm đến thu gọn, có nút "Xem chi tiết".
 * - storyPanel: hiện cột tối "Câu chuyện · Mở sau khi khách check-in" (Moderator tắt — chỉ cần đọc nội dung).
 */
export default function TourContentView({ tour, onEdit, Block = DefaultBlock, collapsibleStops = false, showSchedule = true, storyPanel = true }) {
  const [openStops, setOpenStops] = useState({});
  const rp = tour.rewardPoints || {};
  const guestTypes = useGuestTypes();
  const slotTypes = (tour.prices || []).filter((p) => p.countsTowardSlot).map((p) => p.label);

  return (
    <div className="space-y-4">
      <Section title="1. Tour" step="BASIC_INFO" onEdit={onEdit}>
        <Block anchor={{ step: "BASIC_INFO", field: "title" }} label="Tên, hình thức, khu vực, chủ đề">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-lg font-bold text-slate-900">{tour.title}</h4>
            {tour.visibility === "SPECIFIC_USER" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-xs font-bold text-teal-800">
                <Lock size={12} className="text-teal-600" /> Tour riêng cho khách: {tour.specificUserEmail || "Chỉ định"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                <Globe size={11} /> Công khai
              </span>
            )}
          </div>
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
          {/* Ảnh bìa riêng + 5 ảnh tour (ảnh bìa trùng ảnh tour ở tour soạn theo quy tắc cũ vẫn hiện viền vàng) */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 border-2 border-amber-400">
              {tour.coverImageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={tour.coverImageUrl} alt="" className="w-full h-full object-cover" />
                : <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-slate-400">Chưa có ảnh bìa</span>}
              <span className="absolute top-1 left-1 px-1 rounded bg-amber-400 text-[10px] font-bold">Bìa</span>
            </div>
            {(tour.images || []).filter((url) => url !== tour.coverImageUrl).map((url, i) => (
              <div key={url} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 border-2 border-transparent">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <span className="absolute top-1 left-1 px-1 rounded bg-slate-900/70 text-[10px] font-bold text-white">{i + 1}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">1 ảnh bìa · {(tour.images || []).filter((url) => url !== tour.coverImageUrl).length}/5 ảnh tour</p>
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
              {guestTypes.map((g) => {
                const p = (tour.prices || []).find((x) => x.guestType === g.key);
                return (
                  <tr key={g.key} className="border-t border-slate-100">
                    <td className="py-1.5 font-semibold text-slate-800">{g.label}</td>
                    <td className="py-1.5 text-xs text-slate-500">{g.age}</td>
                    <td className="py-1.5 text-right font-bold text-slate-900">{p?.price != null && Number(p.price) === 0 ? "Miễn phí" : money(p?.price)}</td>
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
          Điểm thưởng {rp.snapshot ? "đã chốt" : "theo cấu hình hiện tại"}: {rp.quizPerQuestion ?? "—"} điểm / câu đố · {rp.perExperience ?? "—"} điểm / trải nghiệm · tối đa {rp.maxTotalPoints ?? 0} điểm
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
                  <span className="text-[11px] text-slate-500">{s.quiz?.length || 0} câu đố · {s.experiences?.length || 0} trải nghiệm · +{s.maxPoints} điểm</span>
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
                              Vị trí check-in: {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                              {s.checkInRadiusMeters ? ` · bán kính ${s.checkInRadiusMeters}m` : ""} · Xem trên Google Maps
                            </a>
                          ) : <i className="text-slate-400">Chưa chọn vị trí check-in</i>}
                        </p>
                      </div>
                    </div>
                    {s.latitude != null && s.longitude != null && (
                      <div className="mt-2">
                        <CheckpointMap latitude={s.latitude} longitude={s.longitude} radius={s.checkInRadiusMeters}
                          emptyLabel="Chưa chọn vị trí check-in" />
                      </div>
                    )}
                    {s.qrToken && (
                      <div className="mt-2">
                        <ExperienceQr token={s.qrToken} label={`check-in ${s.name || "diem-den"}`} compact title="Mã QR check-in trạm" />
                      </div>
                    )}
                  </Block>
                  <Block anchor={{ step: "STOPS", stopId: s.id, field: "culturalContent" }} label={`Điểm ${i + 1} – Nội dung văn hóa`}>
                    {s.videoUrl && (
                      <div className="mb-3">
                        <p className="text-xs font-bold text-slate-500 mb-1 inline-flex items-center gap-1">
                          <Film size={13} className="shrink-0" />Video câu chuyện văn hóa
                        </p>
                        <VideoPreview url={s.videoUrl} source={s.videoSource} />
                      </div>
                    )}
                    <StoryCard stop={s} panel={storyPanel} />
                  </Block>
                  {(s.quiz || []).length > 0 && <p className="text-xs font-bold text-slate-500">Câu đố văn hóa</p>}
                  {(s.quiz || []).map((q, qi) => (
                    <Block key={q.id || qi} anchor={{ step: "STOPS", stopId: s.id, field: `quiz[${qi}]` }} label={`Điểm ${i + 1} – Câu đố ${qi + 1}`}>
                      <QuestionView q={q} label={`Câu đố ${qi + 1}`} points={q.points} />
                    </Block>
                  ))}
                  {(s.experiences || []).length > 0 && <p className="text-xs font-bold text-slate-500">Trải nghiệm thực tế</p>}
                  {(s.experiences || []).map((e, ei) => (
                    <Block key={e.id || ei} anchor={{ step: "STOPS", stopId: s.id, field: `experiences[${ei}]` }} label={`Điểm ${i + 1} – Trải nghiệm ${ei + 1}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-slate-800">Trải nghiệm {ei + 1}: {e.activityName || "—"}</p>
                        <span className="text-[11px] font-bold text-slate-400 shrink-0">+{e.points ?? 0} điểm</span>
                      </div>
                      <p className="text-xs text-slate-500 flex flex-wrap gap-3 my-1">
                        <span className="inline-flex items-center gap-1"><MapPin size={11} />{e.checkpointLatitude ?? "—"}, {e.checkpointLongitude ?? "—"} · {e.radiusMeters}m</span>
                        <span className="inline-flex items-center gap-1"><Timer size={11} />{e.durationSeconds ? `${Math.floor(e.durationSeconds / 60)} phút ${e.durationSeconds % 60 ? `${e.durationSeconds % 60} giây` : ""}` : "—"}</span>
                      </p>
                      <div className="mb-2"><CheckpointDistanceNotice stop={s} experience={e} /></div>
                      <div className="mb-2">
                        <CheckpointMap latitude={e.checkpointLatitude} longitude={e.checkpointLongitude} radius={e.radiusMeters}
                          reference={{ latitude: s.latitude, longitude: s.longitude, radius: s.checkInRadiusMeters }} />
                      </div>
                      <div className="mb-2"><ExperienceQr token={e.qrToken} label={e.activityName} compact /></div>
                      <QuestionView q={e.question} label="Câu hỏi sau trải nghiệm" />
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
          <Block anchor={{ step: "SCHEDULE", field: "departureInfo" }} label="Thông tin khởi hành">
            <dl className="grid gap-2 text-sm sm:grid-cols-[150px_minmax(0,1fr)]">
              {[["Giờ khởi hành", tour.departureTime], ["Địa điểm tập trung", tour.meetingPoint], ["Giờ đón và điểm đón", tour.pickupInfo]].map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt className="text-xs font-bold text-slate-500">{k}</dt>
                  <dd className="text-slate-800 whitespace-pre-line">{v || <i className="text-slate-400">Chưa nhập</i>}</dd>
                </React.Fragment>
              ))}
            </dl>
          </Block>
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
