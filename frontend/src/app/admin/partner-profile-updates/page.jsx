"use client";

/**
 * Trang "Yêu cầu đổi thông tin" — Admin (nằm dưới nhóm "Quản lý đối tác").
 *
 * • Danh sách yêu cầu với bộ lọc trạng thái (Tất cả / Chờ duyệt / Đã duyệt / Bị từ chối).
 * • Bấm vào một yêu cầu ⇒ modal so sánh song song:
 *     - Cột trái: thông tin cũ (hiện tại)
 *     - Cột phải: thông tin mới (highlight xanh lá / cam)
 * • 2 nút: [Duyệt thay đổi] và [Từ chối thay đổi] (từ chối bắt buộc nhập lý do).
 * • Lịch sử thay đổi (audit) hiển thị trong modal chi tiết.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  History,
  Inbox,
  Landmark,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  UserCog,
  X,
  XCircle,
} from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import PartnerProfileFieldTable from "@/features/partnerprofileupdate/components/PartnerProfileFieldTable";
import {
  approveUpdate,
  getById,
  getQueue,
  getStats,
  rejectUpdate,
  PARTNER_PROFILE_FIELD_LABELS,
  PARTNER_PROFILE_GROUPS,
} from "@/features/partnerprofileupdate/services/partnerProfileUpdateService";

const PAGE_SIZE = 10;

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
};

const STATUS_LABEL = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
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

/** Icon đại diện cho từng nhóm thông tin. */
const GROUP_ICONS = {
  representative: UserCog,
  business: Building2,
  payment: Landmark,
};

/** Nhóm có ít nhất một trường có giá trị trong dữ liệu không. */
function hasAnyValue(r, group) {
  const oldData = r?.oldData ?? {};
  const newData = r?.newData ?? {};
  return group.fields.some((f) => {
    const a = oldData[f];
    const b = newData[f];
    return (
      (a !== null && a !== undefined && a !== "") ||
      (b !== null && b !== undefined && b !== "")
    );
  });
}

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

export default function AdminPartnerProfileUpdatesPage() {
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
      setError(getErrorMessage(e, "Không thể tải danh sách yêu cầu đổi thông tin."));
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  const loadStats = useCallback(async () => {
    try {
      setStats((await getStats()) ?? {});
    } catch {
      /* thống kê là thông tin phụ */
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
      (r) =>
        (r.partnerName ?? "").toLowerCase().includes(kw) ||
        (r.partnerEmail ?? "").toLowerCase().includes(kw) ||
        (r.businessName ?? "").toLowerCase().includes(kw)
    );
  }, [pageData.content, search]);

  const openDetail = async (id) => {
    setDetailLoading(true);
    setDetail({ id, loading: true });
    try {
      const res = await getById(id);
      setDetail(res);
    } catch (e) {
      showToast(getErrorMessage(e, "Không thể tải chi tiết yêu cầu."));
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (req) => {
    const ok = await confirm({
      tone: "success",
      icon: "check",
      title: "Duyệt thay đổi thông tin?",
      subject: req.businessName || req.partnerName,
      description:
        "Thông tin mới sẽ được ghi đè vào hồ sơ chính thức của đối tác ngay lập tức. " +
        "Thao tác này được ghi vào lịch sử thay đổi.",
      confirmLabel: "Duyệt thay đổi",
      cancelLabel: "Hủy bỏ",
    });
    if (!ok) return;

    setActionBusy(true);
    try {
      await approveUpdate(req.id, null);
      showToast("Đã duyệt thay đổi thông tin.");
      await Promise.all([load(), loadStats()]);
      if (detail?.id === req.id) openDetail(req.id);
    } catch (e) {
      showToast(getErrorMessage(e, "Không thể duyệt yêu cầu."));
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async (req) => {
    const reason = await confirm({
      tone: "danger",
      icon: "reject",
      title: "Từ chối thay đổi thông tin",
      subject: req.businessName || req.partnerName,
      description:
        "Lý do từ chối là bắt buộc và sẽ được hiển thị cho đối tác. " +
        "Hồ sơ chính thức giữ nguyên thông tin cũ.",
      confirmLabel: "Từ chối thay đổi",
      cancelLabel: "Hủy bỏ",
      input: {
        label: "Lý do từ chối",
        placeholder: "Ví dụ: Mã số thuế chưa khớp với giấy ĐKKD...",
        required: true,
      },
    });
    if (!reason) return;

    setActionBusy(true);
    try {
      await rejectUpdate(req.id, reason);
      showToast("Đã từ chối yêu cầu thay đổi thông tin.");
      await Promise.all([load(), loadStats()]);
      if (detail?.id === req.id) openDetail(req.id);
    } catch (e) {
      showToast(getErrorMessage(e, "Không thể từ chối yêu cầu."));
    } finally {
      setActionBusy(false);
    }
  };

  const totalCount = useMemo(
    () => Object.values(stats ?? {}).reduce((sum, v) => sum + Number(v || 0), 0),
    [stats]
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
              Yêu cầu đổi thông tin
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Yêu cầu chỉnh sửa hồ sơ do đối tác gửi. Duyệt ⇒ ghi đè vào hồ sơ chính thức;
              từ chối ⇒ giữ nguyên hồ sơ cũ và hiển thị lý do cho đối tác.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              load();
              loadStats();
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                {t.id === "ALL" ? totalCount : stats?.[t.id] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-5 py-3 shadow-2xs">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setStatus(t.id);
                setPage(0);
              }}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                status === t.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên doanh nghiệp, tên đối tác, email..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-full min-h-[240px] items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Đang tải danh sách yêu cầu...
            </div>
          ) : error ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 text-sm text-rose-600">
              <AlertTriangle size={20} />
              {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 text-sm text-slate-500">
              <Inbox size={22} className="text-slate-300" />
              Không có yêu cầu đổi thông tin nào ở trạng thái này.
            </div>
          ) : (
            <table className="w-full min-w-[900px] text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Đối tác</th>
                  <th className="px-4 py-3 text-left font-semibold">Doanh nghiệp / Cơ sở</th>
                  <th className="px-4 py-3 text-left font-semibold">Số trường đổi</th>
                  <th className="px-4 py-3 text-left font-semibold">Ngày gửi</th>
                  <th className="px-4 py-3 text-left font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {r.partnerName || "—"}
                      </div>
                      <div className="text-xs text-slate-500">{r.partnerEmail || ""}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.businessName || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                        {(r.changedFields ?? []).length} trường
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(r.submittedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          STATUS_BADGE[r.status] || STATUS_BADGE.PENDING
                        }`}
                      >
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDetail(r.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          <ClipboardList size={13} />
                          So sánh
                        </button>
                        {r.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(r)}
                              disabled={actionBusy}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle2 size={13} />
                              Duyệt
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(r)}
                              disabled={actionBusy}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
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
            unit="yêu cầu"
            onChange={setPage}
          />
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[400] max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      {detail && (
        <CompareModal
          request={detail}
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
   MODAL SO SÁNH SONG SONG
   ========================================================================= */

function CompareModal({ request, loading, busy, onClose, onApprove, onReject }) {
  const r = request;
  const isPending = r?.status === "PENDING";
  const changed = useMemo(() => new Set(r?.changedFields ?? []), [r]);
  const [onlyChanged, setOnlyChanged] = useState(false);

  // Trường bị thay đổi: ưu tiên danh sách từ backend, fallback = so sánh 2 map.
  const changedKeys = useMemo(() => {
    if (changed.size > 0) return Array.from(changed);
    const keys = new Set();
    PARTNER_PROFILE_GROUPS.forEach((g) => {
      g.fields.forEach((k) => {
        const before = (r?.oldData ?? {})[k] ?? "";
        const after = (r?.newData ?? {})[k] ?? "";
        if (String(before) !== String(after)) keys.add(k);
      });
    });
    return Array.from(keys);
  }, [r, changed]);

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-slate-900">
              {r?.businessName || r?.partnerName || "Chi tiết yêu cầu đổi thông tin"}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>#{r?.id}</span>
              {r?.status && (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    STATUS_BADGE[r.status] || STATUS_BADGE.PENDING
                  }`}
                >
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              )}
              <span>Gửi lúc {formatDateTime(r?.submittedAt)}</span>
              <span>· {changedKeys.length} trường thay đổi</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading || !r || r.loading ? (
            <div className="flex h-[240px] items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Đang tải yêu cầu...
            </div>
          ) : (
            <div className="space-y-4">
              {r.partnerNote && (
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <strong>Ghi chú của đối tác:</strong> {r.partnerNote}
                </p>
              )}

              {/* Tóm tắt thay đổi */}
              {changedKeys.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <Sparkles size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-emerald-900">
                      Đối tác đề xuất thay đổi {changedKeys.length} trường
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-700">
                      {changedKeys
                        .map((k) => PARTNER_PROFILE_FIELD_LABELS[k] || k)
                        .join(" · ")}
                    </p>
                  </div>
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50">
                    <input
                      type="checkbox"
                      checked={onlyChanged}
                      onChange={(e) => setOnlyChanged(e.target.checked)}
                      className="h-3.5 w-3.5 cursor-pointer accent-emerald-600"
                    />
                    Chỉ hiện trường thay đổi
                  </label>
                </div>
              )}

              {/* So sánh song song — chia theo 3 nhóm nghiệp vụ */}
              <div className="space-y-4">
                {PARTNER_PROFILE_GROUPS.map((group) => {
                  const Icon = GROUP_ICONS[group.id] ?? UserCog;
                  const groupChanged = group.fields.filter((f) =>
                    changedKeys.includes(f)
                  );
                  if (groupChanged.length === 0 && !hasAnyValue(r, group)) {
                    return null;
                  }
                  // Ẩn nhóm không có thay đổi khi người dùng bật "chỉ hiện trường thay đổi".
                  if (onlyChanged && groupChanged.length === 0) {
                    return null;
                  }
                  return (
                    <section
                      key={group.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs"
                    >
                      {/* Tiêu đề nhóm */}
                      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                            <Icon size={14} />
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900">
                              {group.label}
                            </h4>
                            {group.description && (
                              <p className="text-xs text-slate-500">
                                {group.description}
                              </p>
                            )}
                          </div>
                        </div>
                        {groupChanged.length > 0 ? (
                          <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {groupChanged.length} trường thay đổi
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                            Không thay đổi
                          </span>
                        )}
                      </header>

                      {/* 2 cột: cũ | mới */}
                      <div className="grid gap-px bg-slate-200 lg:grid-cols-2">
                        <div className="bg-white p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-500 text-white">
                              <UserCog size={12} />
                            </span>
                            <h5 className="text-xs font-bold uppercase tracking-wide text-slate-600">
                              Thông tin hiện tại (cũ)
                            </h5>
                          </div>
                          <PartnerProfileFieldTable
                            profile={r.oldData ?? {}}
                            labels={PARTNER_PROFILE_FIELD_LABELS}
                            order={group.fields}
                            changed={new Set(changedKeys)}
                            tone="old"
                            onlyChanged={onlyChanged}
                          />
                        </div>

                        <div className="bg-emerald-50/40 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white">
                              <ArrowRight size={12} />
                            </span>
                            <h5 className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                              Thông tin mới đề xuất
                            </h5>
                          </div>
                          <PartnerProfileFieldTable
                            profile={r.newData ?? {}}
                            labels={PARTNER_PROFILE_FIELD_LABELS}
                            order={group.fields}
                            changed={new Set(changedKeys)}
                            tone="changed"
                            onlyChanged={onlyChanged}
                            previous={r.oldData ?? {}}
                          />
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>

              {r.adminNote && (
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <ClipboardList size={15} />
                    Ghi chú của quản trị viên
                  </h4>
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {r.adminNote}
                  </p>
                </section>
              )}

              {/* Kết quả xử lý */}
              {r.reason && (
                <section className="rounded-2xl border border-rose-200 bg-white p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-rose-900">
                    <XCircle size={15} />
                    Lý do từ chối
                  </h4>
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {r.reason}
                  </p>
                </section>
              )}

              {/* Lịch sử thay đổi */}
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <History size={14} />
                  </span>
                  Lịch sử thay đổi
                </h4>
                {(!r.history || r.history.length === 0) ? (
                  <p className="text-sm text-slate-500">Chưa có thao tác nào được ghi nhận.</p>
                ) : (
                  <ol className="relative space-y-0">
                    {r.history.map((h, idx) => {
                      const tone = HISTORY_TONE[h.action] ?? HISTORY_TONE.SUBMITTED;
                      const Icon = tone.icon;
                      const isLast = idx === r.history.length - 1;
                      return (
                        <li key={h.id} className="relative flex gap-3 pb-3 last:pb-0">
                          {!isLast && (
                            <span
                              className="absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px bg-slate-200"
                              aria-hidden="true"
                            />
                          )}
                          <span
                            className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone.chip}`}
                          >
                            <Icon size={15} />
                          </span>
                          <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                            <p className="text-sm font-semibold text-slate-800">
                              {ACTION_LABEL[h.action] || h.action}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {h.actorName || "Hệ thống"} · {formatDateTime(h.createdAt)}
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
                )}
              </section>
            </div>
          )}
        </div>

        {r && !r.loading && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-3">
            <span className="text-xs text-slate-500">
              {isPending
                ? "Yêu cầu đang chờ duyệt — hãy kiểm tra kỹ trước khi quyết định."
                : `Đã xử lý lúc ${formatDateTime(r.reviewedAt)}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Đóng
              </button>
              {isPending && (
                <>
                  <button
                    type="button"
                    onClick={() => onReject(r)}
                    disabled={busy}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    Từ chối thay đổi
                  </button>
                  <button
                    type="button"
                    onClick={() => onApprove(r)}
                    disabled={busy}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    Duyệt thay đổi
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
