"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  XCircle,
  RefreshCw,
  Building2,
  Trash2,
  Coins,
  FileText,
} from "lucide-react";
import AccountLayout from "./AccountLayout";
import { touristService } from "../services/touristService";
import { ROUTES } from "@/constants/routes";
import { vnd, shortDate } from "../utils";

const STATUS_CONFIG = {
  OPEN: {
    label: "Đang chờ đối tác nhận",
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
    desc: "Yêu cầu của bạn đang được hiển thị cho các đối tác nhà tour uy tín trên hệ thống.",
  },
  ACCEPTED: {
    label: "Đối tác đang thiết kế",
    badgeCls: "bg-sky-50 text-sky-700 border-sky-200",
    icon: RefreshCw,
    desc: "Đối tác đã nhận yêu cầu và đang tiến hành thiết kế tour, sắp xếp dịch vụ dành riêng cho bạn.",
  },
  FULFILLED: {
    label: "Tour đã hoàn thành & sẵn sàng đặt",
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
    desc: "Đối tác đã hoàn thiện tour riêng theo yêu cầu. Tour này được bảo mật và chỉ mở riêng cho tài khoản của bạn đặt chỗ!",
  },
  CANCELLED: {
    label: "Đã hủy",
    badgeCls: "bg-slate-100 text-slate-500 border-slate-200",
    icon: XCircle,
    desc: "Yêu cầu đã bị hủy bởi người dùng.",
  },
  EXPIRED: {
    label: "Hết hạn",
    badgeCls: "bg-slate-100 text-slate-500 border-slate-200",
    icon: XCircle,
    desc: "Yêu cầu đã quá hạn tiếp nhận.",
  },
};

export default function TourRequestDetailScreen({ requestId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const fetchDetail = useCallback(() => {
    if (!requestId) return;
    return touristService.tourRequestDetail(requestId)
      .then((res) => {
        setRequest(res);
        setError(null);
      })
      .catch((err) => {
        setError(err?.message || "Không thể tải thông tin yêu cầu tour.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [requestId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleCancel = async () => {
    try {
      setCancelling(true);
      await touristService.cancelTourRequest(requestId);
      setConfirmCancel(false);
      fetchDetail();
    } catch (err) {
      alert(err?.message || "Không thể hủy yêu cầu tour");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <AccountLayout>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="jg-shimmer h-7 w-2/3 rounded" />
          <div className="jg-shimmer h-4 w-1/3 rounded" />
          <div className="jg-shimmer h-24 w-full rounded" />
        </div>
      </AccountLayout>
    );
  }

  if (error || !request) {
    return (
      <AccountLayout>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center space-y-3">
          <AlertCircle size={28} className="mx-auto text-rose-600" />
          <h2 className="text-base font-bold text-rose-800">Không tìm thấy yêu cầu</h2>
          <p className="text-xs text-rose-600">{error || "Yêu cầu không tồn tại hoặc bạn không có quyền xem."}</p>
          <Link
            href={ROUTES.ACCOUNT_TOUR_REQUESTS}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
          >
            Quay lại danh sách
          </Link>
        </div>
      </AccountLayout>
    );
  }

  const cfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.OPEN;
  const StatusIcon = cfg.icon;

  return (
    <AccountLayout>
      <div className="space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={ROUTES.ACCOUNT_TOUR_REQUESTS}
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 transition"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 line-clamp-1">{request.title}</h1>
              <p className="text-xs text-slate-500">Mã yêu cầu: #{request.id} • Đăng ngày {shortDate(request.createdAt)}</p>
            </div>
          </div>

          {request.status === "OPEN" && (
            <div>
              {confirmCancel ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-600 font-semibold">Xác nhận hủy?</span>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                  >
                    {cancelling ? "Đang hủy..." : "Có, hủy ngay"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(false)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Không
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <Trash2 size={14} />
                  Hủy yêu cầu
                </button>
              )}
            </div>
          )}
        </div>

        {/* Status Callout Banner */}
        <div className={`rounded-2xl border p-4.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${cfg.badgeCls}`}>
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-white/80 shadow-xs shrink-0 mt-0.5 sm:mt-0">
              <StatusIcon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold">{cfg.label}</h3>
              <p className="text-xs opacity-90 mt-0.5">{cfg.desc}</p>
            </div>
          </div>

          {request.status === "FULFILLED" && request.fulfilledTourId && (
            <Link
              href={ROUTES.TOUR_DETAIL(request.fulfilledTourId)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition shrink-0"
            >
              <Sparkles size={14} />
              Xem & Đặt Tour Riêng
              <ExternalLink size={13} />
            </Link>
          )}
        </div>

        {/* Accepted Partner info if any */}
        {request.acceptedById && (
          <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sky-700">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-xs text-sky-600 font-semibold">Đối tác tiếp nhận yêu cầu</p>
                <p className="text-sm font-bold text-slate-800">{request.acceptedByName || "Nhà tour đối tác"}</p>
              </div>
            </div>
            {request.acceptedAt && (
              <span className="text-xs text-slate-500">
                Đã nhận lúc: {shortDate(request.acceptedAt)}
              </span>
            )}
          </div>
        )}

        {/* Main Details Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-2 mb-3">
              <FileText size={15} /> Mô tả mong muốn
            </h3>
            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
              {request.description}
            </p>
          </div>

          {request.specialRequirements && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-2 mb-2">
                <Sparkles size={15} /> Yêu cầu đặc biệt
              </h3>
              <p className="text-sm text-slate-700 whitespace-pre-line bg-amber-50/60 rounded-xl p-3.5 border border-amber-100">
                {request.specialRequirements}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                <MapPin size={14} className="text-teal-600" /> Địa điểm
              </span>
              <p className="text-sm font-bold text-slate-800">
                {request.preferredDestination || "Chưa xác định"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                <Calendar size={14} className="text-teal-600" /> Thời gian dự kiến
              </span>
              <p className="text-sm font-bold text-slate-800">
                {request.preferredDateFrom ? shortDate(request.preferredDateFrom) : "Tùy ý"} -{" "}
                {request.preferredDateTo ? shortDate(request.preferredDateTo) : "Tùy ý"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                <Users size={14} className="text-teal-600" /> Số lượng khách
              </span>
              <p className="text-sm font-bold text-slate-800">
                {request.guestCount ? `${request.guestCount} người` : "Chưa chọn"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 sm:col-span-2 md:col-span-3">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                <Coins size={14} className="text-teal-600" /> Ngân sách dự kiến
              </span>
              <p className="text-sm font-bold text-slate-800">
                {request.budgetMin && request.budgetMax
                  ? `${vnd(request.budgetMin)} - ${vnd(request.budgetMax)}`
                  : request.budgetMin
                  ? `Từ ${vnd(request.budgetMin)}`
                  : request.budgetMax
                  ? `Đến ${vnd(request.budgetMax)}`
                  : "Chưa đặt ngân sách cụ thể"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}
