"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Award,
  Search,
  Upload,
  X,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users,
  ImageOff,
  Pencil,
} from "lucide-react";
import { SURFACE, BADGE, BUTTON, MODAL, INPUT } from "../dashboard.tokens";
import { PageHeader, EmptyBlock } from "@/components/dashboard/DashboardUI";
import { badgeService, BADGE_TYPE_LABEL } from "@/features/gamification";

const FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "noIcon", label: "Chưa có ảnh" },
  { id: "inactive", label: "Đang tắt" },
];

const MAX_ICON_BYTES = 10 * 1024 * 1024;

function BadgeImage({ url, size = "w-16 h-16", muted = false }) {
  return (
    <div
      className={`${size} rounded-full border-2 ${
        muted ? "border-slate-200 grayscale opacity-60" : "border-amber-400"
      } bg-amber-50 overflow-hidden flex items-center justify-center shrink-0`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <Award className="w-1/2 h-1/2 text-amber-500" />
      )}
    </div>
  );
}

/**
 * Quản lý huy hiệu di sản: tải ảnh riêng cho từng huy hiệu, sửa tên/mô tả/điểm thưởng, bật tắt.
 * Huy hiệu check-in được backend tự tạo khi du khách check-in lần đầu tại một điểm đến.
 */
export default function AdminBadgesPage() {
  const [badges, setBadges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadBadges = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setBadges(await badgeService.getAdminBadges());
    } catch (err) {
      setError(err?.message || "Không tải được danh sách huy hiệu.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(loadBadges);
  }, [loadBadges]);

  const keyword = search.trim().toLowerCase();
  const visible = badges.filter((b) => {
    if (filter === "noIcon" && b.iconUrl) return false;
    if (filter === "inactive" && b.active) return false;
    if (!keyword) return true;
    return (b.name || "").toLowerCase().includes(keyword);
  });
  const missingIcon = badges.filter((b) => !b.iconUrl).length;

  const handleSaved = (saved) => {
    setBadges((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
    setEditing(null);
    showToast(`Đã cập nhật huy hiệu "${saved.name}"`);
  };

  return (
    <div className={SURFACE.page}>
      {toastMsg && (
        <div className="fixed top-5 right-5 z-[60] bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg border border-slate-700 text-xs font-bold flex items-center gap-2.5 max-w-md">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <PageHeader
        eyebrow="Quản trị"
        title="Huy hiệu di sản"
        description="Tải ảnh riêng cho từng huy hiệu du khách nhận được khi check-in, chỉnh mô tả và điểm thưởng."
      >
        <button
          type="button"
          onClick={loadBadges}
          disabled={isLoading}
          className={`${BUTTON.secondary} disabled:opacity-60`}
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </PageHeader>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className={`${SURFACE.card} overflow-hidden`}>
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-lg w-fit">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  filter === f.id ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f.label}
                {f.id === "noIcon" && missingIcon > 0 ? ` (${missingIcon})` : ""}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên huy hiệu..."
              className={INPUT.search}
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyBlock
            icon={Award}
            title={isLoading ? "Đang tải huy hiệu…" : "Không có huy hiệu nào phù hợp."}
            description="Huy hiệu check-in được tạo tự động khi du khách check-in lần đầu tại một điểm đến."
          />
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-4 sm:p-5">
            {visible.map((b) => (
              <li
                key={b.id}
                className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 bg-white flex gap-3.5 transition-colors"
              >
                <BadgeImage url={b.iconUrl} muted={!b.active} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-slate-900 truncate" title={b.name}>
                    {b.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className={`${BADGE.base} ${BADGE.info}`}>
                      {BADGE_TYPE_LABEL[b.badgeType] ?? b.badgeType}
                    </span>
                    {!b.iconUrl && (
                      <span className={`${BADGE.base} ${BADGE.warning}`}>
                        <ImageOff size={11} /> Chưa có ảnh
                      </span>
                    )}
                    {!b.active && <span className={`${BADGE.base} ${BADGE.neutral}`}>Đang tắt</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <span className="text-xs text-slate-600 inline-flex items-center gap-1">
                      <Users size={12} className="text-slate-400" />
                      {Number(b.earnedCount || 0).toLocaleString("vi-VN")} du khách
                      {b.bonusPoints > 0 && <span className="text-amber-700 font-semibold"> · +{b.bonusPoints} điểm</span>}
                    </span>
                    <button type="button" onClick={() => setEditing(b)} className={BUTTON.secondary}>
                      <Pencil size={12} />
                      Sửa
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className={SURFACE.cardFooter}>
          {badges.length} huy hiệu · {missingIcon} huy hiệu chưa có ảnh (app hiện biểu tượng mặc định)
        </div>
      </section>

      {editing && <BadgeEditModal badge={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
    </div>
  );
}

function BadgeEditModal({ badge, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: badge.name || "",
    description: badge.description || "",
    iconUrl: badge.iconUrl || "",
    bonusPoints: badge.bonusPoints ?? 0,
    active: badge.active,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Chỉ chấp nhận tệp hình ảnh (PNG, JPG, WEBP, GIF).");
      return;
    }
    if (file.size > MAX_ICON_BYTES) {
      setError("Ảnh tối đa 10MB.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const url = await badgeService.uploadIcon(file);
      setForm((f) => ({ ...f, iconUrl: url }));
    } catch (err) {
      setError(err?.message || "Tải ảnh lên thất bại.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Tên huy hiệu không được để trống.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      onSaved(await badgeService.update(badge.id, form));
    } catch (err) {
      setError(err?.message || "Không lưu được huy hiệu.");
      setSaving(false);
    }
  };

  return (
    <div className={MODAL.overlay} onClick={onClose}>
      <div className={MODAL.panel} onClick={(e) => e.stopPropagation()}>
        <div className={MODAL.headerRow}>
          <div>
            <h3 className="text-base font-bold text-slate-900">Sửa huy hiệu</h3>
            <p className="text-xs text-slate-500 mt-0.5">{BADGE_TYPE_LABEL[badge.badgeType] ?? "Huy hiệu"}</p>
          </div>
          <button type="button" onClick={onClose} className={MODAL.closeBtn} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <BadgeImage url={form.iconUrl} size="w-20 h-20" />
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={handleFile} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={`${BUTTON.secondary} disabled:opacity-60`}
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? "Đang tải lên…" : form.iconUrl ? "Đổi ảnh" : "Tải ảnh lên"}
            </button>
            {form.iconUrl && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, iconUrl: "" }))}
                className={BUTTON.secondary}
              >
                <Trash2 size={13} />
                Bỏ ảnh
              </button>
            )}
            <p className="w-full text-[11px] text-slate-500">Ảnh vuông, tối thiểu 256×256px, tối đa 10MB.</p>
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-700">Tên huy hiệu</span>
          <input value={form.name} onChange={set("name")} maxLength={150} className={`${INPUT.base} mt-1`} />
        </label>

        <label className="block">
          <span className="text-xs font-bold text-slate-700">Mô tả</span>
          <textarea
            value={form.description}
            onChange={set("description")}
            maxLength={500}
            rows={3}
            className={`${INPUT.base} mt-1 resize-none`}
          />
        </label>

        <div className="flex items-end justify-between gap-4">
          <label className="block w-40">
            <span className="text-xs font-bold text-slate-700">Điểm thưởng khi nhận</span>
            <input
              type="number"
              min={0}
              value={form.bonusPoints}
              onChange={set("bonusPoints")}
              className={`${INPUT.base} mt-1`}
            />
          </label>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pb-2">
            <input type="checkbox" checked={form.active} onChange={set("active")} className="w-4 h-4 accent-rose-600" />
            Đang bật (du khách có thể nhận)
          </label>
        </div>
        {!form.active && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
            Khi tắt, du khách check-in điểm đến này sẽ không nhận huy hiệu nữa; ai đã nhận vẫn giữ nguyên.
          </p>
        )}

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-2 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className={BUTTON.secondary}>
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploading}
            className={`${BUTTON.primary} disabled:opacity-60`}
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
