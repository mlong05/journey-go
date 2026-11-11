"use client";

/**
 * Tab "Thông tin đối tác" — Dashboard của đối tác (CONTENT_PROVIDER).
 *
 * Luồng:
 *  1. Mặc định: hiển thị thông tin hồ sơ ở dạng chỉ đọc, góc trên bên phải có nút
 *     "Yêu cầu chỉnh sửa thông tin".
 *  2. Bấm nút ⇒ mở form nhập dữ liệu mới (pre-fill từ thông tin hiện tại), có nút
 *     "Gửi yêu cầu duyệt".
 *  3. Gửi xong ⇒ quay về màn hình chỉ đọc, hiện banner vàng "Hệ thống đang xem xét…"
 *     và khoá nút tạo yêu cầu mới.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  FileEdit,
  History,
  Landmark,
  Loader2,
  Save,
  Send,
  User,
  X,
  XCircle,
} from "lucide-react";
import { Panel, StatusChip } from "@/components/dashboard/DashboardUI";
import { Tooltip } from "@/components/ui";
import { BANKS } from "@/constants/banks";
import PartnerAddressFields from "@/features/partnerapplication/components/PartnerAddressFields";
import PartnerProfileGroups from "@/features/partnerprofileupdate/components/PartnerProfileGroups";
import {
  getMyProfileInfo,
  submitProfileUpdate,
  PARTNER_PROFILE_FIELD_LABELS,
  PARTNER_PROFILE_GROUPS,
} from "@/features/partnerprofileupdate/services/partnerProfileUpdateService";

/** Nhãn tiếng Việt ↔ mã enum của chức vụ người đại diện. */
const POSITIONS = [
  { value: "OWNER", label: "Chủ doanh nghiệp" },
  { value: "DIRECTOR", label: "Giám đốc" },
  { value: "MANAGER", label: "Quản lý" },
  { value: "LEGAL_REPRESENTATIVE", label: "Người đại diện pháp luật" },
  { value: "AUTHORIZED_EMPLOYEE", label: "Nhân viên được ủy quyền" },
  { value: "OTHER", label: "Khác" },
];

const STATUS_LABEL = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
};

const STATUS_BADGE = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

const ACTION_LABEL = {
  SUBMITTED: "Đối tác gửi yêu cầu",
  APPROVED: "Quản trị viên phê duyệt",
  REJECTED: "Quản trị viên từ chối",
};

/** Màu + icon cho từng loại thao tác trong timeline lịch sử. */
const HISTORY_TONE = {
  SUBMITTED: { chip: "bg-sky-50 text-sky-600", icon: Send },
  APPROVED: { chip: "bg-emerald-50 text-emerald-600", icon: CheckCircle2 },
  REJECTED: { chip: "bg-rose-50 text-rose-600", icon: XCircle },
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

function getErrorMessage(err, fallback) {
  return err?.message || err?.data?.message || err?.response?.data?.message || fallback;
}

/** Chuyển nhãn tiếng Việt của chức vụ về mã enum (và ngược lại). */
function positionToValue(label) {
  if (!label) return "";
  const hit = POSITIONS.find(
    (p) => p.label === label || p.value.toLowerCase() === String(label).toLowerCase()
  );
  return hit ? hit.value : "";
}

/**
 * Chuẩn hoá tên ngân hàng về định dạng đầy đủ trong danh sách {@link BANKS}.
 *
 * <p>Dữ liệu cũ có thể lưu tên viết tắt ("VCB", "Techcombank"…) do đối tác gõ tay ở phiên bản
 * trước. Chuẩn hoá giúp hồ sơ nhất quán và dropdown luôn khớp với danh sách lựa chọn.
 */
const BANK_ALIASES = {
  VCB: "Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)",
  Vietcombank: "Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)",
  Techcombank: "Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)",
  TCB: "Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)",
  BIDV: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)",
  MB: "Ngân hàng TMCP Quân đội (MB)",
  ACB: "Ngân hàng TMCP Á Châu (ACB)",
  SHB: "Ngân hàng TMCP Sài Gòn – Hà Nội (SHB)",
  "DongA Bank": "Ngân hàng TMCP Đông Á (DongA Bank)",
  LienVietPostBank: "Ngân hàng TMCP Bưu điện Liên Việt (LienVietPostBank)",
  "Nam A Bank": "Ngân hàng TMCP Nam Á (Nam A Bank)",
  VietinBank: "Ngân hàng TMCP Đại Đồng Tiến (BIDV) / VietinBank",
};

/** Trả về tên ngân hàng chuẩn nếu khớp alias, ngược lại giữ nguyên giá trị gốc. */
function normalizeBankName(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (BANKS.includes(trimmed)) return trimmed;
  return BANK_ALIASES[trimmed] ?? trimmed;
}

export default function ProviderPartnerInfoPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getMyProfileInfo();
      setData(res);
    } catch (e) {
      setError(getErrorMessage(e, "Không thể tải thông tin đối tác."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }, []);

  const profile = data?.profile ?? {};
  const pending = data?.pendingRequest ?? null;
  const lastRequest = data?.lastRequest ?? null;
  const history = data?.history ?? [];
  const canRequest = data?.canRequestEdit !== false && !pending;

  const openForm = () => {
    setForm({
      phone: profile.phone ?? "",
      representativeName: profile.representativeName ?? "",
      representativePosition: positionToValue(profile.representativePosition),
      businessName: profile.businessName ?? "",
      taxCode: profile.taxCode ?? "",
      businessRegistrationInfo: profile.businessRegistrationInfo ?? "",
      province: profile.province ?? "",
      ward: profile.ward ?? "",
      addressDetail: profile.addressDetail ?? "",
      businessScope: profile.businessScope ?? "",
      bankName: normalizeBankName(profile.bankName),
      bankAccountNumber: profile.bankAccountNumber ?? "",
      bankAccountHolder: profile.bankAccountHolder ?? "",
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const errs = {};
    if (form.phone && !/^0\d{9,10}$/.test(form.phone.trim())) {
      errs.phone = "Số điện thoại không hợp lệ (10-11 chữ số, bắt đầu bằng 0)";
    }
    if (form.taxCode && !/^\d{10}$/.test(form.taxCode.trim())) {
      errs.taxCode = "Mã số thuế phải gồm đúng 10 chữ số";
    }
    if (!form.businessName.trim()) {
      errs.businessName = "Tên doanh nghiệp / cơ sở không được để trống";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        phone: form.phone.trim() || null,
        representativeName: form.representativeName.trim() || null,
        representativePosition: form.representativePosition || null,
        businessName: form.businessName.trim() || null,
        taxCode: form.taxCode.trim() || null,
        businessRegistrationInfo: form.businessRegistrationInfo.trim() || null,
        province: form.province || null,
        ward: form.ward || null,
        addressDetail: form.addressDetail.trim() || null,
        businessScope: form.businessScope.trim() || null,
        bankName: form.bankName.trim() || null,
        bankAccountNumber: form.bankAccountNumber.trim() || null,
        bankAccountHolder: form.bankAccountHolder.trim() || null,
      };
      await submitProfileUpdate(payload);
      setFormOpen(false);
      showToast("Đã gửi yêu cầu thay đổi thông tin. Hệ thống đang xem xét.");
      await load();
    } catch (e) {
      showToast(getErrorMessage(e, "Không thể gửi yêu cầu thay đổi thông tin."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 size={18} className="animate-spin" />
        Đang tải thông tin đối tác...
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 animate-in fade-in-50 duration-200">
      {/* Header gọn — giữ nguyên thông tin nhưng chiếm 1 hàng để hồ sơ có đủ chỗ */}
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Thông tin đối tác
            </h1>
            {pending ? (
              <StatusChip tone="amber">Có yêu cầu đang chờ duyệt</StatusChip>
            ) : (
              <StatusChip tone="emerald">Thông tin đang hiển thị chính thức</StatusChip>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Toàn bộ thông tin bạn khai khi đăng ký trở thành đối tác. Muốn chỉnh sửa, gửi yêu cầu
            để Admin xem xét.
          </p>
        </div>
        <button
          type="button"
          onClick={openForm}
          disabled={!canRequest}
          title={
            pending
              ? "Hệ thống đang xem xét yêu cầu thay đổi thông tin của bạn."
              : "Gửi yêu cầu thay đổi thông tin cho Admin"
          }
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          {pending ? <Clock size={15} /> : <FileEdit size={15} />}
          Yêu cầu chỉnh sửa thông tin
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* ── Hồ sơ (trái) + Lịch sử (phải) ──
          Màn hình lớn: 2 cột, cột lịch sử tự cuộn riêng ⇒ lịch sử dài không kéo theo cả trang.
          Màn hình nhỏ: xếp chồng, khối grid tự cuộn. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto xl:grid-cols-[minmax(0,1fr)_380px] xl:overflow-hidden [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
        <div className="flex flex-col gap-4 xl:min-h-0 xl:overflow-y-auto xl:pr-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
          {/* Banner vàng — đang có yêu cầu chờ duyệt */}
          {pending && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3.5">
              <Clock size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-900">
                  Hệ thống đang xem xét yêu cầu thay đổi thông tin của bạn. Trong thời gian này,
                  bạn không thể tạo thêm yêu cầu mới.
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Yêu cầu gửi lúc {formatDateTime(pending.submittedAt)} · Bạn vẫn hoạt động bình
                  thường với thông tin hiện tại.
                </p>
              </div>
            </div>
          )}

          {/* Yêu cầu gần nhất bị từ chối — hiển thị lý do từ chối */}
          {!pending && lastRequest?.status === "REJECTED" && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5">
              <XCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-rose-900">
                  Yêu cầu thay đổi thông tin gần nhất đã bị từ chối
                </p>
                <p className="mt-1 text-xs text-rose-700">
                  Lý do: {lastRequest.reason || "Không nêu rõ"} — Bạn có thể gửi yêu cầu mới.
                </p>
              </div>
            </div>
          )}

          <Panel
            title="Hồ sơ thông tin đối tác"
            description="Toàn bộ thông tin bạn khai khi đăng ký trở thành đối tác"
            icon={User}
            tone="slate"
            bodyClassName="p-4"
          >
            <PartnerProfileGroups
              profile={profile}
              labels={PARTNER_PROFILE_FIELD_LABELS}
              groups={PARTNER_PROFILE_GROUPS}
            />
          </Panel>
        </div>

        {/* ── Lịch sử (phải) — tự cuộn riêng ── */}
        <Panel
          title="Lịch sử thay đổi thông tin"
          description="Toàn bộ các lần bạn gửi yêu cầu chỉnh sửa và kết quả xử lý"
          icon={History}
          tone="slate"
          className="xl:min-h-0"
          bodyClassName="xl:min-h-0 xl:overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
        >
          <RequestHistoryList history={history} />
        </Panel>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[400] max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      {formOpen && (
        <ProfileEditModal
          form={form}
          errors={formErrors}
          submitting={submitting}
          onChange={setField}
          onAddressChange={(next) =>
            setForm((prev) => ({
              ...prev,
              province: next.province ?? "",
              ward: next.ward ?? "",
            }))
          }
          onClose={() => setFormOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

/* =========================================================================
   LỊCH SỬ THAY ĐỔI
   ========================================================================= */

function RequestHistoryList({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 py-8 text-center">
        <History size={22} className="text-slate-300" />
        <p className="text-sm text-slate-500">
          Bạn chưa từng gửi yêu cầu thay đổi thông tin.
        </p>
        <p className="text-xs text-slate-400">
          Khi gửi yêu cầu, mọi thao tác sẽ được ghi lại tại đây.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-0">
      {history.map((h, idx) => {
        const tone = HISTORY_TONE[h.action] ?? HISTORY_TONE.SUBMITTED;
        const Icon = tone.icon;
        const isLast = idx === history.length - 1;
        return (
          <li key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
            {/* Đường nối timeline */}
            {!isLast && (
              <span
                className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-slate-200"
                aria-hidden="true"
              />
            )}
            <span
              className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone.chip}`}
            >
              <Icon size={15} />
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-semibold text-slate-800">
                  {ACTION_LABEL[h.action] || h.action}
                </p>
                {h.statusBefore && h.statusAfter && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                    <span
                      className={`rounded-md border px-1.5 py-0.5 ${
                        STATUS_BADGE[h.statusBefore] || STATUS_BADGE.PENDING
                      }`}
                    >
                      {STATUS_LABEL[h.statusBefore] || h.statusBefore}
                    </span>
                    <ArrowRight size={11} />
                    <span
                      className={`rounded-md border px-1.5 py-0.5 ${
                        STATUS_BADGE[h.statusAfter] || STATUS_BADGE.PENDING
                      }`}
                    >
                      {STATUS_LABEL[h.statusAfter] || h.statusAfter}
                    </span>
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {h.actorName || "Hệ thống"} · {formatDateTime(h.createdAt)}
                {h.requestId ? ` · Yêu cầu #${h.requestId}` : ""}
              </p>
              {h.reason && (
                <p className="mt-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs italic text-slate-600">
                  “{h.reason}”
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* =========================================================================
   MODAL SỬA THÔNG TIN
   ========================================================================= */

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100";

function Field({ label, required, error, children }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
          <AlertTriangle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

function ProfileEditModal({
  form,
  errors,
  submitting,
  onChange,
  onAddressChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Yêu cầu chỉnh sửa thông tin</h3>
            <p className="mt-1 text-xs text-slate-500">
              Chỉnh sửa trực tiếp trên dữ liệu hiện tại. Thay đổi sẽ được gửi Admin duyệt —
              thông tin chính thức chỉ được cập nhật khi Admin đồng ý.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <User size={14} />
                </span>
                Thông tin người đại diện
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Số điện thoại" error={errors.phone}>
                  <input
                    value={form.phone}
                    onChange={(e) => onChange("phone", e.target.value)}
                    placeholder="0912345678"
                    className={inputCls}
                  />
                </Field>
                <Field label="Họ tên người đại diện">
                  <input
                    value={form.representativeName}
                    onChange={(e) => onChange("representativeName", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Chức vụ">
                  <select
                    value={form.representativePosition}
                    onChange={(e) => onChange("representativePosition", e.target.value)}
                    className={inputCls}
                  >
                    <option value="">-- Chọn chức vụ --</option>
                    {POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <Building2 size={14} />
                </span>
                Thông tin doanh nghiệp
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tên doanh nghiệp / Cơ sở" required error={errors.businessName}>
                  <input
                    value={form.businessName}
                    onChange={(e) => onChange("businessName", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Mã số thuế" error={errors.taxCode}>
                  <input
                    value={form.taxCode}
                    onChange={(e) => onChange("taxCode", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="mt-3 grid gap-3">
                <Field label="Thông tin đăng ký kinh doanh">
                  <textarea
                    rows={2}
                    value={form.businessRegistrationInfo}
                    onChange={(e) => onChange("businessRegistrationInfo", e.target.value)}
                    className={`${inputCls} resize-none`}
                  />
                </Field>
                <PartnerAddressFields
                  value={{
                    province: form.province,
                    ward: form.ward,
                  }}
                  onChange={onAddressChange}
                  errors={errors}
                />
                <Field label="Số nhà, tên đường...">
                  <input
                    value={form.addressDetail}
                    onChange={(e) => onChange("addressDetail", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Phạm vi hoạt động">
                  <textarea
                    rows={2}
                    value={form.businessScope}
                    onChange={(e) => onChange("businessScope", e.target.value)}
                    className={`${inputCls} resize-none`}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <Landmark size={14} />
                </span>
                Thiết lập thanh toán
              </h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Ngân hàng thụ hưởng" error={errors.bankName}>
                  {/* Tên ngân hàng dài bị cắt trong ô chọn → rê chuột để xem đầy đủ. */}
                  <Tooltip content={form.bankName} className="block" focusable={false}>
                    <span className="relative block">
                      <select
                        value={form.bankName}
                        onChange={(e) => onChange("bankName", e.target.value)}
                        className={inputCls}
                      >
                        <option value="">-- Chọn ngân hàng --</option>
                        {BANKS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                        {/* Ngân hàng cũ không còn trong danh sách → vẫn hiển thị để không mất dữ liệu. */}
                        {form.bankName &&
                          !BANKS.includes(form.bankName) && (
                            <option value={form.bankName}>{form.bankName}</option>
                          )}
                      </select>
                    </span>
                  </Tooltip>
                </Field>
                <Field label="Số tài khoản">
                  <input
                    value={form.bankAccountNumber}
                    onChange={(e) => onChange("bankAccountNumber", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Tên chủ tài khoản">
                  <input
                    value={form.bankAccountHolder}
                    onChange={(e) => onChange("bankAccountHolder", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
            </section>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-3">
          <span className="text-xs text-slate-500">
            Thông tin hiện tại vẫn được giữ cho tới khi Admin duyệt yêu cầu.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Gửi yêu cầu duyệt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
