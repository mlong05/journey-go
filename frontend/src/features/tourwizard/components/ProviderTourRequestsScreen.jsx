"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Inbox,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Users,
  Coins,
  ArrowRight,
  Loader2,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  FileText,
  User,
  Mail,
} from "lucide-react";
import { providerTourService } from "@/features/tourwizard/services/providerTourService";
import { vnd, shortDate } from "@/features/tourist/utils";

const TABS = [
  { id: "OPEN", label: "Yêu cầu mới đang mở", icon: Inbox },
  { id: "MY_ACCEPTED", label: "Yêu cầu tôi đã nhận", icon: CheckCircle2 },
];

export default function ProviderTourRequestsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("OPEN");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState(null);

  // Modal chi tiết
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchList = async (tab = activeTab, p = 0) => {
    try {
      setLoading(true);
      setError(null);
      let res;
      if (tab === "OPEN") {
        res = await providerTourService.listOpenRequests({ page: p, size: 10 });
      } else {
        res = await providerTourService.listMyAcceptedRequests({ page: p, size: 10 });
      }
      setRequests(res?.content || []);
      setTotal(res?.totalElements || 0);
      setPage(p);
    } catch (err) {
      setError(err?.message || "Không thể tải danh sách yêu cầu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(activeTab, 0);
  }, [activeTab]);

  // Hành động Đối tác bấm nhận yêu cầu
  const handleAccept = async (requestId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [requestId]: true }));
      await providerTourService.acceptRequest(requestId);
      // Reload lại danh sách sau khi nhận
      await fetchList(activeTab, page);
      if (selectedRequest && selectedRequest.id === requestId) {
        const updated = await providerTourService.getRequestDetail(requestId);
        setSelectedRequest(updated);
      }
    } catch (err) {
      alert(err?.message || "Không thể nhận yêu cầu này.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  // Hành động Tạo tour theo yêu cầu này
  const handleCreateTourForRequest = async (item) => {
    try {
      setActionLoading((prev) => ({ ...prev, [`create_${item.id}`]: true }));
      // Tạo draft tour với thông tin gắn sẵn
      const draft = await providerTourService.create({
        title: `Tour thiết kế: ${item.title}`.slice(0, 80),
        visibility: "SPECIFIC_USER",
        specificUserEmail: item.requesterEmail,
        tourRequestId: item.id,
      });
      // Điều hướng ngay sang wizard chỉnh sửa tour
      router.push(`/provider/tours/${draft.tourId}/edit`);
    } catch (err) {
      alert(err?.message || "Không thể tạo bản nháp tour.");
      setActionLoading((prev) => ({ ...prev, [`create_${item.id}`]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Sparkles className="text-teal-600" size={24} />
            Yêu cầu tạo tour theo nhu cầu
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Xem các yêu cầu từ du khách, nhận thiết kế và phát hành tour riêng (Specific User) dành riêng cho khách
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchList(activeTab, page)}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                active
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Icon size={15} />
              {tab.label}
              {active && <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">{total}</span>}
            </button>
          );
        })}
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
                <div className="h-5 w-1/3 bg-slate-100 rounded animate-pulse" />
                <div className="h-6 w-24 bg-slate-100 rounded-full animate-pulse" />
              </div>
              <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
            <Inbox size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {activeTab === "OPEN" ? "Hiện không có yêu cầu tour nào đang mở" : "Bạn chưa nhận yêu cầu nào"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {activeTab === "OPEN"
              ? "Khi có du khách đăng yêu cầu mới, các bài đăng sẽ xuất hiện ở đây để bạn nhận."
              : "Hãy kiểm tra tab 'Yêu cầu mới đang mở' và bấm 'Nhận yêu cầu' để bắt đầu thiết kế."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                      #{item.id}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1">{item.title}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
                    <span className="flex items-center gap-1">
                      <User size={13} className="text-slate-400" />
                      {item.requesterName} ({item.requesterEmail})
                    </span>
                    <span>•</span>
                    <span>Đăng ngày: {shortDate(item.createdAt)}</span>
                    {item.preferredDestination && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <MapPin size={13} className="text-teal-600" />
                          {item.preferredDestination}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {item.status === "OPEN" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">
                      <Clock size={13} /> Chờ nhận
                    </span>
                  )}
                  {item.status === "ACCEPTED" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-bold text-sky-700">
                      <RefreshCw size={13} /> Đang lên tour
                    </span>
                  )}
                  {item.status === "FULFILLED" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 size={13} /> Đã hoàn thành
                    </span>
                  )}
                </div>
              </div>

              {/* Description preview */}
              <p className="py-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {item.description}
              </p>

              {/* Meta stats & Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-4 text-slate-500">
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
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <Coins size={14} className="text-amber-500" />
                      {item.budgetMin && item.budgetMax
                        ? `${vnd(item.budgetMin)} - ${vnd(item.budgetMax)}`
                        : item.budgetMin
                        ? `Từ ${vnd(item.budgetMin)}`
                        : `Đến ${vnd(item.budgetMax)}`}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedRequest(item)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <FileText size={13} /> Chi tiết
                  </button>

                  {/* Khi ở tab OPEN và chưa có ai nhận */}
                  {item.status === "OPEN" && (
                    <button
                      type="button"
                      disabled={actionLoading[item.id]}
                      onClick={() => handleAccept(item.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-800 disabled:opacity-50 transition cursor-pointer"
                    >
                      {actionLoading[item.id] ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Đang nhận...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={13} /> Nhận yêu cầu này
                        </>
                      )}
                    </button>
                  )}

                  {/* Khi đã nhận (ACCEPTED) */}
                  {item.status === "ACCEPTED" && (
                    <button
                      type="button"
                      disabled={actionLoading[`create_${item.id}`]}
                      onClick={() => handleCreateTourForRequest(item)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 transition cursor-pointer"
                    >
                      {actionLoading[`create_${item.id}`] ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Đang tạo nháp...
                        </>
                      ) : (
                        <>
                          <PlusCircle size={13} /> Lên Tour Riêng Cho Khách
                        </>
                      )}
                    </button>
                  )}

                  {/* Khi đã tạo xong tour (FULFILLED) */}
                  {item.status === "FULFILLED" && item.fulfilledTourId && (
                    <Link
                      href={`/provider/tours/${item.fulfilledTourId}/edit`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                    >
                      Xem tour đã tạo (#{item.fulfilledTourId})
                      <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal chi tiết yêu cầu */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                  Yêu cầu #{selectedRequest.id}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedRequest.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Requester info */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-100 text-teal-800 font-bold">
                {selectedRequest.requesterName?.[0] || "U"}
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-800">{selectedRequest.requesterName}</p>
                <p className="text-slate-500 flex items-center gap-1 mt-0.5">
                  <Mail size={12} /> {selectedRequest.requesterEmail}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-2">Mô tả mong muốn</h4>
              <p className="text-xs text-slate-700 whitespace-pre-line bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
                {selectedRequest.description}
              </p>
            </div>

            {/* Special requirements */}
            {selectedRequest.specialRequirements && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-2">Yêu cầu đặc biệt</h4>
                <p className="text-xs text-slate-700 whitespace-pre-line bg-amber-50/60 p-3 rounded-xl border border-amber-100">
                  {selectedRequest.specialRequirements}
                </p>
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <span className="text-slate-500 font-medium">Địa điểm</span>
                <p className="font-bold text-slate-800 mt-1">{selectedRequest.preferredDestination || "Tùy chọn"}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <span className="text-slate-500 font-medium">Số lượng khách</span>
                <p className="font-bold text-slate-800 mt-1">{selectedRequest.guestCount || "Chưa chọn"} người</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 col-span-2 sm:col-span-1">
                <span className="text-slate-500 font-medium">Ngân sách dự kiến</span>
                <p className="font-bold text-slate-800 mt-1">
                  {selectedRequest.budgetMin && selectedRequest.budgetMax
                    ? `${vnd(selectedRequest.budgetMin)} - ${vnd(selectedRequest.budgetMax)}`
                    : selectedRequest.budgetMin
                    ? `Từ ${vnd(selectedRequest.budgetMin)}`
                    : selectedRequest.budgetMax
                    ? `Đến ${vnd(selectedRequest.budgetMax)}`
                    : "Chưa đặt"}
                </p>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>

              {selectedRequest.status === "OPEN" && (
                <button
                  type="button"
                  disabled={actionLoading[selectedRequest.id]}
                  onClick={() => handleAccept(selectedRequest.id)}
                  className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading[selectedRequest.id] ? "Đang nhận..." : "Nhận yêu cầu này"}
                </button>
              )}

              {selectedRequest.status === "ACCEPTED" && (
                <button
                  type="button"
                  disabled={actionLoading[`create_${selectedRequest.id}`]}
                  onClick={() => handleCreateTourForRequest(selectedRequest)}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading[`create_${selectedRequest.id}`] ? "Đang tạo nháp..." : "Lên Tour Riêng Cho Khách"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
