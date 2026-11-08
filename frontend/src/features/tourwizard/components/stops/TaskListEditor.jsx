"use client";

import React, { useState } from "react";
import { Plus, Trash2, MapPin, ListTodo, Timer, HelpCircle, Footprints } from "lucide-react";
import GoongMapPickerModal from "@/features/destination/components/GoongMapPickerModal";
import { Field, TextInput, TextArea, NumberInput, PointsBadge } from "../FormKit";
import QuestionEditor, { emptyQuestion, normalizeQuestion, questionBody } from "./QuestionEditor";
import CheckpointMap from "./CheckpointMap";
import { LIMITS } from "../../constants";

let keySeq = 0;
const newKey = () => `t${Date.now().toString(36)}${(keySeq++).toString(36)}`;

/* ── Dữ liệu form <-> server ─────────────────────────────────────────────── */

export const emptyExperience = () => ({
  _key: newKey(),
  activityName: "",
  checkpointLatitude: null,
  checkpointLongitude: null,
  radiusMeters: LIMITS.RADIUS_DEFAULT,
  durationSeconds: 600,
  question: emptyQuestion(),
});

export const emptyTask = () => ({
  _key: newKey(),
  title: "",
  description: "",
  quiz: [{ ...emptyQuestion(), _key: newKey() }],
  experiences: [emptyExperience()],
});

/** Nhiệm vụ từ server (TourDetailResponse.Task) → dữ liệu form. */
export const taskFromServer = (t) => ({
  _key: newKey(),
  title: t.title || "",
  description: t.description || "",
  quiz: (t.quiz || []).map((q) => ({ ...normalizeQuestion(q), _key: newKey() })),
  experiences: (t.experiences || []).map((e) => ({
    _key: newKey(),
    activityName: e.activityName || "",
    checkpointLatitude: e.checkpointLatitude ?? null,
    checkpointLongitude: e.checkpointLongitude ?? null,
    radiusMeters: e.radiusMeters ?? LIMITS.RADIUS_DEFAULT,
    durationSeconds: e.durationSeconds ?? null,
    question: normalizeQuestion(e.question),
  })),
});

/** Dữ liệu gửi lên API (TourWizardRequests.TaskItem). */
export const taskBody = (t) => ({
  title: t.title,
  description: t.description || null,
  quiz: t.quiz.map(questionBody),
  experiences: t.experiences.map(({ _key, question, ...e }) => ({ ...e, question: question ? questionBody(question) : null })),
});

/* ── Trải nghiệm thực tế trong nhiệm vụ ──────────────────────────────────── */

function ExperienceBlock({ exp, index, path, readOnly, stopErr, onChange, onRemove, onPickCheckpoint }) {
  const mins = exp.durationSeconds != null ? Math.floor(exp.durationSeconds / 60) : null;
  const secs = exp.durationSeconds != null ? exp.durationSeconds % 60 : null;
  const setDur = (m, s) => {
    const total = (m || 0) * 60 + (s || 0);
    onChange({ durationSeconds: total > 0 ? total : null });
  };
  return (
    <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700">Trải nghiệm {index + 1}</span>
        {!readOnly && onRemove && (
          <button type="button" title="Xóa trải nghiệm" onClick={onRemove}
            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer">
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <Field label="Tên hoạt động" required error={stopErr(`${path}.activityName`)}>
        <TextInput value={exp.activityName} disabled={readOnly} placeholder="Ví dụ: Đục hoa văn sen cùng nghệ nhân"
          onChange={(e) => onChange({ activityName: e.target.value })} error={stopErr(`${path}.activityName`)} />
      </Field>

      <Field label="Checkpoint" required error={stopErr(`${path}.checkpoint`)}
        hint="Khách đi theo bản đồ trên app; khi vào trong bán kính sẽ hiện tên hoạt động và nút Bắt đầu.">
        <CheckpointMap latitude={exp.checkpointLatitude} longitude={exp.checkpointLongitude} radius={exp.radiusMeters} />
        {!readOnly && (
          <button type="button" onClick={onPickCheckpoint}
            className="mt-2 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-emerald-100">
            <MapPin size={13} /> {exp.checkpointLatitude ? "Đổi vị trí trên bản đồ" : "Chọn vị trí trên bản đồ"}
          </button>
        )}
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Phạm vi (bán kính)" required error={stopErr(`${path}.radiusMeters`)}
          hint={`Từ ${LIMITS.RADIUS_MIN}–${LIMITS.RADIUS_MAX} mét quanh checkpoint.`}>
          <NumberInput value={exp.radiusMeters} min={LIMITS.RADIUS_MIN} max={LIMITS.RADIUS_MAX} suffix="mét" disabled={readOnly}
            onChange={(v) => onChange({ radiusMeters: v })} />
        </Field>
        <Field label="Thời gian trải nghiệm" required error={stopErr(`${path}.durationSeconds`)}
          hint="Đếm ngược trên app, hết giờ thì hiện câu hỏi.">
          <div className="grid grid-cols-2 gap-2">
            <NumberInput value={mins} min={0} max={1440} suffix="phút" disabled={readOnly} onChange={(m) => setDur(m, secs)} />
            <NumberInput value={secs} min={0} max={59} suffix="giây" disabled={readOnly} onChange={(s) => setDur(mins, s)} />
          </div>
        </Field>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
        <Timer size={12} /> Câu hỏi sau trải nghiệm (1 câu, trắc nghiệm hoặc tự luận)
      </div>
      <QuestionEditor label="Câu hỏi sau trải nghiệm" value={exp.question} readOnly={readOnly} allowTypes
        error={stopErr(`${path}.question`)}
        onChange={(question) => onChange({ question })} />
    </div>
  );
}

/* ── Danh sách nhiệm vụ của điểm đến ─────────────────────────────────────── */

/**
 * Nhiệm vụ của điểm đến (1–5). Mỗi nhiệm vụ gồm quiz (1–4 câu) và trải nghiệm thực tế (1–5).
 * Điểm đến mới chưa có nhiệm vụ nào: hiện ô "Tạo nhiệm vụ mới".
 * onChange(tasks, touchedPaths) — touchedPaths dùng để ẩn lỗi cũ của máy chủ ở đúng ô vừa sửa.
 * stopErr(field) trả lỗi máy chủ của điểm đến (field như "tasks[0].quiz[1].answers").
 * taskPoints: điểm mỗi nhiệm vụ do Admin cấu hình (chỉ hiển thị).
 */
export default function TaskListEditor({ tasks, onChange, readOnly, stopName, stopErr, taskPoints }) {
  const [mapFor, setMapFor] = useState(null); // { t, e } — trải nghiệm đang chọn checkpoint
  const addTask = () => onChange([...tasks, emptyTask()], ["tasks"]);
  const canAdd = !readOnly && tasks.length < LIMITS.TASKS_MAX;

  const setTask = (i, patch, paths) =>
    onChange(tasks.map((t, j) => (j === i ? { ...t, ...patch } : t)),
      paths || Object.keys(patch).map((k) => `tasks[${i}].${k}`));
  const setExperience = (ti, ei, patch) => {
    const experiences = tasks[ti].experiences.map((e, j) => (j === ei ? { ...e, ...patch } : e));
    setTask(ti, { experiences },
      Object.keys(patch).map((k) => `tasks[${ti}].experiences[${ei}].${k.startsWith("checkpoint") ? "checkpoint" : k}`));
  };
  const picking = mapFor ? tasks[mapFor.t]?.experiences[mapFor.e] : null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
          <ListTodo size={14} /> Nhiệm vụ ({tasks.length}/{LIMITS.TASKS_MAX})
        </h4>
        {canAdd && tasks.length > 0 && (
          <button type="button" onClick={addTask}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline cursor-pointer">
            <Plus size={14} /> Thêm nhiệm vụ
          </button>
        )}
      </div>
      {stopErr("tasks") && <p className="text-[11px] font-bold text-rose-600">{stopErr("tasks")}</p>}

      {tasks.length === 0 && (
        readOnly ? (
          <p className="text-xs italic text-slate-400">Chưa có nhiệm vụ.</p>
        ) : (
          <button type="button" onClick={addTask}
            className="w-full p-6 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-300 flex flex-col items-center gap-2 text-center cursor-pointer transition-colors">
            <span className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center"><Plus size={20} /></span>
            <span className="text-sm font-bold text-emerald-800">Tạo nhiệm vụ mới</span>
            <span className="text-[11px] text-slate-500">Mỗi nhiệm vụ gồm câu hỏi quiz và trải nghiệm thực tế.</span>
          </button>
        )
      )}

      {tasks.map((task, ti) => {
        const p = `tasks[${ti}]`;
        const setQuiz = (quiz, paths) => setTask(ti, { quiz }, paths);
        return (
          <div key={task._key} className="p-3.5 rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-emerald-900">Nhiệm vụ {ti + 1}</span>
              <div className="flex items-center gap-2">
                {taskPoints != null && <PointsBadge points={taskPoints} label="điểm / nhiệm vụ" />}
                {!readOnly && (
                  <button type="button" title="Xóa nhiệm vụ" onClick={() => onChange(tasks.filter((_, j) => j !== ti), ["tasks"])}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            <Field label="Tên nhiệm vụ" required error={stopErr(`${p}.title`)}>
              <TextInput value={task.title} disabled={readOnly} maxLength={200} error={stopErr(`${p}.title`)}
                placeholder="Ví dụ: Khám phá nghề mộc"
                onChange={(e) => setTask(ti, { title: e.target.value })} />
            </Field>
            <Field label="Mô tả / hướng dẫn cho khách">
              <TextArea rows={2} value={task.description} disabled={readOnly} maxLength={2000} placeholder="Không bắt buộc"
                onChange={(e) => setTask(ti, { description: e.target.value })} />
            </Field>

            {/* Quiz của nhiệm vụ */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
                  <HelpCircle size={13} /> Câu hỏi quiz ({task.quiz.length}/{LIMITS.QUIZ_MAX})
                </span>
                {!readOnly && task.quiz.length < LIMITS.QUIZ_MAX && (
                  <button type="button" onClick={() => setQuiz([...task.quiz, { ...emptyQuestion(), _key: newKey() }], [`${p}.quiz`])}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline cursor-pointer">
                    <Plus size={13} /> Thêm câu hỏi
                  </button>
                )}
              </div>
              {stopErr(`${p}.quiz`) && <p className="text-[11px] font-bold text-rose-600">{stopErr(`${p}.quiz`)}</p>}
              {task.quiz.map((q, qi) => (
                <QuestionEditor key={q._key} index={qi} value={q} readOnly={readOnly} allowTypes
                  error={stopErr(`${p}.quiz[${qi}]`)}
                  onRemove={() => setQuiz(task.quiz.filter((_, j) => j !== qi), [`${p}.quiz`])}
                  onChange={(nq) => setQuiz(task.quiz.map((x, j) => (j === qi ? { ...nq, _key: x._key } : x)), [`${p}.quiz[${qi}]`])} />
              ))}
            </div>

            {/* Trải nghiệm thực tế của nhiệm vụ */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
                  <Footprints size={13} /> Trải nghiệm thực tế ({task.experiences.length}/{LIMITS.EXPERIENCES_MAX})
                </span>
                {!readOnly && task.experiences.length < LIMITS.EXPERIENCES_MAX && (
                  <button type="button"
                    onClick={() => setTask(ti, { experiences: [...task.experiences, emptyExperience()] }, [`${p}.experiences`])}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline cursor-pointer">
                    <Plus size={13} /> Thêm trải nghiệm
                  </button>
                )}
              </div>
              {stopErr(`${p}.experiences`) && <p className="text-[11px] font-bold text-rose-600">{stopErr(`${p}.experiences`)}</p>}
              {task.experiences.map((exp, ei) => (
                <ExperienceBlock key={exp._key} exp={exp} index={ei} path={`${p}.experiences[${ei}]`}
                  readOnly={readOnly} stopErr={stopErr}
                  onChange={(patch) => setExperience(ti, ei, patch)}
                  onRemove={() => setTask(ti, { experiences: task.experiences.filter((_, j) => j !== ei) }, [`${p}.experiences`])}
                  onPickCheckpoint={() => setMapFor({ t: ti, e: ei })} />
              ))}
            </div>
          </div>
        );
      })}

      {picking && (
        <GoongMapPickerModal
          isOpen
          onClose={() => setMapFor(null)}
          placeName={picking.activityName || stopName}
          initialLatitude={picking.checkpointLatitude}
          initialLongitude={picking.checkpointLongitude}
          onSelect={({ latitude, longitude }) =>
            setExperience(mapFor.t, mapFor.e, { checkpointLatitude: Number(latitude), checkpointLongitude: Number(longitude) })}
        />
      )}
    </section>
  );
}
