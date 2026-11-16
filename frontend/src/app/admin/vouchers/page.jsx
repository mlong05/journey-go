"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgePercent,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Filter,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tag,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import {
  createVoucher,
  listVouchers,
  updateVoucher,
} from "@/features/finance/services/voucherService";
import { getActiveProviderProfiles } from "@/features/providerprofile/services/providerProfileService";

/* =========================================================================
   HẰNG SỐ
   ========================================================================= */

const SCOPE_META = {
  PLATFORM: {
    label: "Nền tảng",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    icon: Tag,
  },
  PARTNER: {
    label: "Đối tác",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    icon: Building2,
  },
};

const DISCOUNT_TYPE_META = {
  FIXED_AMOUNT: { label: "Giảm cố định (đ)" },
  PERCENTAGE: { label: "Giảm theo % (tối đa)" },
};

const ACTIVE_FILTER_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "true", label: "Đang hoạt động" },
  { value: "false", label: "Đã tắt" },
];

const SCOPE_FILTER_OPTIONS = [
  { value: "", label: "Tất cả loại" },
  { value: "PLATFORM", label: "Nền tảng" },
  { value: "PARTNER", label: "Đối tác" },
];

const EMPTY_FORM = {
  code: "",
  title: "",
  description: "",
  voucherScope: "PLATFORM",
  partnerId: "",
  discountType: "FIXED_AMOUNT",
  discountValue: "",
  minOrderAmount: "",
  maxDiscountAmount: "",
  pointsRequired: "",
  totalQuantity: "",
  validDays: "30",
  startDate: "",
  endDate: "",
  active: true,
};

/* =========================================================================
   HELPERS
   ========================================================================= */

function fmt(n) {
  return n == null ? "—" : Number(n).toLocaleString("vi-VN");
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

function getErrMsg(err, fallback) {
  return err?.message || err?.data?.message || fallback;
}

/* =========================================================================
   COMPONENTS
   ========================================================================= */

function ScopeBadge({ scope }) {
  const meta = SCOPE_META[scope] ?? {
    label: scope,
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    icon: Tag,
  };
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}
    >
      <Icon size={10} />
      {meta.label}
    </span>
  );
}

function ActiveBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
      <CheckCircle2 size={10} />
      Hoạt động
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
      <CircleSlash size={10} />
      Tắt
    </span>
  );
}

/* =========================================================================
   MODAL FORM TẠO / SỬA
   ========================================================================= */

function VoucherFormModal({ mode, initialData, onClose, onSaved, showToast }) {
  const isEdit = mode === "edit";
  const [partners, setPartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [form, setForm] = useState(() =>
    isEdit && initialData
      ? {
          ...EMPTY_FORM,
          ...initialData,
          partnerId: initialData.partnerId ?? "",
          discountValue: initialData.discountValue ?? "",
          minOrderAmount: initialData.minOrderAmount ?? "",
          maxDiscountAmount: initialData.maxDiscountAmount ?? "",
          pointsRequired: initialData.pointsRequired ?? "",
          totalQuantity: initialData.totalQuantity ?? "",
          validDays: initialData.validDays ?? "30",
          startDate: initialData.startDate ?? "",
          endDate: initialData.endDate ?? "",
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoadingPartners(true);
    getActiveProviderProfiles()
      .then((data) => {
        if (mounted) {
          setPartners(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        console.warn("Không thể tải danh sách đối tác:", err);
      })
      .finally(() => {
        if (mounted) setLoadingPartners(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const validate = () => {
    if (!form.code.trim()) return "Mã voucher không được để trống.";
    if (!form.title.trim()) return "Tiêu đề voucher không được để trống.";
    if (form.voucherScope === "PARTNER" && !form.partnerId)
      return "Vui lòng nhập ID đối tác cho Voucher Đối tác.";
    if (!form.discountValue || Number(form.discountValue) <= 0)
      return "Giá trị giảm giá phải lớn hơn 0.";
    if (
      form.discountType === "PERCENTAGE" &&
      Number(form.discountValue) > 100
    )
      return "Tỷ lệ giảm không được vượt quá 100%.";
    if (
      form.discountType === "PERCENTAGE" &&
      (!form.maxDiscountAmount || Number(form.maxDiscountAmount) <= 0)
    )
      return "Voucher giảm theo % bắt buộc phải nhập mức giảm tối đa.";
    if (!form.totalQuantity || Number(form.totalQuantity) <= 0)
      return "Tổng số lượng voucher phải lớn hơn 0.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      showToast(err, "error");
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      voucherScope: form.voucherScope,
      partnerId:
        form.voucherScope === "PARTNER" && form.partnerId
          ? Number(form.partnerId)
          : null,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
      maxDiscountAmount:
        form.discountType === "PERCENTAGE" && form.maxDiscountAmount
          ? Number(form.maxDiscountAmount)
          : null,
      pointsRequired: form.pointsRequired ? Number(form.pointsRequired) : 0,
      totalQuantity: Number(form.totalQuantity),
      validDays: form.validDays ? Number(form.validDays) : 30,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      active: form.active,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateVoucher(initialData.id, payload);
        showToast("Đã cập nhật voucher thành công.", "success");
      } else {
        await createVoucher(payload);
        showToast("Đã tạo voucher mới thành công.", "success");
      }
      onSaved();
    } catch (err) {
      showToast(getErrMsg(err, "Không thể lưu voucher."), "error");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEdit ? "Chỉnh sửa voucher" : "Tạo voucher mới"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? "Cập nhật thông tin voucher đã tồn tại."
                : "Tạo voucher nền tảng hoặc voucher riêng cho đối tác."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
          {/* Loại voucher */}
          <div>
            <span className={labelCls}>
              Loại voucher <span className="text-rose-500">*</span>
            </span>
            <div className="flex gap-3 mt-1">
              {["PLATFORM", "PARTNER"].map((scope) => {
                const meta = SCOPE_META[scope];
                const Icon = meta.icon;
                const active = form.voucherScope === scope;
                return (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => set("voucherScope", scope)}
                    className={`flex-1 flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
                      active
                        ? "border-sky-500 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Icon size={16} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
            {form.voucherScope === "PLATFORM" && (
              <p className="mt-2 text-[11px] text-slate-500 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
                Voucher <strong>Nền tảng</strong>: JourneyGo tự bỏ ra phần giảm
                giá, trừ vào doanh thu hoa hồng. Đối tác nhận nguyên vẹn phần
                của mình.
              </p>
            )}
            {form.voucherScope === "PARTNER" && (
              <p className="mt-2 text-[11px] text-slate-500 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                Voucher <strong>Đối tác</strong>: Đối tác tự bỏ ra phần giảm
                giá, trừ vào doanh thu của đối tác. Nền tảng giữ nguyên hoa
                hồng.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mã voucher */}
            <label className="block">
              <span className={labelCls}>
                Mã voucher <span className="text-rose-500">*</span>
              </span>
              <input
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="SUMMER2026"
                maxLength={50}
                disabled={isEdit}
                className={`${inputCls} ${isEdit ? "opacity-60 cursor-not-allowed" : ""} font-mono`}
              />
              {isEdit && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Mã voucher không thể thay đổi sau khi tạo.
                </p>
              )}
            </label>

            {/* Đối tác sở hữu */}
            {form.voucherScope === "PARTNER" && (
              <label className="block sm:col-span-1">
                <span className={labelCls}>
                  Chọn Đối tác sở hữu <span className="text-rose-500">*</span>
                </span>
                <select
                  value={form.partnerId}
                  onChange={(e) => set("partnerId", e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- Chọn đối tác --</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.providerName || `Đối tác #${p.id}`} (ID: {p.id})
                    </option>
                  ))}
                </select>
                {loadingPartners && (
                  <p className="text-[11px] text-slate-400 mt-1">Đang tải danh sách đối tác...</p>
                )}
              </label>
            )}

            {/* Tiêu đề */}
            <label className="block sm:col-span-2">
              <span className={labelCls}>
                Tiêu đề <span className="text-rose-500">*</span>
              </span>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Ví dụ: Giảm 50k cho tour Hà Nội"
                maxLength={150}
                className={inputCls}
              />
            </label>

            {/* Mô tả */}
            <label className="block sm:col-span-2">
              <span className={labelCls}>Mô tả</span>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Mô tả chi tiết điều kiện áp dụng voucher..."
                className={`${inputCls} resize-none`}
              />
            </label>
          </div>

          {/* Giảm giá */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Cấu hình giảm giá
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Loại giảm */}
              <label className="block">
                <span className={labelCls}>
                  Hình thức giảm <span className="text-rose-500">*</span>
                </span>
                <select
                  value={form.discountType}
                  onChange={(e) => set("discountType", e.target.value)}
                  className={inputCls}
                >
                  <option value="FIXED_AMOUNT">Giảm cố định (đ)</option>
                  <option value="PERCENTAGE">Giảm theo %</option>
                </select>
              </label>

              {/* Giá trị giảm */}
              <label className="block">
                <span className={labelCls}>
                  Giá trị giảm{" "}
                  <span className="text-slate-400">
                    ({form.discountType === "FIXED_AMOUNT" ? "đ" : "%"})
                  </span>{" "}
                  <span className="text-rose-500">*</span>
                </span>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => set("discountValue", e.target.value)}
                  placeholder={
                    form.discountType === "FIXED_AMOUNT" ? "50000" : "10"
                  }
                  min={form.discountType === "FIXED_AMOUNT" ? 1000 : 0.01}
                  step={form.discountType === "FIXED_AMOUNT" ? 1000 : "any"}
                  className={inputCls}
                />
              </label>

              {/* Mức giảm tối đa (chỉ % ) */}
              {form.discountType === "PERCENTAGE" && (
                <label className="block">
                  <span className={labelCls}>
                    Mức giảm tối đa (đ){" "}
                    <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="number"
                    value={form.maxDiscountAmount}
                    onChange={(e) => set("maxDiscountAmount", e.target.value)}
                    placeholder="100000"
                    min={1}
                    className={inputCls}
                  />
                </label>
              )}

              {/* Giá trị đơn tối thiểu */}
              <label className="block">
                <span className={labelCls}>Giá trị đơn tối thiểu (đ)</span>
                <input
                  type="number"
                  value={form.minOrderAmount}
                  onChange={(e) => set("minOrderAmount", e.target.value)}
                  placeholder="Để trống = không giới hạn"
                  min={0}
                  className={inputCls}
                />
              </label>
            </div>
          </div>

          {/* Số lượng & điểm */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Số lượng & Điểm thưởng
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="block">
                <span className={labelCls}>
                  Tổng số lượng <span className="text-rose-500">*</span>
                </span>
                <input
                  type="number"
                  value={form.totalQuantity}
                  onChange={(e) => set("totalQuantity", e.target.value)}
                  placeholder="500"
                  min={1}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>
                  Điểm thưởng cần để đổi (0 = miễn phí)
                </span>
                <input
                  type="number"
                  value={form.pointsRequired}
                  onChange={(e) => set("pointsRequired", e.target.value)}
                  placeholder="0"
                  min={0}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Thời hạn sử dụng sau đổi (ngày)</span>
                <input
                  type="number"
                  value={form.validDays}
                  onChange={(e) => set("validDays", e.target.value)}
                  placeholder="30"
                  min={1}
                  className={inputCls}
                />
              </label>
            </div>
          </div>

          {/* Thời gian & trạng thái */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Thời gian & Trạng thái
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className={labelCls}>Ngày bắt đầu</span>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>
                  Ngày kết thúc (để trống = không xác định)
                </span>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                  className={inputCls}
                />
              </label>
            </div>
            {/* Toggle active */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => set("active", !form.active)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  form.active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                }`}
              >
                {form.active ? (
                  <ToggleRight size={18} />
                ) : (
                  <ToggleLeft size={18} />
                )}
                {form.active ? "Đang hoạt động" : "Tắt voucher"}
              </button>
              <span className="text-xs text-slate-500">
                {form.active
                  ? "Voucher sẽ hiển thị và có thể sử dụng ngay."
                  : "Voucher bị ẩn và không thể sử dụng."}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? "Lưu thay đổi" : "Tạo voucher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
   TRANG CHÍNH
   ========================================================================= */

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 0,
    size: 15,
    totalPages: 0,
    totalElements: 0,
  });
  const [filters, setFilters] = useState({
    scope: "",
    active: "",
    search: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ msg: "", type: "success" });
  const [modal, setModal] = useState(null); // null | { mode: 'create' | 'edit', data?: voucher }

  /* ── toast ── */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 4000);
  }, []);

  /* ── load ── */
  const load = useCallback(
    async (page = pagination.page) => {
      setLoading(true);
      setError("");
      try {
        const res = await listVouchers({
          ...filters,
          active: filters.active !== "" ? filters.active : undefined,
          scope: filters.scope || undefined,
          search: filters.search || undefined,
          page,
          size: pagination.size,
        });
        setVouchers(res?.content ?? res ?? []);
        setPagination((p) => ({
          ...p,
          page: res?.number ?? page,
          totalPages: res?.totalPages ?? 1,
          totalElements: res?.totalElements ?? 0,
        }));
      } catch (e) {
        setError(getErrMsg(e, "Không thể tải danh sách voucher."));
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, pagination.size],
  );

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, search: searchInput.trim() }));
  };

  const handleFilterChange = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
  };

  const handleSaved = () => {
    setModal(null);
    load(0);
  };

  /* ── toggle active nhanh ── */
  const handleToggleActive = async (v) => {
    try {
      await updateVoucher(v.id, { active: !v.active });
      showToast(
        v.active ? "Đã tắt voucher." : "Đã kích hoạt voucher.",
        "success",
      );
      load(pagination.page);
    } catch (e) {
      showToast(getErrMsg(e, "Không thể cập nhật voucher."), "error");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* ── Header ── */}
      <div className="shrink-0 bg-white rounded-2xl px-5 py-4 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Cấu hình Voucher
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý voucher giảm giá. Voucher{" "}
              <strong>Nền tảng</strong> trừ vào hoa hồng JourneyGo; Voucher{" "}
              <strong>Đối tác</strong> trừ vào doanh thu đối tác.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => load(pagination.page)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Làm mới
            </button>
            <button
              type="button"
              onClick={() => setModal({ mode: "create" })}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Tạo voucher
            </button>
          </div>
        </div>

        {/* ── Thống kê nhanh ── */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Tổng voucher",
              value: pagination.totalElements,
              color: "text-sky-600",
            },
            {
              label: "Trang hiện tại",
              value: `${pagination.page + 1} / ${Math.max(pagination.totalPages, 1)}`,
              color: "text-slate-600",
            },
            {
              label: "Loại bộ lọc",
              value: SCOPE_META[filters.scope]?.label ?? "Tất cả",
              color: "text-violet-600",
            },
            {
              label: "Trạng thái",
              value:
                filters.active === "true"
                  ? "Hoạt động"
                  : filters.active === "false"
                    ? "Đã tắt"
                    : "Tất cả",
              color: "text-emerald-600",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
            >
              <p className="text-[11px] text-slate-400 font-medium">{s.label}</p>
              <p className={`text-sm font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Thanh lọc & tìm kiếm ── */}
      <div className="shrink-0 flex flex-wrap items-center gap-2">
        {/* Tìm kiếm */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm mã, tiêu đề voucher..."
              className="rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-medium outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60 w-56"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Tìm
          </button>
          {filters.search && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setFilters((f) => ({ ...f, search: "" }));
              }}
              className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <X size={12} />
              Xóa
            </button>
          )}
        </form>

        {/* Filter loại */}
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-slate-400" />
          {SCOPE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleFilterChange("scope", opt.value)}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
                filters.scope === opt.value
                  ? "border-sky-400 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filter trạng thái */}
        <div className="flex items-center gap-1.5 ml-auto">
          {ACTIVE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleFilterChange("active", opt.value)}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
                filters.active === opt.value
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bảng danh sách ── */}
      <div className="flex-1 min-h-0 overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col">
        {error && (
          <div className="shrink-0 flex items-center gap-2 m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            <AlertTriangle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
          {loading ? (
            <div className="flex h-full min-h-[300px] items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={20} className="animate-spin" />
              Đang tải danh sách voucher...
            </div>
          ) : vouchers.length === 0 ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-slate-500">
              <BadgePercent size={36} className="text-slate-200" />
              <p className="text-sm font-bold text-slate-600">
                Chưa có voucher nào
              </p>
              <p className="text-xs text-slate-400">
                Nhấn &ldquo;Tạo voucher&rdquo; để bắt đầu.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    Mã & Tiêu đề
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Loại</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Đối tác
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Giảm giá
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Đơn tối thiểu
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    SL còn / tổng
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Thời hạn
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vouchers.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-bold text-sky-700 bg-sky-50 inline-block rounded px-1.5 py-0.5 mb-1">
                        {v.code}
                      </p>
                      <p className="font-semibold text-slate-900 text-sm leading-tight max-w-[220px] truncate" title={v.title}>
                        {v.title}
                      </p>
                      {v.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-[220px]">
                          {v.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ScopeBadge scope={v.voucherScope} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {v.partnerName ? (
                        <span className="font-medium">{v.partnerName}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">
                        {v.discountType === "FIXED_AMOUNT"
                          ? `${fmt(v.discountValue)} đ`
                          : `${v.discountValue}%`}
                      </p>
                      {v.discountType === "PERCENTAGE" &&
                        v.maxDiscountAmount && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Tối đa {fmt(v.maxDiscountAmount)} đ
                          </p>
                        )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {v.minOrderAmount ? `${fmt(v.minOrderAmount)} đ` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-slate-900">
                          {fmt(v.remainingQuantity)}
                        </span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-500 text-xs">
                          {fmt(v.totalQuantity)}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-1 h-1 w-20 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-sky-400 rounded-full"
                          style={{
                            width:
                              v.totalQuantity > 0
                                ? `${Math.round((v.remainingQuantity / v.totalQuantity) * 100)}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <p>{v.startDate ? fmtDate(v.startDate) : "—"}</p>
                      {v.endDate && (
                        <p className="text-slate-400">
                          → {fmtDate(v.endDate)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ActiveBadge active={v.active} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle hoạt động */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(v)}
                          title={v.active ? "Tắt voucher" : "Kích hoạt voucher"}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                            v.active
                              ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          }`}
                        >
                          {v.active ? (
                            <>
                              <ToggleRight size={15} />
                              <span>Tắt</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft size={15} />
                              <span>Bật</span>
                            </>
                          )}
                        </button>
                        {/* Sửa */}
                        <button
                          type="button"
                          onClick={() =>
                            setModal({ mode: "edit", data: v })
                          }
                          title="Chỉnh sửa"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <Pencil size={13} />
                          <span>Sửa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Phân trang ── */}
        {!loading && vouchers.length > 0 && (
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Tổng{" "}
              <strong className="text-slate-700">
                {pagination.totalElements}
              </strong>{" "}
              voucher
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagination.page === 0}
                onClick={() => load(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="font-semibold text-slate-700 px-2">
                Trang {pagination.page + 1} / {Math.max(pagination.totalPages, 1)}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages - 1}
                onClick={() => load(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Toast ── */}
      {toast.msg && (
        <div
          className={`fixed bottom-6 right-6 z-[400] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl max-w-sm ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Modal Form ── */}
      {modal && (
        <VoucherFormModal
          mode={modal.mode}
          initialData={modal.data}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}
    </div>
  );
}
