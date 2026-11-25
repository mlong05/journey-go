"use client";
/* eslint-disable @next/next/no-img-element -- ảnh bài viết / tour đến từ nhiều nguồn (Cloudinary, Wikimedia) */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2, AlertTriangle, Heart, MessageCircle, Plus, X, ImagePlus, Send, Compass, Flag, MoreHorizontal,
  Clock, Flame,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT, useI18n, translate, getLocale } from "@/i18n";
import { LimitedField } from "@/components/ui/LimitedField";
import TouristShell from "./TouristShell";
import CommunityReportDialog from "./CommunityReportDialog";
import { Avatar, JoinedBadge, ExpandableText, MediaGrid, Lightbox, TourChip, timeAgo, fullDateTime } from "./CommunityUI";
import { ShareCard, TopToursCard, GuidelinesCard } from "./CommunitySidebar";
import { useTouristSession } from "../hooks/useTouristSession";
import { touristService } from "../services/touristService";

const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";
const MAX_MEDIA = 10;
/** Số ký tự tối đa — khớp `@Size` ở `CreatePostRequest`. */
const TITLE_MAX = 200;
const CONTENT_MAX = 5000;
const PAGE_SIZE = 10;
const SORTS = [
  ["createdAt,desc", "community.sortLatest", Clock],
  ["likesCount,desc", "community.sortPopular", Flame],
];

/** Bảng chuyển trạng thái bài viết (enum `PostStatus` ở backend). */
export const POST_STATUS = {
  DRAFT: { labelKey: "community.postStatus.DRAFT", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  PENDING_REVIEW: { labelKey: "community.postStatus.PENDING_REVIEW", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  PUBLISHED: { labelKey: "community.postStatus.PUBLISHED", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { labelKey: "community.postStatus.REJECTED", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  NEEDS_REVISION: { labelKey: "community.postStatus.NEEDS_REVISION", cls: "bg-sky-50 text-sky-700 border-sky-200" },
};

/** Ảnh đính kèm đầu tiên của bài viết (dùng cho thumbnail). */
export function postThumbnail(post) {
  return post?.mediaList?.find((m) => m.mediaType !== "VIDEO")?.mediaUrl || null;
}

/** Danh sách tour công khai cho ô "Gắn với tour" (tải 1 lần). */
function usePublishedTours() {
  const [tours, setTours] = useState([]);
  useEffect(() => {
    let alive = true;
    touristService.publishedTours().then((r) => { if (alive) setTours(r.items || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return tours;
}

/** Ô nhập nội dung bài viết — dùng chung cho trang cộng đồng (trong hộp nổi) và trang "bài của tôi". */
export function PostComposer({ onCreated, onCancel, defaultTourId }) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tourId, setTourId] = useState(defaultTourId ? String(defaultTourId) : "");
  const [media, setMedia] = useState([]); // { file, url?, uploading, failed }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const tours = usePublishedTours();

  const pickFiles = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    const room = MAX_MEDIA - media.length;
    if (room <= 0) return;
    const accepted = picked.slice(0, room);
    const slots = accepted.map((file) => ({ file, url: null, preview: URL.createObjectURL(file), uploading: true, failed: false }));
    setMedia((prev) => [...prev, ...slots]);
    await Promise.all(slots.map(async (slot) => {
      try {
        const url = await touristService.uploadImage(slot.file, "journeygo/community");
        setMedia((prev) => prev.map((m) => (m.file === slot.file ? { ...m, url, uploading: false } : m)));
      } catch {
        setMedia((prev) => prev.map((m) => (m.file === slot.file ? { ...m, uploading: false, failed: true } : m)));
      }
    }));
  };

  const removeMedia = (target) => setMedia((prev) => prev.filter((m) => m.file !== target));

  const submit = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle) { setError(t("community.errorNoTitle")); return; }
    if (!trimmedContent) { setError(t("community.errorNoContent")); return; }
    if (media.some((m) => m.uploading)) { setError(t("community.errorUploading")); return; }
    setBusy(true); setError("");
    try {
      const mediaUrls = media.filter((m) => m.url).map((m) => m.url);
      const created = await touristService.createCommunityPost({
        title: trimmedTitle,
        content: trimmedContent,
        tourId: tourId ? Number(tourId) : null,
        mediaUrls: mediaUrls.length ? mediaUrls : null,
      });
      onCreated?.(created);
    } catch (err) {
      setError(err?.message || t("community.errorCreatePost"));
    } finally {
      setBusy(false);
    }
  };

  const picked = tours.find((tour) => String(tour.tourId) === String(tourId));

  return (
    <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="font-extrabold text-slate-900">{t("community.composerTitle")}</h2>
      <p className="mt-1 text-sm text-slate-500">{t("community.composerSubtitle")}</p>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="post-title" className="mb-1 block text-sm font-bold text-slate-800">{t("community.fieldTitle")}</label>
          <LimitedField as="input" limit={TITLE_MAX} id="post-title" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={t("community.fieldTitlePlaceholder")} className={input} />
        </div>
        <div>
          <label htmlFor="post-content" className="mb-1 block text-sm font-bold text-slate-800">{t("community.fieldContent")}</label>
          <LimitedField as="textarea" limit={CONTENT_MAX} id="post-content" rows={6} value={content} onChange={(e) => setContent(e.target.value)}
            placeholder={t("community.fieldContentPlaceholder")} className={`${input} resize-y`} />
        </div>
        <div>
          <label htmlFor="post-tour" className="mb-1 block text-sm font-bold text-slate-800">
            {t("community.fieldTour")} <span className="font-normal text-slate-400">{t("community.optional")}</span>
          </label>
          <div className="flex items-center gap-2">
            {picked?.coverImageUrl && <img src={picked.coverImageUrl} alt="" className="h-11 w-14 shrink-0 rounded-lg object-cover" />}
            <select id="post-tour" value={tourId} onChange={(e) => setTourId(e.target.value)} className={`${input} cursor-pointer`}>
              <option value="">{t("community.noTourOption")}</option>
              {tours.map((tour) => <option key={tour.tourId} value={tour.tourId}>{tour.title}</option>)}
              {tourId && !picked && <option value={tourId}>{t("community.tourFallback", { id: tourId })}</option>}
            </select>
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-bold text-slate-800">
            {t("community.fieldPhotos")} <span className="font-normal text-slate-400">({media.length}/{MAX_MEDIA})</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {media.map((m) => (
              <div key={m.preview || m.file.name} className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200">
                <img src={m.url || m.preview} alt={t("community.attachmentAlt")} className={`h-full w-full object-cover ${m.uploading ? "opacity-50" : ""}`} />
                {m.uploading && <span className="absolute inset-0 grid place-items-center"><Loader2 size={18} className="animate-spin text-white drop-shadow" /></span>}
                {m.failed && <span className="absolute inset-x-0 bottom-0 bg-rose-600/90 py-0.5 text-center text-[10px] font-bold text-white">{t("community.uploadFailed")}</span>}
                <button type="button" onClick={() => removeMedia(m.file)} aria-label={t("community.removePhoto")}
                  className="absolute right-1 top-1 cursor-pointer rounded-full bg-slate-900/70 p-0.5 text-white"><X size={12} /></button>
              </div>
            ))}
            {media.length < MAX_MEDIA && (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-700">
                <ImagePlus size={18} />
                <span className="text-[10px] font-semibold">{t("community.addPhoto")}</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={pickFiles} />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm font-semibold text-rose-600">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />{error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">{t("community.cancelShort")}</button>
        )}
        <button type="submit" disabled={busy}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700 active:scale-[0.98] disabled:opacity-60">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}{t("community.publishPost")}
        </button>
      </div>
    </form>
  );
}

/** Menu "⋯" của thẻ bài (hiện có: Báo cáo). */
function PostMenu({ onReport }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="relative shrink-0" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={t("community.postOptions")} aria-haspopup="menu" aria-expanded={open}
        className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div role="menu" className="jg-pop absolute right-0 top-9 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onReport(); }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
            <Flag size={14} />{t("community.reportPost")}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Thẻ bài viết dùng chung (bảng tin + trang chi tiết + bài của tôi).
 * full: trang chi tiết — hiện toàn bộ nội dung, không cắt và không dẫn link sang chính nó.
 */
export function PostCard({ post, onReact, onComment, onReport, full = false }) {
  const { t, locale } = useI18n();
  const liked = post?.myReaction === "LOVE";
  const [viewer, setViewer] = useState(null);
  const [pop, setPop] = useState(false);
  const react = () => { setPop(true); window.setTimeout(() => setPop(false), 320); onReact?.(post); };
  const title = <h3 className={`font-extrabold leading-snug text-slate-900 ${full ? "text-xl sm:text-2xl" : "text-lg hover:text-teal-800"}`}>{post?.title}</h3>;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Avatar name={post?.authorName || t("community.traveler")} url={post?.authorAvatarUrl} size={44} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-bold text-slate-900">{post?.authorName || t("community.traveler")}</span>
            {post?.authorJoinedTour && <JoinedBadge />}
          </p>
          <p className="mt-0.5 text-xs text-slate-400" title={fullDateTime(post?.createdAt, locale)}>{timeAgo(post?.createdAt, t, locale)}</p>
        </div>
        {post?.status && post.status !== "PUBLISHED" && (
          <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold ${POST_STATUS[post.status]?.cls || POST_STATUS.DRAFT.cls}`}>
            {POST_STATUS[post.status] ? t(POST_STATUS[post.status].labelKey) : post.status}
          </span>
        )}
        {onReport && <PostMenu onReport={() => onReport(post)} />}
      </div>

      <div className="mt-3">
        {full || !post?.id ? title : <Link href={ROUTES.COMMUNITY_POST(post.id)} className="block">{title}</Link>}
        <div className="mt-1.5">
          {full
            ? <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-slate-700">{post?.content}</p>
            : <ExpandableText text={post?.content} lines={4} className="text-[15px] leading-relaxed text-slate-700" />}
        </div>
      </div>

      {post?.mediaList?.length > 0 && (
        <div className="mt-3">
          <MediaGrid media={post.mediaList} onOpen={setViewer} />
          <Lightbox media={post.mediaList} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />
        </div>
      )}

      {(post?.tourId || post?.tourTitle) && (
        <div className="mt-3"><TourChip tourId={post.tourId} title={post.tourTitle} destinationName={post.destinationName} /></div>
      )}

      {/* ⚠️ Ghi chú kiểm duyệt chỉ có ý nghĩa khi bài BỊ TỪ CHỐI / CẦN CHỈNH SỬA (khớp mobile). */}
      {(post?.status === "REJECTED" || post?.status === "NEEDS_REVISION") && post?.moderationNote && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{t("community.moderatorFeedback", { note: post.moderationNote })}</p>
      )}

      <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2 text-sm">
        <button type="button" onClick={react} disabled={!onReact} aria-pressed={liked} aria-label={liked ? t("community.unlike") : t("community.like")}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 font-bold transition disabled:cursor-default ${liked ? "text-rose-600 hover:bg-rose-50" : "text-slate-500 hover:bg-slate-50 hover:text-rose-600"}`}>
          <Heart size={17} fill={liked ? "currentColor" : "none"} className={`transition-transform duration-300 ${pop ? "scale-125" : ""}`} />
          <span className="tabular-nums">{post?.likesCount || 0}</span>
        </button>
        {onComment ? (
          <button type="button" onClick={() => onComment(post)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 font-bold text-slate-500 transition hover:bg-slate-50 hover:text-teal-700">
            <MessageCircle size={17} /><span className="tabular-nums">{post?.commentsCount || 0}</span>
          </button>
        ) : post?.id && !full ? (
          <Link href={ROUTES.COMMUNITY_POST(post.id)}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-bold text-slate-500 transition hover:bg-slate-50 hover:text-teal-700">
            <MessageCircle size={17} /><span className="tabular-nums">{post?.commentsCount || 0}</span><span className="hidden sm:inline font-semibold">{t("community.comments")}</span>
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-2 font-bold text-slate-500"><MessageCircle size={17} /><span className="tabular-nums">{post?.commentsCount || 0}</span></span>
        )}
      </div>
    </article>
  );
}

function FeedSkeleton() {
  const t = useT();
  return (
    <div className="space-y-4" aria-busy="true" aria-label={t("community.loadingPosts")}>
      {[0, 1].map((i) => (
        <div key={i} className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3"><div className="jg-shimmer h-11 w-11 rounded-full" /><div className="flex-1 space-y-2"><div className="jg-shimmer h-3 w-40 rounded" /><div className="jg-shimmer h-3 w-24 rounded" /></div></div>
          <div className="jg-shimmer mt-4 h-5 w-2/3 rounded" />
          <div className="jg-shimmer mt-2 h-3 w-full rounded" /><div className="jg-shimmer mt-2 h-3 w-5/6 rounded" />
          <div className="jg-shimmer mt-4 aspect-[16/9] w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

/** Hộp nổi chứa form viết bài. */
function ComposerModal({ open, onClose, onCreated }) {
  const t = useT();
  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="jg-fade-in fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={t("community.writePost")} className="jg-pop relative mx-auto my-6 w-full max-w-xl">
        <button type="button" onClick={onClose} aria-label={t("common.close")} className="absolute right-3 top-3 z-10 grid h-8 w-8 cursor-pointer place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        <PostComposer onCancel={onClose} onCreated={onCreated} />
      </div>
    </div>,
    document.body,
  );
}

/** Trang /community — bảng tin 2 cột: bài viết + cột phải (chia sẻ, tour được nhắc nhiều, quy tắc). */
export default function CommunityScreen() {
  const router = useRouter();
  const t = useT();
  const { user, isTourist } = useTouristSession();
  const toLogin = () => router.push(`${ROUTES.LOGIN}?callbackUrl=${encodeURIComponent(ROUTES.COMMUNITY)}`);
  const [feed, setFeed] = useState({ loading: true, items: [], last: true, total: 0, error: "", page: 0, more: false });
  const [sort, setSort] = useState(SORTS[0][0]);
  const [tourFilter, setTourFilter] = useState("");
  const [composing, setComposing] = useState(false);
  const [notice, setNotice] = useState("");
  const [reportTarget, setReportTarget] = useState(null);
  const [stats, setStats] = useState({ posts: 0, tours: [], cover: null });
  const tours = usePublishedTours();

  // Số liệu cho banner + "Tour được nhắc nhiều": lấy một lượt bài mới nhất (không lọc).
  useEffect(() => {
    let alive = true;
    touristService.communityFeed({ page: 0, size: 50 }).then(({ items, total }) => {
      if (!alive) return;
      const byTour = new Map();
      items.forEach((p) => { if (p.tourId) byTour.set(p.tourId, { tourId: p.tourId, title: p.tourTitle || `Tour #${p.tourId}`, count: (byTour.get(p.tourId)?.count || 0) + 1 }); });
      const cover = items.map((p) => p.mediaList?.find((m) => m.mediaType !== "VIDEO")?.mediaUrl).find(Boolean) || null;
      setStats({ posts: total, tours: [...byTour.values()].sort((a, b) => b.count - a.count).slice(0, 5), cover });
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Chỉ gọi API rồi ghi kết quả; trạng thái "đang tải" bật ở chỗ người dùng thao tác (đổi sắp xếp / lọc / xem thêm).
  const fetchPage = useCallback((page) => touristService.communityFeed({ page, size: PAGE_SIZE, sort, tourId: tourFilter || undefined })
    .then(({ items, last, total }) => setFeed((f) => ({ loading: false, more: false, error: "", page, last, total, items: page === 0 ? items : [...f.items, ...items.filter((p) => !f.items.some((x) => x.id === p.id))] })))
    .catch((err) => setFeed((f) => ({ ...f, loading: false, more: false, error: err?.message || translate(getLocale(), "community.errorLoadPosts") }))), [sort, tourFilter]);
  useEffect(() => { fetchPage(0); }, [fetchPage]);

  const changeSort = (k) => { if (k === sort) return; setFeed((f) => ({ ...f, loading: true })); setSort(k); };
  const changeFilter = (id) => { if (id === tourFilter) return; setFeed((f) => ({ ...f, loading: true })); setTourFilter(id); };
  const loadMore = () => { setFeed((f) => ({ ...f, more: true })); fetchPage(feed.page + 1); };

  /** Thả tim / bỏ thả tim — cập nhật ngay. */
  const react = async (post) => {
    if (!isTourist) { toLogin(); return; }
    try {
      const likes = await touristService.reactCommunityPost(post.id);
      setFeed((f) => ({
        ...f,
        items: f.items.map((p) => (p.id === post.id
          ? { ...p, likesCount: typeof likes === "number" ? likes : p.likesCount, myReaction: p.myReaction === "LOVE" ? null : "LOVE" }
          : p)),
      }));
    } catch { /* bỏ qua — số lượng sẽ đồng bộ lại khi tải */ }
  };

  const openComposer = () => {
    if (!isTourist) { toLogin(); return; }
    setComposing(true);
  };

  const myId = user?.id ? String(user.id) : null;
  const filterTitle = useMemo(() => {
    if (!tourFilter) return "";
    return tours.find((tour) => String(tour.tourId) === tourFilter)?.title || stats.tours.find((tour) => String(tour.tourId) === tourFilter)?.title || t("community.tourFallback", { id: tourFilter });
  }, [tourFilter, tours, stats.tours, t]);

  const submitReport = async ({ reason, description }) => {
    if (!reportTarget) return;
    await touristService.reportCommunityPost(reportTarget.id, { reason, description });
    setNotice(t("community.reportSuccess"));
  };

  // Ảnh minh hoạ cho ô trống (không dùng làm nền tiêu đề — tiêu đề không có ảnh).
  const bannerImg = stats.cover || tours.find((tour) => tour.coverImageUrl)?.coverImageUrl;

  return (
    <TouristShell desktopFixed>
      {/* Kiểu Facebook: cả trang cuộn bằng thanh cuộn của trình duyệt (mép phải màn hình), cột phải dính đứng yên,
          máy tính không có footer ⇒ cuộn xuống chỉ thấy bài viết. */}
      <div className="mx-auto w-full max-w-wide px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Bảng tin */}
          <div className="min-w-0 lg:pb-8">
            {/* Thanh sắp xếp / lọc dính dưới menu khi cuộn */}
            <div className="sticky top-16 z-20 -mx-1 mb-3 flex flex-wrap items-center gap-2 bg-[#f4f7f6]/95 px-1 py-2 backdrop-blur-sm">
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" role="tablist" aria-label={t("community.sortPosts")}>
                {SORTS.map(([k, labelKey, Icon]) => (
                  <button key={k} type="button" role="tab" aria-selected={sort === k} onClick={() => changeSort(k)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-bold transition ${sort === k ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                    <Icon size={14} />{t(labelKey)}
                  </button>
                ))}
              </div>
              <label className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1 sm:max-w-xs">
                <span className="sr-only">{t("community.filterByTour")}</span>
                <select value={tourFilter} onChange={(e) => changeFilter(e.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-teal-500">
                  <option value="">{t("community.allTours")}</option>
                  {tours.map((tour) => <option key={tour.tourId} value={tour.tourId}>{tour.title}</option>)}
                  {tourFilter && !tours.some((tour) => String(tour.tourId) === tourFilter) && <option value={tourFilter}>{filterTitle}</option>}
                </select>
              </label>
              {tourFilter && (
                <button type="button" onClick={() => changeFilter("")}
                  className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800 ring-1 ring-teal-200 hover:bg-teal-100">
                  <span className="truncate">{t("community.viewingTour", { title: filterTitle })}</span><X size={13} className="shrink-0" />
                </button>
              )}
              {/* Điện thoại: nút viết bài (máy tính đã có ô "Bạn vừa đi đâu?" ở cột phải) */}
              <button type="button" onClick={openComposer}
                className="ml-auto inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-orange-700 active:scale-[0.98] lg:hidden">
                <Plus size={15} />{t("community.writePost")}
              </button>
            </div>

            {notice && (
              <p role="status" className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {notice}<button type="button" onClick={() => setNotice("")} aria-label={t("community.closeNotice")} className="shrink-0 cursor-pointer text-emerald-600 hover:text-emerald-800"><X size={16} /></button>
              </p>
            )}

            {feed.loading ? <FeedSkeleton /> : feed.error ? (
              <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"><AlertTriangle size={16} />{feed.error}</p>
            ) : feed.items.length ? (
              <div className="space-y-4">
                {feed.items.map((p) => (
                  <PostCard key={p.id} post={p} onReact={react}
                    // ⚠️ Backend không cho báo cáo bài của chính mình ⇒ ẩn nút cho bài đó.
                    onReport={!isTourist || (myId && String(p.authorId) === myId) ? undefined : (post) => setReportTarget({ id: post.id, subject: post.title })} />
                ))}
                {!feed.last && (
                  <button type="button" onClick={loadMore} disabled={feed.more}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:border-teal-300 hover:text-teal-800 disabled:opacity-60">
                    {feed.more && <Loader2 size={15} className="animate-spin" />}{t("community.loadMorePosts")}
                  </button>
                )}
                {feed.last && feed.items.length > PAGE_SIZE && <p className="py-2 text-center text-xs text-slate-400">{t("community.endOfFeed")}</p>}
              </div>
            ) : tourFilter ? (
              // Đang lọc theo tour: không dùng ảnh bìa chung (dễ bị hiểu nhầm là ảnh của tour này).
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
                  <Compass size={26} />
                </span>
                <p className="mt-4 font-bold text-slate-800">{t("community.emptyTourTitle")}</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                  {t("community.emptyTourDescBefore")}<span className="font-semibold text-slate-700">{filterTitle}</span>{t("community.emptyTourDescAfter")}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={openComposer} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700"><Plus size={15} />{t("community.shareExperience")}</button>
                  <button type="button" onClick={() => changeFilter("")} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">{t("community.viewAllPosts")}</button>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-white">
                {bannerImg && <img src={bannerImg} alt="" className="h-36 w-full object-cover opacity-80" />}
                <div className="p-8 text-center">
                  <Compass size={28} className="mx-auto text-teal-600" />
                  <p className="mt-2 font-bold text-slate-800">{t("community.emptyFeedTitle")}</p>
                  <p className="mt-1 text-sm text-slate-500">{t("community.emptyFeedDesc")}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button type="button" onClick={openComposer} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700"><Plus size={15} />{t("community.writeFirstPost")}</button>
                    <Link href={ROUTES.HOME} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">{t("footer.exploreTours")}</Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cột phải */}
          {/* Cột phải dính dưới menu; nếu cao hơn màn hình thì tự cuộn riêng (ẩn thanh cuộn) */}
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pt-2 [scrollbar-width:none]">
            <div className="hidden lg:block"><ShareCard user={user} onCompose={openComposer} /></div>
            <TopToursCard tours={stats.tours} activeTourId={tourFilter} onPick={(id) => { changeFilter(id); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            <GuidelinesCard />
          </aside>
        </div>
      </div>

      <ComposerModal open={composing} onClose={() => setComposing(false)}
        onCreated={(created) => {
          setComposing(false);
          setNotice(t("community.postSubmittedNotice"));
          if (created?.id) window.setTimeout(() => router.push(ROUTES.ACCOUNT_POSTS), 900);
        }} />

      <CommunityReportDialog
        key={reportTarget ? `report-post-${reportTarget.id}` : "report-none"}
        open={Boolean(reportTarget)}
        subject={reportTarget?.subject}
        onClose={() => setReportTarget(null)}
        onSubmit={submitReport}
      />
    </TouristShell>
  );
}
