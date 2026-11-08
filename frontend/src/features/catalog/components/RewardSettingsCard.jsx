"use client";

import React, { useEffect, useState } from "react";
import { Gift, Loader2, Save, CheckCircle2 } from "lucide-react";
import { rewardSettingService } from "../services/catalogAdminService";

const EXAMPLE = {
  TOUR_TASK: (p) => `Điểm đến có 3 nhiệm vụ ⇒ mỗi nhiệm vụ ${p} điểm, tối đa ${p * 3} điểm. Khách hoàn thành nhiệm vụ (quiz và trải nghiệm thực tế) thì nhận điểm.`,
};

/**
 * Quản lý điểm thưởng (Admin): điểm mỗi nhiệm vụ của điểm đến (gồm quiz và trải nghiệm thực tế).
 * Đối tác chỉ xem (hiển thị mờ); điểm được chốt vào tour khi Moderator duyệt.
 */
export default function RewardSettingsCard() {
  const [settings, setSettings] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    rewardSettingService.getAll()
      .then((list) => {
        setSettings(list);
        setDraft(Object.fromEntries(list.map((s) => [s.code, s.points])));
      })
      .catch((err) => setError(err?.message || "Không tải được cấu hình điểm thưởng."))
      .finally(() => setLoading(false));
  }, []);

  const save = async (code) => {
    const points = Number(draft[code]);
    if (!Number.isInteger(points) || points < 1) {
      setError("Số điểm phải là số nguyên lớn hơn 0.");
      return;
    }
    setSaving(code);
    setError("");
    setMessage("");
    try {
      const updated = await rewardSettingService.update(code, points);
      setSettings((prev) => prev.map((s) => (s.code === code ? updated : s)));
      setMessage("Đã lưu. Mức mới áp dụng cho các tour được duyệt từ bây giờ; tour đã duyệt giữ nguyên điểm đã chốt.");
    } catch (err) {
      setError(err?.message || "Lưu thất bại.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
      <div className="pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Gift size={16} className="text-amber-600" />
          <h3 className="text-sm font-bold text-slate-900">Quản Lý Điểm Thưởng Tour</h3>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Áp dụng cho mỗi nhiệm vụ của điểm đến (gồm câu hỏi quiz và trải nghiệm thực tế). Điểm được chốt vào tour khi Moderator duyệt. Đối tác thấy điểm khi tạo tour nhưng không sửa được.
        </p>
      </div>

      {loading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs font-bold"><Loader2 size={16} className="animate-spin" />Đang tải…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settings.map((s) => {
            const changed = Number(draft[s.code]) !== s.points;
            return (
              <div key={s.code} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900">{s.label}</span>
                  <span className="font-mono text-[10px] text-slate-400">{s.code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-32">
                    <input type="number" min={1} max={10000} value={draft[s.code] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [s.code]: e.target.value }))}
                      className="w-full px-3 py-2 pr-12 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">điểm</span>
                  </div>
                  <button type="button" disabled={!changed || saving === s.code} onClick={() => save(s.code)}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer">
                    {saving === s.code ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Lưu
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">{EXAMPLE[s.code]?.(Number(draft[s.code]) || 0)}</p>
                {s.updatedAt && (
                  <p className="text-[10px] text-slate-400">Sửa lần cuối {new Date(s.updatedAt).toLocaleString("vi-VN")}{s.updatedByName ? ` bởi ${s.updatedByName}` : ""}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {message && <p className="text-xs font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 size={13} />{message}</p>}
      {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
    </div>
  );
}
