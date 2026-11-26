"use client";

import React from "react";
import {
  CheckCircle2, Circle, Trash2, ListChecks, PenLine, Image as ImageIcon, ArrowDownUp,
  ChevronUp, ChevronDown, Plus, Link2,
} from "lucide-react";
import { TextInput, TextArea, PointsBadge, SingleImage } from "../FormKit";
import { LimitedField } from "@/components/ui/LimitedField";
import { LIMITS } from "../../constants";

/** Dạng câu hỏi — khớp enum QuestionType ở backend. */
export const QUESTION_TYPES = [
  { key: "MULTIPLE_CHOICE", label: "Trắc nghiệm", Icon: ListChecks },
  { key: "TEXT", label: "Tự luận", Icon: PenLine },
];

/** Dạng câu đố văn hóa của điểm đến (không có nhập chữ). */
export const QUIZ_TYPES = [
  { key: "MULTIPLE_CHOICE", label: "Chọn đáp án", Icon: ListChecks, hint: "4 đáp án chữ, 1 đáp án đúng." },
  { key: "IMAGE_CHOICE", label: "Chọn ảnh", Icon: ImageIcon, hint: "4 ảnh đáp án, 1 ảnh đúng. Hợp với câu \"đâu là…?\"." },
  { key: "ORDERING", label: "Xếp thứ tự", Icon: ArrowDownUp, hint: "3–5 mục, nhập theo thứ tự ĐÚNG — app tự xáo trộn cho khách sắp xếp lại." },
  { key: "MATCHING", label: "Nối cột", Icon: Link2, hint: "3–5 cặp đúng (cột A có thể kèm ảnh, cột B là chữ) — app tự xáo cột B, đúng toàn bộ mới có điểm." },
];

const ORDERING_MIN = 3;
const ORDERING_MAX = 5;
const MATCHING_MIN = 3;
const MATCHING_MAX = 5;

const emptyAnswers = () => Array.from({ length: 4 }, (_, i) => ({ content: "", correct: i === 0, imageUrl: "", matchText: "" }));

export const emptyQuestion = () => ({
  type: "MULTIPLE_CHOICE",
  content: "",
  answers: emptyAnswers(),
  referenceAnswer: "",
  explanation: "",
});

const KNOWN_TYPES = ["MULTIPLE_CHOICE", "TEXT", "IMAGE_CHOICE", "ORDERING", "MATCHING"];

/** Chuẩn hóa câu hỏi từ server: tối thiểu 4 dòng đáp án (giữ lại để đổi qua lại giữa các dạng). */
export const normalizeQuestion = (q) => {
  const answers = (q?.answers || []).map((a) => ({
    content: a.content || "",
    correct: !!a.correct,
    imageUrl: a.imageUrl || "",
    matchText: a.matchText || "",
  }));
  while (answers.length < 4) answers.push({ content: "", correct: answers.length === 0, imageUrl: "", matchText: "" });
  return {
    type: KNOWN_TYPES.includes(q?.type) ? q.type : "MULTIPLE_CHOICE",
    content: q?.content || "",
    answers: answers.slice(0, ORDERING_MAX),
    referenceAnswer: q?.referenceAnswer || "",
    explanation: q?.explanation || "",
  };
};

/** Dữ liệu gửi lên API theo dạng câu hỏi. */
export const questionBody = (q) => {
  const base = { type: q.type, content: q.content, explanation: q.explanation || null };
  switch (q.type) {
    case "TEXT":
      return { ...base, answers: [], referenceAnswer: q.referenceAnswer || null };
    case "ORDERING":
      return {
        ...base, referenceAnswer: null,
        // Dòng trống cuối danh sách không gửi lên (4 dòng mặc định nhưng xếp thứ tự chỉ cần 3).
        answers: q.answers.filter((a, i) => a.content?.trim() || i < ORDERING_MIN).map((a) => ({ content: a.content, correct: false })),
      };
    case "MATCHING":
      return {
        ...base, referenceAnswer: null,
        answers: q.answers
          .filter((a, i) => a.content?.trim() || a.imageUrl || a.matchText?.trim() || i < MATCHING_MIN)
          .slice(0, MATCHING_MAX)
          .map((a) => ({
            content: a.content || "",
            imageUrl: a.imageUrl || null,
            matchText: a.matchText || "",
            correct: false,
          })),
      };
    case "IMAGE_CHOICE":
      return {
        ...base, referenceAnswer: null,
        answers: q.answers.slice(0, 4).map((a) => ({ content: a.content, correct: !!a.correct, imageUrl: a.imageUrl || null })),
      };
    default:
      return {
        ...base, type: "MULTIPLE_CHOICE", referenceAnswer: null,
        answers: q.answers.slice(0, 4).map((a) => ({ content: a.content, correct: !!a.correct })),
      };
  }
};

/** Lỗi của form câu quiz — khớp luật backend (TourSubmissionValidator); null = hợp lệ. */
export function quizError(q) {
  if (!q.content?.trim()) return "Vui lòng nhập nội dung câu hỏi.";
  const four = q.answers.slice(0, 4);
  switch (q.type) {
    case "ORDERING": {
      const filled = q.answers.filter((a) => a.content?.trim());
      if (filled.length < ORDERING_MIN) return `Câu xếp thứ tự cần ít nhất ${ORDERING_MIN} mục.`;
      const body = questionBody(q).answers;
      if (body.some((a) => !a.content?.trim())) return "Mục nào cũng cần có nội dung (xóa dòng trống ở giữa).";
      return null;
    }
    case "MATCHING": {
      const body = questionBody(q).answers;
      if (body.length < MATCHING_MIN || body.length > MATCHING_MAX) {
        return `Câu nối cột cần từ ${MATCHING_MIN} đến ${MATCHING_MAX} cặp.`;
      }
      if (body.some((a) => (!a.content?.trim() && !a.imageUrl) || !a.matchText?.trim())) {
        return "Mỗi cặp cần có cột A (chữ hoặc ảnh) và cột B.";
      }
      const rights = body.map((a) => a.matchText.trim().toLowerCase());
      if (new Set(rights).size < rights.length) return "Các mục ở cột B không được trùng nhau.";
      return null;
    }
    case "IMAGE_CHOICE":
      if (four.some((a) => !a.imageUrl)) return "Câu chọn ảnh cần đủ 4 ảnh đáp án.";
      if (four.filter((a) => a.correct).length !== 1) return "Chọn đúng 1 ảnh đúng.";
      return null;
    default:
      if (four.some((a) => !a.content?.trim())) return "Câu hỏi cần đủ 4 đáp án.";
      if (four.filter((a) => a.correct).length !== 1) return "Chọn đúng 1 đáp án đúng.";
      return null;
  }
}

const LETTERS = ["A", "B", "C", "D", "E"];

/** Dòng tóm tắt đáp án của câu quiz (danh sách câu hỏi đã lưu). */
export function quizSummary(q) {
  switch (q.type) {
    case "ORDERING":
      return `Xếp thứ tự: ${q.answers.filter((a) => a.content?.trim()).map((a) => a.content.trim()).join(" → ") || "—"}`;
    case "MATCHING": {
      const pairs = q.answers.filter((a) => (a.content?.trim() || a.imageUrl) && a.matchText?.trim());
      return `Nối cột (${pairs.length} cặp): ${pairs.map((a) => `${a.content?.trim() || "[Ảnh]"} ↔ ${a.matchText.trim()}`).join(" · ") || "—"}`;
    }
    case "IMAGE_CHOICE": {
      const k = q.answers.slice(0, 4).findIndex((a) => a.correct);
      return `Chọn ảnh · Ảnh đúng: ${k >= 0 ? LETTERS[k] : "chưa chọn"}`;
    }
    default: {
      const k = q.answers.slice(0, 4).findIndex((a) => a.correct);
      return (k >= 0 ? `Đáp án đúng: ${LETTERS[k]}. ${q.answers[k].content}` : "Chưa chọn đáp án đúng");
    }
  }
}

/**
 * Soạn một câu hỏi.
 * - quizTypes: câu đố văn hóa của điểm đến — chọn 1 trong 4 dạng (chọn đáp án, chọn ảnh, xếp thứ tự, nối cột)
 * - Tự luận (khi allowTypes): khách nhập câu trả lời; đối tác ghi đáp án gợi ý nếu muốn.
 * - fixedType ("MULTIPLE_CHOICE" | "TEXT"): dạng do loại nhiệm vụ quyết định, không cho đổi.
 *   Dạng nhập chữ khi đó bắt buộc "Đáp án đúng" (nhiều đáp án chấp nhận cách nhau bằng dấu ;).
 */
export default function QuestionEditor({
  index, label, value, onChange, onRemove, readOnly, points, error, allowTypes = false, fixedType = null, quizTypes = false,
}) {
  const q = value || emptyQuestion();
  const type = fixedType || (quizTypes || allowTypes ? q.type || "MULTIPLE_CHOICE" : "MULTIPLE_CHOICE");
  const isText = type === "TEXT";
  const setAnswer = (i, patch) =>
    onChange({ ...q, answers: q.answers.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
  const markCorrect = (i) => onChange({ ...q, answers: q.answers.map((a, j) => ({ ...a, correct: j === i })) });
  const correctCount = q.answers.slice(0, 4).filter((a) => a.correct).length;
  const typeOptions = quizTypes ? QUIZ_TYPES : QUESTION_TYPES;
  const showTypePicker = !fixedType && (quizTypes || allowTypes);

  const moveItem = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= q.answers.length) return;
    const answers = [...q.answers];
    [answers[i], answers[j]] = [answers[j], answers[i]];
    onChange({ ...q, answers });
  };

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

      {showTypePicker && (
        <div className="space-y-1">
          <div className="inline-flex flex-wrap p-0.5 rounded-lg bg-slate-100" role="radiogroup" aria-label="Dạng câu hỏi">
            {typeOptions.map(({ key, label: typeLabel, Icon }) => {
              const active = type === key;
              return (
                <button key={key} type="button" role="radio" aria-checked={active} disabled={readOnly}
                  onClick={() => !active && onChange({ ...q, type: key })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-default ${active ? "bg-white text-emerald-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}>
                  <Icon size={12} />{typeLabel}
                </button>
              );
            })}
          </div>
          {quizTypes && <p className="text-[11px] text-slate-500">{QUIZ_TYPES.find((t) => t.key === type)?.hint}</p>}
        </div>
      )}

      <TextInput value={q.content} limit={LIMITS.TEXT.QUESTION} disabled={readOnly}
        placeholder={isText ? "Nội dung câu hỏi tự luận" : type === "ORDERING" ? "Vd: Xếp các sự kiện theo thời gian" : type === "MATCHING" ? "Vd: Nối tên địa danh với đặc trưng tương ứng" : "Nội dung câu hỏi"}
        onChange={(e) => onChange({ ...q, content: e.target.value })} />

      {isText && fixedType ? (
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-700">
            Đáp án đúng <span className="text-rose-500">*</span>
          </label>
          <TextInput value={q.referenceAnswer || ""} disabled={readOnly} limit={LIMITS.TEXT.REFERENCE_ANSWER}
            placeholder="Vd: Lý Thái Tổ; Lý Công Uẩn" error={!!error}
            onChange={(e) => onChange({ ...q, referenceAnswer: e.target.value })} />
          <p className="text-[11px] text-slate-500">
            Khách nhập câu trả lời bằng chữ. Chấm không phân biệt hoa thường, dấu và khoảng trắng; nhiều đáp án chấp nhận cách nhau bằng dấu <b>;</b>
          </p>
        </div>
      ) : isText ? (
        <div className="space-y-1.5">
          <div className="px-3 py-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-[11px] text-slate-500">
            Khách sẽ nhập câu trả lời bằng chữ trên app.
          </div>
          <TextArea rows={2} value={q.referenceAnswer || ""} limit={LIMITS.TEXT.REFERENCE_ANSWER} disabled={readOnly}
            placeholder="Đáp án gợi ý (không bắt buộc)"
            onChange={(e) => onChange({ ...q, referenceAnswer: e.target.value })} />
        </div>
      ) : type === "ORDERING" ? (
        <div className="space-y-1.5">
          <ol className="space-y-1.5">
            {q.answers.map((a, i) => (
              <li key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-slate-200">
                <span className="w-5 text-center text-xs font-bold text-emerald-700 tabular-nums">{i + 1}</span>
                <LimitedField as="input" limit={LIMITS.TEXT.ANSWER} wrapperClassName="flex-1" value={a.content} disabled={readOnly}
                  placeholder={i < ORDERING_MIN ? `Mục ${i + 1}` : `Mục ${i + 1} (không bắt buộc)`}
                  onChange={(e) => setAnswer(i, { content: e.target.value })}
                  className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none" />
                {!readOnly && (
                  <span className="flex items-center">
                    <button type="button" title="Lên" disabled={i === 0} onClick={() => moveItem(i, -1)}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer disabled:cursor-default"><ChevronUp size={14} /></button>
                    <button type="button" title="Xuống" disabled={i === q.answers.length - 1} onClick={() => moveItem(i, 1)}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer disabled:cursor-default"><ChevronDown size={14} /></button>
                    {q.answers.length > ORDERING_MIN && (
                      <button type="button" title="Xóa mục" onClick={() => onChange({ ...q, answers: q.answers.filter((_, j) => j !== i) })}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 size={13} /></button>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ol>
          {!readOnly && q.answers.length < ORDERING_MAX && (
            <button type="button" onClick={() => onChange({ ...q, answers: [...q.answers, { content: "", correct: false, imageUrl: "", matchText: "" }] })}
              className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1 cursor-pointer">
              <Plus size={12} /> Thêm mục
            </button>
          )}
        </div>
      ) : type === "MATCHING" ? (
        <div className="space-y-2">
          <div className="grid grid-cols-[24px_1fr_1fr_auto] gap-2 px-1 text-[11px] font-bold text-slate-500">
            <span />
            <span>Cột A (chữ và/hoặc ảnh nhỏ)</span>
            <span>Cột B (đáp án ghép đúng)</span>
            <span />
          </div>
          <ol className="space-y-2">
            {q.answers.slice(0, MATCHING_MAX).map((a, i) => (
              <li key={i} className="grid grid-cols-[24px_1fr_1fr_auto] items-start gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50/40">
                <span className="pt-2 text-center text-xs font-bold text-emerald-700 tabular-nums">{i + 1}</span>
                <div className="space-y-1.5 min-w-0">
                  <LimitedField as="input" limit={LIMITS.TEXT.ANSWER} value={a.content} disabled={readOnly}
                    placeholder={i < MATCHING_MIN ? `Cột A #${i + 1}` : `Cột A #${i + 1} (tùy chọn)`}
                    onChange={(e) => setAnswer(i, { content: e.target.value })}
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500" />
                  <SingleImage value={a.imageUrl} disabled={readOnly} aspect="aspect-[16/9]" label="Ảnh cột A (không bắt buộc)"
                    onChange={(imageUrl) => setAnswer(i, { imageUrl })} />
                </div>
                <div className="min-w-0">
                  <LimitedField as="input" limit={LIMITS.TEXT.ANSWER} value={a.matchText || ""} disabled={readOnly}
                    placeholder={i < MATCHING_MIN ? `Cột B #${i + 1}` : `Cột B #${i + 1} (tùy chọn)`}
                    onChange={(e) => setAnswer(i, { matchText: e.target.value })}
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500" />
                </div>
                {!readOnly && q.answers.length > MATCHING_MIN ? (
                  <button type="button" title="Xóa cặp" onClick={() => onChange({ ...q, answers: q.answers.filter((_, j) => j !== i) })}
                    className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 size={13} /></button>
                ) : <span className="w-6" />}
              </li>
            ))}
          </ol>
          {!readOnly && q.answers.length < MATCHING_MAX && (
            <button type="button" onClick={() => onChange({ ...q, answers: [...q.answers, { content: "", correct: false, imageUrl: "", matchText: "" }] })}
              className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1 cursor-pointer">
              <Plus size={12} /> Thêm cặp
            </button>
          )}
        </div>
      ) : type === "IMAGE_CHOICE" ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {q.answers.slice(0, 4).map((a, i) => (
              <div key={i} className={`p-1.5 rounded-lg border space-y-1 ${a.correct ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200"}`}>
                <SingleImage value={a.imageUrl} disabled={readOnly} aspect="aspect-[4/3]" label={`Ảnh ${LETTERS[i]}`}
                  onChange={(imageUrl) => setAnswer(i, { imageUrl })} />
                <div className="flex items-center gap-1.5">
                  <button type="button" disabled={readOnly} onClick={() => markCorrect(i)} title="Đánh dấu là ảnh đúng"
                    className={`shrink-0 cursor-pointer ${a.correct ? "text-emerald-600" : "text-slate-300 hover:text-slate-500"}`}>
                    {a.correct ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </button>
                  <LimitedField as="input" limit={LIMITS.TEXT.ANSWER} wrapperClassName="flex-1" value={a.content} disabled={readOnly}
                    placeholder="Chú thích (không bắt buộc)" onChange={(e) => setAnswer(i, { content: e.target.value })}
                    className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none" />
                </div>
              </div>
            ))}
          </div>
          {correctCount !== 1 && <p className="text-[11px] font-bold text-rose-600">Chọn đúng 1 ảnh đúng.</p>}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {q.answers.slice(0, 4).map((a, i) => (
              <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${a.correct ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200"}`}>
                <button type="button" disabled={readOnly} onClick={() => markCorrect(i)}
                  title="Đánh dấu là đáp án đúng"
                  className={`shrink-0 cursor-pointer ${a.correct ? "text-emerald-600" : "text-slate-300 hover:text-slate-500"}`}>
                  {a.correct ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                </button>
                <LimitedField as="input" limit={LIMITS.TEXT.ANSWER} wrapperClassName="flex-1" value={a.content} disabled={readOnly} placeholder={`Đáp án ${LETTERS[i]}`}
                  onChange={(e) => setAnswer(i, { content: e.target.value })}
                  className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none" />
              </div>
            ))}
          </div>
          {correctCount !== 1 && <p className="text-[11px] font-bold text-rose-600">Chọn đúng 1 đáp án đúng.</p>}
        </>
      )}

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-700">Giải thích cho khách (không bắt buộc)</label>
        <TextArea rows={2} value={q.explanation || ""} limit={LIMITS.TEXT.EXPLANATION} disabled={readOnly}
          placeholder="Vd: Dinh được khánh thành năm 1966, thiết kế bởi KTS Ngô Viết Thụ…"
          onChange={(e) => onChange({ ...q, explanation: e.target.value })} />
        <p className="text-[11px] text-slate-500">Hiện trên app ngay sau khi khách trả lời câu này, giúp khách hiểu thêm dù đúng hay sai.</p>
      </div>
      {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
    </div>
  );
}
