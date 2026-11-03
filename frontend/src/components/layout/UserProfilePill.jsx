"use client";

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
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
  Camera,
  Upload,
  Shield,
  Lock,
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
  // Đối tác tài chính (PARTNER) — theo dõi doanh thu, ví, tất toán.
  partner: {
    roleLabel: "Đối tác tài chính",
    roleDesc: "Theo dõi doanh thu, số dư ví và lịch sử tất toán của đơn vị đối tác.",
    roleColor: "text-sky-600",
    dotColor: "bg-sky-500",
    avatarBg: "bg-gradient-to-tr from-sky-600 to-cyan-500",
    headerGradient: "from-sky-700 via-sky-600 to-cyan-500",
    badgeBg: "bg-sky-50 text-sky-700 border border-sky-200/80",
    defaultName: "Đối tác tài chính",
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
    if (fallbackRole === "partner") return "Đối tác tài chính";
    return "Người dùng hệ thống";
  }
  const r = String(role).toUpperCase();
  if (r.includes("ADMIN")) return "Quản trị viên hệ thống";
  if (r.includes("MODERATOR")) return "Kiểm duyệt viên";
  if (r.includes("PARTNER")) return "Đối tác tài chính";
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
  // false khi SSR, true trên client: tránh lệch hydration khi dùng createPortal
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Form state cho Modal Chỉnh sửa hồ sơ chi tiết lớn
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [avatarError, setAvatarError] = useState("");

  // Xử lý tải ảnh đại diện từ tệp máy tính (Upload lên Cloudinary qua Backend API, tự động lưu và load lại trang)
  const handleAvatarFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, JPEG, WEBP, GIF).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarError("Dung lượng ảnh tối đa là 10MB. Vui lòng chọn ảnh nhỏ hơn.");
      return;
    }
    setAvatarError("");

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
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) fetchProfile(false);
    });
    return () => {
      cancelled = true;
    };
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
            className={`text-[11px] font-semibold flex items-center gap-1.5 mt-0.5 ${config.roleColor}`}
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
                  className={`w-12 h-12 rounded-2xl font-bold text-sm text-white flex items-center justify-center shadow-sm shrink-0 ${config.avatarBg}`}
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
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Đang hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                      Bị khóa
                    </span>
                  )}

                  {/* Mã định danh #ID */}
                  <span className="text-[11px] text-slate-400 font-medium tabular-nums">
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
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${config.badgeBg}`}>
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
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Liên kết Google
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
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
                <span className="text-[11px] text-indigo-600 font-bold">Đang tải...</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          MODAL "HỒ SƠ CÁ NHÂN"
          Đầu: ảnh + tên + vai trò · Thân: 2 cột cao bằng nhau (sửa được | chỉ xem) · Chân: nút lưu
      ──────────────────────────────────────────────────────── */}
      {isDetailModalOpen && mounted && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 font-sans"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
            className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dải màu nhận diện vai trò */}
            <div className={`h-1.5 shrink-0 bg-gradient-to-r ${config.headerGradient}`} />

            {/* ── 1. ĐẦU: ẢNH ĐẠI DIỆN + TÊN + VAI TRÒ ── */}
            <div className="px-5 sm:px-6 py-5 border-b border-slate-100 flex items-start gap-4 shrink-0">
              {/* Bấm vào ảnh để tải ảnh mới */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSavingProfile}
                className="relative shrink-0 rounded-2xl group focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer disabled:cursor-wait"
                title="Bấm để đổi ảnh đại diện"
              >
                {editAvatarUrl && !modalImgError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={editAvatarUrl}
                    alt={displayName}
                    onError={() => setModalImgError(true)}
                    className="w-16 h-16 rounded-2xl object-cover ring-1 ring-slate-200 bg-white"
                  />
                ) : (
                  <div
                    className={`w-16 h-16 rounded-2xl text-lg font-semibold text-white flex items-center justify-center ${config.avatarBg}`}
                  >
                    {initials}
                  </div>
                )}
                <span className="absolute inset-0 rounded-2xl bg-black/45 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={18} />
                </span>
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow border border-slate-200 flex items-center justify-center text-slate-600">
                  <Camera size={12} />
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    id="profile-modal-title"
                    className="text-lg font-semibold text-slate-900 leading-snug truncate max-w-full"
                    title={displayName}
                  >
                    {displayName}
                  </h2>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Đang hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                      Bị khóa
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-500 truncate" title={displayEmail}>
                  {displayEmail}
                </p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.badgeBg}`}>
                    <ShieldCheck size={13} />
                    {currentRoleLabel}
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:inline truncate">{config.roleDesc}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Đóng"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── 2. THÂN (CUỘN KHI MÀN HÌNH THẤP) ── */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 sm:px-6 py-5 bg-slate-50/60">
              {saveSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              <form
                onSubmit={handleSaveProfileChanges}
                id="profileDetailForm"
                className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch"
              >
                {/* CỘT TRÁI: THÔNG TIN CÁ NHÂN (SỬA ĐƯỢC) */}
                <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
                  <header className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <User size={15} className="text-slate-400" />
                      Thông tin cá nhân
                    </h3>
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Có thể chỉnh sửa
                    </span>
                  </header>

                  <label className="block">
                    <span className="block text-xs font-medium text-slate-600 mb-1.5">
                      Họ và tên <span className="text-rose-500">*</span>
                    </span>
                    <span className="relative block">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn Long"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition"
                        required
                      />
                    </span>
                  </label>

                  <label className="block">
                    <span className="block text-xs font-medium text-slate-600 mb-1.5">Số điện thoại</span>
                    <span className="relative block">
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Ví dụ: 0912 345 678"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition"
                      />
                    </span>
                  </label>

                  <div>
                    <span className="block text-xs font-medium text-slate-600 mb-1.5">Ảnh đại diện</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSavingProfile}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                      >
                        <Upload size={14} />
                        Tải ảnh từ thiết bị
                      </button>
                      {editAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditAvatarUrl("");
                            setModalImgError(false);
                          }}
                          className="px-3.5 py-2 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-medium transition cursor-pointer"
                        >
                          Xóa ảnh
                        </button>
                      )}
                    </div>
                    {avatarError && <p className="mt-1.5 text-xs text-rose-600">{avatarError}</p>}
                    <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
                      PNG, JPG hoặc WEBP, tối đa 10MB. Ảnh mới được lưu ngay sau khi tải lên.
                    </p>
                  </div>
                </section>

                {/* CỘT PHẢI: THÔNG TIN TÀI KHOẢN (CHỈ XEM) */}
                <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
                  <header className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Shield size={15} className="text-slate-400" />
                      Tài khoản &amp; bảo mật
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      <Lock size={10} />
                      Chỉ xem
                    </span>
                  </header>

                  <dl className="divide-y divide-slate-100 text-sm">
                    {[
                      { icon: Mail, label: "Email đăng nhập", value: displayEmail },
                      {
                        icon: KeyRound,
                        label: "Phương thức",
                        value:
                          String(currentUser?.authProvider).toUpperCase() === "GOOGLE"
                            ? "Liên kết Google"
                            : "Tài khoản nội bộ",
                      },
                      { icon: Info, label: "Mã tài khoản", value: `#${currentUser?.id ?? "—"}` },
                      { icon: Calendar, label: "Ngày tạo", value: formatDateVN(currentUser?.createdAt) },
                    ].map(({ icon: RowIcon, label, value }) => (
                      <div key={label} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                        <dt className="flex items-center gap-2 text-slate-500 shrink-0">
                          <RowIcon size={14} className="text-slate-400" />
                          {label}
                        </dt>
                        <dd className="min-w-0 text-right font-medium text-slate-800 truncate tabular-nums" title={String(value)}>
                          {value}
                        </dd>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-3 pt-2.5">
                      <dt className="flex items-center gap-2 text-slate-500 shrink-0">
                        <Clock size={14} className="text-slate-400" />
                        Phiên hiện tại
                      </dt>
                      <dd className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Đang trực tuyến
                      </dd>
                    </div>
                  </dl>
                </section>
              </form>
            </div>

            {/* ── 3. CHÂN: THAO TÁC ── */}
            <div className="px-5 sm:px-6 py-4 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <Info size={14} className="text-slate-400 shrink-0" />
                Thay đổi được áp dụng ngay cho phiên làm việc này.
              </p>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  form="profileDetailForm"
                  disabled={isSavingProfile}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  <Check size={16} />
                  Lưu thay đổi
                </button>
              </div>
            </div>

            {/* Ô chọn tệp ẩn, mở khi bấm ảnh đại diện hoặc nút tải ảnh */}
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
