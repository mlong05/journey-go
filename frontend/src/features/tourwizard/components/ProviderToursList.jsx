"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Layers, Pencil, Clock, Store, Loader2, Eye, Trash2, MapPin, ImageOff,
  FileSpreadsheet,
} from "lucide-react";
import { PageHeader, KpiTile } from "@/components/dashboard/DashboardUI";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import PaginationBar from "@/components/ui/PaginationBar";
import { PAGE_SIZE } from "@/lib/pagination";
import { providerTourService } from "../services/providerTourService";
import TourImportDialog from "./TourImportDialog";
import { TOUR_STATUS, TOUR_STATUS_ORDER, CONTENT_EDITABLE } from "../constants";
import { formatDateTimeVN } from "@/lib/money";

/** Chuẩn thời gian CHUNG: "14:19 15/11/2026" (giờ Việt Nam). */
const fmt = (iso) => (iso ? formatDateTimeVN(iso) || "—" : "—");

/** Cột bảng: STT | Tour | Trạng thái | Cập nhật | Thao tác (mobile: STT | Tour, thao tác xuống dòng). */
const ROW_GRID = "grid items-center gap-x-4 gap-y-2 grid-cols-[32px_minmax(0,1fr)] md:grid-cols-[40px_minmax(0,1fr)_130px_150px_88px]";

/** Trang Quản lý tour của Đối tác (luồng 5 bước). */
export default function ProviderToursList() {
  const router = useRouter();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [page, setPage] = useState(1);
  const { confirm, confirmDialog } = useConfirm();

  /** Tải danh sách (setState chỉ sau await). */
  const load = useCallback(async () => {
    try {
      const page = await providerTourService.list({ size: 100 });
      setTours(page?.content || page?.items || []);
      setError("");
    } catch (err) {
      setError(err?.message || "Không tải được danh sách tour.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    providerTourService.list({ size: 100 })
      .then((page) => alive && setTours(page?.content || page?.items || []))
      .catch((err) => alive && setError(err?.message || "Không tải được danh sách tour."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const counts = useMemo(() => {
    const c = { all: tours.length };
    TOUR_STATUS_ORDER.forEach((s) => { c[s] = tours.filter((t) => t.status === s).length; });
    return c;
  }, [tours]);
  const visible = filter === "all" ? tours : tours.filter((t) => t.status === filter);
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages); // xóa bớt tour ở trang cuối → lùi về trang hợp lệ
  const paged = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const act = async (tour, fn, message) => {
    setBusyId(tour.tourId);
    try {
      const res = await fn();
      setToast(message);
      if (res?.tourId && res.tourId !== tour.tourId) {
        router.push(`/provider/tours/${res.tourId}/edit`);
        return;
      }
      await load();
    } catch (err) {
      setToast(err?.message || "Thao tác thất bại.");
    } finally {
      setBusyId(null);
      setTimeout(() => setToast(""), 3500);
    }
  };

  /** Tạo bản nháp chưa đặt tên rồi vào thẳng trang tạo tour (tên điền ở bước 1). */
  const createTour = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const tour = await providerTourService.create();
      router.push(`/provider/tours/${tour.tourId}/edit`);
    } catch (err) {
      setCreating(false);
      setToast(err?.message || "Không tạo được tour.");
      setTimeout(() => setToast(""), 3500);
    }
  };

  const remove = async (tour) => {
    const ok = await confirm({ tone: "danger", icon: "trash", title: "Xóa bản nháp?", subject: tour.title || "Tour chưa đặt tên",
      description: "Bản nháp và toàn bộ nội dung đã nhập sẽ bị xóa.", confirmLabel: "Xóa bản nháp" });
    if (ok) act(tour, () => providerTourService.remove(tour.tourId), "Đã xóa bản nháp");
  };

  const header = (
    <PageHeader compact title="Tour Du Lịch Của Tôi">
      <button type="button" onClick={() => setImportOpen(true)}
        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold h-9 px-4 rounded-lg flex items-center gap-1.5 shadow-xs text-[13px] cursor-pointer transition-all duration-200 active:scale-[0.97]">
        <FileSpreadsheet size={16} className="text-emerald-600" /> Nhập từ Excel
      </button>
      <button type="button" onClick={createTour} disabled={creating}
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-9 px-4 rounded-lg flex items-center gap-1.5 shadow-xs text-[13px] cursor-pointer transition-all duration-200 active:scale-[0.97] disabled:opacity-70 disabled:cursor-wait">
        {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Tạo tour mới
      </button>
    </PageHeader>
  );

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 overflow-y-auto">
      {confirmDialog}
      <TourImportDialog open={importOpen} onClose={() => setImportOpen(false)}
        onCreated={(tourId) => {
          setImportOpen(false);
          if (tourId) router.push(`/provider/tours/${tourId}/edit`);
          else load();
        }} />
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-lg">{toast}</div>
      )}

      <div className="shrink-0">{header}</div>

      <section className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile icon={Layers} label="Tổng tour" value={counts.all} unit="tour" tone="slate" />
        <KpiTile icon={Pencil} label="Bản nháp / cần sửa" value={counts.DRAFT + counts.CHANGES_REQUESTED} unit="tour" tone="slate" />
        <KpiTile icon={Clock} label="Chờ duyệt" value={counts.PENDING_REVIEW} unit="tour" tone="amber" />
        <KpiTile icon={Store} label="Đang bán" value={counts.PUBLISHED} unit="tour" tone="emerald" />
      </section>

      <div className="shrink-0 flex flex-wrap gap-2">
        {["all", ...TOUR_STATUS_ORDER].map((s) => (
          <button key={s} type="button" onClick={() => { setFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${filter === s ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
            {s === "all" ? "Tất cả" : TOUR_STATUS[s].label} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {/* Bảng tour: hàng tiêu đề cố định, chỉ các hàng tour tự cuộn, phân trang ở dưới */}
      <div className="flex-1 min-h-[360px] rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
        <div className={`${ROW_GRID} hidden md:grid shrink-0 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wide`}>
          <span>STT</span>
          <span>Tour</span>
          <span>Trạng thái</span>
          <span>Cập nhật</span>
          <span className="text-right">Thao tác</span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-slate-500 text-sm"><Loader2 size={16} className="animate-spin" />Đang tải…</div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-rose-600 font-bold">{error}</div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <MapPin size={24} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">{tours.length === 0 ? "Bạn chưa có tour nào" : "Không có tour ở trạng thái này"}</p>
            {tours.length === 0 && (
              <button type="button" onClick={createTour} disabled={creating} className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer disabled:opacity-60">Tạo tour đầu tiên</button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {paged.map((t, i) => {
              const meta = TOUR_STATUS[t.status] || TOUR_STATUS.DRAFT;
              const editable = CONTENT_EDITABLE.includes(t.status);
              const busy = busyId === t.tourId;
              const open = () => router.push(`/provider/tours/${t.tourId}/edit`);
              return (
                <li key={t.tourId} className={`${ROW_GRID} px-4 py-2 hover:bg-slate-50/60 transition-colors`}>
                  <span className="text-xs font-bold text-slate-400 tabular-nums">{(safePage - 1) * PAGE_SIZE + i + 1}</span>

                  <button type="button" onClick={open} className="flex items-center gap-3 min-w-0 text-left cursor-pointer">
                    <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                      {t.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.coverImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : <ImageOff size={16} className="text-slate-300" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold truncate ${t.title ? "text-slate-900" : "text-slate-400 italic"}`}>{t.title || "Tour chưa đặt tên"}</span>
                        <span className={`md:hidden px-1.5 py-0.5 rounded-md border text-[10px] font-bold shrink-0 ${meta.cls}`}>{meta.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {[t.regionName, t.themeName].filter(Boolean).join(" · ") || "Chưa chọn khu vực / chủ đề"} · {t.stopCount} điểm đến · v{t.versionNumber}
                      </p>
                    </div>
                  </button>

                  <span className="hidden md:block">
                    <span className={`inline-block px-2 py-0.5 rounded-md border text-[11px] font-bold ${meta.cls}`}>{meta.label}</span>
                  </span>
                  <span className="hidden md:block text-xs text-slate-500 tabular-nums">{fmt(t.updatedAt)}</span>

                  {/* Thao tác chỉ là biểu tượng: [ô phụ cố định] [xem / sửa] → luôn thẳng cột */}
                  <div className="col-span-2 md:col-span-1 flex items-center gap-1.5 justify-end">
                    <span className="w-8 h-8 flex items-center justify-center shrink-0">
                      {t.status === "DRAFT" && (
                        <button type="button" title="Xóa bản nháp" disabled={busy} onClick={() => remove(t)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer disabled:opacity-50">
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      )}
                    </span>
                    {(() => {
                      const label = editable ? (t.status === "CHANGES_REQUESTED" ? "Sửa theo ghi chú" : "Tiếp tục sửa") : "Xem tour";
                      return (
                        <button type="button" onClick={open} title={label} aria-label={label}
                          className={`w-8 h-8 shrink-0 rounded-lg inline-flex items-center justify-center border cursor-pointer transition-colors ${editable ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700" : "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100"}`}>
                          {editable ? <Pencil size={15} /> : <Eye size={15} />}
                        </button>
                      );
                    })()}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        </div>

        {/* Phân trang */}
        {!loading && !error && visible.length > 0 && (
          <div className="shrink-0 border-t border-slate-100">
            <PaginationBar
              page={safePage - 1}
              totalPages={totalPages}
              totalElements={visible.length}
              unit="tour"
              onChange={(p) => setPage(p + 1)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
