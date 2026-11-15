"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2, AlertTriangle, Heart, MessageCircle, Plus, X, ImagePlus, Send, Compass, Flag,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import TouristShell from "./TouristShell";
import CommunityReportDialog from "./CommunityReportDialog";
import { useTouristSession } from "../hooks/useTouristSession";
import { touristService } from "../services/touristService";
import { dateTime } from "../utils";

const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";
const MAX_MEDIA = 10;
/** Số ký tự tối đa — khớp `@Size` ở `CreatePostRequest`. */
const TITLE_MAX = 200;
const CONTENT_MAX = 5000;

/** Bảng chuyển trạng thái bài viết (enum `PostStatus` ở backend). */
export const POST_STATUS = {
  DRAFT: { label: "Bản nháp", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  PENDING_REVIEW: { label: "Chờ kiểm duyệt", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  PUBLISHED: { label: "Đã đăng", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Bị từ chối", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  NEEDS_REVISION: { label: "Cần chỉnh sửa", cls: "bg-sky-50 text-sky-700 border-sky-200" },
};

/** Ảnh đính kèm đầu tiên của bài viết (dùng cho thumbnail). */
export function postThumbnail(post) {
  return post?.mediaList?.find((m) => m.mediaType !== "VIDEO")?.mediaUrl || null;
}

/** Ô nhập nội dung bài viết — dùng chung cho trang cộng đồng và trang "bài của tôi". */
export function PostComposer({ onCreated, onCancel, defaultTourId }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tourId, setTourId] = useState(defaultTourId ? String(defaultTourId) : "");
  const [media, setMedia] = useState([]); // { file, url?, uploading, failed }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const pickFiles = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    const room = MAX_MEDIA - media.length;
    if (room <= 0) return;
    const accepted = picked.slice(0, room);
    const slots = accepted.map((file) => ({ file, url: null, uploading: true, failed: false }));
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
    const t = title.trim();
    const c = content.trim();
    if (!t) { setError("Vui lòng nhập tiêu đề bài viết."); return; }
    if (!c) { setError("Vui lòng nhập nội dung bài viết."); return; }
    if (media.some((m) => m.uploading)) { setError("Ảnh đang tải lên — vui lòng đợi xong rồi đăng."); return; }
    setBusy(true); setError("");
    try {
      const mediaUrls = media.filter((m) => m.url).map((m) => m.url);
      const created = await touristService.createCommunityPost({
        title: t,
        content: c,
        tourId: tourId ? Number(tourId) : null,
        mediaUrls: mediaUrls.length ? mediaUrls : null,
      });
      onCreated?.(created);
    } catch (err) {
      setError(err?.message || "Không đăng được bài viết.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="font-extrabold text-slate-900">Chia sẻ trải nghiệm của bạn</h2>
      <p className="mt-1 text-sm text-slate-500">
        Bài viết sẽ được kiểm duyệt trước khi hiện trong bảng tin cộng đồng.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="post-title" className="mb-1 block text-sm font-bold text-slate-800">Tiêu đề</label>
          <input
            id="post-title"
            maxLength={TITLE_MAX}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Trải nghiệm đêm Cù Lao Phố ở Hội An"
            className={input}
          />
        </div>
        <div>
          <label htmlFor="post-content" className="mb-1 block text-sm font-bold text-slate-800">Nội dung</label>
          <textarea
            id="post-content"
            rows={5}
            maxLength={CONTENT_MAX}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Chia sẻ cảm nhận, gợi ý cho người sắp đi tour…"
            className={`${input} resize-none`}
          />
          <p className="mt-1 text-right text-[11px] text-slate-400">{content.length}/{CONTENT_MAX}</p>
        </div>
        <div>
          <label htmlFor="post-tour" className="mb-1 block text-sm font-bold text-slate-800">
            Gắn với tour <span className="font-normal text-slate-400">(không bắt buộc)</span>
          </label>
          <input
            id="post-tour"
            inputMode="numeric"
            value={tourId}
            onChange={(e) => setTourId(e.target.value.replace(/\D/g, ""))}
            placeholder="Nhập mã tour (ID)"
            className={input}
          />
        </div>
        <div>
          <p className="mb-1 text-sm font-bold text-slate-800">
            Ảnh đính kèm <span className="font-normal text-slate-400">(tối đa {MAX_MEDIA})</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {media.map((m) => (
              <div key={m.file.name} className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200">
                {m.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="Đính kèm" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-400">
                    {m.uploading ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(m.file)}
                  aria-label="Xoá ảnh"
                  className="absolute right-1 top-1 cursor-pointer rounded-full bg-slate-900/70 p-0.5 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {media.length < MAX_MEDIA && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-700"
              >
                <ImagePlus size={18} />
                <span className="text-[10px] font-semibold">Thêm ảnh</span>
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

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}Đăng bài
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"
          >
            Huỷ
          </button>
        )}
      </div>
    </form>
  );
}

/** Thẻ bài viết dùng chung (bảng tin + trang chi tiết + bài của tôi). */
export function PostCard({ post, onReact, onComment, onReport }) {
  const liked = post?.myReaction === "LOVE";
  const thumb = postThumbnail(post);
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-50 text-sm font-bold text-teal-700">
          {(post?.authorName || "?").trim().slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">{post?.authorName || "Du khách"}</p>
          <p className="text-xs text-slate-400">{dateTime(post?.createdAt)}</p>
        </div>
        {post?.status && post.status !== "PUBLISHED" && (
          <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold ${POST_STATUS[post.status]?.cls || POST_STATUS.DRAFT.cls}`}>
            {POST_STATUS[post.status]?.label || post.status}
          </span>
        )}
      </div>

      <Link href={ROUTES.COMMUNITY_POST(post.id)} className="mt-3 block">
        <h3 className="font-extrabold text-slate-900 hover:text-teal-800">{post?.title}</h3>
        <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{post?.content}</p>
      </Link>

      {post?.mediaList?.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {post.mediaList.slice(0, 6).map((m) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={m.id ?? m.mediaUrl} src={m.mediaUrl} alt="" className="aspect-square w-full rounded-xl object-cover" />
          ))}
        </div>
      )}

      {/* ⚠️ Ghi chú kiểm duyệt chỉ có ý nghĩa khi bài BỊ TỪ CHỐI / CẦN CHỈNH SỬA
          (khớp mobile: `forum_widgets.dart` chỉ hiện khi status = REJECTED | NEEDS_REVISION).
          Bài đã PUBLISHED mà còn ghi chú cũ ⇒ không hiện để khỏi gây nhầm lẫn. */}
      {(post?.status === "REJECTED" || post?.status === "NEEDS_REVISION") && post?.moderationNote && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
          Phản hồi từ kiểm duyệt viên: {post.moderationNote}
        </p>
      )}

      <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-sm">
        <button
          type="button"
          onClick={() => onReact?.(post)}
          disabled={!onReact}
          className={`inline-flex cursor-pointer items-center gap-1.5 font-bold disabled:cursor-default ${liked ? "text-rose-600" : "text-slate-500 hover:text-rose-600"}`}
        >
          <Heart size={16} fill={liked ? "currentColor" : "none"} />
          {post?.likesCount || 0}
        </button>
        <button
          type="button"
          onClick={() => onComment?.(post)}
          disabled={!onComment}
          className="inline-flex cursor-pointer items-center gap-1.5 font-bold text-slate-500 hover:text-teal-700 disabled:cursor-default"
        >
          <MessageCircle size={16} />
          {post?.commentsCount || 0}
        </button>
        {post?.tourTitle && (
          <span className="ml-auto truncate text-xs text-slate-400">Gắn với: {post.tourTitle}</span>
        )}
        {onReport && (
          <button
            type="button"
            onClick={() => onReport(post)}
            aria-label="Báo cáo bài viết"
            title="Báo cáo bài viết"
            className="shrink-0 cursor-pointer rounded-lg p-1 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Flag size={14} />
          </button>
        )}
      </div>
    </article>
  );
}

/** Trang /community — bảng tin cộng đồng + đăng bài mới. */
export default function CommunityScreen() {
  const { user } = useTouristSession();
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [composing, setComposing] = useState(false);
  const [notice, setNotice] = useState("");
  const [reportTarget, setReportTarget] = useState(null);

  const load = useCallback(() => touristService.communityPosts({ size: 20 })
    .then((items) => setState({ loading: false, items, error: "" }))
    .catch((err) => setState({ loading: false, items: [], error: err?.message || "Không tải được bài viết." })), []);
  useEffect(() => { load(); }, [load]);

  /** Thả tim / bỏ thả tim — cập nhật số lượng ngay (optimistic). */
  const react = async (post) => {
    try {
      const likes = await touristService.reactCommunityPost(post.id);
      setState((s) => ({
        ...s,
        items: s.items.map((p) => (p.id === post.id
          ? { ...p, likesCount: typeof likes === "number" ? likes : p.likesCount, myReaction: p.myReaction === "LOVE" ? null : "LOVE" }
          : p)),
      }));
    } catch {
      /* bỏ qua — số lượng sẽ đồng bộ lại khi tải */
    }
  };

  const items = state.items;
  const myId = user?.id ? String(user.id) : null;

  /** Gửi báo cáo vi phạm cho một bài trong bảng tin. */
  const submitReport = async ({ reason, description }) => {
    if (!reportTarget) return;
    await touristService.reportCommunityPost(reportTarget.id, { reason, description });
    setNotice("Đã gửi báo cáo. Cảm ơn bạn đã đóng góp xây dựng cộng đồng.");
  };

  return (
    <TouristShell>
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900">Cộng đồng JourneyGo</h1>
          <p className="mt-1 text-sm text-slate-500">
            Trải nghiệm thật từ các du khách đã đi cùng bạn.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setComposing((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700"
        >
          <Plus size={16} />Viết bài
        </button>
      </div>

      {notice && (
        <p role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </p>
      )}

      {composing && (
        <div className="mt-5">
          <PostComposer
            onCancel={() => setComposing(false)}
            onCreated={(created) => {
              setComposing(false);
              setNotice("Bài viết đã được gửi kiểm duyệt. Bạn sẽ thấy nó trong mục \"Bài viết của tôi\".");
              load();
              if (created?.id) window.setTimeout(() => { window.location.href = ROUTES.ACCOUNT_POSTS; }, 900);
            }}
          />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {state.loading ? (
          <p className="flex justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Đang tải…</p>
        ) : state.error ? (
          <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            <AlertTriangle size={16} />{state.error}
          </p>
        ) : items.length ? (
          items.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              onReact={react}
              // ⚠️ Backend không cho báo cáo bài của chính mình ⇒ ẩn nút cho bài đó.
              onReport={myId && String(p.authorId) === myId
                ? undefined
                : (post) => setReportTarget({ id: post.id, subject: post.title })}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Compass size={30} className="mx-auto text-teal-600" />
            <p className="mt-2 font-bold text-slate-800">Chưa có bài viết nào</p>
            <p className="mt-1 text-sm text-slate-500">Hãy là người đầu tiên chia sẻ trải nghiệm của bạn.</p>
          </div>
        )}
      </div>

      <CommunityReportDialog
        key={reportTarget ? `report-${reportTarget.kind}-${reportTarget.id}` : "report-none"}
        open={Boolean(reportTarget)}
        subject={reportTarget?.subject}
        onClose={() => setReportTarget(null)}
        onSubmit={submitReport}
      />
    </div>
    </TouristShell>
  );
}
