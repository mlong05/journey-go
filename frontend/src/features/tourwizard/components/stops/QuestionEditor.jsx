"use client";

import React from "react";
import { CheckCircle2, Circle, Trash2, ListChecks, PenLine } from "lucide-react";
import { TextInput, TextArea, PointsBadge } from "../FormKit";

/** Dạng câu hỏi — khớp enum QuestionType ở backend. */
export const QUESTION_TYPES = [
  { key: "MULTIPLE_CHOICE", label: "Trắc nghiệm", Icon: ListChecks },
  { key: "TEXT", label: "Tự luận", Icon: PenLine },
];

const emptyAnswers = () => Array.from({ length: 4 }, (_, i) => ({ content: "", correct: i === 0 }));

export const emptyQuestion = () => ({
  type: "MULTIPLE_CHOICE",
  content: "",
  answers: emptyAnswers(),
  referenceAnswer: "",
});

/** Chuẩn hóa câu hỏi từ server: luôn đủ 4 đáp án (giữ lại để đổi qua lại giữa 2 dạng). */
export const normalizeQuestion = (q) => {
  const answers = (q?.answers || []).map((a) => ({ content: a.content || "", correct: !!a.correct }));
  while (answers.length < 4) answers.push({ content: "", correct: answers.length === 0 });
  return {
    type: q?.type === "TEXT" ? "TEXT" : "MULTIPLE_CHOICE",
    content: q?.content || "",
    answers: answers.slice(0, 4),
    referenceAnswer: q?.referenceAnswer || "",
  };
};

/** Dữ liệu gửi lên API: tự luận không kèm đáp án lựa chọn. */
export const questionBody = (q) => (q.type === "TEXT"
  ? { type: "TEXT", content: q.content, answers: [], referenceAnswer: q.referenceAnswer || null }
  : {
    type: "MULTIPLE_CHOICE",
    content: q.content,
    answers: q.answers.map((a) => ({ content: a.content, correct: !!a.correct })),
    referenceAnswer: null,
  });

/**
 * Soạn một câu hỏi.
 * - Trắc nghiệm: 4 đáp án, chọn đúng 1 đáp án đúng.
 * - Tự luận (khi allowTypes): khách nhập câu trả lời; đối tác ghi đáp án gợi ý nếu muốn.
 */
export default function QuestionEditor({ index, label, value, onChange, onRemove, readOnly, points, error, allowTypes = false }) {
  const q = value || emptyQuestion();
  const isText = allowTypes && q.type === "TEXT";
  const setAnswer = (i, patch) =>
    onChange({ ...q, answers: q.answers.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
  const markCorrect = (i) => onChange({ ...q, answers: q.answers.map((a, j) => ({ ...a, correct: j === i })) });
  const correctCount = q.answers.filter((a) => a.correct).length;

  return (
    <div className={`p-3 rounded-xl border ${error ? "border-rose-300 bg-rose-50/30" : "border-slate-200 bg-white"} space-y-2.5`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700">{label || `Câu ${index + 1}`}</span>
        <div className="flex items-center gap-2">
          {points != null && <PointsBadge points={points} label={isText ? "điểm / câu" : "điểm / câu đúng"} />}
          {onRemove && !readOnly && (
            <button type="button" title="Xóa câu hỏi" onClick={onRemove}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {allowTypes && (
        <div className="inline-flex p-0.5 rounded-lg bg-slate-100" role="radiogroup" aria-label="Dạng câu hỏi">
          {QUESTION_TYPES.map(({ key, label: typeLabel, Icon }) => {
            const active = (q.type || "MULTIPLE_CHOICE") === key;
            return (
              <button key={key} type="button" role="radio" aria-checked={active} disabled={readOnly}
                onClick={() => !active && onChange({ ...q, type: key })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-default ${active ? "bg-white text-emerald-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}>
                <Icon size={12} />{typeLabel}
              </button>
            );
          })}
        </div>
      )}

      <TextInput value={q.content} disabled={readOnly} placeholder={isText ? "Nội dung câu hỏi tự luận" : "Nội dung câu hỏi"}
        onChange={(e) => onChange({ ...q, content: e.target.value })} />

      {isText ? (
        <div className="space-y-1.5">
          <div className="px-3 py-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-[11px] text-slate-500">
            Khách sẽ nhập câu trả lời bằng chữ trên app.
          </div>
          <TextArea rows={2} value={q.referenceAnswer || ""} disabled={readOnly}
            placeholder="Đáp án gợi ý (không bắt buộc)"
            onChange={(e) => onChange({ ...q, referenceAnswer: e.target.value })} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {q.answers.map((a, i) => (
              <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${a.correct ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200"}`}>
                <button type="button" disabled={readOnly} onClick={() => markCorrect(i)}
                  title="Đánh dấu là đáp án đúng"
                  className={`shrink-0 cursor-pointer ${a.correct ? "text-emerald-600" : "text-slate-300 hover:text-slate-500"}`}>
                  {a.correct ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                </button>
                <input value={a.content} disabled={readOnly} placeholder={`Đáp án ${String.fromCharCode(65 + i)}`}
                  onChange={(e) => setAnswer(i, { content: e.target.value })}
                  className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none" />
              </div>
            ))}
          </div>
          {correctCount !== 1 && <p className="text-[11px] font-bold text-rose-600">Chọn đúng 1 đáp án đúng.</p>}
        </>
      )}
      {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
    </div>
  );
}
