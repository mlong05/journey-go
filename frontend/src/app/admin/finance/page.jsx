"use client";

/**
 * Trang Quản trị Tài chính & Thanh toán — JourneyGo.
 *
 * ── Hai tab ──
 *  1. Giao dịch   — theo dõi & xác minh (truy vấn lại kết quả) giao dịch VNPay.
 *  2. Đơn đặt tour — trạng thái booking & hạn thanh toán 10 phút.
 *
 * ⚠️ Nghiệp vụ "Hoàn tiền" ĐÃ TÁCH RA màn hình riêng: `/admin/refunds`
 *    ("Yêu cầu hoàn tiền") — vì vậy tab Hoàn tiền không còn ở trang này.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock,
  CreditCard,
  Eye,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import {
  DetailBlock,
  Empty,
  ErrorBox,
  InfoRow,
  Loading,
  Metric,
  ModalShell,
  Pagination,
  Panel,
  StatusPill,
} from "@/components/admin/AdminUI";
import {
  getPaymentById,
  getPaymentSummary,
  queryPayment,
  searchPayments,
} from "@/features/payment/services/paymentService";
import { getAllBookings } from "@/features/booking/services/bookingService";
import { getPlatformRevenueSummary } from "@/features/settlement/services/settlementService";
import {
  BOOKING_STATUS_LABELS,
  formatDateTimeVN,
  formatVND,
  normalizePage,
  PAYMENT_STATUS_LABELS,
  paymentMethodLabel,
  vnpayMessageForUser,
  vnpayResponseCodeForUser,
} from "@/lib/money";

const TABS = [
  { id: "payments", label: "Giao dịch" },
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
 * ── Hai tab ──
 *  1. Giao dịch   — theo dõi & xác minh (truy vấn lại kết quả) giao dịch VNPay.
 *  2. Đơn đặt tour — trạng thái booking & hạn thanh toán 10 phút.
 *
 * Nghiệp vụ "Hoàn tiền" nằm ở màn hình riêng: `/admin/refunds`.
 */
export default function AdminFinancePage() {
  const [tab, setTab] = useState("payments");

  return (
    // Chiếm đúng chiều cao khung chứa — trang KHÔNG cuộn theo window.
    // Chỉ vùng bảng bên trong mới cuộn (overflow-auto ở từng tab).
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Header — tiêu đề và tab chung một hàng để nhường chiều cao cho bảng */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="min-w-0 text-lg sm:text-xl font-bold text-slate-900 truncate">
          Quản lý dòng tiền &amp; cổng thanh toán
        </h1>

        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                tab === t.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nội dung tab — chiếm phần chiều cao còn lại, tự cuộn bên trong */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "payments" && <PaymentsTab />}
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
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
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
          size: pageSize,
        }),
        getPaymentSummary().catch(() => null),
        // Doanh thu nền tảng (phần thu được sau khi tất toán cho đối tác).
        // Lỗi ở endpoint này KHÔNG được làm hỏng tab giao dịch.
        getPlatformRevenueSummary(12).catch(() => null),
      ]);
      setPageData(normalizePage(data, pageSize));
      if (sum) setSummary(sum);
      if (platform) setPlatformRevenue(platform);
    } catch (err) {
      setError(err?.message || "Không thể tải danh sách giao dịch.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page, pageSize]);

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
    <div className="h-full min-h-0 flex flex-col gap-3">
      {/* Chỉ số — số liệu TOÀN HỆ THỐNG, không phụ thuộc trang đang xem */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            pageSize={pageSize}
            onSizeChange={(size) => {
              setPageSize(size);
              setPage(0);
            }}
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
/* ══════════════════════════════════════════════════════════════════════════
   TAB 2 — ĐƠN ĐẶT TOUR
   ══════════════════════════════════════════════════════════════════════════ */

function BookingsTab() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
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
        size: pageSize,
      });
      setPageData(normalizePage(data, pageSize));
    } catch (err) {
      setError(err?.message || "Không thể tải danh sách đơn.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, pageSize]);

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
    <div className="h-full min-h-0 flex flex-col gap-3">
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
            pageSize={pageSize}
            onSizeChange={(size) => {
              setPageSize(size);
              setPage(0);
            }}
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
