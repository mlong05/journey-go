"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  FileCheck,
  Loader2,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  getPaymentById,
  getPaymentSummary,
  queryPayment,
  searchPayments,
} from "@/features/payment/services/paymentService";
import {
  confirmManualTransfer,
  getAllRefunds,
  getRefundById,
  refreshRefundStatus,
  reviewRefund,
} from "@/features/refund/services/refundService";
import { getAllBookings } from "@/features/booking/services/bookingService";
import { getPlatformRevenueSummary } from "@/features/settlement/services/settlementService";
import {
  auditActionLabel,
  BOOKING_STATUS_LABELS,
  formatDateTimeVN,
  formatVND,
  normalizePage,
  PAYMENT_STATUS_LABELS,
  paymentMatchesKeyword,
  paymentMethodLabel,
  REFUND_METHOD_LABELS,
  REFUND_REASON_LABELS,
  refundAmountForReason,
  refundStatusLabel,
  REFUND_STATUS_LABELS,
  sanitizeAuditDetail,
  vnpayMessageForUser,
  vnpayResponseCodeForUser,
} from "@/lib/money";

const TABS = [
  { id: "payments", label: "Giao dịch" },
  { id: "refunds", label: "Hoàn tiền" },
  { id: "bookings", label: "Đơn đặt tour" },
];

/** Số bản ghi mỗi trang. */
const PAGE_SIZE = 10;

/**
 * Giao dịch nào còn có thể "Truy vấn lại" từ VNPay?
 *
 * ── Vì sao? ──
 * `PaymentStatus.isFinal()` bên backend xác định giao dịch đã có kết quả cuối cùng
 * rõ ràng (SUCCESS / FAILED / CANCELLED). Với các trạng thái đó thì QueryDR không
 * mang lại thông tin mới ⇒ ẩn nút "Truy vấn lại".
 *
 * Ngược lại (PENDING / PROCESSING / EXPIRED) kết quả vẫn CHƯA rõ ⇒ cần cho Admin
 * truy vấn thủ công được đặt NGAY CẠNH trạng thái để thao tác nhanh.
 */
const QUERYABLE_PAYMENT_STATUSES = ["PENDING", "PROCESSING", "EXPIRED"];

function canQueryPayment(status) {
  return QUERYABLE_PAYMENT_STATUSES.includes(status);
}

/**
 * Trang Quản trị Tài chính — JourneyGo.
 *
 * ── Ba tab ──
 *  1. Giao dịch   — theo dõi & xác minh (truy vấn lại kết quả) giao dịch VNPay.
 *  2. Hoàn tiền   — xem chi tiết / duyệt / từ chối / ghi nhận chuyển khoản thủ công.
 *  3. Đơn đặt tour — trạng thái booking & hạn thanh toán 10 phút.
 */
export default function AdminFinancePage() {
  const [tab, setTab] = useState("payments");

  return (
    // Chiếm đúng chiều cao khung chứa — trang KHÔNG cuộn theo window.
    // Chỉ vùng bảng bên trong mới cuộn (overflow-auto ở từng tab).
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Header — chỉ giữ tiêu đề, bỏ mô tả thừa để tận dụng chiều cao màn hình */}
      <div className="shrink-0 bg-white rounded-2xl px-5 py-4 border border-slate-200/90 shadow-2xs">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">
          Quản lý dòng tiền &amp; cổng thanh toán
        </h1>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              tab === t.id
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Nội dung tab — chiếm phần chiều cao còn lại, tự cuộn bên trong */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "payments" && <PaymentsTab />}
        {tab === "refunds" && <RefundsTab />}
        {tab === "bookings" && <BookingsTab />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 1 — GIAO DỊCH
   ══════════════════════════════════════════════════════════════════════════ */

function PaymentsTab() {
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [summary, setSummary] = useState(null);
  const [platformRevenue, setPlatformRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  // Từ khoá đã áp dụng (sau debounce) — truyền xuống BACKEND để tìm toàn hệ thống.
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null);

  // Debounce 400ms + về trang đầu khi từ khoá đổi — tránh gõ mỗi ký tự lại gọi API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Chỉ số tổng được lấy từ endpoint riêng (toàn hệ thống) —
      // cộng trên nội dung trang sẽ cho số liệu sai khi phân trang.
      //
      // `searchPayments` tự lo phần tìm kiếm TOÀN HỆ THỐNG: ưu tiên lọc ở backend
      // (đúng nhất), nếu backend không hỗ trợ thì quét toàn bộ trang rồi lọc ở client
      // ⇒ mã giao dịch nằm ở trang 3 vẫn ra ngay khi đang ở trang 1.
      const [data, sum, platform] = await Promise.all([
        searchPayments({
          status: statusFilter || undefined,
          search: search || undefined,
          page,
          size: PAGE_SIZE,
        }),
        getPaymentSummary().catch(() => null),
        // Doanh thu nền tảng (phần thu được sau khi tất toán cho đối tác).
        // Lỗi ở endpoint này KHÔNG được làm hỏng tab giao dịch.
        getPlatformRevenueSummary(12).catch(() => null),
      ]);
      setPageData(normalizePage(data, PAGE_SIZE));
      if (sum) setSummary(sum);
      if (platform) setPlatformRevenue(platform);
    } catch (err) {
      setError(err?.message || "Không thể tải danh sách giao dịch.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    // `queueMicrotask` để không gọi setState đồng bộ trong thân effect
    // (tránh cascading render — xem convention của các trang admin khác).
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Đổi bộ lọc → về trang đầu.
  const changeStatus = (value) => {
    setStatusFilter(value);
    setPage(0);
  };

  const filtered = pageData.content;

  const totals = useMemo(() => {
    // Ưu tiên số liệu tổng của TOÀN HỆ THỐNG (backend).
    // Chỉ fallback về cộng tại trang hiện tại khi endpoint summary không có.
    const success = pageData.content.filter((p) => p?.status === "SUCCESS");
    return {
      successCount: summary?.successCount ?? success.length,
      successAmount: summary?.totalSuccessAmount
        ?? success.reduce((s, p) => s + Number(p?.amount ?? 0), 0),
      pendingCount:
        summary?.pendingCount
        ?? pageData.content.filter((p) => ["PENDING", "PROCESSING"].includes(p?.status)).length,
    };
  }, [pageData.content, summary]);

  const handleQuery = async (payment) => {
    setBusyId(payment.id);
    setError("");
    try {
      await queryPayment(payment.id);
      await load();
    } catch (err) {
      setError(err?.message || "Không thể truy vấn kết quả giao dịch.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-4">
      {/* Chỉ số — số liệu TOÀN HỆ THỐNG, không phụ thuộc trang đang xem */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Giao dịch thành công" value={String(totals.successCount)} />
        <Metric
          label="Tổng tiền đã thu"
          value={formatVND(totals.successAmount)}
          tone="emerald"
          hint="Tổng tiền các tour đã thanh toán thành công trên toàn hệ thống"
        />
        <Metric
          label="Doanh thu nền tảng"
          value={formatVND(platformRevenue?.totalPlatformRevenue)}
          tone="emerald"
          hint="Phần thu được sau khi tất toán cho đối tác"
        />
        <Metric
          label="Đang chờ xác minh"
          value={String(totals.pendingCount)}
          tone="amber"
        />
      </div>

      <Panel
        fill
        icon={Receipt}
        title="Nhật ký giao dịch toàn sàn"
        footer={
          <Pagination
            page={page}
            totalPages={pageData.totalPages}
            totalElements={pageData.totalElements}
            unit="giao dịch"
            onChange={setPage}
          />
        }
        right={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => changeStatus(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm mã giao dịch / mã đơn..."
                className="h-8 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="Xoá từ khoá"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <XCircle size={13} />
                </button>
              )}
            </div>
          </div>
        }
      >
        {error && <ErrorBox text={error} />}
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          search ? (
            <Empty
              icon={Search}
              text={`Không tìm thấy giao dịch nào khớp với "${search}"`}
            />
          ) : (
            <Empty icon={CreditCard} text="Chưa có giao dịch phát sinh" />
          )
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[980px]">
              {/* Sticky header — tiêu đề cột luôn nhìn thấy khi cuộn danh sách */}
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-4">Mã giao dịch</th>
                  <th className="py-2.5 px-3">Mã đơn</th>
                  <th className="py-2.5 px-3">Phương thức</th>
                  <th className="py-2.5 px-3">Số tiền</th>
                  <th className="py-2.5 px-3">Thời điểm</th>
                  <th className="py-2.5 px-3 w-[200px]">Trạng thái</th>
                  <th className="py-2.5 px-4 text-right w-[110px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 align-middle">
                    <td className="py-2.5 px-4 align-middle">
                      <span className="block font-mono text-xs font-semibold text-slate-900 break-all leading-tight">
                        {p?.txnRef ?? `#${p?.id}`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span className="block font-mono text-[11px] text-slate-600 break-all leading-tight">
                        {p?.bookingCode ?? "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span className="block text-[11px] text-slate-600 leading-tight">
                        {paymentMethodLabel(p)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span className="block font-mono font-semibold text-slate-900 leading-tight">
                        {formatVND(p?.amount)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span className="block text-[11px] text-slate-600 leading-tight">
                        {formatDateTimeVN(p?.createdAt)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      {/* Trạng thái + nút truy vấn lại (chỉ với giao dịch chưa có kết quả cuối) */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusPill
                          status={p?.status}
                          label={PAYMENT_STATUS_LABELS[p?.status]}
                        />
                        {canQueryPayment(p?.status) && (
                          <button
                            type="button"
                            onClick={() => handleQuery(p)}
                            disabled={busyId === p.id}
                            className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 bg-white px-1.5 text-[10.5px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            title="Truy vấn lại kết quả giao dịch từ VNPay"
                          >
                            {busyId === p.id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <RefreshCw size={10} />
                            )}
                            Truy vấn lại
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetail(p)}
                          className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Eye size={11} />
                          Chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {detail && (
        <PaymentDetailModal
          payment={detail}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 2 — HOÀN TIỀN
   ══════════════════════════════════════════════════════════════════════════ */

function RefundsTab() {
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllRefunds({
        status: statusFilter || undefined,
        page,
        size: PAGE_SIZE,
      });
      setPageData(normalizePage(data, PAGE_SIZE));
    } catch (err) {
      setError(err?.message || "Không thể tải danh sách yêu cầu hoàn tiền.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const changeStatus = (value) => {
    setStatusFilter(value);
    setPage(0);
  };

  const handleReview = async (refund, payload) => {
    setBusyId(refund.id);
    setError("");
    try {
      await reviewRefund(refund.id, payload);
      setReviewing(null);
      await load();
    } catch (err) {
      setError(err?.message || "Không thể xử lý yêu cầu hoàn tiền.");
    } finally {
      setBusyId(null);
    }
  };

  const handleManualTransfer = async (refund) => {
    const reference = window.prompt("Nhập mã tham chiếu chuyển khoản:");
    if (!reference) return;
    setBusyId(refund.id);
    setError("");
    try {
      await confirmManualTransfer(refund.id, { transferReference: reference });
      await load();
    } catch (err) {
      setError(err?.message || "Không thể ghi nhận chuyển khoản thủ công.");
    } finally {
      setBusyId(null);
    }
  };

  const handleRefreshStatus = async (refund) => {
    setBusyId(refund.id);
    setError("");
    try {
      await refreshRefundStatus(refund.id);
      await load();
    } catch (err) {
      setError(err?.message || "Không thể kiểm tra lại trạng thái hoàn tiền.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-4">
      <Panel
        fill
        icon={RotateCcw}
        title="Yêu cầu hoàn tiền"
        footer={
          <Pagination
            page={page}
            totalPages={pageData.totalPages}
            totalElements={pageData.totalElements}
            unit="yêu cầu hoàn tiền"
            onChange={setPage}
          />
        }
        right={
          <select
            value={statusFilter}
            onChange={(e) => changeStatus(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(REFUND_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        }
      >
        {error && <ErrorBox text={error} />}
        {loading ? (
          <Loading />
        ) : pageData.content.length === 0 ? (
          <Empty icon={RotateCcw} text="Không có yêu cầu hoàn tiền nào" />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1080px] table-fixed">
              {/* Sticky header — tiêu đề cột luôn nhìn thấy khi cuộn danh sách */}
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-4 w-[150px]">Mã yêu cầu</th>
                  <th className="py-2.5 px-3 w-[150px]">Mã đơn / giao dịch</th>
                  <th className="py-2.5 px-3">Nguyên nhân</th>
                  <th className="py-2.5 px-3 w-[150px]">Số tiền</th>
                  <th className="py-2.5 px-3 w-[130px]">Phương thức</th>
                  <th className="py-2.5 px-3 w-[130px]">Thời điểm</th>
                  <th className="py-2.5 px-3 w-[260px]">Trạng thái</th>
                  <th className="py-2.5 px-4 text-right w-[110px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageData.content.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 align-middle">
                    <td className="py-2.5 px-4 align-middle">
                      <span className="block font-mono text-xs font-semibold text-slate-900 break-all leading-tight">
                        {r?.refundCode ?? `#${r?.id}`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span className="block font-mono text-[11px] font-semibold text-slate-700 break-all leading-tight">
                        {r?.bookingCode ?? "—"}
                      </span>
                      <span className="mt-0.5 block font-mono text-[10.5px] text-slate-400 break-all leading-tight">
                        {r?.txnRef ?? "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span className="block font-medium text-slate-700 leading-tight">
                        {REFUND_REASON_LABELS[r?.approvedReason ?? r?.declaredReason] ??
                          "—"}
                      </span>
                      {r?.reasonDetail && (
                        <span
                          className="mt-1 block max-w-[260px] truncate text-[11px] text-slate-500"
                          title={r.reasonDetail}
                        >
                          {r.reasonDetail}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span className="block font-mono font-semibold text-slate-900 leading-tight">
                        {formatVND(r?.proposedAmount)}
                      </span>
                      {r?.approvedAmount > 0 && (
                        <span className="mt-0.5 block font-mono text-[11px] font-semibold text-emerald-700 leading-tight">
                          Duyệt: {formatVND(r.approvedAmount)}
                        </span>
                      )}
                      {r?.refundedAmount > 0 && (
                        <span className="mt-0.5 block font-mono text-[11px] font-semibold text-sky-700 leading-tight">
                          Đã hoàn: {formatVND(r.refundedAmount)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span className="block text-[11px] text-slate-600 leading-tight">
                        {r?.method ? REFUND_METHOD_LABELS[r.method] ?? r.method : "Chưa chọn"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span className="block text-[11px] text-slate-600 leading-tight">
                        {formatDateTimeVN(r?.createdAt)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      {/* Trạng thái + các hành động gắn với trạng thái
                          (truy vấn lại / xử lý) — đặt NGAY CẠNH badge để thao tác nhanh.
                          Cột "Thao tác" chỉ giữ nút "Chi tiết". */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusPill
                          status={r?.status}
                          label={refundStatusLabel(r?.status)}
                        />
                        {r?.status === "REFUND_PROCESSING" && (
                          <button
                            type="button"
                            onClick={() => handleRefreshStatus(r)}
                            disabled={busyId === r.id}
                            className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 bg-white px-1.5 text-[10.5px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            title="Kiểm tra lại kết quả hoàn tiền từ VNPay"
                          >
                            {busyId === r.id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <RefreshCw size={10} />
                            )}
                            Kiểm tra
                          </button>
                        )}
                        {r?.status === "PENDING_REVIEW" && (
                          <button
                            type="button"
                            onClick={() => setReviewing(r)}
                            className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md bg-sky-600 px-1.5 text-[10.5px] font-semibold text-white hover:bg-sky-700"
                          >
                            <FileCheck size={10} />
                            Xử lý
                          </button>
                        )}
                        {r?.status === "APPROVED" &&
                          r?.method === "MANUAL_BANK_TRANSFER" && (
                            <button
                              type="button"
                              onClick={() => handleManualTransfer(r)}
                              disabled={busyId === r.id}
                              className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md bg-emerald-600 px-1.5 text-[10.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle2 size={10} />
                              Đã chuyển
                            </button>
                          )}
                      </div>
                      {r?.rejectionReason && (
                        <span
                          className="mt-1 block max-w-[160px] truncate text-[11px] text-rose-600"
                          title={r.rejectionReason}
                        >
                          {r.rejectionReason}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailId(r.id)}
                          className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Eye size={11} />
                          Chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {reviewing && (
        <ReviewRefundModal
          refund={reviewing}
          busy={busyId === reviewing.id}
          onClose={() => setReviewing(null)}
          onSubmit={(payload) => handleReview(reviewing, payload)}
        />
      )}

      {detailId && (
        <RefundDetailModal refundId={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}

/**
 * Modal chi tiết yêu cầu hoàn tiền — gọi GET /refunds/{id} để lấy nhật ký kiểm toán.
 */
function RefundDetailModal({ refundId, onClose }) {
  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getRefundById(refundId)
      .then((data) => {
        if (!active) return;
        setRefund(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Không thể tải chi tiết yêu cầu hoàn tiền.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refundId]);

  // Nhật ký đã rút gọn — tính 1 lần thay vì gọi lại ở mỗi lần render.
  const auditLogs = useMemo(() => dedupeAuditLogs(refund?.auditLogs), [refund?.auditLogs]);

  return (
    <ModalShell title="Chi tiết yêu cầu hoàn tiền" onClose={onClose} wide>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox text={error} />
      ) : refund ? (
        <div className="space-y-5">
          {/* Tóm tắt */}
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Mã yêu cầu" value={refund?.refundCode} mono />
            <InfoRow
              label="Trạng thái"
              value={refundStatusLabel(refund?.status)}
              pill
              status={refund?.status}
            />
            <InfoRow label="Mã đơn" value={refund?.bookingCode} mono />
            <InfoRow label="Mã giao dịch" value={refund?.txnRef} mono />
            <InfoRow label="Nguyên nhân khai báo" value={REFUND_REASON_LABELS[refund?.declaredReason]} />
            <InfoRow label="Nguyên nhân quản trị viên xác định" value={REFUND_REASON_LABELS[refund?.approvedReason]} />
            <InfoRow label="Số tiền của đơn" value={formatVND(refund?.paymentAmount)} mono />
            <InfoRow label="Số tiền đề xuất" value={formatVND(refund?.proposedAmount)} mono />
            <InfoRow label="Số tiền được duyệt" value={formatVND(refund?.approvedAmount)} mono />
            <InfoRow label="Số tiền đã hoàn" value={formatVND(refund?.refundedAmount)} mono />
            <InfoRow
              label="Phương thức hoàn"
              value={refund?.method ? REFUND_METHOD_LABELS[refund.method] ?? refund.method : "Chưa chọn"}
            />
            <InfoRow label="Thời điểm tạo" value={formatDateTimeVN(refund?.createdAt)} />
            <InfoRow label="Thời điểm xử lý" value={formatDateTimeVN(refund?.reviewedAt)} />
          </div>

          {/* Lý do */}
          {refund?.reasonDetail && (
            <DetailBlock title="Chi tiết lý do">
              <p className="text-xs text-slate-700 leading-relaxed">{refund.reasonDetail}</p>
            </DetailBlock>
          )}

          {refund?.rejectionReason && (
            <DetailBlock title="Lý do từ chối">
              <p className="text-xs text-rose-700 leading-relaxed">{refund.rejectionReason}</p>
            </DetailBlock>
          )}

          {/* Thông tin ngân hàng nhận tiền */}
          {(refund?.bankAccountNumber || refund?.transferReference) && (
            <DetailBlock title="Thông tin nhận tiền">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Số tài khoản" value={refund?.bankAccountNumber} mono />
                <InfoRow label="Chủ tài khoản" value={refund?.bankAccountName} />
                <InfoRow label="Ngân hàng" value={refund?.bankName} />
                <InfoRow label="Mã tham chiếu" value={refund?.transferReference} mono />
              </div>
            </DetailBlock>
          )}

          {/* Kết quả VNPay — thông điệp lỗi kỹ thuật (mã 99 / "Unexpected error")
              KHÔNG BAO GIỜ hiển thị cho người dùng. */}
          {(refund?.vnpResponseCode || refund?.vnpTransactionNo) && (
            <DetailBlock title="Kết quả từ VNPay">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Mã yêu cầu VNPay" value={refund?.vnpRequestId} mono />
                <InfoRow label="Mã giao dịch VNPay" value={refund?.vnpTransactionNo} mono />
                <InfoRow
                  label="Mã phản hồi"
                  value={vnpayResponseCodeForUser(refund?.vnpResponseCode)}
                  mono
                />
                <InfoRow label="Trạng thái giao dịch" value={refund?.vnpTransactionStatus} mono />
                <InfoRow
                  label="Thông điệp VNPay"
                  value={vnpayMessageForUser(refund?.vnpResponseCode, refund?.vnpMessage)}
                />
                <InfoRow label="Thời điểm xác minh" value={formatDateTimeVN(refund?.vnpResolvedAt)} />
              </div>
            </DetailBlock>
          )}

          {/* Nhật ký kiểm toán — dùng timeline tiếng Việt, ẩn hoàn toàn
              thuật ngữ kỹ thuật (mã hành động, mã trạng thái, payload thô).
              Các dòng trùng lặp do bấm "Kiểm tra" nhiều lần đã được gộp lại. */}
          <DetailBlock title="Nhật ký xử lý">
            {auditLogs.length > 0 ? (
              <ol className="relative space-y-3 pl-6">
                {/* Vạch dọc nối các mốc thời gian */}
                <span
                  aria-hidden="true"
                  className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200"
                />
                {auditLogs.map((log, idx) => (
                  <li key={log?.id ?? idx} className="relative">
                    {/* Chấm mốc */}
                    <span
                      aria-hidden="true"
                      className={`absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white ring-1 ${auditDotClass(
                        log?.action,
                      )}`}
                    />
                    <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 border border-slate-100">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-xs font-semibold text-slate-800">
                          {auditActionLabel(log?.action)}
                        </span>
                        {log?.fromStatus && log?.fromStatus !== log?.toStatus && (
                          <span className="text-[11px] text-slate-500">
                            {refundStatusLabel(log.fromStatus)} →{" "}
                            <span className="font-semibold text-slate-700">
                              {refundStatusLabel(log?.toStatus)}
                            </span>
                          </span>
                        )}
                        {!log?.fromStatus && log?.toStatus && (
                          <span className="text-[11px] text-slate-500">
                            Trạng thái:{" "}
                            <span className="font-semibold text-slate-700">
                              {refundStatusLabel(log?.toStatus)}
                            </span>
                          </span>
                        )}
                        {log?.amount > 0 && (
                          <span className="font-mono text-[11px] font-semibold text-emerald-700">
                            {formatVND(log.amount)}
                          </span>
                        )}
                        <span className="ml-auto text-[11px] text-slate-400 font-medium">
                          {formatDateTimeVN(log?.createdAt)}
                        </span>
                      </div>
                      {(() => {
                        // Làm sạch TRƯỚC khi render: nếu sau khi lọc không còn nội dung
                        // đáng hiển thị thì bỏ hẳn dòng mô tả (tránh dòng trống vô nghĩa).
                        const cleanDetail = sanitizeAuditDetail(log?.detail);
                        return cleanDetail ? (
                          <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                            {cleanDetail}
                          </p>
                        ) : null;
                      })()}
                      {log?.reference && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Mã tham chiếu:{" "}
                          <span className="font-mono text-slate-500">{log.reference}</span>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-slate-500">
                Chưa có nhật ký xử lý cho yêu cầu này.
              </p>
            )}
          </DetailBlock>
        </div>
      ) : null}
    </ModalShell>
  );
}

/**
 * Modal chi tiết giao dịch thanh toán — gọi GET /payments/{id}.
 */
function PaymentDetailModal({ payment, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getPaymentById(payment.id)
      .then((data) => {
        if (!active) return;
        setDetail(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Không thể tải chi tiết giao dịch.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [payment.id]);

  const p = detail ?? payment;

  return (
    <ModalShell title="Chi tiết giao dịch thanh toán" onClose={onClose}>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox text={error} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Mã giao dịch" value={p?.txnRef} mono />
            <InfoRow
              label="Trạng thái"
              value={PAYMENT_STATUS_LABELS[p?.status] ?? p?.status}
              pill
              status={p?.status}
            />
            <InfoRow label="Mã đơn" value={p?.bookingCode} mono />
            <InfoRow label="Số tiền" value={formatVND(p?.amount)} mono />
            <InfoRow label="Phương thức" value={paymentMethodLabel(p)} />
            <InfoRow label="Loại tiền" value={p?.currency} />
            <InfoRow label="Thời điểm tạo" value={formatDateTimeVN(p?.createdAt)} />
            <InfoRow label="Hạn thanh toán" value={formatDateTimeVN(p?.expiresAt)} />
            <InfoRow label="Thời điểm đã thanh toán" value={formatDateTimeVN(p?.paidAt)} />
            <InfoRow label="Số lần IPN nhận" value={p?.ipnCount} />
            <InfoRow label="Mã giao dịch VNPay" value={p?.vnpTransactionNo} mono />
            <InfoRow
              label="Mã phản hồi VNPay"
              value={vnpayResponseCodeForUser(p?.vnpResponseCode)}
              mono
            />
            <InfoRow label="Trạng thái giao dịch VNPay" value={p?.vnpTransactionStatus} mono />
            <InfoRow
              label="Thông điệp VNPay"
              value={vnpayMessageForUser(p?.vnpResponseCode, p?.vnpMessage)}
            />
          </div>

          {p?.duplicatePayment && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                Giao dịch trùng — đơn đã được thanh toán bởi một giao dịch khác.
              </span>
            </div>
          )}

          {p?.note && (
            <DetailBlock title="Ghi chú">
              <p className="text-xs text-slate-700 leading-relaxed">{p.note}</p>
            </DetailBlock>
          )}
        </div>
      )}
    </ModalShell>
  );
}

function ReviewRefundModal({ refund, busy, onClose, onSubmit }) {
  const [approve, setApprove] = useState(true);
  const [reason, setReason] = useState(refund?.declaredReason ?? "TOURIST_FAULT");
  const [method, setMethod] = useState("VNPAY_API");
  const [amount, setAmount] = useState(
    String(refundAmountForReason(refund?.paymentAmount, refund?.declaredReason ?? "TOURIST_FAULT")),
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [note, setNote] = useState("");

  // Số tiền gốc của đơn — cơ sở để tính 50% / 100%.
  // `paymentAmount` do backend trả về; fallback về `proposedAmount` cho dữ liệu cũ.
  const paymentAmount = Number(refund?.paymentAmount ?? refund?.proposedAmount ?? 0);
  const rate = reason === "PLATFORM_FAULT" ? 1 : 0.5;

  /**
   * Đổi nguyên nhân ⇒ tự tính lại số tiền hoàn theo tỷ lệ chính sách:
   *   • Lỗi khách du lịch → 50% số tiền gốc
   *   • Lỗi nền tảng     → 100% số tiền gốc
   * Ví dụ: đơn 1.500.000 → 750.000 (khách) / 1.500.000 (nền tảng).
   */
  const handleReasonChange = (value) => {
    setReason(value);
    setAmount(String(refundAmountForReason(paymentAmount, value)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!approve) {
      if (!rejectionReason.trim()) {
        alert("Vui lòng nhập lý do từ chối.");
        return;
      }
      onSubmit({ approve: false, rejectionReason: rejectionReason.trim(), note: note || null });
      return;
    }
    onSubmit({
      approve: true,
      reason,
      method,
      amount: Number(amount) || undefined,
      note: note || null,
    });
  };

  return (
    <ModalShell
      title={`Xử lý yêu cầu hoàn tiền ${refund?.refundCode ?? `#${refund?.id}`}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Số tiền gốc của đơn — luôn hiển thị để quản trị viên đối chiếu */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold text-slate-500">
                Số tiền của đơn
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
                {formatVND(paymentAmount)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-slate-500">
                Mã đơn
              </p>
              <p className="mt-1 font-mono text-xs font-semibold text-slate-700">
                {refund?.bookingCode ?? "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setApprove(true)}
            className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${
              approve
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Duyệt
          </button>
          <button
            type="button"
            onClick={() => setApprove(false)}
            className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${
              !approve
                ? "bg-rose-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Từ chối
          </button>
        </div>

        {approve ? (
          <>
            <Field label="Nguyên nhân do quản trị viên xác định">
              <select
                value={reason}
                onChange={(e) => handleReasonChange(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs focus:bg-white focus:outline-none"
              >
                <option value="TOURIST_FAULT">
                  Lỗi khách du lịch — hoàn 50% ({formatVND(paymentAmount * 0.5)})
                </option>
                <option value="PLATFORM_FAULT">
                  Lỗi nền tảng — hoàn 100% ({formatVND(paymentAmount)})
                </option>
              </select>
            </Field>

            <Field label="Phương thức hoàn tiền">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs focus:bg-white focus:outline-none"
              >
                <option value="VNPAY_API">Hoàn qua VNPay (khuyến nghị)</option>
                <option value="MANUAL_BANK_TRANSFER">Chuyển khoản thủ công</option>
              </select>
            </Field>

            <Field
              label="Số tiền duyệt"
              hint={`Tự động tính theo nguyên nhân: ${rate * 100}% × ${formatVND(
                paymentAmount,
              )} = ${formatVND(refundAmountForReason(paymentAmount, reason))}`}
            >
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                max={paymentAmount}
                readOnly
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
              />
            </Field>
          </>
        ) : (
          <Field label="Lý do từ chối (bắt buộc)">
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none"
            />
          </Field>
        )}

        <Field label="Ghi chú">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy && <Loader2 size={12} className="animate-spin" />}
            Xác nhận
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 3 — ĐƠN ĐẶT TOUR
   ══════════════════════════════════════════════════════════════════════════ */

function BookingsTab() {
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllBookings({
        status: statusFilter || undefined,
        page,
        size: PAGE_SIZE,
      });
      setPageData(normalizePage(data, PAGE_SIZE));
    } catch (err) {
      setError(err?.message || "Không thể tải danh sách đơn.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const changeStatus = (value) => {
    setStatusFilter(value);
    setPage(0);
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-4">
      <Panel
        fill
        icon={Clock}
        title="Đơn đặt tour"
        footer={
          <Pagination
            page={page}
            totalPages={pageData.totalPages}
            totalElements={pageData.totalElements}
            unit="đơn đặt tour"
            onChange={setPage}
          />
        }
        right={
          <select
            value={statusFilter}
            onChange={(e) => changeStatus(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        }
      >
      {error && <ErrorBox text={error} />}
      {loading ? (
        <Loading />
      ) : pageData.content.length === 0 ? (
        <Empty icon={Clock} text="Chưa có đơn đặt tour nào" />
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[880px]">
            {/* Sticky header — tiêu đề cột luôn nhìn thấy khi cuộn danh sách */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                <th className="py-2.5 px-4">Mã đơn</th>
                <th className="py-2.5 px-3">Khách</th>
                <th className="py-2.5 px-3">Tour</th>
                <th className="py-2.5 px-3">Tổng tiền</th>
                <th className="py-2.5 px-3">Hạn thanh toán</th>
                <th className="py-2.5 px-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageData.content.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70 align-middle">
                  <td className="py-2.5 px-4 align-middle">
                    <span className="block font-mono text-xs font-semibold text-slate-900 break-all leading-tight">
                      {b?.bookingCode ?? `#${b?.id}`}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 align-middle">
                    <span className="block text-[11px] text-slate-600 leading-tight">
                      {b?.touristName ?? b?.touristId ?? "—"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 align-middle">
                    <span className="block text-[11px] font-medium text-slate-700 leading-tight">
                      {b?.tourTitle ?? `#${b?.tourId}`}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 align-middle">
                    <span className="block font-mono font-semibold text-slate-900 leading-tight">
                      {formatVND(b?.totalAmount)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 align-middle">
                    <span className="block text-[11px] text-slate-600 leading-tight">
                      {formatDateTimeVN(b?.paymentDeadline)}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 align-middle">
                    <span className="block">
                      <StatusPill status={b?.status} label={BOOKING_STATUS_LABELS[b?.status]} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   THÀNH PHẦN DÙNG CHUNG
   ══════════════════════════════════════════════════════════════════════════ */

function Metric({ label, value, tone = "slate", hint }) {
  const tones = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
  };
  return (
    <div className="bg-white rounded-2xl px-5 py-4 border border-slate-200/85 shadow-2xs">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className={`text-2xl font-semibold mt-1.5 font-mono ${tones[tone]}`}>{value}</div>
      {hint && <p className="mt-1 text-[11px] text-slate-400 leading-snug">{hint}</p>}
    </div>
  );
}

/**
 * Panel — khung chứa nội dung bảng.
 *
 * `fill` bật chế độ chiếm toàn bộ chiều cao còn lại: tiêu đề cố định, phần thân
 * cuộn RIÊNG bên trong panel ⇒ trang ngoài không bao giờ phải cuộn.
 * `footer` (vd. thanh phân trang) luôn ghim ở đáy panel, không cuộn theo bảng.
 *
 * ⚠️ Vùng thân dùng `overflow-auto` — bảng bên trong PHẢI có
 * `<thead className="sticky top-0 z-10">` để tiêu đề cột luôn nhìn thấy
 * khi cuộn danh sách dài.
 */
function Panel({ icon: Icon, title, right, children, fill = false, footer = null }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden ${
        fill ? "flex-1 min-h-0 flex flex-col" : ""
      }`}
    >
      <div className="shrink-0 px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        </div>
        {right}
      </div>
      {fill ? (
        <>
          <div className="flex-1 min-h-0 overflow-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
            {children}
          </div>
          {footer}
        </>
      ) : (
        children
      )}
    </div>
  );
}

/**
 * Thanh phân trang — bọc component dùng chung `PaginationBar`
 * (có số trang + nút nhảy trang đầu/cuối, giống trang Quản lý người dùng).
 */
function Pagination({ page, totalPages, totalElements, unit = "bản ghi", onChange }) {
  if (!totalPages || totalPages <= 1) {
    return (
      totalElements > 0 ? (
        <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500">
          Tổng {totalElements} {unit}
        </div>
      ) : null
    );
  }
  return (
    <PaginationBar
      page={page}
      totalPages={totalPages}
      totalElements={totalElements}
      unit={unit}
      onChange={onChange}
    />
  );
}

/**
 * Rút gọn nhật ký kiểm toán hoàn tiền — loại bỏ bản ghi trùng lặp.
 *
 * ── Vì sao cần? ──
 * Mỗi lần Admin bấm "Kiểm tra" lại trạng thái với VNPay, backend ghi thêm một
 * dòng nhật ký `VNPAY_STATUS_UPDATED` ("Cập nhật trạng thái hoàn tiền").
 * Bấm nhiều lần ⇒ nhật ký dài ra, tất cả các dòng đó mang cùng một ý nghĩa.
 * Ở đây ta gộp theo (hành động, trạng thái đầu, trạng thái cuối) và chỉ giữ
 * dòng **mới nhất** của mỗi nhóm ⇒ nhật ký gọn, đúng ý, không mất thông tin
 * về trạng thái hiện tại.
 *
 * @param {Array} logs danh sách audit log từ backend
 * @returns {Array} danh sách đã rút gọn, giữ nguyên thứ tự thời gian
 */
function dedupeAuditLogs(logs) {
  if (!Array.isArray(logs)) return [];

  // Nhóm theo khoá ý nghĩa; mỗi nhóm giữ dòng có thời điểm mới nhất.
  const groups = new Map();
  logs.forEach((log, idx) => {
    const key = [
      log?.action ?? "",
      log?.fromStatus ?? "",
      log?.toStatus ?? "",
    ].join("|");
    const prev = groups.get(key);
    const time = log?.createdAt ? new Date(log.createdAt).getTime() : 0;
    if (!prev || time >= prev.time) {
      groups.set(key, { log, idx, time });
    }
  });

  const result = [...groups.values()].sort((a, b) => a.idx - b.idx).map((g) => g.log);

  // "Cập nhật trạng thái hoàn tiền" mà KHÔNG làm thay đổi trạng thái
  // (vẫn là "đang xử lý hoàn tiền") chỉ giữ lại dòng mới nhất.
  const noChangeIdx = result.findIndex(
    (l) =>
      l?.action === "VNPAY_STATUS_UPDATED" &&
      (!l?.fromStatus || l.fromStatus === l?.toStatus) &&
      l?.toStatus === "REFUND_PROCESSING",
  );
  if (noChangeIdx >= 0) {
    let lastIdx = -1;
    result.forEach((l, i) => {
      if (
        l?.action === "VNPAY_STATUS_UPDATED" &&
        (!l?.fromStatus || l.fromStatus === l?.toStatus) &&
        l?.toStatus === "REFUND_PROCESSING"
      ) {
        lastIdx = i;
      }
    });
    return result.filter(
      (l, i) =>
        !(
          l?.action === "VNPAY_STATUS_UPDATED" &&
          (!l?.fromStatus || l.fromStatus === l?.toStatus) &&
          l?.toStatus === "REFUND_PROCESSING" &&
          i !== lastIdx
        ),
    );
  }

  return result;
}

function StatusPill({ status, label }) {
  const cls =
    status === "SUCCESS" || status === "CONFIRMED" || status === "COMPLETED" || status === "APPROVED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "FAILED" || status === "CANCELLED" || status === "REJECTED" || status === "EXPIRED"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold ${cls}`}
    >
      {label ?? status}
    </span>
  );
}

/** Màu chấm mốc theo loại hành động trong nhật ký kiểm toán. */
function auditDotClass(action) {
  switch (action) {
    case "CREATED":
      return "bg-sky-100 ring-sky-300 text-sky-600";
    case "APPROVED":
    case "VNPAY_RESPONSE":
    case "MANUAL_TRANSFER_CONFIRMED":
      return "bg-emerald-100 ring-emerald-300 text-emerald-600";
    case "REJECTED":
    case "CANCELLED":
      return "bg-rose-100 ring-rose-300 text-rose-600";
    default:
      return "bg-amber-100 ring-amber-300 text-amber-600";
  }
}

/**
 * Khung modal dùng chung.
 *
 * ── Scroll (vấn đề: modal bị trượt cả trang ra ngoài) ──
 * Ba điều kiện phải có đồng thời để modal CUỘN RIÊNG, không kéo trang ngoài:
 *
 *  1. Modal được render vào `document.body` qua Portal.
 *     Nếu render tại chỗ trong cây component, nó sẽ kế thừa mọi `overflow` /
 *     `transform` / `contain` của các khung cha (panel, bảng, header) ⇒ cuộn
 *     modal có thể kéo cả trang.
 *
 *  2. Lớp phủ `fixed inset-0` + `overflow-hidden` (KHÔNG `overflow-y-auto`).
 *     Nếu lớp phủ tự cuộn được thì con lăn của chuột khi đưa vào mép modal sẽ
 *     cuộn LỚP PHỦ ⇒ biểu hiện ra như "cuộn cả trang" (vì lớp phủ phủ kín
 *     màn hình). Thanh cuộn nhỏ phải nằm ở phần THÂN modal.
 *
 *  3. Chiều cao modal = `max-h-[calc(100dvh-2rem)]` — luôn vừa khung nhìn
 *     (chừa 1rem mỗi phía cho padding `p-4` của lớp phủ). Kết hợp với
 *     phần THÂN modal `flex-1 min-h-0 overflow-y-auto` ⇒ nội dung dài chỉ
 *     cuộn BÊN TRONG modal.
 *
 * Ngoài ra khoá cuộn của CẢ `html` lẫn `body` trong lúc modal mở (chỉ khoá
 * `body` là chưa đủ vì trên desktop `html` mới là phần tử cuộn chính) và bù
 * lại bằng `padding-right` để trang không nhảy ngang.
 */
function ModalShell({ title, onClose, children, wide = false }) {
  // Portal chỉ render được ở phía client ⇒ chờ mount xong mới render.
  // Dùng `queueMicrotask` để không gọi setState đồng bộ trong thân effect
  // (tránh cascading render — xem convention của các trang admin khác).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setMounted(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Khoá cuộn nền khi modal mở (khôi phục nguyên trạng khi đóng).
  useEffect(() => {
    if (!mounted) return undefined;
    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;

    // Bù bề rộng thanh cuộn để nền không nhảy ngang khi thanh cuộn bị ẩn.
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      const currentPadding =
        parseInt(window.getComputedStyle(body).paddingRight, 10) || 0;
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = prevBodyOverflow;
      documentElement.style.overflow = prevHtmlOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[calc(100dvh-2rem)] w-full ${
          wide ? "max-w-3xl" : "max-w-lg"
        } flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Đóng"
          >
            <XCircle size={18} />
          </button>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Hàng thông tin dạng nhãn / giá trị. */
function InfoRow({ label, value, mono = false, pill = false, status }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
      <div className="mt-1 text-xs font-semibold text-slate-800">
        {pill ? (
          <StatusPill status={status} label={value} />
        ) : value === null || value === undefined || value === "" ? (
          <span className="text-slate-400">—</span>
        ) : (
          <span className={mono ? "font-mono" : ""}>{value}</span>
        )}
      </div>
    </div>
  );
}

/** Khối nội dung có tiêu đề. */
function DetailBlock({ title, children }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold text-slate-500">
        {title}
      </h3>
      <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">{children}</div>
    </div>
  );
}

function ErrorBox({ text }) {
  return (
    <div className="m-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-400">
      <Loader2 size={16} className="animate-spin" /> Đang tải...
    </div>
  );
}

function Empty({ icon: Icon, text }) {
  return (
    <div className="py-12 text-center text-slate-400">
      <Icon size={28} className="mx-auto text-slate-300 mb-2" />
      <p className="text-xs font-semibold text-slate-600">{text}</p>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
