"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { Empty, ErrorBox, Loading, Panel } from "@/components/admin/AdminUI";
import { exportService } from "@/features/export";

/**
 * Trang Xuất dữ liệu — Admin (D2).
 *
 * Cho phép Admin tải dữ liệu thô ra Excel / CSV để đối soát tài chính và lập
 * báo cáo nội bộ. Mọi lần xuất đều được ghi vào `system_audit_logs` ở backend.
 *
 * Danh sách tập dữ liệu lấy từ `GET /api/v1/admin/exports/datasets` (backend là
 * nguồn sự thật) ⇒ thêm tập dữ liệu mới ở backend không cần sửa frontend.
 */
export default function AdminExportScreen() {
  const [datasets, setDatasets] = useState([]);
  const [dataset, setDataset] = useState("");
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [error, setError] = useState("");

  // Bộ lọc
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");

  // Xem trước
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  // Đang tải file
  const [downloading, setDownloading] = useState("");
  const [notice, setNotice] = useState("");

  const loadDatasets = useCallback(async () => {
    setLoadingDatasets(true);
    setError("");
    try {
      const map = await exportService.getExportDatasets();
      const list = Object.values(map || {}).map((item) => ({
        slug: item.slug,
        label: item.label,
      }));
      setDatasets(list);
      if (list.length > 0) {
        setDataset((current) => current || list[0].slug);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách tập dữ liệu xuất:", err);
      setError(err?.message || "Không tải được danh sách tập dữ liệu.");
    } finally {
      setLoadingDatasets(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => loadDatasets());
  }, [loadDatasets]);

  const filters = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      status: status || undefined,
      keyword: keyword || undefined,
    }),
    [from, to, status, keyword],
  );

  const loadPreview = useCallback(async () => {
    if (!dataset) return;
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const result = await exportService.previewExport(dataset, filters);
      setPreview(result);
    } catch (err) {
      console.error("Lỗi xem trước dữ liệu:", err);
      setPreviewError(err?.message || "Không tải được dữ liệu xem trước.");
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [dataset, filters]);

  useEffect(() => {
    queueMicrotask(() => loadPreview());
  }, [loadPreview]);

  const handleDownload = useCallback(
    async (format) => {
      if (!dataset) return;
      setDownloading(format);
      setError("");
      setNotice("");
      try {
        const result = await exportService.downloadExport(dataset, filters, format);
        exportService.saveDownloadedFile(
          result,
          `journeygo_${dataset}.${format}`,
        );
        setNotice(
          `Đã tải xuống ${preview?.totalRows ?? "…"} dòng dữ liệu (${format.toUpperCase()}).`,
        );
      } catch (err) {
        console.error("Lỗi tải file xuất dữ liệu:", err);
        setError(err?.message || "Không tải được file. Vui lòng thử lại.");
      } finally {
        setDownloading("");
      }
    },
    [dataset, filters, preview],
  );

  const columns = preview?.columns || [];
  const rows = preview?.rows || [];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                Báo Cáo & Đối Soát
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Xuất Dữ Liệu
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tải dữ liệu thô ra Excel / CSV để đối soát tài chính và lập báo cáo nội
              bộ. Mọi lần xuất đều được ghi vào nhật ký kiểm toán.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadDatasets()}
            disabled={loadingDatasets}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loadingDatasets ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            Làm mới
          </button>
        </div>
      </div>

      {error && <ErrorBox text={error} />}
      {previewError && <ErrorBox text={previewError} />}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
          {notice}
        </div>
      )}

      {/* ── Bộ lọc + nút tải ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Filter size={13} className="text-slate-400 shrink-0" />
            <select
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
            >
              {datasets.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 min-w-0">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo mã đơn, tên, email, lý do..."
              className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            Từ
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            Đến
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none"
            />
          </label>
          <input
            type="text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="Trạng thái (VD: PAID, APPROVED)"
            className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none"
          />

          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              type="button"
              onClick={() => handleDownload("xlsx")}
              disabled={!dataset || !!downloading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {downloading === "xlsx" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={13} />
              )}
              Tải Excel
            </button>
            <button
              type="button"
              onClick={() => handleDownload("csv")}
              disabled={!dataset || !!downloading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {downloading === "csv" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileText size={13} />
              )}
              Tải CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── Xem trước ── */}
      <Panel icon={Download} title="Xem trước dữ liệu" fill>
        {previewLoading && !preview ? (
          <Loading />
        ) : columns.length === 0 ? (
          <Empty icon={Download} text="Không có dữ liệu để hiển thị." />
        ) : (
          <div className="p-3">
            <p className="mb-2 text-[11px] text-slate-500">
              Hiển thị tối đa 50 dòng đầu — tổng cộng{" "}
              <span className="font-bold text-slate-700">
                {preview?.totalRows ?? 0}
              </span>{" "}
              dòng khớp bộ lọc.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-[11px] border-collapse min-w-max">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    {columns.map((col, i) => (
                      <th key={`${col}-${i}`} className="py-2 px-3 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-50/70 align-top">
                      {columns.map((col, colIndex) => (
                        <td
                          key={`${col}-${colIndex}`}
                          className="py-2 px-3 text-slate-700 whitespace-nowrap"
                        >
                          {row?.[String(colIndex)] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
