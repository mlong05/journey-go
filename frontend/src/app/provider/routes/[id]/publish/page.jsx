"use client";

import React, { useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  MapPin,
  Clock,
  Sparkles,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Send,
  FileCheck,
  ShieldCheck,
  Building2,
  ArrowLeft,
  ArrowRight,
  Info,
  DollarSign,
  Ticket,
  Users,
  Check,
  X,
  Footprints,
  Eye,
  Edit3,
  HelpCircle,
  Award,
} from "lucide-react";

/**
 * Trang Cấu Hình Giá & Xuất Bản Lộ Trình Tham Quan - JourneyGo
 * Đường dẫn: /provider/routes/[id]/publish
 * - Định giá vé lộ trình, khấu trừ phí vận hành sàn 10% và gửi hồ sơ thẩm định
 * - Dynamic state sẵn sàng kết nối API (không mock data tĩnh)
 * - Đảm bảo ngôn ngữ thuần Việt, không chứa chữ tiếng Anh trong ngoặc đơn
 */
export default function RoutePublishPage({ params }) {
  const router = useRouter();
  const resolvedParams = params ? use(params) : { id: "tour-moi" };
  const routeId = resolvedParams?.id || "tour-moi";

  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Trạng thái phê duyệt của lộ trình: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED'
  const [moderationStatus, setModerationStatus] = useState("DRAFT");

  // Cấu hình giá
  const [pricingType, setPricingType] = useState("paid");
  const [ticketPrice, setTicketPrice] = useState(80000);

  // Phí nền tảng 10%
  const PLATFORM_FEE_RATE = 0.1;
  const platformFee = Math.round(ticketPrice * PLATFORM_FEE_RATE);
  const netEarnings = ticketPrice - platformFee;

  // Chính sách vé đi kèm
  const [ticketPolicies, setTicketPolicies] = useState({
    audioGuide: true,
    quizGamification: true,
    entryTicket: true,
    map3D: true,
    insurance: true,
  });

  const togglePolicy = (key) => {
    setTicketPolicies((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Modal cam kết & gửi phê duyệt
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [hasAgreedCommitment, setHasAgreedCommitment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Xác nhận gửi hồ sơ
  const handleConfirmSubmission = () => {
    if (!hasAgreedCommitment) {
      alert("Vui lòng tích chọn đồng ý cam kết tính chính xác của dữ liệu lịch sử.");
      return;
    }

    setIsSubmitting(true);
    // [API INTEGRATION] Gửi yêu cầu xuất bản lộ trình
    // api.post(`/provider/routes/${routeId}/submit-review`, { pricingType, ticketPrice, ticketPolicies })
    setTimeout(() => {
      setIsSubmitting(false);
      setIsCommitModalOpen(false);
      setModerationStatus("PENDING_REVIEW");
      showToast(
        "Đã gửi hồ sơ lộ trình thành công! Ban Thẩm định Di sản sẽ rà soát và phản hồi trong 24 giờ."
      );
    }, 600);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-200">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-600 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-3 max-w-md">
          <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          1. HEADER & ĐIỀU HƯỚNG QUAY LẠI
      ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/provider/routes/builder"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-700 transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            <span>Quay lại Trình thiết kế lộ trình</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-emerald-600 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Cấu Hình Giá Vé & Xuất Bản Lộ Trình
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Thiết lập chính sách vé điện tử, phân bổ doanh thu và gửi hồ sơ sang Ban Thẩm định.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {moderationStatus === "PENDING_REVIEW" ? (
            <span className="px-4 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
              <Clock size={15} />
              <span>Đang chờ Ban Thẩm định duyệt</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setIsCommitModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send size={15} />
              <span>Gửi Hồ Sơ Phê Duyệt</span>
            </button>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          2. NỘI DUNG ĐỊNH GIÁ & CHÍNH SÁCH VÉ
      ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (7/12): CẤU HÌNH GIÁ VÉ & CHIẾT KHẤU SÀN */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                1. Chính Sách Bán Vé Lộ Trình
              </h2>
            </div>

            <div className="space-y-4">
              {/* Radio chọn Miễn phí hoặc Có phí */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPricingType("paid")}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    pricingType === "paid"
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-400/50"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <p className="text-xs sm:text-sm font-black">Thu Phí Trải Nghiệm</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Bán vé điện tử trọn gói qua cổng JourneyGo</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPricingType("free")}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    pricingType === "free"
                      ? "border-sky-500 bg-sky-50/70 text-sky-950 font-bold shadow-xs ring-1 ring-sky-400/50"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <p className="text-xs sm:text-sm font-black">Miễn Phí Khám Phá</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Dành cho các tuyến quảng bá di sản cộng đồng</p>
                </button>
              </div>

              {pricingType === "paid" && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Giá Vé Niêm Yết Cho Mỗi Du Khách (VNĐ)
                    </label>
                    <input
                      type="number"
                      value={ticketPrice}
                      onChange={(e) => setTicketPrice(Number(e.target.value))}
                      step="5000"
                      min="10000"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  {/* Bảng phân bổ doanh thu */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Giá vé bán ra:</span>
                      <span className="font-bold text-slate-900">{ticketPrice.toLocaleString("vi-VN")} ₫</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Phí vận hành & bảo trì hệ thống (10%):</span>
                      <span>-{platformFee.toLocaleString("vi-VN")} ₫</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-emerald-800">
                      <span>Doanh thu đối tác thực nhận (90%):</span>
                      <span>+{netEarnings.toLocaleString("vi-VN")} ₫</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dịch vụ bao gồm */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-1.5 h-4 bg-sky-600 rounded-full" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                2. Quyền Lợi Đi Kèm Trong Vé
              </h2>
            </div>

            <div className="space-y-2.5">
              <label
                onClick={() => togglePolicy("audioGuide")}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={ticketPolicies.audioGuide}
                  onChange={() => {}}
                  className="rounded text-emerald-600"
                />
                <span className="text-xs font-bold text-slate-700">
                  Thuyết minh âm thanh tự động tại tất cả các trạm dừng
                </span>
              </label>

              <label
                onClick={() => togglePolicy("quizGamification")}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={ticketPolicies.quizGamification}
                  onChange={() => {}}
                  className="rounded text-emerald-600"
                />
                <span className="text-xs font-bold text-slate-700">
                  Thử thách đố vui tương tác nhận huy hiệu & điểm thưởng
                </span>
              </label>

              <label
                onClick={() => togglePolicy("entryTicket")}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={ticketPolicies.entryTicket}
                  onChange={() => {}}
                  className="rounded text-emerald-600"
                />
                <span className="text-xs font-bold text-slate-700">
                  Vé vào cổng toàn bộ các điểm di tích trong tuyến
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (5/12): TÓM TẮT HỒ SƠ & TIÊU CHUẨN THẨM ĐỊNH */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <ShieldCheck size={18} className="text-teal-600" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Tiêu Chuẩn Thẩm Định Di Sản
              </h2>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="font-bold text-slate-800">1. Tính xác thực lịch sử</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Nội dung thuyết minh phải trích dẫn từ nguồn sử liệu chính thống, không sai lệch niên đại.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="font-bold text-slate-800">2. An toàn thực địa</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Lộ trình di chuyển thuận tiện, không đi qua khu vực công trường nguy hiểm hoặc khu bảo tồn cấm.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="font-bold text-slate-800">3. Minh bạch chi phí</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Giá vé niêm yết rõ ràng, bao gồm toàn bộ dịch vụ cam kết, không phát sinh phụ phí ẩn.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCommitModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Gửi Hồ Sơ Phê Duyệt Ngay
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          MODAL CAM KẾT & GỬI PHÊ DUYỆT
      ──────────────────────────────────────────────────────── */}
      {isCommitModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsCommitModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Cam Kết Nội Dung Văn Hóa
              </h3>
              <button
                type="button"
                onClick={() => setIsCommitModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Bằng việc gửi hồ sơ lộ trình này lên hệ thống JourneyGo, đơn vị đối tác cam kết:
              </p>
              <ul className="list-disc list-inside space-y-1 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <li>Dữ liệu lịch sử, nhân vật và niên đại hoàn toàn chính xác.</li>
                <li>Tọa độ thực địa an toàn, đã kiểm tra thực tế tại hiện trường.</li>
                <li>Đảm bảo quyền lợi tham quan của du khách đúng như mức giá niêm yết.</li>
              </ul>

              <label
                onClick={() => setHasAgreedCommitment(!hasAgreedCommitment)}
                className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={hasAgreedCommitment}
                  onChange={() => {}}
                  className="rounded text-emerald-600"
                />
                <span className="font-bold text-slate-800">
                  Tôi đồng ý với toàn bộ cam kết văn hóa trên.
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCommitModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmission}
                disabled={isSubmitting || !hasAgreedCommitment}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
              >
                {isSubmitting ? "Đang gửi..." : "Xác nhận gửi duyệt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
