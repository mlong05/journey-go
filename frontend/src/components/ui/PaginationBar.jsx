"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/**
 * Thanh phân trang dùng chung — có số trang + nút nhảy trang đầu/cuối.
 *
 * Giao diện bám sát trang "Quản lý người dùng" (`UsersClient.jsx`):
 *   ‹‹ (trang đầu) › (trang trước) [1] [2] … [N] › (trang sau) ›› (trang cuối)
 *
 * @param {number}   page         trang hiện tại (0-based)
 * @param {number}   totalPages   tổng số trang
 * @param {number}   totalElements tổng số bản ghi
 * @param {string}   unit         tên đơn vị tiếng Việt (vd. "giao dịch")
 * @param {Function} onChange     nhận trang mới (0-based)
 */
export default function PaginationBar({
  page,
  totalPages,
  totalElements,
  unit = "bản ghi",
  onChange,
}) {
  const total = Math.max(Number(totalPages) || 0, 1);
  const current = Math.min(Math.max((Number(page) || 0) + 1, 1), total);
  const count = Number(totalElements) || 0;

  // Danh sách số trang hiển thị: tối đa 5 nút quanh trang hiện tại,
  // kèm "…" khi còn trang ngoài tầm nhìn.
  const visiblePages = [];
  if (total <= 5) {
    for (let p = 1; p <= total; p += 1) visiblePages.push(p);
  } else {
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let p = start; p <= end; p += 1) visiblePages.push(p);
    if (start > 1) {
      visiblePages.unshift(1);
      if (start > 2) visiblePages.splice(1, 0, "...");
    }
    if (end < total) {
      if (end < total - 1) visiblePages.push("...");
      visiblePages.push(total);
    }
  }

  const goTo = (p) => onChange(Math.min(Math.max(p - 1, 0), total - 1));

  const navBtn =
    "p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  const pageBtn =
    "min-w-[32px] h-7 px-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-slate-50/60 border-t border-slate-100">
      {/* Bên trái: thông tin tổng số bản ghi */}
      <span className="text-xs text-slate-600">
        Đang xem trang{" "}
        <strong className="text-slate-900">{current}</strong> /{" "}
        <strong className="text-slate-900">{total}</strong>{" "}
        <span className="text-slate-400">
          (Tổng <strong className="text-slate-700">{count.toLocaleString("vi-VN")}</strong>{" "}
          {unit})
        </span>
      </span>

      {/* Bên phải: nút điều hướng + số trang */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => goTo(1)}
          disabled={current === 1}
          className={navBtn}
          title="Trang đầu"
          aria-label="Trang đầu"
        >
          <ChevronsLeft size={14} />
        </button>
        <button
          type="button"
          onClick={() => goTo(current - 1)}
          disabled={current === 1}
          className={navBtn}
          title="Trang trước"
          aria-label="Trang trước"
        >
          <ChevronLeft size={14} />
        </button>

        {visiblePages.map((p, idx) =>
          p === "..." ? (
            <span
              key={`dots-${idx}`}
              className="px-2 text-xs text-slate-400 font-semibold select-none"
            >
              …
            </span>
          ) : (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => goTo(p)}
              className={`${pageBtn} ${
                p === current
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
              aria-current={p === current ? "page" : undefined}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => goTo(current + 1)}
          disabled={current === total}
          className={navBtn}
          title="Trang sau"
          aria-label="Trang sau"
        >
          <ChevronRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => goTo(total)}
          disabled={current === total}
          className={navBtn}
          title="Trang cuối"
          aria-label="Trang cuối"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}
