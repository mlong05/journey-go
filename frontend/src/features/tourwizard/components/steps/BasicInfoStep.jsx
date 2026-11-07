"use client";

import React, { useState } from "react";
import { Plus, Trash2, Sun, CalendarRange } from "lucide-react";
import { Field, TextInput, TextArea, Select, NumberInput, ImageGallery } from "../FormKit";
import { issueFor } from "../../hooks/useTourDraft";
import { LIMITS, BANNED_TITLE_WORDS } from "../../constants";

/** Lỗi tên tour phía client — khớp TourSubmissionValidator.titleError ở backend. */
export function titleError(title) {
  const t = (title || "").trim();
  if (!t) return "Tên tour không được để trống";
  if (t.length > LIMITS.TITLE_MAX) return `Tên tour tối đa ${LIMITS.TITLE_MAX} ký tự`;
  const letters = (t.match(/\p{L}/gu) || []).length;
  if (letters >= 4 && t === t.toUpperCase() && t !== t.toLowerCase()) return "Tên tour không được viết hoa toàn bộ";
  const lower = t.toLowerCase();
  const banned = BANNED_TITLE_WORDS.find((w) => lower.includes(w));
  if (banned) return `Tên tour không được dùng từ "${banned}"`;
  return null;
}

const fromTour = (tour) => ({
  title: tour.title || "",
  tourFormat: tour.tourFormat || "DAY_TRIP",
  durationMinutes: tour.durationMinutes ?? null,
  durationDays: tour.durationDays ?? null,
  durationNights: tour.durationNights ?? null,
  regionId: tour.region?.id ?? "",
  themeId: tour.theme?.id ?? "",
  description: tour.description || "",
  highlights: tour.highlights?.length ? [...tour.highlights] : ["", "", ""],
  images: tour.images || [],
  coverImageUrl: tour.coverImageUrl || "",
});

const toBody = (f) => ({
  title: f.title.trim() || undefined,
  tourFormat: f.tourFormat,
  durationMinutes: f.tourFormat === "DAY_TRIP" ? f.durationMinutes : null,
  durationDays: f.tourFormat === "MULTI_DAY" ? f.durationDays : null,
  durationNights: f.tourFormat === "MULTI_DAY" ? f.durationNights : null,
  regionId: f.regionId === "" ? null : Number(f.regionId),
  themeId: f.themeId === "" ? null : Number(f.themeId),
  description: f.description,
  highlights: f.highlights.map((h) => h.trim()).filter(Boolean),
  images: f.images,
  coverImageUrl: f.coverImageUrl || null,
});

export default function BasicInfoStep({ tour, regions, themes, issues, readOnly, onSave }) {
  const [form, setForm] = useState(() => fromTour(tour));
  const [touched, setTouched] = useState(false);

  const update = (patch) => {
    const next = { ...form, ...patch };
    setForm(next);
    setTouched(true);
    if (readOnly) return;
    const invalidNights = next.tourFormat === "MULTI_DAY" && next.durationNights != null
      && next.durationDays != null && next.durationNights > next.durationDays;
    if (invalidNights) return; // backend sẽ từ chối — chờ sửa xong mới lưu
    const body = toBody(next);
    if (titleError(next.title)) body.title = undefined; // tên đang sai: vẫn lưu các trường khác
    onSave(body);
  };

  const localTitleError = touched ? titleError(form.title) : null;
  const hours = form.durationMinutes != null ? Math.floor(form.durationMinutes / 60) : null;
  const minutes = form.durationMinutes != null ? form.durationMinutes % 60 : null;
  const setDuration = (h, m) => {
    const total = (h || 0) * 60 + (m || 0);
    update({ durationMinutes: total > 0 ? total : null });
  };
  const nightsError =
    form.tourFormat === "MULTI_DAY" && form.durationNights != null && form.durationDays != null && form.durationNights > form.durationDays
      ? "Số đêm không được lớn hơn số ngày"
      : null;

  const err = (field) => issueFor(issues, "BASIC_INFO", field);

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Thông tin chung</h3>

        <Field label="Tên tour" required counter={`${form.title.trim().length}/${LIMITS.TITLE_MAX}`}
          hint='Không viết hoa toàn bộ, không dùng từ như "rẻ nhất", "độc quyền". Nên có chủ đề rõ ràng.'
          error={localTitleError || err("title")}>
          <TextInput value={form.title} maxLength={LIMITS.TITLE_MAX + 20} disabled={readOnly}
            placeholder="Ví dụ: Theo chân thợ mộc khám phá kiến trúc gỗ Hội An"
            onChange={(e) => update({ title: e.target.value })} error={localTitleError || err("title")} />
        </Field>

        <Field label="Hình thức tour" required error={err("tourFormat")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { key: "DAY_TRIP", label: "Trong ngày", desc: "Nhập thời lượng giờ + phút", Icon: Sun },
              { key: "MULTI_DAY", label: "Nhiều ngày", desc: "Nhập số ngày và số đêm", Icon: CalendarRange },
            ].map(({ key, label, desc, Icon }) => (
              <button key={key} type="button" disabled={readOnly} onClick={() => update({ tourFormat: key })}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 cursor-pointer disabled:cursor-default ${form.tourFormat === key ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/15" : "border-slate-200 hover:bg-slate-50"}`}>
                <Icon size={18} className={form.tourFormat === key ? "text-emerald-600" : "text-slate-400"} />
                <span>
                  <span className="block text-sm font-bold text-slate-800">{label}</span>
                  <span className="block text-[11px] text-slate-500">{desc}</span>
                </span>
              </button>
            ))}
          </div>
        </Field>

        {form.tourFormat === "DAY_TRIP" ? (
          <Field label="Thời lượng" required error={err("durationMinutes")}>
            <div className="grid grid-cols-2 gap-2.5 max-w-sm">
              <NumberInput value={hours} min={0} max={24} suffix="giờ" disabled={readOnly}
                onChange={(h) => setDuration(h, minutes)} />
              <NumberInput value={minutes} min={0} max={59} suffix="phút" disabled={readOnly}
                onChange={(m) => setDuration(hours, m)} />
            </div>
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 max-w-sm">
            <Field label="Số ngày" required error={err("durationDays")}>
              <NumberInput value={form.durationDays} min={2} max={60} suffix="ngày" disabled={readOnly}
                onChange={(v) => update({ durationDays: v })} />
            </Field>
            <Field label="Số đêm" required error={nightsError || err("durationNights")}>
              <NumberInput value={form.durationNights} min={0} max={60} suffix="đêm" disabled={readOnly}
                onChange={(v) => update({ durationNights: v })} />
            </Field>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Khu vực" required error={err("regionId")}
            hint={regions.length === 0 ? "Admin chưa tạo khu vực nào." : null}>
            <Select value={form.regionId} disabled={readOnly} onChange={(e) => update({ regionId: e.target.value })} error={err("regionId")}>
              <option value="">— Chọn khu vực —</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
          <Field label="Chủ đề" required error={err("themeId")}
            hint={themes.length === 0 ? "Admin chưa tạo chủ đề nào." : null}>
            <Select value={form.themeId} disabled={readOnly} onChange={(e) => update({ themeId: e.target.value })} error={err("themeId")}>
              <option value="">— Chọn chủ đề —</option>
              {themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Mô tả</h3>
        <Field label="Mô tả tour" required hint="Câu đầu tiên hiển thị trên thẻ tour ở trang tìm kiếm." error={err("description")}>
          <TextArea rows={5} value={form.description} disabled={readOnly}
            placeholder="Theo chân nghệ nhân làng mộc Kim Bồng tự tay đục hoa văn gỗ…"
            onChange={(e) => update({ description: e.target.value })} error={err("description")} />
        </Field>

        <Field label={`Điểm nổi bật (${LIMITS.HIGHLIGHTS_MIN}–${LIMITS.HIGHLIGHTS_MAX} ý)`} required error={err("highlights")}>
          <div className="space-y-2">
            {form.highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 text-xs font-bold text-slate-400 text-right">{i + 1}.</span>
                <TextInput value={h} maxLength={300} disabled={readOnly}
                  onChange={(e) => update({ highlights: form.highlights.map((x, j) => (j === i ? e.target.value : x)) })} />
                {!readOnly && form.highlights.length > 1 && (
                  <button type="button" title="Xóa ý này"
                    onClick={() => update({ highlights: form.highlights.filter((_, j) => j !== i) })}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
            {!readOnly && form.highlights.length < LIMITS.HIGHLIGHTS_MAX && (
              <button type="button" onClick={() => update({ highlights: [...form.highlights, ""] })}
                className="ml-7 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline cursor-pointer">
                <Plus size={14} /> Thêm điểm nổi bật
              </button>
            )}
          </div>
        </Field>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Hình ảnh</h3>
        <Field required label={`Ảnh thật của tour (ít nhất ${LIMITS.IMAGES_MIN} ảnh)`}
          hint="Ảnh đối tác có quyền sử dụng, tập trung vào con người và hoạt động trải nghiệm."
          error={err("images") || err("coverImageUrl")}>
          <ImageGallery value={form.images} cover={form.coverImageUrl} disabled={readOnly}
            onChange={(images, coverImageUrl) => update({ images, coverImageUrl })} />
        </Field>
      </section>
    </div>
  );
}
