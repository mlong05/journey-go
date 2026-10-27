"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Trash2,
  XCircle,
  RotateCcw,
  Loader2,
  X,
} from "lucide-react";

/**
 * Hộp thoại xác nhận dùng chung cho mọi hành động quan trọng
 * (duyệt, từ chối, xóa, khôi phục...).
 *
 * - Hiệu ứng: lớp phủ mờ dần + thẻ trượt lên/phóng to theo đường cong
 *   cubic-bezier(0.32,0.72,0,1); biểu tượng nảy vào sau; có hiệu ứng thoát.
 *   Chỉ animate `transform` và `opacity` (GPU-safe).
 * - Phông chữ: kế thừa Geist từ <html> (render qua portal vẫn nằm trong body),
 *   nút bấm ép `font-family: inherit` để không bị trình duyệt đổi phông.
 * - Bàn phím: Esc = hủy, tự focus nút "Hủy" (an toàn với thao tác nguy hiểm).
 *
 * Props:
 *  - open, loading
 *  - tone: "danger" | "success" | "warning"
 *  - title, description (node), subject (tên đối tượng, in đậm)
 *  - confirmLabel, cancelLabel
 *  - icon: "trash" | "check" | "reject" | "restore" | "warning"
 *  - onConfirm, onCancel
 */
const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

const TONES = {
  danger: {
    iconWrap: "bg-rose-50 text-rose-600 ring-rose-100",
    halo: "bg-rose-400/25",
    btn: "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-600/25",
    focus: "focus-visible:ring-rose-500/40",
    bar: "from-rose-400 via-rose-500 to-rose-600",
  },
  success: {
    iconWrap: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    halo: "bg-emerald-400/25",
    btn: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/25",
    focus: "focus-visible:ring-emerald-500/40",
    bar: "from-emerald-400 via-emerald-500 to-teal-600",
  },
  warning: {
    iconWrap: "bg-amber-50 text-amber-600 ring-amber-100",
    halo: "bg-amber-400/25",
    btn: "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-600/25",
    focus: "focus-visible:ring-amber-500/40",
    bar: "from-amber-400 via-amber-500 to-orange-600",
  },
};

const ICONS = {
  trash: Trash2,
  check: CheckCircle2,
  reject: XCircle,
  restore: RotateCcw,
  warning: AlertTriangle,
};

const FONT = "font-sans [font-family:inherit]";

const SNAPSHOT_FIELDS = [
  "tone",
  "icon",
  "title",
  "description",
  "subject",
  "confirmLabel",
  "cancelLabel",
];

function pickContent(props) {
  const out = {};
  SNAPSHOT_FIELDS.forEach((k) => {
    out[k] = props[k];
  });
  return out;
}

export default function ConfirmDialog(props) {
  const { open, loading = false, onConfirm, onCancel } = props;
  // Giữ lại nội dung lần mở gần nhất để hiệu ứng thoát không bị mất chữ
  const [snapshot, setSnapshot] = useState(() => pickContent(props));
  if (open && SNAPSHOT_FIELDS.some((k) => snapshot[k] !== props[k])) {
    setSnapshot(pickContent(props));
  }
  const {
    tone = "danger",
    icon = "warning",
    title = "Xác nhận thao tác?",
    description,
    subject,
    confirmLabel = "Xác nhận",
    cancelLabel = "Hủy bỏ",
  } = snapshot;

  // mounted: còn trong DOM · visible: đang ở trạng thái "hiện"
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const cancelRef = useRef(null);

  // Mở: gắn vào DOM ngay khi render (điều chỉnh state, không dùng effect)
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      );
      return () => cancelAnimationFrame(id);
    }
    const hide = requestAnimationFrame(() => setVisible(false));
    const t = setTimeout(() => setMounted(false), 260);
    return () => {
      cancelAnimationFrame(hide);
      clearTimeout(t);
    };
  }, [open]);

  // Esc để hủy + focus nút Hủy + khóa cuộn nền
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onCancel?.();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const f = setTimeout(() => cancelRef.current?.focus(), 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(f);
    };
  }, [mounted, loading, onCancel]);

  if (!mounted || typeof document === "undefined") return null;

  const t = TONES[tone] || TONES.danger;
  const Icon = ICONS[icon] || AlertTriangle;

  return createPortal(
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center p-4 ${FONT}`}
      role="presentation"
    >
      {/* Lớp phủ */}
      <div
        onClick={() => !loading && onCancel?.()}
        className={`absolute inset-0 bg-slate-900/55 backdrop-blur-sm transition-opacity duration-300 ${EASE} ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Vỏ ngoài (double-bezel) */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className={`relative w-full max-w-md rounded-[2rem] bg-slate-900/5 p-1.5 ring-1 ring-slate-900/5 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] transition-all duration-300 ${EASE} will-change-transform ${
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-6 scale-95"
        }`}
      >
        {/* Lõi trong */}
        <div className="relative overflow-hidden rounded-[calc(2rem-0.375rem)] bg-white px-6 pt-8 pb-6 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div
            className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${t.bar}`}
          />

          <button
            type="button"
            onClick={() => !loading && onCancel?.()}
            aria-label="Đóng"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
          >
            <X size={15} />
          </button>

          {/* Biểu tượng */}
          <div
            className={`relative mx-auto mb-5 h-16 w-16 transition-all duration-500 delay-100 ${EASE} ${
              visible ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
          >
            <span
              className={`absolute inset-0 rounded-full ${t.halo} animate-ping [animation-duration:2.2s]`}
            />
            <span
              className={`relative flex h-16 w-16 items-center justify-center rounded-full ring-8 ${t.iconWrap}`}
            >
              <Icon size={28} strokeWidth={1.75} />
            </span>
          </div>

          {/* Nội dung (trượt lên lần lượt) */}
          <h3
            id="confirm-dialog-title"
            className={`text-lg font-bold tracking-tight text-slate-900 transition-all duration-500 delay-150 ${EASE} ${
              visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            }`}
          >
            {title}
          </h3>
          <div
            className={`mt-2 text-sm leading-relaxed text-slate-500 transition-all duration-500 delay-200 ${EASE} ${
              visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            }`}
          >
            {subject && (
              <p className="mb-1.5 truncate font-semibold text-slate-800">
                “{subject}”
              </p>
            )}
            {description}
          </div>

          {/* Nút */}
          <div
            className={`mt-7 grid grid-cols-2 gap-3 transition-all duration-500 delay-[250ms] ${EASE} ${
              visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            }`}
          >
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              disabled={loading}
              className={`rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 ${EASE} hover:bg-slate-50 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-300/50 disabled:opacity-50 cursor-pointer ${FONT}`}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 ${EASE} active:scale-[0.98] focus:outline-none focus-visible:ring-4 ${t.focus} ${t.btn} disabled:opacity-60 cursor-pointer ${FONT}`}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <span>{confirmLabel}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Hook dạng Promise — gọi gọn tại nơi xử lý:
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   if (!(await confirm({ title, tone: "danger", ... }))) return;
 *   ...
 *   return (<>{...}{confirmDialog}</>);
 */
export function useConfirm() {
  const [state, setState] = useState({ open: false });
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ ...options, open: true });
    });
  }, []);

  const settle = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    // giữ nguyên nội dung để hiệu ứng thoát vẫn hiển thị đúng chữ
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const confirmDialog = (
    <ConfirmDialog
      {...state}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirm, confirmDialog };
}
