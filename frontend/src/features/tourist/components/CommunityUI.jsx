"use client";
/* eslint-disable @next/next/no-img-element -- ảnh bài viết / tour đến từ nhiều nguồn (Cloudinary, Wikimedia) */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X, BadgeCheck, MapPin } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT, translate, INTL_LOCALE } from "@/i18n";
import { getTourPreview } from "../services/touristService";

/* ── Thời gian ─────────────────────────────────────────────────────────────── */

/** "Vừa xong" / "5 phút trước" / "3 giờ trước" / "Hôm qua" / "4 ngày trước" / "13/11/2026". */
export function timeAgo(iso, t, locale = "vi") {
  if (!iso) return "";
  const tr = t || ((k, p) => translate(locale, k, p));
  const ts = new Date(iso).getTime();
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return tr("time.justNow");
  if (s < 3600) return tr("time.minutesAgo", { count: Math.floor(s / 60) });
  if (s < 86400) return tr("time.hoursAgo", { count: Math.floor(s / 3600) });
  const d = Math.floor(s / 86400);
  if (d === 1) return tr("time.yesterday");
  if (d < 7) return tr("time.daysAgo", { count: d });
  const dt = new Date(ts);
  if (locale !== "vi") {
    return new Intl.DateTimeFormat(INTL_LOCALE[locale] || locale, { year: "numeric", month: "short", day: "numeric" }).format(dt);
  }
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}
export const fullDateTime = (iso, locale = "vi") => (iso ? new Date(iso).toLocaleString(INTL_LOCALE[locale] || locale, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "");

/* ── Ảnh đại diện ──────────────────────────────────────────────────────────── */

const AVATAR_TONES = ["bg-teal-100 text-teal-800", "bg-orange-100 text-orange-800", "bg-sky-100 text-sky-800", "bg-violet-100 text-violet-800", "bg-rose-100 text-rose-800", "bg-amber-100 text-amber-800", "bg-emerald-100 text-emerald-800"];
const toneOf = (name) => AVATAR_TONES[[...String(name || "?")].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TONES.length];
/** Chữ cái đầu của 2 từ cuối — bỏ qua phần không phải chữ, vd. "Nguyễn Văn Long (SE180646)" → "VL". */
const initials = (name) => {
  const words = String(name || "").trim().split(/\s+/).filter((w) => /^\p{L}/u.test(w));
  return (words.slice(-2).map((w) => w[0]).join("") || "?").toUpperCase();
};

/** Ảnh đại diện thật; không có ảnh (hoặc ảnh lỗi) thì hiện chữ cái đầu trên nền màu theo tên. */
export function Avatar({ name, url, size = 40 }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };
  if (url && !broken) return <img src={url} alt="" style={style} onError={() => setBroken(true)} className="shrink-0 rounded-full object-cover" />;
  return <span style={style} className={`grid shrink-0 place-items-center rounded-full font-bold ${toneOf(name)}`}>{initials(name)}</span>;
}

/** Nhãn "Đã tham gia tour" — người viết đã thực sự đi tour được gắn (authorJoinedTour). */
export function JoinedBadge() {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700" title={t("community.joinedTourTitle")}>
      <BadgeCheck size={12} />{t("community.joinedTour")}
    </span>
  );
}

/* ── Chữ dài: cắt ngắn + "Xem thêm" ───────────────────────────────────────── */

/**
 * Hiện tối đa `lines` dòng; nếu chữ dài hơn thì có nút "Xem thêm" để mở ra, "Thu gọn" để cắt lại.
 * Tự đo xem chữ có bị cắt thật không (chữ ngắn thì không hiện nút).
 */
export function ExpandableText({ text, lines = 4, className = "" }) {
  const t = useT();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [overflow, setOverflow] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el || open) return;
    setOverflow(el.scrollHeight - el.clientHeight > 2);
  }, [open]);

  useLayoutEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, text]);

  if (!text) return null;
  return (
    <div>
      <p ref={ref} style={open ? undefined : { WebkitLineClamp: lines, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}
        className={`whitespace-pre-line break-words ${className}`}>
        {text}
      </p>
      {(overflow || open) && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="mt-1 cursor-pointer text-sm font-bold text-teal-700 hover:text-teal-900 hover:underline">
          {open ? t("community.collapse") : t("community.expand")}
        </button>
      )}
    </div>
  );
}

/* ── Ảnh: lưới theo số lượng + xem phóng to ───────────────────────────────── */

function MediaCell({ imgs, i, onOpen, className = "" }) {
  const t = useT();
  return (
    <button type="button" onClick={() => onOpen?.(i)} aria-label={t("community.viewPhotoOf", { current: i + 1, total: imgs.length })}
      className={`group relative block overflow-hidden bg-slate-100 cursor-zoom-in ${className}`}>
      <img src={imgs[i].mediaUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
      {i === 3 && imgs.length > 4 && (
        <span className="absolute inset-0 grid place-items-center bg-slate-900/55 text-2xl font-extrabold text-white">+{imgs.length - 4}</span>
      )}
    </button>
  );
}

/** Lưới ảnh: 1 ảnh lớn 16:9 · 2 ảnh chia đôi · 3 ảnh (1 lớn + 2 nhỏ) · ≥4 ảnh lưới 2×2, ô cuối "+N". */
export function MediaGrid({ media, onOpen }) {
  const t = useT();
  const imgs = (media || []).filter((m) => m?.mediaUrl && m.mediaType !== "VIDEO");
  if (!imgs.length) return null;
  const cell = (i, className) => <MediaCell key={i} imgs={imgs} i={i} onOpen={onOpen} className={className} />;
  if (imgs.length === 1) {
    // Ảnh đơn: giữ đúng tỉ lệ gốc (không cắt), cao tối đa 520px; ảnh dọc có nền mờ của chính ảnh hai bên.
    return (
      <button type="button" onClick={() => onOpen?.(0)} aria-label={t("community.viewPhoto")}
        className="group relative flex max-h-[520px] w-full cursor-zoom-in justify-center overflow-hidden rounded-2xl bg-slate-100">
        <img src={imgs[0].mediaUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
        <img src={imgs[0].mediaUrl} alt="" loading="lazy" className="relative max-h-[520px] w-auto max-w-full object-contain transition duration-300 group-hover:scale-[1.01] motion-reduce:transition-none" />
      </button>
    );
  }
  if (imgs.length === 2) return <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-2xl">{cell(0, "aspect-[4/5]")}{cell(1, "aspect-[4/5]")}</div>;
  if (imgs.length === 3) {
    return (
      <div className="grid aspect-[16/10] grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden rounded-2xl">
        {cell(0, "col-span-2 row-span-2")}{cell(1, "")}{cell(2, "")}
      </div>
    );
  }
  return <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-2xl">{[0, 1, 2, 3].map((i) => cell(i, "aspect-[4/3]"))}</div>;
}

/** Xem ảnh phóng to: nút trái/phải, phím ← → Esc, bấm nền để đóng. */
export function Lightbox({ media, index, onClose, onIndex }) {
  const t = useT();
  const imgs = (media || []).filter((m) => m?.mediaUrl && m.mediaType !== "VIDEO");
  const open = index != null && imgs.length > 0;
  const go = useCallback((d) => onIndex?.((index + d + imgs.length) % imgs.length), [index, imgs.length, onIndex]);
  useEffect(() => {
    if (!open) return undefined;
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [open, go, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t("community.viewPhoto")} className="jg-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <button type="button" onClick={onClose} aria-label={t("common.close")} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"><X size={20} /></button>
      {imgs.length > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label={t("community.prevPhoto")} className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"><ChevronLeft size={22} /></button>
          <button type="button" onClick={() => go(1)} aria-label={t("community.nextPhoto")} className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"><ChevronRight size={22} /></button>
        </>
      )}
      <img src={imgs[index].mediaUrl} alt="" className="max-h-[86vh] max-w-full rounded-xl object-contain shadow-2xl" />
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tabular-nums text-white">{index + 1} / {imgs.length}</p>
    </div>,
    document.body,
  );
}

/* ── Tour được gắn ─────────────────────────────────────────────────────────── */

/** Thẻ tour nhỏ (ảnh bìa + tên) dẫn sang trang tour — cầu nối từ Cộng đồng sang đặt tour. */
export function TourChip({ tourId, title, destinationName }) {
  const t = useT();
  if (!tourId && !title) return null;
  const cover = tourId ? getTourPreview(tourId)?.coverImageUrl : null;
  const body = (
    <>
      {cover ? <img src={cover} alt="" className="h-11 w-14 shrink-0 rounded-lg object-cover" /> : <span className="grid h-11 w-14 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700"><MapPin size={16} /></span>}
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("community.experienceAt")}</span>
        <span className="line-clamp-1 text-sm font-bold text-slate-800">{title || destinationName}</span>
      </span>
    </>
  );
  return tourId ? (
    <Link href={ROUTES.TOUR_DETAIL(tourId)} className="flex max-w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-2 pr-4 transition hover:border-teal-300 hover:bg-white sm:inline-flex">
      {body}
    </Link>
  ) : (
    <span className="flex max-w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-2 pr-4 sm:inline-flex">{body}</span>
  );
}
