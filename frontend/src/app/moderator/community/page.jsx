"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Clock,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { communityModerationService as api } from "@/features/community/services/communityModerationService";
import { useQueueRefresh } from "@/context/NotificationContext";

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
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">{config.title}</h3>
            {config.subject && (
              <p className="text-xs font-medium text-slate-700 mt-1 truncate">{config.subject}</p>
            )}
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{config.description}</p>
          </div>
        </div>

        <div className="px-6 pb-4 space-y-1.5">
          <label className="text-xs font-medium text-slate-700 block">
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
              className={`pointer-events-none absolute right-3 bottom-2 text-[11px] font-mono font-semibold ${
                note.length >= NOTE_MAX * 0.9 ? "text-rose-500" : "text-slate-400"
              }`}
            >
              {note.length}/{NOTE_MAX}
            </span>
          </div>
          {error && (
            <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1.5">
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
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className={`px-5 py-2.5 rounded-xl text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${tone.button}`}
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
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-sky-600 text-white text-sm font-semibold flex items-center justify-center shrink-0">
      {initialOf(name)}
    </div>
  );
}

/**
 * Đoạn chữ thu gọn tối đa `lines` dòng, có "Xem thêm" / "Thu gọn" như Facebook.
 * Nút chỉ hiện khi chữ thực sự dài hơn số dòng cho phép (đo bằng ResizeObserver).
 * `[overflow-wrap:anywhere]` để chuỗi dài không có khoảng trắng (đường dẫn, mã) vẫn xuống dòng.
 */
const CLAMP = { 2: "line-clamp-2", 3: "line-clamp-3", 4: "line-clamp-4", 5: "line-clamp-5" };

function ExpandableText({ as: Tag = "p", lines = 4, className = "", children }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const observerRef = useRef(null);

  // Callback ref: gắn ResizeObserver khi phần tử xuất hiện, đo lại khi đổi kích thước
  const measureRef = useCallback((el) => {
    observerRef.current?.disconnect();
    if (!el) return;
    const check = () => {
      if (!el.classList.contains("line-clamp-none")) {
        setOverflowing(el.scrollHeight - el.clientHeight > 1);
      }
    };
    const ro = new ResizeObserver(check);
    ro.observe(el);
    observerRef.current = ro;
  }, []);

  return (
    <div>
      <Tag
        ref={measureRef}
        className={`whitespace-pre-line [overflow-wrap:anywhere] ${expanded ? "line-clamp-none" : CLAMP[lines]} ${className}`}
      >
        {children}
      </Tag>
      {(overflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-[13px] font-medium text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
        >
          {expanded ? "Thu gọn" : "Xem thêm"}
        </button>
      )}
    </div>
  );
}

function PlaceLine({ destinationName, tourTitle }) {
  if (!destinationName && !tourTitle) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {destinationName && (
        <span className="inline-flex items-center gap-1 max-w-full text-[11px] font-medium text-slate-600 bg-slate-100 rounded-full px-2.5 py-0.5">
          <MapPin size={11} />
          <span className="truncate" title={destinationName}>{destinationName}</span>
        </span>
      )}
      {tourTitle && (
        <span className="inline-flex items-center gap-1 max-w-full text-[11px] font-medium text-slate-600 bg-slate-100 rounded-full px-2.5 py-0.5">
          <Route size={11} />
          <span className="truncate" title={tourTitle}>{tourTitle}</span>
        </span>
      )}
    </div>
  );
}

function timeAgo(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

function mediaOf(post) {
  return (post?.mediaList || []).filter((m) => m?.mediaUrl);
}

/* ── Mục trong danh sách bài chờ duyệt (cột trái) ─────────────────────── */
/* Chỉ hiện tác giả, thời gian, tiêu đề, số ảnh; nội dung xem ở khung bên phải */
function PostListItem({ post, active, onSelect }) {
  const mediaCount = mediaOf(post).length;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={`w-full text-left px-4 py-3 border-l-[3px] transition-colors cursor-pointer space-y-1 ${
        active ? "bg-teal-50/70 border-teal-600" : "border-transparent hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-700 truncate">{post.authorName || "Du khách"}</span>
        <span className="shrink-0">· {timeAgo(post.createdAt)}</span>
        <span className="ml-auto shrink-0 flex items-center gap-2">
          {post.reportCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-rose-600 font-semibold">
              <Flag size={10} />
              {post.reportCount}
            </span>
          )}
          {mediaCount > 0 && (
            <span className="inline-flex items-center gap-1" title={`${mediaCount} ảnh/video`}>
              <ImageIcon size={11} />
              {mediaCount}
            </span>
          )}
        </span>
      </div>
      <p className="text-sm font-semibold text-slate-900 leading-snug line-clamp-1 [overflow-wrap:anywhere]">
        {post.title}
      </p>
    </button>
  );
}

/* ── Bộ ảnh/video đầy đủ trong khung chi tiết ─────────────────────────── */
function MediaGallery({ media, onOpen }) {
  if (media.length === 0) return null;
  const cols = media.length === 1 ? "grid-cols-1" : "grid-cols-2";
  return (
    <div className={`grid ${cols} gap-2`}>
      {media.map((m, i) =>
        m.mediaType === "VIDEO" ? (
          <video
            key={m.id ?? m.mediaUrl}
            src={m.mediaUrl}
            controls
            className="w-full max-h-[420px] rounded-xl bg-black border border-slate-200"
          />
        ) : (
          <button
            key={m.id ?? m.mediaUrl}
            type="button"
            onClick={() => onOpen(m)}
            className={`block rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-zoom-in ${
              media.length === 1 ? "" : "aspect-[4/3]"
            }`}
            title="Phóng to ảnh"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m.mediaUrl}
              alt={`Ảnh đính kèm ${i + 1}`}
              className={media.length === 1 ? "w-full max-h-[480px] object-contain" : "w-full h-full object-cover"}
            />
          </button>
        )
      )}
    </div>
  );
}

/* ── Xem ảnh phóng to, chuyển ảnh bằng phím ← → ─────────────────────── */
function Lightbox({ images, index, onClose, onChange }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onChange((index + 1) % images.length);
      if (e.key === "ArrowLeft") onChange((index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images.length, onClose, onChange]);

  const current = images[index];
  if (!current) return null;
  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/90 flex items-center justify-center p-4" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
        aria-label="Đóng"
      >
        <X size={20} />
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange((index - 1 + images.length) % images.length);
            }}
            className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
            aria-label="Ảnh trước"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange((index + 1) % images.length);
            }}
            className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
            aria-label="Ảnh sau"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.mediaUrl}
        alt={`Ảnh ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[85vh] rounded-lg object-contain"
      />
      <span className="absolute bottom-5 text-xs font-medium text-white/80">
        {index + 1} / {images.length}
      </span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="py-16 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
        <Icon size={26} />
      </div>
      <p className="text-sm font-semibold text-slate-800 mt-4">{title}</p>
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
      className={`px-3.5 py-2 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${styles[tone]}`}
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
  // Bài đang xem ở khung chi tiết; null = bài đầu tiên (mới nhất)
  const [selectedId, setSelectedId] = useState(null);
  // Trên màn hình hẹp chỉ hiện một khung: danh sách hoặc chi tiết
  const [mobileDetail, setMobileDetail] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { images, index }

  const [reportStatus, setReportStatus] = useState("PENDING");
  const [reports, setReports] = useState({ items: [], total: 0, hasMore: false, page: 0 });
  const [reportsState, setReportsState] = useState({ loading: true, more: false, error: "" });
  const [pendingReportTotal, setPendingReportTotal] = useState(0);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3800);
  }, []);

  /* Tải danh sách; page 0 thay thế, page lớn hơn thì nối thêm */
  const loadPosts = useCallback(async (page = 0, silent = false) => {
    if (!silent) setPostsState((s) => ({ ...s, loading: page === 0, more: page > 0, error: "" }));
    try {
      const result = await api.getPendingPosts({ page, size: PAGE_SIZE });
      setPosts((prev) => ({
        // Luôn xếp bài mới nhất lên đầu
        items: (page === 0 ? result.items : [...prev.items, ...result.items])
          .slice()
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
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

  // Thời gian thực: bài mới chờ duyệt → tải ngầm danh sách; báo cáo mới → cập nhật số trên tab
  // (danh sách báo cáo đang xem chỉ tải lại khi đang mở tab báo cáo chờ xử lý)
  useQueueRefresh(["post-review"], () => loadPosts(0, true));
  useQueueRefresh(["post-report"], () => {
    refreshPendingReportTotal();
    if (activeTab === "reports" && reportStatus === "PENDING") loadReports("PENDING", 0);
  });

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
      // Chuyển sang bài kế tiếp trong danh sách (hoặc bài trước nếu đã là bài cuối)
      const idx = posts.items.findIndex((p) => p.id === post.id);
      const next = posts.items[idx + 1] ?? posts.items[idx - 1] ?? null;
      setSelectedId(next ? next.id : null);
      if (!next) setMobileDetail(false);
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
  const selectedPost = posts.items.find((p) => p.id === selectedId) || posts.items[0] || null;

  const selectPost = (id) => {
    setSelectedId(id);
    setMobileDetail(true);
  };

  /* Khung chi tiết: hiện toàn bộ nội dung bài, thanh hành động luôn ở đáy */
  const renderPostDetail = (post) => {
    const media = mediaOf(post);
    const images = media.filter((m) => m.mediaType !== "VIDEO");
    const position = posts.items.findIndex((p) => p.id === post.id) + 1;
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="shrink-0 px-5 py-3 border-b border-slate-100 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileDetail(false)}
            className="lg:hidden -ml-1 w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
            aria-label="Quay lại danh sách"
          >
            <ChevronLeft size={18} />
          </button>
          <Avatar name={post.authorName} url={post.authorAvatarUrl} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate">{post.authorName || "Du khách"}</p>
            <p className="text-[11px] text-slate-500 inline-flex items-center gap-1">
              <Clock size={11} />
              Gửi lúc {formatTime(post.createdAt)} · {timeAgo(post.createdAt)}
            </p>
          </div>
          {post.reportCount > 0 && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2.5 py-1">
              <Flag size={11} />
              {post.reportCount} báo cáo
            </span>
          )}
          <span className="hidden sm:inline shrink-0 text-[11px] font-medium text-slate-400">
            {position}/{posts.total}
          </span>
        </div>

        {/* key theo bài để mỗi lần đổi bài khung cuộn quay về đầu */}
        <div key={post.id} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <article className="max-w-3xl mx-auto px-5 sm:px-8 py-6 space-y-5">
            <PlaceLine destinationName={post.destinationName} tourTitle={post.tourTitle} />
            <h2 className="text-xl font-bold text-slate-900 leading-snug [overflow-wrap:anywhere]">
              {post.title}
            </h2>
            <p className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">
              {post.content}
            </p>
            <MediaGallery
              media={media}
              onOpen={(m) => setLightbox({ images, index: Math.max(0, images.indexOf(m)) })}
            />
          </article>
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center gap-2">
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
      </div>
    );
  };

  /* Tab bài chờ duyệt: danh sách (trái) + chi tiết (phải) */
  const renderPostsTab = () => {
    if (postsState.loading) {
      return (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 p-5">
          <Skeleton />
        </div>
      );
    }
    if (postsState.error && posts.items.length === 0) {
      return (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 p-5">
          {renderList({ state: postsState, data: posts, onRetry: () => loadPosts(0) })}
        </div>
      );
    }
    if (posts.items.length === 0) {
      return (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 flex items-center justify-center">
          <EmptyState
            icon={Inbox}
            title="Không có bài nào đang chờ duyệt"
            text="Bài chia sẻ trải nghiệm mới của du khách sẽ xuất hiện tại đây để bạn xem xét."
          />
        </div>
      );
    }
    return (
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_1fr] gap-4">
        <aside
          className={`${mobileDetail ? "hidden lg:flex" : "flex"} min-h-0 flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden`}
        >
          <div className="shrink-0 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">{posts.total} bài chờ duyệt</span>
            <span className="text-[11px] text-slate-400">Mới nhất trước</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-slate-100">
            {posts.items.map((post) => (
              <PostListItem
                key={post.id}
                post={post}
                active={selectedPost?.id === post.id}
                onSelect={() => selectPost(post.id)}
              />
            ))}
            {posts.hasMore && (
              <div className="p-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => loadPosts(posts.page + 1)}
                  disabled={postsState.more}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {postsState.more && <Loader2 size={14} className="animate-spin" />}
                  {postsState.more ? "Đang tải..." : "Tải thêm bài"}
                </button>
              </div>
            )}
          </div>
        </aside>

        <section
          className={`${mobileDetail ? "flex" : "hidden lg:flex"} min-h-0 flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden`}
        >
          {selectedPost && renderPostDetail(selectedPost)}
        </section>
      </div>
    );
  };

  const renderReportCard = (report) => {
    const pending = report.status === "PENDING";
    const postStatus = POST_STATUS[report.postStatus];
    return (
      <article key={report.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 hover:border-slate-300 transition-colors">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-3 py-1">
            <Flag size={12} />
            {REPORT_REASONS[report.reason] || report.reason}
          </span>
          <span className="text-[11px] text-slate-500">Báo cáo lúc {formatTime(report.createdAt)}</span>
          {report.pendingReportCount > 0 && (
            <span className="ml-auto text-[11px] font-medium text-slate-600">
              Bài này còn {report.pendingReportCount} báo cáo chờ xử lý
            </span>
          )}
        </div>

        {report.description && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <ExpandableText lines={3} className="text-sm text-slate-700 leading-relaxed">
              “{report.description}”
            </ExpandableText>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Bài bị báo cáo</span>
            {report.postHidden && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5">
                <EyeOff size={11} />
                Đang ẩn
              </span>
            )}
            {postStatus && (
              <span className={`text-[11px] font-medium border rounded-full px-2.5 py-0.5 ${postStatus.cls}`}>
                {postStatus.label}
              </span>
            )}
          </div>
          <ExpandableText lines={2} className="text-sm font-semibold text-slate-900 leading-snug">
            {report.postTitle || `Bài viết #${report.postId}`}
          </ExpandableText>
          {report.postContentPreview && (
            <ExpandableText lines={3} className="text-[13px] text-slate-600 leading-relaxed">
              {report.postContentPreview}
            </ExpandableText>
          )}
          {report.postAuthorName && (
            <p className="text-[11px] text-slate-500">Tác giả: {report.postAuthorName}</p>
          )}
        </div>

        {!pending && report.resolutionNote && (
          <p className="text-xs text-slate-600">
            <span className="font-medium">Ghi chú xử lý:</span> {report.resolutionNote}
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
            <p className="text-sm font-semibold text-rose-800">Không tải được dữ liệu</p>
            <p className="text-xs text-rose-700 mt-0.5 break-words">{state.error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 text-xs font-medium text-rose-800 underline cursor-pointer"
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
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
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
      {/* ── TIÊU ĐỀ + TAB trên cùng một hàng để nhường chỗ cho khung bài viết ── */}
      <div className="shrink-0 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Duyệt Bài Viết Cộng Đồng
          </h1>
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </div>

      {/* ── BÀI CHỜ DUYỆT: danh sách + chi tiết ─────────────────── */}
      {activeTab === "posts" && renderPostsTab()}

      {/* ── BÁO CÁO (chỉ vùng này cuộn) ───────────────────────── */}
      {activeTab === "reports" && (
      <section className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] p-4 sm:p-5">
          {
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
      )}

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onChange={(index) => setLightbox((lb) => ({ ...lb, index }))}
        />
      )}

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
          className={`fixed top-5 right-5 z-[70] max-w-sm px-4 py-3 rounded-2xl shadow-lg text-xs font-medium flex items-start gap-2 ${
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
