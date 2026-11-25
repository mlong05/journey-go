"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Gift,
  Info,
  Loader2,
  RotateCw,
  Save,
  Sparkles,
  Trophy,
} from "lucide-react";
import { rewardSettingService } from "../services/catalogAdminService";
import { formatDateTimeVN } from "@/lib/money";

/* =========================================================================
   HẰNG SỐ & HELPERS
   ========================================================================= */

/**
 * Mô tả minh hoạ cho từng mức điểm — giúp Admin hiểu ngay "1 điểm này
 * tương đương bao nhiêu khi khách hoàn thành nhiều câu / nhiều trải nghiệm".
 *
 * ⚠️ `items` là số câu hỏi / trải nghiệm trong MỘT tour (đại diện) ⇒ dùng
 * để tính "tổng điểm tối đa" cho một tour.
 */
const REWARD_META = {
  QUIZ_QUESTION: {
    label: "Điểm mỗi câu đố văn hóa",
    icon: Sparkles,
    accent: "violet",
    exampleItems: 4,
    unit: "câu hỏi",
    hint: "Khách trả lời đúng câu nào nhận điểm của câu đó.",
  },
  REAL_WORLD_EXPERIENCE: {
    label: "Điểm mỗi trải nghiệm thực tế",
    icon: Trophy,
    accent: "amber",
    exampleItems: 3,
    unit: "trải nghiệm",
    hint: "Khách hoàn thành trải nghiệm và trả lời đúng câu hỏi thì nhận điểm.",
  },
};

/** Bảng màu theo nhóm — dùng chung cho icon, viền và nhãn. */
const ACCENTS = {
  violet: {
    icon: "bg-violet-50 text-violet-700 border-violet-200",
    chip: "bg-violet-50 text-violet-700 border-violet-200",
    text: "text-violet-700",
    ring: "focus:border-violet-500 focus:ring-violet-500/20",
    button: "bg-violet-600 hover:bg-violet-700",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700 border-amber-200",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    text: "text-amber-700",
    ring: "focus:border-amber-500 focus:ring-amber-500/20",
    button: "bg-amber-500 hover:bg-amber-600",
  },
};

const MIN_POINTS = 1;
const MAX_POINTS = 10000;

/**
 * Tổng điểm tối đa của một tour khi dùng mức điểm hiện tại.
 */
function maxTotal(setting, points) {
  const meta = REWARD_META[setting?.code];
  if (!meta) return null;
  const p = Number(points);
  if (!Number.isFinite(p)) return null;
  return p * meta.exampleItems;
}

function getErrorMessage(err, fallback) {
  return (
    err?.message ||
    err?.data?.message ||
    err?.response?.data?.message ||
    fallback
  );
}

/* =========================================================================
   Ô SỐ LIỆU NHỎ
   ========================================================================= */

function StatTile({ icon: Icon, label, value, hint, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-500",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
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
   THẺ CẤU HÌNH 1 MỨC ĐIỂM
   ========================================================================= */

/**
 * Thẻ cấu hình 1 mức điểm — ô nhập số trực tiếp, nút lưu chỉ bật khi
 * GIÁ TRỊ THAY ĐỔI so với dữ liệu đang lưu.
 *
 * ⚠️ Không tự động lưu khi blur — Admin có thể đang nhập dở số (VD "1" rồi
 * định gõ "10") ⇒ tự lưu sẽ ghi sai giá trị. Chỉ lưu khi bấm nút.
 */
function RewardSettingRow({ setting, draftPoints, onDraftChange, onSave, saving }) {
  const meta = REWARD_META[setting?.code] ?? {
    label: setting?.label ?? "—",
    icon: Gift,
    accent: "violet",
    exampleItems: 1,
    unit: "lần",
    hint: "",
  };
  const accent = ACCENTS[meta.accent] ?? ACCENTS.violet;
  const Icon = meta.icon;

  const current = Number(setting?.points);
  const draft = Number(draftPoints);
  const changed = Number.isFinite(draft) && draft !== current;
  const valid = Number.isInteger(draft) && draft >= MIN_POINTS && draft <= MAX_POINTS;

  const total = maxTotal(setting, draftPoints);
  const currentTotal = maxTotal(setting, current);
  const delta = valid && total !== null && currentTotal !== null ? total - currentTotal : 0;

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
      {/* ── Đầu thẻ: icon + tên ──
          ⚠️ KHÔNG hiển thị MÃ KỸ THUẬT (VD "QUIZ_QUESTION",
          "REAL_WORLD_EXPERIENCE") — đây là enum nội bộ của backend, Admin
          không cần thấy. Tên hiển thị bên dưới đã nói đủ ý nghĩa. */}
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${accent.icon}`}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-slate-900">{meta.label}</h4>
          {meta.hint && (
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{meta.hint}</p>
          )}
        </div>
      </div>

      {/* ── Ô nhập + nút lưu ── */}
      <div className="flex flex-wrap items-end gap-2.5">
        <div>
          <label
            htmlFor={`points-${setting?.code}`}
            className="mb-1.5 block text-[11px] font-bold text-slate-600"
          >
            Số điểm
          </label>
          <div className="relative w-32">
            <input
              id={`points-${setting?.code}`}
              type="number"
              inputMode="numeric"
              min={MIN_POINTS}
              max={MAX_POINTS}
              value={draftPoints ?? ""}
              onChange={(e) => onDraftChange(e.target.value)}
              aria-label={`Số điểm cho ${meta.label}`}
              className={`w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-11 text-sm font-bold tabular-nums text-slate-900 outline-none transition focus:bg-white focus:ring-4 ${accent.ring}`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
              điểm
            </span>
          </div>
        </div>

        {/*
          ⚠️ Nút "Lưu" — CHỈ bật khi giá trị ĐÃ THAY ĐỔI và hợp lệ.
          Khi chưa đổi ⇒ nút ở trạng thái "ghost" (nền trắng, viền slate, chữ
          xám) chứ KHÔNG phải nền đậm mờ đi (opacity) — nhìn dễ hiểu hơn là
          "nút bị vô hiệu" so với "nút bị làm mờ".

          ⚠️ `h-9` (36px) đồng bộ với chiều cao ô nhập (py-2 + text-sm) ⇒ 2
          phần tử nằm cùng baseline, không lệch nhau.
        */}
        <button
          type="button"
          onClick={() => onSave(setting.code)}
          disabled={!changed || !valid || saving}
          aria-label={`Lưu ${meta.label}`}
          className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-colors disabled:cursor-not-allowed ${
            changed && valid
              ? `${accent.button} text-white shadow-2xs`
              : "border border-slate-200 bg-slate-100 text-slate-400"
          }`}
        >
          {saving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Save size={13} />
          )}
          {saving ? "Đang lưu..." : "Lưu"}
        </button>

        {changed && !valid && (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
            <AlertTriangle size={12} />
            Số điểm phải là số nguyên từ {MIN_POINTS} đến {MAX_POINTS}.
          </p>
        )}
      </div>

      {/* ── Minh hoạ: tổng điểm tối đa của một tour ── */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Minh hoạ
        </p>
        {total !== null && valid ? (
          <>
            <p className="mt-1 text-xs leading-relaxed text-slate-700">
              Đối tác tạo tour có{" "}
              <strong className="font-bold text-slate-900">
                {meta.exampleItems} {meta.unit}
              </strong>{" "}
              ⇒ khách nhận tối đa{" "}
              <strong className={`font-bold ${accent.text}`}>
                {total.toLocaleString("vi-VN")} điểm
              </strong>{" "}
              cho phần này.
            </p>
            {changed && delta !== 0 && (
              <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <RotateCw size={11} />
                Thay đổi{" "}
                <span
                  className={`font-bold ${delta > 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta.toLocaleString("vi-VN")}
                </span>{" "}
                so với mức hiện tại (
                {currentTotal?.toLocaleString("vi-VN")} điểm)
              </p>
            )}
          </>
        ) : (
          <p className="mt-1 text-xs text-slate-500">
            Nhập số điểm hợp lệ để xem minh hoạ.
          </p>
        )}
      </div>

      {/* ── Người sửa gần nhất ── */}
      {setting?.updatedAt && (
        <p className="text-[10px] text-slate-400">
          Sửa lần cuối {formatDateTimeVN(setting.updatedAt)}
          {setting.updatedByName ? ` bởi ${setting.updatedByName}` : ""}
        </p>
      )}
    </div>
  );
}

/* =========================================================================
   THẺ QUẢN LÝ ĐIỂM THƯỞNG
   ========================================================================= */

/**
 * Quản lý điểm thưởng (Admin): điểm mỗi câu đố văn hóa và mỗi trải nghiệm thực tế.
 * Đối tác chỉ xem (hiển thị mờ); điểm được chốt vào tour khi Moderator duyệt.
 */
export default function RewardSettingsCard() {
  const [settings, setSettings] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await rewardSettingService.getAll();
      const arr = Array.isArray(list) ? list : [];
      setSettings(arr);
      setDraft(Object.fromEntries(arr.map((s) => [s.code, s.points])));
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được cấu hình điểm thưởng."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Gọi trong microtask để không `setState` đồng bộ trong effect
    // (rule `react-hooks/set-state-in-effect`).
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const save = async (code) => {
    const points = Number(draft[code]);
    if (!Number.isInteger(points) || points < MIN_POINTS || points > MAX_POINTS) {
      setError(`Số điểm phải là số nguyên từ ${MIN_POINTS} đến ${MAX_POINTS}.`);
      return;
    }
    setSaving(code);
    setError("");
    setMessage("");
    try {
      const updated = await rewardSettingService.update(code, points);
      setSettings((prev) => prev.map((s) => (s.code === code ? updated : s)));
      setDraft((prev) => ({ ...prev, [code]: updated.points }));
      setMessage(
        "Đã lưu. Mức mới áp dụng cho các tour được duyệt từ bây giờ; tour đã duyệt giữ nguyên điểm đã chốt.",
      );
    } catch (err) {
      setError(getErrorMessage(err, "Lưu thất bại."));
    } finally {
      setSaving(null);
    }
  };

  /** Tổng điểm tối đa của một tour (cộng lại các mức đang áp dụng). */
  const grandTotal = useMemo(() => {
    let sum = 0;
    for (const s of settings) {
      const t = maxTotal(s, s.points);
      if (t) sum += t;
    }
    return sum;
  }, [settings]);

  const totalPointsPerUnit = useMemo(
    () => settings.reduce((sum, s) => sum + (Number(s.points) || 0), 0),
    [settings],
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
      {/* ── Header ── */}
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
            <Gift size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">
              Mức điểm thưởng
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Đặt điểm cho mỗi câu đố văn hóa và mỗi trải nghiệm thực tế
              của tour. Đối tác xem điểm khi tạo tour nhưng không sửa được.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
            {settings.length} mức điểm
          </span>
          <button
            type="button"
            onClick={load}
            aria-label="Tải lại cấu hình điểm thưởng"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <RotateCw size={13} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* ── Thân ── */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 px-6 py-16 text-xs font-semibold text-slate-400">
          <Loader2 size={16} className="animate-spin" />
          Đang tải cấu hình điểm thưởng...
        </div>
      ) : error && settings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <AlertTriangle size={22} />
          </div>
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button
            type="button"
            onClick={load}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <RotateCw size={13} />
            Thử lại
          </button>
        </div>
      ) : settings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Gift size={22} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">
              Chưa có mức điểm thưởng nào
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Hệ thống chưa khởi tạo cấu hình điểm mặc định.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-5">
          {/* ── Số liệu tổng quan ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              icon={Gift}
              label="Mức điểm đang cấu hình"
              value={settings.length}
              hint="mức"
              tone="slate"
            />
            <StatTile
              icon={Sparkles}
              label="Tổng điểm mỗi đơn vị"
              value={totalPointsPerUnit.toLocaleString("vi-VN")}
              hint="điểm"
              tone="violet"
            />
            <StatTile
              icon={Trophy}
              label="Điểm tối đa một tour"
              value={grandTotal.toLocaleString("vi-VN")}
              hint="điểm"
              tone="amber"
            />
          </div>

          {/* ── Thông báo ── */}
          {message && (
            <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-emerald-700">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              {message}
            </p>
          )}
          {error && (
            <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-rose-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          {/* ── Danh sách mức điểm ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {settings.map((s) => (
              <RewardSettingRow
                key={s.code}
                setting={s}
                draftPoints={draft[s.code]}
                saving={saving === s.code}
                onDraftChange={(v) =>
                  setDraft((prev) => ({ ...prev, [s.code]: v }))
                }
                onSave={save}
              />
            ))}
          </div>

          {/* ── Ghi chú nghiệp vụ ── */}
          <p className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/70 px-3.5 py-3 text-[11px] leading-relaxed text-sky-800">
            <Info size={14} className="mt-0.5 shrink-0 text-sky-500" />
            <span>
              Mức điểm được chốt vào tour tại thời điểm duyệt. Sửa ở đây chỉ có
              hiệu lực với các tour được duyệt từ thời điểm này trở đi — các
              tour đã duyệt giữ nguyên điểm đã chốt.
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
