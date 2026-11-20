"use client";

/**
 * Trang Quản trị — "Yêu cầu hoàn tiền".
 *
 * ── Mục đích ──
 * Nơi duy nhất để quản trị viên xem & quyết định các yêu cầu hoàn tiền mà
 * du khách gửi lên từ ứng dụng di động.
 *
 * ── Luật nghiệp vụ ──
 *  • Danh sách nhóm lý do + mã lý do do Admin cấu hình ở trang
 *    "Cấu hình lý do hoàn tiền" — trang này KHÔNG hardcode danh sách lý do.
 *  • Số tiền do HỆ THỐNG tính theo nhóm lý do — Admin KHÔNG tự nhập.
 *  • Nhóm PERSONAL trong cửa sổ no-show 48h trước ngày trải nghiệm ⇒ 0%.
 *  • Duyệt 0 VND (bất khả kháng / no-show) ⇒ ghi nhận đã xử lý, KHÔNG gọi VNPay.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Eye,
  FileCheck,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import {
  Empty,
  ErrorBox,
  Loading,
  Pagination,
  Panel,
  StatusPill,
} from "@/components/admin/AdminUI";
import {
  ManualTransferModal,
  RefundDetailModal,
  ReviewRefundModal,
} from "@/features/refund/components/RefundAdminComponents";
import {
  listActiveRefundReasonGroups,
  normalizeGroups,
} from "@/features/refund/services/refundReasonConfigService";
import {
  confirmManualTransfer,
  getAllRefunds,
  refreshRefundStatus,
  reviewRefund,
} from "@/features/refund/services/refundService";
import {
  formatDateTimeVN,
  formatVND,
  normalizePage,
  REFUND_METHOD_LABELS,
  REFUND_REASON_LABELS,
  refundStatusLabel,
  REFUND_STATUS_LABELS,
} from "@/lib/money";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { PAGE_SIZE } from "@/lib/pagination";

/**
 * Class DÙNG CHUNG cho mọi nút trong cột "Thao tác".
 *
 * ⚠️ Vì sao? Các nút ("Chi tiết", "Kiểm tra", "Duyệt lại", "Chuyển khoản") có
 * độ dài chữ khác nhau ⇒ nếu để `px` tự do thì nút to nút nhỏ lệch nhau, nhìn
 * rất lộn xộn. Ép `w-full` (kế thừa bề rộng cột) + `justify-center` ⇒ TẤT CẢ
 * nút BẰNG NHAU, xếp THẲNG ĐỨNG theo cột (mỗi nút một dòng).
 */
const ACTION_BTN_CLASS =
  "inline-flex h-7 w-full items-center justify-center gap-1 whitespace-nowrap rounded-md text-[11px] font-semibold transition-colors";

/**
 * Bảng màu của các nút trong cột "Thao tác".
 *
 * ── Nguyên tắc thiết kế ──
 * Tất cả nút dùng CHUNG một hệ nền trung tính (nền trắng / viền xám nhạt) và
 * chỉ khác nhau ở MÀU CHỮ (accent) ⇒ nhìn đồng bộ, không "chói" như kiểu
 * trước (một nút xanh đậm, một nút xanh nhạt, một nút vàng).
 *
 * • "Chi tiết"    — hành động xem (trung tính)     → xám đậm
 * • "Kiểm tra"    — hành động tra cứu (trung tính)  → xám đậm
 * • "Xử lý"       — hành động chính (nhấn mạnh)     → xanh dương
 * • "Duyệt lại"   — hành động dự phòng (cảnh báo)  → hổ phách
 * • "Chuyển khoản" — hành động xác nhận (tích cực)  → ngọc lục
 *
 * ⚠️ Vì sao KHÔNG dùng nền đậm cho mọi nút? Vì cột này có thể chứa tới 3 nút
 * xếp dọc — nếu mỗi nút một mảng màu đậm khác nhau thì cột trông như "đèn giao thông"
 * và mất cảm giác gọn gàng. Nền trắng + viền + chữ màu vừa đủ để phân cấp vai trò.
 */
const ACTION_BTN_TONE = {
  /** Hành động xem / tra cứu — trung tính. */
  neutral:
    "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800",
  /** Hành động chính — nhấn mạnh. */
  primary:
    "border border-sky-600 bg-sky-50 text-sky-700 hover:border-sky-700 hover:bg-sky-100",
  /** Hành động dự phòng khi cổng thanh toán bị kẹt — cảnh báo nhẹ. */
  warning:
    "border border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100",
  /** Hành động xác nhận hoàn tiền — tích cực. */
  success:
    "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100",
};

/**
 * Yêu cầu hoàn tiền có được phép chuyển sang chuyển khoản thủ công không?
 *
 * ⚠️ Chỉ khi VNPay đã xác nhận DỨT KHOÁT rằng KHÔNG tạo được giao dịch hoàn:
 *   • mã `99`  — hạ tầng sandbox không hỗ trợ (đã xác minh thực tế)
 *   • mã `91` / `93` / `95` / `16` — VNPay từ chối dứt khoát
 *   • trạng thái `09` — hoàn trả bị từ chối
 *
 * ⛔ KHÔNG thuộc danh sách: `94` (đã gửi trước, VNPay đang xử lý) và `08` (bảo
 * trì) — hai mã này để ngỏ khả năng giao dịch hoàn ĐÃ được tạo ⇒ tuyệt đối
 * không chuyển sang thủ công để tránh hoàn tiền hai lần.
 *
 * Khớp với `RefundService.isVnPayDefiniteRejection` + `isVnPayUnsupportedFailure`
 * ở backend.
 *
 * @param {object} refund yêu cầu hoàn tiền
 * @returns {boolean}
 */
function isSwitchableToManual(refund) {
  const code = refund?.vnpResponseCode;
  if (code === "99") return true;
  if (refund?.vnpTransactionStatus === "09") return true;
  return ["91", "93", "95", "16"].includes(code);
}

export default function AdminRefundsPage() {
  const { confirm, confirmDialog } = useConfirm();
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState({
    content: [],
    totalElements: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  // Từ khoá đã áp dụng (sau debounce).
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  // Yêu cầu đang mở modal ghi nhận chuyển khoản thủ công.
  const [transferring, setTransferring] = useState(null);

  /**
   * Nhãn tiếng Việt của mã lý do cụ thể — lấy từ cấu hình "Cấu hình lý do hoàn
   * tiền" để admin không phải đọc mã kỹ thuật.
   */
  const [reasonCodeLabels, setReasonCodeLabels] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listActiveRefundReasonGroups();
        if (cancelled) return;
        const map = {};
        for (const g of normalizeGroups(data)) {
          for (const c of g.reasonCodes ?? []) {
            map[c.code] = c.name;
          }
        }
        setReasonCodeLabels(map);
      } catch {
        // Không tải được cấu hình → vẫn hiển thị mã kỹ thuật.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      const data = await getAllRefunds({
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        size: PAGE_SIZE,
      });
      setPageData(normalizePage(data, PAGE_SIZE));
    } catch (err) {
      setError(err?.message || "Không thể tải danh sách yêu cầu hoàn tiền.");
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

  const handleManualTransfer = async (refund, payload) => {
    setBusyId(refund.id);
    setError("");
    try {
      await confirmManualTransfer(refund.id, payload);
      setTransferring(null);
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

  /**
   * Tìm kiếm được thực hiện ở BACKEND (tìm toàn hệ thống, không chỉ trang đang xem)
   * ⇒ danh sách trả về đã lọc sẵn.
   */
  const filtered = pageData.content;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
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
          <div className="flex items-center gap-2">
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
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm mã yêu cầu / mã đơn..."
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
              text={`Không tìm thấy yêu cầu hoàn tiền nào khớp với "${search}"`}
            />
          ) : (
            <Empty icon={RotateCcw} text="Không có yêu cầu hoàn tiền nào" />
          )
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1080px] table-fixed">
              {/* Sticky header — tiêu đề cột luôn nhìn thấy khi cuộn danh sách */}
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                  {/*
                    ⚠️ Bảng CHỈ giữ 8 cột: Mã yêu cầu · Mã đơn/giao dịch ·
                    Nhóm lý do · Số tiền · Phương thức · Thời điểm · Trạng thái ·
                    Thao tác. Bỏ "Bằng chứng" và "Ngày trải nghiệm" (chỉ cần khi
                    phân loại lý do, xem trong modal Chi tiết).
                  */}
                  <th className="py-2.5 px-4 w-[150px]">Mã yêu cầu</th>
                  <th className="py-2.5 px-3 w-[160px]">Mã đơn / giao dịch</th>
                  <th className="py-2.5 px-3 w-[260px]">Nhóm lý do / Lý do cụ thể</th>
                  <th className="py-2.5 px-3 w-[150px]">Số tiền</th>
                  <th className="py-2.5 px-3 w-[140px]">Phương thức</th>
                  <th className="py-2.5 px-3 w-[150px]">Thời điểm</th>
                  <th className="py-2.5 px-3 w-[240px]">Trạng thái</th>
                  {/*
                    ⚠️ Cột "Thao tác" để rộng vừa đủ cho 3 nút XẾP DỌC
                    (Chi tiết / Kiểm tra / Duyệt lại) — mỗi nút một dòng, thẳng
                    đứng, không cần cuộn ngang.

                    ⚠️ `text-center` ⇒ TIÊU ĐỀ cột được CĂN GIỮA, khớp với
                    nội dung bên dưới (các nút cũng căn giữa trong cột).
                  */}
                  <th className="py-2.5 px-4 text-center w-[150px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
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
                      {/*
                        ⚠️ Khách KHÔNG chọn nhóm lý do nữa ⇒ khi Admin chưa duyệt thì
                        cả `approvedReason` lẫn `declaredReason` đều null ⇒
                        fallback sang lý do NGẮN GỌN khách nhập.
                      */}
                      <span className="block font-medium text-slate-700 leading-tight">
                        {r?.approvedReasonName ||
                          r?.declaredReasonName ||
                          REFUND_REASON_LABELS[
                            r?.approvedReason ?? r?.declaredReason
                          ] ||
                          (r?.reasonSummary
                            ? "Chờ phân loại"
                            : "—")}
                      </span>
                      {(() => {
                        const code =
                          r?.approvedReasonCode || r?.declaredReasonCode;
                        if (!code) return null;
                        const label =
                          r?.approvedReasonCodeName ||
                          r?.declaredReasonCodeName ||
                          reasonCodeLabels[code];
                        return (
                          <span className="mt-0.5 block text-[11px] text-slate-600 break-all leading-tight">
                            {label ?? "—"}
                          </span>
                        );
                      })()}
                      {r?.reasonSummary && (
                        <span
                          className="mt-1 block max-w-[260px] truncate text-[11px] font-semibold text-slate-700"
                          title={r.reasonSummary}
                        >
                          {r.reasonSummary}
                        </span>
                      )}
                      {r?.reasonDetail && (
                        <span
                          className="mt-0.5 block max-w-[260px] truncate text-[11px] text-slate-500"
                          title={r.reasonDetail}
                        >
                          {r.reasonDetail}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      {/*
                        ⚠️ Khách KHÔNG chọn nhóm lý do ⇒ chưa có tỷ lệ ⇒
                        `proposedAmount` = 0 ⇒ hiển thị "Chờ phân loại" thay vì
                        "0 đ" (đọc nhầm như yêu cầu hoàn 0).
                      */}
                      {r?.proposedAmount > 0 ? (
                        <span className="block font-mono font-semibold text-slate-900 leading-tight">
                          {formatVND(r.proposedAmount)}
                        </span>
                      ) : (
                        <span className="block text-[11px] font-semibold text-amber-700 leading-tight">
                          Chờ phân loại
                        </span>
                      )}
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
                        {r?.method
                          ? REFUND_METHOD_LABELS[r.method] ?? r.method
                          : "Chưa chọn"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span className="block text-[11px] text-slate-600 leading-tight">
                        {formatDateTimeVN(r?.createdAt)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      {/*
                        ⚠️ Cột trạng thái CHỈ hiển thị TRẠNG THÁI — không đặt nút
                        thao tác ở đây. Trước đây các nút "Kiểm tra" / "Chuyển thủ
                        công" / "Đã chuyển" nằm ngay cạnh badge ⇒ nhìn như
                        "Đang xử lý hoàn tiền" + "Đã chuyển" cùng lúc, gây hiểu nhầm
                        về trạng thái. Mọi nút thao tác nằm ở cột "Thao tác".
                      */}
                      <StatusPill
                        status={r?.status}
                        label={refundStatusLabel(r?.status)}
                      />
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
                      {/*
                        ⚠️ Các nút XẾP DỌC (mỗi nút một dòng, thẳng đứng) trong
                        cột "Thao tác" — dùng `flex-col` + `w-full` cho nút ⇒
                        • mọi nút BẰNG NHAU bề rộng (kế thừa bề rộng cột),
                        • không cần cuộn ngang (bảng vừa đúng viewport),
                        • nhìn gọn, dễ quét từ trên xuống.

                        ⚠️ `items-stretch` ⇒ nút tràn hết bề rộng cột ⇒ nội dung nút
                        tự căn giữa nhờ `justify-center` trong `ACTION_BTN_CLASS`
                        ⇒ tiêu đề "Thao tác" (`text-center`) và nội dung cột
                        CĂN GIỮA đồng nhất.
                      */}
                      <div className="flex flex-col items-stretch gap-1">
                        {/* Đơn CHỜ XÉT DUYỆT ⇒ nút "Xử lý" mở modal 2 cột:
                            trái = chi tiết khách gửi, phải = nơi quyết định. */}
                        {r?.status === "PENDING_REVIEW" ? (
                          <button
                            type="button"
                            onClick={() => setReviewing(r)}
                            className={`${ACTION_BTN_CLASS} ${ACTION_BTN_TONE.primary}`}
                          >
                            <FileCheck size={11} />
                            Xử lý
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDetailId(r.id)}
                            className={`${ACTION_BTN_CLASS} ${ACTION_BTN_TONE.neutral}`}
                          >
                            <Eye size={11} />
                            Chi tiết
                          </button>
                        )}
                        {/*
                          ⚠️ "Kiểm tra" là hành động của VNPay ⇒ CHỈ hiện khi yêu cầu
                          đang chờ VNPay xác nhận. Yêu cầu đã chuyển sang chuyển
                          khoản thủ công thì KHÔNG được hỏi VNPay nữa (đảm bảo chỉ
                          1 phương thức tại 1 thời điểm).
                        */}
                        {r?.status === "VNPAY_PROCESSING" &&
                          r?.method === "VNPAY_API" && (
                            <button
                              type="button"
                              onClick={() => handleRefreshStatus(r)}
                              disabled={busyId === r.id}
                              className={`${ACTION_BTN_CLASS} ${ACTION_BTN_TONE.neutral} disabled:opacity-50`}
                              title="Kiểm tra lại kết quả hoàn tiền từ VNPay"
                            >
                              {busyId === r.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <RefreshCw size={11} />
                              )}
                              Kiểm tra
                            </button>
                          )}
                        {/*
                          ⚠️ Đường thoát cho yêu cầu BỊ KẸT: cổng thanh toán đã phản
                          hồi dứt khoát là KHÔNG tạo được giao dịch hoàn (mã 99 —
                          hạ tầng không hỗ trợ; hoặc 91/93/95/16 — VNPay từ chối)
                          ⇒ không có cách nào tự động hoàn ⇒ admin phải chuyển sang
                          chuyển khoản thủ công.

                          ⚠️ KHÔNG hiện nút "Chuyển thủ công" ngay cạnh badge trạng
                          thái (như trước đây) — lúc đó nhìn như "Đang xử lý hoàn
                          tiền" + "Chuyển thủ công" cùng lúc ⇒ mơ hồ về trạng thái.
                          Thay vào đó, mở modal "Duyệt lại" để đổi phương thức.
                        */}
                        {(r?.status === "VNPAY_PROCESSING" ||
                          r?.status === "FAILED") &&
                          r?.method === "VNPAY_API" &&
                          isSwitchableToManual(r) && (
                            <button
                              type="button"
                              onClick={() => setReviewing({ ...r, __reReview: true })}
                              disabled={busyId === r.id}
                              className={`${ACTION_BTN_CLASS} ${ACTION_BTN_TONE.warning} disabled:opacity-50`}
                              title="Cổng thanh toán không tạo được yêu cầu hoàn — mở lại để duyệt bằng chuyển khoản thủ công"
                            >
                              <Banknote size={11} />
                              Duyệt lại
                            </button>
                          )}
                        {/*
                          ⚠️ CHỈ hiện khi phương thức hiện tại là chuyển khoản thủ
                          công ⇒ nút này KHÔNG BAO GIỜ xuất hiện cạnh một yêu cầu
                          đang chờ VNPay.
                        */}
                        {r?.status === "MANUAL_TRANSFER_PENDING" &&
                          r?.method === "MANUAL_BANK_TRANSFER" && (
                            <button
                              type="button"
                              onClick={() => setTransferring(r)}
                              disabled={busyId === r.id}
                              className={`${ACTION_BTN_CLASS} ${ACTION_BTN_TONE.success} disabled:opacity-50`}
                              title="Ghi nhận đã chuyển khoản (mã tham chiếu + bằng chứng)"
                            >
                              <CheckCircle2 size={11} />
                              Chuyển khoản
                            </button>
                          )}
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
        <RefundDetailModal
          refundId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}

      {transferring && (
        <ManualTransferModal
          refund={transferring}
          busy={busyId === transferring.id}
          onClose={() => setTransferring(null)}
          onSubmit={(payload) => handleManualTransfer(transferring, payload)}
        />
      )}
      {confirmDialog}
    </div>
  );
}
