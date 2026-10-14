"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Shield,
  Lock,
  Sparkles,
  Info,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import { authService } from "@/features/auth";

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
  if (r.includes("USER") || r.includes("TOURIST")) return "Khách du lịch";
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

  // Form state cho Modal Chỉnh sửa hồ sơ chi tiết lớn
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  const containerRef = useRef(null);

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

  // Xử lý lưu thay đổi thông tin từ modal lớn
  const handleSaveProfileChanges = (e) => {
    e.preventDefault();
    const updated = {
      ...(currentUser || {}),
      fullName: editFullName.trim() || displayName,
      phone: editPhone.trim(),
      avatarUrl: editAvatarUrl.trim(),
    };
    setProfileData(updated);
    setImgError(false);
    setModalImgError(false);

    if (typeof window !== "undefined") {
      try {
        const currentAuth = JSON.parse(localStorage.getItem("journey_go_auth") || "{}");
        if (currentAuth && typeof currentAuth === "object") {
          currentAuth.user = { ...(currentAuth.user || {}), ...updated };
          localStorage.setItem("journey_go_auth", JSON.stringify(currentAuth));
        }
      } catch {
        // bỏ qua
      }
    }

    setSaveSuccessMsg("Đã lưu cập nhật thông tin hồ sơ thành công!");
    setTimeout(() => {
      setSaveSuccessMsg("");
      setIsDetailModalOpen(false);
    }, 1200);
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
      {isDetailModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 overflow-y-auto"
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
                  <span className="text-white/60">•</span>
                  <span className="text-xs font-medium text-white/90">JourneyGo Identity</span>
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
                {/* Avatar vuông bo góc w-14 h-14 rounded-2xl */}
                <div className="relative shrink-0">
                  {editAvatarUrl && !modalImgError ? (
                    <img
                      src={editAvatarUrl}
                      alt={displayName}
                      onError={() => setModalImgError(true)}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-100 shadow-sm bg-white"
                    />
                  ) : (
                    <div
                      className={`w-14 h-14 rounded-2xl font-black text-lg text-white flex items-center justify-center shadow-sm ${config.avatarBg}`}
                    >
                      {initials}
                    </div>
                  )}
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

              {/* Badge vai trò và mô tả bên phải */}
              <div className="sm:text-right shrink-0">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${config.badgeBg}`}
                >
                  <ShieldCheck size={14} />
                  {currentRoleLabel}
                </span>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs sm:ml-auto">
                  {config.roleDesc}
                </p>
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

                    {/* Đường dẫn Avatar URL */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Đường dẫn ảnh đại diện (Avatar URL)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <ImageIcon size={15} />
                        </div>
                        <input
                          type="url"
                          value={editAvatarUrl}
                          onChange={(e) => {
                            setEditAvatarUrl(e.target.value);
                            setModalImgError(false);
                          }}
                          placeholder="https://example.com/avatar.jpg"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Dán liên kết ảnh trực tiếp để đổi ảnh đại diện cá nhân trên hệ thống.
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
          </div>
        </div>
      )}
    </div>
  );
}
