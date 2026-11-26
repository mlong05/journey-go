"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardUI";
import PaginationBar from "@/components/ui/PaginationBar";
import { PAGE_SIZE } from "@/lib/pagination";
import tourMergeService from "../services/tourMergeService";
import { MOD_STATUS_TABS, extractErrorMessage } from "../constants";
import TourMergeCard from "./TourMergeCard";
import PassengerManifestModal from "./PassengerManifestModal";

export default function ModeratorTourMergeScreen() {
  const [statusFilter, setStatusFilter] = useState("PENDING_MOD");
  const [page, setPage] = useState(0);
  const [reloadTick, setReloadTick] = useState(0);

  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [manifestMergeId, setManifestMergeId] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await tourMergeService.listModMerges({
          status: statusFilter,
          page,
          size: PAGE_SIZE,
        });
        if (!active) return;
        setItems(Array.isArray(res?.content) ? res.content : []);
        setTotalPages(Math.max(Number(res?.totalPages) || 1, 1));
        setTotalElements(Number(res?.totalElements) || 0);
        setError(null);
      } catch (err) {
        if (active) setError(extractErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [statusFilter, page, reloadTick]);

  const refresh = () => {
    setLoading(true);
    setReloadTick((t) => t + 1);
  };

  const handleStatusChange = (val) => {
    setLoading(true);
    setPage(0);
    setStatusFilter(val);
  };

  const handleReview = async (mergeId, approved, rejectReason) => {
    setBusyId(mergeId);
    setError(null);
    try {
      await tourMergeService.reviewMerge(mergeId, { approved, rejectReason });
      refresh();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (mergeId, reason) => {
    setBusyId(mergeId);
    setError(null);
    try {
      await tourMergeService.cancelMerge(mergeId, { reason });
      refresh();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
      <div className="shrink-0 space-y-3">
        <PageHeader
          compact
          title="Duyệt ghép tour B2B (1-1)"
          description="Kiểm duyệt yêu cầu ghép đoàn đã được cả 2 đối tác xác nhận."
        >
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
          >
            <RefreshCw size={14} />
            Làm mới
          </button>
        </PageHeader>

        <div className="flex flex-wrap items-center gap-1.5">
          {MOD_STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleStatusChange(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === tab.value
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 [scrollbar-width:thin]">
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Đang tải danh sách yêu cầu ghép tour...
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center bg-white border border-dashed border-slate-300 rounded-xl text-sm text-slate-500">
            Không có yêu cầu ghép tour nào trong hàng chờ này.
          </div>
        ) : (
          items.map((merge) => (
            <TourMergeCard
              key={merge.id}
              merge={merge}
              mode="moderator"
              busyId={busyId}
              onOpenPassengers={(id) => setManifestMergeId(id)}
              onReview={handleReview}
              onCancel={handleCancel}
            />
          ))
        )}
      </div>

      <div className="shrink-0">
        <PaginationBar
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          unit="yêu cầu ghép"
          onChange={(nextPage) => {
            setLoading(true);
            setPage(nextPage);
          }}
        />
      </div>

      {manifestMergeId && (
        <PassengerManifestModal
          mergeId={manifestMergeId}
          onClose={() => setManifestMergeId(null)}
        />
      )}
    </div>
  );
}
