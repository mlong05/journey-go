"use client";

import React, { useState } from "react";
import {
  Pencil, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CheckCircle2, MapPin, Timer, Film, Clock,
  CalendarDays, Users, BookOpen, Lock, Globe, QrCode, HelpCircle, Compass, Map as MapIcon, Flag, Layers,
} from "lucide-react";
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

function Section({ id, index, title, subtitle, step, onEdit, rightSlot, children }) {
  return (
    <section id={id} className="rounded-2xl border border-slate-200 bg-white shadow-2xs scroll-mt-16 overflow-hidden">
      <header className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {index != null && (
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-slate-900 text-[11px] font-extrabold text-white">
              {index}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-900 truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rightSlot}
          {onEdit && (
            <button type="button" onClick={() => onEdit(step)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer">
              <Pencil size={12} /> Sửa
            </button>
          )}
        </div>
      </header>
      <div className="p-4 space-y-3">{children}</div>
    </section>
  );
}

/** Nhãn báo trạng thái Check-in QR cho Kiểm duyệt viên (ẩn ảnh mã QR của Đối tác). */
function ModeratorQrNotice({ hasQr, scope = "trạm" }) {
  if (!hasQr) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
        <QrCode size={12} className="shrink-0 text-slate-400" />
        Chưa bật Check-in QR {scope}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/80 px-2.5 py-1 text-[11px] font-semibold text-teal-800">
      <QrCode size={12} className="shrink-0 text-teal-600" />
      Có Check-in QR {scope} <span className="font-normal text-teal-700">(mã QR chỉ hiển thị ở trang Đối tác)</span>
    </span>
  );
}

const TYPE_BADGES = {
  TEXT: "Nhập chữ",
  IMAGE_CHOICE: "Chọn ảnh",
  ORDERING: "Xếp thứ tự",
  MATCHING: "Nối cột",
  NUMBER: "Đoán số",
};

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
        <p className="px-2.5 py-1.5 rounded-md bg-slate-50 text-xs text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
          <span>Khoảng trượt: <b>{q.numberMin ?? "—"} → {q.numberMax ?? "—"}</b></span>
          <span>Đáp án đúng: <b className="text-emerald-700">{q.numberCorrect ?? "—"}</b></span>
          <span>Sai số cho phép: <b>±{q.numberTolerance ?? 0}</b></span>
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
 * "Câu chuyện (mở sau check-in)" — thẻ 2 cột theo bố cục chữ Z cho Đối tác,
 * hoặc nội dung gọn trong phân khu "Câu chuyện văn hóa" cho Kiểm duyệt viên.
 */
function StoryCard({ stop: s, panel = true }) {
  const words = (s.culturalContent || "").trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className={`overflow-hidden rounded-xl ${panel ? "border border-slate-800/10 sm:grid sm:grid-cols-[168px_minmax(0,1fr)]" : ""}`}>
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
      <div className={`min-w-0 bg-white ${panel ? "p-4" : ""}`}>
        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{s.culturalContent || <i className="text-slate-400">Chưa nhập câu chuyện văn hóa</i>}</p>
        {s.culturalImages?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {s.culturalImages.map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt="" className="h-14 w-20 rounded-lg object-cover border border-slate-200" />
            ))}
          </div>
        )}
        {s.artifacts?.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Cổ vật ({s.artifacts.length})</p>
            {s.artifacts.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs text-slate-700">
                {a.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.imageUrl} alt="" className="h-10 w-10 rounded object-cover border border-slate-200" />
                )}
                <span><b>{a.name}</b> — {a.shortDescription}</span>
                {a.videoUrl && (
                  <a href={a.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-bold text-emerald-700"><Film size={11} />Video</a>
                )}
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
 * - collapsibleStops: điểm đến thu gọn, có nút "Xem chi tiết" (dùng cho Đối tác ở bước 5).
 * - moderationMode: bố cục phân tầng dành riêng cho Kiểm duyệt viên:
 *     • Chuyển Điểm đến theo Tab (①, ②, ③) + nút "Mở tất cả".
 *     • Phân cấp rõ Hồ sơ Điểm đến (cấp cha) → 3 nhóm con (Câu chuyện văn hóa · Câu đố · Trải nghiệm).
 *     • Ẩn hình Mã QR (chỉ dành cho Đối tác), thay bằng nhãn báo đã cấu hình Check-in QR.
 *     • Thu gọn bản đồ vệ tinh phụ của từng trạm/trải nghiệm thành nút mở nhanh.
 */
export default function TourContentView({
  tour,
  onEdit,
  Block = DefaultBlock,
  collapsibleStops = false,
  showSchedule = true,
  storyPanel = true,
  moderationMode = false,
  flaggedNotes = [],
  activeStopIdx: controlledStopIdx,
  onActiveStopIdxChange,
}) {
  const [openStops, setOpenStops] = useState({});
  const [internalStopIdx, setInternalStopIdx] = useState(0);
  const [showAllStops, setShowAllStops] = useState(false);
  const [openMaps, setOpenMaps] = useState({});

  const stops = tour.stops || [];
  const rawIdx = controlledStopIdx !== undefined ? controlledStopIdx : internalStopIdx;
  const currentStopIdx = stops.length > 0 ? Math.min(Math.max(rawIdx, 0), stops.length - 1) : 0;
  const selectStop = (idx) => {
    if (onActiveStopIdxChange) onActiveStopIdxChange(idx);
    else setInternalStopIdx(idx);
  };
  const toggleMap = (key) => setOpenMaps((m) => ({ ...m, [key]: !m[key] }));

  const rp = tour.rewardPoints || {};
  const guestTypes = useGuestTypes();
  const slotTypes = (tour.prices || []).filter((p) => p.countsTowardSlot).map((p) => p.label);
  const useStopTabs = moderationMode && stops.length > 1 && !showAllStops;

  const stopFlagCount = (stopId) =>
    flaggedNotes.filter((n) => n.step === "STOPS" && String(n.stopId) === String(stopId)).length;

  return (
    <div className="space-y-4">
      <Section id="sec-BASIC_INFO" index={1} title="Thông tin Tour" step="BASIC_INFO" onEdit={onEdit}>
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
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Mô tả & Điểm nổi bật</p>
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
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Thư viện ảnh ({1 + (tour.images || []).filter((url) => url !== tour.coverImageUrl).length} ảnh)</p>
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

      <Section id="sec-PRICING" index={2} title="Giá vé & Chính sách hủy" step="PRICING" onEdit={onEdit}>
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

      <Section
        id="sec-STOPS"
        index={3}
        title={`Điểm đến & Nội dung trải nghiệm (${stops.length})`}
        subtitle={`Điểm thưởng ${rp.snapshot ? "đã chốt" : "cấu hình hiện tại"}: +${rp.quizPerQuestion ?? "—"}đ/câu đố · +${rp.perExperience ?? "—"}đ/trải nghiệm · tối đa ${rp.maxTotalPoints ?? 0}đ`}
        step="STOPS"
        onEdit={onEdit}
        rightSlot={
          moderationMode && stops.length > 1 ? (
            <button
              type="button"
              onClick={() => setShowAllStops((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-teal-300 hover:text-teal-800 transition-colors cursor-pointer"
            >
              <Layers size={13} className="text-slate-400" />
              {showAllStops ? "Xem theo từng trạm" : `Mở tất cả (${stops.length})`}
            </button>
          ) : null
        }
      >
        <div>
          <p className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1"><MapPin size={12} />Bản đồ hành trình tổng quan</p>
          <StopsOverviewMap stops={stops} />
        </div>

        {/* Thanh Tab chọn Điểm đến khi ở chế độ Kiểm duyệt */}
        {moderationMode && stops.length > 1 && !showAllStops && (
          <div className="pt-1">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Chọn điểm đến để kiểm duyệt ({currentStopIdx + 1}/{stops.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Danh sách điểm đến">
              {stops.map((st, idx) => {
                const active = idx === currentStopIdx;
                const flags = stopFlagCount(st.id);
                return (
                  <button
                    key={st.id ?? idx}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => selectStop(idx)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all cursor-pointer ${
                      active
                        ? "border-teal-700 bg-teal-700 text-white shadow-xs"
                        : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-teal-300 hover:bg-white"
                    }`}
                  >
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${
                      active ? "bg-white text-teal-800" : "bg-teal-700 text-white"
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-bold max-w-[200px] truncate">{st.name || "Chưa đặt tên"}</span>
                    <span className={`text-[10px] font-medium ${active ? "text-teal-100" : "text-slate-400"}`}>
                      {(st.quiz || []).length} câu · {(st.experiences || []).length} TN
                    </span>
                    {flags > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                        <Flag size={9} />{flags}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {stops.map((s, i) => {
          if (useStopTabs && i !== currentStopIdx) return null;
          const open = !collapsibleStops || openStops[s.id];
          const loc = stopLocation(s);
          const stopWords = (s.culturalContent || "").trim().split(/\s+/).filter(Boolean).length;
          const stopMapKey = `stop-${s.id}`;
          const showStopMap = !moderationMode || Boolean(openMaps[stopMapKey]);

          return (
            <div key={s.id} id={`stop-${s.id}`} className="rounded-2xl border border-slate-300/90 bg-slate-50/60 overflow-hidden shadow-2xs">
              {/* ── CẤP CHA: Thanh định danh Điểm đến ── */}
              <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal-500 text-xs font-extrabold text-slate-950">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-teal-300">
                      Điểm đến #{i + 1}
                    </span>
                    <h4 className="text-sm sm:text-base font-extrabold text-white truncate">
                      {s.name || "Chưa đặt tên"}
                    </h4>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                    {s.quiz?.length || 0} câu đố · {s.experiences?.length || 0} trải nghiệm · +{s.maxPoints ?? 0}đ
                  </span>
                  {collapsibleStops && (
                    <button type="button" onClick={() => setOpenStops((o) => ({ ...o, [s.id]: !o[s.id] }))}
                      className="px-2.5 py-1 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white inline-flex items-center gap-1 cursor-pointer">
                      {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {open ? "Thu gọn" : "Xem chi tiết"}
                    </button>
                  )}
                </div>
              </div>

              {open && (
                <div className="divide-y divide-slate-200/80">
                  {/* ── Hồ sơ gốc & Tọa độ Điểm đến (Thuộc Cấp Cha) ── */}
                  <div className="p-3.5 sm:p-4 bg-white">
                    <Block anchor={{ step: "STOPS", stopId: s.id, field: "info" }} label={`Điểm ${i + 1} – Thông tin & Vị trí`}>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Thông tin chung & Định vị trạm
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3.5">
                        {s.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.imageUrl} alt="" className="w-full sm:w-32 h-24 rounded-xl object-cover shrink-0 border border-slate-200" />
                        )}
                        <div className="space-y-2 min-w-0 flex-1">
                          <p className="text-sm text-slate-800 leading-relaxed">{s.shortDescription || <i className="text-slate-400">Chưa có mô tả ngắn</i>}</p>
                          {s.guestNote && (
                            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200/70 px-2.5 py-1.5 rounded-lg">
                              <b>Lưu ý cho khách:</b> {s.guestNote}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                              <MapPin size={12} className="shrink-0 text-emerald-600" />
                              {loc ? (
                                <>
                                  <span>
                                    {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                                    {s.checkInRadiusMeters ? ` · bán kính ${s.checkInRadiusMeters}m` : ""}
                                  </span>
                                  <span className="text-slate-300">·</span>
                                  <a href={googleMapsUrl(loc.lat, loc.lng)} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 hover:underline">
                                    Google Maps
                                  </a>
                                </>
                              ) : <i className="text-slate-400">Chưa chọn vị trí check-in</i>}
                            </span>

                            {/* Moderator chỉ xem trạng thái QR; Provider vẫn xem/tải ảnh QR bên dưới */}
                            {moderationMode && <ModeratorQrNotice hasQr={Boolean(s.qrToken)} scope="tại điểm đến" />}

                            {moderationMode && s.latitude != null && s.longitude != null && (
                              <button
                                type="button"
                                onClick={() => toggleMap(stopMapKey)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 cursor-pointer"
                              >
                                <MapIcon size={12} className="text-teal-600" />
                                {showStopMap ? "Ẩn bản đồ vùng check-in" : "Xem bản đồ vùng check-in"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {showStopMap && s.latitude != null && s.longitude != null && (
                        <div className="mt-3">
                          <CheckpointMap latitude={s.latitude} longitude={s.longitude} radius={s.checkInRadiusMeters}
                            emptyLabel="Chưa chọn vị trí check-in" />
                        </div>
                      )}
                      {!moderationMode && s.qrToken && (
                        <div className="mt-2.5">
                          <ExperienceQr token={s.qrToken} label={`check-in ${s.name || "diem-den"}`} compact title="Mã QR check-in trạm" />
                        </div>
                      )}
                    </Block>
                  </div>

                  {/* ── CẤP CON: 3 Phân khu nội dung bên trong Điểm đến ── */}
                  <div className="p-3.5 sm:p-4 bg-slate-50/70">
                    <div className="sm:ml-2 sm:pl-4 sm:border-l-2 sm:border-teal-300/70 space-y-4">
                      {/* Phân khu 3.1: Câu chuyện văn hóa */}
                      <div className="rounded-xl border border-amber-200/80 bg-white overflow-hidden">
                        <div className="px-3.5 py-2.5 bg-amber-50/70 border-b border-amber-100 flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-950">
                            <BookOpen size={14} className="text-amber-700" />
                            1. Câu chuyện văn hóa
                            <span className="font-normal text-[11px] text-amber-800/80">(mở khóa sau check-in)</span>
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-amber-900">
                            <span className="rounded-md bg-white/90 border border-amber-200/70 px-2 py-0.5 tabular-nums">{stopWords.toLocaleString("vi-VN")} chữ</span>
                            {(s.culturalImages?.length > 0) && <span className="rounded-md bg-white/90 border border-amber-200/70 px-2 py-0.5">{s.culturalImages.length} ảnh</span>}
                            {(s.artifacts?.length > 0) && <span className="rounded-md bg-white/90 border border-amber-200/70 px-2 py-0.5">{s.artifacts.length} cổ vật</span>}
                            {s.videoUrl && <span className="rounded-md bg-white/90 border border-amber-200/70 px-2 py-0.5">Có video</span>}
                          </div>
                        </div>
                        <div className="p-3">
                          <Block anchor={{ step: "STOPS", stopId: s.id, field: "culturalContent" }} label={`Điểm ${i + 1} – Câu chuyện văn hóa`}>
                            {s.videoUrl && (
                              <div className="mb-3">
                                <p className="text-xs font-bold text-slate-500 mb-1 inline-flex items-center gap-1">
                                  <Film size={13} className="shrink-0" />Video câu chuyện văn hóa
                                </p>
                                <VideoPreview url={s.videoUrl} source={s.videoSource} />
                              </div>
                            )}
                            <StoryCard stop={s} panel={storyPanel && !moderationMode} />
                          </Block>
                        </div>
                      </div>

                      {/* Phân khu 3.2: Câu đố văn hóa */}
                      <div className="rounded-xl border border-sky-200/80 bg-white overflow-hidden">
                        <div className="px-3.5 py-2.5 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-sky-950">
                            <HelpCircle size={14} className="text-sky-700" />
                            2. Câu đố văn hóa tại điểm đến
                          </span>
                          <span className="rounded-md bg-white/90 border border-sky-200/80 px-2 py-0.5 text-[11px] font-bold text-sky-800">
                            {(s.quiz || []).length} câu đố
                          </span>
                        </div>
                        <div className="p-3 space-y-2.5">
                          {(s.quiz || []).length === 0 ? (
                            <p className="text-xs italic text-slate-400">Điểm đến này chưa có câu đố văn hóa.</p>
                          ) : (
                            (s.quiz || []).map((q, qi) => (
                              <Block key={q.id || qi} anchor={{ step: "STOPS", stopId: s.id, field: `quiz[${qi}]` }} label={`Điểm ${i + 1} – Câu đố ${qi + 1}`}>
                                <QuestionView q={q} label={`Câu đố ${qi + 1}`} points={q.points} />
                              </Block>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Phân khu 3.3: Trải nghiệm thực tế */}
                      <div className="rounded-xl border border-emerald-200/80 bg-white overflow-hidden">
                        <div className="px-3.5 py-2.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-950">
                            <Compass size={14} className="text-emerald-700" />
                            3. Hoạt động trải nghiệm thực tế
                          </span>
                          <span className="rounded-md bg-white/90 border border-emerald-200/80 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                            {(s.experiences || []).length} hoạt động
                          </span>
                        </div>
                        <div className="p-3 space-y-3">
                          {(s.experiences || []).length === 0 ? (
                            <p className="text-xs italic text-slate-400">Điểm đến này không có hoạt động trải nghiệm thực tế.</p>
                          ) : (
                            (s.experiences || []).map((e, ei) => {
                              const expMapKey = `exp-${s.id}-${e.id || ei}`;
                              const showExpMap = !moderationMode || Boolean(openMaps[expMapKey]);
                              return (
                                <Block key={e.id || ei} anchor={{ step: "STOPS", stopId: s.id, field: `experiences[${ei}]` }} label={`Điểm ${i + 1} – Trải nghiệm ${ei + 1}`}>
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-sm font-bold text-slate-900">Trải nghiệm {ei + 1}: {e.activityName || "—"}</p>
                                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">+{e.points ?? 0} điểm</span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                      <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5">
                                        <MapPin size={11} className="text-emerald-600" />
                                        {e.checkpointLatitude ?? "—"}, {e.checkpointLongitude ?? "—"} · bán kính {e.radiusMeters}m
                                      </span>
                                      <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5">
                                        <Timer size={11} className="text-slate-500" />
                                        {e.durationSeconds ? `${Math.floor(e.durationSeconds / 60)} phút ${e.durationSeconds % 60 ? `${e.durationSeconds % 60} giây` : ""}` : "—"}
                                      </span>

                                      {moderationMode && <ModeratorQrNotice hasQr={Boolean(e.qrToken)} scope="trải nghiệm" />}

                                      {moderationMode && e.checkpointLatitude != null && e.checkpointLongitude != null && (
                                        <button
                                          type="button"
                                          onClick={() => toggleMap(expMapKey)}
                                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700 cursor-pointer"
                                        >
                                          <MapIcon size={11} className="text-teal-600" />
                                          {showExpMap ? "Ẩn bản đồ vị trí" : "Xem bản đồ vị trí"}
                                        </button>
                                      )}
                                    </div>

                                    <CheckpointDistanceNotice stop={s} experience={e} />

                                    {showExpMap && e.checkpointLatitude != null && e.checkpointLongitude != null && (
                                      <div>
                                        <CheckpointMap latitude={e.checkpointLatitude} longitude={e.checkpointLongitude} radius={e.radiusMeters}
                                          reference={{ latitude: s.latitude, longitude: s.longitude, radius: s.checkInRadiusMeters }} />
                                      </div>
                                    )}

                                    {!moderationMode && e.qrToken && (
                                      <div><ExperienceQr token={e.qrToken} label={e.activityName} compact /></div>
                                    )}

                                    <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-2.5">
                                      <QuestionView q={e.question} label="Câu hỏi nghiệm thu sau trải nghiệm" />
                                    </div>
                                  </div>
                                </Block>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Thanh chuyển nhanh Điểm đến Trước / Tiếp theo (chế độ Tab Kiểm duyệt) */}
                  {useStopTabs && (
                    <div className="px-4 py-2.5 bg-white flex items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        disabled={currentStopIdx === 0}
                        onClick={() => selectStop(currentStopIdx - 1)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronLeft size={14} /> Điểm đến trước
                      </button>
                      <span className="text-slate-400 font-semibold tabular-nums">
                        Trạm {currentStopIdx + 1} / {stops.length}
                      </span>
                      <button
                        type="button"
                        disabled={currentStopIdx >= stops.length - 1}
                        onClick={() => selectStop(currentStopIdx + 1)}
                        className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50/70 hover:bg-teal-100/70 px-3 py-1.5 font-bold text-teal-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Điểm đến tiếp theo <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Section>

      <Section id="sec-ITINERARY" index={4} title="Lịch trình theo ngày" step="ITINERARY" onEdit={onEdit}>
        <Block anchor={{ step: "ITINERARY", field: "itinerary" }} label="Lịch trình">
          <ItineraryView tour={tour} title={null} showEmpty />
        </Block>
      </Section>

      {showSchedule && (
        <Section id="sec-SCHEDULE" index={5} title="Lịch khởi hành & Điểm đón" step="SCHEDULE" onEdit={onEdit}>
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
