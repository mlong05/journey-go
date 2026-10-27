"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Compass,
  Landmark,
  List,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { CreateDestinationModal } from "@/features/destination";
import { destinationService } from "@/features/destination/services/destinationService";

export default function CreateClient() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await destinationService.getAll();
        if (mounted) setRecent((Array.isArray(data) ? data : []).slice(0, 5));
      } catch (err) {
        if (mounted)
          setErrorMsg(
            err?.message || "Không thể tải danh sách điểm đến gần đây."
          );
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
    setTimeout(() => router.push("/provider/destinations"), 1200);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => router.push("/provider/destinations"), 200);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/provider/destinations"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            <span>Quay lại danh sách điểm đến</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-emerald-600 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Khởi Tạo Điểm Đến Di Tích Mới
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/provider/destinations"
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <List size={14} />
            <span>Xem danh sách</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm shadow-emerald-600/20 text-xs sm:text-sm transition-all cursor-pointer"
          >
            <Plus size={18} strokeWidth={2.4} />
            <span>Mở lại form tạo</span>
          </button>
        </div>
      </div>

      <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200/60 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Compass size={16} />
          </div>
          <h3 className="text-sm font-bold text-emerald-900">
            Hướng dẫn nhanh
          </h3>
        </div>
        <ol className="space-y-2 text-xs text-emerald-900/80 font-semibold leading-relaxed list-decimal pl-4">
          <li>Bấm <strong>&ldquo;Mở form tạo&rdquo;</strong> để hiện bảng nhập liệu.</li>
          <li>Điền 5 trường bắt buộc: tên, địa chỉ, vĩ độ, kinh độ, sức chứa.</li>
          <li>Gửi yêu cầu — hệ thống sẽ phản hồi trong vòng 24-48 giờ.</li>
        </ol>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200">
          <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
          <p className="text-xs text-rose-800 font-bold leading-relaxed">
            {errorMsg}
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Landmark size={15} className="text-emerald-700" />
            Điểm đến gần đây của bạn
          </h2>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
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
            <p className="text-xs text-slate-600">
              Bạn chưa có điểm đến nào. Bấm{" "}
              <strong>&ldquo;Mở form tạo&rdquo;</strong> để khởi tạo điểm đến đầu tiên.
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
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Landmark size={13} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {d.name}
                    </p>
                    <p className="text-[11px] text-slate-600 truncate">
                      {d.address}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${
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

      <CreateDestinationModal
        isOpen={open}
        onClose={handleClose}
        onCreated={handleCreated}
        theme="emerald"
      />
    </div>
  );
}
