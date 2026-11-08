"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  FileText,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  History,
  Inbox,
  X,
  XCircle,
  BadgeCheck,
  AlertTriangle,
} from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  approveApplication,
  getById,
  getQueue,
  getStats,
  rejectApplication,
} from "@/features/partnerapplication/services/partnerApplicationService";

/* =========================================================================
   HẰNG SỐ & HÀM TRỢ GIÚP
   ========================================================================= */

const PAGE_SIZE = 10;

/**
 * Tab trạng thái trên màn hình làm việc.
 *
 * <p>Không có tab "Nháp": đơn nháp là trạng thái nội bộ khi người đăng ký đang điền, không
 * có ý nghĩa với Admin nên không tách thành tab. Mốc chuyển trạng thái "Nháp → Chờ duyệt"
 * vẫn được giữ nguyên trong Lịch sử kiểm duyệt.
 */
const STATUS_TABS = [
  { id: "ALL", label: "Tất cả" },
  { id: "PENDING", label: "Chờ duyệt" },
  { id: "APPROVED", label: "Đã duyệt" },
  { id: "REJECTED", label: "Bị từ chối" },
];

const STATUS_BADGE = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_LABEL = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  DRAFT: "Nháp",
};

const PARTNER_TYPE_LABEL = {
  TRAVEL_AGENCY: "Công ty Lữ hành",
  EXPERIENCE_PROVIDER: "Cơ sở trải nghiệm / Điểm đến",
};

const TRAVEL_SCOPE_LABEL = {
  INTERNATIONAL: "Quốc tế",
  DOMESTIC: "Nội địa",
};

const POSITION_LABEL = {
  OWNER: "Chủ sở hữu",
  DIRECTOR: "Giám đốc",
  MANAGER: "Quản lý",
  LEGAL_REPRESENTATIVE: "Đại diện theo pháp luật",
  AUTHORIZED_EMPLOYEE: "Nhân viên được uỷ quyền",
  OTHER: "Khác",
};

const ACTION_LABEL = {
  SUBMITTED: "Người đăng ký gửi đơn",
  APPROVED: "Quản trị viên phê duyệt",
  REJECTED: "Quản trị viên từ chối",
  RESUBMITTED: "Người đăng ký sửa & gửi lại",
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
  return (
    err?.message ||
    err?.data?.message ||
    err?.response?.data?.message ||
    fallback
  );
}

/* =========================================================================
   TRANG QUẢN LÝ ĐỐI TÁC (ADMIN)
   ========================================================================= */

export default function AdminPartnersPage() {
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState({
    content: [],
    totalElements: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState("");

  const { confirm, confirmDialog } = useConfirm();

  // Debounce từ khoá 400ms → truyền xuống backend (tìm toàn hệ thống)
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(keyword.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [keyword]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getQueue({
        status: status && status !== "ALL" ? status : undefined,
        page,
        size: PAGE_SIZE,
      });
      setPageData({
        content: res?.content ?? [],
        totalElements: res?.totalElements ?? 0,
        totalPages: res?.totalPages ?? 0,
      });
    } catch (e) {
      setError(getErrorMessage(e, "Không thể tải danh sách đơn đăng ký."));
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  const loadStats = useCallback(async () => {
    try {
      setStats((await getStats()) ?? {});
    } catch {
      /* thống kê là thông tin phụ — bỏ qua lỗi */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }, []);

  const rows = useMemo(() => {
    const list = pageData.content ?? [];
    if (!search) return list;
    const kw = search.toLowerCase();
    return list.filter(
      (a) =>
        (a.email ?? "").toLowerCase().includes(kw) ||
        (a.businessName ?? "").toLowerCase().includes(kw) ||
        (a.representativeName ?? "").toLowerCase().includes(kw) ||
        (a.phone ?? "").includes(kw),
    );
  }, [pageData.content, search]);

  const openDetail = async (id) => {
    setDetailLoading(true);
    setDetail({ id, loading: true });
    try {
      const res = await getById(id);
      setDetail(res);
    } catch (e) {
      showToast(getErrorMessage(e, "Không thể tải chi tiết đơn đăng ký."));
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (app) => {
    const ok = await confirm({
      tone: "success",
      icon: "check",
      title: "Phê duyệt hồ sơ đối tác?",
      subject: app.businessName || app.email,
      description:
        "Hệ thống sẽ kiểm tra hồ sơ, tạo/nâng cấp tài khoản CONTENT_PROVIDER, " +
        "cấp hồ sơ đối tác + ví và gửi email thiết lập mật khẩu cho người đại diện.",
      confirmLabel: "Phê duyệt",
      cancelLabel: "Hủy bỏ",
    });
    if (!ok) return;

    setActionBusy(true);
    try {
      const res = await approveApplication(app.id, null);
      showToast(res?.message || "Đã phê duyệt hồ sơ đối tác.");
      await Promise.all([load(), loadStats()]);
      if (detail?.id === app.id) openDetail(app.id);
    } catch (e) {
      showToast(getErrorMessage(e, "Không thể phê duyệt hồ sơ."));
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async (app) => {
    const reason = await confirm({
      tone: "danger",
      icon: "reject",
      title: "Từ chối hồ sơ đối tác",
      subject: app.businessName || app.email,
      description:
        "Lý do từ chối là bắt buộc và sẽ được gửi kèm email thông báo cho người đại diện. " +
        "Người đăng ký có thể sửa và gửi lại hồ sơ.",
      confirmLabel: "Từ chối",
      cancelLabel: "Hủy bỏ",
      input: {
        label: "Lý do từ chối",
        placeholder: "Ví dụ: Giấy phép lữ hành chưa hợp lệ, thiếu chữ ký quỹ...",
        required: true,
      },
    });
    if (!reason) return;

    setActionBusy(true);
    try {
      const res = await rejectApplication(app.id, reason);
      showToast(res?.message || "Đã từ chối hồ sơ.");
      await Promise.all([load(), loadStats()]);
      if (detail?.id === app.id) openDetail(app.id);
    } catch (e) {
      showToast(getErrorMessage(e, "Không thể từ chối hồ sơ."));
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Header */}
      <div className="shrink-0 bg-white rounded-2xl px-5 py-4 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Quản lý đối tác
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Xem hồ sơ đăng ký, phê duyệt hoặc từ chối kèm lý do — mọi thao tác đều được
              ghi nhận vào lịch sử kiểm duyệt.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              load();
              loadStats();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>

        {/* Thẻ thống kê */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setStatus(t.id);
                setPage(0);
              }}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                status === t.id
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <span
                className={`block text-[11px] font-medium ${
                  status === t.id ? "text-white/70" : "text-slate-500"
                }`}
              >
                {t.label}
              </span>
              <span className="block text-lg font-bold">
                {t.id === "ALL"
                  ? STATUS_TABS.filter((x) => x.id !== "ALL").reduce(
                      (sum, x) => sum + Number(stats?.[x.id] ?? 0),
                      0,
                    )
                  : stats?.[t.id] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 bg-white rounded-2xl px-5 py-3 border border-slate-200/90 shadow-2xs">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setStatus(t.id);
                setPage(0);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                status === t.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên doanh nghiệp, email, người đại diện..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60"
          />
        </div>
      </div>

      {/* Bảng */}
      <div className="flex-1 min-h-0 overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="flex h-full min-h-[240px] items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Đang tải danh sách đơn đăng ký...
            </div>
          ) : error ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 text-sm text-rose-600">
              <AlertTriangle size={20} />
              {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 text-sm text-slate-500">
              <Inbox size={22} className="text-slate-300" />
              Không có đơn đăng ký nào ở trạng thái này.
            </div>
          ) : (
            <table className="w-full min-w-[980px] text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Doanh nghiệp / Cơ sở</th>
                  <th className="px-4 py-3 text-left font-semibold">Người đại diện</th>
                  <th className="px-4 py-3 text-left font-semibold">Loại hình</th>
                  <th className="px-4 py-3 text-left font-semibold">Ngân hàng</th>
                  <th className="px-4 py-3 text-left font-semibold">Ngày gửi</th>
                  <th className="px-4 py-3 text-left font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {a.businessName || "—"}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Mail size={12} /> {a.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800">{a.representativeName || "—"}</div>
                      <div className="text-xs text-slate-500">
                        {POSITION_LABEL[a.representativePosition] || a.representativePosition || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {PARTNER_TYPE_LABEL[a.partnerType] || a.partnerType || "—"}
                      {a.travelScope && (
                        <div className="text-xs text-slate-500">
                          {TRAVEL_SCOPE_LABEL[a.travelScope] || a.travelScope}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="text-xs">
                        {a.bankName || "—"}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {a.bankAccountNumber || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(a.submittedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          STATUS_BADGE[a.status] || STATUS_BADGE.DRAFT
                        }`}
                      >
                        {STATUS_LABEL[a.status] || a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDetail(a.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <FileText size={13} />
                          Chi tiết
                        </button>
                        {a.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(a)}
                              disabled={actionBusy}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 size={13} />
                              Duyệt
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(a)}
                              disabled={actionBusy}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <XCircle size={13} />
                              Từ chối
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && !error && rows.length > 0 && (
          <PaginationBar
            page={page}
            totalPages={pageData.totalPages}
            totalElements={pageData.totalElements}
            unit="đơn đăng ký"
            onChange={setPage}
          />
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[400] rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl max-w-sm">
          {toast}
        </div>
      )}

      {detail && (
        <PartnerApplicationDetailModal
          application={detail}
          loading={detailLoading}
          busy={actionBusy}
          onClose={() => setDetail(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {confirmDialog}
    </div>
  );
}

/* =========================================================================
   MODAL CHI TIẾT HỒ SƠ — 4 GIAI ĐOẠN
   ========================================================================= */

function SectionCard({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
          <Icon size={14} />
        </span>
        {title}
      </h4>
      {children}
    </section>
  );
}

function Field({ label, value, icon: Icon }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 flex items-start gap-1.5 text-sm text-slate-800 break-words">
        {Icon && <Icon size={14} className="mt-0.5 shrink-0 text-slate-400" />}
        <span>{value || "—"}</span>
      </dd>
    </div>
  );
}

function DocLink({ label, url }) {
  if (!url) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
        <AlertTriangle size={11} /> Thiếu: {label}
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
    >
      <BadgeCheck size={11} /> {label}
    </a>
  );
}

function PartnerApplicationDetailModal({
  application,
  loading,
  busy,
  onClose,
  onApprove,
  onReject,
}) {
  const a = application;
  const isPending = a?.status === "PENDING";

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-slate-900">
              {a?.businessName || a?.email || "Chi tiết đơn đăng ký"}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>#{a?.id}</span>
              {a?.status && (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    STATUS_BADGE[a.status] || STATUS_BADGE.DRAFT
                  }`}
                >
                  {STATUS_LABEL[a.status] || a.status}
                </span>
              )}
              <span>Gửi lúc {formatDateTime(a?.submittedAt)}</span>
            </div>
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

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {loading || !a || a.loading ? (
            <div className="flex h-[240px] items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Đang tải hồ sơ...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Giai đoạn 1 */}
              <SectionCard icon={User} title="Giai đoạn 1 — Thông tin người đại diện">
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Email" value={a.email} icon={Mail} />
                  <Field label="Số điện thoại" value={a.phone} icon={Phone} />
                  <Field label="Họ tên" value={a.representativeName} />
                  <Field
                    label="Chức vụ"
                    value={
                      POSITION_LABEL[a.representativePosition] ||
                      a.representativePosition
                    }
                  />
                  <Field
                    label="Email đã xác minh"
                    value={a.emailVerified ? "Có" : "Chưa"}
                    icon={ShieldCheck}
                  />
                </dl>
              </SectionCard>

              {/* Giai đoạn 2 */}
              <SectionCard icon={Building2} title="Giai đoạn 2 — Thông tin doanh nghiệp">
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Tên doanh nghiệp / Cơ sở" value={a.businessName} />
                  <Field
                    label="Loại hình đối tác"
                    value={PARTNER_TYPE_LABEL[a.partnerType] || a.partnerType}
                  />
                  <Field
                    label="Phạm vi lữ hành"
                    value={
                      a.travelScope
                        ? TRAVEL_SCOPE_LABEL[a.travelScope] || a.travelScope
                        : "Không áp dụng"
                    }
                  />
                  <Field label="Mã số thuế" value={a.taxCode} />
                  <Field
                    label="Thông tin đăng ký kinh doanh"
                    value={a.businessRegistrationInfo}
                  />
                  <Field label="Phạm vi hoạt động" value={a.businessScope} />
                  <Field
                    label="Địa chỉ trụ sở"
                    value={[a.addressDetail, a.ward, a.district, a.province]
                      .filter(Boolean)
                      .join(", ")}
                    icon={MapPin}
                  />
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <DocLink label="Giấy phép hoạt động" url={a.operationLicenseUrl} />
                  <DocLink
                    label="Giấy đăng ký kinh doanh"
                    url={a.businessRegistrationUrl}
                  />
                  {a.partnerType === "TRAVEL_AGENCY" && (
                    <>
                      <DocLink
                        label="Giấy phép lữ hành"
                        url={a.travelLicenseUrl}
                      />
                      <DocLink label="Giấy ký quỹ" url={a.signatureDocumentUrl} />
                    </>
                  )}
                </div>
              </SectionCard>

              {/* Giai đoạn 3 */}
              <SectionCard icon={Landmark} title="Giai đoạn 3 — Thông tin thanh toán">
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Ngân hàng thụ hưởng" value={a.bankName} />
                  <Field label="Số tài khoản" value={a.bankAccountNumber} />
                  <Field label="Tên chủ tài khoản" value={a.bankAccountHolder} />
                </dl>
              </SectionCard>

              {/* Giai đoạn 4 */}
              <SectionCard icon={ShieldCheck} title="Giai đoạn 4 — Xác nhận & Điều khoản">
                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { ok: a.confirmedAuthority, label: "Thẩm quyền đại diện" },
                    { ok: a.agreedPartnerTerms, label: "Điều khoản hợp tác" },
                    {
                      ok: a.agreedPrivacyPolicy,
                      label: "Chính sách dữ liệu cá nhân",
                    },
                  ].map((c) => (
                    <li
                      key={c.label}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                        c.ok
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      {c.ok ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <XCircle size={14} />
                      )}
                      {c.label}
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {/* Kết quả xử lý */}
              {(a.rejectionReason || a.reviewNote) && (
                <SectionCard icon={AlertTriangle} title="Kết quả xử lý">
                  {a.rejectionReason && (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      <strong>Lý do từ chối:</strong> {a.rejectionReason}
                    </p>
                  )}
                  {a.reviewNote && (
                    <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <strong>Ghi chú:</strong> {a.reviewNote}
                    </p>
                  )}
                </SectionCard>
              )}

              {/* Lịch sử kiểm duyệt */}
              <SectionCard icon={History} title="Lịch sử kiểm duyệt">
                {(!a.history || a.history.length === 0) ? (
                  <p className="text-sm text-slate-500">Chưa có thao tác nào được ghi nhận.</p>
                ) : (
                  <ol className="space-y-2">
                    {a.history.map((h) => (
                      <li
                        key={h.id}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <ChevronRight size={13} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800">
                            {ACTION_LABEL[h.action] || h.action}
                          </p>
                          <p className="text-xs text-slate-500">
                            {h.actorName || "Hệ thống"} · {formatDateTime(h.createdAt)}
                            {h.statusBefore && h.statusAfter
                              ? ` · ${STATUS_LABEL[h.statusBefore] || h.statusBefore} → ${
                                  STATUS_LABEL[h.statusAfter] || h.statusAfter
                                }`
                              : ""}
                          </p>
                          {h.reason && (
                            <p className="mt-1 text-xs text-slate-600 italic">“{h.reason}”</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </SectionCard>
            </div>
          )}
        </div>

        {/* Footer */}
        {a && !a.loading && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-3">
            <span className="text-xs text-slate-500">
              {isPending
                ? "Hồ sơ đang chờ duyệt — hãy kiểm tra kỹ trước khi quyết định."
                : `Đã xử lý lúc ${formatDateTime(a.reviewedAt)}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              {isPending && (
                <>
                  <button
                    type="button"
                    onClick={() => onReject(a)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    Từ chối
                  </button>
                  <button
                    type="button"
                    onClick={() => onApprove(a)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    Phê duyệt
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}