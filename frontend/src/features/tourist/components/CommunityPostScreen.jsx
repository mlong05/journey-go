"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, AlertTriangle, Heart, MessageCircle, Send, Flag, Trash2, MoreVertical,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import TouristShell from "./TouristShell";
import { touristService } from "../services/touristService";
import { PostCard } from "./CommunityScreen";
import CommunityReportDialog from "./CommunityReportDialog";
import { useTouristSession } from "../hooks/useTouristSession";
import { dateTime } from "../utils";

/**
 * Trang /community/[id] — chi tiết bài viết + bình luận.
 *
 * Bình luận được nạp riêng (`GET /community/posts/{id}/comments`) vì endpoint trả về
 * `Page<CommentResponse>` — khác với `myReaction`/`likesCount` đã có sẵn trong
 * `PostResponse` của feed.
 */
export default function CommunityPostScreen({ postId }) {
  const router = useRouter();
  const { user } = useTouristSession();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [commentError, setCommentError] = useState("");
  // Báo cáo vi phạm — bài viết hoặc bình luận.
  const [reportTarget, setReportTarget] = useState(null); // { kind: "post" | "comment", id, subject }
  const [notice, setNotice] = useState("");

  const load = useCallback(() => Promise.all([
    touristService.communityPost(postId).catch(() => null),
    touristService.communityComments(postId).catch(() => []),
  ]).then(([p, c]) => {
    setPost(p);
    setComments(c);
    setLoading(false);
  }).catch((err) => {
    setError(err?.message || "Không tải được bài viết.");
    setLoading(false);
  }), [postId]);
  useEffect(() => { load(); }, [load]);

  const react = async () => {
    try {
      const likes = await touristService.reactCommunityPost(postId);
      setPost((p) => (p ? {
        ...p,
        likesCount: typeof likes === "number" ? likes : p.likesCount,
        myReaction: p.myReaction === "LOVE" ? null : "LOVE",
      } : p));
    } catch (err) {
      setCommentError(err?.message || "Không thả tim được.");
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setBusy(true); setCommentError("");
    try {
      const created = await touristService.addCommunityComment(postId, content);
      setComments((list) => [...list, created]);
      setText("");
      setPost((p) => (p ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
    } catch (err) {
      setCommentError(err?.message || "Không gửi được bình luận.");
    } finally {
      setBusy(false);
    }
  };

  /** Xoá bình luận của chính mình. */
  const removeComment = async (comment) => {
    try {
      await touristService.deleteCommunityComment(comment.id);
      setComments((list) => list.filter((c) => c.id !== comment.id));
      setPost((p) => (p ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 0) - 1) } : p));
    } catch (err) {
      setCommentError(err?.message || "Không xoá được bình luận.");
    }
  };

  /** Gửi báo cáo vi phạm cho bài viết hoặc bình luận. */
  const submitReport = async ({ reason, description }) => {
    if (!reportTarget) return;
    if (reportTarget.kind === "comment") {
      await touristService.reportCommunityComment(reportTarget.id, { reason, description });
    } else {
      await touristService.reportCommunityPost(reportTarget.id, { reason, description });
    }
    setNotice("Đã gửi báo cáo. Cảm ơn bạn đã đóng góp xây dựng cộng đồng.");
  };

  const myId = user?.id ? String(user.id) : null;
  const isMyPost = post && myId && String(post.authorId) === myId;

  if (loading) {
    return <p className="flex justify-center gap-2 py-24 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Đang tải…</p>;
  }
  if (error) {
    return (
      <p role="alert" className="mx-auto max-w-md px-4 py-20 text-center font-bold text-rose-600">{error}</p>
    );
  }
  if (!post) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="font-bold text-slate-700">Không tìm thấy bài viết.</p>
        <button type="button" onClick={() => router.push(ROUTES.COMMUNITY)}
          className="mt-4 cursor-pointer rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800">
          Về bảng tin
        </button>
      </div>
    );
  }

  const liked = post.myReaction === "LOVE";

  return (
    <TouristShell>
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href={ROUTES.COMMUNITY} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-teal-800">
        <ArrowLeft size={15} />Bảng tin cộng đồng
      </Link>

      <div className="mt-4">
        <PostCard post={post} onReact={react} />
      </div>

      {/* Thao tác của người đọc: báo cáo bài viết (xoá bài chỉ dành cho tác giả).
          ⚠️ Backend không cho báo cáo bài của chính mình ⇒ ẩn nút cho bài đó. */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {isMyPost ? (
          <Link
            href={ROUTES.ACCOUNT_POSTS}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-800"
          >
            <MoreVertical size={13} />Quản lý bài viết của tôi
          </Link>
        ) : (
          <span />
        )}
        {!isMyPost && (
          <button
            type="button"
            onClick={() => setReportTarget({ kind: "post", id: post.id, subject: post.title })}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-rose-300 hover:text-rose-700"
          >
            <Flag size={13} />Báo cáo bài viết
          </button>
        )}
      </div>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="comments-title">
        <h2 id="comments-title" className="flex items-center gap-2 font-extrabold text-slate-900">
          <MessageCircle size={17} className="text-teal-700" />Bình luận ({comments.length})
        </h2>

        <form onSubmit={submitComment} className="mt-4 flex items-start gap-2">
          <label htmlFor="comment-input" className="sr-only">Viết bình luận</label>
          <textarea
            id="comment-input"
            rows={2}
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Viết bình luận của bạn…"
            className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            aria-label="Gửi bình luận"
            className="grid h-[42px] w-[42px] shrink-0 cursor-pointer place-items-center rounded-xl bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
        {commentError && (
          <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-rose-600">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />{commentError}
          </p>
        )}

        <ul className="mt-5 divide-y divide-slate-100">
          {comments.length === 0 ? (
            <li className="py-6 text-center text-sm text-slate-500">Chưa có bình luận nào. Hãy là người đầu tiên!</li>
          ) : comments.map((c) => (
            <li key={c.id} className="flex gap-3 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-sm font-bold text-teal-700">
                {(c.authorName || "?").trim().slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{c.authorName || "Du khách"}</p>
                <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-slate-700">{c.content}</p>
                <p className="mt-1 text-xs text-slate-400">{dateTime(c.createdAt)}</p>
              </div>
              <div className="flex shrink-0 items-start gap-1">
                {myId && String(c.authorId) === myId && (
                  <button
                    type="button"
                    onClick={() => removeComment(c)}
                    aria-label="Xoá bình luận của tôi"
                    title="Xoá bình luận của tôi"
                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                {myId && String(c.authorId) !== myId && (
                  <button
                    type="button"
                    onClick={() => setReportTarget({
                      kind: "comment",
                      id: c.id,
                      subject: `“${String(c.content || "").slice(0, 80)}”`,
                    })}
                    aria-label="Báo cáo bình luận"
                    title="Báo cáo bình luận"
                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Flag size={14} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={react}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-bold ${
            liked ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-600 hover:border-rose-300"
          }`}
        >
          <Heart size={16} fill={liked ? "currentColor" : "none"} />
          {liked ? "Đã thả tim" : "Thả tim"} ({post.likesCount || 0})
        </button>
      </div>

      {notice && (
        <p role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </p>
      )}

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
