"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  X,
  MapPin,
  Navigation,
  Users,
  Building2,
  Clock,
  CheckCircle2,
  Ban,
  Loader2,
  AlertCircle,
  Headphones,
  Video,
  BookOpen,
  FileText,
  Globe,
  Play,
  Pause,
  Volume2,
  ExternalLink,
  Edit3,
  ShieldCheck,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Compass,
  Trophy,
  Banknote,
  HelpCircle,
  Layers,
  Calendar,
  Inbox,
  XCircle,
  AlertTriangle,
  History,
  Send,
} from "lucide-react";
import { culturalContentService } from "../services/culturalContentService";
import { moderationService } from "../services/moderationService";
import { experienceService } from "@/features/experience/services/experienceService";
import { taskService } from "@/features/experience/services/taskService";
import { checkInPointService } from "@/features/experience/services/checkInPointService";
import { slotService } from "@/features/experience/services/slotService";

/* Cấu hình các định dạng nội dung văn hóa */
const CONTENT_TYPES = [
  {
    type: "AUDIO",
    label: "Audio Thuyết minh",
    icon: Headphones,
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    type: "VIDEO",
    label: "Video Tư liệu",
    icon: Video,
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    type: "STORY",
    label: "Truyền thuyết / Sự tích",
    icon: BookOpen,
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    type: "ARTICLE",
    label: "Bài viết Di sản",
    icon: FileText,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    type: "3D_VR",
    label: "Mô hình 3D / VR",
    icon: Globe,
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
  },
];

function formatDuration(sec) {
  if (!sec || Number.isNaN(sec) || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getYouTubeEmbedUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = trimmed.match(regExp);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&rel=0` : null;
}

function isDirectVideoUrl(url) {
  if (!url || typeof url !== "string") return false;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url.trim());
}

export default function DestinationAssessmentModal({
  isOpen,
  destination,
  isLoading = false,
  error = "",
  onClose,
  onApprove,
  onEdit,
  isActionLoading = false,
  theme = "emerald", // "emerald" | "slate"
}) {
  // Tab chính: "general" (Thực địa & Sức chứa) | "contents" (Hồ sơ Thuyết minh & Văn hóa)
  const [activeTab, setActiveTab] = useState("general");

  // Dữ liệu thuyết minh văn hóa của điểm đến
  const [contents, setContents] = useState([]);
  const [contentsLoading, setContentsLoading] = useState(false);
  const [contentsError, setContentsError] = useState("");

  // Trình phát nghe thử Audio trực tiếp
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  // Trình xem / phát Media chuyên dụng (YouTube iframe, Video HTML5, Audio)
  const [previewMediaTarget, setPreviewMediaTarget] = useState(null);

  // Mở rộng/thu gọn kịch bản chi tiết
  const [expandedScriptIds, setExpandedScriptIds] = useState({});
  const [copiedScriptId, setCopiedScriptId] = useState(null);

  // Đánh dấu đã kiểm duyệt từng mục nội dung (Review Checklist in session)
  const [reviewedItems, setReviewedItems] = useState({});

  // Trạng thái kiểm duyệt Cultural Content
  const [contentToast, setContentToast] = useState("");
  const showContentToast = useCallback((msg) => {
    setContentToast(msg);
    setTimeout(() => setContentToast(""), 3500);
  }, []);

  const destId = destination?.id;

  // Tải danh sách thuyết minh văn hóa khi modal mở hoặc destination đổi
  const loadCulturalContents = useCallback(async () => {
    if (!destId) return;
    setContentsLoading(true);
    setContentsError("");
    try {
      const data = await culturalContentService.getByDestination(destId);
      const list = Array.isArray(data) ? data : [];
      setContents(list);
    } catch (err) {
      console.error("[AssessmentModal] Failed to fetch cultural contents:", err);
      setContentsError(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể tải hồ sơ thuyết minh văn hóa."
      );
      setContents([]);
    } finally {
      setContentsLoading(false);
    }
  }, [destId]);

  // Modal Phê duyệt Content
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveNote, setApproveNote] = useState("");
  const [isApprovingContent, setIsApprovingContent] = useState(false);

  // Modal Từ chối Content
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [otherReason, setOtherReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [isRejectingContent, setIsRejectingContent] = useState(false);

  // Modal Xem lịch sử Content
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [historyError, setHistoryError] = useState("");

  const handleOpenApproveContent = useCallback((content) => {
    setApproveTarget(content);
    setApproveNote("");
  }, []);

  const handleConfirmApproveContent = useCallback(async () => {
    if (!approveTarget) return;
    setIsApprovingContent(true);
    try {
      await moderationService.approveContent(approveTarget.id, approveNote);
      showContentToast(`Đã duyệt thành công bài thuyết minh "${approveTarget.title}".`);
      setApproveTarget(null);
      await loadCulturalContents();
    } catch (err) {
      console.error("[Approve Content error]:", err);
      showContentToast(err?.message || "Không thể phê duyệt nội dung này.");
    } finally {
      setIsApprovingContent(false);
    }
  }, [approveTarget, approveNote, loadCulturalContents, showContentToast]);

  const handleOpenRejectContent = useCallback(async (content) => {
    setRejectTarget(content);
    setSelectedReasons([]);
    setOtherReason("");
    setRejectNote("");
    setRejectError("");
    try {
      const reasons = await moderationService.getRejectionReasons();
      setRejectionReasons(reasons);
    } catch (err) {
      console.error("[Get Rejection Reasons error]:", err);
      setRejectionReasons([
        { code: "IMAGE_NOT_RELEVANT", label: "Ảnh không phù hợp với nội dung" },
        { code: "INACCURATE_INFORMATION", label: "Thông tin chưa chính xác" },
        { code: "INAPPROPRIATE_CONTENT", label: "Nội dung không phù hợp" },
        { code: "COPYRIGHT_VIOLATION", label: "Vi phạm bản quyền" },
        { code: "INCOMPLETE_CONTENT", label: "Nội dung chưa đầy đủ" },
        { code: "DUPLICATE_CONTENT", label: "Nội dung bị trùng lặp" },
        { code: "OTHER", label: "Lý do khác" },
      ]);
    }
  }, []);

  const handleToggleReason = useCallback((code) => {
    setSelectedReasons((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }, []);

  const handleConfirmRejectContent = useCallback(async () => {
    if (!rejectTarget) return;
    if (selectedReasons.length === 0) {
      setRejectError("Vui lòng chọn ít nhất một lý do từ chối.");
      return;
    }
    if (selectedReasons.includes("OTHER") && !otherReason.trim()) {
      setRejectError("Khi chọn 'Lý do khác', bạn bắt buộc phải nhập mô tả chi tiết.");
      return;
    }
    setIsRejectingContent(true);
    setRejectError("");
    try {
      await moderationService.rejectContent(rejectTarget.id, {
        reason: selectedReasons.join(","),
        otherReason: otherReason.trim(),
        note: rejectNote.trim(),
      });
      showContentToast(`Đã gửi phản hồi từ chối bài thuyết minh "${rejectTarget.title}".`);
      setRejectTarget(null);
      await loadCulturalContents();
    } catch (err) {
      console.error("[Reject Content error]:", err);
      setRejectError(err?.message || "Không thể từ chối nội dung này.");
    } finally {
      setIsRejectingContent(false);
    }
  }, [rejectTarget, selectedReasons, otherReason, rejectNote, loadCulturalContents, showContentToast]);

  const handleOpenContentHistory = useCallback(async (content) => {
    setHistoryTarget(content);
    setHistoryLoading(true);
    setHistoryError("");
    setHistoryData(null);
    try {
      const data = await moderationService.getContentHistory(content.id);
      setHistoryData(data);
    } catch (err) {
      console.error("[Content History error]:", err);
      setHistoryError(err?.message || "Chưa có lịch sử thẩm định cho bài viết này.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Dữ liệu gói trải nghiệm của điểm đến
  const [experience, setExperience] = useState(null);
  const [expLoading, setExpLoading] = useState(false);
  const [expError, setExpError] = useState("");
  const [expTasks, setExpTasks] = useState([]);
  const [expCheckIns, setExpCheckIns] = useState([]);
  const [expSlots, setExpSlots] = useState([]);
  const [expDescExpanded, setExpDescExpanded] = useState(false);

  // Tải thông tin gói trải nghiệm (vé, nhiệm vụ, check-in, slots)
  const loadExperienceData = useCallback(async () => {
    if (!destId) return;
    setExpLoading(true);
    setExpError("");
    try {
      const exp = await experienceService.getByDestinationId(destId);
      setExperience(exp);
      if (exp?.id) {
        const [tasksRes, checkInsRes, slotsRes] = await Promise.allSettled([
          taskService.listByExperience(exp.id),
          checkInPointService.listByExperience(exp.id),
          slotService.listByExperience(exp.id),
        ]);
        setExpTasks(
          tasksRes.status === "fulfilled" && Array.isArray(tasksRes.value)
            ? tasksRes.value
            : []
        );
        setExpCheckIns(
          checkInsRes.status === "fulfilled" && Array.isArray(checkInsRes.value)
            ? checkInsRes.value
            : []
        );
        setExpSlots(
          slotsRes.status === "fulfilled" && Array.isArray(slotsRes.value)
            ? slotsRes.value
            : []
        );
      } else {
        setExpTasks([]);
        setExpCheckIns([]);
        setExpSlots([]);
      }
    } catch (err) {
      console.error("[AssessmentModal] Failed to load experience:", err);
      setExpError(err?.message || "Không thể tải gói trải nghiệm.");
      setExperience(null);
      setExpTasks([]);
      setExpCheckIns([]);
      setExpSlots([]);
    } finally {
      setExpLoading(false);
    }
  }, [destId]);

  useEffect(() => {
    if (!isOpen || !destId) return;
    let cancelled = false;
    const currentAudio = audioRef.current;
    queueMicrotask(() => {
      if (!cancelled) {
        setActiveTab("general");
        setPlayingId(null);
        setReviewedItems({});
        setExpandedScriptIds({});
        setExpDescExpanded(false);
        loadCulturalContents();
        loadExperienceData();
      }
    });
    return () => {
      cancelled = true;
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, [isOpen, destId, loadCulturalContents, loadExperienceData]);

  // Khóa cuộn trang nền khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Thao tác nghe / xem thử media (Hỗ trợ YouTube, Video MP4 và Audio MP3)
  const handleTogglePlay = async (content) => {
    const rawUrl = content.mediaUrl || "";
    const ytUrl = getYouTubeEmbedUrl(rawUrl);
    const isVid = content.contentType === "VIDEO" || isDirectVideoUrl(rawUrl) || Boolean(ytUrl);

    // Nếu là video hoặc link YouTube, mở trình phát video chuyên dụng (iframe YouTube / video HTML5)
    if (isVid) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingId(null);

      try {
        await culturalContentService.play(content.id);
        setContents((prev) =>
          prev.map((c) =>
            c.id === content.id ? { ...c, playCount: (c.playCount || 0) + 1 } : c
          )
        );
      } catch (err) {
        console.warn("[Play count update]:", err);
      }

      setPreviewMediaTarget(content);
      return;
    }

    // Nếu là audio thông thường
    if (playingId === content.id) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingId(null);
      return;
    }

    try {
      const res = await culturalContentService.play(content.id);
      setPlayingId(content.id);

      setContents((prev) =>
        prev.map((c) =>
          c.id === content.id ? { ...c, playCount: (c.playCount || 0) + 1 } : c
        )
      );

      const url = res?.mediaUrl || content.mediaUrl;
      if (url && audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch((err) => {
          console.warn("[Assessment Playback] playback error:", err);
          setPreviewMediaTarget(content);
        });
      }
    } catch (err) {
      console.error("[Assessment Playback] error:", err);
    }
  };

  const toggleExpandScript = (id) => {
    setExpandedScriptIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyScript = (id, text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedScriptId(id);
    setTimeout(() => setCopiedScriptId(null), 2000);
  };

  const toggleReviewCheck = (id) => {
    setReviewedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Thống kê nhanh hồ sơ thuyết minh
  const stats = useMemo(() => {
    const totalCount = contents.length;
    const totalDuration = contents.reduce(
      (acc, c) => acc + (Number(c.duration) || 0),
      0
    );
    const audioCount = contents.filter((c) => c.contentType === "AUDIO").length;
    const videoCount = contents.filter((c) => c.contentType === "VIDEO").length;
    const storyCount = contents.filter(
      (c) => c.contentType === "STORY" || c.contentType === "ARTICLE"
    ).length;
    return {
      totalCount,
      totalDuration,
      audioCount,
      videoCount,
      storyCount,
    };
  }, [contents]);

  if (!isOpen || (!destination && !isLoading && !error)) return null;

  const isApproved = destination?.approved === true || destination?.status === "approved";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Thẻ audio ẩn phát bài thuyết minh */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingId(null)}
        onError={() => setPlayingId(null)}
        className="hidden"
      />

      {/* Double-Bezel Container */}
      <div
        className="w-full max-w-3xl p-1.5 sm:p-2 bg-slate-900/10 dark:bg-white/10 rounded-[2.25rem] ring-1 ring-slate-900/15 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-[2rem] overflow-hidden flex flex-col h-[720px] max-h-[92vh] border border-slate-200/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
          {/* ========================================================
              HEADER MODAL
              ======================================================== */}
          <div className="shrink-0 px-6 sm:px-8 py-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-amber-50/40">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-mono text-[11px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                  #{destination?.id ?? "—"}
                </span>

                {isApproved ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Đã phê duyệt &amp; Phát hành
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Chờ thẩm định nội dung
                  </span>
                )}

                <span className="text-slate-300">&bull;</span>
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <ShieldCheck size={13} className="text-indigo-600" />
                  Hội đồng Thẩm định Di sản
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight truncate">
                {destination?.name || "Chi tiết Hồ sơ Điểm đến"}
              </h3>

              {destination?.address && (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                  <MapPin size={12} className="text-emerald-600 shrink-0" />
                  <span className="truncate">{destination.address}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Đóng modal"
            >
              <X size={16} />
            </button>
          </div>

          {/* ========================================================
              TAB NAVIGATION: THỰC ĐỊA & HỒ SƠ THUYẾT MINH
              ======================================================== */}
          <div className="shrink-0 px-6 sm:px-8 border-b border-slate-100 bg-white flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`py-3.5 px-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "general"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Navigation size={14} />
              <span>Tọa độ Thực địa &amp; Sức chứa</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("contents")}
              className={`py-3.5 px-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "contents"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Headphones size={14} />
              <span>Hồ sơ Thuyết minh &amp; Văn hóa</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === "contents"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {contentsLoading ? "…" : contents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("experience")}
              className={`py-3.5 px-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "experience"
                  ? "border-amber-600 text-amber-700"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Compass size={14} />
              <span>Gói Trải Nghiệm &amp; Đố Vui</span>
              {experience ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              ) : expLoading ? (
                <span className="text-[10px] text-slate-400">…</span>
              ) : null}
            </button>
          </div>

          {/* ========================================================
              MODAL BODY (Scrollable Viewport)
              ======================================================== */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 py-5 bg-slate-50/50 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={32} className="animate-spin text-emerald-600" />
                <p className="text-xs font-bold text-slate-600">
                  Đang tải hồ sơ điểm đến di sản…
                </p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black">Lỗi tải dữ liệu</h4>
                  <p className="text-xs mt-0.5">{error}</p>
                </div>
              </div>
            ) : activeTab === "general" ? (
              /* ── TAB 1: THÔNG SỐ THỰC ĐỊA & SỨC CHỨA ── */
              <div className="space-y-4">
                <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs">
                  <p className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MapPin size={12} className="text-emerald-600" />
                    Địa chỉ hành chính thực địa
                  </p>
                  <p className="text-sm font-bold text-slate-800 leading-relaxed">
                    {destination?.address || "Chưa cập nhật địa chỉ"}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tọa độ GPS */}
                  <div className="rounded-2xl bg-sky-50/80 border border-sky-200/90 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10.5px] font-black text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Navigation size={12} /> Tọa độ GPS Thực tế
                      </p>
                      {destination?.latitude && destination?.longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${destination.latitude},${destination.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10.5px] font-bold text-sky-700 hover:text-sky-900 underline flex items-center gap-1"
                        >
                          <span>Mở Maps</span>
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between items-center py-1 border-b border-sky-100">
                        <span className="text-slate-500">Vĩ độ (LAT):</span>
                        <span className="font-black text-slate-900">
                          {destination?.latitude?.toFixed(6) ?? "—"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">Kinh độ (LNG):</span>
                        <span className="font-black text-slate-900">
                          {destination?.longitude?.toFixed(6) ?? "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sức chứa */}
                  <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200/90 p-4 flex flex-col justify-between">
                    <p className="text-[10.5px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Users size={12} /> Sức chứa đón tiếp tối đa
                    </p>
                    <div className="mt-auto">
                      <span className="text-2xl font-black text-slate-900">
                        {destination?.capacity
                          ? Number(destination.capacity).toLocaleString("vi-VN")
                          : "—"}
                      </span>
                      <span className="text-xs font-bold text-slate-500 ml-1.5">
                        du khách / lượt
                      </span>
                    </div>
                  </div>

                  {/* Đơn vị khởi tạo */}
                  <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs">
                    <p className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Building2 size={12} /> Đơn vị / Đối tác phụ trách
                    </p>
                    <p className="text-xs font-bold text-slate-800">
                      {destination?.createdBy || "Hệ thống quản trị"}
                    </p>
                  </div>

                  {/* Ngày gửi hồ sơ */}
                  <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs">
                    <p className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Clock size={12} /> Thời gian lập hồ sơ
                    </p>
                    <p className="text-xs font-bold text-slate-800 font-mono">
                      {destination?.createdAt
                        ? new Date(destination.createdAt).toLocaleString("vi-VN")
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Gợi ý thẩm định */}
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                  <ShieldCheck size={16} className="text-amber-700 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Lưu ý thẩm định:</strong> Hãy chuyển sang tab <strong>&ldquo;Hồ sơ Thuyết minh &amp; Văn hóa&rdquo;</strong> để kiểm tra các file giọng đọc Audio, phim tư liệu và kịch bản di tích trước khi đưa ra quyết định phê duyệt.
                  </p>
                </div>
              </div>
            ) : activeTab === "contents" ? (
              /* ── TAB 2: HỒ SƠ THUYẾT MINH & VĂN HÓA ── */
              <div className="space-y-4">
                {/* Banner tóm tắt thẩm định */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 uppercase tracking-wider">
                        Thẩm định Thuyết minh Đa phương tiện
                      </span>
                      <span className="text-xs text-indigo-300">
                        {stats.totalCount} tư liệu
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1 max-w-lg leading-relaxed">
                      Nghe thử audio thuyết minh để rà soát bản quyền, tính chính xác lịch sử và độ rõ ràng của giọng dẫn trước khi cho phép xuất bản tới du khách.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">
                      <span className="block text-[10px] uppercase font-bold text-slate-300">
                        Thời lượng
                      </span>
                      <span className="font-mono text-xs font-black text-emerald-300">
                        {formatDuration(stats.totalDuration)}
                      </span>
                    </div>
                    <div className="text-center px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">
                      <span className="block text-[10px] uppercase font-bold text-slate-300">
                        Loại Audio
                      </span>
                      <span className="font-mono text-xs font-black text-amber-300">
                        {stats.audioCount} bản
                      </span>
                    </div>
                  </div>
                </div>

                {contentsLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 size={28} className="animate-spin text-indigo-600" />
                    <p className="text-xs font-bold">Đang tải các bài thuyết minh văn hóa…</p>
                  </div>
                ) : contentsError ? (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-3">
                    <span>{contentsError}</span>
                    <button
                      type="button"
                      onClick={loadCulturalContents}
                      className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg text-xs"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : contents.length === 0 ? (
                  <div className="py-14 text-center bg-white rounded-2xl border border-slate-200/90 p-6 space-y-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Headphones size={24} />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      Chưa có hồ sơ thuyết minh văn hóa
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Điểm đến này chưa có bản ghi âm thuyết minh hoặc câu chuyện di sản nào do Đối tác đính kèm. Bạn có thể phê duyệt trước để đối tác cập nhật sau.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contents.map((item) => {
                      const typeCfg =
                        CONTENT_TYPES.find((ct) => ct.type === item.contentType) ||
                        CONTENT_TYPES[0];
                      const Icon = typeCfg.icon;
                      const isPlaying = playingId === item.id;
                      const isExpanded = Boolean(expandedScriptIds[item.id]);
                      const isReviewed = Boolean(reviewedItems[item.id]);

                      return (
                        <div
                          key={item.id}
                          className={`bg-white rounded-2xl p-4 border transition-all shadow-2xs ${
                            isPlaying
                              ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20"
                              : isReviewed
                              ? "border-emerald-300 bg-emerald-50/20"
                              : "border-slate-200/90 hover:border-slate-300"
                          }`}
                        >
                          {/* Hàng 1: Thứ tự + Badge + Lượt nghe + Trạng thái đã xem */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono font-black text-xs flex items-center justify-center shrink-0 border border-slate-200">
                                #{item.sequenceOrder ?? 0}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${typeCfg.badgeClass}`}
                              >
                                <Icon size={11} />
                                <span>{typeCfg.label}</span>
                              </span>
                              {item.duration && (
                                <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                                  <Clock size={11} className="text-slate-400" />
                                  {formatDuration(item.duration)}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                                title="Lượt nghe của du khách"
                              >
                                <Volume2 size={11} className="text-indigo-600" />
                                <span>{item.playCount || 0} lượt nghe</span>
                              </span>

                              {/* Nút hành động Thẩm định từ Ban Thẩm định */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenApproveContent(item)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 active:scale-95 shadow-2xs"
                                  title="Phê duyệt bài thuyết minh này"
                                >
                                  <CheckCircle2 size={12} className="text-emerald-600" />
                                  <span>Duyệt</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectContent(item)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 active:scale-95 shadow-2xs"
                                  title="Từ chối và yêu cầu đính chính"
                                >
                                  <XCircle size={12} className="text-rose-600" />
                                  <span>Từ chối</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenContentHistory(item)}
                                  className="p-1 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 transition-colors cursor-pointer"
                                  title="Xem lịch sử kiểm duyệt của bài này"
                                >
                                  <History size={13} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Tiêu đề & Tóm tắt */}
                          <div className="mt-2.5">
                            <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                              {item.title}
                            </h4>
                            {item.description && (
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </div>

                          {/* Bộ điều khiển Nghe thử Trực tiếp */}
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              {item.mediaUrl ? (
                                (() => {
                                  const ytEmbed = getYouTubeEmbedUrl(item.mediaUrl);
                                  const isVideo =
                                    item.contentType === "VIDEO" ||
                                    isDirectVideoUrl(item.mediaUrl) ||
                                    Boolean(ytEmbed);

                                  return (
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePlay(item)}
                                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                                        isPlaying
                                          ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                                          : isVideo
                                          ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                                          : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                      }`}
                                      title={
                                        isPlaying
                                          ? "Tạm dừng"
                                          : isVideo
                                          ? "Xem video tư liệu / YouTube trực tiếp"
                                          : "Nghe thử file âm thanh"
                                      }
                                    >
                                      {isPlaying ? (
                                        <>
                                          <Pause size={13} />
                                          <span>Tạm dừng</span>
                                        </>
                                      ) : isVideo ? (
                                        <>
                                          <Video size={13} className="text-rose-600" />
                                          <span>Xem video (/play)</span>
                                        </>
                                      ) : (
                                        <>
                                          <Play size={13} fill="currentColor" />
                                          <span>Nghe thử (/play)</span>
                                        </>
                                      )}
                                    </button>
                                  );
                                })()
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  Chưa đính kèm đường dẫn media
                                </span>
                              )}

                              {item.mediaUrl && (
                                <a
                                  href={item.mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 p-1"
                                  title="Mở tệp media CDN trong tab mới"
                                >
                                  <span>Mở link CDN</span>
                                  <ExternalLink size={10} />
                                </a>
                              )}
                            </div>

                            {/* Nút xem toàn văn kịch bản */}
                            {item.contentText && (
                              <button
                                type="button"
                                onClick={() => toggleExpandScript(item.id)}
                                className="text-xs font-bold text-slate-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                              >
                                <span>{isExpanded ? "Thu gọn kịch bản" : "Xem kịch bản lời dẫn"}</span>
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            )}
                          </div>

                          {/* Khung toàn văn kịch bản (Script / Content text) */}
                          {item.contentText && isExpanded && (
                            <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200/80">
                                <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                                  Toàn văn kịch bản thuyết minh
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyScript(item.id, item.contentText)}
                                  className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedScriptId === item.id ? (
                                    <>
                                      <Check size={11} />
                                      <span>Đã sao chép</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={11} />
                                      <span>Sao chép</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-normal">
                                {item.contentText}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : activeTab === "experience" ? (
              /* ── TAB 3: GÓI TRẢI NGHIỆM & ĐỐ VUI ── */
              <div className="space-y-4">
                {expLoading ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 size={32} className="animate-spin text-amber-600" />
                    <p className="text-xs font-bold text-slate-600">
                      Đang tải thông tin gói trải nghiệm &amp; đố vui…
                    </p>
                  </div>
                ) : expError ? (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black">Lỗi tải gói trải nghiệm</h4>
                      <p className="text-xs mt-0.5">{expError}</p>
                    </div>
                  </div>
                ) : !experience ? (
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-3 shadow-2xs">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                      <Inbox size={24} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Điểm đến chưa thiết lập gói trải nghiệm
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      Đối tác chưa thiết lập gói vé tham quan, nhiệm vụ thực địa hoặc câu hỏi đố vui cho di tích này. Gói trải nghiệm sẽ tự động kích hoạt khi đối tác khởi tạo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Thẻ tổng quan gói trải nghiệm */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Gói Trải Nghiệm Thực Địa
                            </p>
                          </div>
                          <h4 className="text-base font-bold text-slate-900 mt-1">
                            {experience.title}
                          </h4>
                          {experience.description && (
                            <div className="mt-1">
                              <p
                                className={`text-xs text-slate-600 leading-relaxed whitespace-pre-line ${
                                  !expDescExpanded ? "line-clamp-2" : ""
                                }`}
                              >
                                {experience.description}
                              </p>
                              {(experience.description.length > 90 ||
                                experience.description.includes("\n")) && (
                                <button
                                  type="button"
                                  onClick={() => setExpDescExpanded((prev) => !prev)}
                                  className="mt-1 text-[11.5px] font-bold text-amber-700 hover:text-amber-800 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <span>
                                    {expDescExpanded
                                      ? "Thu gọn văn bản"
                                      : "Xem toàn bộ văn bản"}
                                  </span>
                                  {expDescExpanded ? (
                                    <ChevronUp size={12} />
                                  ) : (
                                    <ChevronDown size={12} />
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3 chỉ số tài chính & quy mô */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
                          <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                            <Banknote size={12} className="text-emerald-600" />
                            Giá vé tham quan
                          </p>
                          <p className="text-base font-extrabold text-slate-900">
                            {Number(experience.price).toLocaleString("vi-VN")}{" "}
                            <span className="text-xs font-semibold text-slate-500">
                              {experience.currency || "VND"}
                            </span>
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
                          <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                            <Clock size={12} className="text-sky-600" />
                            Thời lượng trải nghiệm
                          </p>
                          <p className="text-base font-extrabold text-slate-900">
                            {experience.durationMinutes
                              ? `${experience.durationMinutes} phút`
                              : "Chưa đặt"}
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
                          <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                            <Trophy size={12} className="text-amber-600" />
                            Nhiệm vụ &amp; Đố vui
                          </p>
                          <p className="text-base font-extrabold text-slate-900">
                            {expTasks.length}{" "}
                            <span className="text-xs font-semibold text-slate-500">
                              nhiệm vụ
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Danh sách nhiệm vụ và câu hỏi đố vui */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Trophy size={16} className="text-amber-600" />
                          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Nhiệm Vụ &amp; Câu Hỏi Đố Vui ({expTasks.length})
                          </h5>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Sắp xếp theo thứ tự thực địa
                        </span>
                      </div>

                      {expTasks.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3 text-center italic">
                          Chưa có nhiệm vụ hoặc câu hỏi đố vui nào được thiết lập.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {expTasks.map((t, idx) => (
                            <div
                              key={t.id || idx}
                              className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 text-xs"
                            >
                              <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0 font-mono">
                                {t.sequenceOrder !== undefined ? t.sequenceOrder + 1 : idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900">
                                    {t.name || t.title || "Nhiệm vụ không tên"}
                                  </span>
                                  {t.typeName && (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                      {t.typeName}
                                    </span>
                                  )}
                                  {t.pointsReward > 0 && (
                                    <span className="text-[10.5px] font-bold text-emerald-700">
                                      +{t.pointsReward} điểm
                                    </span>
                                  )}
                                </div>
                                {t.prompt && (
                                  <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
                                    {t.prompt}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Trạm check-in và Khung giờ đón tiếp */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Trạm check-in */}
                      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2.5">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                          <MapPin size={14} className="text-emerald-600" />
                          <h6 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Trạm Check-in Thực Địa ({expCheckIns.length})
                          </h6>
                        </div>
                        {expCheckIns.length === 0 ? (
                          <p className="text-xs text-slate-400 py-3 text-center italic">
                            Chưa có trạm check-in nào.
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {expCheckIns.map((cip, i) => (
                              <div
                                key={cip.id || i}
                                className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-xs flex items-center justify-between gap-2"
                              >
                                <span className="font-bold text-slate-800 truncate">
                                  {cip.name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 shrink-0 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  Bán kính: {cip.radiusMeters || 50}m
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Khung giờ đón tiếp (Slots) */}
                      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2.5">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                          <Calendar size={14} className="text-sky-600" />
                          <h6 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Khung Giờ Đón Tiếp ({expSlots.length})
                          </h6>
                        </div>
                        {expSlots.length === 0 ? (
                          <p className="text-xs text-slate-400 py-3 text-center italic">
                            Chưa cấu hình khung giờ đón tiếp.
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {expSlots.map((s, i) => (
                              <div
                                key={s.id || i}
                                className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-xs flex items-center justify-between gap-2"
                              >
                                <span className="font-bold text-slate-800 font-mono">
                                  {s.slotDate}
                                </span>
                                <span className="text-[10px] text-slate-500 shrink-0 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-semibold">
                                  Tối đa: {s.maxTourPerDay} lượt
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* ========================================================
              FOOTER MODAL (Action Buttons)
              ======================================================== */}
          <div className="shrink-0 px-6 sm:px-8 py-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/80">
            <div className="text-xs text-slate-500 hidden sm:block">
              {activeTab === "contents" && contents.length > 0 && (
                <span>
                  Đã xem:{" "}
                  <strong>
                    {Object.values(reviewedItems).filter(Boolean).length}/
                    {contents.length}
                  </strong>{" "}
                  tư liệu
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(destination)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  <Edit3 size={13} />
                  <span>Sửa thông tin</span>
                </button>
              )}

              {destination && !isApproved && onApprove && (
                <button
                  type="button"
                  onClick={() => onApprove(destination.id, true, destination.name)}
                  disabled={isActionLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Phê duyệt điểm đến và phát hành cho du khách"
                >
                  {isActionLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  <span>Phê duyệt điểm đến</span>
                </button>
              )}

              {destination && isApproved && onApprove && (
                <button
                  type="button"
                  onClick={() => onApprove(destination.id, false, destination.name)}
                  disabled={isActionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Thu hồi phê duyệt và đưa về trạng thái chờ thẩm định"
                >
                  {isActionLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Ban size={14} />
                  )}
                  <span>Hủy phê duyệt</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* POP-UP TRÌNH PHÁT MEDIA CHUYÊN DỤNG (YOUTUBE / VIDEO / AUDIO) */}
      {previewMediaTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-90 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setPreviewMediaTarget(null)}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200/90 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Trình phát */}
            <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
                  {getYouTubeEmbedUrl(previewMediaTarget.mediaUrl) ||
                  previewMediaTarget.contentType === "VIDEO" ? (
                    <Video size={16} />
                  ) : (
                    <Headphones size={16} />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-900 truncate">
                    {previewMediaTarget.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/70">
                      #{previewMediaTarget.sequenceOrder || 1}
                    </span>
                    <span>{previewMediaTarget.playCount || 0} lượt xem/nghe</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewMediaTarget(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Đóng trình phát"
              >
                <X size={16} />
              </button>
            </div>

            {/* Player Frame: YouTube iFrame hoặc Video Player */}
            <div className="p-4 sm:p-6 bg-slate-950 flex items-center justify-center overflow-hidden">
              {getYouTubeEmbedUrl(previewMediaTarget.mediaUrl) ? (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
                  <iframe
                    src={getYouTubeEmbedUrl(previewMediaTarget.mediaUrl)}
                    title={previewMediaTarget.title}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : isDirectVideoUrl(previewMediaTarget.mediaUrl) ? (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
                  <video
                    src={previewMediaTarget.mediaUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full py-8 px-6 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white flex flex-col items-center gap-4 text-center border border-white/10">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/20">
                    <Headphones size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{previewMediaTarget.title}</p>
                    <p className="text-xs text-slate-400 mt-1">Trình phát audio di sản</p>
                  </div>
                  <audio
                    src={previewMediaTarget.mediaUrl}
                    controls
                    autoPlay
                    className="w-full max-w-md mt-2"
                  />
                </div>
              )}
            </div>

            {/* Thông tin mô tả & Kịch bản */}
            <div className="p-5 sm:p-6 overflow-y-auto max-h-[30vh] bg-white space-y-3">
              {previewMediaTarget.description && (
                <div>
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Tóm tắt dẫn nhập
                  </h5>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {previewMediaTarget.description}
                  </p>
                </div>
              )}

              {previewMediaTarget.contentText && (
                <div>
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Kịch bản / Lời bình chi tiết
                  </h5>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed whitespace-pre-wrap">
                    {previewMediaTarget.contentText}
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                <a
                  href={previewMediaTarget.mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5"
                >
                  <span>Mở liên kết media trong tab mới</span>
                  <ExternalLink size={12} />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewMediaTarget(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TOAST THÔNG BÁO THẨM ĐỊNH CONTENT
          ======================================================== */}
      {contentToast && (
        <div className="fixed top-5 right-5 z-100 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 max-w-md animate-in slide-in-from-top-3">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{contentToast}</span>
        </div>
      )}

      {/* ========================================================
          MODAL 1: PHÊ DUYỆT BÀI THUYẾT MINH
          ======================================================== */}
      {approveTarget && (
        <div
          className="fixed inset-0 z-95 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setApproveTarget(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Phê duyệt bài thuyết minh?
                </h4>
                <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">
                  {approveTarget.title}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Nội dung này sẽ được đánh dấu đã thẩm định chuẩn xác và hiển thị chính thức cho du khách thưởng thức trên ứng dụng.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Ghi chú phê duyệt (không bắt buộc)
              </label>
              <textarea
                rows={2}
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="VD: Giọng đọc truyền cảm, tư liệu lịch sử chính xác..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isApprovingContent}
                onClick={handleConfirmApproveContent}
                className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isApprovingContent && <Loader2 size={13} className="animate-spin" />}
                <span>Xác nhận phê duyệt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: TỪ CHỐI BÀI THUYẾT MINH (TICKBOX LÝ DO CHUẨN)
          ======================================================== */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-95 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setRejectTarget(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                  <XCircle size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    Từ chối tiếp nhận bài thuyết minh
                  </h4>
                  <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">
                    {rejectTarget.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 [scrollbar-width:thin]">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Chọn các lý do từ chối (có thể chọn nhiều):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {rejectionReasons.map((r) => {
                    const isChecked = selectedReasons.includes(r.code);
                    return (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => handleToggleReason(r.code)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          isChecked
                            ? "bg-rose-50 border-rose-300 text-rose-800 shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? "bg-rose-600 border-rose-600 text-white"
                              : "bg-white border-slate-300"
                          }`}
                        >
                          {isChecked && <Check size={11} strokeWidth={3} />}
                        </div>
                        <span className="leading-snug">{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedReasons.includes("OTHER") && (
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-rose-700 block">
                    Mô tả chi tiết lý do khác (Bắt buộc khi chọn &quot;Lý do khác&quot;):
                  </label>
                  <input
                    type="text"
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="VD: Âm thanh bị rè, sai lệch niên đại khởi dựng..."
                    className="w-full px-3 py-2 text-xs bg-rose-50/50 border border-rose-200 rounded-xl outline-hidden focus:bg-white focus:border-rose-500 transition-all font-medium"
                  />
                </div>
              )}

              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Ý kiến thẩm định &amp; Hướng dẫn chỉnh sửa gửi Đối tác:
                </label>
                <textarea
                  rows={3}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Ghi rõ yêu cầu hiệu đính để Đối tác nắm và chỉnh sửa lại kịp thời..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-indigo-500 transition-all leading-relaxed"
                />
              </div>

              {rejectError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{rejectError}</span>
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isRejectingContent}
                onClick={handleConfirmRejectContent}
                className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm shadow-rose-600/20"
              >
                {isRejectingContent && <Loader2 size={13} className="animate-spin" />}
                <span>Gửi từ chối hồ sơ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: XEM LỊCH SỬ KIỂM DUYỆT BÀI THUYẾT MINH
          ======================================================== */}
      {historyTarget && (
        <div
          className="fixed inset-0 z-95 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setHistoryTarget(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
                  <History size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    Lịch sử thẩm định thuyết minh
                  </h4>
                  <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">
                    {historyTarget.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 [scrollbar-width:thin]">
              {historyLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 size={24} className="animate-spin text-indigo-600" />
                  <p className="text-xs font-bold">Đang tải lịch sử kiểm duyệt...</p>
                </div>
              ) : historyError ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-amber-600" />
                    <span>Chưa có biên bản thẩm định</span>
                  </p>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Bài viết này chưa trải qua quy trình kiểm duyệt hoặc chưa được gửi thẩm định.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Trạng thái:</span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
                        historyData?.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : historyData?.status === "REJECTED"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          historyData?.status === "APPROVED"
                            ? "bg-emerald-500"
                            : historyData?.status === "REJECTED"
                            ? "bg-rose-500"
                            : "bg-amber-500 animate-pulse"
                        }`}
                      />
                      <span>
                        {historyData?.status === "APPROVED"
                          ? "Đã phê duyệt"
                          : historyData?.status === "REJECTED"
                          ? "Bị từ chối"
                          : "Chờ kiểm duyệt"}
                      </span>
                    </span>
                  </div>

                  {historyData?.status === "REJECTED" && (historyData.reason || historyData.decisionNote) && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                        <AlertTriangle size={14} className="text-rose-600" />
                        <span>Lý do từ chối:</span>
                      </div>
                      {historyData.reason && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {historyData.reason.split(",").map((code) => (
                            <span
                              key={code}
                              className="px-2 py-0.5 rounded-lg bg-white border border-rose-200 text-rose-700 font-semibold text-[11px]"
                            >
                              {code.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                      {historyData.otherReason && (
                        <p className="text-xs text-rose-800 bg-white/80 p-2 rounded-lg border border-rose-150 leading-relaxed font-medium">
                          <span className="font-bold">Lý do khác:</span> {historyData.otherReason}
                        </p>
                      )}
                      {historyData.decisionNote && (
                        <p className="text-xs text-slate-700 italic">
                          &ldquo;{historyData.decisionNote}&rdquo;
                        </p>
                      )}
                    </div>
                  )}

                  {Array.isArray(historyData?.history) && historyData.history.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Dòng thời gian sự kiện
                      </h5>
                      <div className="space-y-2">
                        {historyData.history.map((evt, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">
                                {evt.action === "SUBMITTED"
                                  ? "Đã gửi hồ sơ thẩm định"
                                  : evt.action === "APPROVED"
                                  ? "Đã duyệt và xuất bản"
                                  : "Đã từ chối hồ sơ"}
                              </span>
                              <span className="text-[10.5px] font-mono text-slate-400">
                                {evt.createdAt ? new Date(evt.createdAt).toLocaleString("vi-VN") : "—"}
                              </span>
                            </div>
                            {evt.actorName && (
                              <p className="text-[11px] text-slate-500">
                                Thực hiện bởi: <strong className="text-slate-700">{evt.actorName}</strong>
                              </p>
                            )}
                            {evt.note && (
                              <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-150 mt-1">
                                {evt.note}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
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
