"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BadgePercent,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleSlash,
  Clock,
  Inbox,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  User,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ModalShell } from "@/components/admin/AdminUI";
import { LimitedField } from "@/components/ui/LimitedField";
import {
  cancelPolicy,
  createPolicy,
  getCurrentPolicy,
  listPolicies,
} from "@/features/finance/services/commissionPolicyService";
import { formatDateTimeVN } from "@/lib/money";

/* =========================================================================
   HẰNG SỐ & HELPERS
   ========================================================================= */

/**
 * Bảng màu thống nhất cho HAI bên chia doanh thu.
 *
 * ⚠️ Vì sao tách riêng? — Trước đây nền tảng = amber, đối tác = emerald.
 * Màu amber/emerald quá quen thuộc ⇒ người dùng dễ nhầm "xanh = nền tảng"
 * (màu chủ đạt của hệ thống) với "xanh = đối tác". Nay:
 *   • NỀN TẢNG  → tím/indigo  (màu "hệ thống", ấn sâu vào nền tảng)
 *   • ĐỐI TÁC   → xanh lá    (màu "tiền về đối tác")
 * Hai tông lạnh/tấp trung khác hẳn nhau ⇒ đọc 1 lần là nhớ cả đời.
 *
 * `hex` dùng cho SVG (donut) vì SVG không nhận class Tailwind.
 */
const RATE_COLORS = {
  platform: {
    /* Gradient thanh chia */
    barFrom: "from-violet-500",
    barTo: "to-indigo-500",
    /* Gradient chip */
    chipFrom: "from-violet-50",
    chipTo: "to-indigo-50",
    chipBorder: "border-violet-200",
    chipText: "text-violet-700",
    chipRing: "group-hover/ring-violet-200",
    /* Dot chú giải */
    dot: "bg-violet-500",
    /* SVG donut */
    hex: "#8b5cf6",
    /* Text nhấn mạnh */
    strong: "text-violet-700",
  },
  partner: {
    barFrom: "from-emerald-500",
    barTo: "to-teal-500",
    chipFrom: "from-emerald-50",
    chipTo: "to-teal-50",
    chipBorder: "border-emerald-200",
    chipText: "text-emerald-700",
    chipRing: "group-hover/ring-emerald-200",
    dot: "bg-emerald-500",
    hex: "#10b981",
    strong: "text-emerald-700",
  },
};

/** Thẻ trạng thái của một chính sách. */
const STATUS_META = {
  effective: {
    label: "Đang hiệu lực",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  future: {
    label: "Sắp hiệu lực",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    icon: CalendarClock,
  },
  expired: {
    label: "Đã kết thúc",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    icon: CircleSlash,
  },
  cancelled: {
    label: "Đã hủy",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    icon: XCircle,
  },
};

/** Các tab lọc theo trạng thái. */
const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "effective", label: "Đang hiệu lực" },
  { key: "future", label: "Sắp hiệu lực" },
  { key: "expired", label: "Đã kết thúc" },
  { key: "cancelled", label: "Đã hủy" },
];

/** Cách sắp xếp danh sách. */
const SORT_OPTIONS = [
  { key: "effectiveFrom-desc", label: "Hiệu lực từ — mới nhất" },
  { key: "effectiveFrom-asc", label: "Hiệu lực từ — cũ nhất" },
  { key: "createdAt-desc", label: "Mới tạo gần nhất" },
  { key: "rate-desc", label: "Tỷ lệ nền tảng cao nhất" },
];

const EMPTY_FORM = {
  name: "",
  ratePercent: "30",
  effectiveFrom: "",
  effectiveTo: "",
  changeReason: "",
};

function formatDateTime(value) {
  if (!value) return "—";
  return formatDateTimeVN(value) || "—";
}

/** 0.30 → "30%" (bỏ phần .00 thừa). */
function formatRate(rate) {
  if (rate === null || rate === undefined) return "—";
  const n = Number(rate);
  if (Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}%`;
}

/**
 * Tỷ lệ mà ĐỐI TÁC nhận được = 100% − tỷ lệ hoa hồng nền tảng.
 * `commissionRate` trong DB là phần nền tảng giữ lại.
 */
function providerRate(rate) {
  if (rate === null || rate === undefined) return null;
  const n = Number(rate);
  if (Number.isNaN(n)) return null;
  return 1 - n;
}

function getErrorMessage(err, fallback) {
  return (
    err?.message ||
    err?.data?.message ||
    err?.response?.data?.message ||
    fallback
  );
}

/** Phân loại trạng thái hiển thị của một chính sách. */
function statusOf(policy) {
  if (!policy) return "expired";
  if (policy.cancelled) return "cancelled";
  if (policy.currentlyEffective) return "effective";
  if (policy.future) return "future";
  return "expired";
}

function toTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Số ngày (làm tròn) giữa hai mốc thời gian. */
function daysBetween(fromIso, toIso) {
  const a = toTime(fromIso);
  const b = toTime(toIso);
  if (a === null || b === null) return null;
  return Math.round((b - a) / 86_400_000);
}

/** "12 ngày" / "3 tháng 5 ngày" — thời lượng của một khoảng hiệu lực. */
function formatDuration(days) {
  if (days === null) return null;
  if (days <= 0) return "Dưới 1 ngày";
  if (days < 31) return `${days} ngày`;
  const months = Math.floor(days / 30);
  const rest = days % 30;
  return rest ? `${months} tháng ${rest} ngày` : `${months} tháng`;
}

/* =========================================================================
   THÀNH PHẦN HIỂN THỊ
   ========================================================================= */

/**
 * Thanh chia tỷ lệ: nền tảng (hoa hồng) vs đối tác (nhận được).
 * Dùng gradient để thị giác rõ phần chia, không dùng màu đen.
 */
function RateSplitBar({ rate, height = "h-2" }) {
  const platform = rate === null || rate === undefined ? null : Number(rate);
  const provider = providerRate(rate);
  if (platform === null || Number.isNaN(platform)) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const pct = Math.max(0, Math.min(100, platform * 100));
  const cP = RATE_COLORS.platform;
  const cR = RATE_COLORS.partner;
  return (
    <div
      className={`${height} flex w-full min-w-[110px] overflow-hidden rounded-full bg-slate-100`}
    >
      <div
        className={`h-full bg-gradient-to-r ${cP.barFrom} ${cP.barTo} transition-[width] duration-500`}
        style={{ width: `${pct}%` }}
        title={`Nền tảng: ${formatRate(platform)}`}
      />
      <div
        className={`h-full flex-1 bg-gradient-to-r ${cR.barFrom} ${cR.barTo} transition-[width] duration-500`}
        title={`Đối tác nhận: ${formatRate(provider)}`}
      />
    </div>
  );
}

/**
 * Vòng tròn (donut) chia tỷ lệ — dùng cho thẻ "chính sách đang áp dụng".
 * Vẽ bằng SVG: nền xám + cung "đối tác" + cung "nền tảng".
 */
function RateDonut({ rate, size = 132 }) {
  const platform = rate === null || rate === undefined ? null : Number(rate);
  if (platform === null || Number.isNaN(platform)) {
    return (
      <div
        className="flex items-center justify-center rounded-full border-[13px] border-slate-100 text-xs font-semibold text-slate-400"
        style={{ width: size, height: size }}
      >
        —
      </div>
    );
  }
  const p = Math.max(0, Math.min(100, platform * 100));
  const R = 42;
  const C = 2 * Math.PI * R;
  const platformLen = (p / 100) * C;
  const providerLen = C - platformLen;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/*
        SVG bị xoay -90° ⇒ điểm bắt đầu của vòng tròn (3 giờ) trở thành 12 giờ.
        • Cung "Nền tảng" vẽ trước, bắt đầu từ 12 giờ, chiều kim đồng hồ.
        • Cung "Đối tác" dùng `strokeDashoffset` âm để LỆCH đúng phần chiều dài
          của cung nền tảng ⇒ hai cung nối liền nhau, không chồng lấn, không hở.
      */}
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#f1f5f9" strokeWidth="13" />
        {/* Nền tảng — phần hoa hồng nền tảng giữ lại */}
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={RATE_COLORS.platform.hex}
          strokeWidth="13"
          strokeDasharray={`${platformLen} ${C - platformLen}`}
          strokeLinecap="butt"
        />
        {/* Đối tác — phần doanh thu đối tác nhận được */}
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={RATE_COLORS.partner.hex}
          strokeWidth="13"
          strokeDasharray={`${providerLen} ${C - providerLen}`}
          strokeDashoffset={-platformLen}
          strokeLinecap="butt"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-[10px] font-bold uppercase tracking-wide ${RATE_COLORS.platform.strong}`}
        >
          Nền tảng
        </span>
        <span className="text-2xl font-black leading-none tracking-tight text-slate-900 tabular-nums">
          {formatRate(platform)}
        </span>
        <span className={`mt-0.5 text-[10px] font-semibold ${RATE_COLORS.partner.strong}`}>
          Đối tác {formatRate(providerRate(platform))}
        </span>
      </div>
    </div>
  );
}

/** Chip hiển thị cả 2 tỷ lệ: nền tảng (hoa hồng) + đối tác (nhận được). */
function RateChips({ rate, size = "sm" }) {
  const platform = rate === null || rate === undefined ? null : Number(rate);
  const provider = providerRate(rate);
  const pad = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";
  const iconSize = size === "lg" ? 14 : 12;
  if (platform === null || Number.isNaN(platform)) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={`group inline-flex items-center gap-1 rounded-lg border ${RATE_COLORS.platform.chipBorder} bg-gradient-to-br ${RATE_COLORS.platform.chipFrom} ${RATE_COLORS.platform.chipTo} ${pad} font-bold ${RATE_COLORS.platform.chipText} transition-shadow`}
        title="Phần hoa hồng nền tảng giữ lại từ mỗi đơn đặt tour"
      >
        <BadgePercent size={iconSize} />
        Nền tảng {formatRate(platform)}
      </span>
      <span
        className={`group inline-flex items-center gap-1 rounded-lg border ${RATE_COLORS.partner.chipBorder} bg-gradient-to-br ${RATE_COLORS.partner.chipFrom} ${RATE_COLORS.partner.chipTo} ${pad} font-bold ${RATE_COLORS.partner.chipText} transition-shadow`}
        title="Phần doanh thu đối tác nhận được"
      >
        <Wallet size={iconSize} />
        Đối tác {formatRate(provider)}
      </span>
    </div>
  );
}

/** Badge trạng thái. */
function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.expired;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}
    >
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

/**
 * Chip đếm ngược tới khoảng hiệu lực.
 *
 * `now` được truyền từ ngoài vào (mốc thời gian chụp lúc tải dữ liệu) ⇒ không
 * gọi `Date.now()` trong render (vi phạm quy tắc purity của React).
 */
function CountdownChip({ policy, now }) {
  const from = toTime(policy.effectiveFrom);
  const to = toTime(policy.effectiveTo);
  if (policy.cancelled || !now) return null;
  if (policy.future && from !== null) {
    const days = Math.max(0, Math.ceil((from - now) / 86_400_000));
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
        <Clock size={10} /> Bắt đầu sau {days} ngày
      </span>
    );
  }
  if (policy.currentlyEffective) {
    if (to === null) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
          <ShieldCheck size={10} /> Đang áp dụng
        </span>
      );
    }
    const days = Math.max(0, Math.ceil((to - now) / 86_400_000));
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
        <Clock size={10} /> Kết thúc sau {days} ngày
      </span>
    );
  }
  return null;
}

/** Ô số liệu nhỏ. */
function StatTile({ icon: Icon, label, value, hint, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-500",
    emerald: "bg-emerald-50 text-emerald-600",
    sky: "bg-sky-50 text-sky-600",
    slate2: "bg-slate-100 text-slate-500",
    rose: "bg-rose-50 text-rose-600",
  };
  const t = tones[tone] || tones.slate;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-2xs">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t}`}>
        <Icon size={16} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-slate-500" title={label}>
          {label}
        </p>
        <p className="mt-0.5 flex items-baseline gap-1">
          <span className="text-lg font-bold leading-none tracking-tight text-slate-900 tabular-nums">
            {value}
          </span>
          {hint && (
            <span className="truncate text-[11px] font-semibold text-slate-400">{hint}</span>
          )}
        </p>
      </div>
    </div>
  );
}

/* =========================================================================
   FORM TẠO CHÍNH SÁCH (trong modal)
   ========================================================================= */

function CreatePolicyForm({ form, setForm, onSubmit }) {
  const ratePercent = Number(form.ratePercent);
  const validRate = Number.isFinite(ratePercent) && ratePercent > 0 && ratePercent < 100;
  const previewRate = validRate ? ratePercent / 100 : null;

  return (
    <form
      id="create-policy-form"
      onSubmit={onSubmit}
      className="space-y-5"
    >
      {/* ── Tên chính sách ── */}
      <div>
        <label
          htmlFor="policy-name"
          className="mb-1.5 block text-xs font-bold text-slate-700"
        >
          Tên chính sách <span className="text-rose-500">*</span>
        </label>
        <LimitedField
          as="input"
          id="policy-name"
          limit={150}
          counter="near"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Ví dụ: Chính sách hoa hồng 2026-Q1"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
        />
      </div>

      {/* ── Tỷ lệ hoa hồng ── */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <label
            htmlFor="policy-rate"
            className="block text-xs font-bold text-slate-700"
          >
            Tỷ lệ hoa hồng nền tảng <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-1.5">
            <input
              id="policy-rate"
              type="number"
              min="0.1"
              max="99.9"
              /*
                ⚠️ KHÔNG đặt `step` — với `step="0.5"`, giá trị `35` KHÔNG hợp lệ
                (lệch về 34.6/35.1) ⇒ trình duyệt chặn submit form ⇒ nút
                "Tạo chính sách" im lặng, không báo lỗi. `step="any"` cho phép
                nhập mọi giá trị; việc chặn 0% / 100% đã do validate JS đảm nhiệm.
              */
              step="any"
              value={form.ratePercent}
              onChange={(e) =>
                setForm((f) => ({ ...f, ratePercent: e.target.value }))
              }
              className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-right text-sm font-bold text-slate-900 tabular-nums outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
            />
            <span className="text-sm font-bold text-slate-500">%</span>
          </div>
        </div>

        <input
          type="range"
          min="1"
          max="99"
          /*
            `step="any"` để thanh trượt KHÔNG làm tròn tỷ lệ đã nhập tay
            (VD: nhập 35.3% ⇒ con trượt không được ép về 35.5%).
            Giá trị được kẹp trong [1, 99] vì `range` luôn kẹp theo min/max.
          */
          step="any"
          value={Math.min(99, Math.max(1, validRate ? ratePercent : 30))}
          onChange={(e) =>
            setForm((f) => ({ ...f, ratePercent: e.target.value }))
          }
          aria-label="Kéo để chỉnh tỷ lệ hoa hồng nền tảng"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-emerald-600"
        />
        <div className="mt-1 flex justify-between text-[10px] font-semibold text-slate-400">
          <span>1%</span>
          <span>50%</span>
          <span>99%</span>
        </div>

        {previewRate !== null && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Xem trước cách chia
            </p>
            <RateChips rate={previewRate} />
            <div className="mt-2.5">
              <RateSplitBar rate={previewRate} height="h-2.5" />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Trên mỗi 100.000 ₫ doanh thu, nền tảng giữ{" "}
              <strong className={RATE_COLORS.platform.strong}>
                {formatRate(previewRate)}
              </strong>{" "}
              hoa hồng và đối tác nhận{" "}
              <strong className={RATE_COLORS.partner.strong}>
                {formatRate(providerRate(previewRate))}
              </strong>
              .
            </p>
          </div>
        )}
      </div>

      {/* ── Khoảng hiệu lực ──
          ⚠️ Hai ô ngày PHẢI thẳng hàng nhau:
            • Nhãn có chiều cao CỐ ĐỊNH (`h-4`) ⇒ nhãn dài ("không xác định")
              không làm đẩy ô nhập xuống.
            • Ô nhập có chiều cao CỐ ĐỊNH (`h-11`) ⇒ các trình duyệt render
              `input[type=date]` với chiều cao khác nhau vẫn thẳng hàng. */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="policy-from"
            className="mb-1.5 flex h-4 items-center text-xs font-bold text-slate-700"
          >
            Ngày bắt đầu hiệu lực <span className="text-rose-500">*</span>
          </label>
          <input
            id="policy-from"
            type="date"
            value={form.effectiveFrom}
            onChange={(e) =>
              setForm((f) => ({ ...f, effectiveFrom: e.target.value }))
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
          />
        </div>
        <div>
          <label
            htmlFor="policy-to"
            className="mb-1.5 flex h-4 items-center text-xs font-bold text-slate-700"
          >
            Ngày kết thúc hiệu lực
            <span className="ml-1 font-normal text-slate-400">(không xác định)</span>
          </label>
          <input
            id="policy-to"
            type="date"
            value={form.effectiveTo}
            onChange={(e) =>
              setForm((f) => ({ ...f, effectiveTo: e.target.value }))
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
          />
        </div>
      </div>

      {/* ── Lý do thay đổi ── */}
      <div>
        <label
          htmlFor="policy-reason"
          className="mb-1.5 block text-xs font-bold text-slate-700"
        >
          Lý do thay đổi <span className="text-rose-500">*</span>
        </label>
        <LimitedField
          as="textarea"
          id="policy-reason"
          limit={1000}
          value={form.changeReason}
          onChange={(e) => setForm((f) => ({ ...f, changeReason: e.target.value }))}
          rows={3}
          placeholder="Ghi rõ lý do điều chỉnh tỷ lệ hoa hồng (bắt buộc theo quy định quản trị)"
          className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
        />
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/70 px-3.5 py-3 text-[11px] leading-relaxed text-sky-800">
        <Info size={14} className="mt-0.5 shrink-0 text-sky-500" />
        <span>
          Chính sách đang hiệu lực sẽ tự động kết thúc khi chính sách mới bắt đầu.
          Không thể tạo khoảng hiệu lực chồng lấn với chính sách đang có.
        </span>
      </div>
      {/*
        ⚠️ KHÔNG đặt nút ở đây — nút nằm ở CHÂN MODAL (`ModalShell footer`)
        ⇒ luôn nhìn thấy, không phải cuộn xuống cuối mới thấy.
      */}
    </form>
  );
}

/* =========================================================================
   TRANG QUẢN LÝ CHÍNH SÁCH HOA HỒNG (ADMIN)
   ========================================================================= */

export default function AdminCommissionPoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("effectiveFrom-desc");
  const [form, setForm] = useState(EMPTY_FORM);
  /*
   * Mốc thời gian chụp lúc tải dữ liệu — dùng cho mọi phép tính "còn bao lâu nữa".
   * ⚠️ Không gọi `Date.now()` trong render (React purity rule) ⇒ chụp 1 lần
   * mỗi lần nạp dữ liệu rồi truyền xuống các component con.
   */
  const [nowTs, setNowTs] = useState(null);

  const { confirm, confirmDialog } = useConfirm();

  const showToast = useCallback((text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, cur] = await Promise.all([
        listPolicies(),
        getCurrentPolicy(),
      ]);
      setPolicies(Array.isArray(list) ? list : []);
      setCurrent(cur ?? null);
      setNowTs(Date.now());
    } catch (e) {
      setError(getErrorMessage(e, "Không thể tải danh sách chính sách hoa hồng."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Gọi trong IIFE bất đồng bộ ⇒ không `setState` đồng bộ trong effect
    // (tránh cascading render — rule `react-hooks/set-state-in-effect`).
    (async () => {
      await load();
    })();
  }, [load]);

  /* ── Số liệu tổng quan ── */
  const counts = useMemo(() => {
    const c = { all: policies.length, effective: 0, future: 0, expired: 0, cancelled: 0 };
    policies.forEach((p) => {
      c[statusOf(p)] += 1;
    });
    return c;
  }, [policies]);

  /** Chính sách sắp hiệu lực gần nhất — để nhắc Admin lên lịch. */
  const nextPolicy = useMemo(() => {
    return (
      policies
        .filter((p) => p.future && !p.cancelled)
        .sort((a, b) => (toTime(a.effectiveFrom) ?? 0) - (toTime(b.effectiveFrom) ?? 0))[0] ??
      null
    );
  }, [policies]);

  /* ── Lọc + tìm kiếm + sắp xếp ── */
  const visiblePolicies = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = policies.filter((p) => {
      if (statusFilter !== "all" && statusOf(p) !== statusFilter) return false;
      if (!needle) return true;
      return (
        (p.name || "").toLowerCase().includes(needle) ||
        (p.changeReason || "").toLowerCase().includes(needle) ||
        (p.createdByName || "").toLowerCase().includes(needle)
      );
    });

    const byTime = (v) => toTime(v) ?? 0;
    const sorters = {
      "effectiveFrom-desc": (a, b) => byTime(b.effectiveFrom) - byTime(a.effectiveFrom),
      "effectiveFrom-asc": (a, b) => byTime(a.effectiveFrom) - byTime(b.effectiveFrom),
      "createdAt-desc": (a, b) => byTime(b.createdAt) - byTime(a.createdAt),
      "rate-desc": (a, b) => Number(b.commissionRate ?? 0) - Number(a.commissionRate ?? 0),
    };
    list = [...list].sort(sorters[sortKey] || sorters["effectiveFrom-desc"]);
    return list;
  }, [policies, query, statusFilter, sortKey]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const ratePercent = Number(form.ratePercent);
    if (!form.name.trim()) {
      showToast("Vui lòng nhập tên chính sách.", "error");
      return;
    }
    if (!Number.isFinite(ratePercent) || ratePercent <= 0 || ratePercent >= 100) {
      showToast("Tỷ lệ hoa hồng phải lớn hơn 0% và nhỏ hơn 100%.", "error");
      return;
    }
    if (!form.effectiveFrom) {
      showToast("Vui lòng chọn ngày bắt đầu hiệu lực.", "error");
      return;
    }
    if (form.effectiveTo && form.effectiveTo < form.effectiveFrom) {
      showToast("Ngày kết thúc phải sau ngày bắt đầu hiệu lực.", "error");
      return;
    }
    if (!form.changeReason.trim()) {
      showToast("Vui lòng nêu lý do thay đổi (bắt buộc).", "error");
      return;
    }

    setSaving(true);
    try {
      await createPolicy({
        name: form.name.trim(),
        commissionRate: ratePercent / 100,
        effectiveFrom: new Date(form.effectiveFrom).toISOString(),
        effectiveTo: form.effectiveTo
          ? new Date(form.effectiveTo).toISOString()
          : null,
        changeReason: form.changeReason.trim(),
      });
      showToast("Đã tạo chính sách hoa hồng mới.");
      setShowForm(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, "Không thể tạo chính sách hoa hồng."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (policy) => {
    const reason = await confirm({
      tone: "danger",
      icon: "reject",
      title: "Hủy chính sách hoa hồng?",
      subject: policy.name,
      description:
        "Chỉ chính sách chưa tới ngày hiệu lực mới có thể hủy. " +
        "Lý do hủy là bắt buộc và sẽ được ghi lại.",
      confirmLabel: "Hủy chính sách",
      cancelLabel: "Giữ lại",
      input: {
        label: "Lý do hủy",
        placeholder: "Ví dụ: Tỷ lệ chưa phù hợp thị trường, cần điều chỉnh...",
        required: true,
      },
    });
    if (!reason) return;

    try {
      await cancelPolicy(policy.id, reason);
      showToast("Đã hủy chính sách hoa hồng.");
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, "Không thể hủy chính sách hoa hồng."), "error");
    }
  };

  const currentDuration =
    current?.effectiveFrom && current?.effectiveTo
      ? formatDuration(daysBetween(current.effectiveFrom, current.effectiveTo))
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* ══════════ HEADER ══════════
          Mô tả dài đã được gỡ bỏ ⇒ header gọn, tiết kiệm chiều cao
          ⇒ danh sách bên dưới được kéo lên. */}
      <div className="shrink-0 rounded-2xl border border-slate-200/90 bg-white px-5 py-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-1 items-center gap-x-4 gap-y-1">
            <h1 className="shrink-0 text-lg font-bold text-slate-900 sm:text-xl">
              Quản lý chính sách hoa hồng
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Làm mới
            </button>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <Plus size={14} />
              Tạo chính sách
            </button>
          </div>
        </div>
      </div>

      {/* ══════════ THẺ "ĐANG ÁP DỤNG" + SỐ LIỆU ══════════ */}
      <div className="grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Chính sách đang hiệu lực */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-2xs lg:col-span-2">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-emerald-100/50 blur-2xl" />
          <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <RateDonut rate={current?.commissionRate} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  <TrendingUp size={12} />
                  Tỷ lệ đang áp dụng
                </span>
                {current?.currentlyEffective && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
                    <CheckCircle2 size={12} />
                    Đang hiệu lực
                  </span>
                )}
              </div>

              {current ? (
                <>
                  <p
                    className="mt-3 truncate text-base font-bold text-slate-900"
                    title={current.name}
                  >
                    {current.name}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Hiệu lực từ{" "}
                    <strong className="font-semibold text-slate-800">
                      {formatDateTime(current.effectiveFrom)}
                    </strong>
                    {current.effectiveTo ? (
                      <>
                        {" "}
                        đến{" "}
                        <strong className="font-semibold text-slate-800">
                          {formatDateTime(current.effectiveTo)}
                        </strong>
                      </>
                    ) : (
                      <span className="text-slate-500"> — không xác định</span>
                    )}
                    {currentDuration && (
                      <span className="text-slate-500"> · kéo dài {currentDuration}</span>
                    )}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <RateChips rate={current.commissionRate} size="lg" />
                  </div>

                  <div className="mt-3">
                    <RateSplitBar rate={current.commissionRate} height="h-2.5" />
                    <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold">
                      <span
                        className={`inline-flex items-center gap-1 ${RATE_COLORS.platform.strong}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${RATE_COLORS.platform.dot}`}
                        />
                        Nền tảng thu {formatRate(current.commissionRate)} hoa hồng
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 ${RATE_COLORS.partner.strong}`}
                      >
                        Đối tác nhận {formatRate(providerRate(current.commissionRate))}
                        <span
                          className={`h-2 w-2 rounded-full ${RATE_COLORS.partner.dot}`}
                        />
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-dashed border-emerald-300 bg-white/70 px-3.5 py-3 text-xs leading-relaxed text-slate-600">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                  <span>
                    Chưa có chính sách nào đang hiệu lực — hãy tạo một chính sách để
                    áp dụng tỷ lệ hoa hồng cho các đơn đặt tour.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Số liệu tổng quan */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
          <StatTile
            icon={BadgePercent}
            label="Tổng chính sách"
            value={counts.all}
            hint="chính sách"
            tone="slate"
          />
          <StatTile
            icon={CheckCircle2}
            label="Đang hiệu lực"
            value={counts.effective}
            hint="đang chạy"
            tone="emerald"
          />
          <StatTile
            icon={CalendarClock}
            label="Sắp hiệu lực"
            value={counts.future}
            hint="đã lên lịch"
            tone="sky"
          />
          <StatTile
            icon={CircleSlash}
            label="Đã kết thúc / hủy"
            value={counts.expired + counts.cancelled}
            hint="lịch sử"
            tone="rose"
          />
        </div>
      </div>

      {/* ══════════ DANH SÁCH ══════════ */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
        {/* Bộ lọc + tìm kiếm */}
        <div className="shrink-0 border-b border-slate-100 px-4 py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            {/* Tab trạng thái */}
            <div
              role="tablist"
              aria-label="Lọc theo trạng thái chính sách"
              className="flex min-w-0 flex-wrap items-center gap-1.5"
            >
              {FILTERS.map((f) => {
                const isActive = statusFilter === f.key;
                const count = counts[f.key] ?? 0;
                return (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setStatusFilter(f.key)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? "border-slate-800 bg-slate-900 text-white shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {f.label}
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tìm kiếm + sắp xếp */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1 sm:flex-none">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm theo tên, lý do, người tạo…"
                  aria-label="Tìm chính sách hoa hồng"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60 sm:w-64"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Xoá tìm kiếm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="relative">
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value)}
                  aria-label="Sắp xếp danh sách"
                  className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-slate-600 outline-none transition hover:bg-slate-50 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ArrowDown
                  size={13}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bảng — cuộn RIÊNG bên trong, trang ngoài không cuộn */}
        <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Đang tải chính sách hoa hồng...
            </div>
          ) : error ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                <AlertTriangle size={22} />
              </div>
              <p className="text-sm font-semibold text-rose-600">{error}</p>
              <button
                type="button"
                onClick={load}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <RefreshCw size={13} />
                Thử lại
              </button>
            </div>
          ) : visiblePolicies.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Inbox size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">
                  {policies.length === 0
                    ? "Chưa có chính sách hoa hồng nào"
                    : "Không tìm thấy chính sách phù hợp"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {policies.length === 0
                    ? "Bấm “Tạo chính sách” để thiết lập tỷ lệ hoa hồng đầu tiên."
                    : "Thử đổi từ khoá tìm kiếm hoặc chọn trạng thái khác."}
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full min-w-[980px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Tên chính sách</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Chia tỷ lệ
                    <span className="block text-[10px] font-normal normal-case tracking-normal text-slate-400">
                      Nền tảng · Đối tác
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Khoảng hiệu lực
                    <span className="block text-[10px] font-normal normal-case tracking-normal text-slate-400">
                      Từ — đến
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Người thực hiện</th>
                  <th className="px-4 py-3 text-left font-semibold">Lý do</th>
                  <th className="px-4 py-3 text-left font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visiblePolicies.map((p) => {
                  const key = statusOf(p);
                  const duration = formatDuration(
                    daysBetween(p.effectiveFrom, p.effectiveTo),
                  );
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors hover:bg-slate-50/70 ${
                        key === "effective" ? "bg-emerald-50/30" : ""
                      }`}
                    >
                      {/* Tên */}
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-start gap-2">
                          {key === "effective" && (
                            <span
                              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-100"
                              title="Chính sách đang hiệu lực"
                            />
                          )}
                          <div className="min-w-0">
                            <p
                              className="font-semibold text-slate-900"
                              title={p.name}
                            >
                              {p.name}
                            </p>
                            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                              #{p.id} · tạo {formatDateTime(p.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Chia tỷ lệ */}
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1.5">
                          <RateChips rate={p.commissionRate} />
                          <RateSplitBar rate={p.commissionRate} />
                        </div>
                      </td>

                      {/* Khoảng hiệu lực */}
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1 text-xs">
                          <p className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                            <CalendarDays size={12} className="text-slate-400" />
                            {formatDateTime(p.effectiveFrom)}
                          </p>
                          <p className="pl-[18px] text-slate-500">
                            {p.effectiveTo
                              ? `→ ${formatDateTime(p.effectiveTo)}`
                              : "→ Không xác định"}
                          </p>
                          <div className="flex flex-wrap items-center gap-1 pl-[18px]">
                            {duration && (
                              <span className="text-[10px] font-semibold text-slate-400">
                                {duration}
                              </span>
                            )}
                            <CountdownChip policy={p} now={nowTs} />
                          </div>
                        </div>
                      </td>

                      {/* Người thực hiện */}
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                            <User size={12} />
                          </span>
                          <span className="max-w-[140px] truncate">
                            {p.createdByName || "—"}
                          </span>
                        </span>
                      </td>

                      {/* Lý do */}
                      <td className="max-w-[240px] px-4 py-3 align-top">
                        <p
                          className="line-clamp-2 text-xs leading-relaxed text-slate-600"
                          title={p.changeReason || undefined}
                        >
                          {p.changeReason || "—"}
                        </p>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-3 align-top">
                        <StatusPill status={key} />
                      </td>

                      {/* Thao tác */}
                      <td className="px-4 py-3 text-right align-top">
                        {p.future && !p.cancelled ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(p)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                          >
                            <XCircle size={13} />
                            Hủy
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <ShieldCheck size={12} />
                            {p.cancelled ? "Đã hủy" : "Bất biến"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Chân bảng — thống kê nhanh */}
        {!loading && !error && policies.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[11px] text-slate-500">
            <span>
              Hiển thị{" "}
              <strong className="font-bold text-slate-700">
                {visiblePolicies.length}
              </strong>{" "}
              / {policies.length} chính sách
              {nextPolicy && (
                <>
                  {" · "}
                  <span className="text-sky-700">
                    chính sách kế tiếp “{nextPolicy.name}” bắt đầu{" "}
                    {formatDateTime(nextPolicy.effectiveFrom)}
                  </span>
                </>
              )}
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowUp size={11} />
              Tất toán dùng tỷ lệ chụp tại thời điểm phát sinh doanh thu
            </span>
          </div>
        )}
      </section>

      {/* ══════════ MODAL TẠO CHÍNH SÁCH ══════════ */}
      {showForm && (
        <ModalShell
          title="Tạo chính sách hoa hồng mới"
          subtitle="Chính sách mới sẽ tự động kết thúc chính sách đang hiệu lực khi tới ngày bắt đầu."
          onClose={() => {
            if (!saving) {
              setShowForm(false);
              setForm(EMPTY_FORM);
            }
          }}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                }}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="create-policy-form"
                disabled={saving}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Tạo chính sách
              </button>
            </>
          }
        >
          <CreatePolicyForm
            form={form}
            setForm={setForm}
            onSubmit={handleCreate}
          />
        </ModalShell>
      )}

      {/* ══════════ TOAST ══════════ */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[400] flex max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-2xl ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          )}
          <span className="leading-relaxed">{toast.text}</span>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
