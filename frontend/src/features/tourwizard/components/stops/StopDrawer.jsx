"use client";

import React, { useRef, useState } from "react";
import {
  X, Plus, Trash2, Info, BookOpen, Gamepad2, Save, Loader2, CheckCircle2, AlertCircle,
  Check, ChevronRight, ArrowLeft, ArrowRight,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Field, TextInput, TextArea, SingleImage, ImageStrip, VideoField } from "../FormKit";
import TaskListEditor from "./TaskListEditor";

let keySeq = 0;
export const newKey = () => `k${Date.now().toString(36)}${(keySeq++).toString(36)}`;

export const emptyArtifact = () => ({ _key: newKey(), name: "", imageUrl: "", shortDescription: "" });

/** Ba bước thiết lập điểm đến, làm lần lượt: Thông tin → Nội dung văn hóa → Trải nghiệm. */
const TABS = [
  { key: "info", label: "Thông tin", Icon: Info, fields: ["name", "shortDescription", "guestNote", "imageUrl"] },
  { key: "culture", label: "Nội dung văn hóa", Icon: BookOpen, fields: ["videoUrl", "videoSource", "culturalContent", "culturalImages", "artifacts"] },
  { key: "experience", label: "Trải nghiệm", Icon: Gamepad2, fields: ["tasks"] },
];

/** `field` là chính `path` hoặc nằm bên trong nó ("artifacts[0].name" thuộc "artifacts" / "artifacts[0]"). */
const within = (field, path) => field === path || field.startsWith(`${path}.`) || field.startsWith(`${path}[`);
const tabOfField = (field) => TABS.findIndex((t) => t.fields.some((p) => within(field, p)));

/**
 * Khung bên phải thiết lập một điểm đến, chia 3 bước.
 * Chỉnh sửa trên bản nháp riêng; "Lưu & tiếp tục" ghi lên máy chủ, kiểm tra lại,
 * và chỉ sang bước sau khi bước hiện tại không còn lỗi.
 * onSave(stop) → Promise<{ ok, issues }> (issues: danh sách lỗi mới nhất của cả tour, hoặc null).
 * stopErr(field) trả lỗi backend của điểm đến này (field như "tasks[0].quiz[0].answers").
 */
export default function StopDrawer({ stop: savedStop, index, onSave, onClose, readOnly, taskPoints, stopErr: serverErr }) {
  const [tab, setTab] = useState("info");
  const [stop, setDraft] = useState(savedStop);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const [stepNotice, setStepNotice] = useState("");
  // Các ô đã sửa từ lần lưu gần nhất: ẩn lỗi cũ của máy chủ cho tới khi lưu và kiểm tra lại.
  const [touched, setTouched] = useState(() => new Set());
  const bodyRef = useRef(null);
  const { confirm, confirmDialog } = useConfirm();

  const tabIndex = TABS.findIndex((t) => t.key === tab);
  const stopErr = (field) => ([...touched].some((t) => within(field, t)) ? null : serverErr(field));

  const set = (patch, paths = Object.keys(patch)) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setTouched((prev) => new Set([...prev, ...paths]));
    setDirty(true);
    setSaveStatus("idle");
    setStepNotice("");
  };

  const showTab = (i) => {
    setTab(TABS[i].key);
    bodyRef.current?.scrollTo({ top: 0 });
  };

  /** Lưu bản nháp; nếu có `target` thì sang bước đó khi các bước trước không còn lỗi. */
  const saveAndGo = async (target = null) => {
    if (readOnly || saveStatus === "saving") return;
    setSaveStatus("saving");
    setStepNotice("");
    const { ok, issues } = await onSave(stop);
    if (!ok) {
      setSaveStatus("error");
      return;
    }
    setDirty(false);
    setTouched(new Set());
    setSaveStatus("saved");
    if (target == null) return;

    const mine = (issues || []).filter((x) => x.step === "STOPS" && x.stopIndex === index && x.field);
    const blocked = TABS.findIndex((_, i) => i < target && mine.some((x) => tabOfField(x.field) === i));
    if (blocked >= 0) {
      showTab(blocked);
      setStepNotice(`Vui lòng điền đầy đủ các trường còn thiếu ở bước "${TABS[blocked].label}" trước khi sang bước tiếp theo.`);
      return;
    }
    showTab(target);
  };

  const goToTab = (i) => {
    if (i === tabIndex) return;
    if (readOnly || i < tabIndex) {
      setStepNotice("");
      showTab(i);
      return;
    }
    saveAndGo(i);
  };

  const requestClose = async () => {
    if (dirty && !readOnly) {
      const discard = await confirm({
        tone: "danger", title: "Đóng mà không lưu?", subject: stop.name || `Điểm đến ${index + 1}`,
        description: "Các thay đổi chưa bấm Lưu của điểm đến này sẽ bị bỏ.",
        confirmLabel: "Bỏ thay đổi", cancelLabel: "Ở lại",
      });
      if (!discard) return;
    }
    onClose();
  };

  const tabHasError = (key) => TABS.find((t) => t.key === key).fields.some((f) => stopErr(f));

  const setArtifact = (i, patch) =>
    set(
      { artifacts: stop.artifacts.map((a, j) => (j === i ? { ...a, ...patch } : a)) },
      Object.keys(patch).map((k) => `artifacts[${i}].${k}`),
    );

  return (
    <>
    {confirmDialog}
    <div className="fixed inset-0 z-30 bg-slate-900/20" onClick={requestClose} />
    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
      <header className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Điểm đến {index + 1}</p>
          <h3 className="text-base font-bold text-slate-900 truncate">{stop.name || "Điểm đến chưa đặt tên"}</h3>
        </div>
        <button type="button" onClick={requestClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer" aria-label="Đóng">
          <X size={18} />
        </button>
      </header>

      {/* Thanh bước: Thông tin → Nội dung văn hóa → Trải nghiệm */}
      <nav className="px-5 py-3 flex items-center gap-1 border-b border-slate-100 overflow-x-auto">
        {TABS.map(({ key, label, Icon }, i) => {
          const active = i === tabIndex;
          const hasError = tabHasError(key);
          const done = i < tabIndex && !hasError;
          return (
            <React.Fragment key={key}>
              {i > 0 && <ChevronRight size={14} className="text-slate-300 shrink-0" />}
              <button type="button" onClick={() => goToTab(i)} disabled={saveStatus === "saving"}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-wait ${active ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${active ? "bg-emerald-600 text-white" : hasError ? "bg-rose-100 text-rose-600" : done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {hasError && !active ? <AlertCircle size={11} /> : done ? <Check size={11} /> : i + 1}
                </span>
                <Icon size={14} className="hidden sm:inline" />
                {label}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      <div ref={bodyRef} key={tab} className="jg-page-enter flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {stepNotice && (
          <p className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 flex items-center gap-1.5">
            <AlertCircle size={14} className="shrink-0" />{stepNotice}
          </p>
        )}
        {tab === "info" && (
          <>
            <Field label="Tên điểm đến" required error={stopErr("name")}>
              <TextInput value={stop.name} disabled={readOnly} maxLength={200}
                placeholder="Ví dụ: Xưởng mộc làng Kim Bồng" onChange={(e) => set({ name: e.target.value })} error={stopErr("name")} />
            </Field>
            <Field label="Mô tả ngắn" required error={stopErr("shortDescription")}>
              <TextArea rows={3} value={stop.shortDescription} disabled={readOnly}
                onChange={(e) => set({ shortDescription: e.target.value })} error={stopErr("shortDescription")} />
            </Field>
            <Field label="Lưu ý cho khách" hint="Không bắt buộc. Ví dụ: mang giày kín mũi, ăn mặc lịch sự.">
              <TextArea rows={2} value={stop.guestNote} disabled={readOnly} onChange={(e) => set({ guestNote: e.target.value })} />
            </Field>
            <Field label="Ảnh riêng của điểm đến" hint="Không bắt buộc.">
              <SingleImage value={stop.imageUrl} disabled={readOnly} onChange={(imageUrl) => set({ imageUrl })} />
            </Field>
          </>
        )}

        {tab === "culture" && (
          <>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
              Nội dung văn hóa chỉ mở cho khách <b>sau khi check-in</b> tại điểm đến.
            </div>
            <Field label="Video giới thiệu điểm đến" hint="Không bắt buộc. Dán link YouTube / MP4 hoặc tải video lên."
              error={stopErr("videoSource")}>
              <VideoField url={stop.videoUrl} source={stop.videoSource} disabled={readOnly}
                onChange={(videoUrl, videoSource) => set({ videoUrl, videoSource })} />
            </Field>
            <Field label="Nội dung văn hóa (câu chuyện)" required error={stopErr("culturalContent")}>
              <TextArea rows={7} value={stop.culturalContent} disabled={readOnly}
                placeholder="Câu chuyện lịch sử, văn hóa của điểm đến, viết dựa trên nguồn đáng tin cậy…"
                onChange={(e) => set({ culturalContent: e.target.value })} error={stopErr("culturalContent")} />
            </Field>
            <Field label="Hình ảnh kèm nội dung văn hóa">
              <ImageStrip value={stop.culturalImages} disabled={readOnly} onChange={(culturalImages) => set({ culturalImages })} />
            </Field>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800">Cổ vật ({stop.artifacts.length})</h4>
                {!readOnly && (
                  <button type="button" onClick={() => set({ artifacts: [...stop.artifacts, emptyArtifact()] })}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline cursor-pointer">
                    <Plus size={14} /> Thêm cổ vật
                  </button>
                )}
              </div>
              {stop.artifacts.length === 0 && <p className="text-[11px] text-slate-400">Chưa có cổ vật nào (không bắt buộc).</p>}
              {stop.artifacts.map((a, i) => (
                <div key={a._key} className="p-3 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-600">Cổ vật {i + 1}</span>
                    {!readOnly && (
                      <button type="button" title="Xóa cổ vật" onClick={() => set({ artifacts: stop.artifacts.filter((_, j) => j !== i) })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div className="sm:col-span-2">
                      <SingleImage value={a.imageUrl} disabled={readOnly} label="Ảnh cổ vật (JPG, PNG)" aspect="aspect-square"
                        onChange={(imageUrl) => setArtifact(i, { imageUrl })} />
                      {stopErr(`artifacts[${i}].imageUrl`) && <p className="text-[11px] font-bold text-rose-600">{stopErr(`artifacts[${i}].imageUrl`)}</p>}
                    </div>
                    <div className="sm:col-span-3 space-y-2">
                      <TextInput value={a.name} disabled={readOnly} placeholder="Tên cổ vật" error={stopErr(`artifacts[${i}].name`)}
                        onChange={(e) => setArtifact(i, { name: e.target.value })} />
                      <TextArea rows={3} value={a.shortDescription} disabled={readOnly} placeholder="Mô tả ngắn"
                        onChange={(e) => setArtifact(i, { shortDescription: e.target.value })} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "experience" && (
          <>
            <p className="text-[11px] text-slate-500">
              Mỗi điểm đến gồm các <b>nhiệm vụ</b>. Thứ tự trên app trong mỗi nhiệm vụ: <b>Câu hỏi quiz</b> → <b>Trải nghiệm thực tế</b> (hết giờ thì hiện câu hỏi sau trải nghiệm). Mỗi câu hỏi chọn dạng <b>Trắc nghiệm</b> hoặc <b>Tự luận</b>. Điểm thưởng mỗi nhiệm vụ do Admin cấu hình, hiển thị để tham khảo.
            </p>
            <TaskListEditor tasks={stop.tasks} readOnly={readOnly} stopName={stop.name} stopErr={stopErr} taskPoints={taskPoints}
              onChange={(tasks, paths) => set({ tasks }, paths)} />
          </>
        )}
      </div>

      <footer className="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
        <span className="text-xs font-semibold min-w-0 truncate">
          {readOnly ? null : saveStatus === "saving" ? (
              <span className="text-slate-500 inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" />Đang lưu…</span>
            ) : saveStatus === "error" ? (
              <span className="text-rose-600 font-bold inline-flex items-center gap-1.5"><AlertCircle size={13} />Chưa lưu được, vui lòng thử lại.</span>
            ) : dirty ? (
              <span className="text-amber-700 inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Có thay đổi chưa lưu</span>
            ) : saveStatus === "saved" ? (
              <span className="text-emerald-700 inline-flex items-center gap-1.5"><CheckCircle2 size={13} />Đã lưu thông tin điểm đến</span>
            ) : null}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {tabIndex > 0 && (
            <button type="button" onClick={() => goToTab(tabIndex - 1)} disabled={saveStatus === "saving"}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 disabled:opacity-60">
              <ArrowLeft size={15} /> Quay lại
            </button>
          )}
          {readOnly ? (
            tabIndex < TABS.length - 1 && (
              <button type="button" onClick={() => goToTab(tabIndex + 1)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer">
                Tiếp theo <ArrowRight size={15} />
              </button>
            )
          ) : (
            <button type="button" disabled={saveStatus === "saving"}
              onClick={() => saveAndGo(tabIndex < TABS.length - 1 ? tabIndex + 1 : null)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait">
              {saveStatus === "saving" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {tabIndex < TABS.length - 1 ? <>Lưu &amp; tiếp tục <ArrowRight size={15} /></> : "Lưu điểm đến"}
            </button>
          )}
        </div>
      </footer>

    </aside>
    </>
  );
}
