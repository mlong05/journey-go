"use client";

import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, MapPin, Timer, HelpCircle, Footprints, CheckCircle2, QrCode } from "lucide-react";
import GoongMapPickerModal from "@/features/destination/components/GoongMapPickerModal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Field, TextInput, NumberInput, PointsBadge } from "../FormKit";
import QuestionEditor, { emptyQuestion } from "./QuestionEditor";
import CheckpointMap from "./CheckpointMap";
import ExperienceQr, { newExperienceQrToken } from "./ExperienceQr";
import { LIMITS } from "../../constants";

let keySeq = 0;
const newKey = () => `a${Date.now().toString(36)}${(keySeq++).toString(36)}`;

const LETTERS = ["A", "B", "C", "D"];

const blankQuiz = () => ({ ...emptyQuestion(), type: "MULTIPLE_CHOICE", _key: newKey() });
const blankExperience = () => ({
  _key: newKey(),
  activityName: "",
  checkpointLatitude: null,
  checkpointLongitude: null,
  radiusMeters: LIMITS.RADIUS_DEFAULT,
  durationSeconds: 600,
  qrToken: newExperienceQrToken(),
  question: { ...emptyQuestion(), type: "TEXT", answers: [] },
});

const hasAcceptedAnswer = (value) => (value || "").split(";").some((s) => s.trim());

/** Lỗi của form câu quiz (trắc nghiệm) — khớp luật backend; null = hợp lệ. */
function quizError(q) {
  if (!q.content?.trim()) return "Vui lòng nhập nội dung câu hỏi.";
  if (q.answers.length !== 4 || q.answers.some((a) => !a.content?.trim())) return "Câu hỏi cần đủ 4 đáp án.";
  if (q.answers.filter((a) => a.correct).length !== 1) return "Chọn đúng 1 đáp án đúng.";
  return null;
}

/** Lỗi của form trải nghiệm thực tế; null = hợp lệ. */
function experienceError(e) {
  if (!e.activityName?.trim()) return "Vui lòng nhập tên hoạt động.";
  if (e.checkpointLatitude == null || e.checkpointLongitude == null) return "Vui lòng chọn checkpoint trên bản đồ.";
  if (e.radiusMeters == null || e.radiusMeters < LIMITS.RADIUS_MIN || e.radiusMeters > LIMITS.RADIUS_MAX) {
    return `Bán kính phải từ ${LIMITS.RADIUS_MIN} đến ${LIMITS.RADIUS_MAX} mét.`;
  }
  if (!e.durationSeconds || e.durationSeconds <= 0) return "Vui lòng nhập thời gian trải nghiệm.";
  if (!e.question?.content?.trim()) return "Vui lòng nhập câu hỏi sau trải nghiệm.";
  if (!hasAcceptedAnswer(e.question?.referenceAnswer)) return "Vui lòng nhập đáp án đúng cho câu hỏi sau trải nghiệm.";
  return null;
}

const durationText = (seconds) => {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m ? `${m} phút` : ""}${m && s ? " " : ""}${s ? `${s} giây` : ""}`;
};

/* ── Dòng tóm tắt (đã lưu) ───────────────────────────────────────────────── */

function SummaryRow({ index, title, detail, points, pointsLabel, error, onEdit, onRemove, disabled, readOnly }) {
  return (
    <li className={`px-3.5 py-3 flex items-start gap-3 ${error ? "bg-rose-50/40" : "bg-white"}`}>
      <span className="w-6 shrink-0 pt-0.5 text-xs font-bold text-slate-400 tabular-nums">{index}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 break-words">{title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5 break-words">{detail}</p>
        {error && <p className="text-[11px] font-bold text-rose-600 mt-1">{error}</p>}
      </div>
      {points != null && <PointsBadge points={points} label={pointsLabel} />}
      {!readOnly && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" title="Sửa" aria-label="Sửa" disabled={disabled} onClick={onEdit}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 inline-flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-default">
            <Pencil size={14} />
          </button>
          <button type="button" title="Xóa" aria-label="Xóa" disabled={disabled} onClick={onRemove}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 inline-flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-default">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </li>
  );
}

function FormActions({ onCancel, onSave, saveLabel }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <button type="button" onClick={onCancel}
        className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer">
        Hủy
      </button>
      <button type="button" onClick={onSave}
        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
        <CheckCircle2 size={13} /> {saveLabel}
      </button>
    </div>
  );
}

function AddButton({ onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full px-3 py-2.5 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-300 text-xs font-bold text-emerald-800 inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
      <Plus size={14} /> {children}
    </button>
  );
}

/* ── Editor ──────────────────────────────────────────────────────────────── */

/**
 * Tab "Trải nghiệm" của một điểm đến, 2 khu riêng:
 *  - Câu hỏi (quiz): chỉ trắc nghiệm (4 đáp án, 1 đúng), tối đa 4 câu.
 *  - Trải nghiệm thực tế: hoạt động (checkpoint, bán kính, đếm ngược) + 1 câu hỏi nhập chữ có đáp án đúng, tối đa 5.
 * Ban đầu trống; "Thêm" mở 1 form, "Lưu" thu form thành dòng tóm tắt. Chỉ mở 1 form một lúc.
 * onChange(patch, touchedPaths) cập nhật bản nháp điểm đến; onEditingChange(bool) báo còn form đang mở.
 */
export default function StopActivitiesEditor({ stop, onChange, readOnly, stopErr, quizPoints, experiencePoints, onEditingChange }) {
  const { confirm, confirmDialog } = useConfirm();
  // { kind: "quiz" | "experience", index: number | null (null = thêm mới), draft, error }
  const [editing, setEditing] = useState(null);
  const [pickMap, setPickMap] = useState(false);
  // Giá trị phẳng (có kiểm tra null) — React Compiler ghi nhớ theo các biến này, không đọc thẳng editing.x khi editing = null.
  const openKind = editing?.kind ?? null;
  const openIndex = editing?.index ?? null;
  const draft = editing?.draft ?? null;
  const formError = editing?.error ?? null;

  useEffect(() => { onEditingChange?.(!!editing); }, [editing, onEditingChange]);

  const quiz = stop.quiz || [];
  const experiences = stop.experiences || [];

  const startAdd = (kind) => setEditing({ kind, index: null, draft: kind === "quiz" ? blankQuiz() : blankExperience(), error: null });
  const startEdit = (kind, index) => {
    const source = kind === "quiz" ? quiz[index] : experiences[index];
    const draft = structuredClone(source);
    if (kind === "experience" && !draft.qrToken) draft.qrToken = newExperienceQrToken();
    setEditing({ kind, index, draft, error: null });
  };
  const setDraft = (patch) => setEditing((prev) => ({ ...prev, draft: { ...prev.draft, ...patch }, error: null }));

  const saveDraft = () => {
    if (!draft) return;
    const kind = openKind;
    const index = openIndex;
    const error = kind === "quiz" ? quizError(draft) : experienceError(draft);
    if (error) {
      setEditing((prev) => ({ ...prev, error }));
      return;
    }
    const list = kind === "quiz" ? quiz : experiences;
    const next = index == null ? [...list, draft] : list.map((item, j) => (j === index ? draft : item));
    const field = kind === "quiz" ? "quiz" : "experiences";
    onChange({ [field]: next }, [index == null ? field : `${field}[${index}]`]);
    setEditing(null);
  };

  const remove = async (kind, index) => {
    const list = kind === "quiz" ? quiz : experiences;
    const ok = await confirm({
      tone: "danger", icon: "trash",
      title: kind === "quiz" ? "Xóa câu hỏi này?" : "Xóa trải nghiệm này?",
      subject: kind === "quiz" ? list[index].content || `Câu ${index + 1}` : list[index].activityName || `Trải nghiệm ${index + 1}`,
      confirmLabel: "Xóa",
    });
    if (!ok) return;
    const field = kind === "quiz" ? "quiz" : "experiences";
    onChange({ [field]: list.filter((_, j) => j !== index) }, [field]);
  };

  const isOpen = (kind, index) => openKind === kind && openIndex === index;
  const busy = openKind != null;

  /* ── Form câu quiz ── */
  const quizForm = (label) => (
    <div className="p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50/30 space-y-2.5">
      <QuestionEditor label={label} value={draft} fixedType="MULTIPLE_CHOICE" points={quizPoints}
        onChange={(q) => setDraft({ ...q })} />
      {formError && <p className="text-[11px] font-bold text-rose-600">{formError}</p>}
      <FormActions onCancel={() => setEditing(null)} onSave={saveDraft} saveLabel="Lưu câu hỏi" />
    </div>
  );

  /* ── Form trải nghiệm ── */
  const experienceForm = (label) => {
    const d = draft;
    const mins = d.durationSeconds != null ? Math.floor(d.durationSeconds / 60) : null;
    const secs = d.durationSeconds != null ? d.durationSeconds % 60 : null;
    const setDur = (m, s) => {
      const total = (m || 0) * 60 + (s || 0);
      setDraft({ durationSeconds: total > 0 ? total : null });
    };
    return (
      <div className="p-3.5 rounded-xl border-2 border-emerald-200 bg-emerald-50/30 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700">{label}</span>
          {experiencePoints != null && <PointsBadge points={experiencePoints} label="điểm / trải nghiệm" />}
        </div>
        <Field label="Tên hoạt động" required>
          <TextInput value={d.activityName} maxLength={200} placeholder="Ví dụ: Đục hoa văn sen cùng nghệ nhân"
            onChange={(e) => setDraft({ activityName: e.target.value })} />
        </Field>
        <Field label="Checkpoint" required
          hint="Khách đi theo bản đồ trên app; vào trong bán kính sẽ hiện nút Bắt đầu trải nghiệm.">
          <CheckpointMap latitude={d.checkpointLatitude} longitude={d.checkpointLongitude} radius={d.radiusMeters} />
          <button type="button" onClick={() => setPickMap(true)}
            className="mt-2 px-3 py-1.5 rounded-lg border border-emerald-200 bg-white text-emerald-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-emerald-50">
            <MapPin size={13} /> {d.checkpointLatitude ? "Đổi vị trí trên bản đồ" : "Chọn vị trí trên bản đồ"}
          </button>
        </Field>
        {/* Gợi ý hai ô dài ngắn khác nhau: đẩy ô nhập xuống đáy để hai hàng input luôn thẳng nhau */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 [&>div]:flex [&>div]:flex-col [&>div>*:nth-child(3)]:mt-auto">
          <Field label="Phạm vi (bán kính)" required hint={`Từ ${LIMITS.RADIUS_MIN}–${LIMITS.RADIUS_MAX} mét quanh checkpoint.`}>
            <NumberInput value={d.radiusMeters} min={LIMITS.RADIUS_MIN} max={LIMITS.RADIUS_MAX} suffix="mét"
              onChange={(v) => setDraft({ radiusMeters: v })} />
          </Field>
          <Field label="Thời gian trải nghiệm" required hint="Đếm ngược trên app; hết giờ khách quét mã QR bên dưới.">
            <div className="grid grid-cols-2 gap-2">
              <NumberInput value={mins} min={0} max={1439} suffix="phút" onChange={(m) => setDur(m, secs)} />
              <NumberInput value={secs} min={0} max={59} suffix="giây" onChange={(s) => setDur(mins, s)} />
            </div>
          </Field>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-slate-700">Quét mã QR sau khi trải nghiệm</p>
          <ExperienceQr token={d.qrToken} label={d.activityName} />
        </div>
        <QuestionEditor label="Câu hỏi sau trải nghiệm (khách nhập chữ)" value={d.question} fixedType="TEXT"
          onChange={(question) => setDraft({ question })} />
        {formError && <p className="text-[11px] font-bold text-rose-600">{formError}</p>}
        <FormActions onCancel={() => setEditing(null)} onSave={saveDraft} saveLabel="Lưu trải nghiệm" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {confirmDialog}

      {/* ── Giai đoạn 1: Câu hỏi (quiz) ── */}
      <section className="space-y-2.5">
        <h4 className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
          <HelpCircle size={14} className="text-emerald-600" /> Câu hỏi (quiz) – trắc nghiệm ({quiz.length}/{LIMITS.QUIZ_MAX})
        </h4>
        {stopErr("quiz") && <p className="text-[11px] font-bold text-rose-600">{stopErr("quiz")}</p>}

        {quiz.length === 0 && !isOpen("quiz", null) && (
          <p className="px-3 py-2.5 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">Chưa có câu hỏi nào.</p>
        )}
        {quiz.length > 0 && (
          <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {quiz.map((q, i) => (isOpen("quiz", i) ? (
              <li key={q._key} className="p-2">{quizForm(`Câu ${i + 1}`)}</li>
            ) : (
              <SummaryRow key={q._key} index={i + 1} title={q.content || "(chưa có nội dung)"}
                detail={(() => {
                  const k = q.answers.findIndex((a) => a.correct);
                  return k >= 0 ? `Đáp án đúng: ${LETTERS[k]}. ${q.answers[k].content}` : "Chưa chọn đáp án đúng";
                })()}
                points={quizPoints} pointsLabel="điểm" error={stopErr(`quiz[${i}]`)}
                disabled={busy} readOnly={readOnly}
                onEdit={() => startEdit("quiz", i)} onRemove={() => remove("quiz", i)} />
            )))}
          </ul>
        )}
        {isOpen("quiz", null) && quizForm(`Câu ${quiz.length + 1}`)}
        {!readOnly && !busy && quiz.length < LIMITS.QUIZ_MAX && (
          <AddButton onClick={() => startAdd("quiz")}>Thêm câu hỏi</AddButton>
        )}
      </section>

      {/* ── Giai đoạn 2: Trải nghiệm thực tế ── */}
      <section className="space-y-2.5">
        <h4 className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
          <Footprints size={14} className="text-emerald-600" /> Trải nghiệm thực tế ({experiences.length}/{LIMITS.EXPERIENCES_MAX})
        </h4>
        {stopErr("experiences") && <p className="text-[11px] font-bold text-rose-600">{stopErr("experiences")}</p>}

        {experiences.length === 0 && !isOpen("experience", null) && (
          <p className="px-3 py-2.5 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">Chưa có trải nghiệm nào.</p>
        )}
        {experiences.length > 0 && (
          <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {experiences.map((e, i) => (isOpen("experience", i) ? (
              <li key={e._key} className="p-2">{experienceForm(`Trải nghiệm ${i + 1}`)}</li>
            ) : (
              <SummaryRow key={e._key} index={i + 1} title={e.activityName || "(chưa có tên hoạt động)"}
                detail={
                  <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                    <span className="inline-flex items-center gap-1"><MapPin size={11} />{e.radiusMeters ?? "—"} m</span>
                    <span className="inline-flex items-center gap-1"><Timer size={11} />{durationText(e.durationSeconds)}</span>
                    <span>Câu hỏi: {e.question?.content || "—"}</span>
                    <span>Đáp án: {e.question?.referenceAnswer || "—"}</span>
                    {e.qrToken && !readOnly && <span className="inline-flex items-center gap-1 font-mono"><QrCode size={11} />{e.qrToken}</span>}
                    {e.qrToken && readOnly && (
                      <span className="basis-full pt-1.5"><ExperienceQr token={e.qrToken} label={e.activityName} compact /></span>
                    )}
                  </span>
                }
                points={experiencePoints} pointsLabel="điểm" error={stopErr(`experiences[${i}]`)}
                disabled={busy} readOnly={readOnly}
                onEdit={() => startEdit("experience", i)} onRemove={() => remove("experience", i)} />
            )))}
          </ul>
        )}
        {isOpen("experience", null) && experienceForm(`Trải nghiệm ${experiences.length + 1}`)}
        {!readOnly && !busy && experiences.length < LIMITS.EXPERIENCES_MAX && (
          <AddButton onClick={() => startAdd("experience")}>Thêm trải nghiệm</AddButton>
        )}
      </section>

      {pickMap && openKind === "experience" && draft && (
        <GoongMapPickerModal
          isOpen
          onClose={() => setPickMap(false)}
          placeName={draft.activityName || stop.name}
          initialLatitude={draft.checkpointLatitude}
          initialLongitude={draft.checkpointLongitude}
          onSelect={({ latitude, longitude }) =>
            setDraft({ checkpointLatitude: Number(latitude), checkpointLongitude: Number(longitude) })}
        />
      )}
    </div>
  );
}
