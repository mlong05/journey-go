"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Flag,
  CheckCircle2,
  XCircle,
  PencilLine,
  EyeOff,
  Eye,
  RefreshCw,
  Loader2,
  Inbox,
  MapPin,
  Route,
  X,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { PageHeader, KpiTile } from "@/components/dashboard/DashboardUI";
import { communityModerationService as api } from "@/features/community/services/communityModerationService";

/**
 * Trang Duyệt Bài Viết Cộng Đồng của Kiểm duyệt viên.
 * Đường dẫn: /moderator/community
 *
 * Hai việc chính:
 *  - Bài chờ duyệt: duyệt, yêu cầu chỉnh sửa hoặc từ chối kèm ghi chú gửi tác giả.
 *  - Báo cáo vi phạm: xác nhận (ẩn hoặc giữ bài) hoặc bác bỏ báo cáo, hiện lại bài đã ẩn.
 * Chỉ bài đã được duyệt mới xuất hiện trên bảng tin của du khách.
 */

const NOTE_MAX = 500;
const PAGE_SIZE = 10;

const REPORT_REASONS = {
  SPAM: "Spam hoặc quảng cáo",
  INAPPROPRIATE_CONTENT: "Nội dung không phù hợp",
  HATE_SPEECH: "Ngôn từ thù ghét",
  FALSE_INFORMATION: "Thông tin sai sự thật",
  COPYRIGHT_VIOLATION: "Vi phạm bản quyền",
  OTHER: "Lý do khác",
};

const POST_STATUS = {
  PUBLISHED: { label: "Đang hiển thị", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING_REVIEW: { label: "Chờ duyệt", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  REJECTED: { label: "Đã từ chối", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  NEEDS_REVISION: { label: "Cần chỉnh sửa", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  DRAFT: { label: "Bản nháp", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

const REPORT_STATUS_TABS = [
  { id: "PENDING", label: "Chờ xử lý" },
  { id: "RESOLVED", label: "Đã xác nhận" },
  { id: "DISMISSED", label: "Đã bác bỏ" },
];

const TONES = {
  success: {
    button: "bg-emerald-600 hover:bg-emerald-700",
    iconWrap: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Icon: CheckCircle2,
  },
  warning: {
    button: "bg-amber-500 hover:bg-amber-600",
    iconWrap: "bg-amber-50 text-amber-600 border-amber-100",
    Icon: PencilLine,
  },
  danger: {
    button: "bg-rose-600 hover:bg-rose-700",
    iconWrap: "bg-rose-50 text-rose-600 border-rose-100",
    Icon: XCircle,
  },
  neutral: {
    button: "bg-slate-800 hover:bg-slate-900",
    iconWrap: "bg-slate-100 text-slate-600 border-slate-200",
    Icon: ShieldAlert,
  },
};

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("vi-VN");
}

function initialOf(name) {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

/* ── Hộp thoại nhập ghi chú trước khi quyết định ─────────────────────────── */
function NoteDialog({ config, busy, onClose, onConfirm }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  if (!config) return null;
  const tone = TONES[config.tone] || TONES.neutral;
  const ToneIcon = tone.Icon;

  const submit = () => {
    if (config.required && !note.trim()) {
      setError("Vui lòng nhập ghi chú để tác giả hiểu lý do.");
      return;
    }
    onConfirm(note);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={config.title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 flex items-start gap-3">
          <div
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${tone.iconWrap}`}
          >
            <ToneIcon size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-slate-900 tracking-tight">{config.title}</h3>
            {config.subject && (
              <p className="text-xs font-bold text-slate-700 mt-1 truncate">{config.subject}</p>
            )}
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{config.description}</p>
          </div>
        </div>

        <div className="px-6 pb-4 space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            {config.noteLabel || "Ghi chú"}
            {config.required && <span className="text-rose-500"> *</span>}
          </label>
          <div className="relative">
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError("");
              }}
              maxLength={NOTE_MAX}
              rows={4}
              disabled={busy}
              className="w-full px-3.5 pt-2.5 pb-7 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 resize-none leading-relaxed transition-colors"
            />
            <span
              className={`pointer-events-none absolute right-3 bottom-2 text-[10px] font-mono font-semibold ${
                note.length >= NOTE_MAX * 0.9 ? "text-rose-500" : "text-slate-400"
              }`}
            >
              {note.length}/{NOTE_MAX}
            </span>
          </div>
          {error && (
            <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1.5">
              <AlertCircle size={13} />
              {error}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${tone.button}`}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            <span>{busy ? "Đang xử lý..." : config.confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Các khối dùng chung ────────────────────────────────────────────────── */
function Avatar({ name, url }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name || "Tác giả"} className="w-10 h-10 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-sky-600 text-white text-sm font-black flex items-center justify-center shrink-0">
      {initialOf(name)}
    </div>
  );
}

function PlaceLine({ destinationName, tourTitle }) {
  if (!destinationName && !tourTitle) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {destinationName && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 rounded-full px-2.5 py-0.5">
          <MapPin size={11} />
          {destinationName}
        </span>
      )}
      {tourTitle && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 rounded-full px-2.5 py-0.5">
          <Route size={11} />
          {tourTitle}
        </span>
      )}
    </div>
  );
}

function PostImages({ mediaList }) {
  const images = (mediaList || []).filter((m) => m?.mediaType !== "VIDEO" && m?.mediaUrl);
  if (images.length === 0) return null;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {images.slice(0, 8).map((m) => (
        <a
          key={m.id ?? m.mediaUrl}
          href={m.mediaUrl}
          target="_blank"
          rel="noreferrer"
          className="block aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200"
          title="Mở ảnh gốc"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.mediaUrl} alt="Ảnh đính kèm bài viết" className="w-full h-full object-cover" />
        </a>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="py-16 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
        <Icon size={26} />
      </div>
      <p className="text-sm font-black text-slate-800 mt-4">{title}</p>
      {text && <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">{text}</p>}
    </div>
  );
}


function Skeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-44 rounded-xl bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

function ActionButton({ tone, icon: Icon, children, onClick, disabled }) {
  const styles = {
    success: "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent",
    warning: "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200",
    danger: "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200",
    neutral: "bg-white hover:bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3.5 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${styles[tone]}`}
    >
      <Icon size={14} />
      {children}
    </button>
  );
}

/* ── Trang chính ────────────────────────────────────────────────────────── */
export default function ModeratorCommunityPage() {
  const { confirm, confirmDialog } = useConfirm();

  const [activeTab, setActiveTab] = useState("posts"); // "posts" | "reports"
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const [posts, setPosts] = useState({ items: [], total: 0, hasMore: false, page: 0 });
  const [postsState, setPostsState] = useState({ loading: true, more: false, error: "" });

  const [reportStatus, setReportStatus] = useState("PENDING");
  const [reports, setReports] = useState({ items: [], total: 0, hasMore: false, page: 0 });
  const [reportsState, setReportsState] = useState({ loading: true, more: false, error: "" });
  const [pendingReportTotal, setPendingReportTotal] = useState(0);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3800);
  }, []);

  /* Tải danh sách; page 0 thay thế, page lớn hơn thì nối thêm */
  const loadPosts = useCallback(async (page = 0) => {
    setPostsState((s) => ({ ...s, loading: page === 0, more: page > 0, error: "" }));
    try {
      const result = await api.getPendingPosts({ page, size: PAGE_SIZE });
      setPosts((prev) => ({
        items: page === 0 ? result.items : [...prev.items, ...result.items],
        total: result.total,
        hasMore: result.hasMore,
        page,
      }));
      setPostsState({ loading: false, more: false, error: "" });
    } catch (err) {
      setPostsState({
        loading: false,
        more: false,
        error: err?.message || "Không thể tải danh sách bài chờ duyệt.",
      });
    }
  }, []);

  const loadReports = useCallback(
    async (status, page = 0) => {
      setReportsState((s) => ({ ...s, loading: page === 0, more: page > 0, error: "" }));
      try {
        const result = await api.getReports({ status, page, size: PAGE_SIZE });
        setReports((prev) => ({
          items: page === 0 ? result.items : [...prev.items, ...result.items],
          total: result.total,
          hasMore: result.hasMore,
          page,
        }));
        if (status === "PENDING") setPendingReportTotal(result.total);
        setReportsState({ loading: false, more: false, error: "" });
      } catch (err) {
        setReportsState({
          loading: false,
          more: false,
          error: err?.message || "Không thể tải danh sách báo cáo.",
        });
      }
    },
    []
  );

  /* Số lượng ở tab báo cáo chờ xử lý, luôn lấy riêng để hiện trên nhãn tab */
  const refreshPendingReportTotal = useCallback(async () => {
    try {
      const result = await api.getReports({ status: "PENDING", page: 0, size: 1 });
      setPendingReportTotal(result.total);
    } catch {
      // giữ số cũ
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      loadPosts(0);
      loadReports("PENDING", 0);
    });
    return () => {
      cancelled = true;
    };
  }, [loadPosts, loadReports]);

  const refreshAll = () => {
    loadPosts(0);
    loadReports(reportStatus, 0);
    if (reportStatus !== "PENDING") refreshPendingReportTotal();
  };

  const changeReportStatus = (status) => {
    setReportStatus(status);
    loadReports(status, 0);
  };

  /* ── Duyệt bài ──────────────────────────────────────────────────────── */
  const openPostDecision = (post, action) => {
    const config = {
      APPROVE: {
        tone: "success",
        title: "Duyệt bài viết",
        description: "Bài viết sẽ hiển thị trên bảng tin cho mọi du khách.",
        confirmLabel: "Duyệt bài",
        noteLabel: "Ghi chú (không bắt buộc)",
        required: false,
      },
      REQUEST_REVISION: {
        tone: "warning",
        title: "Yêu cầu chỉnh sửa",
        description: "Bài viết được trả về cho tác giả kèm ghi chú. Tác giả sửa xong có thể gửi duyệt lại.",
        confirmLabel: "Gửi yêu cầu",
        noteLabel: "Nội dung cần chỉnh sửa",
        required: true,
      },
      REJECT: {
        tone: "danger",
        title: "Từ chối bài viết",
        description: "Bài viết sẽ không được đăng. Ghi chú sẽ được gửi tới tác giả.",
        confirmLabel: "Từ chối bài",
        noteLabel: "Lý do từ chối",
        required: true,
      },
    }[action];
    setDialog({ ...config, subject: post.title, kind: "post", post, action });
  };

  const submitPostDecision = async (note) => {
    const { post, action } = dialog;
    setBusy(true);
    try {
      await api.moderatePost(post.id, { action, note });
      setPosts((prev) => ({
        ...prev,
        items: prev.items.filter((p) => p.id !== post.id),
        total: Math.max(0, prev.total - 1),
      }));
      setDialog(null);
      showToast(
        action === "APPROVE"
          ? `Đã duyệt bài "${post.title}".`
          : action === "REJECT"
          ? `Đã từ chối bài "${post.title}".`
          : `Đã yêu cầu tác giả chỉnh sửa bài "${post.title}".`
      );
    } catch (err) {
      showToast(err?.message || "Không thể xử lý bài viết.", "error");
    } finally {
      setBusy(false);
    }
  };

  /* ── Xử lý báo cáo ──────────────────────────────────────────────────── */
  const openReportDecision = (report, mode) => {
    const config = {
      hide: {
        tone: "danger",
        title: "Xác nhận vi phạm và ẩn bài",
        description:
          "Bài viết sẽ bị gỡ khỏi bảng tin. Các báo cáo chờ xử lý khác của bài này cũng được đánh dấu đã xử lý.",
        confirmLabel: "Ẩn bài viết",
      },
      keep: {
        tone: "warning",
        title: "Xác nhận báo cáo, giữ bài",
        description: "Ghi nhận báo cáo là đúng nhưng bài viết vẫn hiển thị.",
        confirmLabel: "Xác nhận báo cáo",
      },
      dismiss: {
        tone: "neutral",
        title: "Bác bỏ báo cáo",
        description: "Báo cáo sai hoặc bài không vi phạm. Bài viết được giữ nguyên.",
        confirmLabel: "Bác bỏ báo cáo",
      },
    }[mode];
    setDialog({
      ...config,
      noteLabel: "Ghi chú xử lý (không bắt buộc)",
      required: false,
      subject: report.postTitle || `Bài viết #${report.postId}`,
      kind: "report",
      report,
      mode,
    });
  };

  const submitReportDecision = async (note) => {
    const { report, mode } = dialog;
    setBusy(true);
    try {
      if (mode === "dismiss") await api.dismissReport(report.id, note);
      else await api.resolveReport(report.id, { hidePost: mode === "hide", note });
      setDialog(null);
      showToast(
        mode === "dismiss"
          ? "Đã bác bỏ báo cáo."
          : mode === "hide"
          ? "Đã ẩn bài viết vi phạm."
          : "Đã xác nhận báo cáo."
      );
      loadReports(reportStatus, 0);
      if (reportStatus !== "PENDING") refreshPendingReportTotal();
    } catch (err) {
      showToast(err?.message || "Không thể xử lý báo cáo.", "error");
    } finally {
      setBusy(false);
    }
  };

  const unhidePost = async (report) => {
    const ok = await confirm({
      tone: "success",
      icon: "check",
      title: "Hiện lại bài viết?",
      subject: report.postTitle || `Bài viết #${report.postId}`,
      description: "Bài viết sẽ xuất hiện trở lại trên bảng tin nếu đã được duyệt.",
      confirmLabel: "Hiện lại bài",
    });
    if (!ok) return;
    try {
      await api.setPostHidden(report.postId, false);
      setReports((prev) => ({
        ...prev,
        items: prev.items.map((r) => (r.postId === report.postId ? { ...r, postHidden: false } : r)),
      }));
      showToast("Đã hiện lại bài viết.");
    } catch (err) {
      showToast(err?.message || "Không thể hiện lại bài viết.", "error");
    }
  };

  const handleDialogConfirm = (note) => {
    if (!dialog) return;
    if (dialog.kind === "post") submitPostDecision(note);
    else submitReportDecision(note);
  };

  /* ── Hiển thị ───────────────────────────────────────────────────────── */
  const renderPostCard = (post) => (
    <article key={post.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 hover:border-slate-300 transition-colors">
      <div className="flex items-start gap-3">
        <Avatar name={post.authorName} url={post.authorAvatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-900 truncate">{post.authorName || "Du khách"}</p>
          <p className="text-[11px] text-slate-500">Gửi lúc {formatTime(post.createdAt)}</p>
        </div>
        {post.reportCount > 0 && (
          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2.5 py-1">
            <Flag size={11} />
            {post.reportCount} báo cáo
          </span>
        )}
      </div>

      <PlaceLine destinationName={post.destinationName} tourTitle={post.tourTitle} />

      <div>
        <h3 className="text-base font-black text-slate-900 leading-snug">{post.title}</h3>
        <p className="text-[13px] text-slate-700 mt-2 leading-relaxed whitespace-pre-line break-words">
          {post.content}
        </p>
      </div>

      <PostImages mediaList={post.mediaList} />

      <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
        <ActionButton tone="success" icon={CheckCircle2} onClick={() => openPostDecision(post, "APPROVE")}>
          Duyệt bài
        </ActionButton>
        <ActionButton tone="warning" icon={PencilLine} onClick={() => openPostDecision(post, "REQUEST_REVISION")}>
          Yêu cầu chỉnh sửa
        </ActionButton>
        <ActionButton tone="danger" icon={XCircle} onClick={() => openPostDecision(post, "REJECT")}>
          Từ chối
        </ActionButton>
      </div>
    </article>
  );

  const renderReportCard = (report) => {
    const pending = report.status === "PENDING";
    const postStatus = POST_STATUS[report.postStatus];
    return (
      <article key={report.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 hover:border-slate-300 transition-colors">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-3 py-1">
            <Flag size={12} />
            {REPORT_REASONS[report.reason] || report.reason}
          </span>
          <span className="text-[11px] text-slate-500">Báo cáo lúc {formatTime(report.createdAt)}</span>
          {report.pendingReportCount > 0 && (
            <span className="ml-auto text-[11px] font-bold text-slate-600">
              Bài này còn {report.pendingReportCount} báo cáo chờ xử lý
            </span>
          )}
        </div>

        {report.description && (
          <p className="text-[13px] text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
            “{report.description}”
          </p>
        )}

        <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Bài bị báo cáo</span>
            {report.postHidden && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5">
                <EyeOff size={11} />
                Đang ẩn
              </span>
            )}
            {postStatus && (
              <span className={`text-[11px] font-bold border rounded-full px-2.5 py-0.5 ${postStatus.cls}`}>
                {postStatus.label}
              </span>
            )}
          </div>
          <p className="text-sm font-black text-slate-900">{report.postTitle || `Bài viết #${report.postId}`}</p>
          {report.postContentPreview && (
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line break-words">
              {report.postContentPreview}
            </p>
          )}
          {report.postAuthorName && (
            <p className="text-[11px] text-slate-500">Tác giả: {report.postAuthorName}</p>
          )}
        </div>

        {!pending && report.resolutionNote && (
          <p className="text-xs text-slate-600">
            <span className="font-bold">Ghi chú xử lý:</span> {report.resolutionNote}
          </p>
        )}

        <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
          {pending && (
            <>
              <ActionButton tone="danger" icon={EyeOff} onClick={() => openReportDecision(report, "hide")}>
                Xác nhận và ẩn bài
              </ActionButton>
              <ActionButton tone="warning" icon={CheckCircle2} onClick={() => openReportDecision(report, "keep")}>
                Xác nhận, giữ bài
              </ActionButton>
              <ActionButton tone="neutral" icon={X} onClick={() => openReportDecision(report, "dismiss")}>
                Bác bỏ báo cáo
              </ActionButton>
            </>
          )}
          {report.postHidden && (
            <ActionButton tone="success" icon={Eye} onClick={() => unhidePost(report)}>
              Hiện lại bài
            </ActionButton>
          )}
        </div>
      </article>
    );
  };

  const renderList = ({ state, data, render, empty, onRetry, onMore }) => {
    if (state.loading) return <Skeleton />;
    if (state.error && data.items.length === 0) {
      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 flex items-start gap-3">
          <AlertCircle size={18} className="text-rose-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-black text-rose-800">Không tải được dữ liệu</p>
            <p className="text-xs text-rose-700 mt-0.5 break-words">{state.error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 text-xs font-bold text-rose-800 underline cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        </div>
      );
    }
    if (data.items.length === 0) return empty;
    return (
      <div className="space-y-4">
        {data.items.map(render)}
        {data.hasMore && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={onMore}
              disabled={state.more}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {state.more && <Loader2 size={14} className="animate-spin" />}
              {state.more ? "Đang tải..." : "Xem thêm"}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-4 overflow-hidden animate-in fade-in-50 duration-200">
      {/* ── TIÊU ĐỀ ───────────────────────────────────────────── */}
      <div className="shrink-0">
        <PageHeader
          title="Duyệt Bài Viết Cộng Đồng"
          description="Xem xét bài chia sẻ trải nghiệm của du khách trước khi lên bảng tin, và xử lý các báo cáo vi phạm từ cộng đồng."
        >
          <button
            type="button"
            onClick={refreshAll}
            disabled={postsState.loading || reportsState.loading}
            className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[13px] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới danh sách"
          >
            <RefreshCw
              size={14}
              className={postsState.loading || reportsState.loading ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </PageHeader>
      </div>

      {/* ── KPI: bấm để chuyển nhanh giữa hai việc ───────────── */}
      <section className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          icon={MessageSquare}
          label="Bài chờ duyệt"
          value={posts.total}
          unit="bài viết"
          tone="amber"
        />
        <KpiTile
          icon={Flag}
          label="Báo cáo chờ xử lý"
          value={pendingReportTotal}
          unit="báo cáo"
          tone="rose"
        />
      </section>

      {/* ── THANH LỌC ─────────────────────────────────────────── */}
      <div className="shrink-0 bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "posts", icon: MessageSquare, label: `Bài chờ duyệt (${posts.total})` },
            { id: "reports", icon: Flag, label: `Báo cáo vi phạm (${pendingReportTotal})` },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === id
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Trạng thái báo cáo chỉ hiện ở tab báo cáo */}
        {activeTab === "reports" && (
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit">
            {REPORT_STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => changeReportStatus(tab.id)}
                className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  reportStatus === tab.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── DANH SÁCH (chỉ vùng này cuộn) ─────────────────────── */}
      <section className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] p-4 sm:p-5">
          {activeTab === "posts" &&
            renderList({
              state: postsState,
              data: posts,
              render: renderPostCard,
              onRetry: () => loadPosts(0),
              onMore: () => loadPosts(posts.page + 1),
              empty: (
                <EmptyState
                  icon={Inbox}
                  title="Không có bài nào đang chờ duyệt"
                  text="Bài chia sẻ trải nghiệm mới của du khách sẽ xuất hiện tại đây để bạn xem xét."
                />
              ),
            })}

          {activeTab === "reports" &&
            renderList({
              state: reportsState,
              data: reports,
              render: renderReportCard,
              onRetry: () => loadReports(reportStatus, 0),
              onMore: () => loadReports(reportStatus, reports.page + 1),
              empty: (
                <EmptyState
                  icon={Flag}
                  title={
                    reportStatus === "PENDING"
                      ? "Không có báo cáo nào cần xử lý"
                      : "Chưa có báo cáo ở mục này"
                  }
                  text={
                    reportStatus === "PENDING"
                      ? "Báo cáo vi phạm từ cộng đồng sẽ xuất hiện tại đây."
                      : undefined
                  }
                />
              ),
            })}
        </div>
      </section>

      <NoteDialog
        key={dialog ? `${dialog.kind}-${dialog.post?.id ?? dialog.report?.id}-${dialog.action ?? dialog.mode}` : "closed"}
        config={dialog}
        busy={busy}
        onClose={() => setDialog(null)}
        onConfirm={handleDialogConfirm}
      />
      {confirmDialog}

      {toast && (
        <div
          role="status"
          className={`fixed top-5 right-5 z-[70] max-w-sm px-4 py-3 rounded-2xl shadow-lg text-xs font-bold flex items-start gap-2 ${
            toast.type === "error" ? "bg-rose-700 text-white" : "bg-slate-900 text-white"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-400" />
          )}
          <span className="leading-relaxed">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
