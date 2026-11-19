"use client";

/**
 * Trang Quản trị Tài chính & Thanh toán — JourneyGo.
 *
 * ── Cấu trúc (đã refactor) ──
 *  • 4 ô chỉ số tổng quan:
 *      1. Giao dịch thành công — số lượng đơn đã thanh toán
 *      2. Tổng tiền giao dịch  — giá trị gốc ban đầu (đã bao gồm voucher)
 *      3. Tổng tiền đã hoàn     — đã hoàn trả cho khách
 *      4. Thực thu nền tảng     — dòng tiền thực tế nhận được
 *  • "Nhật ký giao dịch toàn sàn" — bảng dữ liệu giao dịch toàn hệ thống.
 *
 * ── Vì sao KHÔNG còn tab "Giao dịch" / "Đơn đặt tour"? ──
 * Trước đây có 2 tab riêng biệt ⇒ muốn đối chiếu một đơn với các giao dịch của nó
 * phải chuyển qua lại giữa 2 tab. Nay bấm "Chi tiết" mở modal GỘP: vừa thấy giao
 * dịch, vừa thấy đơn đặt tour, vừa thấy dòng tiền và các yêu cầu hoàn tiền liên
 * quan — tất cả trong một chỗ.
 *
 * ⚠️ Nghiệp vụ "Hoàn tiền" ĐÃ TÁCH RA màn hình riêng: `/admin/refunds`
 *    ("Yêu cầu hoàn tiền") — vì vậy tab Hoàn tiền không còn ở trang này.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
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
  getPaymentDetail,
  queryPayment,
  searchPayments,
} from "@/features/payment/services/paymentService";
import {
  getFinanceSummary,
} from "@/features/settlement/services/settlementService";
import {
  BOOKING_STATUS_LABELS,
  formatDateTimeVN,
  formatVND,
  normalizePage,
  PAYMENT_STATUS_LABELS,
  paymentMethodLabel,
  REFUND_STATUS_LABELS,
  vnpayMessageForUser,
  vnpayResponseCodeForUser,
} from "@/lib/money";

/** Số bản ghi mỗi trang. */
const PAGE_SIZE = 10;

/**
 * Giao dịch nào còn có thể "Truy vấn lại" từ VNPay?
 *
 * `PaymentStatus.isFinal()` bên backend xác định giao dịch đã có kết quả cuối cùng
 * rõ ràng (SUCCESS / FAILED / CANCELLED). Với các trạng thái đó thì QueryDR không
 * mang lại thông tin mới ⇒ ẩn nút "Truy vấn lại".
 */
const QUERYABLE_PAYMENT_STATUSES = ["PENDING", "PROCESSING", "EXPIRED"];
function canQueryPayment(status) {
  return QUERYABLE_PAYMENT_STATUSES.includes(status);
}

/**
 * Nhãn phạm vi voucher — hiển thị cạnh mã voucher trong "Chi tiết dòng tiền".
 */
const VOUCHER_SCOPE_LABELS = {
  PLATFORM: "nền tảng",
  PARTNER: "đối tác",
};

/**
 * Trang Quản trị Tài chính — JourneyGo.
 */
export default function AdminFinancePage() {
  return (
    // Chiếm đúng chiều cao khung chứa — trang KHÔNG cuộn theo window.
    // Chỉ vùng bảng bên trong mới cuộn (overflow-auto ở từng panel).
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="shrink-0">
        <h1 className="min-w-0 text-lg sm:text-xl font-bold text-slate-900 truncate">
          Quản lý dòng tiền &amp; cổng thanh toán
        </h1>
      </div>

      {/* Nội dung — chiếm phần chiều cao còn lại, tự cuộn bên trong */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <PaymentsTab />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   NHẬT KÝ GIAO DỊCH TOÀN SÀN
   ══════════════════════════════════════════════════════════════════════════ */

function PaymentsTab() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [pageData, setPageData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  // Từ khoá đã áp dụng (sau debounce) — truyền xuống BACKEND để tìm toàn hệ thống.
  const [search, setSearch] = useState("");
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
      const [data, fin] = await Promise.all([
        searchPayments({
          status: statusFilter || undefined,
          search: search || undefined,
          page,
          size: pageSize,
        }),
        // Tổng hợp 4 ô chỉ số (giao dịch thành công / tổng tiền giao dịch /
        // tổng tiền đã hoàn / thực thu nền tảng).
        getFinanceSummary().catch(() => null),
      ]);
      setPageData(normalizePage(data, pageSize));
      if (fin) setFinance(fin);
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

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      {/* ── 4 ô chỉ số ──────────────────────────────────────────────────────
          Số liệu TOÀN HỆ THỐNG, không phụ thuộc trang đang xem.
            1. Giao dịch thành công  — số lượng đơn đã thanh toán
            2. Tổng tiền giao dịch  — giá trị gốc ban đầu
            3. Tổng tiền đã hoàn     — đã hoàn trả cho khách
            4. Thực thu nền tảng     — dòng tiền thực tế nhận được
          Mỗi ô có một dòng chú thích ngắn bên dưới. */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric
          label="Giao dịch thành công"
          value={String(finance?.successCount ?? 0)}
          hint="Số lượng đơn đã thanh toán"
        />
        <Metric
          label="Tổng tiền giao dịch"
          value={formatVND(finance?.totalTransactionAmount)}
          tone="emerald"
          hint="Giá trị gốc ban đầu"
        />
        <Metric
          label="Tổng tiền đã hoàn"
          value={formatVND(finance?.totalRefundedAmount)}
          tone="amber"
          hint="Đã hoàn trả cho khách"
        />
        <Metric
          label="Thực thu nền tảng"
          value={formatVND(finance?.netPlatformRevenue)}
          tone="emerald"
          hint="Dòng tiền thực tế nhận được"
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
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              title="Nạp lại dữ liệu — dùng sau khi duyệt hoàn tiền để dòng tiền cập nhật"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Làm mới
            </button>
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
            <table className="w-full text-left text-xs border-collapse min-w-[1080px]">
              {/* Sticky header — tiêu đề cột luôn nhìn thấy khi cuộn danh sách */}
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-4">Mã GD / Mã đơn</th>
                  <th className="py-2.5 px-3">Phương thức</th>
                  <th className="py-2.5 px-3 w-[300px]">Chi tiết dòng tiền</th>
                  <th className="py-2.5 px-3">Thời điểm</th>
                  <th className="py-2.5 px-3 w-[200px]">Trạng thái</th>
                  <th className="py-2.5 px-4 text-right w-[110px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 align-middle">
                    {/* Mã GD ở dòng trên, Mã đơn ở dòng dưới.
                        ⚠️ PHẢI hiển thị ĐẦY ĐỦ chuỗi — KHÔNG cắt bằng "…"
                        (truncate/ellipsis) vì mã giao dịch cần đối chiếu thủ công
                        với báo cáo ngân hàng. Dùng `break-all` để xuống dòng
                        thay vì cắt bớt nội dung. */}
                    <td className="py-2.5 px-4 align-middle max-w-[260px]">
                      <span className="block font-mono text-xs font-semibold text-slate-900 break-all">
                        {p?.txnRef ?? `#${p?.id}`}
                      </span>
                      <span className="block font-mono text-[11px] text-slate-500 break-all mt-0.5">
                        {p?.bookingCode ?? "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span className="block text-[11px] text-slate-600 leading-tight">
                        {paymentMethodLabel(p)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <CashFlowCell payment={p} />
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span className="block text-[11px] text-slate-600 leading-tight whitespace-nowrap">
                        {formatDateTimeVN(p?.createdAt)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <StatusPill
                        status={p?.status}
                        label={PAYMENT_STATUS_LABELS[p?.status]}
                      />
                    </td>
                    <td className="py-2.5 px-4 align-middle">
                      {/* Thao tác: CHỈ có nút "Chi tiết".
                          Nút "Truy vấn lại" (đối soát lại với VNPay) nằm ở modal
                          chi tiết — không đặt ở cột này để giữ cột gọn đúng
                          yêu cầu (Thao tác: chỉ có chi tiết). */}
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
   CHI TIẾT DÒNG TIỀN — ô trong bảng
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Ô "Chi tiết dòng tiền" của một giao dịch.
 *
 * Bố cục (mỗi dòng: nhãn bên trái — số tiền bên phải):
 *   Giá gốc            1.200.000 ₫
 *   voucher (SUMMER200)  −200.000 ₫
 *   Hoàn tiền          −450.000 ₫   (chỉ khi đã hoàn THÀNH CÔNG)
 *   Thực thu           1.000.000 ₫   (chỉ khi giao dịch ĐÃ THÀNH CÔNG)
 *
 * ⚠️ Chỉ hiện dòng voucher khi đơn thực sự áp voucher.
 * ⚠️ Chỉ hiện "Hoàn tiền" khi đã có tiền hoàn trả THÀNH CÔNG — yêu cầu đang
 *    chờ xét duyệt / đang chờ VNPay xác nhận KHÔNG được tính vào dòng tiền.
 * ⚠️ Chỉ hiện "Thực thu" khi giao dịch ĐÃ THÀNH CÔNG — đơn đang chờ, thất bại,
 *    đã hủy, hết hạn hay bị thay thế đều KHÔNG có dòng tiền nào thu được.
 */
function CashFlowCell({ payment }) {
  const original = Number(payment?.originalAmount ?? payment?.amount ?? 0);
  const discount = Number(payment?.discountAmount ?? 0);
  const refunded = Number(payment?.refundedAmount ?? 0);
  const net = Number(payment?.netAmount ?? 0);
  const hasVoucher = discount > 0;
  const hasRefund = refunded > 0;

  // ⚠️ Giao dịch CHƯA THÀNH CÔNG (đang chờ / thất bại / đã hủy / hết hạn /
  // bị thay thế) ⇒ KHÔNG có dòng tiền nào thu được ⇒ không hiện dòng "Thực thu"
  // để tránh hiểu nhầm rằng sàn đã thu được tiền của đơn chưa thanh toán.
  const isSuccessful = payment?.status === "SUCCESS";

  return (
    <div className="space-y-0.5">
      <CashFlowLine label="Giá gốc" value={formatVND(original)} tone="default" />
      {hasVoucher ? (
        <CashFlowLine
          label={
            payment?.voucherCode
              ? `voucher (${payment.voucherCode})`
              : "voucher"
          }
          value={`−${formatVND(discount)}`}
          tone="discount"
        />
      ) : null}
      {hasRefund ? (
        <CashFlowLine
          label="Hoàn tiền"
          value={`−${formatVND(refunded)}`}
          tone="refund"
        />
      ) : null}
      {isSuccessful ? (
        <CashFlowLine label="Thực thu" value={formatVND(net)} tone="net" />
      ) : null}
    </div>
  );
}

/** Một dòng của bảng kê dòng tiền: nhãn bên trái, số tiền bên phải. */
function CashFlowLine({ label, value, tone = "default" }) {
  const tones = {
    default: "text-slate-600",
    discount: "text-amber-600",
    refund: "text-rose-600",
    net: "text-slate-900",
  };
  return (
    <div className="flex items-baseline justify-between gap-3 leading-tight">
      <span className="text-[11px] text-slate-500 truncate" title={label}>
        {label}
      </span>
      <span
        className={`font-mono text-[11px] font-semibold whitespace-nowrap ${tones[tone]}`}
      >
        {value}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MODAL CHI TIẾT — gộp giao dịch + đơn
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Modal chi tiết — gộp giao dịch, đơn đặt tour, dòng tiền và yêu cầu hoàn tiền.
 *
 * Gọi GET /payments/{id}/detail.
 */
function PaymentDetailModal({ payment, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [querying, setQuerying] = useState(false);
  const [queryNotice, setQueryNotice] = useState("");

  useEffect(() => {
    let active = true;
    getPaymentDetail(payment.id)
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

  const p = detail?.payment ?? payment;
  const booking = detail?.booking;
  const cashFlow = detail?.cashFlow;
  const refunds = detail?.refunds ?? [];
  const siblings = (detail?.siblingPayments ?? []).filter((s) => s.id !== p?.id);

  /**
   * Đối soát lại kết quả giao dịch với VNPay (QueryDR).
   *
   * Chỉ hữu ích khi giao dịch CHƯA có kết quả cuối cùng rõ ràng (đang chờ, quá hạn)
   * — với giao dịch đã thành công/thất bại thì VNPay đã chốt, QueryDR không
   * mang lại thông tin mới.
   */
  const handleQuery = async () => {
    setQuerying(true);
    setQueryNotice("");
    try {
      const result = await queryPayment(p.id);
      setQueryNotice(
        result?.message ??
          `Đã truy vấn lại — kết quả: ${result?.outcome ?? "UNKNOWN"}`
      );
      // Nạp lại chi tiết để cập nhật trạng thái giao dịch.
      const fresh = await getPaymentDetail(p.id);
      setDetail(fresh);
    } catch (err) {
      setQueryNotice(err?.message || "Không thể truy vấn kết quả giao dịch.");
    } finally {
      setQuerying(false);
    }
  };

  return (
    <ModalShell
      title="Chi tiết giao dịch & đơn đặt tour"
      subtitle={p?.txnRef ? `Mã giao dịch ${p.txnRef}` : undefined}
      onClose={onClose}
      wide
      footer={
        canQueryPayment(p?.status) ? (
          <button
            type="button"
            onClick={handleQuery}
            disabled={querying}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {querying ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            Truy vấn lại với VNPay
          </button>
        ) : null
      }
    >
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox text={error} />
      ) : (
        <div className="space-y-5">
          {queryNotice ? (
            <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
              <RefreshCw size={14} className="mt-0.5 shrink-0 text-slate-400" />
              <span>{queryNotice}</span>
            </div>
          ) : null}
          {/* ── Chi tiết dòng tiền ── */}
          <DetailBlock title="Chi tiết dòng tiền">
            <div className="space-y-1">
              <CashFlowLine
                label="Giá gốc"
                value={formatVND(cashFlow?.originalAmount)}
              />
              {Number(cashFlow?.discountAmount ?? 0) > 0 ? (
                <CashFlowLine
                  label={
                    cashFlow?.voucherCode
                      ? `voucher (${cashFlow.voucherCode}${
                          cashFlow?.voucherScope
                            ? ` — ${VOUCHER_SCOPE_LABELS[cashFlow.voucherScope] ?? cashFlow.voucherScope}`
                            : ""
                        })`
                      : "voucher"
                  }
                  value={`−${formatVND(cashFlow?.discountAmount)}`}
                  tone="discount"
                />
              ) : null}
              {Number(cashFlow?.refundedAmount ?? 0) > 0 ? (
                <CashFlowLine
                  label="Hoàn tiền"
                  value={`−${formatVND(cashFlow?.refundedAmount)}`}
                  tone="refund"
                />
              ) : null}
              {/* Thực thu chỉ có nghĩa khi giao dịch ĐÃ THÀNH CÔNG — xem CashFlowCell. */}
              {p?.status === "SUCCESS" ? (
                <CashFlowLine
                  label="Thực thu"
                  value={formatVND(cashFlow?.netAmount)}
                  tone="net"
                />
              ) : null}
            </div>
          </DetailBlock>

          {/* ── Thông tin giao dịch ── */}
          <DetailBlock title="Thông tin giao dịch">
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Mã giao dịch" value={p?.txnRef} mono />
              <InfoRow
                label="Trạng thái"
                value={PAYMENT_STATUS_LABELS[p?.status] ?? p?.status}
                pill
                status={p?.status}
              />
              <InfoRow label="Phương thức" value={paymentMethodLabel(p)} />
              <InfoRow label="Số tiền thanh toán" value={formatVND(p?.amount)} mono />
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
          </DetailBlock>

          {/* ── Thông tin đơn đặt tour ── */}
          {booking ? (
            <DetailBlock title="Thông tin đơn đặt tour">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Mã đơn" value={booking.bookingCode} mono />
                <InfoRow
                  label="Trạng thái đơn"
                  value={BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
                  pill
                  status={booking.status}
                />
                <InfoRow label="Khách hàng" value={booking.touristName} />
                <InfoRow label="Tour" value={booking.tourTitle} />
                <InfoRow label="Ngày trải nghiệm" value={booking.experienceDate} />
                <InfoRow label="Tổng tiền đã chốt" value={formatVND(booking.totalAmount)} mono />
                <InfoRow
                  label="Voucher đã áp dụng"
                  value={booking.appliedVoucherCode ?? "—"}
                  mono
                />
                <InfoRow
                  label="Số tiền giảm voucher"
                  value={formatVND(booking.discountAmount)}
                  mono
                />
                <InfoRow label="Thời điểm đặt tour" value={formatDateTimeVN(booking.createdAt)} />
                <InfoRow
                  label="Thời điểm thanh toán"
                  value={formatDateTimeVN(booking.paidAt)}
                />
              </div>
            </DetailBlock>
          ) : null}

          {/* ── Yêu cầu hoàn tiền ── */}
          {refunds.length > 0 ? (
            <DetailBlock title={`Yêu cầu hoàn tiền (${refunds.length})`}>
              <div className="space-y-2">
                {refunds.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <span className="block font-mono text-xs font-semibold text-slate-900">
                        {r.refundCode}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {r.reasonSummary || r.approvedReasonName || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {formatVND(r.refundedAmount ?? r.approvedAmount ?? r.proposedAmount)}
                      </span>
                      <StatusPill
                        status={r.status}
                        label={REFUND_STATUS_LABELS[r.status] ?? r.status}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </DetailBlock>
          ) : null}

          {/* ── Các lần thử thanh toán khác của cùng đơn ── */}
          {siblings.length > 0 ? (
            <DetailBlock title="Các lần thử thanh toán khác của đơn">
              <div className="space-y-1.5">
                {siblings.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <span className="min-w-0 truncate font-mono text-xs text-slate-700">
                      {s.txnRef}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-700">
                        {formatVND(s.amount)}
                      </span>
                      <StatusPill
                        status={s.status}
                        label={PAYMENT_STATUS_LABELS[s.status]}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </DetailBlock>
          ) : null}

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
