"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgePercent,
  CalendarClock,
  CheckCircle2,
  CircleSlash,
  Loader2,
  Plus,
  RefreshCw,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  cancelPolicy,
  createPolicy,
  getCurrentPolicy,
  listPolicies,
} from "@/features/finance/services/commissionPolicyService";

/* =========================================================================
   HẰNG SỐ
   ========================================================================= */

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
    icon: CalendarClock,
  },
  cancelled: {
    label: "Đã hủy",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    icon: CircleSlash,
  },
};

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function formatRate(rate) {
  if (rate === null || rate === undefined) return "—";
  const n = Number(rate);
  if (Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(2).replace(/\.00$/, "")}%`;
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

/* =========================================================================
   TRANG QUẢN LÝ CHÍNH SÁCH HOA HỒNG (ADMIN)
   ========================================================================= */

export default function AdminCommissionPoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    commissionRate: "",
    effectiveFrom: "",
    effectiveTo: "",
    changeReason: "",
  });

  const { confirm, confirmDialog } = useConfirm();

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
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
    } catch (e) {
      setError(getErrorMessage(e, "Không thể tải danh sách chính sách hoa hồng."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const rate = Number(form.commissionRate);
    if (!form.name.trim()) {
      showToast("Vui lòng nhập tên chính sách.");
      return;
    }
    if (!Number.isFinite(rate) || rate <= 0 || rate >= 1) {
      showToast("Tỷ lệ hoa hồng phải lớn hơn 0% và nhỏ hơn 100%.");
      return;
    }
    if (!form.effectiveFrom) {
      showToast("Vui lòng chọn ngày bắt đầu hiệu lực.");
      return;
    }
    if (!form.changeReason.trim()) {
      showToast("Vui lòng nêu lý do thay đổi (bắt buộc).");
      return;
    }

    setSaving(true);
    try {
      await createPolicy({
        name: form.name.trim(),
        commissionRate: rate,
        effectiveFrom: new Date(form.effectiveFrom).toISOString(),
        effectiveTo: form.effectiveTo
          ? new Date(form.effectiveTo).toISOString()
          : null,
        changeReason: form.changeReason.trim(),
      });
      showToast("Đã tạo chính sách hoa hồng mới.");
      setShowForm(false);
      setForm({
        name: "",
        commissionRate: "",
        effectiveFrom: "",
        effectiveTo: "",
        changeReason: "",
      });
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, "Không thể tạo chính sách hoa hồng."));
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
      showToast(getErrorMessage(err, "Không thể hủy chính sách hoa hồng."));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Header */}
      <div className="shrink-0 bg-white rounded-2xl px-5 py-4 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Quản lý chính sách hoa hồng
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tỷ lệ hoa hồng mặc định của nền tảng. Chính sách đã hiệu lực là bất biến; chỉ
              chính sách tương lai mới có thể hủy. Tất toán luôn dùng tỷ lệ chụp tại thời điểm
              phát sinh doanh thu.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Làm mới
            </button>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {showForm ? <X size={14} /> : <Plus size={14} />}
              {showForm ? "Đóng" : "Tạo chính sách"}
            </button>
          </div>
        </div>

        {/* Chính sách đang hiệu lực */}
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BadgePercent size={18} className="text-emerald-600" />
              <span className="text-sm font-bold text-slate-900">
                Tỷ lệ đang áp dụng:{" "}
                <span className="text-emerald-700">{formatRate(current?.commissionRate)}</span>
              </span>
            </div>
            <div className="text-xs text-slate-600">
              {current
                ? `${current.name} · hiệu lực từ ${formatDateTime(current.effectiveFrom)}`
                : "Chưa có chính sách nào đang hiệu lực — hãy tạo một chính sách."}
            </div>
          </div>
        </div>
      </div>

      {/* Form tạo chính sách */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-900">
            Tạo chính sách hoa hồng mới
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">
                Tên chính sách <span className="text-rose-500">*</span>
              </span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ví dụ: Chính sách hoa hồng 2026-Q1"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">
                Tỷ lệ hoa hồng <span className="text-rose-500">*</span>
              </span>
              <input
                value={form.commissionRate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, commissionRate: e.target.value }))
                }
                placeholder="0.30 = 30%"
                inputMode="decimal"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">
                Ngày bắt đầu hiệu lực <span className="text-rose-500">*</span>
              </span>
              <input
                type="date"
                value={form.effectiveFrom}
                onChange={(e) =>
                  setForm((f) => ({ ...f, effectiveFrom: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">
                Ngày kết thúc hiệu lực (để trống = không xác định)
              </span>
              <input
                type="date"
                value={form.effectiveTo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, effectiveTo: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60"
              />
            </label>
            <label className="block sm:col-span-2 lg:col-span-3">
              <span className="mb-1 block text-xs font-semibold text-slate-700">
                Lý do thay đổi <span className="text-rose-500">*</span>
              </span>
              <textarea
                value={form.changeReason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, changeReason: e.target.value }))
                }
                rows={2}
                placeholder="Ghi rõ lý do điều chỉnh tỷ lệ hoa hồng (bắt buộc theo quy định quản trị)"
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Tạo chính sách
            </button>
          </div>
        </form>
      )}

      {/* Danh sách */}
      <div className="flex-1 min-h-0 overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="flex h-full min-h-[240px] items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Đang tải chính sách hoa hồng...
            </div>
          ) : error ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 text-sm text-rose-600">
              <AlertTriangle size={20} />
              {error}
            </div>
          ) : policies.length === 0 ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 text-sm text-slate-500">
              <BadgePercent size={22} className="text-slate-300" />
              Chưa có chính sách hoa hồng nào.
            </div>
          ) : (
            <table className="w-full min-w-[900px] text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Tên chính sách</th>
                  <th className="px-4 py-3 text-left font-semibold">Tỷ lệ</th>
                  <th className="px-4 py-3 text-left font-semibold">Hiệu lực từ</th>
                  <th className="px-4 py-3 text-left font-semibold">Hiệu lực đến</th>
                  <th className="px-4 py-3 text-left font-semibold">Người thực hiện</th>
                  <th className="px-4 py-3 text-left font-semibold">Lý do</th>
                  <th className="px-4 py-3 text-left font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {policies.map((p) => {
                  const key = statusOf(p);
                  const meta = STATUS_META[key];
                  const Icon = meta.icon;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {p.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                          <BadgePercent size={12} />
                          {formatRate(p.commissionRate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {formatDateTime(p.effectiveFrom)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {p.effectiveTo ? formatDateTime(p.effectiveTo) : "Không xác định"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <User size={12} />
                          {p.createdByName || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[220px]">
                        <span className="line-clamp-2">{p.changeReason || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}
                        >
                          <Icon size={11} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.future && !p.cancelled ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(p)}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer"
                          >
                            <XCircle size={13} />
                            Hủy
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">
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
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[400] rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl max-w-sm">
          {toast}
        </div>
      )}

      {confirmDialog}
    </div>
  );
}