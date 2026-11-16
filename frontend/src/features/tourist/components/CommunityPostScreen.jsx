"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle, MessageCircle, Send, Flag, Trash2, PenLine } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { LimitedField } from "@/components/ui/LimitedField";
import TouristShell from "./TouristShell";
import Breadcrumbs from "./Breadcrumbs";
import { touristService } from "../services/touristService";
import { PostCard } from "./CommunityScreen";
import CommunityReportDialog from "./CommunityReportDialog";
import { GuidelinesCard } from "./CommunitySidebar";
import { Avatar, ExpandableText, timeAgo, fullDateTime } from "./CommunityUI";
import { useTouristSession } from "../hooks/useTouristSession";

const COMMENT_MAX = 1000;

/**
 * Trang /community/[id] — chi tiết bài viết + bình luận (bố cục 2 cột giống bảng tin).
 *
 * Bình luận được nạp riêng (`GET /community/posts/{id}/comments`) vì endpoint trả về
 * `Page<CommentResponse>` — khác với `myReaction`/`likesCount` đã có sẵn trong `PostResponse` của feed.
 */
export default function CommunityPostScreen({ postId }) {
  const router = useRouter();
  const { user, isTourist } = useTouristSession();
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

  const toLogin = () => router.push(`${ROUTES.LOGIN}?callbackUrl=${encodeURIComponent(ROUTES.COMMUNITY_POST(postId))}`);

  const react = async () => {
    if (!isTourist) { toLogin(); return; }
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

  let body;
  if (loading) {
    body = (
      <div className="space-y-4" aria-busy="true">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3"><div className="jg-shimmer h-11 w-11 rounded-full" /><div className="flex-1 space-y-2"><div className="jg-shimmer h-3 w-40 rounded" /><div className="jg-shimmer h-3 w-24 rounded" /></div></div>
          <div className="jg-shimmer mt-4 h-6 w-2/3 rounded" /><div className="jg-shimmer mt-3 h-3 w-full rounded" /><div className="jg-shimmer mt-2 h-3 w-5/6 rounded" />
          <div className="jg-shimmer mt-4 aspect-[16/9] w-full rounded-2xl" />
        </div>
      </div>
    );
  } else if (error) {
    body = <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"><AlertTriangle size={16} />{error}</p>;
  } else if (!post) {
    body = (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="font-bold text-slate-700">Không tìm thấy bài viết.</p>
        <p className="mt-1 text-sm text-slate-500">Bài viết có thể đã bị ẩn hoặc chưa được duyệt.</p>
        <Link href={ROUTES.COMMUNITY} className="mt-4 inline-flex rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800">Về bảng tin</Link>
      </div>
    );
  } else {
    body = (
      <div className="space-y-4">
        <PostCard post={post} full onReact={react}
          // ⚠️ Backend không cho báo cáo bài của chính mình ⇒ ẩn mục báo cáo cho bài đó.
          onReport={!isTourist || isMyPost ? undefined : () => setReportTarget({ kind: "post", id: post.id, subject: post.title })} />

        {isMyPost && (
          <Link href={ROUTES.ACCOUNT_POSTS} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-800">
            <PenLine size={13} />Quản lý bài viết của tôi
          </Link>
        )}

        {notice && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p>}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="comments-title">
          <h2 id="comments-title" className="flex items-center gap-2 font-extrabold text-slate-900">
            <MessageCircle size={17} className="text-teal-700" />Bình luận <span className="text-slate-400">({comments.length})</span>
          </h2>

          {isTourist ? (
            <form onSubmit={submitComment} className="mt-4 flex items-start gap-3">
              <Avatar name={user?.fullName || "Bạn"} url={user?.avatarUrl} size={36} />
              <label htmlFor="comment-input" className="sr-only">Viết bình luận</label>
              <LimitedField as="textarea" counter="near" limit={COMMENT_MAX} wrapperClassName="flex-1" id="comment-input" rows={2}
                value={text} onChange={(e) => setText(e.target.value)} placeholder="Viết bình luận của bạn…"
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
              <button type="submit" disabled={busy || !text.trim()} aria-label="Gửi bình luận"
                className="grid h-[42px] w-[42px] shrink-0 cursor-pointer place-items-center rounded-xl bg-teal-700 text-white transition hover:bg-teal-800 disabled:opacity-40">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          ) : (
            <button type="button" onClick={toLogin} className="mt-4 w-full cursor-pointer rounded-xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-600 hover:border-teal-300 hover:text-teal-800">
              Đăng nhập để bình luận
            </button>
          )}
          {commentError && (
            <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-rose-600"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{commentError}</p>
          )}

          <ul className="mt-5 space-y-4">
            {comments.length === 0 ? (
              <li className="rounded-2xl bg-slate-50 py-6 text-center text-sm text-slate-500">Chưa có bình luận nào. Hãy là người đầu tiên!</li>
            ) : comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar name={c.authorName || "Du khách"} url={c.authorAvatarUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="rounded-2xl bg-slate-50 px-3.5 py-2.5">
                    <p className="text-sm font-bold text-slate-900">{c.authorName || "Du khách"}</p>
                    <ExpandableText text={c.content} lines={4} className="mt-0.5 text-sm leading-relaxed text-slate-700" />
                  </div>
                  <div className="mt-1 flex items-center gap-3 px-1 text-xs text-slate-400">
                    <span title={fullDateTime(c.createdAt)}>{timeAgo(c.createdAt)}</span>
                    {myId && String(c.authorId) === myId && (
                      <button type="button" onClick={() => removeComment(c)} className="inline-flex cursor-pointer items-center gap-1 font-semibold hover:text-rose-600"><Trash2 size={12} />Xoá</button>
                    )}
                    {isTourist && myId && String(c.authorId) !== myId && (
                      <button type="button" onClick={() => setReportTarget({ kind: "comment", id: c.id, subject: `“${String(c.content || "").slice(0, 80)}”` })}
                        className="inline-flex cursor-pointer items-center gap-1 font-semibold hover:text-rose-600"><Flag size={12} />Báo cáo</button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  return (
    <TouristShell desktopFixed>
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:pb-10">
        <Breadcrumbs fallback={ROUTES.COMMUNITY} items={[{ label: "Cộng đồng", href: ROUTES.COMMUNITY }, { label: post?.title || "Bài viết" }]} />
        <div className="mt-4 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">{body}</div>
          {/* Cột phải dính dưới menu như trang Cộng đồng — cuộn bằng thanh cuộn của trình duyệt */}
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto [scrollbar-width:none]">
            <section className="rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-extrabold text-slate-900">Bạn cũng vừa đi tour?</p>
              <p className="mt-1 text-xs text-slate-500">Chia sẻ trải nghiệm của bạn để giúp du khách khác chọn tour.</p>
              <Link href={ROUTES.COMMUNITY} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white hover:bg-orange-700">
                <PenLine size={15} />Viết bài trên bảng tin
              </Link>
            </section>
            <GuidelinesCard />
          </aside>
        </div>
      </div>

      <CommunityReportDialog
        key={reportTarget ? `report-${reportTarget.kind}-${reportTarget.id}` : "report-none"}
        open={Boolean(reportTarget)}
        subject={reportTarget?.subject}
        onClose={() => setReportTarget(null)}
        onSubmit={submitReport}
      />
    </TouristShell>
  );
}
