"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Download, FileSpreadsheet, UploadCloud, Loader2, CheckCircle2, AlertTriangle, XCircle, FileText,
} from "lucide-react";
import { tourImportService } from "../services/providerTourService";

const MAX_BYTES = 5 * 1024 * 1024;

const SUMMARY_ITEMS = [
  ["stops", "điểm đến"],
  ["quizQuestions", "câu quiz"],
  ["experiences", "trải nghiệm"],
  ["artifacts", "cổ vật"],
  ["images", "ảnh"],
  ["prices", "loại giá"],
  ["itineraryDays", "ngày lịch trình"],
  ["departureDates", "ngày khởi hành"],
];

/** "Điểm đến · dòng 3 · Tên điểm đến" */
function where(issue) {
  return [issue.sheet, issue.row ? `dòng ${issue.row}` : null, issue.column].filter(Boolean).join(" · ") || "Cả file";
}

function IssueList({ items, tone }) {
  const cls = tone === "error"
    ? { box: "border-rose-200 bg-rose-50/60", where: "text-rose-700" }
    : { box: "border-amber-200 bg-amber-50/60", where: "text-amber-700" };
  return (
    <ul className={`rounded-xl border ${cls.box} divide-y divide-white/70 max-h-56 overflow-y-auto overscroll-contain [scrollbar-width:thin]`}>
      {items.map((issue, i) => (
        <li key={i} className="px-3 py-2 text-xs">
          <span className={`font-bold ${cls.where}`}>{where(issue)}</span>
          <span className="text-slate-700"> — {issue.message}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Nhập tour từ Excel: tải file mẫu → chọn file (tự kiểm tra) → tạo bản nháp.
 * onCreated(tourId) được gọi sau khi tạo bản nháp thành công.
 */
export default function TourImportDialog({ open, onClose, onCreated }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(null); // "template" | "sample"
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const busy = checking || importing;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose?.(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onClose]);

  if (!open || typeof document === "undefined") return null;

  const reset = () => {
    setFile(null);
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose?.();
  };

  const download = async (sample) => {
    setDownloading(sample ? "sample" : "template");
    setError("");
    try {
      await tourImportService.downloadTemplate({ sample });
    } catch (err) {
      setError(err?.message || "Không tải được file mẫu.");
    } finally {
      setDownloading(null);
    }
  };

  const choose = async (picked) => {
    if (!picked || busy) return;
    setResult(null);
    setError("");
    if (!picked.name.toLowerCase().endsWith(".xlsx")) {
      setFile(null);
      setError("Chỉ nhận file Excel .xlsx — hãy dùng file tải từ nút \"Tải file mẫu\".");
      return;
    }
    if (picked.size > MAX_BYTES) {
      setFile(null);
      setError("File quá lớn: tối đa 5MB.");
      return;
    }
    setFile(picked);
    setChecking(true);
    try {
      setResult(await tourImportService.preview(picked));
    } catch (err) {
      setError(err?.message || "Không kiểm tra được file.");
    } finally {
      setChecking(false);
    }
  };

  const create = async () => {
    if (!file || !result?.valid || busy) return;
    setImporting(true);
    setError("");
    try {
      const res = await tourImportService.importTour(file);
      reset();
      onCreated?.(res?.tourId);
    } catch (err) {
      const payload = err?.payload?.data;
      if (payload && Array.isArray(payload.errors)) setResult(payload);
      else setError(err?.message || "Không tạo được bản nháp.");
    } finally {
      setImporting(false);
    }
  };

  const summary = result?.summary;
  const errors = result?.errors || [];
  const warnings = result?.warnings || [];

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" role="presentation">
      <div onClick={close} className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" />

      <div role="dialog" aria-modal="true" aria-labelledby="tour-import-title"
        className="relative w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col rounded-2xl bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] overflow-hidden">
        <div className="shrink-0 flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h2 id="tour-import-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-emerald-600" /> Nhập tour từ Excel
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Mỗi file là 1 tour. Hệ thống tạo một <b>bản nháp</b> — bạn kiểm tra lại, bổ sung ảnh rồi gửi duyệt như bình thường.
            </p>
          </div>
          <button type="button" onClick={close} disabled={busy} aria-label="Đóng"
            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-40">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
          {/* Bước 1 */}
          <section className="space-y-2">
            <h3 className="text-[13px] font-bold text-slate-800">1. Tải file mẫu và điền thông tin</h3>
            <p className="text-xs text-slate-500">
              Giữ nguyên tên sheet, tên cột và dòng tiêu đề. Khu vực, chủ đề, loại khách… có sẵn danh sách thả xuống.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => download(false)} disabled={!!downloading}
                className="h-9 px-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-semibold flex items-center gap-1.5 hover:bg-emerald-100 cursor-pointer disabled:opacity-60">
                {downloading === "template" ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Tải file mẫu
              </button>
              <button type="button" onClick={() => download(true)} disabled={!!downloading}
                className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[13px] font-semibold flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer disabled:opacity-60">
                {downloading === "sample" ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />} Xem file ví dụ
              </button>
            </div>
          </section>

          {/* Bước 2 */}
          <section className="space-y-2">
            <h3 className="text-[13px] font-bold text-slate-800">2. Chọn file đã điền</h3>
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); choose(e.dataTransfer.files?.[0]); }}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${busy ? "cursor-wait" : "cursor-pointer"} ${dragOver ? "border-emerald-400 bg-emerald-50/60" : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"}`}>
              <input ref={inputRef} type="file" className="sr-only" disabled={busy}
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => choose(e.target.files?.[0])} />
              {checking ? <Loader2 size={22} className="animate-spin text-emerald-600" /> : <UploadCloud size={22} className="text-slate-400" />}
              <span className="text-[13px] font-semibold text-slate-700">
                {checking ? "Đang kiểm tra file…" : file ? file.name : "Kéo thả file vào đây hoặc bấm để chọn"}
              </span>
              <span className="text-[11px] text-slate-400">{file && !checking ? "Bấm để chọn file khác" : "Chỉ nhận .xlsx, tối đa 5MB"}</span>
            </label>
          </section>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 flex items-start gap-2">
              <XCircle size={15} className="shrink-0 mt-px" /> {error}
            </div>
          )}

          {/* Kết quả kiểm tra */}
          {result && !checking && (
            <section className="space-y-3">
              {result.valid ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5">
                  <p className="text-[13px] font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 size={15} /> File hợp lệ{summary?.title ? `: ${summary.title}` : ""}
                  </p>
                  {summary && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {SUMMARY_ITEMS.map(([key, label]) => (
                        <span key={key} className="px-2 py-0.5 rounded-md bg-white border border-emerald-100 text-[11px] font-semibold text-slate-700 tabular-nums">
                          {summary[key] ?? 0} {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[13px] font-bold text-rose-700 flex items-center gap-1.5">
                    <XCircle size={15} /> File còn {errors.length} lỗi — sửa trong Excel rồi chọn lại file
                  </p>
                  <IssueList items={errors} tone="error" />
                </div>
              )}

              {warnings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[13px] font-bold text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle size={15} /> {warnings.length} mục cần bổ sung trước khi gửi duyệt
                  </p>
                  <p className="text-[11px] text-slate-500">Vẫn tạo được bản nháp — bạn có thể bổ sung sau trong màn hình tạo tour.</p>
                  <IssueList items={warnings} tone="warning" />
                </div>
              )}
            </section>
          )}
        </div>

        <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button type="button" onClick={close} disabled={busy}
            className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50">
            Hủy
          </button>
          <button type="button" onClick={create} disabled={!result?.valid || busy}
            className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {importing && <Loader2 size={15} className="animate-spin" />} Tạo bản nháp
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
