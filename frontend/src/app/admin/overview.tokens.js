/**
 * Design Tokens — Trang Tổng quan vận hành (Operations Overview) của Admin.
 *
 * ── Nguyên tắc ──
 *  • Phong cách SaaS Fintech (lấy cảm hứng Stripe Dashboard): nền slate-50,
 *    card trắng, viền mảnh slate-200/80, bo góc rộng (rounded-2xl).
 *  • Brand = Indigo (#4f46e5). Màu ngữ nghĩa: Emerald (tăng trưởng / thành công),
 *    Amber (chờ xử lý), Rose (khẩn cấp / hoàn tiền), Sky (GMV / thông tin phụ).
 *  • Mật độ thông tin cao nhưng thoáng: padding gọn, chữ nhỏ vừa đọc.
 */

/** Card nền trắng — dùng cho mọi khối trên trang. */
export const CARD = {
  shell: "bg-white border border-slate-200/80 rounded-2xl shadow-sm",
  header: "px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3",
  body: "p-5",
  bodyTight: "p-3.5",
  footer: "px-5 py-3 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-600",
  title: "text-sm font-bold text-slate-900 tracking-tight",
  subtitle: "text-xs text-slate-500 mt-0.5",
};

/** Lưới 12 cột tiêu chuẩn của trang. */
export const GRID = {
  // ⚠️ "items-stretch" (mặc định của grid) + "h-full" ở các wrapper ⇒ mọi ô trong
  // cùng hàng có CHIỀU CAO BẰNG NHAU. Nếu không, ô thấp hơn sẽ để lại khoảng
  // trắng lệch nhau giữa các hàng ⇒ trang nhìn rối.
  row: "grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch",
  col8: "lg:col-span-8 h-full",
  col7: "lg:col-span-7 h-full",
  col6: "lg:col-span-6 h-full",
  col5: "lg:col-span-5 h-full",
  col4: "lg:col-span-4 h-full",
  col12: "lg:col-span-12 h-full",
};

/** Bảng bên trong card — cuộn ngang mượt trên mobile. */
export const TABLE = {
  wrap: "overflow-x-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]",
  base: "w-full text-left text-xs border-collapse min-w-[560px]",
  thead: "bg-slate-50/80 border-b border-slate-200",
  th: "py-2.5 px-3 font-bold text-[10.5px] uppercase tracking-wider text-slate-500 text-left whitespace-nowrap",
  tbody: "divide-y divide-slate-100",
  tr: "transition-colors hover:bg-slate-50/70",
  td: "py-2.5 px-3 text-slate-700 align-middle",
  empty: "py-12 text-center text-slate-400",
};

/** Pill / badge trạng thái. */
export const PILL = {
  base: "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  amber: "bg-amber-50 text-amber-700 border-amber-200/80",
  rose: "bg-rose-50 text-rose-700 border-rose-200/80",
  sky: "bg-sky-50 text-sky-700 border-sky-200/80",
  slate: "bg-slate-100 text-slate-600 border-slate-200/80",
};

/** Nút bấm. */
export const BTN = {
  primary:
    "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors",
  soft:
    "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-[11px] font-bold transition-colors",
  ghost:
    "inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] font-bold transition-colors",
};

/** Bộ lọc thời gian dạng segmented pill. */
export const RANGE = {
  group:
    "inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/80 overflow-x-auto max-w-full [scrollbar-width:none]",
  item:
    "px-3 py-1.5 rounded-lg text-[11.5px] font-bold whitespace-nowrap transition-colors text-slate-600 hover:text-slate-900",
  itemActive: "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/70",
};

/** Thẻ KPI có sparkline. */
export const KPI = {
  card: "bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 flex flex-col gap-3 transition-colors hover:border-slate-300",
  label: "text-[11.5px] font-semibold text-slate-500 leading-snug",
  value: "text-[22px] font-bold tracking-tight text-slate-900 tabular-nums leading-none",
  unit: "text-[11px] font-semibold text-slate-400 ml-1",
};

/** Thanh tiến trọng số (tỷ lệ hoàn thành, tỷ lệ quay lại…). */
export const PROGRESS = {
  track: "h-1.5 w-full rounded-full bg-slate-100 overflow-hidden",
  bar: "h-full rounded-full bg-indigo-500",
};
