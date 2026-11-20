"use client";

/**
 * UI dùng chung cho các trang Quản trị (Admin Dashboard).
 *
 * ── Vì sao tách ra? ──
 * Trước đây các khối UI này nằm riêng trong từng trang admin (`finance`,
 * `settlements`, …) ⇒ lặp code và sửa một chỗ thì phải sửa nhiều nơi.
 * Gom về đây để "Yêu cầu hoàn tiền" và "Tài chính & Thanh toán" dùng chung
 * ⇒ giao diện đồng nhất và chỉ sửa một chỗ.
 *
 * ⚠️ Quy ước class giống hệt bản cũ trong `finance/page.jsx` để không đổi giao diện.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, XCircle } from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";

/**
 * Thẻ chỉ số nhỏ (số liệu tổng quan đầu trang).
 */
export function Metric({ label, value, tone = "slate", hint }) {
  const tones = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
  };
  return (
    <div className="bg-white rounded-xl px-4 py-2.5 border border-slate-200/85 shadow-2xs">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className={`text-xl font-semibold mt-0.5 font-mono ${tones[tone]}`}>
        {value}
      </div>
      {hint && (
        <p
          className="mt-0.5 text-[11px] text-slate-400 leading-snug truncate"
          title={hint}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Panel — khung chứa nội dung bảng.
 *
 * `fill` bật chế độ chiếm toàn bộ chiều cao còn lại: tiêu đề cố định, phần thân
 * cuộn RIÊNG bên trong panel ⇒ trang ngoài không bao giờ phải cuộn.
 * `footer` (vd. thanh phân trang) luôn ghim ở đáy panel, không cuộn theo bảng.
 *
 * ⚠️ Vùng thân dùng `overflow-auto` — bảng bên trong PHẢI có
 * `<thead className="sticky top-0 z-10">` để tiêu đề cột luôn nhìn thấy
 * khi cuộn danh sách dài.
 */
export function Panel({ icon: Icon, title, right, children, fill = false, footer = null }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden ${
        fill ? "flex-1 min-h-0 flex flex-col" : ""
      }`}
    >
      <div className="shrink-0 px-4 py-2.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        </div>
        {right}
      </div>
      {fill ? (
        <>
          <div className="flex-1 min-h-0 overflow-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
            {children}
          </div>
          {footer}
        </>
      ) : (
        children
      )}
    </div>
  );
}

/**
 * Thanh phân trang — bọc component dùng chung `PaginationBar`
 * (số trang, nút nhảy đầu/cuối, "Đang xem trang X / Y").
 * Luôn hiện kể cả khi chỉ có 1 trang.
 */
export function Pagination({
  page,
  totalPages,
  totalElements,
  unit = "bản ghi",
  onChange,
}) {
  if (!totalElements) return null;
  return (
    <PaginationBar
      page={page}
      totalPages={totalPages}
      totalElements={totalElements}
      unit={unit}
      onChange={onChange}
    />
  );
}

/**
 * Badge trạng thái (màu theo trạng thái).
 */
export function StatusPill({ status, label }) {
  const cls =
    status === "SUCCESS" ||
    status === "CONFIRMED" ||
    status === "COMPLETED" ||
    status === "APPROVED" ||
    // Refund đã hoàn tiền thành công — có bằng chứng xác minh.
    status === "REFUNDED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "FAILED" ||
          status === "CANCELLED" ||
          status === "REJECTED" ||
          status === "EXPIRED"
        ? "bg-rose-50 text-rose-700"
        : // Giao dịch bị THAY THẾ (khách tạo giao dịch mới, đơn đã được thanh toán)
          // — KHÔNG phải lỗi ⇒ dùng màu trung tính (xám) thay vì đỏ cảnh báo.
          status === "SUPERSEDED"
          ? "bg-slate-100 text-slate-600"
          : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold ${cls}`}
    >
      {label ?? status}
    </span>
  );
}

/**
 * Khung modal dùng chung.
 *
 * ── Scroll (vấn đề: modal bị trượt cả trang ra ngoài) ──
 * Ba điều kiện phải có đồng thời để modal CUỘN RIÊNG, không kéo trang ngoài:
 *
 *  1. Modal được render vào `document.body` qua Portal.
 *     Nếu render tại chỗ trong cây component, nó sẽ kế thừa mọi `overflow` /
 *     `transform` / `contain` của các khung cha (panel, bảng, header) ⇒ cuộn
 *     modal có thể kéo cả trang.
 *
 *  2. Lớp phủ `fixed inset-0` + `overflow-hidden` (KHÔNG `overflow-y-auto`).
 *     Nếu lớp phủ tự cuộn được thì con lăn của chuột khi đưa vào mép modal sẽ
 *     cuộn LỚP PHỦ ⇒ biểu hiện ra như "cuộn cả trang" (vì lớp phủ phủ kín
 *     màn hình). Thanh cuộn nhỏ phải nằm ở phần THÂN modal.
 *
 *  3. Chiều cao modal = `max-h-[calc(100dvh-2rem)]` — luôn vừa khung nhìn
 *     (chừa 1rem mỗi phía cho padding `p-4` của lớp phủ). Kết hợp với
 *     phần THÂN modal `flex-1 min-h-0 overflow-y-auto` ⇒ nội dung dài chỉ
 *     cuộn BÊN TRONG modal.
 *
 * Ngoài ra khoá cuộn của CẢ `html` lẫn `body` trong lúc modal mở (chỉ khoá
 * `body` là chưa đủ vì trên desktop `html` mới là phần tử cuộn chính) và bù
 * lại bằng `padding-right` để trang không nhảy ngang.
 */
export function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer = null,
  wide = false,
  extraWide = false,
  fillHeight = false,
}) {
  // Portal chỉ render được ở phía client ⇒ chờ mount xong mới render.
  // Dùng `queueMicrotask` để không gọi setState đồng bộ trong thân effect
  // (tránh cascading render — xem convention của các trang admin khác).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setMounted(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Khoá cuộn nền khi modal mở (khôi phục nguyên trạng khi đóng).
  useEffect(() => {
    if (!mounted) return undefined;
    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;

    // Bù bề rộng thanh cuộn để nền không nhảy ngang khi thanh cuộn bị ẩn.
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      const currentPadding =
        parseInt(window.getComputedStyle(body).paddingRight, 10) || 0;
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = prevBodyOverflow;
      documentElement.style.overflow = prevHtmlOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`flex w-full ${
          extraWide ? "max-w-6xl" : wide ? "max-w-3xl" : "max-w-lg"
        } flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-2xl ${
          /*
            ⚠️ `fillHeight` (layout 2 cột) ⇒ modal PHẢI có chiều cao CỐ ĐỊNH,
            không chỉ `max-h`. Vì `flex-1` (flex-basis: 0) sẽ co phần thân về 0
            khi chưa có chiều cao cụ thể ⇒ `h-full` bên trong = 0 ⇒ mất thanh
            cuộn. `h-[calc(100dvh-2rem)]` + `max-h` ⇒ thân modal có chiều cao
            xác định ⇒ mỗi cột 2 cột cuộn đúng.
          */
          fillHeight
            ? "h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)]"
            : "max-h-[calc(100dvh-2rem)]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Đóng"
          >
            <XCircle size={18} />
          </button>
        </div>
        {/*
          ⚠️ CHIỀU CAO — điểm mấu chốt để modal có thanh cuộn:
            • Modal chỉ có `max-h` (không có chiều cao cố định) ⇒ thân modal
              co theo nội dung nhưng bị `flex-shrink` ép vừa `max-h` ⇒
              `flex-1 min-h-0 overflow-y-auto` ⇒ thân modal TỰ CUỘN.
            • `fillHeight` (layout 2 cột) ⇒ modal có chiều cao cố định ⇒ thân
              modal chiếm đúng phần còn lại (`flex-1 min-h-0`) ⇒ mỗi cột 2
              cột cuộn riêng bên trong.
        */}
        <div
          className={`mt-4 min-h-0 flex-1 overscroll-contain pr-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] ${
            fillHeight ? "overflow-hidden" : "overflow-y-auto"
          }`}
        >
          {fillHeight ? (
            <div className="h-full">{children}</div>
          ) : (
            children
          )}
        </div>
        {/*
          ⚠️ CHÂN MODAL — nút hành động luôn NHÌN THẤY, không phải cuộn xuống
            cuối mới thấy. Chân modal nằm NGOÀI thân cuộn (`overflow-y-auto`)
            ⇒ ghim cố định ở đáy modal.
        */}
        {footer && (
          <div className="mt-4 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Hàng thông tin dạng nhãn / giá trị. */
export function InfoRow({ label, value, mono = false, pill = false, status }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
      <div className="mt-1 text-xs font-semibold text-slate-800">
        {pill ? (
          <StatusPill status={status} label={value} />
        ) : value === null || value === undefined || value === "" ? (
          <span className="text-slate-400">—</span>
        ) : (
          <span className={mono ? "font-mono" : ""}>{value}</span>
        )}
      </div>
    </div>
  );
}

/** Khối nội dung có tiêu đề. */
export function DetailBlock({ title, children }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold text-slate-500">{title}</h3>
      <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
        {children}
      </div>
    </div>
  );
}

/** Hộp cảnh báo lỗi. */
export function ErrorBox({ text }) {
  return (
    <div className="m-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

/** Trạng thái đang tải. */
export function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-400">
      <Loader2 size={16} className="animate-spin" /> Đang tải...
    </div>
  );
}

/** Trạng thái rỗng. */
export function Empty({ icon: Icon, text }) {
  return (
    <div className="py-12 text-center text-slate-400">
      <Icon size={28} className="mx-auto text-slate-300 mb-2" />
      <p className="text-xs font-semibold text-slate-600">{text}</p>
    </div>
  );
}

/** Nhóm nhãn + nội dung trong form. */
export function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
