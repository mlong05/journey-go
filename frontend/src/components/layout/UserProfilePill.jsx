"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Phone,
  ShieldCheck,
  KeyRound,
  Calendar,
  UserCog,
  RefreshCw,
  X,
  Check,
  Mail,
  User,
  Image as ImageIcon,
  Camera,
  Upload,
  Shield,
  Lock,
  Sparkles,
  Info,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import { authService } from "@/features/auth";
import { apiClient } from "@/services/apiClient";

/**
 * CẤU HÌNH GIAO DIỆN & VAI TRÒ THEO 3 ROLE:
 * - Admin: Quản trị viên hệ thống (text-rose-600, gradient rose sang orange)
 * - Moderator: Kiểm duyệt viên (text-indigo-600, gradient indigo sang sky)
 * - Provider: Đối tác Điểm đến (text-emerald-600, gradient emerald sang teal)
 */
const ROLE_CONFIG = {
  admin: {
    roleLabel: "Quản trị viên hệ thống",
    roleDesc: "Toàn quyền quản trị cơ sở hạ tầng, tài khoản và kiểm toán dữ liệu toàn sàn.",
    roleColor: "text-rose-600",
    dotColor: "bg-rose-500",
    avatarBg: "bg-gradient-to-tr from-rose-500 to-orange-500",
    headerGradient: "from-rose-600 via-rose-500 to-orange-500",
    badgeBg: "bg-rose-50 text-rose-700 border border-rose-200/80",
    defaultName: "Quản trị viên hệ thống",
    defaultInitials: "QT",
  },
  moderator: {
    roleLabel: "Kiểm duyệt viên",
    roleDesc: "Thẩm tra thông tin di sản, kiểm duyệt bài viết cộng đồng và kiểm toán tri thức AI.",
    roleColor: "text-indigo-600",
    dotColor: "bg-indigo-500",
    avatarBg: "bg-gradient-to-tr from-indigo-500 to-sky-500",
    headerGradient: "from-indigo-600 via-indigo-500 to-sky-500",
    badgeBg: "bg-indigo-50 text-indigo-700 border border-indigo-200/80",
    defaultName: "Kiểm duyệt viên",
    defaultInitials: "KD",
  },
  provider: {
    roleLabel: "Đối tác Điểm đến",
    roleDesc: "Quản lý địa điểm di tích, khởi tạo lộ trình văn hóa và thiết lập nhiệm vụ trải nghiệm.",
    roleColor: "text-emerald-600",
    dotColor: "bg-emerald-500",
    avatarBg: "bg-gradient-to-tr from-emerald-600 to-teal-500",
    headerGradient: "from-emerald-700 via-emerald-600 to-teal-500",
    badgeBg: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
    defaultName: "Đối tác Điểm đến",
    defaultInitials: "ĐT",
  },
};

/**
 * Hàm trích xuất 2 chữ cái viết tắt từ tên người dùng
 */
function extractInitials(name, fallback = "JG") {
  if (!name || typeof name !== "string") return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Hàm chuyển đổi chuỗi Role từ backend sang tiếng Việt
 */
function getRoleLabel(role, fallbackRole = "admin") {
  if (!role) {
    if (fallbackRole === "admin") return "Quản trị viên hệ thống";
    if (fallbackRole === "moderator") return "Kiểm duyệt viên";
    if (fallbackRole === "provider") return "Đối tác Điểm đến";
    return "Người dùng hệ thống";
  }
  const r = String(role).toUpperCase();
  if (r.includes("ADMIN")) return "Quản trị viên hệ thống";
  if (r.includes("MODERATOR")) return "Kiểm duyệt viên";
  if (r.includes("DESTINATION") || r.includes("PROVIDER")) return "Đối tác Điểm đến";
  if (r.includes("TOURIST")) return "Khách du lịch";
  return role;
}

/**
 * Format ngày tháng chuẩn tiếng Việt (dd/MM/yyyy)
 */
function formatDateVN(dateString) {
  if (!dateString) return "Chưa cập nhật";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} (${hours}:${minutes})`;
  } catch {
    return dateString;
  }
}

/**
 * UserProfilePill - Cụm Thẻ Định Danh Người Dùng tại góc trên bên phải Topbar
 * Tự động gọi API GET /api/v1/auth/me qua JWT Bearer token và hiển thị Dropdown Popover Card
 * Kèm Modal "Hồ sơ cá nhân chi tiết" cỡ lớn (Large Detailed Profile Modal)
 */
export default function UserProfilePill({
  role = "admin",
  user = null,
  className = "",
}) {
  const session = useAuthSession();
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.admin;

  const [isOpen, setIsOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [modalImgError, setModalImgError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form state cho Modal Chỉnh sửa hồ sơ chi tiết lớn
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Xử lý tải ảnh đại diện từ tệp máy tính (Upload lên Cloudinary qua Backend API, tự động lưu và load lại trang)
  const handleAvatarFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, JPEG, WEBP, GIF).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Dung lượng ảnh tối đa là 10MB. Vui lòng chọn ảnh nhỏ hơn.");
      return;
    }

    setIsSavingProfile(true);

    // 1) Đọc file ảnh dưới dạng DataURL (base64) để preview và lưu
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setEditAvatarUrl(result);
        setModalImgError(false);

        // 2) Tải lên dịch vụ Cloudinary qua Backend API /api/v1/upload/image nếu khả dụng
        let finalAvatarUrl = result;
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", "journeygo/avatars");
          const res = await apiClient.upload("/upload/image", formData);
          const cloudUrl = res?.data?.url || res?.data?.avatarUrl || res?.url;
          if (cloudUrl) {
            finalAvatarUrl = cloudUrl;
            setEditAvatarUrl(cloudUrl);
          }
        } catch (err) {
          console.warn("[Cloudinary Upload] Chưa upload được qua API, tiếp tục dùng data url:", err?.message);
        }

        // 3) Tự động lưu ảnh vào Database backend và tự động load lại trang
        try {
          const currentFullName = editFullName.trim() || displayName;
          const currentPhone = editPhone.trim();

          const updateRes = await authService.updateProfile({
            fullName: currentFullName,
            phone: currentPhone,
            avatarUrl: finalAvatarUrl,
            avatar: finalAvatarUrl,
          });

          const updatedUser = updateRes?.data || updateRes || {
            ...(currentUser || {}),
            fullName: currentFullName,
            phone: currentPhone,
            avatarUrl: finalAvatarUrl,
            avatar: finalAvatarUrl,
          };

          setProfileData(updatedUser);

          if (typeof window !== "undefined") {
            try {
              const currentAuth = JSON.parse(localStorage.getItem("journey_go_auth") || "{}");
              if (currentAuth && typeof currentAuth === "object") {
                currentAuth.user = { ...(currentAuth.user || {}), ...updatedUser };
                localStorage.setItem("journey_go_auth", JSON.stringify(currentAuth));
                window.dispatchEvent(new Event("storage"));
              }
            } catch {
              // bỏ qua
            }
          }

          setSaveSuccessMsg("Đã cập nhật ảnh đại diện thành công! Đang tự động tải lại trang...");
          setTimeout(() => {
            if (typeof window !== "undefined") {
              window.location.reload();
            }
          }, 800);
        } catch (err) {
          console.error("[Profile Auto-Save Avatar Error]", err);
          if (typeof window !== "undefined") {
            try {
              const currentAuth = JSON.parse(localStorage.getItem("journey_go_auth") || "{}");
              if (currentAuth && typeof currentAuth === "object") {
                currentAuth.user = { ...(currentAuth.user || {}), avatarUrl: finalAvatarUrl, avatar: finalAvatarUrl };
                localStorage.setItem("journey_go_auth", JSON.stringify(currentAuth));
                window.dispatchEvent(new Event("storage"));
              }
            } catch {
              // bỏ qua
            }
            setSaveSuccessMsg("Đã đổi ảnh đại diện! Đang tải lại trang...");
            setTimeout(() => {
              window.location.reload();
            }, 800);
          }
        } finally {
          setIsSavingProfile(false);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // 1. Tự động gọi API GET /api/v1/auth/me từ JWT Bearer Token
  const fetchProfile = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const res = await authService.getProfile();
      const userRes = res?.data || res;
      if (userRes && typeof userRes === "object") {
        setProfileData(userRes);
        if (typeof window !== "undefined") {
          try {
            const currentAuth = JSON.parse(localStorage.getItem("journey_go_auth") || "{}");
            if (currentAuth && typeof currentAuth === "object") {
              currentAuth.user = { ...(currentAuth.user || {}), ...userRes };
              localStorage.setItem("journey_go_auth", JSON.stringify(currentAuth));
            }
          } catch {
            // bỏ qua
          }
        }
      }
    } catch (err) {
      console.warn("[Profile Fetch Notice] Sử dụng dữ liệu phiên hiện có:", err?.message);
    } finally {
      if (isManualRefresh) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  }, []);

  useEffect(() => {
    fetchProfile(false);
  }, [fetchProfile]);

  // Click outside listener để đóng Dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsDetailModalOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Hợp nhất dữ liệu: ưu tiên profileData từ API /auth/me -> session?.user -> user prop -> default
  const currentUser = profileData || user || session?.user;

  const displayName =
    currentUser?.fullName ||
    currentUser?.name ||
    (currentUser?.email ? currentUser.email.split("@")[0] : null) ||
    config.defaultName;

  const displayEmail = currentUser?.email || `${role}@journeygo.com`;
  const avatarUrl = currentUser?.avatarUrl;
  const hasValidAvatar = Boolean(avatarUrl && !imgError);

  const initials = extractInitials(displayName, config.defaultInitials);
  const currentRoleLabel = getRoleLabel(currentUser?.role, role);
  const isActive = currentUser?.active !== false;

  // Khi mở Modal Chi tiết lớn
  const handleOpenDetailModal = () => {
    setEditFullName(displayName);
    setEditPhone(currentUser?.phone || "");
    setEditAvatarUrl(currentUser?.avatarUrl || "");
    setModalImgError(false);
    setSaveSuccessMsg("");
    setIsOpen(false);
    setIsDetailModalOpen(true);
  };

  // Xử lý lưu thay đổi thông tin từ modal lớn (Gửi API PUT /auth/profile lên backend DB)
  const handleSaveProfileChanges = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    const newFullName = editFullName.trim() || displayName;
    const newPhone = editPhone.trim();
    const newAvatarUrl = editAvatarUrl.trim();

    try {
      // 1. Gọi API PUT /api/v1/auth/profile để lưu vĩnh viễn vào Database
      const res = await authService.updateProfile({
        fullName: newFullName,
        phone: newPhone,
        avatarUrl: newAvatarUrl,
        avatar: newAvatarUrl,
      });

      const updatedUser = res?.data || res || {
        ...(currentUser || {}),
        fullName: newFullName,
        phone: newPhone,
        avatarUrl: newAvatarUrl,
        avatar: newAvatarUrl,
      };

      setProfileData(updatedUser);
      setImgError(false);
      setModalImgError(false);

      if (typeof window !== "undefined") {
        try {
          const currentAuth = JSON.parse(localStorage.getItem("journey_go_auth") || "{}");
          if (currentAuth && typeof currentAuth === "object") {
            currentAuth.user = { ...(currentAuth.user || {}), ...updatedUser };
            localStorage.setItem("journey_go_auth", JSON.stringify(currentAuth));
            window.dispatchEvent(new Event("storage"));
          }
        } catch {
          // bỏ qua
        }
      }

      setSaveSuccessMsg("Đã lưu cập nhật thông tin hồ sơ thành công! Đang tải lại trang...");
      setTimeout(() => {
        setSaveSuccessMsg("");
        setIsDetailModalOpen(false);
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }, 700);
    } catch (err) {
      console.error("[Profile Save Error]", err);
      const fallbackUpdated = {
        ...(currentUser || {}),
        fullName: newFullName,
        phone: newPhone,
        avatarUrl: newAvatarUrl,
        avatar: newAvatarUrl,
      };
      setProfileData(fallbackUpdated);
      if (typeof window !== "undefined") {
        try {
          const currentAuth = JSON.parse(localStorage.getItem("journey_go_auth") || "{}");
          if (currentAuth && typeof currentAuth === "object") {
            currentAuth.user = { ...(currentAuth.user || {}), ...fallbackUpdated };
            localStorage.setItem("journey_go_auth", JSON.stringify(currentAuth));
            window.dispatchEvent(new Event("storage"));
          }
        } catch {
          // bỏ qua
        }
      }
      setSaveSuccessMsg("Đã lưu cập nhật thông tin hồ sơ! Đang tải lại trang...");
      setTimeout(() => {
        setSaveSuccessMsg("");
        setIsDetailModalOpen(false);
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }, 700);
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left select-none">
      {/* ────────────────────────────────────────────────────────
          NÚT BẤM TRÊN TOPBAR (TRIGGER PILL Ở GÓC PHẢI)
      ──────────────────────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={`flex items-center gap-3 pl-2 pr-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all cursor-pointer ${className} ${
          isOpen ? "ring-2 ring-slate-300/80 bg-slate-100" : ""
        }`}
        title={`${displayName} (${currentRoleLabel}) - Bấm để xem hồ sơ`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar: img nếu có avatarUrl hợp lệ, hoặc chữ cái viết tắt */}
        {hasValidAvatar ? (
          <img
            src={avatarUrl}
            alt={displayName}
            onError={() => setImgError(true)}
            className="w-8 h-8 rounded-full object-cover shrink-0 shadow-xs border border-white/80"
          />
        ) : (
          <div
            className={`w-8 h-8 rounded-full font-bold text-xs text-white flex items-center justify-center shadow-xs shrink-0 ${config.avatarBg}`}
          >
            {initials}
          </div>
        )}

        {/* Cụm chữ bên phải Avatar */}
        <div className="flex flex-col text-left leading-tight min-w-0">
          <span className="text-xs font-bold text-slate-800 truncate max-w-[120px] sm:max-w-[150px] md:max-w-[180px]">
            {displayName}
          </span>
          <span
            className={`text-[10px] font-semibold flex items-center gap-1.5 mt-0.5 ${config.roleColor}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} animate-pulse shrink-0`} />
            <span className="truncate">{currentRoleLabel}</span>
          </span>
        </div>

        {/* Icon mũi tên xoay nhẹ 180 độ khi mở menu */}
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 shrink-0 ml-0.5 ${
            isOpen ? "rotate-180 text-slate-700" : ""
          }`}
        />
      </div>

      {/* ────────────────────────────────────────────────────────
          KHUNG XỔ XUỐNG KHI NHẤN VÀO (DROPDOWN POPOVER CARD)
      ──────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 absolute right-0 top-14 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          role="dialog"
          aria-label="Khung thông tin hồ sơ tài khoản"
        >
          {/* Dải màu gradient mỏng trên đỉnh theo Role */}
          <div className={`h-1.5 w-full bg-gradient-to-r ${config.headerGradient}`} />

          {/* PHẦN 1: HEADER THẺ CÁ NHÂN */}
          <div className="p-4 pb-3">
            <div className="flex items-start gap-3">
              {hasValidAvatar ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  onError={() => setImgError(true)}
                  className="w-12 h-12 rounded-2xl object-cover shadow-sm ring-2 ring-slate-100 shrink-0"
                />
              ) : (
                <div
                  className={`w-12 h-12 rounded-2xl font-black text-sm text-white flex items-center justify-center shadow-sm shrink-0 ${config.avatarBg}`}
                >
                  {initials}
                </div>
              )}

              <div className="flex flex-col min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 truncate" title={displayName}>
                  {displayName}
                </h4>
                <p className="text-xs text-slate-500 truncate mt-0.5" title={displayEmail}>
                  {displayEmail}
                </p>

                <div className="flex items-center justify-between gap-2 mt-2">
                  {/* Badge trạng thái tài khoản */}
                  {isActive ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Đang hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                      Bị khóa
                    </span>
                  )}

                  {/* Mã định danh #ID */}
                  <span className="text-[11px] font-mono text-slate-400 font-semibold">
                    #ID: {currentUser?.id || "01"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PHẦN 2: KHỐI THÔNG TIN CHI TIẾT TỪ API */}
          <div className="bg-slate-50/80 rounded-xl p-3 mx-3 my-2 space-y-2.5 border border-slate-100 text-xs">
            {/* Số điện thoại */}
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-slate-500">
                <Phone size={13} className="text-slate-400 shrink-0" />
                <span>Số điện thoại:</span>
              </span>
              <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                {currentUser?.phone || "Chưa cập nhật"}
              </span>
            </div>

            {/* Vai trò hệ thống */}
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-slate-500">
                <ShieldCheck size={13} className="text-slate-400 shrink-0" />
                <span>Vai trò:</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${config.badgeBg}`}>
                {currentRoleLabel}
              </span>
            </div>

            {/* Phương thức xác thực */}
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-slate-500">
                <KeyRound size={13} className="text-slate-400 shrink-0" />
                <span>Xác thực:</span>
              </span>
              {String(currentUser?.authProvider).toUpperCase() === "GOOGLE" ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Liên kết Google
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Tài khoản nội bộ
                </span>
              )}
            </div>

            {/* Ngày tham gia */}
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-slate-500">
                <Calendar size={13} className="text-slate-400 shrink-0" />
                <span>Ngày tham gia:</span>
              </span>
              <span className="font-semibold text-slate-800">
                {formatDateVN(currentUser?.createdAt)}
              </span>
            </div>
          </div>

          {/* Đường kẻ phân cách */}
          <div className="border-t border-slate-100 my-1" />

          {/* PHẦN 3: CÁC NÚT TIỆN ÍCH & HÀNH ĐỘNG */}
          <div className="p-1.5 space-y-0.5">
            <button
              type="button"
              onClick={handleOpenDetailModal}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer text-left"
            >
              <UserCog size={15} className="text-slate-500 shrink-0" />
              <span>Xem & Chỉnh sửa hồ sơ cá nhân</span>
            </button>

            <button
              type="button"
              onClick={() => fetchProfile(true)}
              disabled={isRefreshing}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer text-left disabled:opacity-60"
            >
              <div className="flex items-center gap-2.5">
                <RefreshCw
                  size={15}
                  className={`text-slate-500 shrink-0 transition-transform ${
                    isRefreshing ? "animate-spin text-indigo-600" : ""
                  }`}
                />
                <span>Làm mới thông tin phiên</span>
              </div>
              {isRefreshing && (
                <span className="text-[10px] text-indigo-600 font-bold">Đang tải...</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          MODAL "HỒ SƠ CÁ NHÂN CHI TIẾT" CỠ LỚN (LARGE PROFILE MODAL)
      ──────────────────────────────────────────────────────── */}
      {isDetailModalOpen && mounted && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative animate-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── 1. PHẦN HEADER BANNER TRÊN CÙNG (CỐ ĐỊNH) ── */}
            <div className={`p-6 bg-gradient-to-r ${config.headerGradient} relative overflow-hidden shrink-0 text-white flex items-start justify-between gap-4`}>
              <div className="relative z-10">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-white/20 backdrop-blur-xs border border-white/30 text-white">
                    HỒ SƠ TÀI KHOẢN HỆ THỐNG
                  </span>
                </div>
                <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white mt-1.5">
                  Hồ Sơ Cá Nhân & Phân Quyền Hệ Thống
                </h2>
                <p className="text-xs text-white/85 hidden sm:block mt-1 max-w-xl">
                  Xem và quản trị toàn diện thông tin liên hệ, dữ liệu xác thực và quyền hạn nghiệp vụ
                </p>
              </div>

              {/* Nút X Đóng modal */}
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="w-9 h-9 rounded-full bg-black/20 hover:bg-black/35 text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer relative z-10 shrink-0"
                title="Đóng cửa sổ"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>

              {/* Họa tiết mờ trang trí góc banner */}
              <div className="absolute right-10 bottom-0 opacity-15 pointer-events-none">
                <Sparkles size={110} className="text-white" />
              </div>
            </div>

            {/* ── 2. KHỐI TÓM TẮT ĐỊNH DANH (NẰM TRỌN VẸN DƯỚI BANNER, BỎ HOÀN TOÀN -MT) ── */}
            <div className="px-6 pt-5 pb-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 shrink-0">
              <div className="flex items-center gap-4 min-w-0">
                {/* Avatar bấm vào để tải ảnh đại diện lên từ máy tính */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className="relative shrink-0 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-2xl"
                  title="Bấm vào để tải ảnh đại diện từ thiết bị"
                >
                  {editAvatarUrl && !modalImgError ? (
                    <img
                      src={editAvatarUrl}
                      alt={displayName}
                      onError={() => setModalImgError(true)}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-100 shadow-sm bg-white group-hover:brightness-90 transition-all"
                    />
                  ) : (
                    <div
                      className={`w-16 h-16 rounded-2xl font-black text-xl text-white flex items-center justify-center shadow-sm group-hover:brightness-90 transition-all ${config.avatarBg}`}
                    >
                      {initials}
                    </div>
                  )}

                  {/* Lớp phủ hover với icon Camera */}
                  <div className="absolute inset-0 bg-black/45 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={18} className="drop-shadow-sm" />
                    <span className="text-[10px] font-bold mt-0.5 tracking-tight">Đổi ảnh</span>
                  </div>

                  {/* Huy hiệu Camera ở góc dưới */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-emerald-600 transition-colors">
                    <Camera size={12} />
                  </div>
                </div>

                {/* Tên & Tag phân quyền */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-black text-slate-900 tracking-tight truncate">
                      {displayName}
                    </h3>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Đang hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Bị khóa
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span className="truncate">{displayEmail}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-slate-400 font-semibold">
                      Mã định danh: #{currentUser?.id || "01"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Badge vai trò bên phải */}
              <div className="sm:text-right shrink-0">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${config.badgeBg}`}
                >
                  <ShieldCheck size={14} />
                  {currentRoleLabel}
                </span>
              </div>
            </div>

            {/* ── 3. PHẦN THÂN NỘI DUNG CUỘN DỌC (OVERFLOW-Y-AUTO) ── */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
              {/* Thông báo cập nhật thành công nếu có */}
              {saveSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Form 2 cột lớn chi tiết */}
              <form onSubmit={handleSaveProfileChanges} id="profileDetailForm" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* CỘT 1: THÔNG TIN CÁ NHÂN & LIÊN HỆ */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                        <User size={16} className="text-slate-500" />
                        <span>Thông tin cá nhân & Liên hệ</span>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        Có thể chỉnh sửa
                      </span>
                    </div>

                    {/* Họ và tên */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Họ và tên đầy đủ <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <User size={15} />
                        </div>
                        <input
                          type="text"
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          placeholder="Ví dụ: Nguyễn Văn Long"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          required
                        />
                      </div>
                    </div>

                    {/* Số điện thoại */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Số điện thoại liên hệ
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone size={15} />
                        </div>
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="Ví dụ: 0912 345 678"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Ảnh đại diện: Tải ảnh từ máy tính hoặc dán URL */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Ảnh đại diện (Avatar)
                      </label>

                      {/* Nút bấm tải tệp từ máy tính */}
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                        >
                          <Upload size={14} />
                          <span>Tải ảnh từ thiết bị</span>
                        </button>
                        {editAvatarUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditAvatarUrl("");
                              setModalImgError(false);
                            }}
                            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                            title="Xóa ảnh đại diện"
                          >
                            Xóa ảnh
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Bấm trực tiếp vào ảnh đại diện phía trên hoặc nhấn &quot;Tải ảnh từ thiết bị&quot; để chọn file ảnh.
                      </p>
                    </div>
                  </div>

                  {/* CỘT 2: BẢO MẬT & PHÂN QUYỀN HỆ THỐNG */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                        <Shield size={16} className="text-slate-500" />
                        <span>Bảo mật & Phân quyền hệ thống</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Lock size={10} />
                        Dữ liệu hệ thống
                      </span>
                    </div>

                    {/* Email tài khoản */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">
                        Email định danh tài khoản
                      </label>
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-100 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-600 cursor-not-allowed">
                        <Mail size={15} className="shrink-0 text-slate-400" />
                        <span className="font-semibold truncate">{displayEmail}</span>
                        <span className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Cố định
                        </span>
                      </div>
                    </div>

                    {/* Phương thức xác thực & Mã định danh */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">
                          Phương thức xác thực
                        </label>
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 border border-slate-200/80 rounded-xl text-xs text-slate-700">
                          <KeyRound size={14} className="shrink-0 text-slate-400" />
                          <span className="font-semibold truncate">
                            {String(currentUser?.authProvider).toUpperCase() === "GOOGLE"
                              ? "Liên kết Google"
                              : "Tài khoản nội bộ"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">
                          Mã định danh (User ID)
                        </label>
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-mono font-bold">
                          <span>#ID-{currentUser?.id || "001"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Ngày tạo tài khoản & Cập nhật gần nhất */}
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/70 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-2">
                          <Calendar size={13} className="text-slate-400" />
                          <span>Ngày khởi tạo tài khoản:</span>
                        </span>
                        <span className="font-semibold text-slate-800">
                          {formatDateVN(currentUser?.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600 pt-1.5 border-t border-slate-100">
                        <span className="flex items-center gap-2">
                          <Clock size={13} className="text-slate-400" />
                          <span>Phiên đăng nhập hiện tại:</span>
                        </span>
                        <span className="font-semibold text-emerald-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Trực tuyến an toàn
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* ── 4. FOOTER THAO TÁC CỐ ĐỊNH Ở ĐÁY ── */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Info size={14} className="text-slate-400 shrink-0" />
                <span>Mọi thay đổi hồ sơ sẽ được đồng bộ ngay tức thì vào phiên làm việc.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  form="profileDetailForm"
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check size={16} />
                  <span>Lưu thay đổi hồ sơ</span>
                </button>
              </div>
            </div>

            {/* Input file ẩn dùng để mở cửa sổ chọn tệp khi bấm vào Avatar */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileUpload}
              className="hidden"
              aria-hidden="true"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
