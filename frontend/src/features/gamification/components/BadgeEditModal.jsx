"use client";

import { useState } from "react";
import {
  Loader2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  BADGE_TYPE_LABEL,
  updateBadge,
  uploadBadgeIcon,
} from "../services/badgeService";
import BadgeThumbnail from "./BadgeThumbnail";

export default function BadgeEditModal({ badge, onClose, onSaved, showToast }) {
  const [form, setForm] = useState(() => ({
    name: badge?.name ?? "",
    description: badge?.description ?? "",
    iconUrl: badge?.iconUrl ?? "",
    bonusPoints: String(badge?.bonusPoints ?? 0),
    active: badge?.active ?? true,
  }));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleUploadIcon = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadBadgeIcon(file);
      set("iconUrl", url);
      showToast("Đã tải ảnh huy hiệu lên thành công.", "success");
    } catch (err) {
      showToast(err?.message || "Không thể tải ảnh lên.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const description = form.description.trim();
    const iconUrl = form.iconUrl.trim();
    const bonusPoints = Number(form.bonusPoints);

    if (!name || name.length > 150) {
      showToast("Tên huy hiệu bắt buộc và tối đa 150 ký tự.", "error");
      return;
    }
    if (description.length > 500) {
      showToast("Mô tả huy hiệu tối đa 500 ký tự.", "error");
      return;
    }
    if (iconUrl && !iconUrl.startsWith("https://")) {
      showToast("Ảnh huy hiệu phải bắt đầu bằng https:// hoặc để trống.", "error");
      return;
    }
    if (!Number.isInteger(bonusPoints) || bonusPoints < 0) {
      showToast("Điểm thưởng phải là số nguyên không âm.", "error");
      return;
    }

    setSaving(true);
    try {
      await updateBadge(badge.id, {
        name,
        description,
        iconUrl,
        bonusPoints,
        active: Boolean(form.active),
      });
      showToast("Đã cập nhật huy hiệu thành công.", "success");
      onSaved();
    } catch (err) {
      showToast(err?.message || "Không thể cập nhật huy hiệu.", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Chỉnh sửa huy hiệu</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Cập nhật tên, mô tả, ảnh đại diện và điểm thưởng của huy hiệu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs">
            <span className="rounded bg-sky-50 px-2 py-0.5 font-mono font-bold text-sky-700">
              {badge?.code}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-semibold text-slate-600">
              {BADGE_TYPE_LABEL[badge?.badgeType] || badge?.badgeType}
            </span>
            {badge?.destinationId != null && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700">
                Điểm đến #{badge.destinationId}
              </span>
            )}
            <span className="ml-auto font-semibold text-slate-500">
              {(Number(badge?.earnedCount) || 0).toLocaleString("vi-VN")} lượt đạt
            </span>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className={labelCls}>
                Tên huy hiệu <span className="text-rose-500">*</span>
              </span>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                maxLength={150}
                className={inputCls}
              />
            </label>

            <label className="block">
              <span className={labelCls}>Mô tả</span>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
                maxLength={500}
                className={`${inputCls} resize-none`}
              />
            </label>

            <label className="block">
              <span className={labelCls}>Điểm thưởng khi đạt huy hiệu</span>
              <input
                type="number"
                min={0}
                value={form.bonusPoints}
                onChange={(e) => set("bonusPoints", e.target.value)}
                className={inputCls}
              />
            </label>

            <div className="flex flex-wrap items-start gap-3">
              <BadgeThumbnail
                key={form.iconUrl}
                src={form.iconUrl}
                alt={form.name}
                className="h-14 w-14 rounded-xl"
                iconSize={24}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <label className="block">
                  <span className={labelCls}>Đường dẫn ảnh (https://)</span>
                  <input
                    value={form.iconUrl}
                    onChange={(e) => set("iconUrl", e.target.value)}
                    placeholder="https://... hoặc để trống để dùng icon mặc định"
                    maxLength={500}
                    className={inputCls}
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                    {uploading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Upload size={13} />
                    )}
                    <span>{uploading ? "Đang tải..." : "Tải ảnh lên"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={handleUploadIcon}
                      className="hidden"
                    />
                  </label>
                  {form.iconUrl && (
                    <button
                      type="button"
                      onClick={() => set("iconUrl", "")}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100"
                    >
                      <Trash2 size={12} />
                      Xóa ảnh
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set("active", !form.active)}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                form.active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-100 text-slate-500"
              }`}
            >
              {form.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              {form.active ? "Đang hoạt động" : "Tắt huy hiệu"}
            </button>
            <span className="text-xs text-slate-500">
              {form.active
                ? "Huy hiệu sẽ được cấp tự động khi du khách đạt điều kiện."
                : "Tạm ngừng cấp mới huy hiệu này."}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
