"use client";

import React, { useEffect, useRef, useState } from "react";
import { Plus, Loader2, Trash2, RotateCcw, Pencil, Check, X } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

/** Bộ màu cố định (Tailwind cần class tĩnh). */
const ACCENTS = {
  teal: { icon: "text-teal-600", btn: "bg-teal-600 hover:bg-teal-700", tab: "bg-teal-700", ring: "focus:ring-teal-500/20", hover: "hover:text-teal-700 hover:bg-teal-50" },
  indigo: { icon: "text-indigo-600", btn: "bg-indigo-600 hover:bg-indigo-700", tab: "bg-indigo-700", ring: "focus:ring-indigo-500/20", hover: "hover:text-indigo-700 hover:bg-indigo-50" },
};

/**
 * Quản lý một danh mục dạng tên + slug (khu vực, chủ đề): thêm, đổi tên, xóa mềm, khôi phục.
 * service: { getAll, getDeleted, create({name}), update(id, {name}), delete(id), restore(id) }
 */
export default function CatalogCard({
  service, title, description, Icon, accent = "teal", noun, placeholder, deleteHint,
}) {
  const a = ACCENTS[accent] || ACCENTS.teal;
  const [items, setItems] = useState([]);
  const [deleted, setDeleted] = useState([]);
  const [tab, setTab] = useState("active");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null); // { id, name }
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const { confirm, confirmDialog } = useConfirm();

  const fetchAll = () =>
    Promise.all([service.getAll().catch(() => []), service.getDeleted().catch(() => [])]);

  useEffect(() => {
    let alive = true;
    fetchAll()
      .then(([act, del]) => { if (alive) { setItems(act || []); setDeleted(del || []); } })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      const [act, del] = await fetchAll();
      setItems(act || []);
      setDeleted(del || []);
      return true;
    } catch (err) {
      setError(err?.message || "Thao tác thất bại.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    const value = name.trim();
    if (!value) {
      setError(`Vui lòng nhập tên ${noun} trước khi thêm.`);
      inputRef.current?.focus();
      return;
    }
    if (await run(() => service.create({ name: value }))) setName("");
  };

  const remove = async (item) => {
    const ok = await confirm({
      tone: "danger", icon: "trash", title: `Chuyển ${noun} vào thùng rác?`, subject: item.name,
      description: deleteHint, confirmLabel: `Xóa ${noun}`,
    });
    if (ok) run(() => service.delete(item.id));
  };

  const saveEdit = async () => {
    if (!editing?.name.trim()) return;
    if (await run(() => service.update(editing.id, { name: editing.name }))) setEditing(null);
  };

  const rows = tab === "active" ? items : deleted;

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
      {confirmDialog}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon size={16} className={a.icon} />}
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          </div>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <input ref={inputRef} type="text" maxLength={150} value={name}
            onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && add()} placeholder={placeholder}
            className={`px-3 py-1.5 w-64 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${a.ring}`} />
          <button type="button" disabled={busy} onClick={() => add()}
            className={`px-3.5 py-1.5 rounded-xl ${a.btn} text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0`}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />} Thêm {noun}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setTab("active")}
          className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${tab === "active" ? `${a.tab} text-white` : "bg-slate-100 text-slate-600"}`}>
          Đang hoạt động ({items.length})
        </button>
        <button type="button" onClick={() => setTab("deleted")}
          className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1 ${tab === "deleted" ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"}`}>
          <Trash2 size={12} /> Thùng rác ({deleted.length})
        </button>
      </div>
      {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

      {loading ? (
        <div className="py-8 flex items-center justify-center gap-2 text-slate-400 text-xs font-bold"><Loader2 size={16} className="animate-spin" />Đang tải…</div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          {tab === "active" ? `Chưa có ${noun} nào. Nhập tên ở trên để thêm.` : "Thùng rác trống."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((item) => (
            <div key={item.id} className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${item.deleted ? "bg-rose-50/40 border-rose-200" : "bg-slate-50/80 border-slate-200"}`}>
              {editing?.id === item.id ? (
                <input autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null); }}
                  className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-slate-200 text-sm" />
              ) : (
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                  <p className="text-[11px] font-mono text-slate-400">#{item.id} · {item.slug}</p>
                </div>
              )}
              <div className="flex items-center gap-1 shrink-0">
                {item.deleted ? (
                  <button type="button" onClick={() => run(() => service.restore(item.id))}
                    className="px-2 py-1 rounded-lg text-emerald-800 bg-emerald-50 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer">
                    <RotateCcw size={12} /> Khôi phục
                  </button>
                ) : editing?.id === item.id ? (
                  <>
                    <button type="button" onClick={saveEdit} className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 cursor-pointer" aria-label="Lưu"><Check size={15} /></button>
                    <button type="button" onClick={() => setEditing(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label="Hủy"><X size={15} /></button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setEditing({ id: item.id, name: item.name })} className={`p-1.5 rounded-lg text-slate-400 ${a.hover} cursor-pointer`} title="Đổi tên"><Pencil size={14} /></button>
                    <button type="button" onClick={() => remove(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer" title="Chuyển vào thùng rác"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
