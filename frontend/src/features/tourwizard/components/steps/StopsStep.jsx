"use client";

import React, { useRef, useState } from "react";
import { Plus, GripVertical, ChevronUp, ChevronDown, Trash2, AlertCircle, MapPin } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import StopDrawer, { newKey } from "../stops/StopDrawer";
import { normalizeQuestion, questionBody } from "../stops/QuestionEditor";
import { issueFor } from "../../hooks/useTourDraft";

/* ── Chuyển đổi dữ liệu server <-> form ─────────────────────────────────── */

const stopFromServer = (s) => ({
  _key: `s${s.id}`,
  id: s.id,
  name: s.name || "",
  shortDescription: s.shortDescription || "",
  guestNote: s.guestNote || "",
  imageUrl: s.imageUrl || "",
  videoUrl: s.videoUrl || "",
  videoSource: s.videoSource || "YOUTUBE",
  culturalContent: s.culturalContent || "",
  culturalImages: s.culturalImages || [],
  artifacts: (s.artifacts || []).map((a) => ({
    _key: newKey(), name: a.name || "", imageUrl: a.imageUrl || "", shortDescription: a.shortDescription || "",
  })),
  quiz: (s.quiz || []).map((q) => ({ ...normalizeQuestion(q), _key: newKey() })),
  experiences: (s.experiences || []).map((e) => ({
    _key: newKey(),
    activityName: e.activityName || "",
    checkpointLatitude: e.checkpointLatitude ?? null,
    checkpointLongitude: e.checkpointLongitude ?? null,
    radiusMeters: e.radiusMeters ?? 50,
    durationSeconds: e.durationSeconds ?? null,
    qrToken: e.qrToken || null,
    question: normalizeQuestion(e.question),
  })),
});

const emptyStop = () => ({
  _key: newKey(), id: null, name: "", shortDescription: "", guestNote: "", imageUrl: "",
  videoUrl: "", videoSource: "YOUTUBE", culturalContent: "", culturalImages: [], artifacts: [],
  // Điểm đến mới chưa có câu hỏi / trải nghiệm nào — đối tác bấm "Thêm" để soạn từng mục.
  quiz: [],
  experiences: [],
});

const stopsBody = (stops) => ({
  stops: stops.map((s) => ({
    id: s.id || null,
    name: s.name,
    shortDescription: s.shortDescription,
    guestNote: s.guestNote,
    imageUrl: s.imageUrl || null,
    videoUrl: s.videoUrl || null,
    videoSource: s.videoUrl ? s.videoSource : null,
    culturalContent: s.culturalContent,
    culturalImages: s.culturalImages,
    // Video đã chuyển lên cấp điểm đến — cổ vật không còn video riêng.
    artifacts: s.artifacts.map(({ _key, ...a }) => ({ ...a, videoUrl: null, videoSource: null })),
    quiz: s.quiz.map(questionBody),
    experiences: s.experiences.map(({ _key, question, ...e }) => ({ ...e, question: question ? questionBody(question) : null })),
  })),
});

export default function StopsStep({ tour, issues, readOnly, onSave, onFlush, onValidate, focus }) {
  const [stops, setStops] = useState(() => (tour.stops || []).map(stopFromServer));
  const [openKey, setOpenKey] = useState(null);
  const dragFrom = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  const { confirm, confirmDialog } = useConfirm();

  // Nhảy từ danh sách lỗi / ghi chú Moderator → mở đúng điểm đến (điều chỉnh state ngay khi render).
  const [seenFocus, setSeenFocus] = useState(null);
  if (focus?.nonce && focus.nonce !== seenFocus) {
    setSeenFocus(focus.nonce);
    const target = stops[focus.index];
    if (target) setOpenKey(target._key);
  }

  /** Lưu + gắn id server vào các điểm đến mới (để lần lưu sau cập nhật đúng điểm đến, giữ ghi chú Moderator). */
  const commit = (next) => {
    setStops(next);
    if (readOnly) return;
    const keys = next.map((s) => s._key);
    onSave(stopsBody(next), (saved) => {
      const idByKey = {};
      (saved?.stops || []).forEach((s, i) => { if (keys[i]) idByKey[keys[i]] = s.id; });
      setStops((prev) => prev.map((s) => (s.id ? s : { ...s, id: idByKey[s._key] ?? null })));
    });
  };

  /**
   * Nút "Lưu" trong khung điểm đến: ghi bản nháp vào danh sách, lưu lên máy chủ ngay rồi kiểm tra lại.
   * Giữ id server mới nhất (bản nháp mở từ trước khi điểm đến mới được cấp id).
   * Trả về { ok, issues } — issues là danh sách lỗi mới nhất (null nếu không kiểm tra được).
   */
  const saveStop = async (draft) => {
    const next = stops.map((x) => (x._key === draft._key ? { ...draft, id: x.id ?? draft.id } : x));
    commit(next);
    const ok = onFlush ? await onFlush() : true;
    if (!ok) return { ok: false, issues: null };
    return { ok: true, issues: onValidate ? await onValidate() : null };
  };

  const addStop = () => {
    const s = emptyStop();
    commit([...stops, s]);
    setOpenKey(s._key);
  };

  const move = (from, to) => {
    if (to < 0 || to >= stops.length || from === to) return;
    const next = [...stops];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next);
  };

  const remove = async (i) => {
    const ok = await confirm({
      tone: "danger", icon: "trash", title: "Xóa điểm đến này?",
      subject: stops[i].name || `Điểm đến ${i + 1}`,
      description: "Toàn bộ nội dung văn hóa, cổ vật, quiz và trải nghiệm của điểm đến sẽ bị xóa.",
      confirmLabel: "Xóa điểm đến",
    });
    if (!ok) return;
    if (openKey === stops[i]._key) setOpenKey(null);
    commit(stops.filter((_, j) => j !== i));
  };

  const openIndex = stops.findIndex((s) => s._key === openKey);
  const stopErrAt = (i) => (field) => issueFor(issues, "STOPS", field, i);
  const stopHasError = (i) => (issues || []).some((x) => x.step === "STOPS" && x.stopIndex === i);
  const listError = issueFor(issues, "STOPS", "stops");
  const rewardError = issueFor(issues, "STOPS", "rewardPoints");

  return (
    <div className="space-y-4">
      {confirmDialog}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Danh sách điểm đến ({stops.length})</h3>
          <p className="text-[11px] text-slate-500">Kéo thả để sắp xếp thứ tự hành trình. Bấm vào một hàng để thiết lập.</p>
        </div>
        {!readOnly && (
          <button type="button" onClick={addStop}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
            <Plus size={15} /> Thêm điểm đến
          </button>
        )}
      </div>

      {(listError || rewardError) && (
        <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1"><AlertCircle size={12} />{listError || rewardError}</p>
      )}

      {stops.length === 0 ? (
        <div className="py-10 rounded-xl border-2 border-dashed border-slate-200 text-center text-slate-400 space-y-1">
          <MapPin size={22} className="mx-auto" />
          <p className="text-sm font-bold text-slate-500">Chưa có điểm đến nào</p>
          <p className="text-[11px]">Tour cần ít nhất 1 điểm đến.</p>
        </div>
      ) : (
        <ol className="space-y-2">
          {stops.map((s, i) => (
            <li key={s._key}
              draggable={!readOnly}
              onDragStart={() => { dragFrom.current = i; }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => { e.preventDefault(); setDragOver(null); move(dragFrom.current, i); dragFrom.current = null; }}
              className={`flex items-center gap-2 p-2.5 rounded-xl border bg-white transition-colors ${dragOver === i ? "border-emerald-400 bg-emerald-50/50" : stopHasError(i) ? "border-rose-300" : "border-slate-200 hover:border-slate-300"}`}>
              {!readOnly && <GripVertical size={16} className="text-slate-300 cursor-grab shrink-0" />}
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <button type="button" onClick={() => setOpenKey(s._key)} className="flex-1 min-w-0 text-left cursor-pointer">
                <span className="block text-sm font-bold text-slate-800 truncate">{s.name || "Điểm đến chưa đặt tên"}</span>
              </button>
              {stopHasError(i) && <AlertCircle size={15} className="text-rose-500 shrink-0" title="Điểm đến còn lỗi" />}
              {!readOnly && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button type="button" title="Lên" onClick={() => move(i, i - 1)} disabled={i === 0}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"><ChevronUp size={15} /></button>
                  <button type="button" title="Xuống" onClick={() => move(i, i + 1)} disabled={i === stops.length - 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"><ChevronDown size={15} /></button>
                  <button type="button" title="Xóa" onClick={() => remove(i)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"><Trash2 size={15} /></button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {openIndex >= 0 && (
        <StopDrawer
          key={stops[openIndex]._key}
          stop={stops[openIndex]}
          index={openIndex}
          readOnly={readOnly}
          rewardPoints={tour.rewardPoints}
          stopErr={stopErrAt(openIndex)}
          onClose={() => setOpenKey(null)}
          onSave={saveStop}
        />
      )}
    </div>
  );
}
