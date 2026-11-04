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
  ChevronLeft,
  ChevronRight,
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
import { destinationService } from "../services/destinationService";
import { experienceService } from "@/features/experience/services/experienceService";
import { taskService } from "@/features/experience/services/taskService";
import { slotService } from "@/features/experience/services/slotService";
import BronzeDrumMotif from "@/components/ui/BronzeDrumMotif";

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

const DEST_REASON_LABELS = {

  INACCURATE_INFORMATION: "Thông tin điểm đến chưa chính xác",
  INCOMPLETE_INFORMATION: "Thông tin điểm đến chưa đầy đủ",
  INAPPROPRIATE_DESTINATION: "Điểm đến không phù hợp với nền tảng",
  DUPLICATE_DESTINATION: "Điểm đến bị trùng lặp",
  OTHER: "Lý do khác",
};

/* Quy trình thẩm định theo bước: duyệt điểm đến → nội dung văn hóa → gói trải nghiệm → quyết định cuối */
const REVIEW_STEPS = [
  { id: "general", label: "Điểm đến", icon: MapPin },
  { id: "contents", label: "Nội dung văn hóa", icon: Headphones },
  { id: "experience", label: "Trải nghiệm", icon: Compass },
  { id: "decision", label: "Quyết định", icon: ShieldCheck },
];

/* Trạng thái duyệt riêng của gói trải nghiệm (LEGACY = dữ liệu cũ chưa qua duyệt riêng) */
const EXP_REVIEW_META = {
  PENDING: { label: "Chờ duyệt", short: "Chờ duyệt", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  APPROVED: { label: "Đã duyệt", short: "Đã duyệt", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Bị từ chối", short: "Từ chối", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  LEGACY: { label: "Chưa duyệt riêng", short: "Chưa duyệt", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

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
  onCompleted,
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
  // Bản sao dạng state của phần tử <audio> để hàm xử lý dùng mà không đọc ref
  const [audioEl, setAudioEl] = useState(null);

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
      const data = await culturalContentService.getManageByDestination(destId);
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

  /*
   * Kết quả thẩm định NHÁP theo từng bước: chọn Duyệt / Không duyệt ở bước 2, 3 chỉ ghi lại tại đây,
   * tới bước 4 mới gửi tất cả lên máy chủ trong một lần xác nhận.
   *  - contentDecisions: { [contentId]: { approve, reason, otherReason, note } }
   *  - expDecision:      { approve, note } | null
   *  - destDecision:     { approve, reasons: [], otherReason, note } | null
   */
  const [contentDecisions, setContentDecisions] = useState({});
  const [expDecision, setExpDecision] = useState(null);
  const [destDecision, setDestDecision] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleOpenApproveContent = useCallback((content) => {
    setContentDecisions((prev) => ({ ...prev, [content.id]: { approve: true } }));
  }, []);

  const clearContentDecision = useCallback((contentId) => {
    setContentDecisions((prev) => {
      const next = { ...prev };
      delete next[contentId];
      return next;
    });
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
      setApproveTarget(null);
      loadCulturalContents();
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
    // Chỉ ghi lại kết quả "Không duyệt"; gửi lên máy chủ ở bước 4
    setRejectError("");
    setContentDecisions((prev) => ({
      ...prev,
      [rejectTarget.id]: {
        approve: false,
        reason: selectedReasons.join(","),
        otherReason: otherReason.trim(),
        note: rejectNote.trim(),
        reasonLabels: selectedReasons.map(
          (code) => rejectionReasons.find((r) => r.code === code)?.label || code
        ),
      },
    }));
    setRejectTarget(null);
  }, [rejectTarget, selectedReasons, otherReason, rejectNote, rejectionReasons]);

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
  const [expSlots, setExpSlots] = useState([]);
  const [expDescExpanded, setExpDescExpanded] = useState(false);

  // Duyệt riêng gói trải nghiệm (bước 3)
  const [expRejecting, setExpRejecting] = useState(false);
  const [expNote, setExpNote] = useState("");
  const [expNoteError, setExpNoteError] = useState("");

  // Ghi lại kết quả Duyệt / Không duyệt cho gói trải nghiệm (gửi ở bước 4)
  const handleExperienceDecision = useCallback(
    (approve) => {
      if (!experience?.id) return;
      if (!approve && !expNote.trim()) {
        setExpNoteError("Vui lòng nhập lý do để đối tác biết cần sửa gì.");
        return;
      }
      setExpDecision(approve ? { approve: true } : { approve: false, note: expNote.trim() });
      setExpRejecting(false);
      setExpNoteError("");
    },
    [experience, expNote]
  );

  /* Bước 4: gửi lần lượt kết quả nội dung → trải nghiệm → điểm đến (điểm đến sau cùng để
     khi phê duyệt, các trải nghiệm đã duyệt được phát hành cùng lúc). */
  const handleSubmitAll = useCallback(async () => {
    if (!destination?.id || !destDecision) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      for (const [id, d] of Object.entries(contentDecisions)) {
        if (d.approve) await moderationService.approveContent(Number(id), d.note || null);
        else
          await moderationService.rejectContent(Number(id), {
            reason: d.reason,
            otherReason: d.otherReason,
            note: d.note,
          });
      }
      if (experience?.id && expDecision) {
        if (expDecision.approve) await moderationService.approveExperience(experience.id);
        else await moderationService.rejectExperience(experience.id, expDecision.note);
      }
      const alreadyApproved = destination.approved === true;
      if (!destDecision.approve) {
        await destinationService.setApproval(destination.id, false, {
          reason: destDecision.reasons.join(","),
          otherReason: destDecision.reasons.includes("OTHER") ? destDecision.otherReason : null,
          note: destDecision.note,
        });
      } else if (!alreadyApproved) {
        await destinationService.setApproval(destination.id, true, { note: destDecision.note });
      }
      onCompleted?.({
        destinationId: destination.id,
        approved: destDecision.approve,
        revoked: alreadyApproved && !destDecision.approve,
        name: destination.name,
      });
    } catch (err) {
      console.error("[AssessmentModal] Submit review error:", err);
      setSubmitError(
        err?.message || "Không thể gửi kết quả thẩm định. Một số mục có thể đã được lưu, vui lòng kiểm tra lại."
      );
      // Đồng bộ lại trạng thái thật để không gửi trùng mục đã lưu
      loadCulturalContents();
    } finally {
      setSubmitting(false);
    }
  }, [destination, destDecision, contentDecisions, experience, expDecision, onCompleted, loadCulturalContents]);

  // Tải thông tin gói trải nghiệm (vé, nhiệm vụ, check-in, slots)
  const loadExperienceData = useCallback(async () => {
    if (!destId) return;
    setExpLoading(true);
    setExpError("");
    try {
      const exp = await experienceService.getByDestinationId(destId);
      setExperience(exp);
      if (exp?.id) {
        const [tasksRes, slotsRes] = await Promise.allSettled([
          taskService.listByExperience(exp.id),
          slotService.listByExperience(exp.id),
        ]);
        setExpTasks(
          tasksRes.status === "fulfilled" && Array.isArray(tasksRes.value)
            ? tasksRes.value
            : []
        );
        setExpSlots(
          slotsRes.status === "fulfilled" && Array.isArray(slotsRes.value)
            ? slotsRes.value
            : []
        );
      } else {
        setExpTasks([]);
        setExpSlots([]);
      }
    } catch (err) {
      console.error("[AssessmentModal] Failed to load experience:", err);
      setExpError(err?.message || "Không thể tải gói trải nghiệm.");
      setExperience(null);
      setExpTasks([]);
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
        setExpRejecting(false);
        setExpNote("");
        setExpNoteError("");
        setContentDecisions({});
        setExpDecision(null);
        setDestDecision(null);
        setSubmitError("");
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
      if (audioEl) audioEl.pause();
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
      if (audioEl) audioEl.pause();
      setPlayingId(null);
      return;
    }

    try {
      // Bài chưa được duyệt không ghi nhận lượt nghe được, vẫn cho nghe thử để thẩm định.
      const res = await culturalContentService.play(content.id).catch(() => null);
      setPlayingId(content.id);

      setContents((prev) =>
        prev.map((c) =>
          c.id === content.id ? { ...c, playCount: (c.playCount || 0) + 1 } : c
        )
      );

      const url = res?.mediaUrl || content.mediaUrl;
      if (url && audioEl) {
        audioEl.setAttribute("src", url);
        audioEl.play().catch((err) => {
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

  const stepIndex = Math.max(0, REVIEW_STEPS.findIndex((s) => s.id === activeTab));
  const isLastStep = stepIndex === REVIEW_STEPS.length - 1;
  const goStep = (delta) => {
    const next = REVIEW_STEPS[stepIndex + delta];
    if (next) setActiveTab(next.id);
  };

  // Tổng hợp kết quả duyệt nội dung văn hóa cho thanh bước và bước Quyết định
  const contentStats = {
    approved: contents.filter((c) => c.reviewStatus === "APPROVED").length,
    rejected: contents.filter((c) => c.reviewStatus === "REJECTED").length,
    pending: contents.filter((c) => c.reviewStatus === "PENDING").length,
  };
  contentStats.decided = contentStats.approved + contentStats.rejected;
  const expReview = experience ? experience.reviewStatus || "LEGACY" : null;

  // Điều kiện qua bước: mọi nội dung đang chờ và gói trải nghiệm đang chờ đều phải có kết quả Duyệt / Không duyệt
  const pendingContents = contents.filter((c) => c.reviewStatus === "PENDING");
  const undecidedContents = pendingContents.filter((c) => !contentDecisions[c.id]).length;
  const contentsReady = !contentsLoading && undecidedContents === 0;
  const expNeedsDecision = Boolean(experience) && expReview === "PENDING";
  const expReady = !expLoading && (!expNeedsDecision || Boolean(expDecision));
  const stepReady = { general: true, contents: contentsReady, experience: expReady };
  // Chỉ mở được bước khi các bước trước đã xong
  const canReach = (idx) => REVIEW_STEPS.slice(0, idx).every((s) => stepReady[s.id] !== false);
  const canProceed = stepReady[activeTab] !== false;
  const blockReason =
    activeTab === "contents" && !contentsReady
      ? `Còn ${undecidedContents} nội dung chưa chọn Duyệt / Không duyệt`
      : activeTab === "experience" && !expReady
      ? "Chưa chọn kết quả cho gói trải nghiệm"
      : "";
  const destReady =
    Boolean(destDecision) &&
    (destDecision.approve ||
      (destDecision.reasons.length > 0 &&
        (!destDecision.reasons.includes("OTHER") || destDecision.otherReason.trim())));
  const decidedContentList = pendingContents.filter((c) => contentDecisions[c.id]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Thẻ audio ẩn phát bài thuyết minh */}
      <audio
        ref={(el) => {
          audioRef.current = el;
          setAudioEl(el);
        }}
        onEnded={() => setPlayingId(null)}
        onError={() => setPlayingId(null)}
        className="hidden"
      />

      {/* Double-Bezel Container */}
      <div
        className="w-full max-w-3xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-[#faf7f0] rounded-2xl overflow-hidden flex flex-col h-[720px] max-h-[92vh] border border-stone-200/90 shadow-2xl">
          {/* Nền trang trí: mặt trống đồng mờ phía sau nội dung */}
          <BronzeDrumMotif className="pointer-events-none absolute -right-40 -bottom-40 w-[560px] h-[560px] text-amber-800/[0.07]" />

          {/* ========================================================
              HEADER MODAL (ảnh phong cảnh di sản mờ dần về bên trái)
              ======================================================== */}
          <div className="relative shrink-0 px-6 sm:px-8 py-5 border-b border-stone-200/70 flex items-start justify-between gap-3 overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('/image/trangan.jpg')" }}
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#faf7f0] via-[#faf7f0]/90 to-[#faf7f0]/35" />
            <div className="relative min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">

                {isApproved ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Đã phê duyệt &amp; Phát hành
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Chờ thẩm định
                  </span>
                )}

                <span className="text-slate-300">&bull;</span>
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <ShieldCheck size={13} className="text-indigo-600" />
                  Thẩm định theo 4 bước
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight truncate">
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
              className="relative w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-xs"
              aria-label="Đóng modal"
            >
              <X size={16} />
            </button>
          </div>

          {/* ========================================================
              THANH BƯỚC THẨM ĐỊNH: Điểm đến → Nội dung → Trải nghiệm → Quyết định
              ======================================================== */}
          <div className="relative shrink-0 px-6 sm:px-8 py-3.5 border-b border-stone-200/70 bg-white/70 backdrop-blur-sm">
            <ol className="flex items-center gap-1.5 sm:gap-2">
              {REVIEW_STEPS.map((step, idx) => {
                const isCurrent = idx === stepIndex;
                const isDone = idx < stepIndex;
                const Icon = step.icon;
                const badge =
                  step.id === "contents"
                    ? contentsLoading
                      ? "…"
                      : `${contentStats.decided + decidedContentList.length}/${contents.length}`
                    : step.id === "experience" && experience
                    ? EXP_REVIEW_META[experience.reviewStatus || "LEGACY"].short
                    : null;
                return (
                  <li key={step.id} className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 last:flex-none">
                    <button
                      type="button"
                      onClick={() => setActiveTab(step.id)}
                      disabled={!canReach(idx)}
                      title={!canReach(idx) ? "Hoàn thành các bước trước để mở bước này" : undefined}
                      className={`flex items-center gap-2 min-w-0 rounded-xl px-2 py-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                        isCurrent ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 border ${
                          isCurrent
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : isDone
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-white text-slate-500 border-slate-200"
                        }`}
                      >
                        {isDone ? <Check size={14} /> : idx + 1}
                      </span>
                      <span className="hidden md:flex flex-col items-start min-w-0">
                        <span
                          className={`text-xs font-medium truncate flex items-center gap-1 ${
                            isCurrent ? "text-emerald-800" : "text-slate-600"
                          }`}
                        >
                          <Icon size={12} className="shrink-0" />
                          {step.label}
                        </span>
                        {badge && (
                          <span className="text-[11px] font-semibold text-slate-400">{badge}</span>
                        )}
                      </span>
                    </button>
                    {idx < REVIEW_STEPS.length - 1 && (
                      <span
                        className={`h-px flex-1 min-w-3 ${isDone ? "bg-emerald-300" : "bg-slate-200"}`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* ========================================================
              MODAL BODY (Scrollable Viewport)
              ======================================================== */}
          <div className="relative flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 py-5 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={32} className="animate-spin text-emerald-600" />
                <p className="text-xs font-medium text-slate-600">
                  Đang tải hồ sơ điểm đến di sản…
                </p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold">Lỗi tải dữ liệu</h4>
                  <p className="text-xs mt-0.5">{error}</p>
                </div>
              </div>
            ) : activeTab === "general" ? (
              /* ── TAB 1: THÔNG SỐ THỰC ĐỊA & SỨC CHỨA ── */
              <div className="space-y-4">
                {/* Ý kiến thẩm định & lý do từ chối nếu có */}
                {(destination?.status === "REJECTED" || destination?.rejectionReason) && (
                  <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-rose-700">
                      <AlertCircle size={14} className="shrink-0" />
                      <p className="text-xs font-semibold">
                        Ý kiến &amp; Lý do từ chối kiểm duyệt điểm đến
                      </p>
                    </div>

                    {destination.rejectionReason && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {String(destination.rejectionReason)
                          .split(",")
                          .map((code) => {
                            const trimmed = code.trim();
                            const label = DEST_REASON_LABELS[trimmed] || trimmed;
                            return (
                              <span
                                key={trimmed}
                                className="inline-flex items-center px-2.5 py-1 rounded-xl bg-rose-100/90 text-rose-900 text-xs font-medium border border-rose-200/80 shadow-2xs"
                              >
                                {label}
                              </span>
                            );
                          })}
                      </div>
                    )}

                    {destination.otherReason && (
                      <div className="bg-white/80 p-3 rounded-xl border border-rose-200/70 text-xs">
                        <span className="font-medium text-rose-950 block mb-0.5">Chi tiết lý do khác:</span>
                        <p className="text-rose-900 leading-relaxed font-medium">{destination.otherReason}</p>
                      </div>
                    )}

                    {destination.decisionNote && (
                      <div className="bg-white/80 p-3 rounded-xl border border-rose-200/70 text-xs">
                        <span className="font-medium text-slate-900 block mb-0.5">Ghi chú từ Người thẩm định:</span>
                        <p className="text-slate-700 leading-relaxed">{destination.decisionNote}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Thông số điểm đến gói trong một khung, không cần cuộn; chữ dài cắt "…" (rê chuột để xem đủ) */}
                {(() => {
                  const lat = destination?.latitude;
                  const lng = destination?.longitude;
                  const coords =
                    lat != null && lng != null ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "—";
                  const createdAt = destination?.createdAt
                    ? new Date(destination.createdAt).toLocaleString("vi-VN")
                    : "—";
                  const capacity = destination?.capacity
                    ? `${Number(destination.capacity).toLocaleString("vi-VN")} du khách / lượt`
                    : "—";
                  const rows = [
                    {
                      icon: MapPin,
                      label: "Địa chỉ thực địa",
                      value: destination?.address || "Chưa cập nhật địa chỉ",
                      wide: true,
                    },
                    {
                      icon: Navigation,
                      label: "Tọa độ GPS",
                      value: coords,
                      mono: true,
                      action:
                        lat != null && lng != null ? (
                          <a
                            href={`https://www.google.com/maps?q=${lat},${lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 text-[11px] font-medium text-emerald-700 hover:text-emerald-900 underline inline-flex items-center gap-1"
                          >
                            Mở Maps
                            <ExternalLink size={10} />
                          </a>
                        ) : null,
                    },
                    { icon: Users, label: "Sức chứa tối đa", value: capacity },
                    {
                      icon: Building2,
                      label: "Đơn vị phụ trách",
                      value: destination?.createdBy || "Hệ thống quản trị",
                    },
                    { icon: Clock, label: "Thời gian lập hồ sơ", value: createdAt, mono: true },
                  ];
                  return (
                    <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-2 divide-y divide-slate-100 overflow-hidden">
                      {rows.map(({ icon: Icon, label, value, mono, action, wide }, i) => (
                        <div
                          key={label}
                          className={`min-w-0 px-4 py-3 ${wide ? "sm:col-span-2" : ""} ${
                            // ô bên phải (2, 4) có đường kẻ dọc ngăn với ô bên trái
                            !wide && i % 2 === 0 ? "sm:border-l sm:border-slate-100" : ""
                          }`}
                        >
                          <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                            <Icon size={12} className="text-emerald-600 shrink-0" />
                            {label}
                          </p>
                          <div className="mt-1 flex items-center gap-2 min-w-0">
                            <p
                              title={value}
                              className={`truncate text-[13px] font-medium text-slate-800 ${mono ? "font-mono" : ""}`}
                            >
                              {value}
                            </p>
                            {action}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Gợi ý thẩm định */}
                <div className="px-3.5 py-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-center gap-2.5">
                  <ShieldCheck size={15} className="text-amber-700 shrink-0" />
                  <p className="leading-relaxed truncate" title="Kiểm tra địa chỉ, tọa độ và sức chứa rồi bấm Tiếp tục để duyệt nội dung văn hóa.">
                    <strong>Bước 1/4:</strong> Kiểm tra địa chỉ, tọa độ, sức chứa rồi bấm <strong>&ldquo;Tiếp tục&rdquo;</strong>.
                  </p>
                </div>
              </div>
            ) : activeTab === "contents" ? (
              /* ── TAB 2: HỒ SƠ THUYẾT MINH & VĂN HÓA ── */
              <div className="space-y-4">
                {/* Banner tóm tắt thẩm định */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20">
                        Bước 2 · Nội dung văn hóa
                      </span>
                      <span className="text-xs text-emerald-300">
                        {stats.totalCount} nội dung
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1 max-w-2xl leading-relaxed">
                      Xem, nghe từng nội dung (audio, video, câu chuyện, bài viết) để kiểm tra tính chính xác lịch sử, bản quyền và chất lượng trình bày, rồi chọn Duyệt hoặc Không duyệt cho từng nội dung.
                    </p>
                  </div>
                </div>

                {contentsLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 size={28} className="animate-spin text-indigo-600" />
                    <p className="text-xs font-medium">Đang tải các bài thuyết minh văn hóa…</p>
                  </div>
                ) : contentsError ? (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-3">
                    <span>{contentsError}</span>
                    <button
                      type="button"
                      onClick={loadCulturalContents}
                      className="px-3 py-1 bg-rose-600 text-white font-medium rounded-lg text-xs"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : contents.length === 0 ? (
                  <div className="py-14 text-center bg-white rounded-2xl border border-slate-200/90 p-6 space-y-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Headphones size={24} />
                    </div>
                    <h4 className="font-medium text-slate-800 text-sm">
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
                              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono font-semibold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                                #{item.sequenceOrder ?? 0}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${typeCfg.badgeClass}`}
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

                              {/* Nút hành động Thẩm định: chỉ khi bài đang chờ duyệt */}
                              <div className="flex items-center gap-1.5">
                                {item.reviewStatus === "PENDING" && contentDecisions[item.id] ? (
                                  /* Đã chọn kết quả (nháp), gửi ở bước 4 */
                                  <>
                                    <span
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                                        contentDecisions[item.id].approve
                                          ? "bg-emerald-600 text-white border-emerald-600"
                                          : "bg-rose-600 text-white border-rose-600"
                                      }`}
                                    >
                                      {contentDecisions[item.id].approve ? (
                                        <CheckCircle2 size={12} />
                                      ) : (
                                        <XCircle size={12} />
                                      )}
                                      {contentDecisions[item.id].approve ? "Duyệt" : "Không duyệt"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => clearContentDecision(item.id)}
                                      className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                                      title="Chọn lại kết quả cho nội dung này"
                                    >
                                      Đổi
                                    </button>
                                  </>
                                ) : item.reviewStatus === "PENDING" ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenApproveContent(item)}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 active:scale-95 shadow-2xs"
                                      title="Duyệt nội dung này"
                                    >
                                      <CheckCircle2 size={12} className="text-emerald-600" />
                                      <span>Duyệt</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenRejectContent(item)}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 active:scale-95 shadow-2xs"
                                      title="Không duyệt, chọn lý do để đối tác chỉnh sửa"
                                    >
                                      <XCircle size={12} className="text-rose-600" />
                                      <span>Không duyệt</span>
                                    </button>
                                  </>
                                ) : item.reviewStatus === "APPROVED" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 size={12} className="text-emerald-600" />
                                    Đã duyệt
                                  </span>
                                ) : item.reviewStatus === "REJECTED" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200">
                                    <XCircle size={12} className="text-rose-600" />
                                    Đã từ chối, chờ đối tác sửa
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    Chưa gửi kiểm duyệt
                                  </span>
                                )}

                                {item.reviewStatus && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenContentHistory(item)}
                                  className="p-1 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 transition-colors cursor-pointer"
                                  title="Xem lịch sử kiểm duyệt của bài này"
                                >
                                  <History size={13} />
                                </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Tiêu đề & Tóm tắt */}
                          <div className="mt-2.5">
                            <h4 className="text-sm font-semibold text-slate-900 tracking-tight">
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
                                      className={`px-3.5 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
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
                                  className="text-[11px] font-medium text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 p-1"
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
                                className="text-xs font-medium text-slate-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
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
                                <span className="text-xs font-medium text-slate-500">
                                  Toàn văn kịch bản thuyết minh
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyScript(item.id, item.contentText)}
                                  className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
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
                    <p className="text-xs font-medium text-slate-600">
                      Đang tải thông tin gói trải nghiệm &amp; đố vui…
                    </p>
                  </div>
                ) : expError ? (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold">Lỗi tải gói trải nghiệm</h4>
                      <p className="text-xs mt-0.5">{expError}</p>
                    </div>
                  </div>
                ) : !experience ? (
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-3 shadow-2xs">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                      <Inbox size={24} />
                    </div>
                    <h4 className="text-sm font-medium text-slate-800">
                      Điểm đến chưa thiết lập gói trải nghiệm
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      Đối tác chưa thiết lập gói vé tham quan, nhiệm vụ thực địa hoặc câu hỏi đố vui cho di tích này. Gói trải nghiệm sẽ tự động kích hoạt khi đối tác khởi tạo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Kết quả duyệt riêng gói trải nghiệm (bước 3) */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800 flex items-center gap-2">
                            <ShieldCheck size={14} className="text-emerald-600" />
                            Kết quả duyệt gói trải nghiệm
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                                EXP_REVIEW_META[expReview].cls
                              }`}
                            >
                              {EXP_REVIEW_META[expReview].label}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Gói trải nghiệm được duyệt riêng. Chỉ gói đã duyệt mới mở cho du khách khi điểm đến được phát hành.
                          </p>
                          {experience.reviewNote && (
                            <p className="text-[11px] text-slate-600 mt-1.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5">
                              <span className="font-medium">Ghi chú:</span> {experience.reviewNote}
                            </p>
                          )}
                        </div>
                        {!expRejecting && expDecision ? (
                          /* Đã chọn kết quả (nháp), gửi ở bước 4 */
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${
                                expDecision.approve ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                              }`}
                            >
                              {expDecision.approve ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                              {expDecision.approve ? "Duyệt" : "Không duyệt"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setExpDecision(null)}
                              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                            >
                              Đổi
                            </button>
                          </div>
                        ) : !expRejecting ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setExpRejecting(true);
                                setExpNoteError("");
                              }}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <XCircle size={13} />
                              Không duyệt
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExperienceDecision(true)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 size={13} />
                              Duyệt
                            </button>
                          </div>
                        ) : null}
                      </div>

                      {expRejecting && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <label className="text-xs font-medium text-slate-700 block">
                            Lý do không duyệt gửi đối tác <span className="text-rose-500">*</span>
                          </label>
                          <textarea
                            value={expNote}
                            onChange={(e) => {
                              setExpNote(e.target.value);
                              if (expNoteError) setExpNoteError("");
                            }}
                            rows={3}
                            maxLength={1000}
                            placeholder="Ví dụ: Câu hỏi số 2 chưa có đáp án đúng, giá vé chưa hợp lý…"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 resize-none"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setExpRejecting(false);
                                setExpNoteError("");
                              }}
                              className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs cursor-pointer"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExperienceDecision(false)}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              Ghi nhận không duyệt
                            </button>
                          </div>
                        </div>
                      )}

                      {expNoteError && (
                        <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1.5">
                          <AlertCircle size={13} />
                          {expNoteError}
                        </p>
                      )}
                    </div>

                    {/* Thẻ tổng quan gói trải nghiệm */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <p className="text-xs font-medium text-slate-400">
                              Gói Trải Nghiệm Thực Địa
                            </p>
                          </div>
                          <h4 className="text-base font-medium text-slate-900 mt-1">
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
                                  className="mt-1 text-[11.5px] font-medium text-amber-700 hover:text-amber-800 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
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
                          <p className="text-xs font-medium text-slate-400 flex items-center gap-1 mb-1">
                            <Banknote size={12} className="text-emerald-600" />
                            Giá vé tham quan
                          </p>
                          <p className="text-base font-semibold text-slate-900">
                            {Number(experience.price).toLocaleString("vi-VN")}{" "}
                            <span className="text-xs font-semibold text-slate-500">
                              {experience.currency || "VND"}
                            </span>
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
                          <p className="text-xs font-medium text-slate-400 flex items-center gap-1 mb-1">
                            <Clock size={12} className="text-sky-600" />
                            Thời lượng trải nghiệm
                          </p>
                          <p className="text-base font-semibold text-slate-900">
                            {experience.durationMinutes
                              ? `${experience.durationMinutes} phút`
                              : "Chưa đặt"}
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
                          <p className="text-xs font-medium text-slate-400 flex items-center gap-1 mb-1">
                            <Trophy size={12} className="text-amber-600" />
                            Nhiệm vụ &amp; Đố vui
                          </p>
                          <p className="text-base font-semibold text-slate-900">
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
                          <h5 className="text-xs font-medium text-slate-800">
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
                              <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-medium text-[11px] shrink-0 font-mono">
                                {t.sequenceOrder !== undefined ? t.sequenceOrder + 1 : idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-slate-900">
                                    {t.name || t.title || "Nhiệm vụ không tên"}
                                  </span>
                                  {t.typeName && (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                                      {t.typeName}
                                    </span>
                                  )}
                                  {t.pointsReward > 0 && (
                                    <span className="text-[11px] font-medium text-emerald-700">
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

                    {/* Khung giờ đón tiếp */}
                    <div className="grid grid-cols-1 gap-4">
                      {/* Khung giờ đón tiếp (Slots) */}
                      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2.5">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                          <Calendar size={14} className="text-sky-600" />
                          <h6 className="text-xs font-medium text-slate-800">
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
                                <span className="font-medium text-slate-800 font-mono">
                                  {s.slotDate}
                                </span>
                                <span className="text-[11px] text-slate-500 shrink-0 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-semibold">
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
            ) : activeTab === "decision" ? (
              /* ── BƯỚC 4: TỔNG HỢP KẾT QUẢ & QUYẾT ĐỊNH CUỐI ── */
              <div className="space-y-4">
                {/* Phần 1–3: kết quả đã chọn ở các bước trước */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100">
                    <h4 className="text-sm font-medium text-slate-900">Tổng hợp kết quả thẩm định</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kết quả bên dưới chưa được gửi. Bấm &ldquo;Xác nhận kết quả&rdquo; để gửi tất cả cùng lúc.
                    </p>
                  </div>

                  {/* 1. Điểm đến */}
                  <div className="px-5 py-3 flex items-center gap-3 border-b border-slate-100">
                    <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <MapPin size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-slate-400">1 · Điểm đến</p>
                      <p className="text-xs font-medium text-slate-800 truncate">
                        {destination?.name}
                        <span className="font-normal text-slate-500">
                          {destination?.capacity ? ` · ${destination.capacity} du khách/lượt` : ""}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("general")}
                      className="w-20 shrink-0 inline-flex items-center justify-center px-2.5 py-1 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 text-[11px] font-medium cursor-pointer transition-colors"
                    >
                      Xem lại
                    </button>
                  </div>

                  {/* 2. Nội dung văn hóa */}
                  <div className="px-5 py-3 border-b border-slate-100 space-y-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                        <Headphones size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-slate-400">2 · Nội dung văn hóa</p>
                        <p className="text-xs font-medium text-slate-800">
                          {contents.length === 0
                            ? "Điểm đến chưa có nội dung văn hóa"
                            : `${contents.length} nội dung`}
                        </p>
                      </div>
                      {decidedContentList.length > 0 && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full border text-[11px] font-medium bg-slate-50 text-slate-600 border-slate-200">
                          {decidedContentList.filter((c) => contentDecisions[c.id].approve).length} duyệt ·{" "}
                          {decidedContentList.filter((c) => !contentDecisions[c.id].approve).length} không duyệt
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTab("contents")}
                        className="w-20 shrink-0 inline-flex items-center justify-center px-2.5 py-1 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 text-[11px] font-medium cursor-pointer transition-colors"
                      >
                        Xem lại
                      </button>
                    </div>
                    {/* Danh sách từng nội dung nằm trong khung riêng: tên dài thì cắt gọn, rê chuột để xem đủ */}
                    {contents.length > 0 && (
                      <ul className="ml-11 rounded-xl border border-slate-200/80 bg-slate-50/70 divide-y divide-slate-200/70">
                        {contents.map((c) => {
                          const d = contentDecisions[c.id];
                          const tone = d
                            ? d.approve
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-white text-slate-600 border-slate-200";
                          const label = d
                            ? d.approve
                              ? "Duyệt"
                              : "Không duyệt"
                            : c.reviewStatus === "APPROVED"
                            ? "Đã duyệt trước đó"
                            : c.reviewStatus === "REJECTED"
                            ? "Đã từ chối trước đó"
                            : "Chưa gửi duyệt";
                          const rejectText = d && !d.approve
                            ? `${(d.reasonLabels || []).join(" · ")}${d.note ? ` — ${d.note}` : ""}`
                            : "";
                          return (
                            <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                              <div className="min-w-0 flex-1">
                                <p className="text-slate-700 font-medium truncate" title={c.title}>
                                  {c.title}
                                </p>
                                {rejectText && (
                                  <p className="text-[11px] text-rose-600 line-clamp-2 break-words" title={rejectText}>
                                    {rejectText}
                                  </p>
                                )}
                              </div>
                              <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[11px] font-medium ${tone}`}>
                                {label}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {/* 3. Gói trải nghiệm */}
                  <div className="px-5 py-3 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Compass size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-slate-400">3 · Gói trải nghiệm</p>
                      <p className="text-xs font-medium text-slate-800 truncate" title={experience?.title || undefined}>
                        {experience ? experience.title : "Điểm đến chưa thiết lập gói trải nghiệm"}
                      </p>
                      {expDecision && !expDecision.approve && (
                        <p className="text-[11px] text-rose-600 mt-0.5 line-clamp-2 break-words" title={expDecision.note}>
                          {expDecision.note}
                        </p>
                      )}
                    </div>
                    {experience && (
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                          expDecision
                            ? expDecision.approve
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                            : EXP_REVIEW_META[expReview].cls
                        }`}
                      >
                        {expDecision
                          ? expDecision.approve
                            ? "Duyệt"
                            : "Không duyệt"
                          : EXP_REVIEW_META[expReview].label}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab("experience")}
                      className="w-20 shrink-0 inline-flex items-center justify-center px-2.5 py-1 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 text-[11px] font-medium cursor-pointer transition-colors"
                    >
                      Xem lại
                    </button>
                  </div>
                </div>

                {/* Phần 4: quyết định cho điểm đến */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
                  <h4 className="text-sm font-medium text-slate-900">4 · Quyết định cho điểm đến</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDestDecision({ approve: true, reasons: [], otherReason: "", note: "" })}
                      className={`text-left p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                        destDecision?.approve
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-emerald-300"
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        {isApproved ? "Giữ phát hành" : "Phê duyệt & phát hành"}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Điểm đến hiển thị cho du khách và được thêm vào tour. Chỉ nội dung, trải nghiệm được duyệt mới được mở.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDestDecision((prev) =>
                          prev && !prev.approve ? prev : { approve: false, reasons: [], otherReason: "", note: "" }
                        )
                      }
                      className={`text-left p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                        destDecision && !destDecision.approve
                          ? "border-rose-500 bg-rose-50"
                          : "border-slate-200 hover:border-rose-300"
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        <XCircle size={16} className="text-rose-600" />
                        {isApproved ? "Thu hồi duyệt" : "Từ chối"}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Gửi lý do để đối tác chỉnh sửa và gửi duyệt lại. Điểm đến không hiển thị cho du khách.
                      </p>
                    </button>
                  </div>

                  {destDecision && !destDecision.approve && (
                    <div className="space-y-2.5 pt-1">
                      <p className="text-xs font-medium text-slate-700">
                        Lý do <span className="text-rose-500">*</span>{" "}
                        <span className="font-normal text-slate-400">(chọn một hoặc nhiều)</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(DEST_REASON_LABELS).map(([code, label]) => {
                          const on = destDecision.reasons.includes(code);
                          return (
                            <button
                              key={code}
                              type="button"
                              onClick={() =>
                                setDestDecision((prev) => ({
                                  ...prev,
                                  reasons: on ? prev.reasons.filter((r) => r !== code) : [...prev.reasons, code],
                                }))
                              }
                              className={`px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
                                on
                                  ? "bg-rose-600 text-white border-rose-600"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {destDecision.reasons.includes("OTHER") && (
                        <input
                          value={destDecision.otherReason}
                          onChange={(e) => setDestDecision((prev) => ({ ...prev, otherReason: e.target.value }))}
                          maxLength={500}
                          placeholder="Mô tả lý do khác *"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                      )}
                    </div>
                  )}

                  {destDecision && (
                    <textarea
                      value={destDecision.note}
                      onChange={(e) => setDestDecision((prev) => ({ ...prev, note: e.target.value }))}
                      rows={2}
                      maxLength={1000}
                      placeholder="Ghi chú gửi đối tác (không bắt buộc)"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                    />
                  )}

                  {submitError && (
                    <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      {submitError}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* ========================================================
              FOOTER MODAL (Action Buttons)
              ======================================================== */}
          <div className="relative shrink-0 px-6 sm:px-8 py-4 border-t border-stone-200/70 flex items-center justify-between gap-3 bg-white/70 backdrop-blur-sm">
            <div className="text-xs text-slate-500 hidden sm:block min-w-0">
              Bước <strong className="text-slate-800">{stepIndex + 1}</strong>/{REVIEW_STEPS.length}
              {blockReason ? (
                <span className="text-amber-700 font-semibold"> · {blockReason}</span>
              ) : isLastStep && !destDecision ? (
                <span className="text-amber-700 font-semibold"> · Chọn quyết định cho điểm đến</span>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(destination)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>Sửa thông tin</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Đóng
              </button>
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => goStep(-1)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ChevronLeft size={14} />
                  Quay lại
                </button>
              )}
              {!isLastStep ? (
                <button
                  type="button"
                  onClick={() => goStep(1)}
                  disabled={isLoading || Boolean(error) || !canProceed}
                  title={blockReason || undefined}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs inline-flex items-center gap-1.5 shadow-sm shadow-emerald-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tiếp tục
                  <ChevronRight size={14} />
                </button>
              ) : (
                (onCompleted || onApprove) && (
                  <button
                    type="button"
                    onClick={handleSubmitAll}
                    disabled={!destReady || submitting || isActionLoading}
                    className={`px-5 py-2 rounded-xl text-white font-medium text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      destDecision && !destDecision.approve
                        ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/25"
                        : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25"
                    }`}
                  >
                    {submitting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={14} />
                    )}
                    {submitting ? "Đang gửi kết quả…" : "Xác nhận kết quả"}
                  </button>
                )
              )}
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
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {previewMediaTarget.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span className="font-mono font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/70">
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
                    <p className="text-sm font-medium text-white">{previewMediaTarget.title}</p>
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
                  <h5 className="text-xs font-medium text-slate-400 mb-1">
                    Tóm tắt dẫn nhập
                  </h5>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {previewMediaTarget.description}
                  </p>
                </div>
              )}

              {previewMediaTarget.contentText && (
                <div>
                  <h5 className="text-xs font-medium text-slate-400 mb-1">
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
                  className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1.5"
                >
                  <span>Mở liên kết media trong tab mới</span>
                  <ExternalLink size={12} />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewMediaTarget(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
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
        <div className="fixed top-5 right-5 z-100 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-medium flex items-center gap-2 max-w-md animate-in slide-in-from-top-3">
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
                <h4 className="text-sm font-semibold text-slate-900">
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
              <label className="text-xs font-medium text-slate-700 block">
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
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isApprovingContent}
                onClick={handleConfirmApproveContent}
                className="px-4 py-2 text-xs font-medium rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
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
                  <h4 className="text-sm font-semibold text-slate-900 tracking-tight">
                    Không duyệt nội dung
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
                <label className="text-xs font-medium text-slate-700 block">
                  Chọn lý do không duyệt (có thể chọn nhiều):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {rejectionReasons.map((r) => {
                    const isChecked = selectedReasons.includes(r.code);
                    return (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => handleToggleReason(r.code)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
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
                  <label className="text-xs font-medium text-rose-700 block">
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
                <label className="text-xs font-medium text-slate-700 block">
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
                <p className="text-xs font-medium text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{rejectError}</span>
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isRejectingContent}
                onClick={handleConfirmRejectContent}
                className="px-4 py-2 text-xs font-medium rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm shadow-rose-600/20"
              >
                {isRejectingContent && <Loader2 size={13} className="animate-spin" />}
                <span>Ghi nhận không duyệt</span>
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
                  <h4 className="text-sm font-semibold text-slate-900 tracking-tight">
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
                  <p className="text-xs font-medium">Đang tải lịch sử kiểm duyệt...</p>
                </div>
              ) : historyError ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                  <p className="font-medium flex items-center gap-1.5">
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
                    <span className="text-xs font-medium text-slate-600">Trạng thái:</span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
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
                      <div className="flex items-center gap-1.5 text-xs font-medium text-rose-900">
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
                          <span className="font-medium">Lý do khác:</span> {historyData.otherReason}
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
                      <h5 className="text-xs font-medium text-slate-400">
                        Dòng thời gian sự kiện
                      </h5>
                      <div className="space-y-2">
                        {historyData.history.map((evt, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-800">
                                {evt.action === "SUBMITTED"
                                  ? "Đã gửi hồ sơ thẩm định"
                                  : evt.action === "APPROVED"
                                  ? "Đã duyệt và xuất bản"
                                  : "Đã từ chối hồ sơ"}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">
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
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors cursor-pointer"
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
