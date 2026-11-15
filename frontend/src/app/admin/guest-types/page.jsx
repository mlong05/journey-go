"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, RotateCcw, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardUI";
import { LimitedField } from "@/components/ui/LimitedField";
import { apiClient } from "@/services/apiClient";
import { setGuestTypesCache } from "@/lib/guestTypes";

/** Thứ tự theo tuổi tăng dần — khoảng tuổi liền nhau theo thứ tự này (khớp GuestType.BY_AGE ở backend). */
const ORDER = ["INFANT", "TODDLER", "CHILD", "ADULT"];
const DEFAULTS = {
  INFANT: { label: "Em bé", minAge: 0, alwaysFree: true },
  TODDLER: { label: "Trẻ nhỏ", minAge: 2, alwaysFree: false },
  CHILD: { label: "Trẻ em", minAge: 5, alwaysFree: false },
  ADULT: { label: "Người lớn", minAge: 12, alwaysFree: false },
};
const TONE = {
  INFANT: { bar: "bg-pink-400", dot: "bg-pink-400", text: "text-pink-700" },
  TODDLER: { bar: "bg-amber-400", dot: "bg-amber-400", text: "text-amber-700" },
  CHILD: { bar: "bg-sky-400", dot: "bg-sky-400", text: "text-sky-700" },
  ADULT: { bar: "bg-emerald-500", dot: "bg-emerald-500", text: "text-emerald-700" },
};

const toRows = (list) => ORDER.map((t) => {
  const g = list.find((x) => x.guestType === t) || { guestType: t, ...DEFAULTS[t] };
  return { guestType: t, label: g.label, minAge: String(g.minAge), alwaysFree: !!g.alwaysFree };
});
const ageRangeText = (min, max) => (max == null ? `${min} tuổi trở lên` : min === 0 ? `Dưới ${max + 1} tuổi` : min === max ? `${min} tuổi` : `${min} – ${max} tuổi`);

/** Kiểm tra giống backend: loại nhỏ nhất từ 0 tuổi, tuổi bắt đầu tăng dần, tên không trùng, Người lớn không miễn phí. */
function validate(rows) {
  const errs = {};
  const names = new Map();
  let prev = -1;
  rows.forEach((r, i) => {
    const e = {};
    const label = r.label.trim();
    if (!label) e.label = "Nhập tên";
    else if (names.has(label.toLowerCase())) e.label = "Tên bị trùng";
    names.set(label.toLowerCase(), true);
    const n = Number(r.minAge);
    if (r.minAge === "" || !Number.isInteger(n) || n < 0 || n > 120) e.minAge = "Tuổi 0 – 120";
    else if (i === 0 && n !== 0) e.minAge = "Phải bắt đầu từ 0";
    else if (i > 0 && n <= prev) e.minAge = `Phải lớn hơn ${prev}`;
    if (Number.isInteger(n)) prev = n;
    if (r.guestType === "ADULT" && r.alwaysFree) e.alwaysFree = "Người lớn không được miễn phí";
    if (Object.keys(e).length) errs[r.guestType] = e;
  });
  return errs;
}

export default function AdminGuestTypesPage() {
  const [saved, setSaved] = useState(null);
  const [rows, setRows] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    apiClient.get("/guest-types")
      .then((res) => { const list = res?.data || []; setSaved(toRows(list)); setRows(toRows(list)); })
      .catch((e) => setLoadError(e?.message || "Không tải được cấu hình loại khách."));
  }, []);

  const errors = useMemo(() => (rows ? validate(rows) : {}), [rows]);
  const valid = rows && Object.keys(errors).length === 0;
  const dirty = rows && saved && JSON.stringify(rows) !== JSON.stringify(saved);
  const withMax = useMemo(() => (rows || []).map((r, i) => {
    const next = rows[i + 1];
    const min = Number(r.minAge);
    const max = next ? Number(next.minAge) - 1 : null;
    return { ...r, min, max, ok: !errors[r.guestType]?.minAge && (max == null || max >= min) };
  }), [rows, errors]);

  const set = (t, patch) => { setMsg(null); setRows((rs) => rs.map((r) => (r.guestType === t ? { ...r, ...patch } : r))); };

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true); setMsg(null);
    try {
      const res = await apiClient.put("/guest-types", {
        items: rows.map((r) => ({ guestType: r.guestType, label: r.label.trim(), minAge: Number(r.minAge), alwaysFree: r.alwaysFree })),
      });
      const list = res?.data || [];
      setGuestTypesCache(list);
      setSaved(toRows(list)); setRows(toRows(list));
      setMsg({ ok: true, text: "Đã lưu. Cấu hình mới áp dụng cho các đơn đặt từ bây giờ." });
    } catch (e) {
      setMsg({ ok: false, text: e?.message || "Không lưu được cấu hình." });
    } finally { setBusy(false); }
  };

  // Thang tuổi minh hoạ: 0 → (tuổi bắt đầu Người lớn + 8), tối thiểu 20.
  const scaleMax = Math.max(20, (Number(rows?.[3]?.minAge) || 12) + 8);

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Danh mục" title="Loại khách & độ tuổi"
        description="Đặt tên hiển thị, độ tuổi và loại miễn phí cho 4 loại khách. Đối tác nhập giá theo từng loại; khi khách đặt tour, loại vé được tính theo tuổi tại ngày đi tour." />

      {loadError && <p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"><AlertTriangle size={16} />{loadError}</p>}

      {!rows && !loadError && <div className="flex justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Đang tải…</div>}

      {rows && (
        <div className="rounded-2xl border border-slate-200 bg-white">
          {/* Thang tuổi */}
          <div className="border-b border-slate-100 p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Khoảng tuổi</p>
            <div className="flex h-9 w-full overflow-hidden rounded-xl bg-slate-100">
              {withMax.map((r) => {
                const end = r.max == null ? scaleMax : r.max + 1;
                const w = r.ok ? Math.max(0, ((Math.min(end, scaleMax) - r.min) / scaleMax) * 100) : 0;
                return w > 0 ? (
                  <div key={r.guestType} style={{ width: `${w}%` }} title={`${r.label}: ${ageRangeText(r.min, r.max)}`}
                    className={`flex min-w-0 items-center justify-center border-r-2 border-white px-1 text-[11px] font-bold text-white last:border-r-0 ${TONE[r.guestType].bar}`}>
                    <span className="truncate">{r.label}</span>
                  </div>
                ) : null;
              })}
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-semibold tabular-nums text-slate-400">
              <span>0</span><span>{Math.round(scaleMax / 2)}</span><span>{scaleMax}+ tuổi</span>
            </div>
          </div>

          {/* Bảng cấu hình */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Mã</th>
                  <th className="px-3 py-3">Tên hiển thị</th>
                  <th className="px-3 py-3">Tuổi từ</th>
                  <th className="px-3 py-3">Tuổi đến</th>
                  <th className="px-3 py-3">Độ tuổi hiển thị</th>
                  <th className="px-3 py-3">Miễn phí</th>
                  <th className="px-5 py-3">Tính chỗ</th>
                </tr>
              </thead>
              <tbody>
                {withMax.map((r, i) => {
                  const e = errors[r.guestType] || {};
                  return (
                    <tr key={r.guestType} className="border-b border-slate-50 align-top last:border-b-0">
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2 font-mono text-xs font-bold text-slate-600">
                          <span className={`h-2.5 w-2.5 rounded-full ${TONE[r.guestType].dot}`} />{r.guestType}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <LimitedField as="input" limit={50} counter="near" value={r.label} aria-label={`Tên hiển thị ${r.guestType}`}
                          onChange={(ev) => set(r.guestType, { label: ev.target.value })}
                          className={`w-44 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 ${e.label ? "border-rose-300" : "border-slate-200 focus:border-emerald-400"}`} />
                        {e.label && <p className="mt-1 text-[11px] font-semibold text-rose-600">{e.label}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" inputMode="numeric" min={0} max={120} value={r.minAge} disabled={i === 0}
                          aria-label={`Tuổi bắt đầu ${r.label}`} title={i === 0 ? "Loại nhỏ tuổi nhất luôn bắt đầu từ 0 tuổi" : undefined}
                          onChange={(ev) => set(r.guestType, { minAge: ev.target.value.replace(/\D/g, "").slice(0, 3) })}
                          className={`w-20 rounded-lg border px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:text-slate-400 ${e.minAge ? "border-rose-300" : "border-slate-200 focus:border-emerald-400"}`} />
                        {e.minAge && <p className="mt-1 text-[11px] font-semibold text-rose-600">{e.minAge}</p>}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-slate-600">{r.max == null ? "Không giới hạn" : r.ok ? r.max : "—"}</td>
                      <td className={`px-3 py-3 font-semibold ${TONE[r.guestType].text}`}>{r.ok ? ageRangeText(r.min, r.max) : "—"}</td>
                      <td className="px-3 py-3">
                        <label className={`inline-flex items-center gap-2 ${r.guestType === "ADULT" ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                          <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={r.alwaysFree} disabled={r.guestType === "ADULT"}
                            onChange={(ev) => set(r.guestType, { alwaysFree: ev.target.checked })} />
                          <span className="text-xs text-slate-600">{r.alwaysFree ? "Giá 0đ" : "Có giá"}</span>
                        </label>
                        {e.alwaysFree && <p className="mt-1 text-[11px] font-semibold text-rose-600">{e.alwaysFree}</p>}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600">{r.alwaysFree ? "Không" : "Có"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <p className="flex items-start gap-2 text-xs text-slate-500 lg:max-w-xl">
              <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
              Chỉ áp dụng cho đơn đặt sau khi lưu — đơn đã đặt giữ nguyên loại khách và giá. Loại miễn phí luôn 0đ và không chiếm chỗ trong slot.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => { setMsg(null); setRows(toRows(ORDER.map((t) => ({ guestType: t, ...DEFAULTS[t] })))); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer">
                <RotateCcw size={14} />Mặc định
              </button>
              <button type="button" disabled={!dirty || busy} onClick={() => { setMsg(null); setRows(saved); }}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                Huỷ thay đổi
              </button>
              <button type="button" disabled={!dirty || !valid || busy} onClick={save}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Lưu cấu hình
              </button>
            </div>
          </div>
          {msg && (
            <p role="status" className={`mx-5 mb-5 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
              {msg.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{msg.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
