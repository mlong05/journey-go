"use client";

import React, { createContext, useContext, useState } from "react";
import { Flag, X, Check } from "lucide-react";
import { LimitedField } from "@/components/ui/LimitedField";

/** Chia sẻ danh sách ghi chú giữa các khối nội dung và cột tổng hợp. */
export const ReviewNotesContext = createContext({ notes: [], addNote: () => {}, removeNote: () => {}, readOnly: true });

export const anchorId = (a) => `blk-${a.step}-${a.stopId ?? "x"}-${(a.field || "").replace(/[^a-zA-Z0-9]/g, "_")}`;
export const sameAnchor = (a, b) => a.step === b.step && (a.stopId ?? null) === (b.stopId ?? null) && (a.field || "") === (b.field || "");

/**
 * Bọc một khối nội dung tour: rê chuột hiện nút "Gắn cờ / Ghi chú"; khối có ghi chú thì viền cam.
 * Dùng làm prop `Block` của TourContentView.
 */
export default function FlaggableBlock({ anchor, label, children }) {
  const { notes, addNote, removeNote, readOnly } = useContext(ReviewNotesContext);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const mine = notes.filter((n) => sameAnchor(n, anchor));
  const flagged = mine.length > 0;

  const save = () => {
    if (!text.trim()) return;
    addNote({ ...anchor, label, note: text.trim() });
    setText("");
    setEditing(false);
  };

  // Nút luôn hiện ở góc phải; khối chừa sẵn cột bên phải (pr-12) nên nút không bao giờ đè lên nội dung.
  return (
    <div id={anchorId(anchor)}
      className={`group relative rounded-xl p-3 transition-colors scroll-mt-24 ${!readOnly ? "pr-12" : ""} ${flagged ? "border-2 border-orange-400 bg-orange-50/40" : "border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60"}`}>
      {!readOnly && (
        <button type="button" onClick={() => setEditing((v) => !v)} aria-expanded={editing}
          aria-label={flagged ? `${mine.length} ghi chú — thêm ghi chú cho: ${label}` : `Gắn cờ / ghi chú cho: ${label}`}
          title={flagged ? `${mine.length} ghi chú · bấm để thêm` : "Gắn cờ / Ghi chú"}
          className={`absolute top-2.5 right-2.5 z-10 inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-1.5 text-[11px] font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 ${flagged ? "bg-orange-500 text-white hover:bg-orange-600" : editing ? "border border-orange-300 bg-orange-50 text-orange-600" : "border border-slate-200 bg-white text-slate-400 hover:border-orange-300 hover:text-orange-600"}`}>
          <Flag size={14} />{flagged && <span className="tabular-nums">{mine.length}</span>}
        </button>
      )}
      {children}
      {mine.length > 0 && (
        <ul className="mt-2 space-y-1">
          {mine.map((n) => (
            <li key={n.localId} className="flex items-start gap-1.5 text-xs text-orange-900 bg-orange-100/70 rounded-lg px-2 py-1">
              <Flag size={11} className="mt-0.5 shrink-0" />
              <span className="flex-1">{n.note}</span>
              {!readOnly && (
                <button type="button" onClick={() => removeNote(n.localId)} className="text-orange-700 hover:text-rose-700 cursor-pointer" aria-label="Xóa ghi chú">
                  <X size={12} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <div className="mt-2 p-2 rounded-lg border border-orange-300 bg-white space-y-1.5">
          <p className="text-[11px] font-bold text-orange-700">Ghi chú cho: {label}</p>
          <LimitedField as="textarea" limit={500} autoFocus rows={2} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save(); }}
            placeholder="Ví dụ: Câu đố số 2 có hai đáp án đúng"
            className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
          <div className="flex justify-end gap-1.5">
            <button type="button" onClick={() => { setEditing(false); setText(""); }} className="px-2.5 py-1 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Hủy</button>
            <button type="button" onClick={save} disabled={!text.trim()}
              className="px-2.5 py-1 rounded-md bg-orange-500 text-white text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer">
              <Check size={12} /> Lưu ghi chú
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
