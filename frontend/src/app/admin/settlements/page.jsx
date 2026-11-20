"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  FileCheck,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  approveBatchSettlement,
  approveSettlement,
  createBatchSettlement,
  getAllSettlements,
  getBatchSettlementCandidates,
  getPlatformRevenueSummary,
  getSettlementById,
  getSettlementDetails,
  getSettlementOverview,
  rejectSettlement,
} from "@/features/settlement/services/settlementService";
import {
  evaluateEligibility,
  getRevenueById,
} from "@/features/settlement/services/providerRevenueService";
import { getBookingById } from "@/features/booking/services/bookingService";
import { getPaymentsByBooking } from "@/features/payment/services/paymentService";
import {
  BOOKING_STATUS_LABELS,
  DEFERRED_REASON_LABELS,
  formatDateTimeVN,
  formatLocalDate,
  formatPeriod,
  formatPeriodVN,
  formatShortPeriod,
  formatVND,
  MONTH_NAMES_VI,
  normalizePage,
  PROVIDER_REVENUE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  previousMonth,
  SETTLEMENT_STATUS_LABELS,
  settlementCheckLabel,
  VN_TIME_ZONE,
} from "@/lib/money";
import { LimitedField } from "@/components/ui/LimitedField";
import { PAGE_SIZE } from "@/lib/pagination";

const TABS = [
  { id: "overview", label: "Tổng quan & Duyệt đợt" },
  { id: "candidates", label: "Tạo đợt tất toán" },
];

/**
 * Trang Quản trị Tất toán — JourneyGo.
 *
 * ── Thiết kế 2 tab (tách bạch 2 mục đích) ──
 *
 *  TAB 1 — "Tổng quan & Duyệt đợt"
 *    Quản lý VÒNG ĐỜI của các đợt tất toán: danh sách, lọc, xem chi tiết,
 *    duyệt / từ chối. Đây là màn hình làm việc chính của Admin.
 *
 *  TAB 2 — "Tạo đợt tất toán"
 *    Xem & TẠO đợt mới cho MỘT KỲ doanh thu — đợt bao gồm TOÀN BỘ đối tác.
 *    Đây là quy trình "chuẩn bị" (draft) — tách khỏi tab 1 để không trộn hai loại thao tác.
 *
 * ── Luồng nghiệp vụ ──
 *  1. Tab 2: chọn kỳ đã đóng → xem ứng viên (đủ điều kiện / bị giữ lại) của toàn sàn.
 *  2. Tạo bản nháp → các khoản doanh thu chuyển sang IN_SETTLEMENT (bị khoá trong đợt).
 *  3. Tab 1: duyệt (ghi tiền vào ví nguyên tử) hoặc từ chối (giải phóng khoản doanh thu).
 */
export default function AdminSettlementsPage() {
  const [tab, setTab] = useState("overview");

  return (
    // Chiếm đúng chiều cao khung chứa — trang KHÔNG cuộn theo window.
    // Chỉ vùng nội dung bên trong mới cuộn.
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Header — tiêu đề và tab chung một hàng (giống trang Tài chính)
          để nhường chiều cao cho nội dung, trang không phải cuộn. */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="min-w-0 text-lg sm:text-xl font-bold text-slate-900 truncate">
          Quản lý tất toán &amp; đối soát chu kỳ
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
        {tab === "overview" && <SettlementOverviewTab />}
        {tab === "candidates" && <SettlementCandidatesTab />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 1 — TỔNG QUAN & DUYỆT ĐỢT
   ══════════════════════════════════════════════════════════════════════════ */

function SettlementOverviewTab() {
  const [settlements, setSettlements] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [detailId, setDetailId] = useState(null);
  // Modal từ chối — thay cho window.prompt (bị chặn → nút "chết" không phản ứng).
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  // Modal XÁC NHẬN duyệt — thay cho window.confirm (giao diện mặc định của trình duyệt,
  // không đồng bộ với design system, và không hiển thị đủ thông tin để Admin đối soát).
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveError, setApproveError] = useState("");
  // Tổng hợp doanh thu nền tảng — dùng cho dải số liệu và bảng theo kỳ.
  const revenue = usePlatformRevenue();
  // Tổng hợp 5 ô chỉ số của tab Tổng quan — số liệu TOÀN HỆ THỐNG.
  const overview = useSettlementOverview();

  const loadSettlements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllSettlements({
        status: statusFilter || undefined,
        page,
        size: PAGE_SIZE,
      });
      const normalized = normalizePage(data, PAGE_SIZE);
      setSettlements(normalized.content);
      setTotalPages(normalized.totalPages);
      setTotalElements(normalized.totalElements);
    } catch (err) {
      setError(err?.message || "Không thể tải danh sách đợt tất toán.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadSettlements();
    });
    return () => {
      cancelled = true;
    };
  }, [loadSettlements]);

  const changeStatus = (value) => {
    setStatusFilter(value);
    setPage(0);
  };

  const handleApprove = (settlement) => {
    // Mở modal xác nhận — KHÔNG dùng window.confirm vì:
    //  • Giao diện mặc định của trình duyệt không đồng bộ với design system.
    //  • Không đủ thông tin để Admin đối soát (mã đợt, kỳ, số tiền, số đối tác).
    //  • Không cho nhập / hiện lỗi API ngay trong hộp thoại.
    setApproveError("");
    setApproveTarget(settlement);
  };

  const confirmApprove = async () => {
    const settlement = approveTarget;
    if (!settlement) return;
    const isBatch = settlement?.scope === "BATCH";
    setBusyId(settlement.id);
    setError("");
    setApproveError("");
    try {
      if (isBatch) {
        await approveBatchSettlement(settlement.id);
      } else {
        await approveSettlement(settlement.id);
      }
      // Duyệt xong ⇒ doanh thu nền tảng thay đổi, tải lại cả hai khối.
      setApproveTarget(null);
      await Promise.all([loadSettlements(), revenue.load(), overview.load()]);
    } catch (err) {
      const msg = err?.message || "Không thể duyệt đợt tất toán.";
      // Lỗi hiển thị NGAY TRONG modal (không chỉ ở đầu tab) để người dùng thấy.
      setApproveError(msg);
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (settlement) => {
    // Mở modal nhập lý do — KHÔNG dùng window.prompt vì:
    //  • prompt bị chặn/huỷ trong một số trình duyệt ⇒ hàm thoát im lặng, nút "chết".
    //  • Không kiểm soát được nội dung, không validate, không có nút Hủy rõ ràng.
    setRejectTarget(settlement);
  };

  const confirmReject = async () => {
    const settlement = rejectTarget;
    const reason = rejectReason.trim();
    if (!settlement) return;
    if (!reason) {
      setRejectError("Vui lòng nhập lý do từ chối.");
      return;
    }
    setBusyId(settlement.id);
    setError("");
    setRejectError("");
    try {
      await rejectSettlement(settlement.id, reason);
      setRejectTarget(null);
      setRejectReason("");
      await Promise.all([loadSettlements(), overview.load()]);
    } catch (err) {
      const msg = err?.message || "Không thể từ chối đợt tất toán.";
      // Hiển thị lỗi NGAY TRONG modal (không chỉ ở đầu tab) để người dùng thấy.
      setRejectError(msg);
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    // Màn lớn (lg+): vừa khít khung, KHÔNG cuộn trang — chỉ 2 bảng tự cuộn bên trong.
    // Màn nhỏ: các khối xếp dọc, cho phép cuộn cả tab.
    <div className="h-full min-h-0 flex flex-col gap-3 overflow-y-auto lg:overflow-hidden [scrollbar-width:thin]">
      {error && <ErrorBox text={error} />}

      {/* ── Dải số liệu ──────────────────────────────────────────────────────
          5 ô theo đúng yêu cầu, mỗi ô có CHÚ THÍCH ngắn bên dưới (xếp thẳng đứng):
            1. Thực thu nền tảng — dòng tiền thực tế nhận được
            2. Doanh thu nền tảng — tổng doanh thu gốc
            3. Doanh thu đối tác  — tổng tiền đã chi trả cho toàn bộ đối tác
            4. Số đợt đã duyệt
            5. Đợt chờ duyệt
          Số liệu là TOÀN HỆ THỐNG (không phụ thuộc phân trang) — lấy từ endpoint riêng. */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
        <MiniStat
          label="Thực thu nền tảng"
          value={overview.loading && !overview.data ? "…" : formatVND(overview.data?.netPlatformRevenue)}
          tone="emerald"
          hint="Dòng tiền thực tế nền tảng nhận được"
        />
        <MiniStat
          label="Doanh thu nền tảng"
          value={overview.loading && !overview.data ? "…" : formatVND(overview.data?.totalGrossAmount)}
          hint="Tổng tiền khách đã thanh toán"
        />
        <MiniStat
          label="Doanh thu đối tác"
          value={overview.loading && !overview.data ? "…" : formatVND(overview.data?.totalProviderNetAmount)}
          hint="Tổng tiền đã chi trả cho toàn bộ đối tác"
        />
        <MiniStat
          label="Số đợt đã duyệt"
          value={String(overview.data?.approvedSettlementCount ?? 0)}
          hint="Các đợt tất toán đã hoàn tất"
        />
        <MiniStat
          label="Đợt chờ duyệt"
          value={String(overview.data?.pendingSettlementCount ?? 0)}
          tone={(overview.data?.pendingSettlementCount ?? 0) > 0 ? "amber" : "slate"}
          hint="Đang chờ Admin duyệt hoặc từ chối"
        />
      </div>

      {/* ── Hai cột: doanh thu theo kỳ (4/12) | danh sách đợt (8/12) ───────── */}
      <div className="lg:flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3">
      <PeriodRevenuePanel revenue={revenue} className="lg:col-span-4 h-[360px] lg:h-auto lg:min-h-0" />

      <div className="lg:col-span-8 h-[560px] lg:h-auto lg:min-h-0 flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="shrink-0 px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileCheck size={16} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">
              Danh sách đợt tất toán
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => changeStatus(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(SETTLEMENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadSettlements}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={12} />
              Làm mới
            </button>
          </div>
        </div>

        {/* Vùng bảng — cuộn RIÊNG bên trong, trang ngoài không cuộn */}
        <div className="flex-1 min-h-0 overflow-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
          {loading ? (
            <Loading />
          ) : settlements.length === 0 ? (
            <Empty icon={FileCheck} text="Chưa có đợt tất toán nào" />
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-center text-xs border-collapse min-w-[760px]">
                {/* Sticky header — tiêu đề cột luôn nhìn thấy khi cuộn danh sách */}
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-4 text-center">Mã đợt</th>
                    <th className="py-2.5 px-3 text-center">Kỳ</th>
                    <th className="py-2.5 px-3 text-center">Tổng DT</th>
                    <th className="py-2.5 px-3 text-center">DT đối tác</th>
                    <th className="py-2.5 px-3 text-center">DT nền tảng</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    {/* Cột thao tác ghim mép phải — nút luôn nhìn thấy khi bảng cuộn ngang */}
                    <th className="sticky right-0 z-10 bg-slate-50 py-2.5 px-4 text-center shadow-[-1px_0_0_0_#e2e8f0]">Thao tác</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-slate-100">
                {settlements.map((s) => (
                  /* `align-middle` (mặc định của table-cell) ⇒ mọi ô trong hàng
                     ĐỒNG ĐỀU theo trục dọc. Trước đây dùng `align-top` nên các
                     ô 1 dòng (Kỳ / Tổng DT / Trạng thái) dồn sát lên trên,
                     còn "5 đối tác" nằm rất thấp ⇒ hàng nhìn sát và lệch. */
                  <tr key={s.id} className="group hover:bg-slate-50 align-middle">
                    <td className="py-2.5 px-4 text-center">
                      <span className="block font-mono font-semibold text-slate-900">
                        {s?.settlementCode ?? `#${s?.id}`}
                      </span>
                      {s?.scope === "BATCH" ? (
                        <span className="mt-0.5 block text-[10.5px] text-slate-400">
                          {s?.partnerCount ?? 0} đối tác
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">
                      {formatPeriod(s?.revenuePeriod)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {formatVND(s?.grossAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-sky-700">
                      {formatVND(s?.settlementAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-emerald-700">
                      {formatVND(
                        (Number(s?.commissionAmount ?? 0) || 0) +
                          (Number(s?.adjustmentAmount ?? 0) || 0),
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusPill status={s?.status} />
                      {s?.approvedAt && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatDateTimeVN(s.approvedAt)}
                        </p>
                      )}
                    </td>
                    <td className="sticky right-0 bg-white group-hover:bg-slate-50 py-2.5 px-4 text-center shadow-[-1px_0_0_0_#f1f5f9]">
                      {/* Thao tác xếp THẲNG HÀNG THEO HÀNG DỌC — các nút cùng độ lớn */}
                      <div className="mx-auto flex w-fit flex-col items-stretch gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailId(s.id)}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Eye size={11} />
                          Chi tiết
                        </button>
                        {s?.status === "DRAFT" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(s)}
                              disabled={busyId === s.id}
                              className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {busyId === s.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={11} />
                              )}
                              Duyệt
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(s)}
                              disabled={busyId === s.id}
                              className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                            >
                              <XCircle size={11} /> Từ chối
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="shrink-0">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            unit="đợt tất toán"
            onChange={setPage}
          />
        </div>
      </div>
      </div>

      {detailId && (
        <SettlementDetailModal settlementId={detailId} onClose={() => setDetailId(null)} />
      )}

      {rejectTarget && (
        <RejectSettlementModal
          settlement={rejectTarget}
          reason={rejectReason}
          error={rejectError}
          busy={busyId === rejectTarget?.id}
          onReasonChange={setRejectReason}
          onConfirm={confirmReject}
          onClose={() => {
            if (busyId === rejectTarget?.id) return;
            setRejectTarget(null);
            setRejectReason("");
            setRejectError("");
          }}
        />
      )}

      {approveTarget && (
        <ApproveSettlementModal
          settlement={approveTarget}
          error={approveError}
          busy={busyId === approveTarget?.id}
          onConfirm={confirmApprove}
          onClose={() => {
            if (busyId === approveTarget?.id) return;
            setApproveTarget(null);
            setApproveError("");
          }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 2 — TẠO ĐỢT TẤT TOÁN (TỔNG — TOÀN BỘ ĐỐI TÁC)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Tab "Tạo đợt tất toán" — chuẩn bị & TẠO đợt tất toán.
 *
 * ── Thay đổi nghiệp vụ ──
 * Trước đây: chọn MỘT đối tác + kỳ ⇒ tạo đợt riêng lẻ cho đối tác đó.
 * Khi sàn có nhiều đối tác thì rất chậm và dễ sót.
 *
 * NAY: chỉ cần chọn KỲ doanh thu ⇒ đợt sẽ bao gồm TOÀN BỘ đối tác.
 *  • Chỉ khoản ĐỦ ĐIỀU KIỆN mới vào đợt (giữ nguyên logic lọc hiện tại).
 *  • Khoản BỊ GIỮ LẠI không vào đợt — vẫn hiện kèm lý do, xét lại ở kỳ sau.
 */
function SettlementCandidatesTab() {
  const [revenuePeriod, setRevenuePeriod] = useState(previousMonth());
  const [candidates, setCandidates] = useState(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [note, setNote] = useState("");
  // Modal chi tiết khoản doanh thu (dùng chung cho "đủ điều kiện" và "bị giữ lại").
  const [detailTarget, setDetailTarget] = useState(null);
  // Modal chi tiết ĐƠN đặt tour (mở từ nút "Xem chi tiết đơn").
  const [bookingDetailId, setBookingDetailId] = useState(null);
  // Lọc theo đối tác trong danh sách ứng viên (chỉ là bộ lọc hiển thị, KHÔNG ảnh hưởng
  // việc gom vào đợt — đợt luôn gom TOÀN BỘ đối tác).
  const [partnerFilter, setPartnerFilter] = useState("");

  // ── Ứng viên tất toán TỔNG ────────────────────────────────────────────────
  const loadCandidates = useCallback(async () => {
    if (!revenuePeriod) {
      setCandidates(null);
      return;
    }
    setLoadingCandidates(true);
    setError("");
    try {
      const data = await getBatchSettlementCandidates(revenuePeriod);
      setCandidates(data);
    } catch (err) {
      setError(err?.message || "Không thể tải ứng viên tất toán.");
      setCandidates(null);
    } finally {
      setLoadingCandidates(false);
    }
  }, [revenuePeriod]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadCandidates();
    });
    return () => {
      cancelled = true;
    };
  }, [loadCandidates]);

  const handleCreate = async () => {
    setBusyId("create");
    setError("");
    try {
      await createBatchSettlement({
        revenuePeriod,
        note: note.trim() || undefined,
      });
      setNote("");
      await loadCandidates();
    } catch (err) {
      setError(err?.message || "Không thể tạo đợt tất toán.");
    } finally {
      setBusyId(null);
    }
  };

  // ⚠️ Bọc trong useMemo để tham chiếu ổn định giữa các render
  // (nếu không, useMemo bên dưới sẽ recompute mỗi lần render).
  const eligible = useMemo(() => candidates?.eligible ?? [], [candidates]);
  const held = useMemo(() => candidates?.held ?? [], [candidates]);
  const totals = candidates?.totals;

  // Danh sách đối tác có khoản đủ điều kiện — dùng cho bộ lọc hiển thị.
  const partners = useMemo(() => {
    const map = new Map();
    for (const r of eligible) {
      if (r?.providerProfileId != null && !map.has(r.providerProfileId)) {
        map.set(r.providerProfileId, r.providerName ?? `#${r.providerProfileId}`);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [eligible]);

  // Bộ lọc đối tác chỉ áp dụng cho danh sách HIỂN THỊ.
  const visibleEligible = useMemo(
    () =>
      partnerFilter
        ? eligible.filter((r) => String(r?.providerProfileId) === partnerFilter)
        : eligible,
    [eligible, partnerFilter],
  );
  const visibleHeld = useMemo(
    () =>
      partnerFilter
        ? held.filter((h) => String(h?.providerProfileId) === partnerFilter)
        : held,
    [held, partnerFilter],
  );

  // Đã có đợt tổng đang chờ duyệt cho kỳ này thì không tạo thêm.
  const hasOpenBatch = Boolean(candidates?.openSettlement);
  const canCreate = eligible.length > 0 && !hasOpenBatch;

  return (
    <div className="h-full min-h-0 flex flex-col gap-4">
      {error && <ErrorBox text={error} />}

      {/* Bộ lọc — chỉ chọn KỲ doanh thu, KHÔNG chọn đối tác (đợt gom toàn bộ). */}
      <div className="shrink-0 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          <Field
            label="Kỳ doanh thu"
            hint="Chỉ tạo được cho tháng đã kết thúc. Mặc định là tháng trước."
          >
            <MonthPicker value={revenuePeriod} onChange={setRevenuePeriod} />
          </Field>

          <Field
            label="Ghi chú đối soát (không bắt buộc)"
            hint="Ghi chú nội bộ cho đợt này, ví dụ: 'Đối soát tháng 9/2026'."
          >
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder="VD: Đối soát tháng 9/2026"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs focus:bg-white focus:outline-none"
            />
          </Field>

          {/* Nút — phải THẲNG HÀNG với các ô input, không phải với nhãn.
              Các ô khác có cấu trúc: nhãn (text-xs, cao 16px) + mb-1.5 (6px) + input.
              ⇒ nhãn chiếm 22px tính từ đỉnh ô ⇒ thêm `lg:pt-[22px]` để nút nằm đúng
              ngang ô input.

              ⚠️ CHỈ bù ở `lg` trở lên. Ở `sm`/`md` lưới có 2 cột ⇒ nút chiếm
              `col-span-2` nên rơi xuống HÀNG RIÊNG; nếu bù 22px ở đó thì nút bị
              đẩy lệch xuống dưới một khoảng trống vô nghĩa. Ở 2 cột, nút nên nằm sát mép trên
              như một khối độc lập. */}
          <div className="sm:col-span-2 lg:col-span-1 lg:pt-[22px]">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate || busyId === "create"}
              title={
                hasOpenBatch
                  ? "Đã có đợt tất toán tổng đang chờ duyệt cho kỳ này."
                  : eligible.length === 0
                    ? "Không có khoản doanh thu nào đủ điều kiện tất toán."
                    : undefined
              }
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 text-xs font-bold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              {busyId === "create" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Plus size={13} />
              )}
              Tạo đợt tất toán
            </button>
            {hasOpenBatch ? (
              <p className="mt-1 text-[11px] leading-snug text-slate-400">
                Đã có đợt đang chờ duyệt cho kỳ này.
              </p>
            ) : eligible.length === 0 ? (
              <p className="mt-1 text-[11px] leading-snug text-slate-400">
                Không có khoản nào đủ điều kiện.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Kết quả đánh giá ứng viên — KHÔNG cuộn ở cấp ngoài (desktop).
          Chỉ 2 danh sách "Đủ điều kiện" & "Bị giữ lại" mới có thanh cuộn riêng,
          ⇒ không có thanh cuộn lồng nhau (cuộn ngoài làm đè thanh cuộn trong).

          Trên màn hình hẹp (mobile) thì bố cục dọc, không thể vừa 2 danh sách
          + dải tổng mà không cuộn ⇒ cấp ngoài cuộn, mỗi danh sách vẫn cuộn riêng
          với chiều cao tối đa 46vh. */}
      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
        {loadingCandidates ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-center gap-2 py-12 text-xs text-slate-400">
            <Loader2 size={16} className="animate-spin" /> Đang đánh giá ứng viên tất toán...
          </div>
        ) : candidates ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 lg:h-full lg:min-h-0 lg:flex lg:flex-col">
          {/* Đợt tất toán đang chờ duyệt — giải thích vì sao ứng viên có thể rỗng. */}
          {hasOpenBatch && (
            <div className="mb-5 flex shrink-0 items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
              <FileCheck size={16} className="mt-0.5 shrink-0 text-sky-600" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-sky-900">
                  Đợt tất toán{" "}
                  <span className="font-mono">{candidates.openSettlement.settlementCode}</span> đang chờ
                  duyệt
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-sky-700">
                  {candidates.openSettlement.detailCount ?? 0} khoản doanh thu đã được gom
                  vào đợt {formatPeriodVN(candidates.revenuePeriod)} (tổng{" "}
                  <span className="font-mono font-bold">
                    {formatVND(
                      candidates.openSettlement.grossAmount ??
                        candidates.openSettlement.settlementAmount,
                    )}
                  </span>
                  ).
                </p>
              </div>
            </div>
          )}

          {/* Bộ lọc theo đối tác — CHỈ lọc hiển thị, không ảnh hưởng việc gom vào đợt.
              Dùng DROPDOWN có ô tìm kiếm (thay vì dãy nút) vì sàn có thể lên tới
              hàng trăm đối tác — dãy nút sẽ làm vỡ layout. */}
          {partners.length > 1 && (
            <PartnerFilterSelect
              partners={partners}
              value={partnerFilter}
              onChange={setPartnerFilter}
            />
          )}

          {/* ── 2 cột: "Đủ điều kiện" & "Bị giữ lại" ──
              Mỗi cột có THANH CUỘN RIÊNG ⇒ cuộn cột bên trái không làm dịch
              cột bên phải, và mỗi cột không kéo dài chiều cao trang.
              Desktop: chiều cao do `flex-1` của khối cha quyết định (không cuộn ngoài).
              Mobile: `max-h-[46vh]` để mỗi danh sách vẫn cuộn riêng. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-5 lg:flex-1 lg:min-h-0">
            <div className="flex min-h-0 flex-col">
              <h3 className="text-xs font-semibold text-slate-600 shrink-0">
                Đủ điều kiện ({visibleEligible.length})
              </h3>
              {visibleEligible.length === 0 ? (
                <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  {hasOpenBatch
                    ? "Không có ứng viên mới — tất cả khoản doanh thu của kỳ này đã nằm trong đợt tất toán đang chờ duyệt."
                    : "Không có khoản doanh thu nào đủ điều kiện tất toán trong kỳ này."}
                </p>
              ) : (
                <ul className="mt-3 max-h-[46vh] lg:max-h-none lg:min-h-0 lg:flex-1 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                  {visibleEligible.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50/60 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-slate-800">
                          {r?.bookingCode ?? `#${r?.bookingId}`}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {r?.txnRef ?? "—"} · Kỳ {formatPeriod(r?.revenuePeriod)}
                        </p>
                        {/* Tên đối tác — quan trọng vì đợt gom nhiều đối tác. */}
                        <p className="mt-0.5 text-[11px] font-medium text-emerald-700">
                          {r?.providerName ?? "—"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-emerald-700">
                          {formatVND(r?.providerNetAmount)}
                        </span>
                        {/* Nút xem chi tiết ĐƠN đặt tour — luôn hiện nếu có bookingId. */}
                        {r?.bookingId != null && (
                          <button
                            type="button"
                            onClick={() => setBookingDetailId(r.bookingId)}
                            className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            title="Xem chi tiết đơn đặt tour"
                          >
                            <FileCheck size={11} />
                            Xem chi tiết đơn
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDetailTarget(r)}
                          className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                          title="Xem chi tiết khoản doanh thu này"
                        >
                          <Eye size={11} />
                          Chi tiết
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex min-h-0 flex-col">
              <h3 className="text-xs font-semibold text-slate-600 shrink-0">
                Bị giữ lại ({visibleHeld.length})
              </h3>
              {visibleHeld.length === 0 ? (
                <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  Không có khoản nào bị giữ lại.
                </p>
              ) : (
                <ul className="mt-3 max-h-[46vh] lg:max-h-none lg:min-h-0 lg:flex-1 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                  {visibleHeld.map((h) => (
                    <li
                      key={h.revenueId}
                      className="flex items-center justify-between gap-3 rounded-xl bg-amber-50/60 px-4 py-3"
                    >
                      <div className="min-w-0">
                        {/* Mã đơn thật (mã booking) — không phải "Đơn #id" */}
                        <p className="font-mono text-xs font-semibold text-slate-800">
                          {h?.bookingCode ?? (h?.bookingId ? `Đơn #${h.bookingId}` : `#${h?.revenueId}`)}
                        </p>
                        {/* Kỳ gốc ngay dưới mã đơn */}
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Kỳ gốc: {formatPeriod(h?.revenuePeriod)}
                        </p>
                        {/* Tên đối tác — đợt gom nhiều đối tác nên cần biết ai bị giữ. */}
                        <p className="mt-0.5 text-[11px] font-medium text-amber-700">
                          {h?.providerName ?? "—"}
                        </p>
                        {/* LÝ DO BỊ GIỮ LẠI — hiện thẳng ở danh sách để Admin
                            không phải mở modal mới biết vì sao khoản này chưa
                            được tất toán. */}
                        <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-800">
                          <AlertTriangle size={9} className="shrink-0" />
                          {DEFERRED_REASON_LABELS[h?.deferredReason] ?? h?.deferredReason ?? "Chưa đủ điều kiện"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-600">
                          {formatVND(h?.providerNetAmount)}
                        </span>
                        {/* Nút xem chi tiết ĐƠN đặt tour — luôn hiện nếu có bookingId. */}
                        {h?.bookingId != null && (
                          <button
                            type="button"
                            onClick={() => setBookingDetailId(h.bookingId)}
                            className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            title="Xem chi tiết đơn đặt tour"
                          >
                            <FileCheck size={11} />
                            Xem chi tiết đơn
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setDetailTarget({
                              id: h?.revenueId,
                              bookingId: h?.bookingId,
                              bookingCode: h?.bookingCode,
                              providerNetAmount: h?.providerNetAmount,
                              revenuePeriod: h?.revenuePeriod,
                              deferredReason: h?.deferredReason,
                            })
                          }
                          className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                          title="Xem chi tiết điều kiện tất toán của khoản doanh thu này"
                        >
                          <Eye size={11} />
                          Chi tiết
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs py-12 text-center text-slate-400">
          <Wallet size={28} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-semibold text-slate-600">
            Chọn kỳ doanh thu để xem ứng viên tất toán của toàn bộ đối tác
          </p>
        </div>
        )}
      </div>

      {/* ── Dải tổng số tiền — Ghim ở ĐÁY màn hình ──
          Nằm NGOÀI vùng cuộn (đã đóng `</div>` ở trên) và là `shrink-0` ⇒ luôn
          hiện ngay dưới màn hình, không phải cuộn xuống cuối mới thấy.
          Khi màn hình hẹp, các ô xuống 2 cột → cao hơn, vẫn giữ nguyên vị trí đáy. */}
      {totals && (
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs">
          <Total label="Tổng thanh toán" value={totals.grossAmount} />
          <Total label="Hoàn tiền" value={totals.refundAmount} />
          {/* Voucher — tách 2 dòng: nền tảng chịu / đối tác chịu. */}
          <Total
            label="Áp dụng voucher"
            rows={[
              { label: "của nền tảng", value: totals.voucherPlatformAmount },
              { label: "của đối tác", value: totals.voucherPartnerAmount },
            ]}
          />
          <Total label="Doanh thu nền tảng" value={totals.commissionAmount} />
          <Total label="Doanh thu đối tác" value={totals.settlementAmount} tone="emerald" />
        </div>
      )}

      {detailTarget && (
        <ProviderRevenueDetailModal
          revenue={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}

      {bookingDetailId != null && (
        <BookingDetailModal
          bookingId={bookingDetailId}
          onClose={() => setBookingDetailId(null)}
        />
      )}
    </div>
  );
}
/* ══════════════════════════════════════════════════════════════════════════
   DOANH THU NỀN TẢNG — phần tiền thu được sau khi tất toán cho đối tác
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Tổng hợp doanh thu nền tảng (hook) — dùng chung cho dải số liệu và bảng theo kỳ.
 *
 * ── Công thức ──
 *   Doanh thu nền tảng = Tổng thanh toán − Tổng hoàn tiền − Tổng chi trả đối tác
 *                      = Tổng hoa hồng + Tổng điều chỉnh
 *
 * ── Phạm vi ──
 * Chỉ tính các đợt tất toán đã DUYỆT (APPROVED) — đó là lúc tiền thực sự được
 * ghi vào ví đối tác. Kỳ đang chờ duyệt (DRAFT) chưa phải doanh thu đã thu được
 * ⇒ không tính vào, tránh báo cáo số liệu không thực.
 *
 * Số liệu là TOÀN HỆ THỐNG (không phụ thuộc phân trang) — nên lấy từ endpoint
 * riêng thay vì cộng từ `settlements` (chỉ là trang hiện tại).
 */
function usePlatformRevenue() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // 24 kỳ = 2 năm ⇒ đủ dữ liệu để so sánh theo NĂM (biểu đồ cột) bên cạnh
      // so sánh theo THÁNG.
      const data = await getPlatformRevenueSummary(24);
      setSummary(data);
    } catch (err) {
      setError(err?.message || "Không thể tải tổng hợp doanh thu nền tảng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const periods = Array.isArray(summary?.periods) ? summary.periods : [];
  return { summary, periods, loading, error, load };
}

/**
 * Tổng hợp 5 ô chỉ số của tab "Tổng quan & Duyệt đợt" (hook).
 *
 * Số liệu TOÀN HỆ THỐNG — không phụ thuộc phân trang hay bộ lọc đang xem.
 */
function useSettlementOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getSettlementOverview();
      setData(res);
    } catch (err) {
      setError(err?.message || "Không thể tải tổng hợp tất toán.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { data, loading, error, load };
}

/**
 * Bảng doanh thu nền tảng theo kỳ — bản gọn cho cột trái (~1/3 chiều rộng).
 *
 * Mỗi dòng: Kỳ (kèm dòng phụ Hoàn tiền / Chi trả đối tác) | Khách thanh toán |
 * Hoa hồng | Doanh thu nền tảng (kèm thanh quy mô so với kỳ cao nhất).
 * Vùng bảng tự cuộn bên trong — khung ngoài không cuộn.
 */
function PeriodRevenuePanel({ revenue, className = "" }) {
  const { summary, periods, loading, error, load } = revenue;
  // Mức tổng hợp của biểu đồ cột: theo THÁNG hay theo NĂM.
  const [granularity, setGranularity] = useState("month");
  const maxPlatform = periods.reduce(
    (max, p) => Math.max(max, Number(p?.platformRevenue ?? 0)),
    0,
  );

  // ── Chuỗi dữ liệu cho biểu đồ cột ──
  // Theo tháng: mỗi kỳ doanh thu (yyyy-MM) là một cột.
  // Theo năm: gom các kỳ của cùng một năm lại (so sánh doanh thu giữa các năm).
  const chartRows = useMemo(() => {
    const rows = periods.map((p) => ({
      key: p?.revenuePeriod,
      label: formatShortPeriod(p?.revenuePeriod),
      platform: Number(p?.platformRevenue ?? 0),
      partner: Number(p?.providerNetAmount ?? 0),
    }));
    if (granularity === "month") {
      // Cũ → mới để biểu đồ đọc theo chiều thời gian.
      return [...rows].reverse();
    }
    const byYear = new Map();
    for (const r of rows) {
      const year = String(r.key ?? "").slice(0, 4) || "—";
      const acc = byYear.get(year) ?? { key: year, label: year, platform: 0, partner: 0 };
      acc.platform += r.platform;
      acc.partner += r.partner;
      byYear.set(year, acc);
    }
    return Array.from(byYear.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [periods, granularity]);

  return (
    <div
      className={`flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden ${className}`}
    >
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="shrink-0 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900 truncate">Doanh thu theo kỳ</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 truncate">
            Tính trên các đợt tất toán đã duyệt
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Chuyển mức tổng hợp: theo tháng ↔ theo năm */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {[
              { id: "month", label: "Tháng" },
              { id: "year", label: "Năm" },
            ].map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGranularity(g.id)}
                className={`rounded-md px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                  granularity === g.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* ── Biểu đồ: CỐ ĐỊNH (không cuộn theo) ──
          Biểu đồ luôn nằm trên cùng để Admin so sánh nhanh với bảng bên dưới. */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {error ? (
          <div className="p-4">
            <ErrorBox text={error} />
          </div>
        ) : loading && !summary ? (
          <Loading />
        ) : periods.length === 0 ? (
          <p className="m-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Chưa có đợt tất toán nào được duyệt — doanh thu nền tảng sẽ hiển thị sau khi
            duyệt đợt tất toán đầu tiên.
          </p>
        ) : (
          <>
            {/* ── Biểu đồ cột so sánh doanh thu nền tảng vs đối tác ── */}
            <div className="shrink-0">
              <RevenueBarChart rows={chartRows} />
            </div>

            {/* ── Bảng chi tiết theo kỳ — CUỘN RIÊNG ──
                Chỉ phần bảng cuộn dọc; biểu đồ phía trên đứng yên. */}
            <div className="min-h-0 flex-1 overflow-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
            <table className="w-full text-left text-[11px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 text-[10.5px] font-semibold text-slate-500 border-b border-slate-200">
                <th className="py-2 px-3">Kỳ</th>
                <th className="py-2 px-3 text-right">
                  Tổng DT
                  <span className="mt-0.5 block text-[9.5px] font-normal normal-case text-slate-400">
                    Tổng tiền của đợt tất toán tháng đó
                  </span>
                </th>
                <th className="py-2 px-3 text-right">DT đối tác</th>
                <th className="py-2 px-3 text-right">DT nền tảng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periods.map((p) => {
                const platform = Number(p?.platformRevenue ?? 0);
                const ratio =
                  maxPlatform > 0 ? Math.max(4, (platform / maxPlatform) * 100) : 0;
                return (
                  <tr key={p?.revenuePeriod} className="hover:bg-slate-50/70 align-top">
                    <td className="py-2 px-3">
                      <p className="font-semibold text-slate-700 whitespace-nowrap">
                        {formatPeriod(p?.revenuePeriod)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400 leading-snug">
                        {p?.settlementCount ?? 0} đợt
                      </p>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                      {formatVND(p?.grossAmount)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-sky-700 whitespace-nowrap">
                      {formatVND(p?.providerNetAmount)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <p className="font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatVND(platform)}
                      </p>
                      {/* Thanh ngang thể hiện tỷ lệ so với kỳ cao nhất */}
                      <div className="mt-1.5 ml-auto h-1 w-full max-w-[96px] overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Biểu đồ cột so sánh DOANH THU NỀN TẢNG vs DOANH THU ĐỐI TÁC theo từng kỳ.
 *
 * ── Vì sao tự vẽ bằng CSS (không dùng thư viện chart)? ──
 * Dự án không cài thư viện biểu đồ (recharts/chart.js) — thêm sẽ làm nặng bundle.
 * Biểu đồ ở đây chỉ cần 2 series dạng cột ⇒ CSS flex + height% là đủ, nhẹ và
 * không phụ thuộc thư viện ngoài.
 *
 * Mỗi cột = 1 kỳ (tháng) hoặc 1 năm, gồm 2 thanh đứng cạnh nhau:
 *   • Xanh (emerald) — doanh thu nền tảng (hoa hồng + điều chỉnh).
 *   • Xanh dương (sky)   — doanh thu đối tác (tiền đã chi trả).
 */
function RevenueBarChart({ rows }) {
  if (!rows || rows.length === 0) return null;

  const max = rows.reduce(
    (m, r) => Math.max(m, Number(r?.platform ?? 0), Number(r?.partner ?? 0)),
    0,
  );
  // Cột cao nhất chiếm ~78% chiều cao vùng vẽ ⇒ chừa chỗ cho nhãn giá trị.
  //
  // QUAN TRỌNG: dùng PIXEL cố định (không %) — vì phần tử cha dùng `items-end`
  // nên chiều cao % của con sẽ không có gốc tính % (không resolve được) ⇒ cột bị co về 0px
  // và không hiển thị. Tính sẵn pixel theo giá trị ⇒ luôn hiển thị đúng.
  const CHART_HEIGHT = 130; // px — vùng vẽ
  const LABEL_HEIGHT = 16; // px — nhãn kỳ dưới trục X
  const BAR_MAX = CHART_HEIGHT - LABEL_HEIGHT - 10; // px — bỏ chừa nhãn + padding
  const barHeight = (value) => {
    const v = Number(value) || 0;
    if (max <= 0 || v <= 0) return 0;
    return Math.max(3, Math.round((v / max) * BAR_MAX));
  };

  return (
    <div className="border-b border-slate-100 px-4 py-3">
      {/* Chú giải */}
      <div className="mb-2 flex items-center gap-3 text-[10.5px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-emerald-500" />
          Doanh thu nền tảng
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-sky-500" />
          Doanh thu đối tác
        </span>
      </div>

      {/* Vùng vẽ — cuộn ngang nếu nhiều cột */}
      <div className="overflow-x-auto [scrollbar-width:thin]">
        <div
          className="flex min-w-full items-end gap-1.5"
          style={{ height: `${CHART_HEIGHT}px` }}
        >
          {rows.map((r) => (
            <div
              key={r.key}
              className="group relative flex min-w-[42px] flex-1 flex-col items-center justify-end"
              title={`${r.label} — Nền tảng: ${formatVND(r.platform)} · Đối tác: ${formatVND(r.partner)}`}
            >
              {/* Nhãn giá trị (hiện khi hover để tránh rối) */}
              <div className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white shadow-lg group-hover:block">
                <div>Nền tảng: {formatVND(r.platform)}</div>
                <div>Đối tác: {formatVND(r.partner)}</div>
              </div>

              {/* 2 thanh: nền tảng (trái) + đối tác (phải).
                  Chiều cao tính sẵn theo PIXEL (không %) để cột luôn hiển thị. */}
              <div className="flex w-full items-end justify-center gap-0.5">
                <div
                  className="w-2.5 rounded-t bg-emerald-500/90 transition-all group-hover:bg-emerald-600"
                  style={{ height: `${barHeight(r.platform)}px` }}
                />
                <div
                  className="w-2.5 rounded-t bg-sky-500/90 transition-all group-hover:bg-sky-600"
                  style={{ height: `${barHeight(r.partner)}px` }}
                />
              </div>

              {/* Nhãn kỳ dưới trục X */}
              <span className="mt-1 truncate text-[9.5px] font-medium text-slate-400">
                {r.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Modal chi tiết đơn bị giữ lại — dùng chung cho khoản "đủ điều kiện" và "bị giữ lại".
 *
 * ── Vì sao cần modal này? ──
 * Admin cần xem thông tin gốc của đơn (khách, tour, ngày trải nghiệm, trạng thái,
 * các lần thanh toán) để quyết định duyệt/từ chối tất toán — không chỉ nhìn
 * con số "đối tác nhận".
 *
 * Gọi song song:
 *   • `GET /bookings/{id}` → thông tin đơn.
 *   • `GET /payments/bookings/{id}` → lịch sử thanh toán của đơn.
 */
function BookingDetailModal({ bookingId, onClose }) {
  const [booking, setBooking] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookingId) return undefined;
    let active = true;
    // `queueMicrotask` để không gọi setState đồng bộ trong thân effect
    // (tránh cascading render — xem convention của các trang admin khác).
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError("");
      Promise.all([
        getBookingById(bookingId).catch(() => null),
        getPaymentsByBooking(bookingId, { size: 20 }).catch(() => null),
      ])
        .then(([b, p]) => {
          if (!active) return;
          setBooking(b);
          const content = Array.isArray(p) ? p : (p?.content ?? []);
          setPayments(content);
          setLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          setError(err?.message || "Không thể tải chi tiết đơn.");
          setLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [bookingId]);

  return (
    <ModalShell title="Chi tiết đơn đặt tour" onClose={onClose} wide>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox text={error} />
      ) : booking ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Mã đơn" value={booking?.bookingCode} mono />
            <InfoRow
              label="Trạng thái đơn"
              value={BOOKING_STATUS_LABELS[booking?.status] ?? booking?.status}
              pill
              status={booking?.status}
            />
            <InfoRow label="Khách du lịch" value={booking?.touristName} />
            <InfoRow label="Tour" value={booking?.tourTitle} />
            <InfoRow
              label="Ngày trải nghiệm"
              value={formatLocalDate(booking?.experienceDate)}
            />
            <InfoRow label="Tổng thanh toán" value={formatVND(booking?.totalAmount)} mono />
            <InfoRow label="Thời điểm đặt" value={formatDateTimeVN(booking?.createdAt)} />
            <InfoRow
              label="Thời điểm thanh toán"
              value={formatDateTimeVN(booking?.paidAt)}
            />
            {booking?.cancellationReason && (
              <InfoRow
                label="Lý do hủy"
                value={booking.cancellationReason}
                tone="rose"
              />
            )}
          </div>

          {/* Lịch sử thanh toán của đơn — giúp đối soát số tiền doanh thu. */}
          <DetailBlock title={`Lịch sử thanh toán (${payments.length})`}>
            {payments.length === 0 ? (
              <p className="text-xs text-slate-500">Đơn này chưa có giao dịch thanh toán.</p>
            ) : (
              // Không bọc `overflow-x-auto` — nếu không container con sẽ trở thành
              // scroll container riêng và làm sticky header không bám theo modal.
              // Bảng vừa khung modal nên không cần cuộn ngang.
              <table className="w-full text-left text-[11px] border-collapse">
                {/* Sticky header — tiêu đề cột luôn nhìn thấy khi cuộn */}
                <thead className="sticky top-0 z-10">
                  <tr className="bg-white border-b border-slate-200 text-[10.5px] font-semibold text-slate-500">
                    <th className="py-2 px-2">Mã giao dịch</th>
                    <th className="py-2 px-2">Thời điểm</th>
                    <th className="py-2 px-2 text-right">Số tiền</th>
                    <th className="py-2 px-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 px-2 font-mono text-slate-800 break-all">
                        {p?.txnRef ?? `#${p?.id}`}
                      </td>
                      <td className="py-2 px-2 text-slate-600">
                        {formatDateTimeVN(p?.createdAt)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-700">
                        {formatVND(p?.amount)}
                      </td>
                      <td className="py-2 px-2">
                        <StatusPill status={p?.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DetailBlock>
        </div>
      ) : (
        <ErrorBox text="Không tìm thấy đơn." />
      )}
    </ModalShell>
  );
}

/**
 * Modal XÁC NHẬN duyệt đợt tất toán.
 *
 * ── Vì sao thay cho window.confirm ──
 * `window.confirm` hiển thị hộp thoại mặc định của trình duyệt: giao diện không
 * đồng bộ với design system, nội dung là text thuần nên KHÔNG định dạng được số
 * tiền, và không có chỗ báo lỗi API. Modal này:
 *  • Hiển thị đủ thông tin để Admin đối soát: mã đợt, kỳ, phạm vi, số đối tác,
 *    tổng thanh toán, tiền hoàn, doanh thu nền tảng và tiền đối tác nhận.
 *  • Cảnh báo rõ tác động bất biến (không thể hoàn tác sau khi duyệt).
 *  • Lỗi API hiển thị ngay trong modal.
 *  • Có nút Hủy rõ ràng.
 */
function ApproveSettlementModal({ settlement, error, busy, onConfirm, onClose }) {
  const isBatch = settlement?.scope === "BATCH";
  const partnerCount = settlement?.partnerCount ?? 0;
  const gross = Number(settlement?.grossAmount ?? 0) || 0;
  const refund = Number(settlement?.refundAmount ?? 0) || 0;
  const commission =
    (Number(settlement?.commissionAmount ?? 0) || 0) +
    (Number(settlement?.adjustmentAmount ?? 0) || 0);
  const net = Number(settlement?.settlementAmount ?? 0) || 0;

  // ── Mở rộng: chi tiết doanh thu của TỪNG đối tác ──
  // Dùng chung endpoint /settlements/{id}/details với modal "Chi tiết đợt tất toán".
  //
  // ⚠️ Gọi API TRONG HANDLER (không phải trong useEffect) — để tuân thủ quy tắc
  // "không setState đồng bộ trong effect" (tránh cascading render) và chỉ gọi
  // API 1 lần mỗi lần bấm nút "Mở rộng".
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [loadedId, setLoadedId] = useState(null);

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (!next) return;
    // Đã tải rồi ⇒ không gọi lại API.
    if (loadedId === settlement?.id) return;
    setDetailLoading(true);
    setDetailError("");
    getSettlementDetails(settlement?.id)
      .then((d) => {
        setDetails(Array.isArray(d) ? d : []);
        setLoadedId(settlement?.id ?? null);
      })
      .catch((err) => {
        setDetailError(err?.message || "Không thể tải chi tiết doanh thu của các đối tác.");
      })
      .finally(() => {
        setDetailLoading(false);
      });
  };

  // Gom theo đối tác — mỗi dòng là tiền của MỘT đối tác trong đợt.
  const partnerRows = useMemo(() => {
    const map = new Map();
    for (const d of details) {
      const key = d?.providerProfileId ?? `unknown-${d?.providerName ?? "?"}`;
      const acc = map.get(key) ?? {
        id: d?.providerProfileId ?? null,
        name: d?.providerName ?? "—",
        count: 0,
        gross: 0,
        commission: 0,
        net: 0,
      };
      acc.count += 1;
      acc.gross += Number(d?.grossAmount ?? 0);
      acc.commission += Number(d?.commissionAmount ?? 0);
      acc.net += Number(d?.providerNetAmount ?? 0);
      map.set(key, acc);
    }
    // Đối tác nhận nhiều tiền nhất lên đầu.
    return Array.from(map.values()).sort((a, b) => b.net - a.net);
  }, [details]);

  return (
    <ModalShell title="Xác nhận duyệt đợt tất toán" onClose={onClose} wide>
      {/* Cảnh báo hành động không thể hoàn tác */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-emerald-900">
            Duyệt đợt tất toán này sẽ cộng tiền vào ví đối tác
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-emerald-700">
            Hành động này <strong>không thể hoàn tác</strong> — các khoản doanh thu
            trong đợt sẽ chuyển sang trạng thái đã tất toán.
          </p>
        </div>
      </div>

      {/* Tóm tắt đợt bị tác động — để Admin xác nhận đúng đợt. */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-xs font-semibold text-slate-800">
            {settlement?.settlementCode ?? `#${settlement?.id}`}
          </span>
          <span className="text-[11px] font-semibold text-slate-500">
            {formatPeriodVN(settlement?.revenuePeriod)}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          {isBatch
            ? `Đợt tổng — toàn bộ ${partnerCount} đối tác`
            : `Một đối tác — ${settlement?.providerName ?? `#${settlement?.providerProfileId}`}`}
        </p>

        <dl className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Tổng thanh toán</dt>
            <dd className="font-mono font-semibold text-slate-800">
              {formatVND(gross)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Hoàn tiền</dt>
            <dd className="font-mono font-semibold text-slate-800">
              {formatVND(refund)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Doanh thu nền tảng</dt>
            <dd className="font-mono font-semibold text-emerald-700">
              {formatVND(commission)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-1.5">
            <dt className="font-bold text-slate-700">
              {isBatch ? "Tổng tiền của toàn bộ đối tác" : "Tiền ghi vào ví đối tác"}
            </dt>
            <dd className="font-mono text-sm font-bold text-sky-700">
              {formatVND(net)}
            </dd>
          </div>
        </dl>
      </div>

      {/* ── Nút mở rộng: chi tiết doanh thu của từng đối tác ── */}
      {isBatch ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={expanded}
            className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-1.5">
              <Users size={13} className="text-slate-400" />
              Xem chi tiết doanh thu từng đối tác
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
              {expanded ? "Thu gọn" : "Mở rộng"}
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          </button>

          {expanded && (
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {detailLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-slate-400">
                  <Loader2 size={13} className="animate-spin" /> Đang tải chi tiết...
                </div>
              ) : detailError ? (
                <div className="p-3">
                  <ErrorBox text={detailError} />
                </div>
              ) : partnerRows.length === 0 ? (
                <p className="py-6 text-center text-[11px] text-slate-400">
                  Đợt này chưa có khoản doanh thu nào.
                </p>
              ) : (
                <>
                  {/* Vùng cuộn RIÊNG — đợt gom nhiều đối tác vẫn theo dõi được
                      mà không phải cuộn cả modal. */}
                  <div className="max-h-[240px] overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-50 text-[10.5px] font-semibold text-slate-500 border-b border-slate-200">
                          <th className="py-2 px-3">Đối tác</th>
                          <th className="py-2 px-2 text-right">Số đơn</th>
                          <th className="py-2 px-2 text-right">Tổng tiền</th>
                          <th className="py-2 px-2 text-right">DT nền tảng</th>
                          <th className="py-2 px-3 text-right">Tiền đối tác nhận</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {partnerRows.map((p) => (
                          <tr key={p.id ?? p.name} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {p.name}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">
                              {p.count}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">
                              {formatVND(p.gross)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">
                              {formatVND(p.commission)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatVND(p.net)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-3 py-2 text-[11px]">
                    <span className="font-semibold text-slate-600">
                      Tổng cộng {partnerRows.length} đối tác
                    </span>
                    <span className="font-mono font-bold text-sky-700">
                      {formatVND(partnerRows.reduce((s, p) => s + p.net, 0))}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : null}

      {error && (
        <div className="mt-3">
          <ErrorBox text={error} />
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <CheckCircle2 size={13} />
          )}
          {busy ? "Đang duyệt…" : "Xác nhận duyệt"}
        </button>
      </div>
    </ModalShell>
  );
}

/**
 * Modal nhập lý do từ chối / hủy đợt tất toán.
 *
 * ── Vì sao thay cho window.prompt ──
 * `window.prompt` bị chặn trong một số trình duyệt / webview và khi người dùng bấm
 * "Cancel" nó trả về `null` ⇒ hàm gọi thoát im lặng, không gọi API, không báo lỗi —
 * nút "Từ chối" bị coi như "chết". Modal này luôn phản hồi rõ ràng:
 *  • Bắt buộc nhập lý do (nút Xác nhận bị chặn khi rỗng).
 *  • Lỗi API hiển thị ngay trong modal.
 *  • Có nút Hủy rõ ràng.
 */
function RejectSettlementModal({
  settlement,
  reason,
  error,
  busy,
  onReasonChange,
  onConfirm,
  onClose,
}) {
  const canSubmit = reason.trim().length > 0 && !busy;

  return (
    <ModalShell title="Từ chối đợt tất toán" onClose={onClose}>
      {/* Tóm tắt đợt bị tác động — để Admin xác nhận đúng đợt. */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-xs font-semibold text-slate-800">
            {settlement?.settlementCode ?? `#${settlement?.id}`}
          </span>
          <span className="text-[11px] font-semibold text-slate-500">
            {formatPeriod(settlement?.revenuePeriod)}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          {settlement?.scope === "BATCH"
            ? `Toàn bộ đối tác (${settlement?.partnerCount ?? 0})`
            : (settlement?.providerName ?? `#${settlement?.providerProfileId}`)}
        </p>
        <p className="mt-2 text-sm font-semibold text-emerald-700">
          {formatVND(settlement?.settlementAmount)}
        </p>
      </div>

      <div className="mt-4">
        <label
          htmlFor="reject-reason"
          className="mb-1.5 block text-xs font-semibold text-slate-500"
        >
          Lý do từ chối <span className="text-rose-500">*</span>
        </label>
        <LimitedField
          as="textarea"
          counter="always"
          limit={1000}
          id="reject-reason"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={4}
          autoFocus
          placeholder="VD: Số tiền chưa khớp với báo cáo đối soát — cần kiểm tra lại đơn đặt tour số 9."
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          Lý do sẽ được lưu vào lịch sử đợt tất toán.
        </p>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorBox text={error} />
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canSubmit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
          Xác nhận từ chối
        </button>
      </div>
    </ModalShell>
  );
}

/**
 * Modal chi tiết một KHOẢN DOANH THU (dùng chung cho "đủ điều kiện" và "bị giữ lại").
 *
 * ── Vì sao cần modal này? ──
 * Danh sách ứng viên chỉ hiển thị mã đơn + số tiền. Admin cần xem:
 *   • Số tiền đầy đủ (tổng, hoàn, hoa hồng, điều chỉnh, đối tác nhận).
 *   • 9 ĐIỀU KIỆN tất toán — backend đánh giá lại tại thời điểm gọi
 *     (`GET /provider-revenues/{id}/eligibility`) ⇒ biết chính xác vì sao
 *     khoản này bị giữ lại / đủ điều kiện.
 *
 * Gọi song song 2 endpoint:
 *   • `GET /provider-revenues/{id}`             → thông tin khoản doanh thu.
 *   • `GET /provider-revenues/{id}/eligibility` → kết quả 9 điều kiện.
 */
function ProviderRevenueDetailModal({ revenue, onClose }) {
  const revenueId = revenue?.id;
  const isHeld = Boolean(revenue?.deferredReason);
  const [data, setData] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!revenueId) return undefined;
    let active = true;
    // `queueMicrotask` để không gọi setState đồng bộ trong thân effect
    // (tránh cascading render — xem convention của các trang admin khác).
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError("");
      Promise.all([
        getRevenueById(revenueId).catch(() => null),
        evaluateEligibility(revenueId).catch(() => null),
      ])
        .then(([rev, elig]) => {
          if (!active) return;
          setData(rev);
          setEligibility(elig);
          setLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          setError(err?.message || "Không thể tải chi tiết khoản doanh thu.");
          setLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [revenueId]);

  const r = data ?? revenue;
  const eligible = eligibility?.eligible;
  const checks = Array.isArray(eligibility?.checks) ? eligibility.checks : [];

  return (
    <ModalShell
      title={isHeld ? "Chi tiết đơn bị giữ lại" : "Chi tiết khoản doanh thu"}
      onClose={onClose}
      wide
      footer={
        /* ── Kết luận đủ điều kiện — GHIM Ở ĐÁY MODAL ──
           Admin bấm "Chi tiết" là thấy ngay kết luận (đủ / chưa đủ + lý do),
           không phải cuộn xuống cuối modal mới thấy. Đặt ở chân modal nên
           vị trí vẫn là "cuối modal" nhưng KHÔNG bị cuộn mất. */
        !loading && !error && eligibility ? (
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
              eligible
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            {eligible ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            )}
            <div className="min-w-0">
              <p
                className={`text-xs font-bold ${
                  eligible ? "text-emerald-900" : "text-amber-900"
                }`}
              >
                {eligible
                  ? "Đủ điều kiện tất toán"
                  : `Chưa đủ điều kiện — ${
                      DEFERRED_REASON_LABELS[eligibility.deferredReason] ??
                      eligibility.deferredReason ??
                      "cần đối soát thêm"
                    }`}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                Kết quả được đánh giá lại tại thời điểm mở, dựa trên 9 điều kiện
                bắt buộc — không dựa vào trạng thái lưu sẵn.
              </p>
            </div>
          </div>
        ) : null
      }
    >
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox text={error} />
      ) : (
        <div className="space-y-5">
          {/* Tóm tắt */}
          <div className="grid grid-cols-2 gap-3">
            <InfoRow
              label="Mã đơn"
              value={r?.bookingCode ?? revenue?.bookingCode ?? `#${r?.bookingId ?? revenue?.bookingId}`}
              mono
            />
            <InfoRow
              label="Trạng thái khoản thu"
              value={
                r?.status
                  ? (PROVIDER_REVENUE_STATUS_LABELS[r.status] ?? r.status)
                  : "—"
              }
            />
            <InfoRow label="Mã giao dịch" value={r?.txnRef} mono />
            <InfoRow
              label="Kỳ gốc"
              value={formatPeriod(r?.revenuePeriod ?? revenue?.revenuePeriod)}
            />
            <InfoRow label="Tổng thanh toán" value={formatVND(r?.grossAmount)} mono />
            <InfoRow label="Hoàn tiền" value={formatVND(r?.refundAmount)} mono />
            {Number(r?.voucherDiscount ?? 0) > 0 ? (
              <InfoRow
                label={`Giảm giá voucher (${r?.voucherScope === "PLATFORM" ? "Nền tảng chịu" : "Đối tác chịu"})`}
                value={`-${formatVND(r?.voucherDiscount)}`}
                mono
                tone={r?.voucherScope === "PLATFORM" ? "rose" : "amber"}
              />
            ) : null}
            <InfoRow label="Doanh thu nền tảng" value={formatVND(r?.commissionAmount)} mono />
            <InfoRow
              label="Doanh thu đối tác"
              value={formatVND(r?.providerNetAmount)}
              mono
              tone="emerald"
            />
            <InfoRow label="Đối tác" value={r?.providerName} />
          </div>

          {/* 9 điều kiện tất toán — đánh số thứ tự, tên điều kiện tiếng Việt,
              cuối mỗi dòng là icon đánh dấu đã đạt hay chưa đạt. */}
          {checks.length > 0 && (
            <DetailBlock title="Điều kiện tất toán" flush>
              <div className="max-h-[45vh] overflow-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 text-[10.5px] font-semibold text-slate-500 border-b border-slate-200">
                      <th className="w-10 py-2 px-3 text-center">#</th>
                      <th className="py-2 px-3">Điều kiện</th>
                      <th className="w-24 py-2 px-3 text-center">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {checks.map((c, idx) => {
                      const label = settlementCheckLabel(c);
                      return (
                        <tr
                          key={c?.code ?? idx}
                          className={c?.passed ? "bg-emerald-50/40" : "bg-rose-50/40"}
                        >
                          <td className="py-2 px-3 text-center text-[11px] font-semibold text-slate-400 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 align-top">
                            <p className="text-[11.5px] font-medium leading-tight text-slate-800">
                              {label.title}
                            </p>
                            {label.detail && (
                              <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
                                {label.detail}
                              </p>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center align-middle">
                            {/* Icon lucide đánh dấu trạng thái — đồng bộ với UI
                                còn lại của trang (màu + kích thước nhất quán). */}
                            <span
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                                c?.passed
                                  ? "bg-emerald-100 text-emerald-600"
                                  : "bg-rose-100 text-rose-500"
                              }`}
                              title={c?.passed ? "Đã đạt" : "Chưa đạt"}
                              aria-label={c?.passed ? "Đã đạt" : "Chưa đạt"}
                            >
                              {c?.passed ? (
                                <CheckCircle2 size={13} strokeWidth={2.5} />
                              ) : (
                                <XCircle size={13} strokeWidth={2.5} />
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </DetailBlock>
          )}
        </div>
      )}
    </ModalShell>
  );
}

/**
 * Modal chi tiết đợt tất toán — gọi GET /settlements/{id}/details.
 */
function SettlementDetailModal({ settlementId, onClose }) {
  const [settlement, setSettlement] = useState(null);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Đối tác đang chọn trong bảng tổng hợp — lọc bảng chi tiết bên dưới.
  // null = xem tất cả.
  const [partnerFilter, setPartnerFilter] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getSettlementById(settlementId),
      getSettlementDetails(settlementId),
    ])
      .then(([s, d]) => {
        if (!active) return;
        setSettlement(s);
        setDetails(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Không thể tải chi tiết đợt tất toán.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [settlementId]);

  // ── Tổng hợp TOÀN BỘ đối tác trong đợt ──
  // Đợt TỔNG gom doanh thu của nhiều đối tác ⇒ Admin cần thấy ngay ai được
  // nhận bao nhiêu, trước khi duyệt.
  const partnerSummary = useMemo(() => {
    const map = new Map();
    for (const d of details) {
      const key = d?.providerProfileId ?? `unknown-${d?.providerName ?? "?"}`;
      const acc = map.get(key) ?? {
        id: d?.providerProfileId ?? null,
        name: d?.providerName ?? "—",
        count: 0,
        gross: 0,
        commission: 0,
        net: 0,
      };
      acc.count += 1;
      acc.gross += Number(d?.grossAmount ?? 0);
      acc.commission += Number(d?.commissionAmount ?? 0);
      acc.net += Number(d?.providerNetAmount ?? 0);
      map.set(key, acc);
    }
    // Sắp xếp: đối tác nhận nhiều tiền nhất lên đầu.
    return Array.from(map.values()).sort((a, b) => b.net - a.net);
  }, [details]);

  const visibleDetails = useMemo(() => {
    if (partnerFilter == null) return details;
    return details.filter((d) => String(d?.providerProfileId) === String(partnerFilter));
  }, [details, partnerFilter]);

  // Tổng cộng các cột của bảng "Các khoản doanh thu trong đợt" — để Admin đối chiếu
  // trực tiếp với các ô ở cột trái (Tổng thanh toán / Hoàn tiền / Doanh thu nền tảng).
  const detailTotals = useMemo(() => {
    const acc = { gross: 0, voucher: 0, refund: 0, commission: 0, net: 0 };
    for (const d of visibleDetails) {
      acc.gross += Number(d?.grossAmount ?? 0) || 0;
      acc.voucher += Number(d?.voucherDiscount ?? 0) || 0;
      acc.refund += Number(d?.refundAmount ?? 0) || 0;
      acc.commission += Number(d?.commissionAmount ?? 0) || 0;
      acc.net += Number(d?.providerNetAmount ?? 0) || 0;
    }
    return acc;
  }, [visibleDetails]);

  return (
    <ModalShell title="Chi tiết đợt tất toán" onClose={onClose} xwide fill>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox text={error} />
      ) : (
        <div className="flex h-full min-h-0 flex-col gap-5">
          {/* ── 2 CỘT ──
              TRÁI  : từ đầu (thông tin đợt) → "Tổng hợp N đối tác trong đợt"
              PHẢI  : "Các khoản doanh thu trong đợt"
              Mỗi cột có thanh cuộn RIÊNG ⇒ đợt gom nhiều đối tác / nhiều khoản
              vẫn theo dõi được mà không phải cuộn cả modal.
              ⚠️ Cột phải chiếm nhiều không gian hơn (4fr / 8fr) vì bảng "Các khoản
              doanh thu trong đợt" có tới 8 cột (thêm "Hoàn tiền") ⇒ cần đủ rộng để
              các số tiền không bị chen chúc. */}
          <div className="grid grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] lg:grid-rows-1 gap-5 flex-1 min-h-0">
            {/* ══ CỘT TRÁI ══
                Toàn bộ cột trái là MỘT vùng cuộn riêng (thông tin đợt → tổng hợp
                đối tác) ⇒ không bị "đè" khi danh sách đối tác dài, và không phải
                cuộn cả modal. */}
            <div className="flex min-h-0 flex-col overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <InfoRow
                  label="Mã đợt"
                  value={settlement?.settlementCode}
                  mono
                />
                <InfoRow
                  label="Trạng thái"
                  value={SETTLEMENT_STATUS_LABELS[settlement?.status] ?? settlement?.status}
                  pill
                  status={settlement?.status}
                />
                <InfoRow
                  label="Phạm vi"
                  value={
                    settlement?.scope === "BATCH"
                      ? "Tổng — toàn bộ đối tác"
                      : "Một đối tác"
                  }
                />
                <InfoRow
                  label="Đối tác"
                  value={
                    settlement?.scope === "BATCH"
                      ? `Toàn bộ đối tác (${settlement?.partnerCount ?? 0})`
                      : settlement?.providerName
                  }
                />
                <InfoRow
                  label="Kỳ doanh thu"
                  value={formatPeriod(settlement?.revenuePeriod)}
                />
                <InfoRow label="Tổng thanh toán" value={formatVND(settlement?.grossAmount)} mono />
                <InfoRow label="Hoàn tiền" value={formatVND(settlement?.refundAmount)} mono />
                <InfoRow
                  label="Doanh thu nền tảng"
                  value={formatVND(settlement?.commissionAmount)}
                  mono
                />
                <InfoRow
                  label="Doanh thu đối tác"
                  value={formatVND(settlement?.settlementAmount)}
                  mono
                  tone="emerald"
                />
                <InfoRow label="Thời điểm tạo" value={formatDateTimeVN(settlement?.createdAt)} />
                {settlement?.approvedAt && (
                  <InfoRow
                    label="Thời điểm duyệt"
                    value={formatDateTimeVN(settlement.approvedAt)}
                  />
                )}
                {settlement?.rejectionReason && (
                  <InfoRow label="Lý do từ chối" value={settlement.rejectionReason} tone="rose" />
                )}
              </div>

              {settlement?.note && (
                <div className="shrink-0">
                  <DetailBlock title="Ghi chú đối soát">
                    <p className="text-xs text-slate-700 leading-relaxed">{settlement.note}</p>
                  </DetailBlock>
                </div>
              )}

              {/* ── Tổng hợp TOÀN BỘ đối tác trong đợt ──
                  Bấm "Chi tiết" ở danh sách đợt ⇒ thấy ngay ai được nhận bao nhiêu.
                  Bấm vào 1 đối tác để lọc bảng khoản doanh thu ở cột phải. */}
              <div className="mt-4 shrink-0">
                <div className="mb-2 flex items-center justify-between gap-2 shrink-0">
                  <h3 className="text-[11px] font-semibold text-slate-500">
                    Tổng hợp {partnerSummary.length} đối tác trong đợt
                  </h3>
                  {partnerFilter != null ? (
                    <button
                      type="button"
                      onClick={() => setPartnerFilter(null)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-[10.5px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Xem tất cả
                    </button>
                  ) : null}
                </div>
                <div className="rounded-xl border border-slate-100 bg-white">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10.5px] font-semibold text-slate-500 border-b border-slate-200">
                        <th className="py-2 px-2">Đối tác</th>
                        <th className="py-2 px-2 text-right">Số đơn</th>
                        <th className="py-2 px-2 text-right">Tổng tiền</th>
                        <th className="py-2 px-2 text-right">Doanh thu nền tảng</th>
                        <th className="py-2 px-2 text-right">Doanh thu đối tác</th>
                        <th className="py-2 px-2 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {partnerSummary.map((p) => {
                        const active =
                          partnerFilter != null && String(partnerFilter) === String(p.id);
                        return (
                          <tr
                            key={p.id ?? p.name}
                            className={active ? "bg-sky-50/70" : "hover:bg-slate-50/70"}
                          >
                            <td className="py-2 px-2 font-semibold text-slate-800">{p.name}</td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">
                              {p.count}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">
                              {formatVND(p.gross)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">
                              {formatVND(p.commission)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700">
                              {formatVND(p.net)}
                            </td>
                            <td className="py-2 px-2 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  setPartnerFilter(active ? null : (p.id ?? p.name))
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 hover:bg-slate-50"
                              >
                                <Eye size={10} />
                                {active ? "Đang xem" : "Chi tiết"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-10">
                      <tr className="border-t border-slate-200 bg-slate-50 text-[10.5px] font-bold text-slate-700">
                        <td className="py-2 px-2">TỔNG CỘNG</td>
                        <td className="py-2 px-2 text-right font-mono">{details.length}</td>
                        <td className="py-2 px-2 text-right font-mono">
                          {formatVND(settlement?.grossAmount)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {formatVND(settlement?.commissionAmount)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-emerald-700">
                          {formatVND(settlement?.settlementAmount)}
                        </td>
                        <td className="py-2 px-2" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* ══ CỘT PHẢI: Các khoản doanh thu trong đợt ══ */}
            <div className="flex min-h-0 flex-col">
              <div className="mb-2 flex items-center justify-between gap-2 shrink-0">
                <h3 className="text-[11px] font-semibold text-slate-500">
                  {partnerFilter != null
                    ? `Khoản doanh thu của đối tác đang chọn (${visibleDetails.length})`
                    : `Các khoản doanh thu trong đợt (${details.length})`}
                </h3>
              </div>
              <div
                className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-100 bg-white [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
              >
                {visibleDetails.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-500">
                    Đợt này không có khoản doanh thu nào.
                  </p>
                ) : (
                  // Container cha đã `overflow-auto` ⇒ đây chính là scroll
                  // container, sticky header bám đúng vào nó.
                  // `min-w-[1000px]` ⇒ khi khung hẹp, bảng cuộn NGANG thay vì bị
                  // bóp dẹp làm các cột "Mã GD / Mã đơn" dồn chữ, và đủ rộng cho
                  // cả cột "Voucher" + "Hoàn tiền" mà không chen chúc.
                  <table className="w-full min-w-[1150px] text-left text-[11px] border-collapse">
                    {/* Sticky header — tiêu đề cột luôn nhìn thấy khi cuộn */}
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-white border-b border-slate-200 text-[10.5px] font-semibold text-slate-500">
                        <th className="py-2 px-2">Mã GD / Mã đơn</th>
                        <th className="py-2 px-2">Đối tác</th>
                        <th className="py-2 px-2">Kỳ</th>
                        <th className="py-2 px-2 text-right">Tổng tiền</th>
                        {/* Voucher & Hoàn tiền là TUỲ CHỌN THEO GIAO DỊCH — không
                            phải giao dịch nào cũng có ⇒ giao dịch không có thì "—". */}
                        <th className="py-2 px-2 text-center">Voucher</th>
                        <th className="py-2 px-2 text-right">Hoàn tiền</th>
                        <th className="py-2 px-2 text-right">Doanh thu nền tảng</th>
                        <th className="py-2 px-2 text-right">Doanh thu đối tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleDetails.map((d) => (
                        <tr key={d.id}>
                          {/* Mã GD ở dòng trên, Mã đơn ở dòng dưới — giống tab
                              "Tài chính & Thanh toán". Hiển thị ĐẦY ĐỦ (không
                              cắt bằng "…") vì mã giao dịch cần đối chiếu thủ công.
                              `w-[220px]` + `whitespace-nowrap` ⇒ mã không bị dồn
                              xuống nhiều dòng khi modal hẹp. */}
                          <td className="py-2 px-2 align-middle w-[220px]">
                            <span className="block font-mono text-[11px] font-semibold text-slate-900 whitespace-nowrap">
                              {d?.txnRef ?? "—"}
                            </span>
                            <span className="block font-mono text-[10.5px] text-slate-500 whitespace-nowrap mt-0.5">
                              {d?.bookingCode ?? `#${d?.bookingId}`}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-slate-600">{d?.providerName ?? "—"}</td>
                          <td className="py-2 px-2 text-slate-600">
                            {formatPeriod(d?.revenuePeriod)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-600">
                            {formatVND(d?.grossAmount)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {Number(d?.voucherDiscount ?? 0) > 0 ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="font-mono text-rose-600 font-semibold">
                                  -{formatVND(d?.voucherDiscount)}
                                </span>
                                <span
                                  className={`text-[9.5px] px-1 rounded font-medium ${
                                    d?.voucherScope === "PLATFORM"
                                      ? "bg-purple-100 text-purple-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {d?.voucherScope === "PLATFORM" ? "Nền tảng" : "Đối tác"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          {/* Hoàn tiền — chỉ hiện khi giao dịch BỊ hoàn tiền.
                              Giao dịch không hoàn tiền ⇒ "—". */}
                          <td className="py-2 px-2 text-right font-mono">
                            {Number(d?.refundAmount ?? 0) > 0 ? (
                              <span className="font-semibold text-rose-600">
                                -{formatVND(d?.refundAmount)}
                              </span>
                            ) : (
                              <span className="font-sans text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-600">
                            {formatVND(d?.commissionAmount)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-semibold text-emerald-700">
                            {formatVND(d?.providerNetAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* TỔNG CỘNG — để Admin tự đối chiếu với các ô ở cột trái
                        (Tổng thanh toán / Hoàn tiền / Doanh thu nền tảng / Doanh thu đối tác).
                        Voucher cũng được cộng để thấy rõ tổng giảm giá của đợt. */}
                    <tfoot className="sticky bottom-0 z-10">
                      <tr className="border-t border-slate-200 bg-slate-50 text-[10.5px] font-bold text-slate-700">
                        <td className="py-2 px-2">TỔNG CỘNG ({visibleDetails.length})</td>
                        <td className="py-2 px-2" />
                        <td className="py-2 px-2" />
                        <td className="py-2 px-2 text-right font-mono">
                          {formatVND(detailTotals.gross)}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-rose-600">
                          {detailTotals.voucher > 0 ? `-${formatVND(detailTotals.voucher)}` : "—"}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-rose-600">
                          {detailTotals.refund > 0 ? `-${formatVND(detailTotals.refund)}` : "—"}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {formatVND(detailTotals.commission)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-emerald-700">
                          {formatVND(detailTotals.net)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   THÀNH PHẦN DÙNG CHUNG
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Ô số liệu gọn — dải số liệu trên cùng.
 *
 * Cấu trúc theo yêu cầu: TÊN → SỐ → CHÚ THÍCH, xếp THẲNG ĐỨNG.
 * Chú thích hiển thị LUÔN (không chỉ tooltip) để Admin hiểu ngay ý nghĩa số liệu.
 */
function MiniStat({ label, value, tone = "slate", hint }) {
  const tones = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
  };
  return (
    <div className="min-w-0 bg-white rounded-xl px-3.5 py-2.5 border border-slate-200/85 shadow-2xs">
      <p className="text-[11px] font-medium text-slate-500 truncate" title={label}>
        {label}
      </p>
      <div className={`mt-0.5 text-base sm:text-lg font-semibold font-mono truncate ${tones[tone]}`}>
        {value}
      </div>
      {hint ? (
        <p className="mt-0.5 text-[10.5px] text-slate-400 leading-snug line-clamp-2" title={hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-[11px] leading-snug text-slate-400">{hint}</p> : null}
    </div>
  );
}

/**
 * Ô tổng số tiền.
 *
 * ── `rows` ──
 * Khi cần hiển thị NHIỀU dòng số tiền trong cùng một ô (ví dụ "Áp dụng voucher"
 * tách theo bên chịu: của nền tảng / của đối tác) thì truyền `rows`.
 * Mỗi dòng có nhãn riêng nằm ngay dưới nhãn ô.
 */
function Total({ label, value, tone = "slate", rows }) {
  const tones = {
    slate: "text-slate-900",
    emerald: "text-emerald-700",
  };
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      {/* Nhãn ô — đậm hơn (slate-600) để dễ đọc. */}
      <p className="text-[11px] font-semibold text-slate-600">{label}</p>
      {rows ? (
        <div className="mt-1 space-y-0.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-2">
              <span className="text-[10.5px] font-medium text-slate-600">{r.label}</span>
              <span className="font-mono text-[13px] font-bold text-slate-900">
                {formatVND(r.value)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className={`mt-1 font-mono text-[15px] font-bold leading-tight ${tones[tone]}`}>
          {formatVND(value)}
        </p>
      )}
    </div>
  );
}

/**
 * Bộ lọc theo đối tác — DROPDOWN có ô tìm kiếm.
 *
 * ── Vì sao không dùng dãy nút? ──
 * Sàn có thể có tới hàng trăm đối tác. Một dãy nút "Tất cả / A / B / C / ..."
 * sẽ tràn ngang, phá vỡ layout và không tìm được đối tác cần xem.
 * ⇒ Dùng 1 nút dropdown, mở ra có ô tìm kiếm lọc theo tên + danh sách cuộn.
 *
 * ── Giới hạn chiều cao ──
 * Danh sách chỉ hiển thị tối đa 5 dòng (cao ~ 5 * 30px) ⇒ dropdown không bao giờ
 * dài xuống kín màn hình. Khi có nhiều đối tác, đưa chuột vào là cuộn được
 * (overflow-y: auto trên chính vùng danh sách).
 *
 * Bộ lọc CHỈ ảnh hưởng hiển thị — đợt tất toán luôn gom TOÀN BỘ đối tác.
 */
const PARTNER_OPTION_H = 30; // chiều cao 1 dòng (py-1.5 + text-[11px])
const PARTNER_MAX_VISIBLE = 5; // số dòng hiển thị tối đa

function PartnerFilterSelect({ partners, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const wrapRef = useRef(null);

  // Đóng dropdown khi click ra ngoài.
  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Mở dropdown ⇒ xóa từ khoá cũ (đặt trong handler, không dùng effect để
  // tránh setState đồng bộ trong effect → cascading render).
  const toggle = () => {
    if (!open) setKeyword("");
    setOpen(!open);
  };

  const selected = partners.find((p) => String(p.id) === String(value));
  const label = selected ? selected.name : `Tất cả (${partners.length})`;

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return partners;
    return partners.filter((p) => String(p.name ?? "").toLowerCase().includes(kw));
  }, [partners, keyword]);

  const pick = (id) => {
    onChange(id == null ? "" : String(id));
    setOpen(false);
  };

  return (
    <div className="relative mb-5 shrink-0" ref={wrapRef}>
      <span className="mb-1.5 block text-[11px] font-semibold text-slate-500">
        Lọc theo đối tác:
      </span>
      <button
        type="button"
        onClick={toggle}
        className="inline-flex h-9 min-w-[240px] max-w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
      >
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-[320px] max-w-[90vw] rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5">
              <Search size={12} className="shrink-0 text-slate-400" />
              <input
                autoFocus
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm tên đối tác..."
                className="h-8 w-full bg-transparent text-[11px] text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Vùng danh sách — CHỈ cao tối đa 5 dòng, cuộn khi có nhiều đối tác. */}
          <div
            className="overflow-y-auto py-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
            style={{ maxHeight: PARTNER_MAX_VISIBLE * PARTNER_OPTION_H }}
          >
            <button
              type="button"
              onClick={() => pick(null)}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              <span>Tất cả</span>
              <span className="text-slate-400">{partners.length}</span>
            </button>

            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-slate-400">
                Không tìm thấy đối tác nào.
              </p>
            ) : (
              filtered.map((p) => {
                const active = String(p.id) === String(value);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pick(p.id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <span className="truncate">{p.name}</span>
                    {/* Đánh dấu đang chọn bằng dấu ✓ — KHÔNG bôi đen nền. */}
                    {active ? (
                      <span className="shrink-0 font-bold text-emerald-600">✓</span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Pill trạng thái — dùng chung cho settlement, booking và payment.
 *
 * Nhãn được tra theo thứ tự ưu tiên: `label` truyền vào → bảng nhãn của settlement
 * → bảng nhãn của booking → bảng nhãn của payment → chính mã trạng thái.
 * Màu được quyết định theo MÃ trạng thái nên nhất quán giữa các loại.
 */
function StatusPill({ status, label }) {
  const resolvedLabel =
    label ??
    SETTLEMENT_STATUS_LABELS[status] ??
    BOOKING_STATUS_LABELS[status] ??
    PAYMENT_STATUS_LABELS[status] ??
    status;

  const cls =
    status === "APPROVED" ||
    status === "SUCCESS" ||
    status === "CONFIRMED" ||
    status === "COMPLETED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "REJECTED" ||
          status === "CANCELLED" ||
          status === "FAILED" ||
          status === "EXPIRED"
        ? "bg-rose-50 text-rose-700"
        : // Giao dịch bị THAY THẾ — KHÔNG phải lỗi ⇒ màu trung tính.
          status === "SUPERSEDED"
          ? "bg-slate-100 text-slate-600"
          : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold ${cls}`}
    >
      {resolvedLabel}
    </span>
  );
}

function Pagination({ page, totalPages, totalElements, unit, onChange }) {
  // Luôn hiện thanh phân trang (kể cả khi chỉ có 1 trang) để thấy
  // "Đang xem trang X / Y" — giống trang Quản lý người dùng.
  if (!totalElements) return null;
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
 * Khung modal dùng chung.
 *
 * ── Scroll (vấn đề: modal bị trượt cả trang ra ngoài) ──
 * Ba điều kiện phải có đồng thời để modal CUỘN RIÊNG, không kéo trang ngoài:
 *
 *  1. Modal được render vào `document.body` qua Portal.
 *     Nếu render tại chỗ trong cây component, nó kế thừa mọi `overflow` /
 *     `transform` / `contain` của khung cha (panel, bảng, header) ⇒ cuộn modal
 *     có thể kéo cả trang.
 *
 *  2. Lớp phủ `fixed inset-0` + `overflow-hidden` (KHÔNG `overflow-y-auto`).
 *     Nếu lớp phủ tự cuộn được thì con lăn khi đưa vào mép modal sẽ cuộn
 *     LỚP PHỦ ⇒ biểu hiện ra như "cuộn cả trang". Thanh cuộn nhỏ phải nằm ở
 *     phần THÂN modal.
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
function ModalShell({ title, onClose, children, footer, wide = false, xwide = false, fill = false }) {
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
          xwide
            ? "max-w-[1900px]"
            : wide
              ? "max-w-3xl"
              : "max-w-lg"
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
        <div
          className={`mt-4 min-h-0 flex-1 ${
            fill
              ? "flex flex-col overflow-hidden"
              : "overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
          }`}
        >
          {children}
        </div>
        {/* Chân modal — luôn ghim ở ĐÁY modal, không cuộn theo nội dung.
            Dùng cho kết luận "Đủ điều kiện tất toán" (Admin mở modal là thấy
            ngay kết luận, không phải cuộn xuống cuối mới thấy). */}
        {footer ? (
          <div className="mt-4 shrink-0">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Ô chọn KỲ doanh thu — LỊCH TIẾNG VIỆT (thay cho `<input type="month">`).
 *
 * ── Vì sao không dùng `<input type="month">` ──
 * Trình duyệt dùng bảng chọn tháng theo NGÔN NGỮ của hệ điều hành (Chrome/Edge
 * trên Windows mở picker tiếng Anh: "month", "year", "January"…). Admin dùng
 * tiếng Việt ⇒ giao diện không nhất quán. Component này dựng lại lịch hoàn toàn
 * bằng tiếng Việt: "Tháng 1/2026", các nút "‹" / "›" đổi năm, lưới 12 tháng.
 *
 * ── Ràng buộc nghiệp vụ ──
 * Kỳ tất toán chỉ được tạo cho tháng ĐÃ KẾT THÚC ⇒ các tháng trong năm hiện tại
 * sau tháng hiện tại bị VÔ HIỆU (disabled, mờ đi).
 */
function MonthPicker({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Kỳ đang chọn: "YYYY-MM". Nếu value rỗng ⇒ mặc định tháng trước.
  const [fallback] = useState(() => previousMonth());
  const current = value || fallback;
  const match = /^(\d{4})-(\d{2})$/.exec(String(current).slice(0, 7));
  const [viewYear, setViewYear] = useState(() => (match ? Number(match[1]) : new Date().getFullYear()));

  // Đóng dropdown khi click ra ngoài / bấm Esc.
  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Tháng hiện tại (múi giờ VN) — để chặn kỳ chưa kết thúc.
  const now = useMemo(() => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: VN_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const [y, m] = parts.split("-");
    return { year: Number(y), month: Number(m) };
  }, []);

  const isFuture = (year, month) =>
    year > now.year || (year === now.year && month > now.month);

  const pick = (year, month) => {
    if (isFuture(year, month)) return;
    onChange(`${year}-${String(month).padStart(2, "0")}`);
    setOpen(false);
  };

  const toggle = () => {
    if (!open) {
      // Mở ⇒ nhảy về năm của kỳ đang chọn.
      const m = /^(\d{4})-(\d{2})$/.exec(String(current).slice(0, 7));
      if (m) setViewYear(Number(m[1]));
    }
    setOpen(!open);
  };

  const label = match ? formatPeriodVN(current) : "Chọn kỳ";

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 transition-colors hover:bg-white focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="truncate">{label}</span>
        <CalendarDays size={14} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Chọn kỳ doanh thu"
          className="absolute left-0 top-full z-40 mt-1 w-[280px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
        >
          {/* Điều hướng năm */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Năm trước"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-bold text-slate-800">Năm {viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              disabled={viewYear >= now.year}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Năm sau"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Lưới 12 tháng */}
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {MONTH_NAMES_VI.map((name, idx) => {
              const month = idx + 1;
              const future = isFuture(viewYear, month);
              const selected =
                match && Number(match[1]) === viewYear && Number(match[2]) === month;
              return (
                <button
                  key={name}
                  type="button"
                  disabled={future}
                  onClick={() => pick(viewYear, month)}
                  className={`rounded-lg px-1 py-2 text-[11px] font-semibold transition-colors ${
                    selected
                      ? "bg-sky-600 text-white"
                      : future
                        ? "cursor-not-allowed text-slate-300"
                        : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>

          <p className="mt-2.5 border-t border-slate-100 pt-2 text-[10.5px] leading-snug text-slate-400">
            Chỉ chọn được tháng đã kết thúc.
          </p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono = false, pill = false, status, tone }) {
  const valueCls = tone === "emerald" ? "text-emerald-700" : tone === "rose" ? "text-rose-700" : "";
  return (
    <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
      <div className="mt-1 text-xs font-semibold text-slate-800">
        {pill ? (
          <StatusPill status={status} />
        ) : value === null || value === undefined || value === "" ? (
          <span className="text-slate-400">—</span>
        ) : (
          <span className={`${mono ? "font-mono" : ""} ${valueCls}`}>{value}</span>
        )}
      </div>
    </div>
  );
}

function DetailBlock({ title, children, flush = false, action = null }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold text-slate-500">{title}</h3>
        {action}
      </div>
      <div
        className={
          flush
            ? "rounded-xl border border-slate-100 bg-white overflow-hidden"
            : "rounded-xl border border-slate-100 bg-white px-4 py-3"
        }
      >
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ text }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
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
