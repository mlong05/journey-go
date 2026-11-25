"use client";

import React, { useRef, useState } from "react";
import {
  X, Plus, Trash2, Info, BookOpen, Gamepad2, Save, Loader2, CheckCircle2, AlertCircle,
  ChevronRight, ArrowLeft, ArrowRight, MapPin,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import GoongMapPickerModal from "@/features/destination/components/GoongMapPickerModal";
import { Field, TextInput, TextArea, SingleImage, ImageStrip, VideoField, NumberInput } from "../FormKit";
import { LIMITS } from "../../constants";
import StopActivitiesEditor from "./StopActivitiesEditor";
import CheckpointMap from "./CheckpointMap";
import ExperienceQr from "./ExperienceQr";
import StepNumber from "../StepNumber";

let keySeq = 0;
export const newKey = () => `k${Date.now().toString(36)}${(keySeq++).toString(36)}`;

export const emptyArtifact = () => ({ _key: newKey(), name: "", imageUrl: "", shortDescription: "" });
export const emptyThenNow = () => ({ _key: newKey(), thenImageUrl: "", nowImageUrl: "", thenLabel: "", caption: "", credit: "" });
const THEN_NOW_MAX = 3;

/** Ba bước thiết lập điểm đến, làm lần lượt: Thông tin → Nội dung văn hóa → Trải nghiệm. */
const TABS = [
  { key: "info", label: "Thông tin", Icon: Info, fields: ["name", "location", "checkInRadiusMeters", "shortDescription", "guestNote", "imageUrl"] },
  { key: "culture", label: "Nội dung văn hóa", Icon: BookOpen, fields: ["videoUrl", "videoSource", "culturalContent", "culturalImages", "artifacts", "thenNow"] },
  { key: "experience", label: "Trải nghiệm", Icon: Gamepad2, fields: ["quiz", "experiences"] },
];

/** `field` là chính `path` hoặc nằm bên trong nó ("artifacts[0].name" thuộc "artifacts" / "artifacts[0]"). */
const within = (field, path) => field === path || field.startsWith(`${path}.`) || field.startsWith(`${path}[`);
const tabOfField = (field) => TABS.findIndex((t) => t.fields.some((p) => within(field, p)));

/**
 * Khung bên phải thiết lập một điểm đến, chia 3 bước.
 * Chỉnh sửa trên bản nháp riêng; "Lưu & tiếp tục" ghi lên máy chủ, kiểm tra lại,
 * và chỉ sang bước sau khi bước hiện tại không còn lỗi.
 * onSave(stop) → Promise<{ ok, issues }> (issues: danh sách lỗi mới nhất của cả tour, hoặc null).
 * stopErr(field) trả lỗi backend của điểm đến này (field như "quiz[0].answers").
 * rewardPoints: { quizPerQuestion, perExperience } — điểm Admin cấu hình, chỉ hiển thị.
 */
export default function StopDrawer({ stop: savedStop, index, onSave, onClose, readOnly, rewardPoints, stopErr: serverErr }) {
  const [tab, setTab] = useState("info");
  const [stop, setDraft] = useState(savedStop);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const [stepNotice, setStepNotice] = useState("");
  // Còn form câu đố / trải nghiệm đang soạn (chưa bấm "Lưu câu đố" / "Lưu trải nghiệm").
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [pickLocation, setPickLocation] = useState(false);
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
    if (activityFormOpen) {
      setStepNotice("Bạn còn câu đố / trải nghiệm đang soạn — bấm \"Lưu\" hoặc \"Hủy\" trong form đó trước.");
      return;
    }
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
    // Rời tab Trải nghiệm khi form câu đố / trải nghiệm còn mở thì bản đang soạn sẽ mất ⇒ bắt Lưu hoặc Hủy trước.
    if (activityFormOpen && !readOnly) {
      setStepNotice("Bạn còn câu đố / trải nghiệm đang soạn — bấm \"Lưu\" hoặc \"Hủy\" trong form đó trước.");
      return;
    }
    if (readOnly || i < tabIndex) {
      setStepNotice("");
      showTab(i);
      return;
    }
    saveAndGo(i);
  };

  const requestClose = async () => {
    if ((dirty || activityFormOpen) && !readOnly) {
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

  const setThenNow = (i, patch) =>
    set(
      { thenNow: (stop.thenNow || []).map((t, j) => (j === i ? { ...t, ...patch } : t)) },
      Object.keys(patch).map((k) => `thenNow[${i}].${k}`),
    );
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
                <StepNumber n={i + 1} size="sm" status={hasError ? "error" : active ? "active" : done ? "done" : "idle"} />
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
              <TextInput value={stop.name} disabled={readOnly} limit={LIMITS.TEXT.STOP_NAME}
                placeholder="Ví dụ: Xưởng mộc làng Kim Bồng" onChange={(e) => set({ name: e.target.value })} error={stopErr("name")} />
            </Field>
            <Field label="Vị trí check-in" required error={stopErr("location")}
              hint="Đặt ghim tại cổng hoặc lối vào chính. Khách phải đứng trong vòng tròn bán kính mới check-in được và mở khóa trải nghiệm.">
              <CheckpointMap latitude={stop.latitude} longitude={stop.longitude} radius={stop.checkInRadiusMeters}
                emptyLabel="Chưa chọn vị trí check-in" />
              {!readOnly && (
                <button type="button" onClick={() => setPickLocation(true)}
                  className="mt-2 px-3 py-1.5 rounded-lg border border-emerald-200 bg-white text-emerald-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-emerald-50">
                  <MapPin size={13} /> {stop.latitude != null ? "Đổi vị trí trên bản đồ" : "Chọn vị trí trên bản đồ"}
                </button>
              )}
            </Field>
            <Field label="Bán kính check-in" required error={stopErr("checkInRadiusMeters")}>
              <div className="max-w-[200px]">
                <NumberInput value={stop.checkInRadiusMeters} min={LIMITS.STOP_RADIUS_MIN} max={LIMITS.STOP_RADIUS_MAX}
                  suffix="mét" disabled={readOnly} error={stopErr("checkInRadiusMeters")}
                  onChange={(checkInRadiusMeters) => set({ checkInRadiusMeters })} />
              </div>
            </Field>
            <Field label="Mã QR check-in tại điểm">
              <ExperienceQr token={stop.qrToken} label={`check-in ${stop.name || "diem-den"}`}
                title="Mã QR check-in trạm"
                description="In và dán mã này tại cổng / lối vào. Khách check-in bằng GPS (trong bán kính) hoặc quét mã này khi GPS yếu. Mã được giữ nguyên khi bạn sửa điểm đến."
                emptyText="Mã QR sẽ được tạo khi bạn lưu điểm đến." />
            </Field>
            <Field label="Mô tả ngắn" required error={stopErr("shortDescription")}>
              <TextArea rows={3} value={stop.shortDescription} limit={LIMITS.TEXT.STOP_SHORT} disabled={readOnly}
                onChange={(e) => set({ shortDescription: e.target.value })} error={stopErr("shortDescription")} />
            </Field>
            <Field label="Lưu ý cho khách" hint="Không bắt buộc. Ví dụ: mang giày kín mũi, ăn mặc lịch sự.">
              <TextArea rows={2} value={stop.guestNote} limit={LIMITS.TEXT.STOP_NOTE} disabled={readOnly} onChange={(e) => set({ guestNote: e.target.value })} />
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
            <Field label="Video câu chuyện văn hóa" hint="Không bắt buộc. Dán link YouTube / MP4 hoặc tải video lên."
              error={stopErr("videoSource")}>
              <VideoField url={stop.videoUrl} source={stop.videoSource} disabled={readOnly}
                onChange={(videoUrl, videoSource) => set({ videoUrl, videoSource })} />
            </Field>
            <Field label="Nội dung văn hóa (câu chuyện)" required error={stopErr("culturalContent")}>
              <TextArea rows={7} value={stop.culturalContent} limit={LIMITS.TEXT.CULTURE} disabled={readOnly}
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
                      <TextInput value={a.name} limit={LIMITS.TEXT.ARTIFACT_NAME} disabled={readOnly} placeholder="Tên cổ vật" error={stopErr(`artifacts[${i}].name`)}
                        onChange={(e) => setArtifact(i, { name: e.target.value })} />
                      <TextArea rows={3} value={a.shortDescription} limit={LIMITS.TEXT.ARTIFACT_DESC} disabled={readOnly} placeholder="Mô tả ngắn"
                        onChange={(e) => setArtifact(i, { shortDescription: e.target.value })} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <ThenNowEditor items={stop.thenNow || []} readOnly={readOnly} stopErr={stopErr}
              onAdd={() => set({ thenNow: [...(stop.thenNow || []), emptyThenNow()] })}
              onRemove={(i) => set({ thenNow: stop.thenNow.filter((_, j) => j !== i) }, [`thenNow[${i}]`])}
              onChange={setThenNow} />
          </>
        )}

        {tab === "experience" && (
          <>
            <p className="text-[11px] text-slate-500">
              Thứ tự trên app: <b>Câu đố văn hóa</b> → <b>Trải nghiệm thực tế</b>. Câu đố có 4 dạng: <b>chọn đáp án</b>, <b>chọn ảnh</b>, <b>xếp thứ tự</b>, <b>đoán số</b>. Trải nghiệm thực tế: đến <b>checkpoint</b> → <b>đếm ngược</b> → quét <b>mã QR</b> tại điểm → trả lời câu hỏi <b>tự luận</b> (khách nhập chữ). Bấm <b>Thêm</b> để soạn từng mục. Điểm thưởng do Admin cấu hình, hiển thị để tham khảo.
            </p>
            <StopActivitiesEditor stop={stop} readOnly={readOnly} stopErr={stopErr}
              quizPoints={rewardPoints?.quizPerQuestion} experiencePoints={rewardPoints?.perExperience}
              onEditingChange={setActivityFormOpen}
              onChange={(patch, paths) => set(patch, paths)} />
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

    {pickLocation && (
      <GoongMapPickerModal
        isOpen
        onClose={() => setPickLocation(false)}
        placeName={stop.name}
        initialLatitude={stop.latitude}
        initialLongitude={stop.longitude}
        onSelect={({ latitude, longitude }) => {
          // Toạ độ là một trường "location" với backend: sửa thì ẩn lỗi cũ của cả cặp.
          set({ latitude: Number(latitude), longitude: Number(longitude) }, ["location", "latitude", "longitude"]);
          setPickLocation(false);
        }}
      />
    )}
    </>
  );
}

/** Ảnh xưa và nay: tối đa 3 cặp (ảnh tư liệu + ảnh hiện tại cùng góc), bắt buộc ghi nguồn ảnh tư liệu. */
function ThenNowEditor({ items, readOnly, stopErr, onAdd, onRemove, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-800">Ảnh xưa và nay ({items.length}/{THEN_NOW_MAX})</h4>
        {!readOnly && items.length < THEN_NOW_MAX && (
          <button type="button" onClick={onAdd}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline cursor-pointer">
            <Plus size={14} /> Thêm cặp ảnh
          </button>
        )}
      </div>
      <p className="text-[11px] text-slate-500">
        Khách kéo thanh trượt để so sánh ảnh tư liệu với cảnh hiện tại. Chụp ảnh hiện tại <b>cùng góc</b> với ảnh tư liệu.
        Ảnh tư liệu thường có bản quyền — hãy ghi rõ nguồn và chỉ dùng ảnh được phép.
      </p>
      {items.length === 0 && <p className="text-[11px] text-slate-400">Chưa có cặp ảnh nào (không bắt buộc).</p>}
      {items.map((t, i) => {
        const err = (f) => stopErr(f ? `thenNow[${i}].${f}` : `thenNow[${i}]`);
        return (
          <div key={t._key} className="p-3 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-600">Cặp ảnh {i + 1}</span>
              {!readOnly && (
                <button type="button" title="Xóa cặp ảnh" onClick={() => onRemove(i)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-700">Ảnh tư liệu (xưa)</span>
                <SingleImage value={t.thenImageUrl} disabled={readOnly} label="Tải ảnh tư liệu" aspect="aspect-[4/3]"
                  onChange={(thenImageUrl) => onChange(i, { thenImageUrl })} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-700">Ảnh hiện tại (nay)</span>
                <SingleImage value={t.nowImageUrl} disabled={readOnly} label="Tải ảnh hiện tại" aspect="aspect-[4/3]"
                  onChange={(nowImageUrl) => onChange(i, { nowImageUrl })} />
              </div>
            </div>
            {err() && <p className="text-[11px] font-bold text-rose-600">{err()}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <TextInput value={t.thenLabel} limit={50} disabled={readOnly} placeholder="Thời điểm ảnh xưa, vd. 1975"
                error={err("thenLabel")} onChange={(e) => onChange(i, { thenLabel: e.target.value })} />
              <div className="sm:col-span-2">
                <TextInput value={t.credit} limit={300} disabled={readOnly} placeholder="Nguồn ảnh tư liệu, vd. TTXVN / Bảo tàng…"
                  error={err("credit")} onChange={(e) => onChange(i, { credit: e.target.value })} />
              </div>
            </div>
            {(err("thenLabel") || err("credit")) && (
              <p className="text-[11px] font-bold text-rose-600">{err("thenLabel") || err("credit")}</p>
            )}
            <TextArea rows={2} value={t.caption} limit={500} disabled={readOnly} placeholder="Chú thích ngắn: điều gì đã thay đổi?"
              onChange={(e) => onChange(i, { caption: e.target.value })} />
          </div>
        );
      })}
    </div>
  );
}
