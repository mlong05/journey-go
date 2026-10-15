"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  MapPin,
  CheckCircle2,
  Eye,
  X,
  Compass,
  Inbox,
  Loader2,
  Users,
  Navigation,
  AlertCircle,
  Building2,
  RefreshCw,
  Layers,
  Clock,
} from "lucide-react";
import { destinationService } from "@/features/destination/services/destinationService";

/* =========================================================================
 *  TRANG: Thẩm định điểm đến di sản (Moderator)
 *  Layout: Compact Header → 3 KPI Cards → Unified Workspace (Toolbar + List)
 * ========================================================================= */

const STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REVOKED: "revoked",
};

const CUBIC = "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]";

/* Chuẩn hoá dữ liệu thô từ API về dạng dùng chung */
function normalizeDestination(raw) {
  if (!raw || typeof raw !== "object") return null;
  const approvedFlag = raw.approved === true;
  const deletedFlag = raw.deleted === true;
  let status;
  if (deletedFlag) status = "deleted";
  else if (approvedFlag) status = STATUS.APPROVED;
  else status = STATUS.PENDING;
  return {
    id: raw.id,
    name: raw.name || "",
    address: raw.address || "",
    latitude:
      raw.latitude !== undefined && raw.latitude !== null
        ? Number(raw.latitude)
        : null,
    longitude:
      raw.longitude !== undefined && raw.longitude !== null
        ? Number(raw.longitude)
        : null,
    capacity: raw.capacity ?? null,
    approved: approvedFlag,
    deleted: deletedFlag,
    createdBy: raw.createdBy || "",
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    status,
  };
}

/* Toast nội bộ (success/error) */
function Toast({ msg, tone }) {
  if (!msg) return null;
  const palette =
    tone === "error"
      ? "bg-rose-900 border-rose-600 text-white"
      : "bg-slate-900 border-slate-700 text-white";
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      className={`fixed top-5 right-5 z-50 ${palette} px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 ${CUBIC} max-w-md animate-in slide-in-from-top-3`}
    >
      <Icon size={16} className="shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

/* Thẻ KPI tương tác — click để lọc */
function KpiCard({ active, onClick, icon: Icon, label, value, accent, valueColor, dot = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left bg-white rounded-2xl border border-slate-200/80 p-5 ${CUBIC} hover:shadow-md hover:-translate-y-[1px] cursor-pointer ${
        active ? `border-l-4 ${accent} shadow-md` : "border-l-4 border-l-transparent"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
          } ${CUBIC}`}
        >
          <Icon size={20} />
        </div>
        <div>
          <p className="text-[10.5px] font-black uppercase tracking-[0.16em] text-slate-500 flex items-center gap-1.5">
            {label}
            {dot && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  active ? "bg-current" : "bg-slate-300"
                }`}
              />
            )}
          </p>
          <p className={`text-2xl font-black leading-none mt-1.5 ${valueColor}`}>
            {value}
          </p>
        </div>
      </div>
    </button>
  );
}

/* Segmented Tab filter */
function StatusTab({ active, onClick, children, accent = "slate" }) {
  const palette = {
    slate: {
      active: "bg-slate-900 text-white border-slate-900",
      dot: "bg-emerald-500",
    },
    amber: {
      active: "bg-amber-500 text-white border-amber-500",
      dot: "bg-white animate-pulse",
    },
    emerald: {
      active: "bg-emerald-600 text-white border-emerald-600",
      dot: "bg-white",
    },
  };
  const t = palette[accent] || palette.slate;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border ${CUBIC} cursor-pointer flex items-center gap-1.5 ${
        active
          ? t.active
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

/* Badge trạng thái dùng trong danh sách */
function StatusBadge({ status }) {
  if (status === STATUS.APPROVED) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Đã duyệt
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      Chờ duyệt
    </span>
  );
}

export default function ModeratorDestinationsPage() {
  /* ── State ────────────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [destinations, setDestinations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [detailTarget, setDetailTarget] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastTone, setToastTone] = useState("success");

  /* ── Helpers ──────────────────────────────────────────────── */
  const showToast = useCallback((msg, tone = "success") => {
    setToastMsg(msg);
    setToastTone(tone);
    setTimeout(() => setToastMsg(""), 3500);
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setFetchError("");
    try {
      const data = await destinationService.getAll();
      const list = Array.isArray(data) ? data : [];
      setDestinations(list.map(normalizeDestination).filter(Boolean));
    } catch (err) {
      console.error("[Moderator Destinations] Fetch error:", err);
      setFetchError(
        err?.message ||
          "Không thể tải danh sách điểm đến. Vui lòng kiểm tra kết nối."
      );
      setDestinations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openDetail = useCallback(async (id) => {
    setDetailTarget({ id });
    setDetailLoading(true);
    setDetailError("");
    try {
      const detail = await destinationService.getById(id);
      const normalized = normalizeDestination(detail);
      if (normalized) setDetailTarget(normalized);
    } catch (err) {
      console.error("[Moderator Destinations] Detail error:", err);
      setDetailError(err?.message || "Không thể tải chi tiết điểm đến.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailTarget(null);
    setDetailError("");
  }, []);

  const handleApprove = useCallback(
    async (id, approved, displayName) => {
      setActionLoadingId(id);
      try {
        const updated = await destinationService.setApproval(id, approved);
        const updatedNorm = normalizeDestination(updated);
        if (updatedNorm) {
          setDestinations((prev) =>
            prev.map((d) => (d.id === id ? { ...d, ...updatedNorm } : d))
          );
          if (detailTarget?.id === id) setDetailTarget(updatedNorm);
        }
        showToast(
          approved
            ? `Đã phê duyệt điểm đến "${displayName}".`
            : `Đã hủy phê duyệt điểm đến "${displayName}".`
        );
      } catch (err) {
        console.error("[Moderator Approve] error:", err);
        showToast(
          err?.message || "Không thể cập nhật trạng thái phê duyệt.",
          "error"
        );
      } finally {
        setActionLoadingId(null);
      }
    },
    [detailTarget, showToast]
  );

  /* ── Counts (luôn đếm trên FULL list, loại trừ deleted) ──── */
  const counts = useMemo(
    () => ({
      all: destinations.filter((d) => d.status !== "deleted").length,
      pending: destinations.filter((d) => d.status === STATUS.PENDING).length,
      approved: destinations.filter((d) => d.status === STATUS.APPROVED).length,
    }),
    [destinations]
  );

  /* ── Filtered list ────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return destinations
      .filter((d) => d.status !== "deleted")
      .filter((item) => {
        if (statusTab === "pending" && item.status !== STATUS.PENDING) return false;
        if (statusTab === "approved" && item.status !== STATUS.APPROVED) return false;
        if (!q) return true;
        return (
          (item.name || "").toLowerCase().includes(q) ||
          (item.address || "").toLowerCase().includes(q) ||
          (item.createdBy || "").toLowerCase().includes(q) ||
          String(item.id).toLowerCase().includes(q)
        );
      });
  }, [destinations, searchQuery, statusTab]);

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-300">
      <Toast msg={toastMsg} tone={toastTone} />

      {/* ══════════════════════════════════════════════════════════
          TẦNG 1 — COMPACT HEADER BAR
         ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Thẩm định điểm đến di sản
        </h1>
        <button
          type="button"
          onClick={loadAll}
          disabled={isLoading}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={isLoading ? "animate-spin" : ""}
          />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TẦNG 2 — 3 INTERACTIVE KPI CARDS
         ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          active={statusTab === "all"}
          onClick={() => setStatusTab("all")}
          icon={Layers}
          label="TỔNG HỒ SƠ"
          value={counts.all}
          accent="border-l-slate-900"
          valueColor="text-slate-900"
        />
        <KpiCard
          active={statusTab === "pending"}
          onClick={() => setStatusTab("pending")}
          icon={Clock}
          label="CHỜ PHÊ DUYỆT"
          value={counts.pending}
          accent="border-l-amber-500"
          valueColor="text-amber-600"
          dot
        />
        <KpiCard
          active={statusTab === "approved"}
          onClick={() => setStatusTab("approved")}
          icon={CheckCircle2}
          label="ĐANG LƯU HÀNH"
          value={counts.approved}
          accent="border-l-emerald-500"
          valueColor="text-emerald-600"
          dot
        />
      </div>

      {/* ══════════════════════════════════════════════════════════
          TẦNG 3 — UNIFIED WORKSPACE (Toolbar + List)
         ══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-2">
            <StatusTab
              active={statusTab === "all"}
              onClick={() => setStatusTab("all")}
            >
              <span>Tất cả ({counts.all})</span>
            </StatusTab>
            <StatusTab
              active={statusTab === "pending"}
              onClick={() => setStatusTab("pending")}
              accent="amber"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  statusTab === "pending" ? "bg-white animate-pulse" : "bg-amber-500"
                }`}
              />
              <span>Chờ duyệt ({counts.pending})</span>
            </StatusTab>
            <StatusTab
              active={statusTab === "approved"}
              onClick={() => setStatusTab("approved")}
              accent="emerald"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  statusTab === "approved" ? "bg-white" : "bg-emerald-500"
                }`}
              />
              <span>Đang lưu hành ({counts.approved})</span>
            </StatusTab>
          </div>

          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên điểm đến, địa chỉ, đơn vị..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>
        </div>

        {/* Error banner */}
        {fetchError && (
          <div className="m-4 flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
            <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-rose-800">
                Không thể tải danh sách điểm đến
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">{fetchError}</p>
              <button
                type="button"
                onClick={loadAll}
                className="mt-2 text-[11px] font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}

        {/* List / Empty / Loading */}
        {isLoading && destinations.length === 0 ? (
          <div className="p-16 text-center">
            <Loader2 size={28} className="text-slate-300 mx-auto animate-spin" />
            <p className="text-xs text-slate-400 mt-3 font-semibold">
              Đang tải bảng kiểm duyệt…
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center">
              <Inbox size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {searchQuery
                ? "Không tìm thấy điểm đến nào phù hợp với bộ lọc"
                : statusTab === "pending"
                ? "Không có hồ sơ nào đang chờ thẩm định"
                : statusTab === "approved"
                ? "Chưa có điểm đến nào đang lưu hành"
                : "Chưa có điểm đến nào trong hệ thống"}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Danh sách điểm đến do Đối tác hoặc Quản trị viên khởi tạo sẽ hiển
              thị tại đây.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((item) => {
              const isApproved = item.approved === true;
              const isLoadingAction = actionLoadingId === item.id;
              return (
                <li
                  key={item.id}
                  className={`p-4 sm:p-5 hover:bg-slate-50/60 ${CUBIC}`}
                >
                  <div className="grid grid-cols-12 gap-3 sm:gap-4 items-center">
                    {/* Cột 1 — Thông tin điểm đến */}
                    <div className="col-span-12 md:col-span-4 flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                        <Compass size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {item.name}
                        </h3>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            #{item.id}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-slate-600 truncate">
                            <Building2 size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate">
                              {item.createdBy || "Đơn vị không xác định"}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cột 2 — Địa chỉ & tọa độ GPS */}
                    <div className="col-span-12 md:col-span-3 space-y-1">
                      <p className="text-xs font-medium text-slate-700 flex items-center gap-1 truncate">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          {item.address || "—"}
                        </span>
                      </p>
                      {item.latitude !== null && item.longitude !== null && (
                        <span className="font-mono text-[11px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md border border-sky-200/60 inline-flex items-center gap-1">
                          <Navigation size={10} />
                          {item.latitude.toFixed(4)} / {item.longitude.toFixed(4)}
                        </span>
                      )}
                    </div>

                    {/* Cột 3 — Sức chứa */}
                    <div className="col-span-6 md:col-span-2">
                      <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                        <Users size={12} className="text-slate-400" />
                        Sức chứa
                      </p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">
                        {item.capacity ?? "—"}{" "}
                        <span className="text-[10.5px] font-medium text-slate-400">
                          du khách/lượt
                        </span>
                      </p>
                    </div>

                    {/* Cột 4 — Trạng thái */}
                    <div className="col-span-6 md:col-span-1 flex md:justify-start">
                      <StatusBadge status={item.status} />
                    </div>

                    {/* Cột 5 — Thao tác thẩm định */}
                    <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openDetail(item.id)}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>Chi tiết</span>
                      </button>
                      {isApproved ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleApprove(item.id, false, item.name)
                          }
                          disabled={isLoadingAction}
                          className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isLoadingAction ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <X size={12} />
                          )}
                          <span>Hủy duyệt</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApprove(item.id, true, item.name)}
                          disabled={isLoadingAction}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isLoadingAction ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          <span>Phê duyệt</span>
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          MODAL — Xem chi tiết điểm đến
         ══════════════════════════════════════════════════════════ */}
      {(detailTarget || detailLoading || detailError) && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={closeDetail}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-5 sm:px-7 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-[10.5px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    #{detailTarget?.id ?? "—"}
                  </span>
                  {detailTarget && (
                    <StatusBadge status={detailTarget.status} />
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                  {detailTarget?.name || "Đang tải..."}
                </h3>
                {detailTarget?.address && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
                    <MapPin size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{detailTarget.address}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Đóng"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-5 sm:px-7 py-5 max-h-[calc(92vh-150px)] overflow-y-auto">
              {detailLoading ? (
                <div className="py-12 flex flex-col items-center gap-3 text-slate-500">
                  <Loader2 size={28} className="animate-spin text-slate-400" />
                  <p className="text-xs font-bold">Đang tải dữ liệu điểm đến…</p>
                </div>
              ) : detailError ? (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                  <AlertCircle
                    size={16}
                    className="text-rose-600 mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-rose-800">
                      Không thể tải chi tiết
                    </p>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      {detailError}
                    </p>
                  </div>
                </div>
              ) : detailTarget ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="rounded-2xl bg-sky-50/70 border border-sky-200 p-4">
                    <p className="text-[10px] font-black text-sky-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Navigation size={10} /> Tọa độ GPS
                    </p>
                    <div className="space-y-1 text-[11.5px] font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vĩ độ</span>
                        <span className="font-black text-slate-800">
                          {detailTarget.latitude?.toFixed(6) ?? "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Kinh độ</span>
                        <span className="font-black text-slate-800">
                          {detailTarget.latitude?.toFixed(6) ?? "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4">
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Users size={10} /> Sức chứa tối đa
                    </p>
                    <p className="text-[18px] font-black text-slate-900 leading-none">
                      {detailTarget.capacity ?? "—"}
                      <span className="text-[10.5px] font-bold text-slate-500 ml-1.5">
                        du khách / lượt
                      </span>
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 sm:col-span-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Đơn vị khởi tạo
                    </p>
                    <p className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">
                      <Building2 size={12} className="text-slate-400" />
                      {detailTarget.createdBy || "—"}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal footer */}
            <div className="px-5 sm:px-7 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/40">
              {detailTarget && !detailTarget.approved && (
                <button
                  type="button"
                  onClick={() =>
                    handleApprove(detailTarget.id, true, detailTarget.name)
                  }
                  disabled={actionLoadingId === detailTarget.id}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoadingId === detailTarget.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={12} />
                  )}
                  <span>Phê duyệt</span>
                </button>
              )}
              {detailTarget && detailTarget.approved && (
                <button
                  type="button"
                  onClick={() =>
                    handleApprove(detailTarget.id, false, detailTarget.name)
                  }
                  disabled={actionLoadingId === detailTarget.id}
                  className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {actionLoadingId === detailTarget.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <X size={12} />
                  )}
                  <span>Hủy duyệt</span>
                </button>
              )}
              <button
                type="button"
                onClick={closeDetail}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
