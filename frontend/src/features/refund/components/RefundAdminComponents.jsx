"use client";

/**
 * Thành phần quản trị cho nghiệp vụ HOÀN TIỀN.
 *
 * ── Luật nghiệp vụ ──
 *  • Danh sách nhóm lý do + mã lý do do Admin cấu hình (tab "Cấu hình lý do
 *    hoàn tiền") — KHÔNG hardcode danh sách mã lý do.
 *  • Số tiền do HỆ THỐNG tính theo nhóm lý do — Admin KHÔNG tự nhập.
 *  • Nhóm PERSONAL trong cửa sổ no-show 48h trước ngày trải nghiệm ⇒ 0%.
 *  • Duyệt 0 VND (bất khả kháng / no-show) ⇒ ghi nhận đã xử lý, KHÔNG gọi VNPay.
 */
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AlertTriangle, FileText, ImagePlus, Loader2 } from "lucide-react";
import { DetailBlock, Field, InfoRow, ModalShell } from "@/components/admin/AdminUI";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { apiClient } from "@/services/apiClient";
import {
  listActiveRefundReasonGroups,
  normalizeGroups,
} from "@/features/refund/services/refundReasonConfigService";
import { getRefundById } from "@/features/refund/services/refundService";
import {
  auditActionLabel,
  formatDateTimeVN,
  formatLocalDate,
  formatVND,
  refundAmountForReasonAt,
  refundStatusLabel,
  sanitizeAuditDetail,
  vnpayMessageForUser,
  vnpayResponseCodeForUser,
} from "@/lib/money";
import { LimitedField } from "@/components/ui/LimitedField";

/**
 * Parse 'YYYY-MM-DD' thành mốc 00:00 theo giờ địa phương — tránh lệch múi giờ
 * khi tính số ngày tới ngày trải nghiệm.
 */
function parseLocalDateStart(value) {
  const parts = String(value).slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

/* =========================================================================
   GIỚI HẠN SỐ KÝ TỰ (khớp ràng buộc `@Size(max = …)` ở backend)
   ========================================================================= */

/** Lý do từ chối — backend `ReviewRefundRequest.rejectionReason` cho phép 2000. */
const REJECTION_REASON_MAX = 1000;

/** Ghi chú — backend `ReviewRefundRequest.note` cho phép 2000. */
const NOTE_MAX = 500;

/**
 * Nhóm lý do dự phòng — dùng khi backend chưa tải được cấu hình
 * (môi trường mới, mạng lỗi). Tỷ lệ hoàn theo chính sách mặc định.
 */
export const FALLBACK_GROUPS = [
  {
    code: "PERSONAL",
    name: "Lỗi khách hàng",
    refundRate: 0.5,
    // Nhóm cá nhân có mức hoàn 0% riêng: hủy quá muộn / không xuất hiện.
    noShowWindowHours: 48,
    noShowRefundRate: 0,
    reasonCodes: [],
  },
  {
    code: "PLATFORM_FAULT",
    name: "Lỗi nền tảng",
    refundRate: 1,
    reasonCodes: [],
  },
  {
    code: "PROVIDER_FAULT",
    name: "Lỗi đối tác",
    refundRate: 1,
    reasonCodes: [],
  },
  {
    code: "FORCE_MAJEURE",
    name: "Lỗi bất khả kháng",
    refundRate: 0,
    reasonCodes: [],
  },
];

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
export function dedupeAuditLogs(logs) {
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

  const result = [...groups.values()]
    .sort((a, b) => a.idx - b.idx)
    .map((g) => g.log);

  // "Cập nhật trạng thái hoàn tiền" mà KHÔNG làm thay đổi trạng thái
  // (vẫn là "chờ VNPay xác nhận hoàn tiền") chỉ giữ lại dòng mới nhất.
  // ⚠️ `REFUND_PROCESSING` là trạng thái lịch sử (trước khi tách trạng thái theo
  // phương thức) ⇒ vẫn phải khớp để các dòng nhật ký cũ không bị nhân bản.
  const noChangeStatuses = ["VNPAY_PROCESSING", "REFUND_PROCESSING"];
  const noChangeIdx = result.findIndex(
    (l) =>
      l?.action === "VNPAY_STATUS_UPDATED" &&
      (!l?.fromStatus || l.fromStatus === l?.toStatus) &&
      noChangeStatuses.includes(l?.toStatus),
  );
  if (noChangeIdx >= 0) {
    let lastIdx = -1;
    result.forEach((l, i) => {
      if (
        l?.action === "VNPAY_STATUS_UPDATED" &&
        (!l?.fromStatus || l.fromStatus === l?.toStatus) &&
        noChangeStatuses.includes(l?.toStatus)
      ) {
        lastIdx = i;
      }
    });
    return result.filter(
      (l, i) =>
        !(
          l?.action === "VNPAY_STATUS_UPDATED" &&
          (!l?.fromStatus || l.fromStatus === l?.toStatus) &&
          noChangeStatuses.includes(l?.toStatus) &&
          i !== lastIdx
        ),
    );
  }

  return result;
}

/** Màu chấm mốc theo loại hành động trong nhật ký kiểm toán. */
export function auditDotClass(action) {
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
 * Thân nội dung chi tiết yêu cầu hoàn tiền — TÁI SỬ DỤNG cho cả modal
 * "Chi tiết" và modal "Xử lý" (cột bên trái) để 2 nơi hiển thị CÙNG một bộ
 * thông tin: mã đơn, số tiền, lý do khách khai báo, bằng chứng, thông tin
 * ngân hàng, thông tin liên hệ, nhật ký kiểm toán…
 *
 * @param {object} props
 * @param {object} props.refund    dữ liệu yêu cầu hoàn tiền (đã tải đầy đủ)
 * @param {boolean} [props.compact] bỏ nhật ký kiểm toán (đơn chờ xét duyệt
 *   chưa có nhật ký xử lý ⇒ không cần hiện)
 */
export function RefundDetailBody({ refund, compact = false }) {
  // Nhật ký đã rút gọn — tính 1 lần thay vì gọi lại ở mỗi lần render.
  const auditLogs = useMemo(
    () => dedupeAuditLogs(refund?.auditLogs),
    [refund?.auditLogs],
  );

  if (!refund) return null;

  return (
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
        {/*
          ⚠️ KHÔNG hiển thị "Nhóm lý do khai báo" / "Lý do khai báo" — khách KHÔNG
          chọn nhóm/lý do nữa ⇒ các ô này luôn trống ("—") và chỉ gây nhiễu.
          ⚠️ Cũng KHÔNG hiển thị "Nhóm lý do quản trị viên xác định" / "Lý do quản
          trị viên xác định" ở đây — thông tin này do Admin tự chọn ở cột
          quyết định bên phải (modal "Xử lý"), hiển thị ở đây chỉ là dữ liệu
          thô chưa qua bước duyệt.
          ⚠️ "Số tiền đề xuất / được duyệt / đã hoàn" và "Phương thức hoàn"
          cũng bỏ — số tiền của đơn đã hiện ở trên; các số liệu duyệt/hoàn
          đã hiển thị ở bảng danh sách và ở phần "Kết quả từ VNPay".
        */}
        <InfoRow
          label="Ngày trải nghiệm"
          value={formatLocalDate(refund?.experienceDate)}
          mono
        />
        <InfoRow
          label="Số tiền của đơn"
          value={formatVND(refund?.paymentAmount)}
          mono
        />
        <InfoRow
          label="Thời điểm tạo"
          value={formatDateTimeVN(refund?.createdAt)}
        />
        <InfoRow
          label="Thời điểm xử lý"
          value={formatDateTimeVN(refund?.reviewedAt)}
        />
      </div>

      {/* Lý do */}
      {refund?.reasonSummary && (
        <DetailBlock title="Lý do ngắn gọn (khách khai báo)">
          <p className="text-xs font-semibold text-slate-900 leading-relaxed">
            {refund.reasonSummary}
          </p>
        </DetailBlock>
      )}

      {refund?.reasonDetail && (
        <DetailBlock title="Chi tiết lý do">
          <p className="text-xs text-slate-700 leading-relaxed">
            {refund.reasonDetail}
          </p>
        </DetailBlock>
      )}

      {/* Bằng chứng đính kèm (ảnh / video) */}
      {Array.isArray(refund?.evidenceAttachments) &&
        refund.evidenceAttachments.length > 0 && (
          <DetailBlock
            title={`Bằng chứng đính kèm (${refund.evidenceAttachments.length})`}
          >
            <div className="flex flex-wrap gap-2">
              {refund.evidenceAttachments.map((url, idx) => {
                const isVideo =
                  typeof url === "string" &&
                  /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
                return (
                  <a
                    key={`${url}-${idx}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative block h-24 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                    title="Mở bằng chứng"
                  >
                    {isVideo ? (
                      <>
                        <video
                          src={url}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-slate-900/40 text-[10px] font-bold text-white">
                          VIDEO
                        </span>
                      </>
                    ) : (
                      <Image
                        src={url}
                        alt={`Bằng chứng ${idx + 1}`}
                        width={96}
                        height={96}
                        unoptimized
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    )}
                  </a>
                );
              })}
            </div>
          </DetailBlock>
        )}

      {refund?.evidence && (
        <DetailBlock title="Thông tin bổ sung">
          <p className="text-xs text-slate-700 leading-relaxed">
            {refund.evidence}
          </p>
        </DetailBlock>
      )}

      {refund?.rejectionReason && (
        <DetailBlock title="Lý do từ chối">
          <p className="text-xs text-rose-700 leading-relaxed">
            {refund.rejectionReason}
          </p>
        </DetailBlock>
      )}

      {/* Ghi chú của nền tảng — Admin nhập khi duyệt / từ chối. Khách cũng thấy. */}
      {refund?.adminNote && (
        <DetailBlock title="Ghi chú của nền tảng">
          <p className="text-xs text-slate-700 leading-relaxed">
            {refund.adminNote}
          </p>
        </DetailBlock>
      )}

      {/* Ghi chú khi ghi nhận chuyển khoản thủ công + ảnh bằng chứng. */}
      {(refund?.transferNote || refund?.transferEvidence) && (
        <DetailBlock title="Ghi nhận chuyển khoản thủ công">
          <div className="space-y-2">
            {refund?.transferNote && (
              <p className="text-xs text-slate-700 leading-relaxed">
                {refund.transferNote}
              </p>
            )}
            {refund?.transferEvidence && (
              <p className="text-xs text-slate-600 leading-relaxed break-all">
                {refund.transferEvidence}
              </p>
            )}
          </div>
        </DetailBlock>
      )}

      {/* Thông tin ngân hàng nhận tiền */}
      {(refund?.bankAccountNumber || refund?.transferReference) && (
        <DetailBlock title="Thông tin nhận tiền">
          <div className="grid grid-cols-2 gap-3">
            <InfoRow
              label="Số tài khoản"
              value={refund?.bankAccountNumber}
              mono
            />
            <InfoRow
              label="Chủ tài khoản"
              value={refund?.bankAccountName}
            />
            <InfoRow label="Ngân hàng" value={refund?.bankName} />
            <InfoRow
              label="Mã tham chiếu"
              value={refund?.transferReference}
              mono
            />
          </div>
        </DetailBlock>
      )}

      {/* Thông tin liên hệ do khách cung cấp — Admin dùng để hỗ trợ nhanh */}
      {(refund?.contactPhone || refund?.contactEmail) && (
        <DetailBlock title="Thông tin liên hệ (khách cung cấp)">
          <div className="grid grid-cols-2 gap-3">
            <InfoRow
              label="Số điện thoại"
              value={refund?.contactPhone}
              mono
            />
            <InfoRow label="Email dự phòng" value={refund?.contactEmail} mono />
          </div>
        </DetailBlock>
      )}

      {/* Kết quả VNPay — thông điệp lỗi kỹ thuật (mã 99 / "Unexpected error")
          KHÔNG BAO GIỜ hiển thị cho người dùng. */}
      {(refund?.vnpResponseCode || refund?.vnpTransactionNo) && (
        <DetailBlock title="Kết quả từ VNPay">
          <div className="grid grid-cols-2 gap-3">
            <InfoRow
              label="Mã yêu cầu VNPay"
              value={refund?.vnpRequestId}
              mono
            />
            <InfoRow
              label="Mã giao dịch VNPay"
              value={refund?.vnpTransactionNo}
              mono
            />
            <InfoRow
              label="Mã phản hồi"
              value={vnpayResponseCodeForUser(refund?.vnpResponseCode)}
              mono
            />
            <InfoRow
              label="Trạng thái giao dịch"
              value={refund?.vnpTransactionStatus}
              mono
            />
            <InfoRow
              label="Thông điệp VNPay"
              value={vnpayMessageForUser(
                refund?.vnpResponseCode,
                refund?.vnpMessage,
              )}
            />
            <InfoRow
              label="Thời điểm xác minh"
              value={formatDateTimeVN(refund?.vnpResolvedAt)}
            />
          </div>
        </DetailBlock>
      )}

      {/* Nhật ký kiểm toán — dùng timeline tiếng Việt, ẩn hoàn toàn
          thuật ngữ kỹ thuật (mã hành động, mã trạng thái, payload thô).
          Các dòng trùng lặp do bấm "Kiểm tra" nhiều lần đã được gộp lại. */}
      {!compact && (
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
                        <span className="font-mono text-slate-500">
                          {log.reference}
                        </span>
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
      )}
    </div>
  );
}

/**
 * Modal chi tiết yêu cầu hoàn tiền — gọi GET /refunds/{id} để lấy nhật ký kiểm toán.
 */
export function RefundDetailModal({ refundId, onClose }) {
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

  return (
    <ModalShell title="Chi tiết yêu cầu hoàn tiền" onClose={onClose} wide>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-400">
          <Loader2 size={16} className="animate-spin" /> Đang tải...
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <RefundDetailBody refund={refund} />
      )}
    </ModalShell>
  );
}

/**
 * Modal xử lý yêu cầu hoàn tiền — Admin xác định nhóm lý do + mã lý do cụ thể,
 * duyệt (số tiền do hệ thống tính) hoặc từ chối kèm ghi chú.
 *
 * ── Chế độ "duyệt lại" (`refund.__reReview`) ──
 * Dùng cho yêu cầu đang chờ VNPay mà VNPay đã xác nhận không tạo được giao dịch
 * hoàn (mã 99 / từ chối dứt khoát). Lúc này Admin KHÔNG thấy nút "Chuyển thủ
 * công" cạnh badge trạng thái (để không gây nhầm lẫn trạng thái) — muốn thoát
 * thì mở lại modal này và đổi phương thức sang chuyển khoản thủ công.
 */
export function ReviewRefundModal({ refund, busy, onClose, onSubmit }) {
  const { confirm, confirmDialog } = useConfirm();
  const [approvePref, setApprovePref] = useState(true);
  const [groups, setGroups] = useState([]);
  // Chế độ duyệt lại ⇒ mặc định chuyển khoản thủ công (đó là lý do mở lại modal).
  const [method, setMethod] = useState(
    refund?.__reReview ? "MANUAL_BANK_TRANSFER" : "VNPAY_API",
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [note, setNote] = useState("");

  // ⚠️ Chế độ duyệt lại ⇒ KHÔNG có nút chuyển trạng thái Duyệt/Từ chối ⇒
  // hành động LUÔN là duyệt (nếu không, form sẽ rơi vào nhánh "từ chối" và
  // hiện ô "Lý do từ chối" — sai lệch với ý nghĩa của thao tác duyệt lại).
  //
  // ⇒ Dùng biến dẫn xuất thay vì `useEffect` + `setState` (React lint cấm
  // setState đồng bộ trong effect ⇒ gây cascading render).
  const approve = refund?.__reReview ? true : approvePref;

  // Dữ liệu chi tiết ĐẦY ĐỦ (bằng chứng, thông tin ngân hàng, liên hệ…) —
  // list API không trả đủ ⇒ gọi GET /refunds/{id}. Nếu lỗi thì lùi về dữ liệu
  // trong list (vẫn hiển thị được phần chính).
  const [detail, setDetail] = useState(refund ?? null);
  useEffect(() => {
    if (!refund?.id) return undefined;
    let active = true;
    getRefundById(refund.id)
      .then((data) => {
        if (active && data) setDetail(data);
      })
      .catch(() => {
        // Giữ nguyên dữ liệu từ list.
      });
    return () => {
      active = false;
    };
  }, [refund?.id]);

  // Dùng bản chi tiết nếu có, không thì lùi về bản trong list.
  const detailRefund = detail ?? refund;

  // ⚠️ Khách KHÔNG chọn nhóm lý do nữa ⇒ Admin PHẢI tự phân loại dựa trên mô
  // tả của khách. ⇒ Mặc định `null` (chưa chọn) để Admin không duyệt nhầm.
  const [reason, setReason] = useState(refund?.declaredReason ?? "");
  const [reasonCode, setReasonCode] = useState(
    refund?.declaredReasonCode ?? "",
  );

  // Số tiền gốc của đơn — cơ sở để tính tỷ lệ 50% / 100% / 0%.
  // `paymentAmount` do backend trả về; fallback về `proposedAmount` cho dữ liệu cũ.
  const paymentAmount = Number(
    refund?.paymentAmount ?? refund?.proposedAmount ?? 0,
  );

  // Ngày trải nghiệm + thời điểm khách gửi yêu cầu — dùng để áp cửa sổ no-show 48h
  // cho nhóm PERSONAL (hủy quá muộn → hoàn 0%).
  const experienceDate = refund?.experienceDate ?? null;
  const requestedAt = refund?.createdAt ?? null;

  // Số ngày từ lúc khách gửi yêu cầu tới ngày trải nghiệm.
  // Dùng để Admin đối chiếu chính sách "hủy trước 3 ngày ⇒ hoàn 50%".
  const daysBeforeStart = useMemo(() => {
    if (!experienceDate || !requestedAt) return null;
    const start = parseLocalDateStart(experienceDate);
    if (!start) return null;
    const sent = new Date(requestedAt);
    if (Number.isNaN(sent.getTime())) return null;
    // Tính theo đầu ngày của ngày gửi để không lệch vì giờ phút.
    const sentDay = new Date(
      sent.getFullYear(),
      sent.getMonth(),
      sent.getDate(),
    ).getTime();
    return Math.round((start - sentDay) / (24 * 3600 * 1000));
  }, [experienceDate, requestedAt]);

  // Nhóm lý do do Admin cấu hình — nguồn tỷ lệ hoàn.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listActiveRefundReasonGroups();
        if (!cancelled) setGroups(normalizeGroups(data));
      } catch {
        // Không tải được cấu hình → dùng tỷ lệ mặc định bên dưới.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentGroup = useMemo(
    () => groups.find((g) => g.code === reason),
    [groups, reason],
  );
  const groupRate = Number(currentGroup?.refundRate ?? 0.5);
  const groupCodes = useMemo(
    () => (currentGroup?.reasonCodes ?? []).filter((c) => c.active),
    [currentGroup],
  );

  const rateOverrides = useMemo(() => {
    const map = {};
    groups.forEach((g) => {
      map[g.code] = Number(g.refundRate ?? 0);
    });
    return map;
  }, [groups]);

  // Số tiền do hệ thống tính — Admin KHÔNG tự nhập.
  const amount = refundAmountForReasonAt(
    paymentAmount,
    reason,
    rateOverrides,
    experienceDate,
    requestedAt,
  );

  // Nhóm PERSONAL bị áp cửa sổ no-show ⇒ tỷ lệ thực tế là 0% dù cấu hình là 50%.
  const noShowApplies = reason === "PERSONAL" && amount === 0 && groupRate > 0;
  const effectiveRate =
    paymentAmount > 0 ? amount / paymentAmount : groupRate;

  /**
   * Đổi nhóm lý do ⇒ chọn lại mã lý do đầu tiên của nhóm và tính lại số tiền.
   */
  const handleReasonChange = (value) => {
    setReason(value);
    const nextGroup = groups.find((g) => g.code === value);
    const firstActive = (nextGroup?.reasonCodes ?? []).find((c) => c.active);
    setReasonCode(firstActive?.code ?? "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!approve) {
      if (!rejectionReason.trim()) {
        alert("Vui lòng nhập lý do từ chối.");
        return;
      }
      // ⚠️ Bước xác nhận — từ chối là hành động không thể hoàn tác.
      const ok = await confirm({
        tone: "danger",
        icon: "reject",
        title: "Từ chối yêu cầu hoàn tiền?",
        subject: refund?.refundCode ?? `#${refund?.id}`,
        description: (
          <div className="space-y-2 text-left">
            <p>Bạn có chắc chắn muốn <strong>TỪ CHỐI</strong> yêu cầu hoàn tiền này không?</p>
            <p className="text-xs text-slate-500">
              Khách sẽ không được hoàn tiền và nhận được thông báo từ chối kèm lý do
              bạn đã nhập.
            </p>
          </div>
        ),
        confirmLabel: "Từ chối yêu cầu",
        cancelLabel: "Quay lại",
      });
      if (!ok) return;

      onSubmit({
        approve: false,
        rejectionReason: rejectionReason.trim(),
        note: note || null,
      });
      return;
    }
    // ⚠️ Khách KHÔNG chọn nhóm lý do ⇒ Admin PHẢI phân loại trước khi duyệt.
    // Số tiền do hệ thống tính theo nhóm này ⇒ không có nhóm thì không có tỷ lệ.
    if (!reason) {
      alert(
        "Vui lòng chọn nhóm lý do hoàn tiền để hệ thống tính số tiền được duyệt.",
      );
      return;
    }

    // ⚠️ Bước xác nhận — duyệt hoàn tiền là hành động không thể hoàn tác.
    // Nêu rõ số tiền + phương thức để Admin không bấm nhầm.
    const ok = await confirm({
      tone: approve ? "success" : "danger",
      icon: approve ? "check" : "reject",
      title: approve
        ? refund?.__reReview
          ? "Duyệt lại và chuyển khoản thủ công?"
          : "Duyệt yêu cầu hoàn tiền?"
        : "Từ chối yêu cầu hoàn tiền?",
      subject: refund?.refundCode ?? `#${refund?.id}`,
      description: (
        <div className="space-y-2 text-left">
          <p>
            Bạn có chắc chắn muốn{" "}
            <strong>{approve ? "DUYỆT" : "TỪ CHỐI"}</strong> yêu cầu hoàn tiền này
            không?
          </p>
          {approve && (
            <ul className="space-y-1 text-xs text-slate-600">
              <li>
                Số tiền được duyệt:{" "}
                <strong className="text-slate-900">{formatVND(amount)}</strong>
                {amount > 0 && effectiveRate > 0 && effectiveRate < 1 && (
                  <span className="text-slate-400">
                    {" "}
                    ({Math.round(effectiveRate * 100)}% số tiền thanh toán)
                  </span>
                )}
              </li>
              <li>
                Phương thức hoàn:{" "}
                <strong className="text-slate-900">
                  {method === "VNPAY_API"
                    ? "VNPay (hoàn tự động)"
                    : "Chuyển khoản ngân hàng thủ công"}
                </strong>
              </li>
              <li>
                Nhóm lý do:{" "}
                <strong className="text-slate-900">
                  {currentGroup?.name ?? reason}
                </strong>
              </li>
            </ul>
          )}
          {approve && method === "VNPAY_API" && (
            <p className="text-xs text-amber-600">
              Thao tác này gửi yêu cầu hoàn tiền tới VNPay ngay và không thể hoàn tác.
            </p>
          )}
          {approve && refund?.__reReview && (
            <p className="text-xs text-amber-600">
              Yêu cầu này đã gửi tới VNPay nhưng cổng thanh toán không tạo được giao
              dịch hoàn. Duyệt lại với phương thức chuyển khoản thủ công — bạn sẽ
              tự chuyển tiền rồi ghi nhận mã tham chiếu và bằng chứng.
            </p>
          )}
        </div>
      ),
      confirmLabel:
        refund?.__reReview
          ? "Duyệt & chuyển khoản thủ công"
          : approve
            ? "Duyệt & hoàn tiền"
            : "Từ chối yêu cầu",
      cancelLabel: "Quay lại",
    });
    if (!ok) return;

    onSubmit({
      approve: true,
      reason,
      reasonCode: reasonCode || undefined,
      method,
      // KHÔNG gửi `amount` — backend tự tính theo chính sách để tránh lệch làm tròn
      // (VD: 999.999 × 50% → 499.999,50 ở backend vs 500.000 ở client).
      note: note || null,
    });
  };

  return (
    <ModalShell
      title={
        refund?.__reReview
          ? `Duyệt lại yêu cầu hoàn tiền ${refund?.refundCode ?? `#${refund?.id}`}`
          : `Xử lý yêu cầu hoàn tiền ${refund?.refundCode ?? `#${refund?.id}`}`
      }
      subtitle={
        refund?.__reReview
          ? "Cổng thanh toán không tạo được giao dịch hoàn — chuyển sang chuyển khoản thủ công để tiếp tục."
          : "Bên trái là thông tin khách gửi kèm — bên phải là nơi quyết định."
      }
      onClose={onClose}
      extraWide
      fillHeight
    >
      {/*
        ⚠️ `grid-rows-[minmax(0,1fr)]` là BẮT BUỘC: mặc định `grid-template-rows`
        là `auto` ⇒ hàng cao bằng chiều cao nội dung ⇒ cột KHÔNG bao giờ tràn ⇒
        không có thanh cuộn. Ép hàng về `minmax(0, 1fr)` (1 phần chiều cao
        container) + mỗi cột `min-h-0 overflow-y-auto` ⇒ mỗi bên có thanh
        cuộn nhỏ riêng, modal không đẩy trang.
      */}
      <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-5 lg:grid-cols-[1.05fr_1fr]">        {/* ── CỘT TRÁI: chi tiết đơn khách gửi lên ── */}
        <div className="min-h-0 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
          <h3 className="sticky top-0 z-10 mb-3 flex items-center gap-1.5 bg-white pt-0.5 text-xs font-bold text-slate-700">
            <FileText size={13} className="text-slate-400" />
            Thông tin khách gửi kèm
          </h3>
          <RefundDetailBody refund={detailRefund} compact />
        </div>

        {/* ── CỘT PHẢI: quyết định của quản trị viên ── */}
        <div className="min-h-0 overflow-y-auto overscroll-contain border-t border-slate-100 pt-4 pr-1 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
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

            {/*
              Chế độ duyệt lại ⇒ KHÔNG hiện cặp nút chuyển trạng thái Duyệt/Từ
              chối.

              ⚠️ Vì sao? ── Trong chế độ duyệt lại, yêu cầu ĐÃ được duyệt rồi và
              KHÔNG được phép từ chối ⇒ nút "Từ chối" bị ẩn, còn nút "Duyệt" thì
              không làm gì (approve luôn = true) ⇒ chỉ còn MỘT nút xanh lá vô
              nghĩa, dễ khiến Admin tưởng còn phải "bấm duyệt" thêm lần nữa.

              ⇒ Bỏ hẳn cặp nút; hành động duyệt thật sự nằm ở nút "Xác nhận"
              cuối form (đã ghi rõ là duyệt + chuyển khoản thủ công).
            */}
            {!refund?.__reReview && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setApprovePref(true)}
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
                  onClick={() => setApprovePref(false)}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${
                    !approve
                      ? "bg-rose-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Từ chối
                </button>
              </div>
            )}

            {approve ? (
              <>
                <Field label="Nhóm lý do do quản trị viên xác định">
                  <select
                    value={reason}
                    onChange={(e) => handleReasonChange(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="">— Chọn nhóm lý do —</option>
                    {(groups.length > 0 ? groups : FALLBACK_GROUPS).map((g) => {
                      const rate = Number(g.refundRate ?? 0);
                      const preview = refundAmountForReasonAt(
                        paymentAmount,
                        g.code,
                        rateOverrides,
                        experienceDate,
                        requestedAt,
                        g.noShowWindowHours ?? undefined,
                      );
                      // Nhóm cá nhân có MỨC HOÀN 0% riêng (hủy quá muộn / no-show).
                      const rateText =
                        rate === 0
                          ? "0%"
                          : `${Math.round(rate * 100)}%` +
                            (g.noShowWindowHours != null
                              ? ` / ${Math.round(Number(g.noShowRefundRate ?? 0) * 100)}%`
                              : "");
                      return (
                        <option key={g.code} value={g.code}>
                          {g.name} — hoàn {rateText} ({formatVND(preview)})
                        </option>
                      );
                    })}
                  </select>
                </Field>

                <Field
                  label="Lý do cụ thể"
                  hint={
                    currentGroup?.description ??
                    "Chọn lý do cụ thể thuộc nhóm lý do đã chọn để hệ thống ghi nhận đúng nguyên nhân."
                  }
                >
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    disabled={groupCodes.length === 0}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">— Chọn lý do cụ thể —</option>
                    {groupCodes.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                {/*
                  ── Nhóm "Lỗi khách hàng" ──
                  Chính sách phụ thuộc THỜI ĐIỂM khách gửi yêu cầu so với ngày
                  trải nghiệm:
                    • Hủy trước 3 ngày khởi hành  → Hoàn 50%
                    • Hủy trong vòng 48 giờ / không xuất hiện → Hoàn 0%
                  ⇒ Hiển thị 2 mốc ngày để Admin tự đối chiếu.
                */}
                {reason === "PERSONAL" && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-bold text-slate-700">
                      Mốc thời gian áp dụng chính sách
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500">
                          Ngày gửi đơn hoàn tiền
                        </p>
                        <p className="mt-0.5 font-mono text-xs font-semibold text-slate-800">
                          {requestedAt ? formatDateTimeVN(requestedAt) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500">
                          Ngày trải nghiệm
                        </p>
                        <p className="mt-0.5 font-mono text-xs font-semibold text-slate-800">
                          {experienceDate ? formatLocalDate(experienceDate) : "—"}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2.5 text-[11px] leading-relaxed text-slate-600">
                      {daysBeforeStart == null ? (
                        "Không tính được số ngày — Admin cần đối chiếu thủ công."
                      ) : (
                        <>
                          Khách gửi yêu cầu{" "}
                          <b className="text-slate-800">{daysBeforeStart}</b> ngày
                          trước ngày trải nghiệm.
                        </>
                      )}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      Quy tắc: <b>Hoàn 50%</b> nếu hủy trước 3 ngày khởi hành;{" "}
                      <b>Hoàn 0%</b> nếu hủy trong vòng 48 giờ hoặc không xuất hiện.
                    </p>
                    <p className="mt-1.5 text-[11px] font-semibold leading-relaxed">
                      {noShowApplies ? (
                        <span className="text-amber-700">
                          ⇒ Áp dụng Hoàn 0% (khách gửi trong vòng 48 giờ trước
                          ngày trải nghiệm).
                        </span>
                      ) : daysBeforeStart != null && daysBeforeStart < 3 ? (
                        <span className="text-amber-700">
                          ⇒ Áp dụng Hoàn 50% (chưa vào cửa sổ 48 giờ, nhưng hủy
                          muộn hơn 3 ngày — Admin nên cân nhắc).
                        </span>
                      ) : (
                        <span className="text-emerald-700">
                          ⇒ Áp dụng Hoàn 50% (hủy trước 3 ngày khởi hành).
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {groupRate === 0 && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>
                      Nhóm lý do này theo chính sách <b>không hoàn tiền</b>. Yêu
                      cầu sẽ được ghi nhận là đã xử lý với tỷ lệ 0% và không
                      thực hiện giao dịch hoàn.
                    </span>
                  </div>
                )}

                {noShowApplies && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>
                      Khách gửi yêu cầu <b>trong vòng 48 giờ</b> trước ngày trải
                      nghiệm ({experienceDate ? formatLocalDate(experienceDate) : "—"}
                      ) — theo chính sách nhóm{" "}
                      <b>Lỗi khách hàng</b> chỉ hoàn <b>0%</b>. Số tiền được hệ
                      thống tính là 0 đồng; duyệt ở tỷ lệ này sẽ ghi nhận yêu
                      cầu đã xử lý mà không thực hiện giao dịch hoàn.
                    </span>
                  </div>
                )}

                {/*
                  ⚠️ Hiện select phương thức khi:
                    • nhóm lý do có tỷ lệ hoàn > 0 (bình thường), HOẶC
                    • đang ở chế độ duyệt lại — admin cần THẤY rõ mình đang đổi
                      phương thức sang chuyển khoản thủ công, kể cả khi nhóm lý do
                      đang được chọn có tỷ lệ 0%.
                */}
                {(refund?.__reReview || (groupRate > 0 && !noShowApplies)) && (
                  <Field
                    label="Phương thức hoàn tiền"
                    hint={
                      refund?.__reReview
                        ? "Yêu cầu này đã gửi tới VNPay nhưng cổng thanh toán không tạo được giao dịch hoàn. Chọn “Chuyển khoản thủ công” để tiếp tục."
                        : undefined
                    }
                  >
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs focus:bg-white focus:outline-none"
                    >
                      {/*
                        ⚠️ Chế độ duyệt lại ⇒ CHỈ chuyển khoản thủ công mới khả dụng.
                        Đã gửi tới VNPay mà chưa có kết quả ⇒ không gửi lại VNPay
                        (tránh tạo giao dịch hoàn trùng).
                      */}
                      {refund?.__reReview ? (
                        <option value="MANUAL_BANK_TRANSFER">
                          Chuyển khoản thủ công
                        </option>
                      ) : (
                        <>
                          <option value="VNPAY_API">
                            Hoàn qua VNPay (khuyến nghị)
                          </option>
                          <option value="MANUAL_BANK_TRANSFER">
                            Chuyển khoản thủ công
                          </option>
                        </>
                      )}
                    </select>
                  </Field>
                )}

                {/* Thông báo rõ lý do mở lại modal — tránh Admin bấm nhầm. */}
                {refund?.__reReview && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>
                      Cổng thanh toán <b>không tạo được</b> giao dịch hoàn cho
                      yêu cầu này và đã kết thúc ⇒ chuyển sang phương thức{" "}
                      <b>chuyển khoản thủ công</b>. Bạn sẽ tự chuyển tiền theo
                      số tiền được duyệt, rồi ghi nhận mã tham chiếu và bằng
                      chứng để hệ thống đánh dấu đã hoàn xong.
                    </span>
                  </div>
                )}

                <Field
                  label="Số tiền duyệt"
                  hint={
                    // ⚠️ Chưa chọn nhóm lý do ⇒ chưa có tỷ lệ ⇒ chưa tính được.
                    reason
                      ? `Tự động tính theo chính sách: ${Math.round(
                          effectiveRate * 100,
                        )}% × ${formatVND(paymentAmount)} = ${formatVND(amount)}`
                      : "Hãy chọn nhóm lý do để hệ thống tính số tiền được duyệt theo chính sách."
                  }
                >
                  <input
                    type="number"
                    value={amount}
                    min={0}
                    max={paymentAmount}
                    readOnly
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                  />
                </Field>
              </>
            ) : (
              <Field label="Lý do từ chối (bắt buộc)">
                <LimitedField
                  as="textarea"
                  counter="always"
                  limit={REJECTION_REASON_MAX}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none"
                />
              </Field>
            )}

            <Field label="Ghi chú">
              <LimitedField
                as="textarea"
                counter="always"
                limit={NOTE_MAX}
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
        </div>
      </div>
      {confirmDialog}
    </ModalShell>
  );
}

/* =========================================================================
   MODAL GHI NHẬN CHUYỂN KHOẢN THỦ CÔNG
   ========================================================================= */

/** Mã tham chiếu — backend `ManualTransferRequest.transferReference` cho phép 100. */
const TRANSFER_REFERENCE_MAX = 100;

/** Bằng chứng — backend `ManualTransferRequest.transferEvidence` cho phép 5000. */
const TRANSFER_EVIDENCE_MAX = 5000;

/** Ghi chú nền tảng — backend `ManualTransferRequest.transferNote` cho phép 2000. */
const TRANSFER_NOTE_MAX = 500;

/**
 * Modal ghi nhận đã chuyển khoản ngân hàng thủ công.
 *
 * ── Vì sao cần modal thay vì `window.prompt`? ──
 * Backend chỉ chuyển yêu cầu sang {@code REFUNDED} khi CÓ bằng chứng
 * (`transferEvidence`). `window.prompt` chỉ hỏi mã tham chiếu ⇒ không có
 * bằng chứng ⇒ yêu cầu kẹt ở "Đang xử lý hoàn tiền" vĩnh viễn, không có
 * cách đóng. Modal này BẮT BUỘC nhập đủ mã tham chiếu + bằng chứng.
 *
 * ── Bố cục 2 cột ──
 * Cột TRÁI = chi tiết yêu cầu hoàn tiền khách gửi lên ({@link RefundDetailBody}).
 * Cột PHẢI = form ghi nhận chuyển khoản (số tiền, mã tham chiếu, bằng chứng
 * có upload ảnh, ghi chú). Mỗi cột có thanh cuộn riêng.
 *
 * @param {object} props
 * @param {object} props.refund    yêu cầu hoàn tiền (dùng để hiện số tiền)
 * @param {boolean} props.busy     đang gửi yêu cầu
 * @param {Function} props.onClose đóng modal
 * @param {Function} props.onSubmit (payload) => void
 */
export function ManualTransferModal({ refund, busy, onClose, onSubmit }) {
  const { confirm, confirmDialog } = useConfirm();
  const [reference, setReference] = useState("");
  const [evidence, setEvidence] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Dữ liệu chi tiết ĐẦY ĐỦ (bằng chứng, thông tin ngân hàng, liên hệ…) —
  // list API không trả đủ ⇒ gọi GET /refunds/{id}. Nếu lỗi thì lùi về dữ liệu
  // trong list (vẫn hiển thị được phần chính).
  const [detail, setDetail] = useState(refund ?? null);
  useEffect(() => {
    if (!refund?.id) return undefined;
    let active = true;
    getRefundById(refund.id)
      .then((data) => {
        if (active && data) setDetail(data);
      })
      .catch(() => {
        // Giữ nguyên dữ liệu từ list.
      });
    return () => {
      active = false;
    };
  }, [refund?.id]);

  const detailRefund = detail ?? refund;

  const amountToTransfer = Number(
    refund?.approvedAmount ?? refund?.paymentAmount ?? 0,
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reference.trim()) {
      alert("Vui lòng nhập mã tham chiếu giao dịch chuyển khoản.");
      return;
    }
    if (!evidence.trim()) {
      alert(
        "Vui lòng nhập bằng chứng chuyển khoản (ảnh chụp biên lai hoặc mô tả giao dịch).",
      );
      return;
    }

    // ⚠️ Bước xác nhận — đánh dấu "đã hoàn tiền" là không thể hoàn tác.
    const ok = await confirm({
      tone: "success",
      icon: "check",
      title: "Xác nhận đã chuyển khoản?",
      subject: refund?.refundCode ?? `#${refund?.id}`,
      description: (
        <div className="space-y-2 text-left">
          <p>
            Bạn xác nhận đã chuyển tiền cho khách theo yêu cầu hoàn tiền này?
          </p>
          <ul className="space-y-1 text-xs text-slate-600">
            <li>
              Số tiền:{" "}
              <strong className="text-slate-900">
                {formatVND(refund?.approvedAmount ?? refund?.paymentAmount ?? 0)}
              </strong>
            </li>
            <li>
              Mã tham chiếu:{" "}
              <strong className="text-slate-900">{reference.trim()}</strong>
            </li>
          </ul>
          <p className="text-xs text-amber-600">
            Thao tác này đánh dấu yêu cầu là đã hoàn xong và không thể hoàn tác.
          </p>
        </div>
      ),
      confirmLabel: "Xác nhận đã chuyển",
      cancelLabel: "Quay lại",
    });
    if (!ok) return;

    onSubmit({
      transferReference: reference.trim(),
      transferEvidence: evidence.trim(),
      transferNote: note.trim() || null,
      transferredAt: new Date().toISOString(),
    });
  };

  const handleUploadEvidence = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiClient.upload("/upload/image", fd);
      const url = res?.data?.url ?? res?.url ?? null;
      if (!url) throw new Error("Máy chủ không trả về đường dẫn ảnh.");
      setEvidenceUrl(url);
      // Ghi luôn vào ô bằng chứng để không mất dữ liệu khi submit.
      setEvidence((prev) => (prev ? `${prev}\n${url}` : url));
    } catch (err) {
      setUploadError(
        err?.message || "Không tải được ảnh lên. Vui lòng thử lại hoặc dán link ảnh.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <ModalShell
      title={`Ghi nhận chuyển khoản thủ công cho ${refund?.refundCode ?? `#${refund?.id}`}`}
      subtitle="Bên trái là chi tiết yêu cầu hoàn tiền — bên phải là nơi ghi nhận giao dịch chuyển khoản."
      onClose={onClose}
      extraWide
      fillHeight
    >
      {/*
        ⚠️ `grid-rows-[minmax(0,1fr)]` là BẮT BUỘC: mặc định `grid-template-rows`
        là `auto` ⇒ hàng cao bằng chiều cao nội dung ⇒ cột KHÔNG bao giờ tràn ⇒
        không có thanh cuộn. Ép hàng về `minmax(0, 1fr)` + mỗi cột
        `min-h-0 overflow-y-auto` ⇒ mỗi bên có thanh cuộn nhỏ riêng.
      */}
      <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-5 lg:grid-cols-[1.05fr_1fr]">
        {/* ── CỘT TRÁI: chi tiết yêu cầu hoàn tiền ── */}
        <div className="min-h-0 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
          <h3 className="sticky top-0 z-10 mb-3 flex items-center gap-1.5 bg-white pt-0.5 text-xs font-bold text-slate-700">
            <FileText size={13} className="text-slate-400" />
            Chi tiết yêu cầu hoàn tiền
          </h3>
          <RefundDetailBody refund={detailRefund} compact />
        </div>

        {/* ── CỘT PHẢI: form ghi nhận chuyển khoản ── */}
        <div className="min-h-0 overflow-y-auto overscroll-contain border-t border-slate-100 pt-4 pr-1 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-semibold text-slate-500">
                Số tiền cần chuyển
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
                {formatVND(amountToTransfer)}
              </p>
            </div>

            <Field
              label="Mã tham chiếu giao dịch"
              hint="Bắt buộc — mã tham chiếu do ngân hàng cấp."
            >
              <input
                type="text"
                value={reference}
                maxLength={TRANSFER_REFERENCE_MAX}
                onChange={(e) => setReference(e.target.value)}
                placeholder="VD: FT20261114001"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-xs text-slate-900 focus:bg-white focus:outline-none"
              />
              <p className="mt-1 text-right text-[10px] tabular-nums text-slate-400">
                {reference.length}/{TRANSFER_REFERENCE_MAX}
              </p>
            </Field>

            <Field
              label="Bằng chứng chuyển khoản"
              hint="Bắt buộc — tải lên ảnh biên lai hoặc dán link ảnh. Không có bằng chứng thì yêu cầu không thể đóng."
            >
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-600 hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700">
                  {uploading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <ImagePlus size={13} />
                  )}
                  {uploading
                    ? "Đang tải ảnh lên…"
                    : "Tải lên ảnh biên lai chuyển khoản"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      handleUploadEvidence(file);
                    }}
                  />
                </label>

                {evidenceUrl && (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
                    <img
                      src={evidenceUrl}
                      alt="Bằng chứng chuyển khoản"
                      className="h-14 w-14 shrink-0 rounded-md border border-slate-200 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-700">
                        Ảnh đã tải lên
                      </p>
                      <p className="truncate text-[10px] text-slate-400">
                        {evidenceUrl}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEvidenceUrl("")}
                      className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-50"
                    >
                      Xoá
                    </button>
                  </div>
                )}

                {uploadError && (
                  <p className="text-[10px] font-semibold text-rose-600">
                    {uploadError}
                  </p>
                )}

                <LimitedField
                  as="textarea"
                  counter="always"
                  limit={TRANSFER_EVIDENCE_MAX}
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  rows={4}
                  placeholder="Mô tả giao dịch chuyển khoản hoặc dán link ảnh biên lai"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none"
                />
              </div>
            </Field>

            <Field
              label="Ghi chú của nền tảng"
              hint="Không bắt buộc — khách sẽ thấy ghi chú này trong lịch sử hoàn tiền."
            >
              <textarea
                value={note}
                maxLength={TRANSFER_NOTE_MAX}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="VD: Đã chuyển kèm phí 11.000đ, tiền về tối nay."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none"
              />
              <p className="mt-1 text-right text-[10px] tabular-nums text-slate-400">
                {note.length}/{TRANSFER_NOTE_MAX}
              </p>
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
                disabled={busy || uploading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy && <Loader2 size={12} className="animate-spin" />}
                Xác nhận đã chuyển
              </button>
            </div>
          </form>
        </div>
      </div>
      {confirmDialog}
    </ModalShell>
  );
}
