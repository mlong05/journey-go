/**
 * Dashboard Design Tokens — phong cách Metis-inspired
 * ──────────────────────────────────────────────────────
 * Mục đích: gom các className lặp lại của 3 dashboard
 * (admin/moderator/provider) về một chuẩn chung, dễ chỉnh sửa
 * và đảm bảo các trang "cảm giác" giống nhau.
 *
 * Nguyên tắc thị giác:
 *  - Ít gradient, ít glassmorphism
 *  - Hierarchy rõ ràng qua size/weight/color, không qua glow
 *  - Bảng dùng border-top nhẹ, không shadow-2xl
 *  - Hero banner: solid dark surface, không có watermark gradient màu
 *  - Badge/pill: bg-*-50 text-*-700 border-*-200, radius 0.5rem
 *  - Card: bg-white border-slate-200/80 rounded-xl shadow-xs
 */

export const SURFACE = {
  /** Container chính của page (đã có ở layout cha, dùng tham khảo). */
  page: "space-y-6 animate-in fade-in-50 duration-200",
  /** Card bình thường. */
  card: "bg-white border border-slate-200/80 rounded-xl shadow-xs",
  /** Card có header riêng. */
  cardHeader: "p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3",
  /** Card body dạng bảng. */
  cardTable: "overflow-x-auto",
  /** Card footer. */
  cardFooter: "px-5 py-3 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-500",
};

export const HERO = {
  /** Hero banner dùng nền dark đơn sắc (xám than), không gradient màu. */
  shell: "relative overflow-hidden rounded-2xl bg-slate-900 text-white px-6 py-5 sm:px-7 sm:py-6 border border-slate-800",
  /** Eyebrow chip ở đầu hero. */
  eyebrow: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide bg-white/10 border border-white/15 text-slate-200",
  /** Tiêu đề lớn. */
  title: "text-xl sm:text-2xl font-semibold tracking-tight text-white leading-tight",
  /** Mô tả phụ. */
  subtitle: "mt-1.5 text-[13px] text-slate-300 leading-relaxed max-w-2xl",
  /** Divider dưới hero. */
  rule: "mt-4 pt-3 border-t border-white/10",
  /** Status row ở chân hero. */
  statusRow: "flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px] text-slate-300",
  statusDot: "w-1.5 h-1.5 rounded-full bg-emerald-400",
};

/** Lưới 6 trụ cột chỉ huy trong hero. */
export const PILLAR = {
  grid: "mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5",
  card: "group flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-colors",
  iconBox: "w-9 h-9 shrink-0 rounded-md bg-white/10 text-slate-100 flex items-center justify-center group-hover:bg-white/15 transition-colors",
  title: "text-[12.5px] font-semibold text-white leading-snug",
  desc: "text-[11.5px] text-slate-300/90 leading-relaxed mt-0.5",
};

export const KPI = {
  grid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
  card: "bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col gap-4",
  /** Header: title bên trái, icon bên phải. */
  headerRow: "flex items-start justify-between gap-3",
  title: "text-[13px] font-medium text-slate-500 leading-snug",
  /** Icon container 40x40, nền tint, không border đậm. */
  iconBox: "w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center",
  /** Big number. */
  value: "text-2xl font-semibold text-slate-900 tracking-tight tabular-nums",
  unit: "text-xs font-medium text-slate-400 ml-1",
  /** Sub-line. */
  sub: "text-xs text-slate-500",
  /** Footer: trend pill bên trái, link bên phải. */
  footerRow: "pt-3 border-t border-slate-100 flex items-center justify-between text-xs",
  trend: "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70",
  link: "text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors",
};

export const TABLE = {
  /** <table> wrapper. */
  base: "w-full text-left text-sm border-collapse",
  theadRow: "bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500",
  th: "py-3 px-4 font-semibold",
  tbody: "divide-y divide-slate-100",
  tr: "hover:bg-slate-50/60 transition-colors",
  td: "py-3.5 px-4 text-slate-700",
  tdMuted: "py-3.5 px-4 text-slate-500 text-xs",
  /** Ô rỗng khi không có dữ liệu. */
  emptyCell: "py-14 text-center text-slate-400",
};

export const BADGE = {
  base: "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border",
  /** Theo trạng thái. */
  success: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  warning: "bg-amber-50 text-amber-700 border-amber-200/80",
  danger: "bg-rose-50 text-rose-700 border-rose-200/80",
  info: "bg-sky-50 text-sky-700 border-sky-200/80",
  neutral: "bg-slate-100 text-slate-600 border-slate-200/80",
  purple: "bg-violet-50 text-violet-700 border-violet-200/80",
};

export const BUTTON = {
  primary: "inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors",
  secondary: "inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold transition-colors",
  danger: "inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors",
  ghost: "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors",
};

export const MODAL = {
  overlay: "fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150",
  panel: "w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150",
  headerRow: "flex items-start justify-between pb-3 border-b border-slate-100",
  closeBtn: "w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors",
};

export const INPUT = {
  base: "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors",
  search: "pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-slate-400 w-56 transition-colors",
};
