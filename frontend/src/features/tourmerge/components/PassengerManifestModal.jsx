"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Users, X } from "lucide-react";
import tourMergeService from "../services/tourMergeService";
import {
  GUEST_TYPE_LABELS,
  TOUR_MERGE_STATUS_META,
  extractErrorMessage,
  formatTime,
} from "../constants";

export default function PassengerManifestModal({ mergeId, onClose }) {
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roleFilter, setRoleFilter] = useState("ALL");

  useEffect(() => {
    if (!mergeId) return undefined;
    let active = true;

    (async () => {
      try {
        const res = await tourMergeService.getPassengerManifest(mergeId);
        if (active) {
          setManifest(res);
          setError(null);
        }
      } catch (err) {
        if (active) setError(extractErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [mergeId]);

  const filteredPassengers = useMemo(() => {
    const list = manifest?.passengers || [];
    if (roleFilter === "ALL") return list;
    return list.filter((p) => p.slotRole === roleFilter);
  }, [manifest, roleFilter]);

  const statusMeta =
    TOUR_MERGE_STATUS_META[manifest?.status] || TOUR_MERGE_STATUS_META.APPROVED;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Users size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">
                Danh sách hành khách đoàn ghép #{mergeId}
              </h2>
              {manifest && (
                <p className="text-xs text-slate-500 truncate">
                  Ngày {manifest.departureDate} • {formatTime(manifest.mergedDepartureTime)} •{" "}
                  {manifest.mergedMeetingPoint}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="py-14 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Đang tải danh sách hành khách...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
              {error}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold ring-1 ring-inset ${statusMeta.badgeClass}`}
                  >
                    {statusMeta.label}
                  </span>
                  <span>
                    Tổng hành khách:{" "}
                    <strong className="text-slate-900">{manifest?.totalPassengers ?? 0}</strong>
                  </span>
                  <span>
                    Số chỗ chiếm:{" "}
                    <strong className="text-slate-900">
                      {manifest?.totalSeatsOccupied ?? 0} / {manifest?.mergedCapacity ?? "--"}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {[
                    { key: "ALL", label: "Tất cả" },
                    { key: "HOST", label: "Đoàn chủ (HOST)" },
                    { key: "GUEST", label: "Đoàn ghép (GUEST)" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setRoleFilter(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        roleFilter === tab.key
                          ? "bg-slate-900 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredPassengers.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  Chưa có hành khách nào đã thanh toán trong phạm vi bộ lọc này.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="py-2.5 px-3">Hành khách</th>
                        <th className="py-2.5 px-3">Loại khách</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">Mã đơn</th>
                        <th className="py-2.5 px-3">Tour gốc</th>
                        <th className="py-2.5 px-3">Đối tác</th>
                        <th className="py-2.5 px-3">Nhãn đoàn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPassengers.map((p) => (
                        <tr key={`${p.bookingCode}-${p.passengerId}`} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {p.fullName}
                            {p.bookingCustomer && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-semibold">
                                Người đặt
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {GUEST_TYPE_LABELS[p.guestType] || p.guestType}
                            {!p.countsTowardSlot && (
                              <span className="ml-1 text-[10px] text-slate-400">(không chiếm chỗ)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{p.email || "—"}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{p.bookingCode}</td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">
                            {p.originalTourName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{p.providerName || "—"}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                p.slotRole === "HOST"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-indigo-50 text-indigo-700"
                              }`}
                            >
                              {p.slotRole} #{p.slotId}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
