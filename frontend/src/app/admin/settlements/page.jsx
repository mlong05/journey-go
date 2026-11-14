"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileCheck,
  Loader2,
  Plus,
  RefreshCw,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  approveSettlement,
  createSettlement,
  getAllSettlements,
  getPlatformRevenueSummary,
  getSettlementById,
  getSettlementCandidates,
  getSettlementDetails,
  rejectSettlement,
} from "@/features/settlement/services/settlementService";
import {
  evaluateEligibility,
  getRevenueById,
} from "@/features/settlement/services/providerRevenueService";
import { getBookingById } from "@/features/booking/services/bookingService";
import { getPaymentsByBooking } from "@/features/payment/services/paymentService";
import { getActiveProviderProfiles } from "@/features/providerprofile/services/providerProfileService";
import {
  BOOKING_STATUS_LABELS,
  DEFERRED_REASON_LABELS,
  formatDateTimeVN,
  formatLocalDate,
  formatPeriod,
  formatVND,
  normalizePage,
  PROVIDER_REVENUE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  previousMonth,
  SETTLEMENT_STATUS_LABELS,
  settlementCheckLabel,
} from "@/lib/money";

/** Số đợt tất toán mỗi trang. */
const PAGE_SIZE = 10;

const TABS = [
  { id: "overview", label: "Tổng quan & Duyệt đợt" },
  { id: "candidates", label: "Ứng viên tất toán" },
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
 *  TAB 2 — "Ứng viên tất toán"
 *    Xem & TẠO đợt mới cho một đối tác + kỳ cụ thể. Đây là quy trình
 *    "chuẩn bị" (draft) — tách khỏi tab 1 để không trộn hai loại thao tác.
 *
 * ── Luồng nghiệp vụ ──
 *  1. Tab 2: chọn đối tác + kỳ đã đóng → xem ứng viên (đủ điều kiện / bị giữ lại).
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
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
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
  // Tổng hợp doanh thu nền tảng — dùng cho dải số liệu và bảng theo kỳ.
  const revenue = usePlatformRevenue();

  const loadSettlements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllSettlements({
        status: statusFilter || undefined,
        page,
        size: pageSize,
      });
      const normalized = normalizePage(data, pageSize);
      setSettlements(normalized.content);
      setTotalPages(normalized.totalPages);
      setTotalElements(normalized.totalElements);
    } catch (err) {
      setError(err?.message || "Không thể tải danh sách đợt tất toán.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

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

  const handleApprove = async (settlement) => {
    if (
      !window.confirm(
        `Duyệt đợt tất toán ${settlement?.settlementCode}?\nSố tiền ${formatVND(
          settlement?.settlementAmount,
        )} sẽ được ghi vào ví đối tác.`,
      )
    ) {
      return;
    }
    setBusyId(settlement.id);
    setError("");
    try {
      await approveSettlement(settlement.id);
      // Duyệt xong ⇒ doanh thu nền tảng thay đổi, tải lại cả hai khối.
      await Promise.all([loadSettlements(), revenue.load()]);
    } catch (err) {
      setError(err?.message || "Không thể duyệt đợt tất toán.");
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
      await loadSettlements();
    } catch (err) {
      const msg = err?.message || "Không thể từ chối đợt tất toán.";
      // Hiển thị lỗi NGAY TRONG modal (không chỉ ở đầu tab) để người dùng thấy.
      setRejectError(msg);
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  // Thống kê nhanh trên trang hiện tại.
  const stats = useMemo(() => {
    const pending = settlements.filter((s) => s?.status === "DRAFT");
    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, s) => sum + Number(s?.settlementAmount ?? 0), 0),
      approvedAmount: settlements
        .filter((s) => s?.status === "APPROVED")
        .reduce((sum, s) => sum + Number(s?.settlementAmount ?? 0), 0),
    };
  }, [settlements]);

  return (
    // Màn lớn (lg+): vừa khít khung, KHÔNG cuộn trang — chỉ 2 bảng tự cuộn bên trong.
    // Màn nhỏ: các khối xếp dọc, cho phép cuộn cả tab.
    <div className="h-full min-h-0 flex flex-col gap-3 overflow-y-auto lg:overflow-hidden [scrollbar-width:thin]">
      {error && <ErrorBox text={error} />}

      {/* ── Dải số liệu ──────────────────────────────────────────────────────
          4 ô đầu: doanh thu nền tảng (chỉ tính các đợt đã DUYỆT — lúc tiền thực sự
          về ví đối tác; = tổng thanh toán − hoàn tiền − chi trả đối tác).
          3 ô sau: tình trạng các đợt trên trang danh sách đang xem. */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2.5">
        <MiniStat
          label="Doanh thu nền tảng"
          value={revenue.loading && !revenue.summary ? "…" : formatVND(revenue.summary?.totalPlatformRevenue)}
          tone="emerald"
          hint="Hoa hồng giữ lại sau khi tất toán (các đợt đã duyệt)"
        />
        <MiniStat
          label="Khách đã thanh toán"
          value={revenue.loading && !revenue.summary ? "…" : formatVND(revenue.summary?.totalGrossAmount)}
          hint="Sau khi trừ hoàn tiền"
        />
        <MiniStat
          label="Chi trả đối tác"
          value={revenue.loading && !revenue.summary ? "…" : formatVND(revenue.summary?.totalProviderNetAmount)}
          hint="Tổng tiền đã ghi vào ví đối tác"
        />
        <MiniStat
          label="Số đợt đã duyệt"
          value={String(revenue.summary?.approvedSettlementCount ?? 0)}
          hint={`${revenue.periods.length} kỳ có doanh thu`}
        />
        <MiniStat
          label="Đợt chờ duyệt"
          value={String(stats.pendingCount)}
          tone={stats.pendingCount > 0 ? "amber" : "slate"}
          hint="Trên trang danh sách đang xem"
        />
        <MiniStat
          label="Tiền chờ chi trả"
          value={formatVND(stats.pendingAmount)}
          tone="amber"
          hint="Tổng tiền các đợt chờ duyệt trên trang đang xem"
        />
        <MiniStat
          label="Đã chi trả (trang này)"
          value={formatVND(stats.approvedAmount)}
          tone="emerald"
          hint="Tổng tiền các đợt đã duyệt trên trang đang xem"
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
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                {/* Sticky header — tiêu đề cột luôn nhìn thấy khi cuộn danh sách */}
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-4">Mã đợt</th>
                    <th className="py-2.5 px-3">Đối tác</th>
                    <th className="py-2.5 px-3">Kỳ</th>
                    <th className="py-2.5 px-3 text-right">Tổng tiền</th>
                    <th className="py-2.5 px-3 text-right">Hoa hồng</th>
                    <th className="py-2.5 px-3 text-right">Đối tác nhận</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                    {/* Cột thao tác ghim mép phải — nút luôn nhìn thấy khi bảng cuộn ngang */}
                    <th className="sticky right-0 z-10 bg-slate-50 py-2.5 px-4 text-right shadow-[-1px_0_0_0_#e2e8f0]">Thao tác</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-slate-100">
                {settlements.map((s) => (
                  <tr key={s.id} className="group hover:bg-slate-50 align-top">
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                      {s?.settlementCode ?? `#${s?.id}`}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      {s?.providerName ?? `#${s?.providerProfileId}`}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {formatPeriod(s?.revenuePeriod)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatVND(s?.grossAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatVND(s?.commissionAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                      {formatVND(s?.settlementAmount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusPill status={s?.status} />
                      {s?.approvedAt && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatDateTimeVN(s.approvedAt)}
                        </p>
                      )}
                    </td>
                    <td className="sticky right-0 bg-white group-hover:bg-slate-50 py-2.5 px-4 text-right shadow-[-1px_0_0_0_#f1f5f9]">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailId(s.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
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
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
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
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
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
            pageSize={pageSize}
            onSizeChange={(size) => {
              setPageSize(size);
              setPage(0);
            }}
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
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 2 — ỨNG VIÊN TẤT TOÁN (TẠO ĐỢT MỚI)
   ══════════════════════════════════════════════════════════════════════════ */

function SettlementCandidatesTab() {
  const [providerProfiles, setProviderProfiles] = useState([]);
  const [providerProfileId, setProviderProfileId] = useState("");
  const [revenuePeriod, setRevenuePeriod] = useState(previousMonth());
  const [candidates, setCandidates] = useState(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [note, setNote] = useState("");
  // Modal chi tiết khoản doanh thu (dùng chung cho "đủ điều kiện" và "bị giữ lại").
  const [detailTarget, setDetailTarget] = useState(null);
  // Modal chi tiết ĐƠN đặt tour (mở từ nút "Xem chi tiết đơn").
  const [bookingDetailId, setBookingDetailId] = useState(null);

  // ── Đối tác ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    getActiveProviderProfiles()
      .then((data) => {
        if (!active) return;
        setProviderProfiles(Array.isArray(data) ? data : []);
        if (data?.length > 0) setProviderProfileId(String(data[0].id));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // ── Ứng viên tất toán ─────────────────────────────────────────────────────
  const loadCandidates = useCallback(async () => {
    if (!providerProfileId || !revenuePeriod) {
      setCandidates(null);
      return;
    }
    setLoadingCandidates(true);
    setError("");
    try {
      const data = await getSettlementCandidates(Number(providerProfileId), revenuePeriod);
      setCandidates(data);
    } catch (err) {
      setError(err?.message || "Không thể tải ứng viên tất toán.");
      setCandidates(null);
    } finally {
      setLoadingCandidates(false);
    }
  }, [providerProfileId, revenuePeriod]);

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
      await createSettlement({
        providerProfileId: Number(providerProfileId),
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

  const eligible = candidates?.eligible ?? [];
  const held = candidates?.held ?? [];
  const totals = candidates?.totals;
  // Đợt tất toán đang chờ duyệt của cùng đối tác + kỳ (nếu có).
  // Khi đợt này tồn tại, các khoản doanh thu đã bị "gom" vào đợt (IN_SETTLEMENT)
  // nên danh sách ứng viên sẽ RỖNG — không phải lỗi dữ liệu.
  const openSettlement = candidates?.openSettlement ?? null;

  const canCreate = useMemo(
    () => eligible.length > 0 && !openSettlement,
    [eligible.length, openSettlement],
  );

  return (
    <div className="h-full min-h-0 flex flex-col gap-4">
      {error && <ErrorBox text={error} />}

      {/* Bộ lọc */}
      <div className="shrink-0 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          <Field label="Đối tác">
            <select
              value={providerProfileId}
              onChange={(e) => setProviderProfileId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs focus:bg-white focus:outline-none"
            >
              <option value="">-- Chọn đối tác --</option>
              {providerProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p?.providerName ?? p?.email}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Kỳ doanh thu"
            hint="Chỉ tạo được cho tháng đã kết thúc. Mặc định là tháng trước."
          >
            <input
              type="month"
              value={revenuePeriod}
              onChange={(e) => setRevenuePeriod(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs focus:bg-white focus:outline-none"
            />
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
              đẩy lệch xuống dưới một khoảng trống vô nghĩa ⇒ đây chính là lỗi
              "nút bị lệch" mà người dùng thấy. Ở 2 cột, nút nên nằm sát mép trên
              như một khối độc lập. */}
          <div className="sm:col-span-2 lg:col-span-1 lg:pt-[22px]">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate || busyId === "create"}
              title={
                openSettlement
                  ? "Đã có đợt tất toán đang chờ duyệt cho đối tác + kỳ này."
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
            <p className="mt-1 text-[11px] leading-snug text-slate-400">
              {openSettlement
                ? "Đã có đợt đang chờ duyệt cho kỳ này."
                : eligible.length === 0
                  ? "Không có khoản nào đủ điều kiện."
                  : `Gom ${eligible.length} khoản đủ điều kiện.`}
            </p>
          </div>
        </div>
      </div>

        {/* Kết quả đánh giá ứng viên — cuộn RIÊNG bên trong */}
        <div className="flex-1 min-h-0 overflow-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
          {loadingCandidates ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-center gap-2 py-12 text-xs text-slate-400">
            <Loader2 size={16} className="animate-spin" /> Đang đánh giá ứng viên tất toán...
          </div>
        ) : candidates ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
          {/* Đợt tất toán đang chờ duyệt — giải thích vì sao ứng viên có thể rỗng. */}
          {openSettlement && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
              <FileCheck size={16} className="mt-0.5 shrink-0 text-sky-600" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-sky-900">
                  Đợt tất toán{" "}
                  <span className="font-mono">{openSettlement.settlementCode}</span> đang chờ
                  duyệt
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-sky-700">
                  {openSettlement.detailCount ?? 0} khoản doanh thu đã được gom vào đợt này
                  (tổng{" "}
                  <span className="font-mono font-bold">
                    {formatVND(openSettlement.settlementAmount)}
                  </span>
                  ). Các khoản đó không còn nằm trong danh sách ứng viên — hãy duyệt hoặc từ
                  chối đợt này ở tab <span className="font-bold">Tổng quan & Duyệt đợt</span>{" "}
                  trước, rồi tạo đợt mới cho kỳ sau.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <h3 className="text-xs font-semibold text-slate-600">
                Đủ điều kiện ({eligible.length})
              </h3>
              {eligible.length === 0 ? (
                <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  {openSettlement
                    ? "Không có ứng viên mới — tất cả khoản doanh thu của kỳ này đã nằm trong đợt tất toán đang chờ duyệt."
                    : "Không có khoản doanh thu nào đủ điều kiện tất toán trong kỳ này."}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {eligible.map((r) => (
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

            <div>
              <h3 className="text-xs font-semibold text-slate-600">
                Bị giữ lại ({held.length})
              </h3>
              {held.length === 0 ? (
                <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  Không có khoản nào bị giữ lại.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {held.map((h) => (
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

          {totals && (
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-5 gap-3 border-t border-slate-100 pt-5">
              <Total label="Tổng thanh toán" value={totals.grossAmount} />
              <Total label="Hoàn tiền" value={totals.refundAmount} />
              <Total label="Hoa hồng" value={totals.commissionAmount} />
              <Total label="Điều chỉnh" value={totals.adjustmentAmount} />
              <Total label="Đối tác nhận" value={totals.settlementAmount} tone="emerald" />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs py-12 text-center text-slate-400">
          <Wallet size={28} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-semibold text-slate-600">
            Chọn đối tác và kỳ doanh thu để xem ứng viên tất toán
          </p>
        </div>
        )}
      </div>

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
      const data = await getPlatformRevenueSummary(12);
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
 * Bảng doanh thu nền tảng theo kỳ — bản gọn cho cột trái (~1/3 chiều rộng).
 *
 * Mỗi dòng: Kỳ (kèm dòng phụ Hoàn tiền / Chi trả đối tác) | Khách thanh toán |
 * Hoa hồng | Doanh thu nền tảng (kèm thanh quy mô so với kỳ cao nhất).
 * Vùng bảng tự cuộn bên trong — khung ngoài không cuộn.
 */
function PeriodRevenuePanel({ revenue, className = "" }) {
  const { summary, periods, loading, error, load } = revenue;
  const maxPlatform = periods.reduce(
    (max, p) => Math.max(max, Number(p?.platformRevenue ?? 0)),
    0,
  );

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
        <button
          type="button"
          onClick={load}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
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
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 text-[10.5px] font-semibold text-slate-500 border-b border-slate-200">
                <th className="py-2 px-3">Kỳ</th>
                <th className="py-2 px-3 text-right">Khách TT</th>
                <th className="py-2 px-3 text-right">Hoa hồng</th>
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
                        Hoàn {formatVND(p?.refundAmount)} · Chi trả{" "}
                        {formatVND(p?.providerNetAmount)}
                      </p>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                      {formatVND(p?.grossAmount)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                      {formatVND(p?.commissionAmount)}
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
        )}
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
          {settlement?.providerName ?? `#${settlement?.providerProfileId}`}
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
        <textarea
          id="reject-reason"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          maxLength={2000}
          rows={4}
          autoFocus
          placeholder="VD: Số tiền chưa khớp với báo cáo đối soát — cần kiểm tra lại đơn đặt tour số 9."
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          {reason.trim().length}/2000 ký tự — lý do sẽ được lưu vào lịch sử đợt tất toán.
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
            <InfoRow label="Hoa hồng" value={formatVND(r?.commissionAmount)} mono />
            <InfoRow label="Điều chỉnh" value={formatVND(r?.adjustmentAmount)} mono />
            <InfoRow
              label="Đối tác nhận"
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

          {/* Kết luận đủ điều kiện — đặt DƯỚI bảng điều kiện tất toán */}
          {eligibility && (
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

  return (
    <ModalShell title="Chi tiết đợt tất toán" onClose={onClose} wide>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox text={error} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
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
            <InfoRow label="Đối tác" value={settlement?.providerName} />
            <InfoRow
              label="Kỳ doanh thu"
              value={formatPeriod(settlement?.revenuePeriod)}
            />
            <InfoRow label="Tổng thanh toán" value={formatVND(settlement?.grossAmount)} mono />
            <InfoRow label="Hoàn tiền" value={formatVND(settlement?.refundAmount)} mono />
            <InfoRow label="Hoa hồng" value={formatVND(settlement?.commissionAmount)} mono />
            <InfoRow label="Điều chỉnh" value={formatVND(settlement?.adjustmentAmount)} mono />
            <InfoRow
              label="Đối tác nhận"
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
            <DetailBlock title="Ghi chú đối soát">
              <p className="text-xs text-slate-700 leading-relaxed">{settlement.note}</p>
            </DetailBlock>
          )}

          <DetailBlock title={`Các khoản doanh thu trong đợt (${details.length})`}>
            {details.length === 0 ? (
              <p className="text-xs text-slate-500">Đợt này không có khoản doanh thu nào.</p>
            ) : (
              // Không bọc `overflow-x-auto` — nếu không container con sẽ trở thành
              // scroll container riêng và làm sticky header không bám theo modal.
              // Bảng vừa khung modal nên không cần cuộn ngang.
              <table className="w-full text-left text-[11px] border-collapse">
                {/* Sticky header — tiêu đề cột luôn nhìn thấy khi cuộn */}
                <thead className="sticky top-0 z-10">
                  <tr className="bg-white border-b border-slate-200 text-[10.5px] font-semibold text-slate-500">
                    <th className="py-2 px-2">Mã đơn</th>
                    <th className="py-2 px-2">Mã giao dịch</th>
                    <th className="py-2 px-2">Kỳ</th>
                    <th className="py-2 px-2 text-right">Tổng tiền</th>
                    <th className="py-2 px-2 text-right">Hoa hồng</th>
                    <th className="py-2 px-2 text-right">Đối tác nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {details.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2 px-2 font-mono font-semibold text-slate-800">
                        {d?.bookingCode ?? `#${d?.bookingId}`}
                      </td>
                      <td className="py-2 px-2 font-mono text-slate-500">
                        {d?.txnRef ?? "—"}
                      </td>
                      <td className="py-2 px-2 text-slate-600">
                        {formatPeriod(d?.revenuePeriod)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-600">
                        {formatVND(d?.grossAmount)}
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
              </table>
            )}
          </DetailBlock>
        </div>
      )}
    </ModalShell>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   THÀNH PHẦN DÙNG CHUNG
   ══════════════════════════════════════════════════════════════════════════ */

/** Ô số liệu gọn — dùng cho dải số liệu trên cùng (gợi ý hiện khi rê chuột). */
function MiniStat({ label, value, tone = "slate", hint }) {
  const tones = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
  };
  return (
    <div
      title={hint}
      className="min-w-0 bg-white rounded-xl px-3.5 py-2.5 border border-slate-200/85 shadow-2xs"
    >
      <p className="text-[11px] font-medium text-slate-500 truncate">{label}</p>
      <div className={`mt-0.5 text-base sm:text-lg font-semibold font-mono truncate ${tones[tone]}`}>
        {value}
      </div>
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

function Total({ label, value, tone = "slate" }) {
  const tones = {
    slate: "text-slate-900",
    emerald: "text-emerald-700",
  };
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-sm font-semibold ${tones[tone]}`}>
        {formatVND(value)}
      </p>
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
        : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold ${cls}`}
    >
      {resolvedLabel}
    </span>
  );
}

function Pagination({ page, totalPages, totalElements, unit, onChange, pageSize, onSizeChange }) {
  // Luôn hiện thanh phân trang (kể cả khi chỉ có 1 trang) để thấy
  // "Đang xem trang X / Y" và ô "Số dòng/trang" — giống trang Quản lý người dùng.
  if (!totalElements) return null;
  return (
    <PaginationBar
      page={page}
      totalPages={totalPages}
      totalElements={totalElements}
      unit={unit}
      onChange={onChange}
      pageSize={pageSize}
      onSizeChange={onSizeChange}
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

function DetailBlock({ title, children, flush = false }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold text-slate-500">
        {title}
      </h3>
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
