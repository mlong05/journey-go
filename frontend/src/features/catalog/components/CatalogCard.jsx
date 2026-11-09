"use client";

import React, { useEffect, useRef, useState } from "react";
import { Plus, Loader2, Trash2, RotateCcw, Pencil, Check, X } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import PaginationBar from "@/components/ui/PaginationBar";

/** Bộ màu cố định (Tailwind cần class tĩnh). */
const ACCENTS = {
  teal: { icon: "text-teal-600", btn: "bg-teal-600 hover:bg-teal-700", tab: "bg-teal-700", ring: "focus:ring-teal-500/20", hover: "hover:text-teal-700 hover:bg-teal-50" },
  indigo: { icon: "text-indigo-600", btn: "bg-indigo-600 hover:bg-indigo-700", tab: "bg-indigo-700", ring: "focus:ring-indigo-500/20", hover: "hover:text-indigo-700 hover:bg-indigo-50" },
};

/** Nút thao tác dạng icon ở cuối mỗi dòng (có tooltip + aria-label). */
function IconButton({ title, onClick, className = "", children }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick}
      className={`w-8 h-8 rounded-lg border border-slate-200 bg-white inline-flex items-center justify-center transition-colors cursor-pointer ${className}`}>
      {children}
    </button>
  );
}

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
  const [page, setPage] = useState(0); // 0-based
  const [pageSize, setPageSize] = useState(10);
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
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1); // xóa bớt dòng ở trang cuối → tự lùi trang
  const pageRows = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const editingId = editing?.id ?? null;
  const switchTab = (next) => { setTab(next); setPage(0); setEditing(null); };

  return (
    <div className="h-full min-h-0 flex flex-col gap-4 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs">
      {confirmDialog}
      <div className="shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
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

      <div className="shrink-0 flex items-center gap-2">
        <button type="button" onClick={() => switchTab("active")}
          className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${tab === "active" ? `${a.tab} text-white` : "bg-slate-100 text-slate-600"}`}>
          Đang hoạt động ({items.length})
        </button>
        <button type="button" onClick={() => switchTab("deleted")}
          className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1 ${tab === "deleted" ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"}`}>
          <Trash2 size={12} /> Thùng rác ({deleted.length})
        </button>
      </div>
      {error && <p className="shrink-0 text-xs font-bold text-rose-600">{error}</p>}

      {loading ? (
        <div className="py-8 flex items-center justify-center gap-2 text-slate-400 text-xs font-bold"><Loader2 size={16} className="animate-spin" />Đang tải…</div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          {tab === "active" ? `Chưa có ${noun} nào. Nhập tên ở trên để thêm.` : "Thùng rác trống."}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 overflow-hidden">
        {/* Danh sách tự cuộn khi dài; thanh phân trang luôn ở dưới */}
        <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
          {pageRows.map((item, idx) => (
            <li key={item.id}
              className={`px-4 py-3 flex items-center gap-3 transition-colors ${item.deleted ? "bg-rose-50/30" : "bg-white hover:bg-slate-50/70"}`}>
              <span className="w-7 shrink-0 text-xs font-bold text-slate-400 tabular-nums">{safePage * pageSize + idx + 1}</span>
              {editingId === item.id ? (
                <input autoFocus value={editing.name} maxLength={150}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null); }}
                  className={`flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${a.ring}`} />
              ) : (
                <p className="flex-1 min-w-0 font-bold text-slate-900 text-sm truncate">{item.name}</p>
              )}
              <div className="flex items-center gap-1.5 shrink-0">
                {item.deleted ? (
                  <IconButton title="Khôi phục" onClick={() => run(() => service.restore(item.id))}
                    className="text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200">
                    <RotateCcw size={14} />
                  </IconButton>
                ) : editingId === item.id ? (
                  <>
                    <IconButton title="Lưu" onClick={saveEdit} className="text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200">
                      <Check size={15} />
                    </IconButton>
                    <IconButton title="Hủy" onClick={() => setEditing(null)} className="text-slate-500 hover:bg-slate-100">
                      <X size={15} />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <IconButton title="Đổi tên" onClick={() => setEditing({ id: item.id, name: item.name })} className={`text-slate-500 ${a.hover}`}>
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton title="Chuyển vào thùng rác" onClick={() => remove(item)}
                      className="text-slate-500 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200">
                      <Trash2 size={14} />
                    </IconButton>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="shrink-0">
          <PaginationBar page={safePage} totalPages={totalPages} totalElements={rows.length} unit={noun}
          onChange={setPage} pageSize={pageSize} sizeOptions={[5, 10, 20, 50]}
          onSizeChange={(size) => { setPageSize(size); setPage(0); }} />
        </div>
        </div>
      )}
    </div>
  );
}
