"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, AlertTriangle, MessageCircle, PenLine, Trash2, Send, CheckCircle2,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT, translate, getLocale } from "@/i18n";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import AccountLayout from "./AccountLayout";
import { touristService } from "../services/touristService";
import { PostCard, PostComposer } from "./CommunityScreen";

const TITLE_MAX = 200;
const CONTENT_MAX = 5000;

/**
 * Trang /account/posts — các bài viết của tôi trong cộng đồng.
 *
 * Khác với feed (chỉ bài `PUBLISHED`), ở đây hiện TẤT CẢ bài của tôi kèm trạng thái
 * kiểm duyệt (chờ duyệt / bị từ chối / đã đăng) để biết bài nào đã lên bảng tin.
 *
 * Thao tác cho từng bài (khớp API backend):
 *  • Sửa        — PUT /community/posts/{id}  (bài đã đăng sẽ quay lại chờ duyệt)
 *  • Gửi duyệt — POST /community/posts/{id}/submit (bản nháp / bị từ chối / cần chỉnh sửa)
 *  • Xoá        — DELETE /community/posts/{id}
 */

/** Hộp thoại sửa bài viết (tiêu đề + nội dung + danh sách ảnh giữ nguyên). */
function EditPostDialog({ post, onClose, onSaved }) {
  const t = useT();
  const [title, setTitle] = useState(post?.title || "");
  const [content, setContent] = useState(post?.content || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!post) return null;

  const submit = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle) { setError(t("community.errorNoTitle")); return; }
    if (!trimmedContent) { setError(t("community.errorNoContent")); return; }
    setBusy(true); setError("");
    try {
      const mediaUrls = (post.mediaList || []).map((m) => m.mediaUrl).filter(Boolean);
      await touristService.updateCommunityPost(post.id, {
        title: trimmedTitle,
        content: trimmedContent,
        mediaUrls: mediaUrls.length ? mediaUrls : null,
      });
      onSaved?.();
    } catch (err) {
      setError(err?.message || t("community.errorSavePost"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("community.editPostTitle")}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl"
      >
        <form onSubmit={submit}>
          <div className="px-6 pt-6 pb-4">
            <h3 className="text-base font-semibold tracking-tight text-slate-900">{t("community.editPostTitle")}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {t("community.editPostSubtitle")}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="edit-title" className="mb-1 block text-sm font-bold text-slate-800">{t("community.fieldTitle")}</label>
                <input
                  id="edit-title"
                  maxLength={TITLE_MAX}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div>
                <label htmlFor="edit-content" className="mb-1 block text-sm font-bold text-slate-800">{t("community.fieldContent")}</label>
                <textarea
                  id="edit-content"
                  rows={6}
                  maxLength={CONTENT_MAX}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
                <p className="mt-1 text-right text-[11px] text-slate-400">{content.length}/{CONTENT_MAX}</p>
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm font-semibold text-rose-600">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />{error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              {t("community.cancel")}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-700 px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {busy ? t("community.saving") : t("community.saveChanges")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MyPostsScreen() {
  const router = useRouter();
  const t = useT();
  const { confirm, confirmDialog } = useConfirm();
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [composing, setComposing] = useState(false);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => touristService.myCommunityPosts()
    .then((items) => setState({ loading: false, items, error: "" }))
    .catch((err) => setState({ loading: false, items: [], error: err?.message || translate(getLocale(), "community.errorLoadMyPosts") })), []);
  useEffect(() => { load(); }, [load]);

  const items = state.items;
  const counts = useMemo(() => ({
    total: items.length,
    published: items.filter((p) => p.status === "PUBLISHED").length,
    pending: items.filter((p) => p.status === "PENDING_REVIEW").length,
    rejected: items.filter((p) => p.status === "REJECTED").length,
  }), [items]);

  /** Gửi bài (bản nháp / bị từ chối / cần chỉnh sửa) đi kiểm duyệt lại. */
  const submitForReview = async (post) => {
    setBusyId(post.id);
    try {
      await touristService.submitCommunityPost(post.id);
      setNotice(t("community.submitReviewSuccess", { title: post.title }));
      load();
    } catch (err) {
      setNotice(err?.message || t("community.errorSubmitReview"));
    } finally {
      setBusyId(null);
    }
  };

  const removePost = async (post) => {
    const ok = await confirm({
      tone: "danger",
      icon: "reject",
      title: t("community.deletePostConfirmTitle"),
      subject: post.title,
      description: t("community.deletePostConfirmDesc"),
      confirmLabel: t("community.deletePostConfirmBtn"),
      cancelLabel: t("community.cancel"),
    });
    if (!ok) return;
    setBusyId(post.id);
    try {
      await touristService.deleteCommunityPost(post.id);
      setNotice(t("community.deletePostSuccess"));
      load();
    } catch (err) {
      setNotice(err?.message || t("community.errorDeletePost"));
    } finally {
      setBusyId(null);
    }
  };

  /** Bài nào có thể gửi duyệt lại (bản nháp / bị từ chối / cần chỉnh sửa). */
  const canSubmit = (post) => ["DRAFT", "REJECTED", "NEEDS_REVISION"].includes(post.status);

  return (
    <AccountLayout title={t("account.myPosts")} description={t("community.myPostsDesc")}>
      {confirmDialog}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{t("community.countTotal", { count: counts.total })}</span>
          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">{t("community.countPublished", { count: counts.published })}</span>
          <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">{t("community.countPending", { count: counts.pending })}</span>
          {counts.rejected > 0 && (
            <span className="rounded-lg bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">{t("community.countRejected", { count: counts.rejected })}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setComposing((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700"
        >
          <PenLine size={15} />{t("community.newPost")}
        </button>
      </div>

      {notice && (
        <p role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </p>
      )}

      {composing && (
        <div className="mb-5">
          <PostComposer
            onCancel={() => setComposing(false)}
            onCreated={() => {
              setComposing(false);
              setNotice(t("community.postSubmittedShort"));
              load();
            }}
          />
        </div>
      )}

      {state.loading ? (
        <p className="flex gap-2 py-10 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />{t("common.loading")}</p>
      ) : state.error ? (
        <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertTriangle size={16} />{state.error}
        </p>
      ) : items.length ? (
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id} className="rounded-3xl border border-slate-200 bg-white">
              <PostCard post={p} />
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  disabled={busyId === p.id}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  <PenLine size={13} />{t("community.edit")}
                </button>
                {canSubmit(p) && (
                  <button
                    type="button"
                    onClick={() => submitForReview(p)}
                    disabled={busyId === p.id}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
                  >
                    {busyId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    {t("community.submitForReview")}
                  </button>
                )}
                {p.status === "PUBLISHED" && (
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.COMMUNITY_POST(p.id))}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <MessageCircle size={13} />{t("community.viewPost")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removePost(p)}
                  disabled={busyId === p.id}
                  className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 size={13} />{t("community.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <MessageCircle size={30} className="mx-auto text-teal-600" />
          <p className="mt-2 font-bold text-slate-800">{t("community.myPostsEmptyTitle")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("community.myPostsEmptyDesc")}</p>
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="mt-4 cursor-pointer rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700"
          >
            {t("community.writePostNow")}
          </button>
        </div>
      )}

      <EditPostDialog
        key={editing ? `edit-${editing.id}` : "edit-none"}
        post={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          setNotice(t("community.editPostSuccess"));
          load();
        }}
      />
    </AccountLayout>
  );
}
