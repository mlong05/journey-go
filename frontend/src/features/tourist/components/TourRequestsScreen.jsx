"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Plus,
  Calendar,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  FileQuestion,
  RefreshCw,
  XCircle,
} from "lucide-react";
import AccountLayout from "./AccountLayout";
import PaginationBar from "@/components/ui/PaginationBar";
import { PAGE_SIZE } from "@/lib/pagination";
import { touristService } from "../services/touristService";
import { ROUTES } from "@/constants/routes";
import { vnd, shortDate } from "../utils";

const STATUS_CONFIG = {
  OPEN: {
    label: "Đang chờ đối tác nhận",
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
  },
  ACCEPTED: {
    label: "Đối tác đang thiết kế",
    badgeCls: "bg-sky-50 text-sky-700 border-sky-200",
    icon: RefreshCw,
  },
  FULFILLED: {
    label: "Tour đã sẵn sàng",
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Đã hủy",
    badgeCls: "bg-slate-100 text-slate-500 border-slate-200",
    icon: XCircle,
  },
  EXPIRED: {
    label: "Hết hạn",
    badgeCls: "bg-slate-100 text-slate-500 border-slate-200",
    icon: XCircle,
  },
};

export default function TourRequestsScreen() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [error, setError] = useState(null);

  const fetchRequests = useCallback((p = 0) => {
    return touristService.myTourRequests({ page: p, size: PAGE_SIZE })
      .then((res) => {
        const totalElements = res?.totalElements || 0;
        setRequests(res?.content || []);
        setTotal(totalElements);
        setTotalPages(res?.totalPages || Math.max(1, Math.ceil(totalElements / PAGE_SIZE)));
        setPage(p);
        setError(null);
      })
      .catch((err) => {
        setError(err?.message || "Không thể tải danh sách yêu cầu tour.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchRequests(0);
  }, [fetchRequests]);

  const handlePageChange = (nextPage) => {
    setLoading(true);
    fetchRequests(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AccountLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="text-teal-600" size={22} />
              Tour theo nhu cầu của tôi
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi tiến độ các yêu cầu tour bạn đã tạo và mở đặt tour độc quyền khi đối tác hoàn tất
            </p>
          </div>
          <Link
            href={ROUTES.ACCOUNT_TOUR_REQUEST_NEW}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-800 transition active:scale-[0.98]"
          >
            <Plus size={16} />
            Đăng yêu cầu mới
          </Link>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="jg-shimmer h-5 w-1/3 rounded" />
                  <div className="jg-shimmer h-6 w-28 rounded-full" />
                </div>
                <div className="jg-shimmer h-4 w-2/3 rounded" />
                <div className="jg-shimmer h-4 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-700 mb-4">
              <FileQuestion size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-800">Chưa có yêu cầu tour nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Bạn có thể tạo yêu cầu tour với điểm đến, ngày khởi hành và ngân sách mong muốn. Các nhà tour đối tác sẽ thiết kế riêng cho bạn!
            </p>
            <Link
              href={ROUTES.ACCOUNT_TOUR_REQUEST_NEW}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 transition"
            >
              <Plus size={16} />
              Tạo yêu cầu đầu tiên
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((item) => {
              const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.OPEN;
              const StatusIcon = cfg.icon;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="min-w-0">
                      <Link
                        href={ROUTES.ACCOUNT_TOUR_REQUEST_DETAIL(item.id)}
                        className="text-base font-bold text-slate-900 hover:text-teal-800 transition line-clamp-1"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span>Đăng ngày: {shortDate(item.createdAt)}</span>
                        {item.preferredDestination && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-700 font-medium">
                              <MapPin size={13} className="text-slate-400" />
                              {item.preferredDestination}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.badgeCls}`}
                      >
                        <StatusIcon size={13} />
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Body details */}
                  <div className="py-3 text-xs text-slate-600 line-clamp-2">
                    {item.description}
                  </div>

                  {/* Meta stats */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-4">
                      {item.guestCount && (
                        <span className="flex items-center gap-1">
                          <Users size={14} className="text-slate-400" />
                          {item.guestCount} khách
                        </span>
                      )}
                      {(item.preferredDateFrom || item.preferredDateTo) && (
                        <span className="flex items-center gap-1">
                          <Calendar size={14} className="text-slate-400" />
                          {item.preferredDateFrom ? shortDate(item.preferredDateFrom) : "Tùy ý"} -{" "}
                          {item.preferredDateTo ? shortDate(item.preferredDateTo) : "Tùy ý"}
                        </span>
                      )}
                      {(item.budgetMin || item.budgetMax) && (
                        <span className="font-semibold text-slate-700">
                          Ngân sách:{" "}
                          {item.budgetMin && item.budgetMax
                            ? `${vnd(item.budgetMin)} - ${vnd(item.budgetMax)}`
                            : item.budgetMin
                            ? `Từ ${vnd(item.budgetMin)}`
                            : `Đến ${vnd(item.budgetMax)}`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      {item.status === "FULFILLED" && item.fulfilledTourId && (
                        <Link
                          href={ROUTES.TOUR_DETAIL(item.fulfilledTourId)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                        >
                          <Sparkles size={13} />
                          Xem & Đặt Tour Riêng
                          <ExternalLink size={12} />
                        </Link>
                      )}
                      <Link
                        href={ROUTES.ACCOUNT_TOUR_REQUEST_DETAIL(item.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        Chi tiết <ChevronRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
            {totalPages > 1 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  totalElements={total}
                  unit="yêu cầu"
                  onChange={handlePageChange}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
