"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  MapPin,
  Compass,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowLeft,
  FileText,
  HelpCircle,
  ExternalLink,
  Highlighter,
  Check,
  X,
  Ticket,
  Maximize2,
  Layers,
  Sparkles,
  Inbox,
  Send,
  Eye,
  Award,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

/**
 * Trang Thẩm Định Chi Tiết Hồ Sơ Điểm Đến Di Tích - JourneyGo
 * Đường dẫn: /moderator/destinations/[id]
 * - Giao diện thẩm định 2 cột chuyên sâu
 * - Bộ công cụ kiểm chuẩn lịch sử, tọa độ thực địa và đố vui
 * - Dynamic state sẵn sàng kết nối API (không mock data tĩnh)
 * - Đảm bảo ngôn ngữ thuần Việt, không chứa chữ tiếng Anh trong ngoặc đơn
 */
export default function DestinationAuditDetailPage({ params }) {
  const router = useRouter();
  const resolvedParams = params ? use(params) : { id: "" };
  const recordId = resolvedParams?.id || "";
  const { confirm, confirmDialog } = useConfirm();

  // Dynamic state cho hồ sơ kiểm duyệt - gắn API sau
  const [destinationData, setDestinationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // State công cụ Highlight văn bản
  const [highlightedParas, setHighlightedParas] = useState({});

  // State kiểm tra bản đồ thực tế
  const [isMapVerifying, setIsMapVerifying] = useState(false);
  const [mapVerifiedStatus, setMapVerifiedStatus] = useState("VERIFIED");

  // State Khung chấm điểm 4 tiêu chí của Thẩm định viên
  const [criteria, setCriteria] = useState({
    historyAccuracy: true,
    photoQuality: true,
    gpsValidity: true,
    fairPricing: true,
  });

  // State Ô nhập lý do phản hồi
  const [feedbackNote, setFeedbackNote] = useState(
    "Hồ sơ đầy đủ, thông số chuẩn xác. Tọa độ thực địa nằm trong khuôn viên an toàn cho du khách."
  );

  // State trạng thái duyệt
  const [submissionStatus, setSubmissionStatus] = useState("PENDING");
  const [decisionModal, setDecisionModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "",
  });

  useEffect(() => {
    // [API INTEGRATION] Gắn hàm gọi API lấy thông tin chi tiết hồ sơ
    // async function fetchDestinationDetail() {
    //   if (!recordId) return;
    //   setIsLoading(true);
    //   try {
    //     const res = await api.get(`/moderator/destinations/${recordId}`);
    //     setDestinationData(res.data);
    //   } catch (err) {
    //     console.error("Lỗi tải chi tiết hồ sơ:", err);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // }
    // fetchDestinationDetail();
  }, [recordId]);

  // Toggle Highlight đoạn văn
  const toggleHighlight = (id) => {
    setHighlightedParas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Toggle tiêu chí
  const toggleCriteria = (key) => {
    setCriteria((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Xử lý phê duyệt hồ sơ
  const handleApprove = async () => {
    const ok = await confirm({
      tone: "success",
      icon: "check",
      title: "Phê duyệt & xuất bản hồ sơ?",
      subject: destinationData?.name || `#${recordId}`,
      description:
        "Hồ sơ sẽ được phát hành tới toàn bộ du khách trên ứng dụng. Vui lòng kiểm tra kỹ trước khi xác nhận.",
      confirmLabel: "Phê duyệt",
    });
    if (!ok) return;
    // [API INTEGRATION] Gọi API phê duyệt
    // api.post(`/moderator/destinations/${recordId}/publish`, { feedback: feedbackNote })
    setSubmissionStatus("PUBLISHED");
    setDecisionModal({
      isOpen: true,
      title: "Phê duyệt & Xuất bản thành công",
      message: `Hồ sơ "${destinationData?.name || recordId}" đã được chuẩn hóa và phát hành thành công tới toàn bộ du khách trên ứng dụng.`,
      type: "PUBLISHED",
    });
  };

  // Xử lý yêu cầu hiệu đính
  const handleRequestRevision = async () => {
    const ok = await confirm({
      tone: "warning",
      icon: "warning",
      title: "Gửi yêu cầu chỉnh sửa bổ sung?",
      subject: destinationData?.name || `#${recordId}`,
      description:
        "Hồ sơ sẽ được chuyển về đơn vị đệ trình kèm ý kiến thẩm định của bạn.",
      confirmLabel: "Gửi yêu cầu",
    });
    if (!ok) return;
    // [API INTEGRATION] Gọi API yêu cầu sửa
    // api.post(`/moderator/destinations/${recordId}/request-revision`, { feedback: feedbackNote })
    setSubmissionStatus("REVISION");
    setDecisionModal({
      isOpen: true,
      title: "Đã gửi yêu cầu hiệu đính",
      message: `Phản hồi thẩm định đã được gửi đến đơn vị đệ trình. Hồ sơ sẽ được chuyển về trạng thái chờ đối tác chỉnh sửa.`,
      type: "REVISION",
    });
  };

  // Xử lý từ chối hồ sơ
  const handleReject = async () => {
    const ok = await confirm({
      tone: "danger",
      icon: "reject",
      title: "Từ chối tiếp nhận hồ sơ?",
      subject: destinationData?.name || `#${recordId}`,
      description:
        "Hồ sơ sẽ bị từ chối và không được hiển thị tới du khách. Hành động này khó hoàn tác.",
      confirmLabel: "Từ chối hồ sơ",
    });
    if (!ok) return;
    // [API INTEGRATION] Gọi API từ chối
    // api.post(`/moderator/destinations/${recordId}/reject`, { feedback: feedbackNote })
    setSubmissionStatus("REJECTED");
    setDecisionModal({
      isOpen: true,
      title: "Đã từ chối tiếp nhận hồ sơ",
      message: `Hồ sơ đã bị từ chối do không đáp ứng tiêu chuẩn văn hóa hoặc vi phạm an toàn thực địa.`,
      type: "REJECTED",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* ────────────────────────────────────────────────────────
          1. HEADER ĐIỀU HƯỚNG & TRẠNG THÁI HỒ SƠ
      ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        {/* Thanh breadcrumb & Nút quay lại */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <Link
            href="/moderator/destinations"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-teal-700 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Quay lại danh sách thẩm định</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              Mã hồ sơ: #{recordId}
            </span>
            {submissionStatus === "PUBLISHED" ? (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 size={13} />
                <span>Đã phê duyệt</span>
              </span>
            ) : submissionStatus === "REVISION" ? (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                <AlertTriangle size={13} />
                <span>Yêu cầu hiệu đính</span>
              </span>
            ) : submissionStatus === "REJECTED" ? (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                <XCircle size={13} />
                <span>Từ chối hồ sơ</span>
              </span>
            ) : (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                <Clock size={13} />
                <span>Đang thẩm định</span>
              </span>
            )}
          </div>
        </div>

        {/* Tiêu đề & thông tin hồ sơ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                {destinationData?.category || "Di tích lịch sử & Văn hóa"}
              </span>
              {destinationData?.priority && (
                <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  {destinationData.priority}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {destinationData?.name || `Hồ sơ kiểm định di tích #${recordId}`}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Building2 size={13} className="text-slate-400" />
                <span>{destinationData?.sender || "Đơn vị quản lý di tích"}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-slate-400" />
                <span>{destinationData?.submittedAt || "Vừa cập nhật"}</span>
              </span>
              {destinationData?.senderContact && (
                <>
                  <span>•</span>
                  <span>Liên hệ: {destinationData.senderContact}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          2. NỘI DUNG THẨM ĐỊNH 2 CỘT CHUYÊN SÂU
      ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (8 CỘT): NỘI DUNG ĐỐI CHIẾU & TỌA ĐỘ & ĐỐ VUI */}
        <div className="lg:col-span-8 space-y-6">
          {/* KHỐI 1: TỌA ĐỘ THỰC ĐỊA & BẢN ĐỒ KIỂM TRA */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                  <Navigation size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Tọa Độ Thực Địa & Bản Đồ
                  </h3>
                  <p className="text-xs text-slate-500">
                    Xác thực vị trí vệ tinh GPS và bán kính kích hoạt thuyết minh
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 size={13} />
                <span>Tọa độ hợp lệ</span>
              </span>
            </div>

            {/* Thông số tọa độ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Vĩ độ
                </span>
                <span className="text-xs font-mono font-black text-slate-800">
                  {destinationData?.geofence?.lat || "21.028511"}° N
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Kinh độ
                </span>
                <span className="text-xs font-mono font-black text-slate-800">
                  {destinationData?.geofence?.lng || "105.835520"}° E
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Bán kính kích hoạt
                </span>
                <span className="text-xs font-mono font-black text-slate-800">
                  {destinationData?.geofence?.radius || 60} mét
                </span>
              </div>
            </div>

            {/* Địa chỉ thực tế */}
            <div className="text-xs text-slate-600 flex items-start gap-1.5 p-2.5 rounded-xl bg-slate-50/70 border border-slate-200">
              <MapPin size={14} className="text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong>Địa chỉ thực tế:</strong>{" "}
                {destinationData?.geofence?.address ||
                  "Khuôn viên di tích - Đang chờ cập nhật địa chỉ chi tiết"}
              </span>
            </div>

            {/* Khung bản đồ mô phỏng */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-[16/8] bg-slate-900/10 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={destinationData?.images?.[0]?.url || "/image/vanmieu.png"}
                alt="Bản đồ thực địa"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                <div className="relative flex items-center justify-center">
                  <div className="w-28 h-28 rounded-full border-2 border-dashed border-emerald-400 bg-emerald-500/25 animate-pulse" />
                  <div className="absolute w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg ring-4 ring-white">
                    <MapPin size={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KHỐI 2: NỘI DUNG THUYẾT MINH LỊCH SỬ & CÔNG CỤ HIGHLIGHT */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Nội Dung Thuyết Minh Lịch Sử
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bấm vào từng đoạn để đánh dấu điểm cần thẩm định hoặc đối chiếu sử liệu
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Highlighter size={14} className="text-amber-500" />
                <span className="font-semibold">Công cụ đánh dấu</span>
              </div>
            </div>

            {/* Danh sách các đoạn văn bản */}
            <div className="space-y-3">
              {destinationData?.paragraphs && destinationData.paragraphs.length > 0 ? (
                destinationData.paragraphs.map((p, idx) => {
                  const isHighlighted = highlightedParas[p.id || `p${idx}`];
                  return (
                    <div
                      key={p.id || idx}
                      onClick={() => toggleHighlight(p.id || `p${idx}`)}
                      className={`p-3.5 rounded-xl border text-xs leading-relaxed transition-all cursor-pointer ${
                        isHighlighted
                          ? "bg-amber-50/80 border-amber-300 text-amber-950 font-medium shadow-2xs"
                          : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          Đoạn #{idx + 1}
                        </span>
                        {isHighlighted && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            Đã đánh dấu rà soát
                          </span>
                        )}
                      </div>
                      <p>{p.text}</p>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                  {destinationData?.description ||
                    "Chưa có đoạn văn bản thuyết minh chi tiết cho hồ sơ này. Dữ liệu sẽ được hiển thị khi kết nối máy chủ."}
                </div>
              )}
            </div>
          </div>

          {/* KHỐI 3: THỬ THÁCH ĐỐ VUI TRẢI NGHIỆM */}
          {destinationData?.quizChallenge && (
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <HelpCircle size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Thử Thách Đố Vui Trải Nghiệm
                    </h3>
                    <p className="text-xs text-slate-500">
                      Bộ câu hỏi tương tác du khách trả lời tại thực địa
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 flex items-center gap-1">
                  <Award size={13} />
                  <span>50 Điểm thưởng</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="text-xs font-black text-slate-900">
                  {destinationData.quizChallenge.question}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {destinationData.quizChallenge.options?.map((opt) => (
                    <div
                      key={opt.key}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                        opt.isCorrect
                          ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
                          : "bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      <span>
                        <strong>{opt.key}.</strong> {opt.text}
                      </span>
                      {opt.isCorrect && (
                        <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-black uppercase">
                          Đáp án đúng
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {destinationData.quizChallenge.explanation && (
                  <p className="text-xs text-slate-500 italic pt-2 border-t border-slate-200">
                    <strong>Giải thích sử liệu:</strong>{" "}
                    {destinationData.quizChallenge.explanation}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* KHỐI 4: HÌNH ẢNH TƯ LIỆU ĐÍNH KÈM */}
          {destinationData?.images && destinationData.images.length > 0 && (
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
                Thư Viện Hình Ảnh Tư Liệu Đính Kèm
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {destinationData.images.map((img, idx) => (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.caption || "Tư liệu"}
                      className="w-full h-44 object-cover"
                    />
                    <div className="p-3 text-xs space-y-1">
                      <p className="font-bold text-slate-800">{img.caption}</p>
                      <p className="text-[11px] text-slate-400">Nguồn: {img.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI (4 CỘT): SIDEBAR THẨM ĐỊNH & QUYẾT ĐỊNH */}
        <div className="lg:col-span-4 space-y-6">
          {/* KHUNG TIÊU CHÍ KIỂM ĐỊNH */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <ShieldCheck size={18} className="text-teal-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Tiêu Chí Thẩm Định Chuẩn
              </h3>
            </div>

            <div className="space-y-2.5">
              <label
                onClick={() => toggleCriteria("historyAccuracy")}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={criteria.historyAccuracy}
                  onChange={() => {}}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs font-bold text-slate-700">
                  Xác thực tính lịch sử và văn hóa
                </span>
              </label>

              <label
                onClick={() => toggleCriteria("gpsValidity")}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={criteria.gpsValidity}
                  onChange={() => {}}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs font-bold text-slate-700">
                  Tọa độ thực địa an toàn và chuẩn xác
                </span>
              </label>

              <label
                onClick={() => toggleCriteria("photoQuality")}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={criteria.photoQuality}
                  onChange={() => {}}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs font-bold text-slate-700">
                  Hình ảnh bản quyền và rõ nét
                </span>
              </label>

              <label
                onClick={() => toggleCriteria("fairPricing")}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={criteria.fairPricing}
                  onChange={() => {}}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs font-bold text-slate-700">
                  Mức giá trải nghiệm hợp lý
                </span>
              </label>
            </div>

            {/* Ghi chú thẩm định */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ghi Chú Ý Kiến Thẩm Định
              </label>
              <textarea
                rows={4}
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder="Nhập ghi chú ý kiến hoặc căn cứ phê duyệt..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 leading-relaxed"
              />
            </div>

            {/* Nhóm nút quyết định */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleApprove}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>Phê duyệt & Xuất bản ngay</span>
              </button>

              <button
                type="button"
                onClick={handleRequestRevision}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <AlertTriangle size={16} />
                <span>Yêu cầu chỉnh sửa bổ sung</span>
              </button>

              <button
                type="button"
                onClick={handleReject}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <XCircle size={16} />
                <span>Từ chối hồ sơ này</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          3. MODAL KẾT QUẢ QUYẾT ĐỊNH
      ──────────────────────────────────────────────────────── */}
      {decisionModal.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setDecisionModal({ ...decisionModal, isOpen: false })}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  decisionModal.type === "PUBLISHED"
                    ? "bg-emerald-100 text-emerald-700"
                    : decisionModal.type === "REVISION"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {decisionModal.type === "PUBLISHED" ? (
                  <CheckCircle2 size={24} />
                ) : decisionModal.type === "REVISION" ? (
                  <AlertTriangle size={24} />
                ) : (
                  <XCircle size={24} />
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {decisionModal.title}
                </h3>
                <p className="text-xs text-slate-400">Cập nhật hồ sơ kiểm duyệt</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {decisionModal.message}
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDecisionModal({ ...decisionModal, isOpen: false })}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Ở lại trang này
              </button>
              <button
                type="button"
                onClick={() => router.push("/moderator/destinations")}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Về danh sách
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
