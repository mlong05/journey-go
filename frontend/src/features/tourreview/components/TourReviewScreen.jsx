"use client";

import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, Flag, BadgeCheck, MessageSquareWarning, Ban, Eye, FileText, History, CheckCircle2, XCircle, AlertTriangle, Info,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import TourContentView from "@/features/tourwizard/components/TourContentView";
import { TOUR_STATUS, REVIEW_CRITERIA, CRITERIA_MIN_TO_APPROVE, REJECTION_REASONS, STEP_LABEL } from "@/features/tourwizard/constants";
import { tourReviewService } from "../services/tourReviewService";
import FlaggableBlock, { ReviewNotesContext, anchorId } from "./FlaggableBlock";
import CustomerPreview from "./CustomerPreview";

const fmt = (iso) => (iso ? new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "");
const ACTION_LABEL = { SUBMITTED: "Gửi duyệt", APPROVED: "Đồng ý", CHANGES_REQUESTED: "Yêu cầu chỉnh sửa", REJECTED: "Từ chối" };
const statusLabel = (s) => (s ? TOUR_STATUS[s]?.label || s : "—");
const STEP_SHORT = { BASIC_INFO: "Thông tin cơ bản", PRICING: "Giá vé", STOPS: "Điểm đến", ITINERARY: "Lịch trình", SCHEDULE: "Lịch khởi hành" };
/** Lịch sử cũ lưu dạng "STOPS info: …" → "Điểm đến: …" (bản mới backend đã ghi tiếng Việt). */
const readableNote = (text) =>
  String(text).replace(/\b(BASIC_INFO|PRICING|STOPS|ITINERARY|SCHEDULE)(?: [\w.[\]]+)?:/g, (_, step) => `${STEP_SHORT[step]}:`);
let noteSeq = 0;

function RejectReasons({ value, onChange, other, onOther }) {
  const toggle = (code) => onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
  return (
    <div className="space-y-1.5">
      {/* 2 cột cho gọn — cột thao tác không cuộn */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        {REJECTION_REASONS.map((r) => (
          <label key={r.code} className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-700 cursor-pointer">
            <input type="checkbox" className="accent-rose-600 mt-0.5 shrink-0" checked={value.includes(r.code)} onChange={() => toggle(r.code)} />
            {r.label}
          </label>
        ))}
      </div>
      {value.includes("OTHER") && (
        <input value={other} onChange={(e) => onOther(e.target.value)} placeholder="Nội dung lý do khác"
          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400/30" />
      )}
    </div>
  );
}

const AFTER_DECISION_HREF = "/moderator";
const SCROLL = "[scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]";
const GENERAL_NOTE_MAX = 500;
const DECISION_COPY = {
  approve: { title: "Đã duyệt tour thành công", text: "Tour đang bán, slot đã được tạo và đối tác đã nhận thông báo, email.", Icon: CheckCircle2, tone: "emerald" },
  changes: { title: "Đã gửi yêu cầu chỉnh sửa thành công", text: "Tour chuyển sang Cần chỉnh sửa. Đã gửi thông báo và email kèm danh sách ghi chú cho đối tác.", Icon: MessageSquareWarning, tone: "amber" },
  reject: { title: "Đã từ chối tour thành công", text: "Đã gửi thông báo và email kèm lý do từ chối cho đối tác.", Icon: Ban, tone: "rose" },
};
const TONE = {
  emerald: "bg-emerald-50 ring-emerald-50/60 text-emerald-600",
  amber: "bg-orange-50 ring-orange-50/60 text-orange-500",
  rose: "bg-rose-50 ring-rose-50/60 text-rose-600",
};

const NOTICE_MS = 2500;

/**
 * Hộp thông báo thành công giữa màn hình (trang phía sau mờ đi).
 * Hiện khoảng 2.5 giây rồi chuyển về Bàn làm việc (trang đích được prefetch sẵn).
 */
function DecisionNotice({ kind, onDone }) {
  useEffect(() => {
    // Giữ thông báo khoảng 2.5 giây rồi mới chuyển trang (chỉ một lần khi hiện)
    const t = setTimeout(onDone, NOTICE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { title, text, Icon, tone } = DECISION_COPY[kind];
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div role="status" aria-live="polite"
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-100 p-6 text-center space-y-3 animate-in zoom-in-95 fade-in duration-300">
        <div className={`mx-auto w-14 h-14 rounded-full ring-8 flex items-center justify-center ${TONE[tone]}`}>
          <Icon size={26} />
        </div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-600 leading-relaxed">{text}</p>
        <p className="text-[11px] text-slate-400 inline-flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Đang chuyển về Bàn làm việc…
        </p>
      </div>
    </div>
  );
}

/** Màn hình "Content Moderator – Review Tour". */
export default function TourReviewScreen({ tourId }) {
  const router = useRouter();
  const [tour, setTour] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("content"); // content | preview | history
  const [notes, setNotes] = useState([]);
  const [criteria, setCriteria] = useState({});
  const [openHint, setOpenHint] = useState(null); // tiêu chí đang mở mô tả
  const [generalNote, setGeneralNote] = useState("");
  const [rejectMode, setRejectMode] = useState(false);
  const [reasons, setReasons] = useState([]);
  const [otherReason, setOtherReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [done, setDone] = useState(null);
  const { confirm, confirmDialog } = useConfirm();

  // Tải trước Bàn làm việc để sau khi duyệt chuyển trang gần như tức thì.
  useEffect(() => { router.prefetch(AFTER_DECISION_HREF); }, [router]);

  // Cache Components giữ nguyên state của trang khi điều hướng đi rồi quay lại (React <Activity> ẩn trang
  // thay vì gỡ). Nếu không xoá, mở lại tour vừa duyệt sẽ hiện lại hộp "Đã duyệt tour thành công" và tự
  // chuyển về Bàn làm việc, không xem được tour. Cleanup chạy đồng bộ ngay khi trang bị ẩn.
  useLayoutEffect(() => {
    if (!done) return undefined;
    return () => {
      setDone(null);
      setNotes([]);
      setCriteria({});
      setGeneralNote("");
      setRejectMode(false);
      setReasons([]);
      setOtherReason("");
      setActionError("");
      setTab("content");
    };
  }, [done]);

  useEffect(() => {
    let alive = true;
    Promise.all([tourReviewService.detail(tourId), tourReviewService.history(tourId).catch(() => null)])
      .then(([detail, hist]) => { if (alive) { setTour(detail); setReview(hist); } })
      .catch((err) => alive && setError(err?.message || "Không tải được tour."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [tourId]);

  const pending = tour?.status === "PENDING_REVIEW";
  const answered = REVIEW_CRITERIA.every((c) => typeof criteria[c.key] === "boolean");
  const passed = REVIEW_CRITERIA.filter((c) => criteria[c.key] === true).length;
  const canApprove = pending && answered && passed >= CRITERIA_MIN_TO_APPROVE && notes.length === 0;
  const canRequest = pending && answered && notes.length > 0;
  const canReject = pending && answered && (reasons.length > 0 || generalNote.trim()) && (!reasons.includes("OTHER") || otherReason.trim());
  const noteBody = () => generalNote.trim() || null;

  const notesCtx = useMemo(() => ({
    notes,
    readOnly: !pending,
    addNote: (n) => setNotes((prev) => [...prev, { ...n, localId: `n${++noteSeq}` }]),
    removeNote: (id) => setNotes((prev) => prev.filter((n) => n.localId !== id)),
  }), [notes, pending]);

  const scrollTo = (n) => {
    setTab("content");
    setTimeout(() => document.getElementById(anchorId(n))?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const criteriaBody = () => Object.fromEntries(REVIEW_CRITERIA.map((c) => [c.key, criteria[c.key]]));
  const notesBody = () => notes.map(({ step, stopId, field, note }) => ({ step, stopId: stopId ?? null, field, note }));

  const runAction = async (kind) => {
    const copy = {
      approve: { tone: "success", icon: "check", title: "Bạn có chắc chắn không?", confirmLabel: "Đồng ý duyệt",
        description: "Tour sẽ chuyển sang Đang bán, hệ thống chốt điểm thưởng, tạo slot theo lịch và gửi email cho đối tác." },
      changes: { tone: "warning", icon: "warning", title: "Bạn có chắc chắn không?", confirmLabel: "Gửi yêu cầu chỉnh sửa",
        description: `Gửi ${notes.length} ghi chú cho đối tác. Tour chuyển sang Cần chỉnh sửa.` },
      reject: { tone: "danger", icon: "reject", title: "Bạn có chắc chắn không?", confirmLabel: "Từ chối tour",
        description: "Tour chuyển sang Bị từ chối và đối tác nhận email kèm lý do." },
    }[kind];
    const ok = await confirm({ ...copy, subject: tour.title });
    if (!ok) return;
    setBusy(true);
    setActionError("");
    try {
      if (kind === "approve") {
        await tourReviewService.approve(tourId, { note: noteBody(), criteria: criteriaBody() });
      } else if (kind === "changes") {
        await tourReviewService.requestChanges(tourId, { note: noteBody(), criteria: criteriaBody(), notes: notesBody() });
      } else {
        await tourReviewService.reject(tourId, {
          note: noteBody(), criteria: criteriaBody(), notes: notesBody(),
          reason: reasons.length ? reasons.join(",") : null,
          otherReason: reasons.includes("OTHER") ? otherReason : null,
        });
      }
      setDone(kind);
    } catch (err) {
      const issues = err?.payload?.data;
      setActionError(Array.isArray(issues)
        ? `${err.message}: ${issues.map((i) => `${STEP_LABEL[i.step] || i.step} – ${i.message}`).join("; ")}`
        : err?.message || "Thao tác thất bại.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="py-24 flex justify-center gap-2 text-slate-500 text-sm"><Loader2 size={18} className="animate-spin" />Đang tải tour…</div>;
  if (error || !tour) return <div className="py-24 text-center text-sm font-bold text-rose-600">{error || "Không tìm thấy tour."}</div>;

  const meta = TOUR_STATUS[tour.status] || TOUR_STATUS.DRAFT;

  return (
    <ReviewNotesContext.Provider value={notesCtx}>
      {confirmDialog}
      {done && <DecisionNotice kind={done} onDone={() => router.push(AFTER_DECISION_HREF)} />}
      {/* 2 cột chạy từ trên cùng. Trái: header + tab đứng yên, chỉ nội dung tự cuộn. Phải: cột tổng hợp đứng yên. */}
      <div className={`flex-1 min-h-0 h-full grid grid-cols-1 xl:grid-cols-[1fr_360px] xl:grid-rows-[minmax(0,1fr)] gap-5 overflow-y-auto xl:overflow-hidden ${SCROLL}`}>
        <div className="min-w-0 xl:min-h-0 xl:h-full flex flex-col gap-4">
        <div className="shrink-0 flex items-center gap-3">
          <button type="button" onClick={() => router.push("/moderator/tours")} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer" aria-label="Quay lại"><ArrowLeft size={16} /></button>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wide">Thẩm định tour</p>
            <h1 className="text-lg font-bold text-slate-900 truncate">{tour.title}</h1>
          </div>
          <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold shrink-0 ${meta.cls}`}>{meta.label}</span>
        </div>

        {!pending && (
          <div className="shrink-0 p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
            Tour không ở trạng thái Chờ duyệt — chỉ xem nội dung và lịch sử kiểm duyệt.
          </div>
        )}

        <div className="shrink-0 flex gap-1.5">
          {[["content", "Nội dung tour", FileText], ["preview", "Xem trước phía khách", Eye], ["history", "Lịch sử kiểm duyệt", History]].map(([k, l, Icon]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${tab === k ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
              <Icon size={13} />{l}
            </button>
          ))}
        </div>

          <div className={`min-w-0 xl:flex-1 xl:min-h-0 xl:overflow-y-auto xl:pr-1 pb-6 ${SCROLL}`}>
            {/* Tab "Xem trước": cột trái vẫn hiện nội dung để đối chiếu, điện thoại nằm ở cột phải */}
            {(tab === "content" || tab === "preview") && (
              <>
                {pending && <p className="text-[11px] text-slate-500 mb-2">Rê chuột vào từng khối để <b>Gắn cờ / Ghi chú</b>. Khối bị gắn cờ có viền cam.</p>}
                <TourContentView tour={tour} Block={FlaggableBlock} />

                {/* Ghi chú gắn cờ — cuối nội dung tour */}
                <section className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Flag size={14} className="text-orange-500" />Ghi chú ({notes.length})</h3>
                  {notes.length === 0 ? (
                    <p className="text-[11px] text-slate-400">Chưa có ghi chú. Gắn cờ trên khối nội dung để thêm.</p>
                  ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      {notes.map((n) => (
                        <li key={n.localId}>
                          <button type="button" onClick={() => scrollTo(n)} title="Đi tới khối nội dung này"
                            className="w-full h-full text-left p-2 rounded-lg border border-orange-200 bg-orange-50/60 hover:bg-orange-50 text-xs cursor-pointer">
                            <span className="block font-bold text-orange-800">{n.label}</span>
                            <span className="block text-slate-700">{n.note}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
            {tab === "history" && (
              <ol className="space-y-2">
                {(review?.history || []).slice().reverse().map((h, i) => (
                  <li key={i} className="p-3 rounded-xl border border-slate-200 bg-white text-xs space-y-0.5">
                    <p className="font-bold text-slate-800">{ACTION_LABEL[h.action] || h.action} · {h.actorName || "—"} · {fmt(h.createdAt)}</p>
                    <p className="text-slate-500">{statusLabel(h.fromStatus)} → {statusLabel(h.toStatus)}</p>
                    {h.note && <p className="text-slate-700">{readableNote(h.note)}</p>}
                    {h.reason && <p className="text-rose-700">Lý do: {h.reason}{h.otherReason ? ` (${h.otherReason})` : ""}</p>}
                  </li>
                ))}
                {!(review?.history || []).length && <p className="text-xs text-slate-400">Chưa có lịch sử.</p>}
              </ol>
            )}
          </div>
        </div>

          {/* Cột phải (cao hết màn hình, không cuộn):
              - Tab "Xem trước phía khách": điện thoại mô phỏng (thay cho tiêu chí → máy lớn hơn).
              - Tab khác: tiêu chí + ghi chú chung + nút thao tác. */}
          <aside className="flex flex-col gap-3 xl:min-h-0 xl:h-full xl:overflow-hidden pb-6 xl:pb-0">
            {tab === "preview" ? (
              <CustomerPreview tour={tour} />
            ) : (
            <>
            <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Tiêu chí kiểm duyệt</h3>
                <span className={`text-xs font-bold ${passed >= CRITERIA_MIN_TO_APPROVE ? "text-emerald-700" : "text-slate-500"}`}>Đạt {passed}/5</span>
              </div>
              <p className="text-[11px] text-slate-500">Đánh giá đủ 5 tiêu chí. Cần tối thiểu {CRITERIA_MIN_TO_APPROVE}/5 để duyệt. Bấm <Info size={10} className="inline -mt-0.5" /> để xem mô tả.</p>
              {REVIEW_CRITERIA.map((c) => (
                <div key={c.key} className="px-2 py-1.5 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    {/* Ô nhỏ: bấm để hiện / ẩn mô tả tiêu chí */}
                    <button type="button" onClick={() => setOpenHint((k) => (k === c.key ? null : c.key))}
                      aria-expanded={openHint === c.key} title="Xem mô tả tiêu chí"
                      className="min-w-0 flex items-center gap-1 text-left text-xs font-bold text-slate-800 hover:text-teal-700 cursor-pointer">
                      <span className="truncate">{c.label}</span>
                      <Info size={12} className={`shrink-0 transition-colors ${openHint === c.key ? "text-teal-600" : "text-slate-400"}`} />
                    </button>
                    <div className="flex gap-1 shrink-0">
                      <button type="button" disabled={!pending} onClick={() => setCriteria((p) => ({ ...p, [c.key]: true }))}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold inline-flex items-center gap-0.5 cursor-pointer ${criteria[c.key] === true ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                        <CheckCircle2 size={11} />Đạt
                      </button>
                      <button type="button" disabled={!pending} onClick={() => setCriteria((p) => ({ ...p, [c.key]: false }))}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold inline-flex items-center gap-0.5 cursor-pointer ${criteria[c.key] === false ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                        <XCircle size={11} />Không
                      </button>
                    </div>
                  </div>
                  {openHint === c.key && (
                    <p className="mt-1.5 px-2 py-1.5 rounded-md bg-teal-50/70 text-[11px] text-teal-900 leading-relaxed animate-in fade-in slide-in-from-top-2 duration-150">
                      {c.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {pending && (
              <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2">
                {/* Ghi chú chung: cao cố định, không kéo giãn → cột không tràn màn hình */}
                <div className="relative">
                  <textarea rows={2} maxLength={GENERAL_NOTE_MAX} value={generalNote}
                    onChange={(e) => setGeneralNote(e.target.value)} placeholder="Ghi chú chung (không bắt buộc)"
                    className={`block w-full h-[60px] resize-none overflow-y-auto pl-2.5 pr-2.5 pt-2 pb-4 rounded-lg border border-slate-200 text-xs leading-snug text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${SCROLL}`} />
                  <span className="pointer-events-none absolute right-2 bottom-1 text-[10px] text-slate-400 tabular-nums">
                    {generalNote.length}/{GENERAL_NOTE_MAX}
                  </span>
                </div>

                {rejectMode && (
                  <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/50 space-y-1.5">
                    <p className="text-[11px] font-bold text-rose-700">Lý do từ chối (chọn mã hoặc nhập ghi chú chung)</p>
                    <RejectReasons value={reasons} onChange={setReasons} other={otherReason} onOther={setOtherReason} />
                  </div>
                )}

                {actionError && <p className="text-[11px] font-bold text-rose-600 flex items-start gap-1"><AlertTriangle size={12} className="mt-px shrink-0" />{actionError}</p>}

                <button type="button" disabled={!canApprove || busy} onClick={() => runAction("approve")}
                  title={notes.length ? "Còn ghi chú lỗi — hãy gửi yêu cầu chỉnh sửa" : !answered ? "Đánh giá đủ 5 tiêu chí" : passed < 3 ? "Cần đạt tối thiểu 3/5 tiêu chí" : ""}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer">
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <BadgeCheck size={15} />} Đồng ý
                </button>
                {notes.length > 0 && <p className="text-[11px] text-orange-700 -mt-1.5">Nút Đồng ý bị khóa vì còn {notes.length} ghi chú lỗi.</p>}
                <button type="button" disabled={!canRequest || busy} onClick={() => runAction("changes")}
                  className="w-full py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer">
                  <MessageSquareWarning size={15} /> Gửi yêu cầu sửa đổi
                </button>
                {answered && notes.length === 0 && (
                  <p className="text-[11px] text-slate-500 -mt-1.5">
                    Cần <b>Gắn cờ / Ghi chú</b> ít nhất 1 khối nội dung bên trái (ghi chú chung không tính).
                  </p>
                )}
                {!rejectMode ? (
                  <button type="button" onClick={() => setRejectMode(true)}
                    className="w-full py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer">
                    <Ban size={15} /> Từ chối…
                  </button>
                ) : (
                  <button type="button" disabled={!canReject || busy} onClick={() => runAction("reject")}
                    className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer">
                    <Ban size={15} /> Xác nhận từ chối
                  </button>
                )}
                {!answered && <p className="text-[11px] text-slate-500">Hãy đánh giá đủ 5 tiêu chí để mở các nút thao tác.</p>}
              </div>
            )}
            </>
            )}
          </aside>
      </div>
    </ReviewNotesContext.Provider>
  );
}
