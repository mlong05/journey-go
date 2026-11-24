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
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_TIERS,
  BUILT_IN_EVENT_CODES,
  createAdminAchievement,
  updateAdminAchievement,
} from "../services/achievementAdminService";
import { uploadBadgeIcon } from "../services/badgeService";
import BadgeThumbnail from "./BadgeThumbnail";

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  category: "TOUR",
  tier: "BRONZE",
  targetValue: "1",
  pointsReward: "100",
  badgeId: "",
  badgeName: "",
  badgeIcon: "",
  active: true,
};

export default function AchievementFormModal({
  mode,
  initialData,
  badges = [],
  onClose,
  onSaved,
  showToast,
}) {
  const isEdit = mode === "edit";
  const hasProgress =
    isEdit &&
    ((Number(initialData?.achievedCount) || 0) > 0 ||
      (Number(initialData?.claimedCount) || 0) > 0);

  const [form, setForm] = useState(() =>
    isEdit && initialData
      ? {
          code: initialData.code ?? "",
          name: initialData.name ?? "",
          description: initialData.description ?? "",
          category: initialData.category ?? "TOUR",
          tier: initialData.tier ?? "BRONZE",
          targetValue: String(initialData.targetValue ?? 1),
          pointsReward: String(initialData.pointsReward ?? 0),
          badgeId: initialData.badgeId != null ? String(initialData.badgeId) : "",
          badgeName: initialData.badgeName ?? "",
          badgeIcon: initialData.badgeIcon ?? "",
          active: initialData.active ?? true,
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleBadgeChange = (nextBadgeId) => {
    setForm((prev) => {
      const prevBadge = badges.find((b) => String(b.id) === String(prev.badgeId));
      const nextBadge = badges.find((b) => String(b.id) === String(nextBadgeId));
      let nextBadgeName = prev.badgeName;
      let nextBadgeIcon = prev.badgeIcon;

      if (nextBadge) {
        if (!prev.badgeName.trim() || (prevBadge && prev.badgeName === prevBadge.name)) {
          nextBadgeName = nextBadge.name || "";
        }
        if (!prev.badgeIcon.trim() || (prevBadge && prev.badgeIcon === prevBadge.iconUrl)) {
          nextBadgeIcon = nextBadge.iconUrl || "";
        }
      }

      return {
        ...prev,
        badgeId: nextBadgeId,
        badgeName: nextBadgeName,
        badgeIcon: nextBadgeIcon,
      };
    });
  };

  const handleUploadIcon = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadBadgeIcon(file);
      set("badgeIcon", url);
      showToast("Đã tải ảnh huy hiệu lên thành công.", "success");
    } catch (err) {
      showToast(err?.message || "Không thể tải ảnh lên.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    const description = form.description.trim();
    const targetValue = Number(form.targetValue);
    const pointsReward = Number(form.pointsReward);

    if (!code || code.length > 100) {
      showToast("Mã thành tựu bắt buộc và tối đa 100 ký tự.", "error");
      return;
    }
    if (!name || name.length > 150) {
      showToast("Tên thành tựu bắt buộc và tối đa 150 ký tự.", "error");
      return;
    }
    if (!description) {
      showToast("Vui lòng nhập mô tả điều kiện đạt thành tựu.", "error");
      return;
    }
    if (!Number.isInteger(targetValue) || targetValue < 1) {
      showToast("Giá trị mục tiêu phải là số nguyên từ 1 trở lên.", "error");
      return;
    }
    if (!Number.isInteger(pointsReward) || pointsReward < 0) {
      showToast("Điểm thưởng phải là số nguyên không âm.", "error");
      return;
    }

    const parsedBadgeId = form.badgeId !== "" ? Number(form.badgeId) : null;
    const trimmedBadgeName = form.badgeName.trim();
    const trimmedBadgeIcon = form.badgeIcon.trim();

    const payload = {
      code,
      name,
      description,
      category: form.category,
      tier: form.tier,
      targetValue,
      pointsReward,
      badgeName: isEdit ? trimmedBadgeName : trimmedBadgeName || null,
      badgeIcon: isEdit ? trimmedBadgeIcon : trimmedBadgeIcon || null,
      badgeId: isEdit ? (parsedBadgeId ?? 0) : parsedBadgeId,
      active: Boolean(form.active),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateAdminAchievement(initialData.id, payload);
        showToast("Đã cập nhật cấu hình thành tựu.", "success");
      } else {
        await createAdminAchievement(payload);
        showToast("Đã tạo thành tựu mới thành công.", "success");
      }
      onSaved();
    } catch (err) {
      showToast(err?.message || "Không thể lưu cấu hình thành tựu.", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEdit ? "Chỉnh sửa thành tựu" : "Tạo thành tựu mới"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {isEdit
                ? "Cập nhật tên, điều kiện, điểm thưởng và huy hiệu đi kèm."
                : "Thiết lập cột mốc thành tựu mới cho du khách trên Web & Mobile."}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>
                Mã thành tựu <span className="text-rose-500">*</span>
              </span>
              <input
                list="built-in-achievement-codes"
                value={form.code}
                onChange={(e) =>
                  set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))
                }
                placeholder="FIRST_TOUR"
                maxLength={100}
                disabled={hasProgress}
                className={`${inputCls} font-mono ${
                  hasProgress ? "cursor-not-allowed opacity-60" : ""
                }`}
              />
              <datalist id="built-in-achievement-codes">
                {BUILT_IN_EVENT_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.hint}
                  </option>
                ))}
              </datalist>
              <p className="mt-1 text-[11px] text-slate-400">
                {hasProgress
                  ? "Thành tựu đã có du khách đạt/nhận thưởng nên không thể đổi mã."
                  : "Dùng chữ in hoa và dấu gạch dưới (_), khớp event code nếu tự động cộng tiến độ."}
              </p>
            </label>

            <label className="block">
              <span className={labelCls}>
                Danh mục <span className="text-rose-500">*</span>
              </span>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className={inputCls}
              >
                {Object.entries(ACHIEVEMENT_CATEGORIES).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className={labelCls}>
                Tên thành tựu <span className="text-rose-500">*</span>
              </span>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ví dụ: Bước Chân Đầu Tiên"
                maxLength={150}
                className={inputCls}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className={labelCls}>
                Mô tả điều kiện <span className="text-rose-500">*</span>
              </span>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
                placeholder="Mô tả rõ điều kiện để du khách đạt thành tựu..."
                className={`${inputCls} resize-none`}
              />
            </label>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Cấp bậc, Mục tiêu & Điểm thưởng
            </h3>

            <div>
              <span className={labelCls}>
                Cấp bậc <span className="text-rose-500">*</span>
              </span>
              <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(ACHIEVEMENT_TIERS).map(([key, meta]) => {
                  const selected = form.tier === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set("tier", key)}
                      className={`cursor-pointer rounded-xl border-2 px-3 py-2 text-xs font-bold transition-all ${
                        selected
                          ? "border-sky-500 bg-sky-50 text-sky-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>
                  Giá trị mục tiêu ({ACHIEVEMENT_CATEGORIES[form.category]?.unit || "mốc"}){" "}
                  <span className="text-rose-500">*</span>
                </span>
                <input
                  type="number"
                  min={1}
                  value={form.targetValue}
                  onChange={(e) => set("targetValue", e.target.value)}
                  className={inputCls}
                />
              </label>

              <label className="block">
                <span className={labelCls}>
                  Journey Points thưởng <span className="text-rose-500">*</span>
                </span>
                <input
                  type="number"
                  min={0}
                  value={form.pointsReward}
                  onChange={(e) => set("pointsReward", e.target.value)}
                  className={inputCls}
                />
              </label>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Huy hiệu phần thưởng đi kèm
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Liên kết huy hiệu từ kho</span>
                <select
                  value={form.badgeId}
                  onChange={(e) => handleBadgeChange(e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- Không gắn huy hiệu từ kho --</option>
                  {badges.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={labelCls}>Tên huy hiệu hiển thị</span>
                <input
                  value={form.badgeName}
                  onChange={(e) => set("badgeName", e.target.value)}
                  placeholder="Ví dụ: Nhà Khám Phá Tập Sự 🥉"
                  maxLength={150}
                  className={inputCls}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-start gap-3">
              <BadgeThumbnail
                key={form.badgeIcon}
                src={form.badgeIcon}
                alt={form.badgeName || form.name}
                className="h-12 w-12 rounded-xl"
                iconSize={22}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <label className="block">
                  <span className={labelCls}>URL ảnh huy hiệu</span>
                  <input
                    value={form.badgeIcon}
                    onChange={(e) => set("badgeIcon", e.target.value)}
                    placeholder="https://... hoặc tải ảnh lên bên dưới"
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
                  {form.badgeIcon && (
                    <button
                      type="button"
                      onClick={() => set("badgeIcon", "")}
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
              {form.active ? "Đang áp dụng" : "Tạm tắt"}
            </button>
            <span className="text-xs text-slate-500">
              {form.active
                ? "Thành tựu hiển thị cho du khách và tự động ghi nhận tiến độ."
                : "Thành tựu được ẩn nhưng vẫn bảo toàn lịch sử du khách đã đạt."}
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
              {isEdit ? "Lưu thay đổi" : "Tạo thành tựu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
