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
  ShieldCheck,
  Building2,
  ChevronRight,
  RefreshCw,
  ListChecks,
} from "lucide-react";
import { destinationService } from "@/features/destination/services/destinationService";

const STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REVOKED: "revoked",
};

const CUBIC = "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]";

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

/* ──────────────────────────────────────────────────────────────────────────
   BEZEL CARD: Outer shell (hairline + tint) + Inner core (gradient + inset)
   used as the canonical "premium hardware" container for every panel.
   ────────────────────────────────────────────────────────────────────────── */
function Bezel({ children, className = "", tone = "neutral" }) {
  const tones = {
    neutral: "bg-slate-100/60 ring-slate-200/80",
    teal: "bg-teal-50/40 ring-teal-200/70",
    rose: "bg-rose-50/50 ring-rose-200/70",
    amber: "bg-amber-50/50 ring-amber-200/70",
  };
  return (
    <div className={`rounded-[1.75rem] p-1.5 ring-1 ${tones[tone]} ${className}`}>
      <div className="rounded-[calc(1.75rem-0.375rem)] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        {children}
      </div>
    </div>
  );
}

/* Pill button following the "button-in-button" trailing-icon pattern. */
function PillButton({
  children,
  onClick,
  tone = "slate",
  icon: Icon,
  iconTrailing = true,
  loading = false,
  disabled = false,
  title,
}) {
  const palette = {
    slate: "bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]",
    teal: "bg-teal-700 text-white hover:bg-teal-800 active:scale-[0.98]",
    rose: "bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100",
    emerald: "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]",
    sky: "bg-sky-50 text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11.5px] font-bold tracking-tight ${CUBIC} cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${palette[tone]}`}
    >
      {!iconTrailing && Icon && (
        <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
        </span>
      )}
      <span className="whitespace-nowrap">{children}</span>
      {iconTrailing && Icon && (
        <span
          className={`w-6 h-6 rounded-full flex items-center justify-center ${
            tone === "rose" || tone === "sky" ? "bg-black/5" : "bg-white/15"
          } group-hover:translate-x-0.5 ${CUBIC}`}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
        </span>
      )}
    </button>
  );
}

export default function ModeratorDestinationsPage() {
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

  const showToast = useCallback((msg, tone = "success") => {
    setToastMsg(msg);
    setToastTone(tone);
    setTimeout(() => setToastMsg(""), 3500);
  }, []);

  /* Always fetch the full list so the "Chờ duyệt" counter stays honest. */
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

  /* Counts are computed from the FULL list (including non-deleted). */
  const counts = useMemo(
    () => ({
      all: destinations.filter((d) => d.status !== "deleted").length,
      pending: destinations.filter((d) => d.status === STATUS.PENDING).length,
      approved: destinations.filter((d) => d.status === STATUS.APPROVED).length,
    }),
    [destinations]
  );

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
          String(item.id).toLowerCase().includes(q)
        );
      });
  }, [destinations, searchQuery, statusTab]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-full shadow-xl border text-xs font-bold flex items-center gap-2 ${CUBIC} max-w-md ${
            toastTone === "success"
              ? "bg-teal-800 border-teal-600 text-white"
              : "bg-rose-900 border-rose-600 text-white"
          }`}
        >
          {toastTone === "success" ? (
            <CheckCircle2 size={14} className="text-teal-300" />
          ) : (
            <AlertCircle size={14} className="text-rose-300" />
          )}
          <span>{toastMsg}</span>
        </div>
      )}

      {/* HEADER */}
      <Bezel className="bg-gradient-to-br from-teal-50/30 via-white to-slate-50/30" tone="teal">
        <div className="px-6 py-5 sm:px-8 sm:py-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[10.5px] font-black uppercase tracking-[0.18em] text-teal-700">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              Hội đồng thẩm định văn hóa
            </div>
            <h1 className="text-[26px] sm:text-[32px] leading-[1.05] tracking-[-0.02em] font-black text-slate-900">
              Thẩm định điểm đến di sản
            </h1>
            <p className="text-[13px] leading-relaxed text-slate-500 max-w-prose">
              Xem chi tiết hồ sơ và phê duyệt hoặc hủy duyệt điểm đến do
              Đối tác hoặc Quản trị viên khởi tạo.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10.5px] font-bold text-teal-800 bg-white/70 ring-1 ring-teal-200 rounded-full px-3 py-1.5">
              <ShieldCheck size={12} />
              Quyền MODERATOR
            </span>
            <PillButton
              tone="slate"
              icon={RefreshCw}
              iconTrailing={false}
              onClick={loadAll}
              loading={isLoading}
            >
              Làm mới
            </PillButton>
          </div>
        </div>
      </Bezel>

      {/* STATS BENTO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <button
          type="button"
          onClick={() => setStatusTab("all")}
          className={`text-left ${CUBIC} ${statusTab === "all" ? "scale-[1.01]" : ""}`}
        >
          <Bezel tone="neutral">
            <div className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                <ListChecks size={20} />
              </div>
              <div>
                <p className="text-[10.5px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Tổng hồ sơ
                </p>
                <p className="text-2xl font-black text-slate-900 leading-none mt-1">
                  {counts.all}
                </p>
              </div>
            </div>
          </Bezel>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab("pending")}
          className={`text-left ${CUBIC} ${statusTab === "pending" ? "scale-[1.01]" : ""}`}
        >
          <Bezel tone="amber">
            <div className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
              </div>
              <div>
                <p className="text-[10.5px] font-black uppercase tracking-[0.16em] text-amber-700">
                  Chờ duyệt
                </p>
                <p className="text-2xl font-black text-slate-900 leading-none mt-1">
                  {counts.pending}
                </p>
              </div>
            </div>
          </Bezel>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab("approved")}
          className={`text-left ${CUBIC} ${statusTab === "approved" ? "scale-[1.01]" : ""}`}
        >
          <Bezel tone="teal">
            <div className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[10.5px] font-black uppercase tracking-[0.16em] text-teal-700">
                  Đang lưu hành
                </p>
                <p className="text-2xl font-black text-slate-900 leading-none mt-1">
                  {counts.approved}
                </p>
              </div>
            </div>
          </Bezel>
        </button>
      </div>

      {/* SEARCH */}
      <Bezel>
        <div className="p-3 sm:p-4 flex items-center gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên điểm đến, địa chỉ hoặc mã hồ sơ"
              className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-[12.5px] text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 ${CUBIC}`}
            />
          </div>
        </div>
      </Bezel>

      {fetchError && (
        <Bezel tone="rose">
          <div className="p-4 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-rose-800">Không thể tải danh sách</p>
              <p className="text-[11px] text-rose-700 mt-0.5">{fetchError}</p>
              <button
                type="button"
                onClick={loadAll}
                className="mt-2 text-[11px] font-bold text-rose-700 underline hover:text-rose-900"
              >
                Thử lại
              </button>
            </div>
          </div>
        </Bezel>
      )}

      {/* LIST */}
      <div className="space-y-3">
        {isLoading && destinations.length === 0 ? (
          <Bezel>
            <div className="p-16 text-center">
              <Loader2 size={28} className="text-slate-300 mx-auto animate-spin" />
              <p className="text-xs text-slate-400 mt-3">Đang tải bảng kiểm duyệt</p>
            </div>
          </Bezel>
        ) : filtered.length === 0 ? (
          <Bezel>
            <div className="p-16 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center">
                <Inbox size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {searchQuery
                  ? "Không tìm thấy điểm đến nào phù hợp"
                  : statusTab === "pending"
                    ? "Không có hồ sơ nào đang chờ thẩm định"
                    : "Chưa có điểm đến nào đang lưu hành"}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Danh sách điểm đến đã được Đối tác hoặc Quản trị viên đăng ký sẽ
                xuất hiện tại đây.
              </p>
            </div>
          </Bezel>
        ) : (
          filtered.map((item) => {
            const isApproved = item.approved === true;
            const isLoadingAction = actionLoadingId === item.id;
            return (
              <article
                key={item.id}
                className={`group ${CUBIC} hover:-translate-y-[2px] hover:shadow-lg`}
              >
                <Bezel>
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-teal-100 via-emerald-50 to-sky-100 ring-1 ring-teal-200/60 flex items-center justify-center shrink-0">
                        <Compass size={26} className="text-teal-700" />
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full ring-1 bg-sky-50 text-sky-800 ring-sky-200">
                            Điểm di tích
                          </span>
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Đang lưu hành
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Chờ duyệt
                            </span>
                          )}
                        </div>

                        <h3 className="text-[14.5px] sm:text-[15.5px] font-black text-slate-900 truncate group-hover:text-teal-700">
                          {item.name}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-slate-500">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Building2 size={11} className="text-slate-400" />
                            {item.createdBy || "Đối tác không xác định"}
                          </span>
                          <span className="text-slate-300">/</span>
                          <span className="flex items-center gap-1">
                            <MapPin size={11} className="text-teal-600" />
                            {item.address}
                          </span>
                        </div>

                        {item.latitude !== null && item.longitude !== null && (
                          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-mono font-bold text-sky-800 bg-sky-50 ring-1 ring-sky-200 px-2.5 py-0.5 rounded-full">
                            <Navigation size={10} className="text-sky-600" />
                            <span>
                              {item.latitude.toFixed(4)} / {item.longitude.toFixed(4)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                      <PillButton
                        tone="sky"
                        icon={Eye}
                        onClick={() => openDetail(item.id)}
                      >
                        Kiểm tra
                      </PillButton>
                      {isApproved ? (
                        <PillButton
                          tone="rose"
                          icon={X}
                          onClick={() => handleApprove(item.id, false, item.name)}
                          loading={isLoadingAction}
                          title="Hủy phê duyệt"
                        >
                          Hủy duyệt
                        </PillButton>
                      ) : (
                        <PillButton
                          tone="emerald"
                          icon={CheckCircle2}
                          onClick={() => handleApprove(item.id, true, item.name)}
                          loading={isLoadingAction}
                          title="Phê duyệt"
                        >
                          Phê duyệt
                        </PillButton>
                      )}
                    </div>
                  </div>
                </Bezel>
              </article>
            );
          })
        )}
      </div>

      {/* MODAL DETAIL */}
      {(detailTarget || detailLoading || detailError) && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={closeDetail}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-[2rem] p-1.5 ring-1 ring-slate-200 shadow-2xl max-h-[92vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-[calc(2rem-0.375rem)] bg-white max-h-[calc(92vh-0.75rem)] overflow-y-auto">
              <div className="flex items-start justify-between p-5 sm:p-7 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[10.5px] font-black text-teal-800 bg-teal-50 ring-1 ring-teal-200 px-2 py-0.5 rounded-full">
                      #{detailTarget?.id ?? "—"}
                    </span>
                    {detailTarget?.approved ? (
                      <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-2 py-0.5 rounded-full">
                        Đã phê duyệt
                      </span>
                    ) : (
                      <span className="text-[10.5px] font-bold text-amber-700 bg-amber-50 ring-1 ring-amber-200 px-2 py-0.5 rounded-full">
                        Chờ thẩm định
                      </span>
                    )}
                  </div>
                  <h3 className="text-[17px] sm:text-[19px] font-black text-slate-900 tracking-tight">
                    {detailTarget?.name || "Đang tải..."}
                  </h3>
                  <p className="text-[12px] text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin size={11} className="text-slate-400" />
                    {detailTarget?.address}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDetail}
                  className={`w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center ${CUBIC} cursor-pointer`}
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-5 sm:p-7">
                {detailLoading ? (
                  <div className="py-14 flex flex-col items-center gap-3 text-slate-500">
                    <Loader2 size={28} className="animate-spin text-slate-400" />
                    <p className="text-xs font-bold">Đang tải dữ liệu điểm đến</p>
                  </div>
                ) : detailError ? (
                  <Bezel tone="rose">
                    <div className="p-4 flex items-start gap-2.5">
                      <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-rose-800">Không thể tải chi tiết</p>
                        <p className="text-[11px] text-rose-700 mt-0.5">{detailError}</p>
                      </div>
                    </div>
                  </Bezel>
                ) : detailTarget ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="rounded-2xl bg-sky-50/70 ring-1 ring-sky-200 p-4">
                        <p className="text-[10px] font-black text-sky-700 uppercase tracking-[0.16em] mb-2 flex items-center gap-1">
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
                              {detailTarget.longitude?.toFixed(6) ?? "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-emerald-50/70 ring-1 ring-emerald-200 p-4">
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.16em] mb-2 flex items-center gap-1">
                          <Users size={10} /> Sức chứa tối đa
                        </p>
                        <p className="text-[18px] font-black text-slate-900 leading-none">
                          {detailTarget.capacity ?? "—"}
                          <span className="text-[10.5px] font-bold text-slate-500 ml-1.5">
                            du khách / lượt
                          </span>
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4 sm:col-span-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.16em] mb-1">
                          Đơn vị khởi tạo
                        </p>
                        <p className="text-[13px] font-bold text-slate-800">
                          {detailTarget.createdBy || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="px-5 sm:px-7 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                {detailTarget && !detailTarget.approved && (
                  <PillButton
                    tone="emerald"
                    icon={CheckCircle2}
                    onClick={() =>
                      handleApprove(detailTarget.id, true, detailTarget.name)
                    }
                    loading={actionLoadingId === detailTarget.id}
                  >
                    Phê duyệt
                    <ChevronRight size={12} />
                  </PillButton>
                )}
                {detailTarget && detailTarget.approved && (
                  <PillButton
                    tone="rose"
                    icon={X}
                    onClick={() =>
                      handleApprove(detailTarget.id, false, detailTarget.name)
                    }
                    loading={actionLoadingId === detailTarget.id}
                  >
                    Hủy duyệt
                  </PillButton>
                )}
                <button
                  type="button"
                  onClick={closeDetail}
                  className={`px-5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11.5px] ${CUBIC} cursor-pointer`}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
