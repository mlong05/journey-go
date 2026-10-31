"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  X,
  Headphones,
  Video,
  BookOpen,
  FileText,
  Globe,
  Plus,
  Play,
  RotateCcw,
  Trash2,
  Pencil,
  Search,
  Check,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Volume2,
  Pause,
  ChevronDown,
  ArrowLeft,
  Filter,
  ExternalLink,
  Send,
  History,
  ShieldCheck,
  AlertTriangle,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { culturalContentService } from "../services/culturalContentService";

const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
// Khớp giới hạn CulturalContentRequest.MAX_IMAGES ở backend
const IMAGE_MAX_COUNT = 20;

/* Thư viện ảnh trong trình xem: ảnh lớn đang chọn + dải ảnh nhỏ để chuyển ảnh */
function PreviewGallery({ images, title }) {
  const [active, setActive] = useState(0);
  if (!Array.isArray(images) || images.length === 0) return null;
  const index = Math.min(active, images.length - 1);
  const go = (delta) => setActive((index + delta + images.length) % images.length);

  return (
    <div className="px-5 sm:px-6 pt-5 bg-white space-y-2.5">
      <h5 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
        <ImagePlus size={12} />
        Thư viện ảnh ({index + 1}/{images.length})
      </h5>
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[index]} alt={`${title} - ảnh ${index + 1}`} className="w-full h-full object-contain" />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow flex items-center justify-center cursor-pointer"
              aria-label="Ảnh trước"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow flex items-center justify-center cursor-pointer"
              aria-label="Ảnh sau"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                i === index ? "border-emerald-500" : "border-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={`Xem ảnh ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Cấu hình các định dạng nội dung văn hóa đa phương tiện */
const CONTENT_TYPES = [
  {
    type: "AUDIO",
    label: "Audio thuyết minh",
    desc: "Giọng đọc dẫn chuyện để du khách nghe khi tham quan điểm đến",
    icon: Headphones,
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    bgGradient: "from-sky-600 to-cyan-700",
  },
  {
    type: "VIDEO",
    label: "Video tư liệu",
    desc: "Video giới thiệu, phim tư liệu ngắn hoặc cảnh quay flycam",
    icon: Video,
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    bgGradient: "from-rose-600 to-pink-700",
  },
  {
    type: "STORY",
    label: "Truyền thuyết / Sự tích",
    desc: "Giai thoại dân gian, câu chuyện lịch sử gắn với điểm đến",
    icon: BookOpen,
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    bgGradient: "from-amber-600 to-orange-700",
  },
  {
    type: "ARTICLE",
    label: "Bài viết văn hóa",
    desc: "Giới thiệu lịch sử, kiến trúc, phong tục và lễ hội của điểm đến",
    icon: FileText,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bgGradient: "from-emerald-600 to-teal-700",
  },
  {
    type: "3D_VR",
    label: "Mô hình 3D / VR",
    desc: "Tham quan không gian ảo, khám phá hiện vật đa chiều",
    icon: Globe,
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    bgGradient: "from-violet-600 to-purple-700",
  },
];

const REJECTION_LABELS = {
  IMAGE_NOT_RELEVANT: "Ảnh không phù hợp với nội dung",
  INACCURATE_INFORMATION: "Thông tin chưa chính xác",
  INAPPROPRIATE_CONTENT: "Nội dung không phù hợp",
  COPYRIGHT_VIOLATION: "Vi phạm bản quyền",
  INCOMPLETE_CONTENT: "Nội dung chưa đầy đủ",
  DUPLICATE_CONTENT: "Nội dung bị trùng lặp",
  OTHER: "Lý do khác",
};

function formatDuration(sec) {
  if (!sec || Number.isNaN(sec) || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Trích xuất URL nhúng YouTube từ mọi định dạng link YouTube thông dụng:
 * watch?v=, youtu.be/, embed/, shorts/, v/
 */
function getYouTubeEmbedUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = trimmed.match(regExp);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&rel=0` : null;
}

/**
 * Kiểm tra xem có phải định dạng tệp video trực tiếp (MP4, WebM, OGG, MOV) không
 */
function isDirectVideoUrl(url) {
  if (!url || typeof url !== "string") return false;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url.trim());
}

const TITLE_MAX = 200;
const MEDIA_URL_MAX = 1000;
const DESCRIPTION_MAX = 300;
const CONTENT_TEXT_MAX = 5000;

/** Bộ đếm ký tự nhỏ ở góc phải dưới của ô nhập. */
function CharCounter({ value, max, className = "bottom-2" }) {
  const length = (value || "").length;
  const nearLimit = length >= max * 0.9;
  return (
    <span
      className={`pointer-events-none absolute right-3 ${className} text-[11px] font-mono font-semibold ${
        nearLimit ? "text-rose-500" : "text-slate-400"
      }`}
    >
      {length}/{max}
    </span>
  );
}

export default function CulturalContentManagerModal({
  isOpen,
  destination,
  onClose,
  onUpdated,
}) {
  const [activeContents, setActiveContents] = useState([]);
  const [deletedContents, setDeletedContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Tab: "active" | "trash"
  const [currentTab, setCurrentTab] = useState("active");
  const [filterType, setFilterType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Trạng thái Dropdown pop-up bấm xổ xuống
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isFormatDropdownOpen, setIsFormatDropdownOpen] = useState(false);

  // Refs để bắt sự kiện click outside đóng dropdown
  const filterDropdownRef = useRef(null);
  const formatDropdownRef = useRef(null);

  // Trạng thái phát audio trực tiếp (Player Preview)
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  // Trình xem / phát Media chuyên dụng (YouTube iframe, Video HTML5, Audio)
  const [previewMediaTarget, setPreviewMediaTarget] = useState(null);

  // Form tạo mới / chỉnh sửa
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContent, setEditingContent] = useState(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState("AUDIO");
  const [sequenceOrder, setSequenceOrder] = useState(1);
  const [duration, setDuration] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [description, setDescription] = useState("");
  const [contentText, setContentText] = useState("");
  const [formError, setFormError] = useState("");
  // Thư viện ảnh: chọn nhiều ảnh từ máy tính, tải lần lượt lên Cloudinary rồi lưu danh sách URL
  const [imageUrls, setImageUrls] = useState([]);
  const imageInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");

  const handleImageFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    const remaining = IMAGE_MAX_COUNT - imageUrls.length;
    if (remaining <= 0) {
      setImageError(`Mỗi nội dung tối đa ${IMAGE_MAX_COUNT} ảnh.`);
      return;
    }
    const valid = files.filter((f) => f.type.startsWith("image/") && f.size <= IMAGE_MAX_BYTES);
    const problems = [];
    if (valid.length < files.length) problems.push("Bỏ qua tệp không phải ảnh hoặc lớn hơn 10MB.");
    if (valid.length > remaining) problems.push(`Chỉ thêm được ${remaining} ảnh nữa.`);

    setImageError("");
    setUploadingImage(true);
    try {
      for (const file of valid.slice(0, remaining)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "journeygo/cultural-contents");
        const res = await apiClient.upload("/upload/image", formData);
        const url = res?.data?.url || res?.url;
        if (!url) throw new Error("Máy chủ không trả về đường dẫn ảnh.");
        // Thêm từng ảnh ngay khi tải xong để người dùng thấy tiến độ
        setImageUrls((prev) => [...prev, url]);
      }
    } catch (err) {
      problems.push(err?.message || "Tải ảnh lên thất bại.");
    } finally {
      setUploadingImage(false);
      if (problems.length) setImageError(problems.join(" "));
    }
  };

  const handleRemoveImage = (url) => {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  };

  // Confirmation dialog (xóa mềm / khôi phục)
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Lịch sử kiểm duyệt (History Dialog)
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [historyError, setHistoryError] = useState("");

  // Toast
  const [toast, setToast] = useState({ message: "", tone: "success" });
  const showToast = useCallback((message, tone = "success") => {
    setToast({ message, tone });
    setTimeout(() => setToast({ message: "", tone }), 4000);
  }, []);

  const handleOpenHistory = useCallback(async (content) => {
    setHistoryTarget(content);
    setHistoryLoading(true);
    setHistoryError("");
    setHistoryData(null);
    try {
      const data = await culturalContentService.getHistory(content.id);
      setHistoryData(data);
    } catch (err) {
      console.error("[Content History] fetch error:", err);
      setHistoryError(
        err?.message || "Không thể tải lịch sử kiểm duyệt cho nội dung này."
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleCloseHistory = useCallback(() => {
    setHistoryTarget(null);
    setHistoryData(null);
    setHistoryError("");
  }, []);

  const resetForm = useCallback(() => {
    setTitle("");
    setContentType("AUDIO");
    setSequenceOrder(activeContents.length + 1);
    setDuration("");
    setMediaUrl("");
    setImageUrls([]);
    setImageError("");
    setDescription("");
    setContentText("");
    setFormError("");
    setIsFormatDropdownOpen(false);
  }, [activeContents.length]);

  // Tải danh sách nội dung văn hóa của điểm đến
  const loadData = useCallback(async () => {
    if (!destination?.id) return;
    setLoading(true);
    try {
      const [actives, deleteds] = await Promise.all([
        culturalContentService.getManageByDestination(destination.id).catch(() => []),
        culturalContentService.getDeletedByDestination(destination.id).catch(() => []),
      ]);
      setActiveContents(actives || []);
      setDeletedContents(deleteds || []);
    } catch (err) {
      console.error("[CulturalContentModal] load error:", err);
      showToast("Không thể tải danh sách nội dung văn hóa.", "error");
    } finally {
      setLoading(false);
    }
  }, [destination, showToast]);

  const handleSubmitForModeration = useCallback(
    async (content) => {
      setActionLoading(true);
      try {
        await culturalContentService.submit(content.id);
        showToast(
          `Đã gửi bài thuyết minh "${content.title}" vào hàng chờ kiểm duyệt thành công!`,
          "success"
        );
        await loadData();
        onUpdated?.();
      } catch (err) {
        console.error("[Submit Content Moderation] error:", err);
        showToast(
          err?.message || "Không thể gửi nội dung vào hàng chờ kiểm duyệt.",
          "error"
        );
      } finally {
        setActionLoading(false);
      }
    },
    [loadData, onUpdated, showToast]
  );

  useEffect(() => {
    if (!isOpen || !destination?.id) return;
    let cancelled = false;
    const currentAudio = audioRef.current;
    queueMicrotask(() => {
      if (!cancelled) {
        loadData();
        setIsFormOpen(false);
        setEditingContent(null);
        resetForm();
        setConfirmDialog(null);
        setPlayingId(null);
        setPreviewMediaTarget(null);
        setFilterType("ALL");
        setSearchQuery("");
      }
    });
    return () => {
      cancelled = true;
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, [isOpen, destination, loadData, resetForm]);

  // Khóa cuộn trang nền
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Bắt sự kiện click outside để tự động đóng dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(e.target)
      ) {
        setIsFilterDropdownOpen(false);
      }
      if (
        formatDropdownRef.current &&
        !formatDropdownRef.current.contains(e.target)
      ) {
        setIsFormatDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleOpenCreate = () => {
    setEditingContent(null);
    resetForm();
    setSequenceOrder(activeContents.length + 1);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (content) => {
    setEditingContent(content);
    setTitle(content.title || "");
    setContentType(content.contentType || "AUDIO");
    setSequenceOrder(content.sequenceOrder ?? 1);
    setDuration(content.duration != null ? String(content.duration) : "");
    setMediaUrl(content.mediaUrl || "");
    setImageUrls(Array.isArray(content.imageUrls) ? content.imageUrls : []);
    setImageError("");
    setDescription(content.description || "");
    setContentText(content.contentText || "");
    setFormError("");
    setIsFormatDropdownOpen(false);
    setIsFormOpen(true);
  };

  // Submit form (Tạo mới hoặc Cập nhật)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setFormError("Vui lòng nhập tiêu đề.");
      return;
    }

    const payload = {
      title: cleanTitle,
      contentType,
      sequenceOrder: Number(sequenceOrder) || 0,
      duration: duration !== "" && !Number.isNaN(Number(duration)) ? Number(duration) : null,
      mediaUrl: mediaUrl.trim() || null,
      imageUrls,
      description: description.trim() || null,
      contentText: contentText.trim() || null,
    };

    setActionLoading(true);
    try {
      if (editingContent) {
        await culturalContentService.update(editingContent.id, payload);
        showToast(`Đã cập nhật nội dung "${cleanTitle}" thành công.`);
      } else {
        await culturalContentService.create(destination.id, payload);
        showToast(`Đã thêm mới nội dung "${cleanTitle}" vào điểm đến.`);
      }
      setIsFormOpen(false);
      resetForm();
      setEditingContent(null);
      // Đặt lại bộ lọc về ALL để nội dung vừa tạo lập tức hiển thị trên danh sách
      setFilterType("ALL");
      setSearchQuery("");
      await loadData();
      onUpdated?.();
    } catch (err) {
      console.error("[CulturalContentModal] submit error:", err);
      setFormError(
        err?.response?.data?.message || err?.message || "Không thể lưu nội dung văn hóa."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Phát / Nghe / Xem thử trực tiếp (Hỗ trợ YouTube, Video MP4 và Audio MP3)
  const handleTogglePlay = async (content) => {
    const rawUrl = content.mediaUrl || "";
    const ytUrl = getYouTubeEmbedUrl(rawUrl);
    const isVid = content.contentType === "VIDEO" || isDirectVideoUrl(rawUrl) || Boolean(ytUrl);

    // NẾU LÀ VIDEO HOẶC LIÊN KẾT YOUTUBE:
    // Mở trực tiếp khung phát video (iframe YouTube hoặc thẻ video HTML5), tuyệt đối KHÔNG đẩy vào thẻ audio
    if (isVid) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingId(null);

      // Gọi API play để ghi nhận lượt xem
      try {
        await culturalContentService.play(content.id);
        setActiveContents((prev) =>
          prev.map((c) => (c.id === content.id ? { ...c, playCount: (c.playCount || 0) + 1 } : c))
        );
      } catch (err) {
        console.warn("[Play count update]:", err);
      }

      setPreviewMediaTarget(content);
      return;
    }

    // NẾU LÀ AUDIO THÔNG THƯỜNG (MP3, WAV, AAC, CDN audio stream):
    if (playingId === content.id) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingId(null);
      return;
    }

    try {
      // Bài chưa được duyệt không ghi nhận lượt nghe được, vẫn cho chủ sở hữu nghe thử.
      const res = await culturalContentService.play(content.id).catch(() => null);
      setPlayingId(content.id);

      setActiveContents((prev) =>
        prev.map((c) => (c.id === content.id ? { ...c, playCount: (c.playCount || 0) + 1 } : c))
      );

      const url = res?.mediaUrl || content.mediaUrl;
      if (url && audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch((err) => {
          console.warn("[Audio Playback] Notice:", err);
          // Nếu trình duyệt chặn phát trực tiếp, mở trình xem media để hỗ trợ người dùng
          setPreviewMediaTarget(content);
        });
      }
    } catch (err) {
      console.error("[Play error]:", err);
      showToast("Không thể phát nội dung này.", "error");
    }
  };

  // Xóa mềm
  const handleExecuteDelete = async () => {
    if (!confirmDialog?.content) return;
    const c = confirmDialog.content;
    setActionLoading(true);
    try {
      await culturalContentService.delete(c.id);
      showToast(`Đã chuyển nội dung "${c.title}" vào thùng rác.`);
      setConfirmDialog(null);
      await loadData();
      onUpdated?.();
    } catch (err) {
      console.error("[Delete error]:", err);
      showToast(err?.response?.data?.message || err?.message || "Không thể xóa nội dung.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Khôi phục
  const handleExecuteRestore = async () => {
    if (!confirmDialog?.content) return;
    const c = confirmDialog.content;
    setActionLoading(true);
    try {
      await culturalContentService.restore(c.id);
      showToast(`Đã khôi phục thành công nội dung "${c.title}".`);
      setConfirmDialog(null);
      await loadData();
      onUpdated?.();
    } catch (err) {
      console.error("[Restore error]:", err);
      showToast(err?.response?.data?.message || err?.message || "Không thể khôi phục.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Danh sách hiện tại theo Tab
  const currentList = currentTab === "active" ? activeContents : deletedContents;

  // Danh sách hiển thị theo filter và search
  const displayedContents = useMemo(() => {
    return currentList.filter((c) => {
      if (filterType !== "ALL" && c.contentType !== filterType) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.contentText?.toLowerCase().includes(q)
      );
    });
  }, [currentList, filterType, searchQuery]);

  // Cấu hình định dạng đang chọn trong bộ lọc
  const activeFilterConfig = CONTENT_TYPES.find((ct) => ct.type === filterType);
  const ActiveFilterIcon = activeFilterConfig?.icon || Filter;

  // Cấu hình định dạng đang chọn trong Form
  const selectedFormFormat = CONTENT_TYPES.find((ct) => ct.type === contentType) || CONTENT_TYPES[0];
  const SelectedFormFormatIcon = selectedFormFormat.icon;

  if (!isOpen || !destination) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
    >
      {/* Thẻ audio ẩn phục vụ trình phát thuyết minh */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingId(null)}
        onError={() => setPlayingId(null)}
        className="hidden"
      />

      {/* Double-Bezel Container */}
      <div className="w-full max-w-5xl animate-in zoom-in-95 duration-200">
        <div className="bg-white rounded-2xl overflow-hidden flex flex-col h-[760px] max-h-[94vh] shadow-2xl border border-slate-200/80">
          {/* ========================================================
              HEADER MODAL
              ======================================================== */}
          <div className="shrink-0 px-6 sm:px-8 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/40">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 ring-4 ring-emerald-50 shrink-0">
                <Headphones size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    Trải nghiệm văn hóa
                  </span>
                  <span className="text-xs font-bold text-slate-400">&bull;</span>
                  <span className="text-xs font-bold text-slate-600 truncate max-w-xs">
                    {destination.name}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight mt-0.5 truncate">
                  Thuyết minh &amp; câu chuyện văn hóa
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Đóng modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Toast */}
          {toast.message && (
            <div
              className={`shrink-0 mx-6 sm:mx-8 mt-3 p-3 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 ${
                toast.tone === "success"
                  ? "bg-emerald-600 text-white"
                  : "bg-rose-600 text-white"
              }`}
            >
              {toast.tone === "success" ? (
                <CheckCircle2 size={16} className="shrink-0" />
              ) : (
                <AlertCircle size={16} className="shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
          )}

          {/* ========================================================
              VIEW 1: MÀN HÌNH FORM TẠO MỚI / CHỈNH SỬA
              ======================================================== */}
          {isFormOpen ? (
            <div className="flex-1 min-h-0 flex flex-col bg-slate-50/50 animate-in fade-in duration-150">
              {/* Form Action Header */}
              <div className="shrink-0 px-6 sm:px-8 py-3.5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <ArrowLeft size={14} />
                  <span>Quay lại danh sách</span>
                </button>

                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold inline-flex items-center justify-center">
                    {editingContent ? "✏" : "+"}
                  </span>
                  <span>
                    {editingContent
                      ? `Chỉnh sửa nội dung #${editingContent.id}`
                      : "Thêm nội dung văn hóa mới"}
                  </span>
                </h3>

                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content Fields (Cuộn riêng biệt) */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                <form id="cultural-content-form" onSubmit={handleSubmitForm} className="max-w-3xl mx-auto space-y-4">
                  {/* 1. Chọn loại định dạng bằng Pop-up xổ xuống */}
                  <div className="space-y-1.5" ref={formatDropdownRef}>
                    <label className="text-xs font-bold text-slate-700 block">
                      Loại nội dung <span className="text-rose-500">*</span>
                    </label>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsFormatDropdownOpen((prev) => !prev)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                            <SelectedFormFormatIcon size={15} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-slate-900 font-semibold block">
                              {selectedFormFormat.label}
                            </span>
                            <span className="text-[11px] text-slate-500 font-normal truncate block">
                              {selectedFormFormat.desc}
                            </span>
                          </div>
                        </div>

                        <ChevronDown
                          size={16}
                          className={`text-slate-400 shrink-0 transition-transform ${
                            isFormatDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Dropdown Menu xổ xuống */}
                      {isFormatDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                          {CONTENT_TYPES.map((ct) => {
                            const Icon = ct.icon;
                            const isSelected = contentType === ct.type;
                            return (
                              <button
                                key={ct.type}
                                type="button"
                                onClick={() => {
                                  setContentType(ct.type);
                                  setIsFormatDropdownOpen(false);
                                }}
                                className={`w-full px-4 py-2.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-50/80 text-emerald-900 font-semibold"
                                    : "hover:bg-slate-50 text-slate-700 font-medium"
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    <Icon size={14} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 leading-tight">
                                      {ct.label}
                                    </p>
                                    <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                                      {ct.desc}
                                    </p>
                                  </div>
                                </div>

                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Tiêu đề + Thứ tự + Thời lượng */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6 space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        Tiêu đề <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={TITLE_MAX}
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full pl-3.5 pr-14 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all"
                        />
                        <CharCounter value={title} max={TITLE_MAX} className="top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        Thứ tự hiển thị
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={sequenceOrder}
                        onChange={(e) => setSequenceOrder(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all"
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>Thời lượng (giây)</span>
                        {duration && (
                          <span className="text-[11px] font-mono text-emerald-600 font-bold">
                            ≈ {formatDuration(Number(duration))}
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all"
                      />
                    </div>
                  </div>

                  {/* 3. Video / audio chính (đường dẫn) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Video size={13} className="text-emerald-600" />
                        Video / audio chính
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Dán link YouTube, video MP4 hoặc âm thanh MP3
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        maxLength={MEDIA_URL_MAX}
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full pl-3.5 pr-20 py-2 text-xs font-mono font-medium bg-white border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all"
                      />
                      <CharCounter value={mediaUrl} max={MEDIA_URL_MAX} className="top-1/2 -translate-y-1/2" />
                    </div>

                    {/* Xem trước video ngay trong form */}
                    {getYouTubeEmbedUrl(mediaUrl) ? (
                      <div className="mt-2 w-full max-w-md aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black">
                        <iframe
                          src={getYouTubeEmbedUrl(mediaUrl)}
                          title="Xem trước video"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    ) : isDirectVideoUrl(mediaUrl) ? (
                      <video
                        src={mediaUrl}
                        controls
                        className="mt-2 w-full max-w-md aspect-video rounded-xl border border-slate-200 bg-black"
                      />
                    ) : null}
                  </div>

                  {/* 3b. Thư viện ảnh (chọn nhiều ảnh từ máy tính) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ImagePlus size={13} className="text-emerald-600" />
                        Thư viện ảnh
                        <span className="text-[11px] font-semibold text-slate-400">
                          ({imageUrls.length}/{IMAGE_MAX_COUNT})
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Chọn nhiều ảnh từ máy, PNG / JPG / WEBP, tối đa 10MB mỗi ảnh
                      </span>
                    </label>

                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      hidden
                      onChange={handleImageFiles}
                    />

                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                      {imageUrls.map((url, idx) => (
                        <div
                          key={url}
                          className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                          {idx === 0 && (
                            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold">
                              Ảnh đầu
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(url)}
                            disabled={uploadingImage || actionLoading}
                            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-white/90 hover:bg-white text-rose-600 shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-60"
                            title="Bỏ ảnh này"
                            aria-label={`Bỏ ảnh ${idx + 1}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}

                      {imageUrls.length < IMAGE_MAX_COUNT && (
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={uploadingImage || actionLoading}
                          className="aspect-square rounded-xl border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50 text-emerald-700 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                          title="Chọn ảnh từ máy tính"
                        >
                          {uploadingImage ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <ImagePlus size={20} />
                          )}
                          <span className="text-[11px] font-bold">
                            {uploadingImage ? "Đang tải..." : "Thêm ảnh"}
                          </span>
                        </button>
                      )}
                    </div>

                    {imageError && (
                      <p className="text-[11px] font-semibold text-rose-600">{imageError}</p>
                    )}
                  </div>

                  {/* 4. Mô tả ngắn gọn */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Mô tả ngắn
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={DESCRIPTION_MAX}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full pl-3.5 pr-16 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all"
                      />
                      <CharCounter value={description} max={DESCRIPTION_MAX} className="top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* 5. Kịch bản chi tiết / Lời bình thuyết minh */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Nội dung thuyết minh / câu chuyện chi tiết
                    </label>
                    <div className="relative">
                      <textarea
                        rows={5}
                        maxLength={CONTENT_TEXT_MAX}
                        value={contentText}
                        onChange={(e) => setContentText(e.target.value)}
                        className="w-full px-3.5 pt-2 pb-6 text-xs bg-white border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all leading-relaxed"
                      />
                      <CharCounter value={contentText} max={CONTENT_TEXT_MAX} className="bottom-2" />
                    </div>
                  </div>

                  {formError && (
                    <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center gap-2">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{formError}</span>
                    </p>
                  )}
                </form>
              </div>

              {/* Form Footer Actions */}
              <div className="shrink-0 px-6 sm:px-8 py-3.5 bg-white border-t border-slate-200/80 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  form="cultural-content-form"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm shadow-emerald-600/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>{editingContent ? "Lưu thay đổi" : "Lưu nội dung"}</span>
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================
                VIEW 2: MÀN HÌNH DANH SÁCH THUYẾT MINH
                ======================================================== */
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Action Bar (Tabs Đang phát hành / Thùng rác + Nút Thêm mới) */}
              <div className="shrink-0 px-6 sm:px-8 py-3.5 bg-slate-50/70 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Tab Đang hoạt động */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab("active")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentTab === "active"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Headphones size={13} />
                    <span>Nội dung</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[11px] ${
                        currentTab === "active"
                          ? "bg-white/20 text-white"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {activeContents.length}
                    </span>
                  </button>

                  {/* Tab Thùng rác */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab("trash")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentTab === "trash"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Trash2 size={13} />
                    <span>Thùng rác</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[11px] ${
                        currentTab === "trash"
                          ? "bg-white/20 text-white"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {deletedContents.length}
                    </span>
                  </button>
                </div>

              </div>

              {/* BỘ LỌC ĐỊNH DẠNG (POP-UP BẤM XỔ XUỐNG) & TÌM KIẾM */}
              <div className="shrink-0 px-6 sm:px-8 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Pop-up bấm xổ xuống chọn định dạng */}
                <div className="relative" ref={filterDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
                    className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
                  >
                    <ActiveFilterIcon size={14} className="text-emerald-600" />
                    <span>
                      {activeFilterConfig
                        ? activeFilterConfig.label
                        : `Tất cả định dạng (${currentList.length})`}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform ${
                        isFilterDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu Xổ Xuống */}
                  {isFilterDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterType("ALL");
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          filterType === "ALL"
                            ? "bg-emerald-50 text-emerald-700 font-semibold"
                            : "hover:bg-slate-50 text-slate-700 font-bold"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Filter size={13} className="text-slate-400" />
                          <span>Tất cả loại nội dung</span>
                        </div>
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                          {currentList.length}
                        </span>
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      {CONTENT_TYPES.map((ct) => {
                        const Icon = ct.icon;
                        const count = currentList.filter((c) => c.contentType === ct.type).length;
                        const isSelected = filterType === ct.type;
                        return (
                          <button
                            key={ct.type}
                            type="button"
                            onClick={() => {
                              setFilterType(ct.type);
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-emerald-50 text-emerald-700 font-semibold"
                                : "hover:bg-slate-50 text-slate-700 font-bold"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon
                                size={13}
                                className={isSelected ? "text-emerald-600" : "text-slate-400"}
                              />
                              <span>{ct.label}</span>
                            </div>
                            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Ô tìm kiếm từ khóa */}
                <div className="relative sm:w-64">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo tiêu đề, mô tả..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-emerald-500 transition-all font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* DANH SÁCH THUYẾT MINH (Scrollable Body) */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-3 bg-slate-50/40 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                {loading ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 size={32} className="animate-spin text-emerald-600" />
                    <p className="text-xs font-bold">Đang tải danh sách nội dung...</p>
                  </div>
                ) : displayedContents.length === 0 ? (
                  <div className="py-16 text-center max-w-md mx-auto space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                      <Headphones size={26} />
                    </div>

                    <div>
                      {/* Tiêu đề Empty State thông minh theo ngữ cảnh */}
                      <h4 className="font-semibold text-slate-800 text-sm">
                        {currentTab === "trash"
                          ? "Thùng rác đang trống"
                          : currentList.length === 0
                          ? "Điểm đến này chưa có nội dung văn hóa nào"
                          : "Không tìm thấy nội dung phù hợp với bộ lọc"}
                      </h4>

                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {currentTab === "trash"
                          ? "Chưa có nội dung nào bị xóa."
                          : currentList.length === 0
                          ? "Thêm audio thuyết minh, video hoặc câu chuyện đầu tiên để du khách khám phá điểm đến này."
                          : `Đang lọc theo "${activeFilterConfig?.label || "Bộ lọc"}". Hiện có ${currentList.length} nội dung ở các danh mục khác.`}
                      </p>
                    </div>

                    {/* Nút hành động trong Empty State */}
                    {currentTab === "active" && (
                      <div className="pt-2">
                        {currentList.length === 0 ? (
                          <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>Thêm nội dung đầu tiên</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setFilterType("ALL");
                              setSearchQuery("");
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                          >
                            <span>Xem tất cả ({currentList.length}) nội dung</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {displayedContents.map((content) => {
                      const typeCfg =
                        CONTENT_TYPES.find((ct) => ct.type === content.contentType) ||
                        CONTENT_TYPES[0];
                      const Icon = typeCfg.icon;
                      const isPlaying = playingId === content.id;

                      // Nhận diện xem nội dung là Video (hoặc liên kết YouTube / Video file)
                      const ytEmbed = getYouTubeEmbedUrl(content.mediaUrl);
                      const isVideo =
                        content.contentType === "VIDEO" ||
                        isDirectVideoUrl(content.mediaUrl) ||
                        Boolean(ytEmbed);

                      return (
                        <div
                          key={content.id}
                          className={`group bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-2xs hover:shadow-md flex flex-col justify-between gap-3 relative overflow-hidden ${
                            isPlaying
                              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20"
                              : content.deleted
                              ? "border-rose-200 bg-rose-50/30"
                              : "border-slate-200 hover:border-emerald-300"
                          }`}
                        >
                          {/* Top: Sequence Order + Badge + PlayCount */}
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-emerald-100 text-slate-700 group-hover:text-emerald-700 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 transition-colors">
                                  #{content.sequenceOrder || 0}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${typeCfg.badgeClass}`}
                                >
                                  <Icon size={11} />
                                  <span>{typeCfg.label}</span>
                                </span>
                                {(() => {
                                  const st = content.reviewStatus;
                                  const cfg =
                                    st === "PENDING"
                                      ? { label: "Chờ duyệt", cls: "bg-amber-50 text-amber-700 border-amber-200" }
                                      : st === "REJECTED"
                                      ? { label: "Bị từ chối", cls: "bg-rose-50 text-rose-700 border-rose-200" }
                                      : { label: "Đã duyệt", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
                                  return (
                                    <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                                      {cfg.label}
                                    </span>
                                  );
                                })()}
                              </div>

                              {/* Số lượt nghe/xem playCount */}
                              <div
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200/80"
                                title="Số lượt du khách đã nghe / xem"
                              >
                                <Volume2 size={11} className="text-emerald-600" />
                                <span>{content.playCount || 0} lượt xem</span>
                              </div>
                            </div>

                            {/* Title */}
                            <h4 className="text-base font-semibold text-slate-900 tracking-tight mt-2.5 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                              {content.title}
                            </h4>

                            {/* Description */}
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {content.description ||
                                content.contentText ||
                                "Chưa có mô tả ngắn."}
                            </p>
                          </div>

                          {/* Bottom Info & Action Buttons */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                            {/* Thời lượng */}
                            <div className="flex items-center gap-3 text-slate-500 font-medium text-[11px]">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock size={12} className="text-slate-400" />
                                <span>
                                  {content.duration ? formatDuration(content.duration) : "Không giới hạn"}
                                </span>
                              </span>
                              {Array.isArray(content.imageUrls) && content.imageUrls.length > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <ImagePlus size={12} className="text-slate-400" />
                                  <span>{content.imageUrls.length} ảnh</span>
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5">
                              {/* Nút phát / xem thử thông minh */}
                              {content.mediaUrl && !content.deleted && (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePlay(content)}
                                  className={`px-3 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 ${
                                    isPlaying
                                      ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                                      : isVideo
                                      ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  }`}
                                  title={
                                    isPlaying
                                      ? "Dừng phát"
                                      : isVideo
                                      ? "Xem video tư liệu / YouTube trực tiếp"
                                      : "Nghe thử thuyết minh"
                                  }
                                >
                                  {isPlaying ? (
                                    <>
                                      <Pause size={12} />
                                      <span>Dừng</span>
                                    </>
                                  ) : isVideo ? (
                                    <>
                                      <Video size={12} className="text-rose-600" />
                                      <span>Xem video</span>
                                    </>
                                  ) : (
                                    <>
                                      <Play size={12} fill="currentColor" />
                                      <span>Nghe thử</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Chỉ có ảnh, không có video/audio: mở trình xem thư viện ảnh */}
                              {!content.mediaUrl && !content.deleted && content.imageUrls?.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewMediaTarget(content)}
                                  className="px-3 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  title="Xem thư viện ảnh"
                                >
                                  <ImagePlus size={12} />
                                  <span>Xem ảnh</span>
                                </button>
                              )}


                              {content.deleted ? (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDialog({ type: "restore", content })}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Khôi phục nội dung này"
                                >
                                  <RotateCcw size={12} />
                                  <span>Khôi phục</span>
                                </button>
                              ) : (
                                <>
                                  {content.reviewStatus !== "PENDING" && content.reviewStatus !== "APPROVED" && (
                                    <button
                                      type="button"
                                      onClick={() => handleSubmitForModeration(content)}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/90 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs disabled:opacity-50"
                                      title="Gửi nội dung này cho Ban Thẩm định duyệt"
                                    >
                                      <Send size={11} className="text-amber-700" />
                                      <span>Gửi duyệt</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleOpenHistory(content)}
                                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                    title="Xem lịch sử thẩm định & phản hồi"
                                  >
                                    <History size={14} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(content)}
                                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                    title="Chỉnh sửa nội dung"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDialog({ type: "delete", content })}
                                    className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Chuyển vào thùng rác"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {currentTab === "active" && (
                    <button
                      type="button"
                      onClick={handleOpenCreate}
                      className="w-full py-3 rounded-2xl border-2 border-dashed border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-emerald-700 font-bold text-xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus size={14} strokeWidth={2.4} />
                      <span>Thêm nội dung mới</span>
                    </button>
                  )}
                  </div>
                )}
              </div>

              {/* FOOTER MODAL */}
              <div className="shrink-0 px-6 sm:px-8 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Tổng cộng <strong>{activeContents.length} nội dung văn hóa</strong> ({deletedContents.length} trong thùng rác).
                </span>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              POP-UP TRÌNH PHÁT MEDIA CHUYÊN DỤNG (YOUTUBE / VIDEO / AUDIO)
              ======================================================== */}
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
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
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
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/70">
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

                {/* Vùng cuộn chung: video chính, thư viện ảnh, mô tả */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                {/* Player Frame: YouTube iFrame hoặc Video Player */}
                {previewMediaTarget.mediaUrl && (
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
                    <div className="w-full py-8 px-6 rounded-2xl bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 text-white flex flex-col items-center gap-4 text-center border border-white/10">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/20">
                        <Headphones size={32} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{previewMediaTarget.title}</p>
                        <p className="text-xs text-slate-400 mt-1">Audio thuyết minh</p>
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
                )}

                <PreviewGallery key={previewMediaTarget.id} images={previewMediaTarget.imageUrls} title={previewMediaTarget.title} />

                {/* Thông tin mô tả & Kịch bản */}
                <div className="p-5 sm:p-6 bg-white space-y-3">
                  {previewMediaTarget.description && (
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 mb-1">
                        Mô tả ngắn
                      </h5>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {previewMediaTarget.description}
                      </p>
                    </div>
                  )}

                  {previewMediaTarget.contentText && (
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 mb-1">
                        Nội dung chi tiết
                      </h5>
                      <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed whitespace-pre-wrap">
                        {previewMediaTarget.contentText}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                    {previewMediaTarget.mediaUrl ? (
                    <a
                      href={previewMediaTarget.mediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1.5"
                    >
                      <span>Mở liên kết media trong tab mới</span>
                      <ExternalLink size={12} />
                    </a>
                    ) : <span />}
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
            </div>
          )}

          {/* ========================================================
              CONFIRM DIALOG (XÓA MỀM & KHÔI PHỤC)
              ======================================================== */}
          {confirmDialog && (
            <div
              className="fixed inset-0 z-80 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
              onClick={() => setConfirmDialog(null)}
            >
              <div
                className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      confirmDialog.type === "delete"
                        ? "bg-rose-50 text-rose-600 border border-rose-200"
                        : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    }`}
                  >
                    {confirmDialog.type === "delete" ? (
                      <Trash2 size={18} />
                    ) : (
                      <RotateCcw size={18} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {confirmDialog.type === "delete"
                        ? "Chuyển nội dung vào thùng rác?"
                        : "Khôi phục nội dung?"}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {confirmDialog.content?.title}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {confirmDialog.type === "delete"
                    ? "Nội dung này sẽ được chuyển vào thùng rác và tạm ẩn với du khách. Bạn có thể khôi phục lại bất kỳ lúc nào."
                    : "Nội dung này sẽ trở lại danh sách và tiếp tục hiển thị cho du khách."}
                </p>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setConfirmDialog(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={
                      confirmDialog.type === "delete"
                        ? handleExecuteDelete
                        : handleExecuteRestore
                    }
                    className={`px-4 py-2 text-xs font-bold rounded-xl text-white transition-all cursor-pointer disabled:opacity-50 ${
                      confirmDialog.type === "delete"
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {actionLoading ? (
                      <Loader2 size={14} className="animate-spin inline" />
                    ) : confirmDialog.type === "delete" ? (
                      "Xác nhận xóa"
                    ) : (
                      "Xác nhận khôi phục"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              HISTORY & REJECTION REASONS MODAL
              ======================================================== */}
          {historyTarget && (
            <div
              className="fixed inset-0 z-85 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
              onClick={handleCloseHistory}
            >
              <div
                className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                      <History size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 tracking-tight">
                        Lịch sử kiểm duyệt
                      </h4>
                      <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">
                        {historyTarget.title}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseHistory}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3.5 [scrollbar-width:thin]">
                  {historyLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 size={24} className="animate-spin text-emerald-600" />
                      <p className="text-xs font-bold">Đang tải lịch sử thẩm định...</p>
                    </div>
                  ) : historyError ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertCircle size={14} className="text-amber-600" />
                        <span>Chưa có biên bản thẩm định</span>
                      </p>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        Nội dung này chưa được gửi kiểm duyệt hoặc đang ở trạng thái bản nháp của Đối tác.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Trạng thái hiện tại */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">Trạng thái hiện tại:</span>
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
                              : "Đang chờ thẩm định"}
                          </span>
                        </span>
                      </div>

                      {/* Phản hồi từ chối (nếu có) */}
                      {historyData?.status === "REJECTED" && (historyData.reason || historyData.decisionNote) && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                            <AlertTriangle size={14} className="text-rose-600" />
                            <span>Lý do từ chối từ Ban Thẩm định:</span>
                          </div>

                          {historyData.reason && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {historyData.reason.split(",").map((code) => {
                                const trimmed = code.trim();
                                const label = REJECTION_LABELS[trimmed] || trimmed;
                                return (
                                  <span
                                    key={trimmed}
                                    className="px-2 py-0.5 rounded-lg bg-white border border-rose-200 text-rose-700 font-semibold text-[11px]"
                                  >
                                    {label}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {historyData.otherReason && (
                            <p className="text-xs text-rose-800 bg-white/80 p-2 rounded-lg border border-rose-150 leading-relaxed font-medium">
                              <span className="font-bold">Ghi chú cụ thể:</span> {historyData.otherReason}
                            </p>
                          )}

                          {historyData.decisionNote && (
                            <p className="text-xs text-slate-700 italic">
                              &ldquo;{historyData.decisionNote}&rdquo;
                            </p>
                          )}
                        </div>
                      )}

                      {/* Dòng thời gian các sự kiện */}
                      {Array.isArray(historyData?.history) && historyData.history.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <h5 className="text-xs font-bold text-slate-400">
                            Dòng thời gian thẩm định
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
                                      ? "Đã phê duyệt xuất bản"
                                      : "Đã từ chối hồ sơ"}
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-400">
                                    {evt.createdAt ? new Date(evt.createdAt).toLocaleString("vi-VN") : "—"}
                                  </span>
                                </div>
                                {evt.actorName && (
                                  <p className="text-[11px] text-slate-500 font-medium">
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

                {/* Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleCloseHistory}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
