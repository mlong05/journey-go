"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Landmark,
  ArrowLeft,
  CheckCircle2,
  List,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { CreateDestinationModal } from "@/features/destination";
import { destinationService } from "@/features/destination/services/destinationService";

/**
 * Trang khởi tạo điểm đến dành riêng cho Quản trị viên.
 * - Mở Modal "Tạo Điểm Đến Di Sản Mới" (theme slate) ngay khi vào trang.
 * - Khi tạo xong, chuyển hướng sang trang quản lý toàn sàn `/admin/destinations`.
 */
export default function AdminCreateDestinationPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await destinationService.getAll();
        if (mounted) setRecent((Array.isArray(data) ? data : []).slice(0, 5));
      } catch {
        /* ignore */
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCreated = (newDest) => {
    if (newDest) {
      setRecent((prev) => [newDest, ...prev].slice(0, 5));
    }
    // Tự động chuyển sang trang quản lý toàn sàn sau khi tạo thành công
    setTimeout(() => {
      router.push("/admin/destinations");
    }, 1200);
  };

  const handleClose = () => {
    setOpen(false);
    // Quay lại trang quản lý nếu user đóng modal mà không tạo
    setTimeout(() => router.push("/admin/destinations"), 200);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-200">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/admin/destinations"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            <span>Quay lại danh sách toàn sàn</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-slate-900 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Khởi Tạo Điểm Đến Di Sản Mới
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản trị viên tạo hồ sơ điểm đến thay mặt hệ thống. Hồ sơ mới sẽ ở trạng thái
            <strong> chờ phê duyệt</strong> cho tới khi được duyệt.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/admin/destinations"
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <List size={14} />
            <span>Xem danh sách</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm shadow-slate-900/20 text-xs sm:text-sm transition-all cursor-pointer"
          >
            <Plus size={18} strokeWidth={2.4} />
            <span>Mở lại form tạo</span>
          </button>
        </div>
      </div>

      {/* ── Preview các điểm đến gần đây ────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Landmark size={15} className="text-slate-700" />
            Điểm đến gần đây trong hệ thống
          </h2>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Tải lại
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            Đang tải danh sách…
          </div>
        ) : recent.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-xs text-slate-500">
              Hệ thống chưa có điểm đến nào. Bấm{" "}
              <strong>"Mở lại form tạo"</strong> để khởi tạo điểm đến đầu tiên.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((d) => (
              <li
                key={d.id}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-900/5 text-slate-700 flex items-center justify-center shrink-0">
                    <Landmark size={13} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">
                      {d.name}
                    </p>
                    <p className="text-[10.5px] text-slate-500 truncate">
                      {d.address}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    d.approved === true
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {d.approved === true ? "Đã duyệt" : "Chờ duyệt"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Modal tạo điểm đến (slate theme) ───────────────── */}
      <CreateDestinationModal
        isOpen={open}
        onClose={handleClose}
        onCreated={handleCreated}
        theme="slate"
        title="Khởi Tạo Điểm Đến Di Sản Mới (Quản Trị Viên)"
        subtitle="Khai báo tọa độ GPS thực địa, địa chỉ và sức chứa. Hồ sơ mặc định sẽ ở trạng thái chờ phê duyệt."
      />
    </div>
  );
}
