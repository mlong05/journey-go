"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2, AlertTriangle, RotateCcw, ChevronRight, Info, CheckCircle2, LifeBuoy,
  ImagePlus, X, ShieldCheck,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { BANKS, findBankName } from "@/constants/banks";
import { touristService } from "../services/touristService";
import {
  REFUND_REASON, REFUND_STATUS, REFUND_OPEN_STATUSES, dateTime, vnd,
} from "../utils";
import { PERSONAL_REFUND_TIERS } from "../refundPolicy";

/** Số ký tự tối đa — khớp `@Size` ở `CreateRefundRequest`. */
const SUMMARY_MAX = 200;
const DETAIL_MAX = 2000;
const PHONE_MAX = 20;
const EMAIL_MAX = 150;
/** Giới hạn riêng cho khối "Thông tin liên hệ & Tài khoản nhận tiền". */
const BANK_ACCOUNT_NUMBER_MAX = 34; // số tài khoản ngân hàng VN (tối đa 34 ký tự)
const BANK_ACCOUNT_NAME_MAX = 80;   // tên chủ tài khoản
/** Tối đa 5 file bằng chứng cho một yêu cầu (khớp mobile). */
const MAX_EVIDENCE_FILES = 5;
import { LimitedField } from "@/components/ui/LimitedField";

const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";

/**
 * Bộ đếm ký tự cạnh ô nhập.
 *
 * <p>Đạt tới giới hạn ⇒ chuyển sang màu vàng (amber) để người dùng biết đã đầy.
 */
function CharCount({ value, max }) {
  const len = value?.length || 0;
  const full = len >= max;
  const near = !full && len >= Math.floor(max * 0.9);
  return (
    <p
      className={`mt-1 text-right text-[11px] font-semibold tabular-nums ${
        full ? "text-amber-600" : near ? "text-amber-500" : "text-slate-400"
      }`}
      aria-live="polite"
    >
      {len}/{max}
    </p>
  );
}

/**
 * Cắt chuỗi theo giới hạn ký tự.
 *
 * <p>Dùng khi cập nhật state để chặn giá trị vượt quá giới hạn — kể cả khi người dùng
 * dán (paste) một chuỗi dài hơn giới hạn, chỉ giữ lại đúng số ký tự cho phép.
 */
function clamp(value, max) {
  const raw = value ?? "";
  return raw.length > max ? raw.slice(0, max) : raw;
}

/** Ngày trải nghiệm dạng `YYYY-MM-DD` → Date (0h giờ Việt Nam). */
function parseExperienceDate(value) {
  if (!value) return null;
  const raw = typeof value === "string" ? value.slice(0, 10) : value;
  const d = new Date(`${raw}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function RefundBadge({ status }) {
  const st = REFUND_STATUS[status] || REFUND_STATUS.CANCELLED;
  return <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>;
}

/**
 * Nhãn tiếng Việt cho từng hành động trong nhật ký kiểm toán refund.
 * ⚠️ Khớp enum `RefundAuditLog.Action` ở backend.
 */
const AUDIT_ACTION_LABEL = {
  CREATED: "Đã gửi yêu cầu hoàn tiền",
  APPROVED: "Quản trị viên đã duyệt yêu cầu",
  REJECTED: "Quản trị viên từ chối yêu cầu",
  VNPAY_REQUEST_SENT: "Đã gửi yêu cầu hoàn tiền tới VNPay",
  VNPAY_RESPONSE: "VNPay đã phản hồi kết quả",
  VNPAY_STATUS_UPDATED: "Cập nhật trạng thái hoàn tiền từ VNPay",
  MANUAL_TRANSFER_RECORDED: "Tạo yêu cầu chuyển khoản thủ công",
  MANUAL_TRANSFER_CONFIRMED: "Quản trị viên đã thực hiện chuyển khoản",
  STATUS_UPDATED: "Cập nhật trạng thái yêu cầu",
  CANCELLED: "Đã huỷ yêu cầu",
};

/** Trạng thái refund đã có kết quả cuối cùng. */
const REFUND_FINAL_STATUSES = new Set(["REFUNDED", "REJECTED", "FAILED", "CANCELLED"]);

/**
 * Trích các URL ảnh nằm trong một chuỗi bằng chứng tự do.
 *
 * <p>Bằng chứng chuyển khoản do Admin nhập có thể là: URL ảnh thuần, hoặc mô tả
 * kèm URL nối bằng dấu xuống dòng. ⇒ Cần lọc ra phần URL để hiển thị thumbnail.
 *
 * @param {string} text chuỗi bằng chứng
 * @returns {string[]} danh sách URL ảnh
 */
export function extractImageUrls(text) {
  if (!text || typeof text !== "string") return [];
  const matches = text.match(/https?:\/\/[^\s"'<>]+/g) || [];
  return matches.filter((u) => /\.(png|jpe?g|webp|gif|bmp|heic)(\?|#|$)/i.test(u));
}

/**
 * Dòng thông tin dạng nhãn — giá trị (nhãn ở trên, giá trị ở dưới).
 *
 * <p>Dùng chung cho mọi trường trong khối tóm tắt đơn hoàn tiền ⇒ nhất quán
 * giữa "Lý do của người dùng" và "Lý do nền tảng đưa ra".
 */
function FieldRow({ label, value, tone = "default" }) {
  if (!value) return null;
  const valueCls = {
    default: "text-slate-800",
    muted: "text-slate-600",
    danger: "text-rose-700",
    brand: "text-teal-800",
  }[tone] || "text-slate-800";
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm leading-relaxed ${valueCls}`}>{value}</p>
    </div>
  );
}

/**
 * Dựng 3 chặng chính của quy trình xử lý hoàn tiền từ dữ liệu đơn + nhật ký.
 *
 * @returns {Array<{key, title, at, done, current, note, tone}>}
 */
function buildRefundSteps(r) {
  const logs = Array.isArray(r.auditLogs) ? r.auditLogs : [];
  const findLog = (action) => logs.find((l) => l.action === action);
  const status = String(r.status || "");

  // ── Chặng 1: gửi yêu cầu ────────────────────────────────────────────────
  const created = findLog("CREATED");
  const step1 = {
    key: "created",
    title: "Đã gửi yêu cầu hoàn tiền",
    at: created?.createdAt || r.createdAt,
    done: true,
    current: false,
    note: created?.detail || "Yêu cầu đã được gửi tới quản trị viên xem xét.",
    tone: "teal",
  };

  // ── Chặng 2: quản trị viên xử lý ────────────────────────────────────────
  const approved = findLog("APPROVED");
  const vnpay = findLog("VNPAY_REQUEST_SENT") || findLog("VNPAY_RESPONSE");
  const manual = findLog("MANUAL_TRANSFER_RECORDED");
  const processingLog = approved || vnpay || manual
    || logs.find((l) => l.toStatus && String(l.toStatus).includes("PROCESSING"))
    || logs.find((l) => l.toStatus === "APPROVED" || l.toStatus === "MANUAL_TRANSFER_PENDING");
  const isProcessing = ["PENDING_REVIEW", "APPROVED", "VNPAY_PROCESSING", "MANUAL_TRANSFER_PENDING", "REFUND_PROCESSING"]
    .includes(status);
  const step2 = {
    key: "processing",
    title: isProcessing ? "Đang xử lý" : "Đã xử lý",
    at: processingLog?.createdAt || r.reviewedAt,
    done: !isProcessing,
    current: isProcessing,
    note: processingLog?.detail
      || (isProcessing
        ? "Quản trị viên đang xem xét yêu cầu và thực hiện hoàn tiền."
        : "Quản trị viên đã xử lý yêu cầu."),
    tone: isProcessing ? "amber" : "sky",
  };

  // ── Chặng 3: kết quả cuối cùng ──────────────────────────────────────────
  const refunded = status === "REFUNDED";
  const rejected = status === "REJECTED";
  const failed = status === "FAILED";
  const cancelled = status === "CANCELLED";
  const finished = REFUND_FINAL_STATUSES.has(status);
  const finalLog = logs.length ? logs[logs.length - 1] : null;
  const step3 = {
    key: "result",
    title: refunded ? "Hoàn tất — đã hoàn tiền"
      : rejected ? "Bị từ chối"
        : failed ? "Hoàn tiền thất bại"
          : cancelled ? "Đã huỷ yêu cầu"
            : "Kết quả cuối cùng",
    // Chỉ hiện mốc thời gian khi đã có kết quả — trạng thái đang xử lý thì chưa có.
    at: !finished ? null
      : refunded ? (finalLog?.createdAt || r.vnpResolvedAt || r.transferredAt)
        : rejected ? (finalLog?.createdAt || r.reviewedAt)
          : finalLog?.createdAt,
    done: finished,
    current: false,
    note: refunded
      ? `Đã hoàn ${vnd(r.refundedAmount)} về tài khoản của bạn.`
      : rejected ? (r.rejectionReason || "Quản trị viên đã từ chối yêu cầu này.")
        : failed ? "Giao dịch hoàn tiền không thành công — vui lòng liên hệ hỗ trợ."
          : cancelled ? "Yêu cầu đã được huỷ trước khi xử lý."
            : "Đang chờ kết quả cuối cùng.",
    tone: refunded ? "emerald" : rejected || failed ? "rose" : "slate",
  };

  return [step1, step2, step3];
}

/**
 * Dòng thời gian chi tiết xử lý đơn hoàn tiền — từ lúc gửi đến khi xử lý xong.
 *
 * <p>Hiển thị 3 chặng chính (gửi → xử lý → kết quả) kèm mốc thời gian và ghi chú,
 * bên dưới là nhật ký chi tiết từng bước (nếu backend có trả về).
 */
function RefundTimeline({ r }) {
  const steps = buildRefundSteps(r);
  const logs = Array.isArray(r.auditLogs) ? r.auditLogs : [];

  /**
   * Ảnh bằng chứng chuyển khoản do Admin đính kèm.
   *
   * ⚠️ Bằng chứng nằm trong `transferEvidence` (URL ảnh hoặc mô tả) ⇒ phải lọc
   * ra phần URL ảnh mới hiển thị được thumbnail.
   */
  const transferImages = extractImageUrls(r.transferEvidence);

  /**
   * Hành động "quản trị viên đã thực hiện chuyển khoản" — bước DUY NHẤT được
   * hiện ảnh bằng chứng + ghi chú nền tảng.
   *
   * ⚠️ KHÔNG gắn vào "Tạo yêu cầu chuyển khoản thủ công"
   * (`MANUAL_TRANSFER_RECORDED`) — bước đó mới chỉ là yêu cầu, chưa có ảnh/ghi chú.
   */
  const TRANSFER_CONFIRMED_ACTION = "MANUAL_TRANSFER_CONFIRMED";

  /**
   * Ghi chú của nền tảng theo từng bước:
   *   • `adminNote`   — Admin nhập khi DUYỆT / TỪ CHỐI ⇒ gắn vào bước xử lý.
   *   • `transferNote` — Admin nhập khi ghi nhận CHUYỂN KHOẢN ⇒ gắn vào bước chuyển tiền.
   *
   * @param {string} action hành động của dòng nhật ký
   * @returns {string[]} danh sách ghi chú cần hiển thị ở dòng đó
   */
  const notesForAction = (action) => {
    if (action === TRANSFER_CONFIRMED_ACTION) {
      return r.transferNote ? [r.transferNote] : [];
    }
    return r.adminNote ? [r.adminNote] : [];
  };

  const DOT = {
    teal: "bg-teal-600",
    amber: "bg-amber-500",
    sky: "bg-sky-500",
    emerald: "bg-emerald-600",
    rose: "bg-rose-500",
    slate: "bg-slate-400",
  };
  const TEXT = {
    teal: "text-teal-700",
    amber: "text-amber-700",
    sky: "text-sky-700",
    emerald: "text-emerald-700",
    rose: "text-rose-700",
    slate: "text-slate-600",
  };

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
        <Info size={13} />Lịch sử xử lý đơn hoàn tiền
      </p>

      <ol className="space-y-0">
        {steps.map((s, i) => (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
            {/* Đường nối giữa các chặng */}
            {i < steps.length - 1 && (
              <span className={`absolute left-[7px] top-4 h-full w-0.5 ${s.done ? "bg-teal-300" : "bg-slate-200"}`} aria-hidden="true" />
            )}
            <span className={`relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-white ${DOT[s.tone]}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-extrabold ${TEXT[s.tone]}`}>
                {s.title}
                {s.current && <span className="ml-2 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">đang thực hiện</span>}
              </p>
              {s.at && <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{dateTime(s.at)}</p>}
              {s.note && <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{s.note}</p>}
            </div>
          </li>
        ))}
      </ol>

      {/* Nhật ký chi tiết từng bước (do backend ghi lại) */}
      {logs.length > 0 && (
        <details className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-xs font-bold text-slate-700">
            Xem nhật ký chi tiết ({logs.length} bước)
          </summary>
          <ul className="mt-2 space-y-2 border-t border-dashed border-slate-200 pt-2">
            {logs.map((l) => {
              // Ảnh bằng chứng + ghi chú chỉ hiện ở bước "quản trị viên đã thực
              // hiện chuyển khoản" — KHÔNG hiện ở "Tạo yêu cầu chuyển khoản thủ công".
              const showTransfer = l.action === TRANSFER_CONFIRMED_ACTION;
              // Ghi chú nền tảng gắn đúng bước tương ứng.
              const notes = notesForAction(l.action);
              return (
                <li key={l.id ?? `${l.action}-${l.createdAt}`} className="text-xs">
                  <p className="font-bold text-slate-800">
                    {AUDIT_ACTION_LABEL[l.action] || l.action}
                    {l.amount != null && Number(l.amount) > 0 && (
                      <span className="ml-1.5 font-semibold text-slate-600">· {vnd(l.amount)}</span>
                    )}
                  </p>
                  {l.detail && <p className="mt-0.5 leading-relaxed text-slate-600">{l.detail}</p>}
                  {/* Ảnh bằng chứng chuyển khoản — hiện TRƯỚC mốc thời gian. */}
                  {showTransfer && transferImages.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {transferImages.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          title="Mở bằng chứng chuyển khoản"
                          className="block h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- URL Cloudinary ngoài domain đã cấu hình */}
                          <img src={url} alt="Bằng chứng chuyển khoản" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  {/* Ghi chú của nền tảng — hiện TRƯỚC mốc thời gian. */}
                  {notes.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {notes.map((n) => (
                        <p key={n} className="leading-relaxed text-slate-600">
                          <span className="font-semibold text-slate-700">Ghi chú nền tảng: </span>
                          {n}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="mt-0.5 text-[11px] text-slate-400">{dateTime(l.createdAt)}</p>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}

/**
 * Tóm tắt một yêu cầu hoàn tiền.
 *
 * ⚠️ KHÔNG hiển thị "Đề xuất hoàn 0đ / 1.200.000đ" — số tiền đề xuất do hệ thống
 * tính tự động và có thể bằng 0 (VD: hủy trong cửa sổ 48h) ⇒ gây hiểu nhầm.
 * Chỉ hiển thị: số tiền ĐÃ THANH TOÁN, số tiền ĐƯỢC DUYỆT và số tiền ĐÃ HOÀN.
 *
 * ── Cấu trúc hiển thị (theo yêu cầu) ──
 *  1. Trạng thái + mã yêu cầu.
 *  2. "Lý do của người dùng"      — `reasonSummary` (ngắn gọn lúc gửi).
 *  3. "Mô tả chi tiết của người dùng" — `reasonDetail` (lúc gửi).
 *  4. "Lỗi từ nền tảng"          — `approvedReasonName` (nhóm Admin chọn).
 *  5. "Lý do nền tảng đưa ra"    — `approvedReasonCodeName` (mã lý do Admin chọn).
 *  6. "Ghi chú của nền tảng"      — `adminNote` (Admin nhập, nếu có).
 *  7. Số tiền + mốc thời gian gửi.
 */
function RefundSummary({ r }) {
  const approved = r.approvedAmount != null ? Number(r.approvedAmount) : null;
  const refunded = r.refundedAmount != null ? Number(r.refundedAmount) : null;
  // Nhóm lý do Admin xác định — ưu tiên tên tiếng Việt backend gửi sẵn,
  // fallback về nhãn tĩnh khi backend chưa có cấu hình nhóm lý do.
  const platformGroup = r.approvedReasonName
    || REFUND_REASON[r.approvedReason]?.label
    || r.approvedReason
    || null;
  const platformReason = r.approvedReasonCodeName || null;
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <RefundBadge status={r.status} />
        <span className="text-xs text-slate-400">Mã {r.refundCode}</span>
      </div>

      {/* ── Lý do của người dùng ── */}
      {r.reasonSummary && (
        <FieldRow label="Lý do của người dùng" value={r.reasonSummary} />
      )}

      {/* ── Mô tả chi tiết của người dùng ── */}
      {r.reasonDetail && (
        <FieldRow label="Mô tả chi tiết của người dùng" value={r.reasonDetail} tone="muted" />
      )}

      {/* ── Phần nền tảng đưa ra (chỉ hiện khi Admin đã xử lý) ── */}
      {(platformGroup || platformReason || r.adminNote) && (
        <div className="space-y-2 rounded-xl border border-teal-100 bg-teal-50/50 p-3">
          {platformGroup && (
            <FieldRow label="Lỗi từ nền tảng" value={platformGroup} tone="brand" />
          )}
          {platformReason && (
            <FieldRow label="Lý do nền tảng đưa ra" value={platformReason} tone="brand" />
          )}
          {r.adminNote && (
            <FieldRow label="Ghi chú của nền tảng" value={r.adminNote} tone="brand" />
          )}
        </div>
      )}

      {/* Số tiền — không hiện "đề xuất hoàn" (có thể bằng 0 và gây hiểu nhầm). */}
      <p className="text-slate-600">
        Số tiền đã thanh toán <b className="tabular-nums text-slate-900">{vnd(r.paymentAmount)}</b>
        {approved != null && <> · Được duyệt <b className="tabular-nums text-slate-900">{vnd(approved)}</b></>}
        {refunded != null && refunded > 0 && <> · Đã hoàn <b className="tabular-nums text-emerald-700">{vnd(refunded)}</b></>}
      </p>
      {r.rejectionReason && <p className="text-rose-600">Lý do từ chối: {r.rejectionReason}</p>}
      <p className="text-xs text-slate-400">Gửi lúc {dateTime(r.createdAt)}</p>
      <RefundTimeline r={r} />
    </div>
  );
}

/**
 * Bảng chính sách hoàn tiền — hiển thị giống mobile.
 * Số tiền do ADMIN quyết định ⇒ không hiện "dự kiến hoàn X" cho khách.
 */
function RefundPolicyTable() {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm">
      <p className="mb-3 font-bold text-slate-900">Chính sách hoàn tiền</p>
      <div className="space-y-3">
        <div>
          <p className="font-semibold text-slate-800">Lỗi từ khách hàng (huỷ tour)</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
            {PERSONAL_REFUND_TIERS.map((tier) => (
              <li key={tier.id} className="flex items-center justify-between gap-2">
                <span>{tier.condition}</span>
                <span className={tier.rate > 0 ? "text-emerald-700" : "text-slate-500"}>
                  {tier.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-slate-800">Lỗi hệ thống / đối tác</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
            <li className="flex items-center justify-between gap-2"><span>Sự cố từ nền tảng hoặc nhà tour</span><span className="text-emerald-700">Hoàn 100%</span></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-slate-800">Bất khả kháng</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
            {/*
              ⚠️ Bất khả kháng (thiên tai, dịch bệnh, quy hoạch) → HOÀN 0%.
              Trước đây hiển thị "Theo chính sách" ⇒ khách không biết mức thực tế.
              Nhiệm vụ này KHỚP với cách Admin xử lý (refund_rate = 0.0000).
            */}
            <li className="flex items-center justify-between gap-2">
              <span>Thiên tai, dịch bệnh, quy hoạch</span>
              <span className="text-slate-500">Hoàn 0%</span>
            </li>
          </ul>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Khách chỉ mô tả lý do bằng văn bản — quản trị viên sẽ phân loại và quyết định mức hoàn khi duyệt.
      </p>
    </div>
  );
}

/**
 * Khối hoàn tiền trong trang chi tiết đơn đã thanh toán:
 * hiện yêu cầu đã gửi, hoặc biểu mẫu gửi yêu cầu nếu còn trong thời hạn.
 */
export function RefundPanel({ booking }) {
  const [state, setState] = useState({ loading: true, payment: null, refunds: [], error: "" });
  const [form, setForm] = useState({
    reasonSummary: "",
    reasonDetail: "",
    bankAccountNumber: "",
    bankAccountName: "",
    bankName: "",
    contactPhone: "",
    contactEmail: "",
  });
  const [files, setFiles] = useState([]); // { file, url?, uploading, failed }
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ ok: "", err: "" });
  // Mốc thời gian đã nạp — dùng để so sánh ngày trải nghiệm (render phải thuần khiết).
  const [now, setNow] = useState(0);
  const fileInputRef = useRef(null);
  /** Đã điền sẵn thông tin người dùng hay chưa (tránh ghi đè dữ liệu đã sửa). */
  const prefilledRef = useRef(false);

  const load = useCallback(() => touristService.bookingPayments(booking.id)
    .then(async (payments) => {
      const payment = payments.find((p) => p.status === "SUCCESS") || null;
      const refunds = payment ? await touristService.refundsForPayment(payment.id) : [];
      return { payment, refunds };
    })
    .then(({ payment, refunds }) => {
      setState({ loading: false, payment, refunds, error: "" });
      setNow(Date.now());
    })
    .catch((err) => setState({
      loading: false, payment: null, refunds: [],
      error: err?.message || "Không tải được thông tin thanh toán.",
    })), [booking.id]);
  useEffect(() => { load(); }, [load]);

  /**
   * Điền sẵn thông tin liên hệ & tài khoản nhận tiền từ hồ sơ người dùng
   * (số điện thoại, email, họ tên làm chủ tài khoản).
   *
   * ⚠️ Chỉ chạy MỘT LẦN và không ghi đè những gì người dùng đã nhập.
   */
  useEffect(() => {
    if (prefilledRef.current) return undefined;
    let alive = true;
    touristService.me()
      .then((me) => {
        if (!alive || !me) return;
        prefilledRef.current = true;
        setForm((f) => ({
          ...f,
          contactPhone: f.contactPhone || (me.phone || ""),
          contactEmail: f.contactEmail || (me.email || ""),
          bankAccountName: f.bankAccountName || (me.fullName || ""),
        }));
      })
      .catch(() => { prefilledRef.current = true; });
    return () => { alive = false; };
  }, []);

  /** Đẩy ảnh lên Cloudinary → trả về URL an toàn. */
  const uploadEvidence = async (file) => {
    const res = await touristService.uploadImage(file, "journeygo/refund-evidence");
    return res?.url || res;
  };

  const onPickFiles = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    const room = MAX_EVIDENCE_FILES - files.length;
    if (room <= 0) return;
    const accepted = picked.filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (!accepted.length) {
      setMsg({ ok: "", err: "Chỉ chấp nhận file ảnh (JPG/PNG/WEBP)." });
      return;
    }
    const slots = accepted.map((file) => ({ file, url: null, uploading: true, failed: false }));
    setFiles((prev) => [...prev, ...slots]);
    // Upload song song — cập nhật state theo từng file để không mất thứ tự.
    await Promise.all(slots.map(async (slot) => {
      try {
        const url = await uploadEvidence(slot.file);
        setFiles((prev) => prev.map((f) => (f.file === slot.file ? { ...f, url, uploading: false } : f)));
      } catch {
        setFiles((prev) => prev.map((f) => (f.file === slot.file ? { ...f, uploading: false, failed: true } : f)));
      }
    }));
  };

  const removeFile = (target) => setFiles((prev) => prev.filter((f) => f.file !== target));

  const submit = async (e) => {
    e.preventDefault();
    const summary = form.reasonSummary.trim();
    const detail = form.reasonDetail.trim();
    if (!summary) { setMsg({ ok: "", err: "Vui lòng nhập lý do ngắn gọn." }); return; }
    if (detail.length < 10) { setMsg({ ok: "", err: "Vui lòng mô tả chi tiết ít nhất 10 ký tự để quản trị viên xem xét." }); return; }
    const images = files.filter((f) => f.url);
    if (!images.length) {
      setMsg({ ok: "", err: "Vui lòng đính kèm ảnh chụp biên lai giao dịch thành công (bắt buộc)." });
      return;
    }
    if (files.some((f) => f.uploading)) {
      setMsg({ ok: "", err: "Ảnh đang tải lên — vui lòng đợi tải xong rồi gửi." });
      return;
    }
    setBusy(true); setMsg({ ok: "", err: "" });
    try {
      await touristService.createRefund({
        paymentId: state.payment.id,
        reasonSummary: summary,
        reasonDetail: detail,
        evidenceAttachments: images.map((f) => f.url),
        bankAccountNumber: form.bankAccountNumber.trim() || null,
        bankAccountName: form.bankAccountName.trim() || null,
        bankName: findBankName(form.bankName).trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
      });
      setOpen(false);
      setFiles([]);
      setForm((f) => ({ ...f, reasonSummary: "", reasonDetail: "" }));
      setMsg({ ok: "Đã gửi yêu cầu hoàn tiền. Kết quả xét duyệt sẽ được báo qua thông báo và email.", err: "" });
      load();
    } catch (err) {
      setMsg({ ok: "", err: err?.message || "Không gửi được yêu cầu hoàn tiền." });
    } finally { setBusy(false); }
  };

  if (state.loading) return null;
  const { payment, refunds, error } = state;
  if (error) return <p className="mt-5 text-sm text-rose-600">{error}</p>;
  if (!payment) return null;

  const active = refunds.find((r) => REFUND_OPEN_STATUSES.includes(r.status));
  const experienceDate = parseExperienceDate(booking.experienceDate);
  // Backend chỉ nhận yêu cầu TRƯỚC ngày trải nghiệm.
  // ⚠️ `now` lấy từ state (cập nhật khi load) thay vì gọi `Date.now()` trong render —
  // render phải thuần khiết (React Compiler / eslint react-hooks/purity).
  const beforeExperience = experienceDate ? experienceDate.getTime() > now : true;
  const inWindow = beforeExperience;

  return (
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="refund-title">
      <h2 id="refund-title" className="flex items-center gap-2 font-extrabold text-slate-900">
        <RotateCcw size={17} className="text-teal-700" />Hoàn tiền
      </h2>

      {msg.ok && (
        <p role="status" className="mt-3 flex items-start gap-1.5 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />{msg.ok}
        </p>
      )}

      {refunds.length > 0 && (
        <div className="mt-3 space-y-3 divide-y divide-slate-100">
          {refunds.map((r) => (
            <div key={r.id} className="pt-3 first:pt-0"><RefundSummary r={r} /></div>
          ))}
        </div>
      )}

      {!active && inWindow && !open && (
        <div className="mt-3">
          <p className="text-sm text-slate-600">
            Bạn có thể gửi yêu cầu hoàn tiền trước ngày trải nghiệm
            {experienceDate ? <> (<b>{experienceDate.toLocaleDateString("vi-VN")}</b>)</> : null}.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-3 cursor-pointer rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50"
          >
            Yêu cầu hoàn tiền
          </button>
        </div>
      )}

      {!active && !inWindow && refunds.length === 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-sm text-slate-500">
          <Info size={15} className="mt-0.5 shrink-0" />
          Tour đã bắt đầu hoặc hoàn thành trải nghiệm nên không gửi yêu cầu hoàn tiền trực tuyến được.
          Nếu có sự cố, hãy nhắn tin cho nhà tour qua mục Tin nhắn.
        </p>
      )}

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <RefundPolicyTable />

          <div>
            <label htmlFor="refund-summary" className="mb-1 block text-sm font-bold text-slate-800">
              Lý do ngắn gọn <span className="text-rose-600">*</span>
            </label>
            <LimitedField
              as="input"
              counter="always"
              limit={SUMMARY_MAX}
              id="refund-summary"
              value={form.reasonSummary}
              onChange={(e) => setForm((f) => ({ ...f, reasonSummary: e.target.value }))}
              placeholder="Ví dụ: Bị ốm đột xuất"
              className={input}
            />
          </div>

          <div>
            <label htmlFor="refund-detail" className="mb-1 block text-sm font-bold text-slate-800">
              Mô tả chi tiết <span className="text-rose-600">*</span>
            </label>
            <LimitedField
              as="textarea"
              counter="always"
              limit={DETAIL_MAX}
              id="refund-detail"
              rows={4}
              value={form.reasonDetail}
              onChange={(e) => setForm((f) => ({ ...f, reasonDetail: e.target.value }))}
              placeholder="Mô tả rõ tình huống: thời điểm xảy ra, bạn đã liên hệ ai, bằng chứng kèm theo…"
              className={`${input} resize-none`}
            />
          </div>

          {/* ⚠️ BẮT BUỘC: ảnh chụp biên lai giao dịch thành công. */}
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-800">
              <ShieldCheck size={15} className="text-teal-700" />
              Ảnh biên lai giao dịch <span className="text-rose-600">*</span>
            </p>
            <p className="mb-2 text-xs text-slate-500">
              Bắt buộc đính kèm ảnh chụp màn hình giao dịch thành công (tối đa {MAX_EVIDENCE_FILES} ảnh).
            </p>
            <div className="flex flex-wrap gap-2">
              {files.map((f) => (
                <div key={f.url || f.file.name} className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200">
                  {f.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.url} alt="Bằng chứng" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-400">
                      {f.uploading ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(f.file)}
                    aria-label="Xoá ảnh"
                    className="absolute right-1 top-1 cursor-pointer rounded-full bg-slate-900/70 p-0.5 text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {files.length < MAX_EVIDENCE_FILES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-700"
                >
                  <ImagePlus size={18} />
                  <span className="text-[10px] font-semibold">Thêm ảnh</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onPickFiles}
            />
          </div>

          {/*
            ⚠️ LUÔN LUÔN MỞ (không dùng <details>): trước đây khối này bị thu gọn nên
            nhiều người dùng không để ý ⇒ bỏ qua việc điền thông tin nhận tiền.
          */}
          <section
            className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 text-sm"
            aria-labelledby="refund-payout-title"
          >
            <h3 id="refund-payout-title" className="flex items-center gap-1.5 font-extrabold text-slate-900">
              <Info size={15} className="text-teal-700" />
              Thông tin liên hệ &amp; Tài khoản nhận tiền
            </h3>
            <p className="mt-1.5 text-xs text-slate-600">
              Thường tiền được hoàn về phương thức đã thanh toán qua VNPay. Chỉ cần điền khi
              quản trị viên chọn chuyển khoản thủ công — nhưng điền sẵn giúp xử lý nhanh hơn.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="refund-contact-phone" className="mb-1 block text-xs font-bold text-slate-700">
                  Số điện thoại liên hệ
                </label>
                <input
                  id="refund-contact-phone"
                  aria-label="Số điện thoại liên hệ"
                  placeholder="Số điện thoại liên hệ"
                  inputMode="tel"
                  maxLength={PHONE_MAX}
                  className={input}
                  value={form.contactPhone}
                  onChange={(e) => setForm((f) => ({ ...f, contactPhone: clamp(e.target.value, PHONE_MAX) }))}
                />
                <CharCount value={form.contactPhone} max={PHONE_MAX} />
              </div>
              <div>
                <label htmlFor="refund-contact-email" className="mb-1 block text-xs font-bold text-slate-700">
                  Email dự phòng
                </label>
                <input
                  id="refund-contact-email"
                  aria-label="Email dự phòng"
                  placeholder="Email dự phòng"
                  type="email"
                  maxLength={EMAIL_MAX}
                  className={input}
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: clamp(e.target.value, EMAIL_MAX) }))}
                />
                <CharCount value={form.contactEmail} max={EMAIL_MAX} />
              </div>
            </div>

            <div className="mt-1 grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="refund-bank-name" className="mb-1 block text-xs font-bold text-slate-700">
                  Ngân hàng
                </label>
                <select
                  id="refund-bank-name"
                  aria-label="Ngân hàng"
                  className={`${input} cursor-pointer appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-9`}
                  value={form.bankName}
                  onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                >
                  <option value="">— Chọn ngân hàng —</option>
                  {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="refund-bank-number" className="mb-1 block text-xs font-bold text-slate-700">
                  Số tài khoản
                </label>
                <input
                  id="refund-bank-number"
                  aria-label="Số tài khoản"
                  placeholder="Số tài khoản"
                  inputMode="numeric"
                  maxLength={BANK_ACCOUNT_NUMBER_MAX}
                  className={input}
                  value={form.bankAccountNumber}
                  onChange={(e) => setForm((f) => ({ ...f, bankAccountNumber: clamp(e.target.value, BANK_ACCOUNT_NUMBER_MAX) }))}
                />
                <CharCount value={form.bankAccountNumber} max={BANK_ACCOUNT_NUMBER_MAX} />
              </div>
              <div>
                <label htmlFor="refund-bank-name-owner" className="mb-1 block text-xs font-bold text-slate-700">
                  Tên chủ tài khoản
                </label>
                <input
                  id="refund-bank-name-owner"
                  aria-label="Tên chủ tài khoản"
                  placeholder="Tên chủ tài khoản"
                  maxLength={BANK_ACCOUNT_NAME_MAX}
                  className={input}
                  value={form.bankAccountName}
                  onChange={(e) => setForm((f) => ({ ...f, bankAccountName: clamp(e.target.value, BANK_ACCOUNT_NAME_MAX) }))}
                />
                <CharCount value={form.bankAccountName} max={BANK_ACCOUNT_NAME_MAX} />
              </div>
            </div>
          </section>

          {msg.err && (
            <p role="alert" className="flex items-start gap-1.5 text-sm font-semibold text-rose-600">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />{msg.err}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {busy && <Loader2 size={15} className="animate-spin" />}Gửi yêu cầu hoàn tiền
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"
            >
              Để sau
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/**
 * Hướng dẫn hoàn tiền — hiện ở tab "Đang hoàn tiền" / "Đã hoàn tiền" của trang Chuyến đi của tôi
 * (các đơn có yêu cầu hoàn tiền đã được gom vào 2 tab đó).
 */
export function RefundGuide() {
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p className="flex items-center gap-1.5 font-bold text-slate-900"><Info size={15} />Cách gửi yêu cầu</p>
        <p className="mt-1">Mở đơn đã thanh toán ở tab <b>Đã mua</b>, chọn &quot;Yêu cầu hoàn tiền&quot; trước ngày trải nghiệm.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p className="flex items-center gap-1.5 font-bold text-slate-900"><LifeBuoy size={15} />Mức hoàn</p>
        <p className="mt-1">
          Huỷ từ 7 ngày trở lên: hoàn 80%. Huỷ từ 3 đến 6 ngày (72 giờ – 6 ngày): hoàn 50%.
          Dưới 72 giờ (3 ngày): không hoàn. Lỗi từ nền tảng hoặc nhà tour: hoàn 100%
          sau khi quản trị viên xác minh.
        </p>
      </div>
    </div>
  );
}
