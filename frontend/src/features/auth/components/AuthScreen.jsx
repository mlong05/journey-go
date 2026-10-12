"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Landmark,
  ShieldCheck,
  Crown,
  Compass,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  ChevronDown,
  Sparkles,
  PhoneCall,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  ArrowRight,
  Gift,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { authService } from "../services/authService";
import { STORAGE_KEYS } from "@/constants";

// ============================================================================
// DỮ LIỆU 3 DANH THẮNG DI SẢN TIÊU BIỂU (Hero Slideshow)
// ============================================================================
const SLIDE_ITEMS = [
  {
    id: "trangan",
    shortName: "Tràng An",
    name: "Tràng An - Ninh Bình",
    tag: "Di sản Kép Thế giới UNESCO",
    slogan: "Chạm vào Hành trình - Khám phá Di sản",
    subSlogan: "Quần thể danh thắng thiên nhiên & văn hoá kỳ vĩ giữa lòng cố đô Hoa Lư.",
    quote:
      "Nơi hội tụ trầm tích lịch sử ngàn năm, kết nối con người với thiên nhiên nguyên sơ, tạo tác nên tuyệt phẩm sơn thủy hữu tình.",
    statNumber: "3,500+ ha",
    statLabel: "Vùng lõi bảo tồn nghiêm ngặt",
    image:
      "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "hoian",
    shortName: "Hội An",
    name: "Phố Cổ Hội An - Quảng Nam",
    tag: "Di sản Văn hóa Thế giới",
    slogan: "Lung linh Đèn lồng - Dấu ấn Thương cảng",
    subSlogan: "Không gian kiến trúc cổ kính giao thoa tinh hoa văn hóa Á - Âu thế kỷ XVII.",
    quote:
      "Mỗi mái ngói rêu phong, mỗi góc phố cổ là một câu chuyện lịch sử sống động trường tồn cùng dòng sông Hoài thơ mộng.",
    statNumber: "400+ năm",
    statLabel: "Lịch sử thương cảng quốc tế",
    image:
      "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "vanmieu",
    shortName: "Văn Miếu",
    name: "Văn Miếu Quốc Tử Giám - Hà Nội",
    tag: "Di tích Quốc gia Đặc biệt",
    slogan: "Ngàn năm Văn hiến - Tinh hoa Đạo học",
    subSlogan: "Trường đại học đầu tiên của Việt Nam, nơi lưu giữ 82 bia tiến sĩ trứ danh.",
    quote:
      "Hiền tài là nguyên khí quốc gia, cội nguồn sức mạnh và hưng thịnh của dân tộc Việt Nam qua bao thăng trầm thời đại.",
    statNumber: "82 Bia",
    statLabel: "Di sản Tư liệu Thế giới UNESCO",
    image:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80",
  },
];

// ============================================================================
// DANH SÁCH VAI TRÒ HỆ THỐNG (Kết nối API xác thực & phân quyền JourneyGo)
// Hỗ trợ: Tourist, Provider, Moderator, Admin
// ============================================================================
const ROLES = [
  {
    id: "admin",
    roleEnum: "ADMIN",
    title: "Quản trị viên",
    scope: "Quản trị hệ thống & vận hành",
    icon: Crown,
    iconBg: "bg-amber-600 text-white",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
    redirectPath: "/admin",
    sampleEmail: "user@journeygo.com",
    samplePassword: "Password123@",
    desc: "Toàn quyền quản trị hệ thống, người dùng và kiểm toán",
  },
  {
    id: "moderator",
    roleEnum: "MODERATOR",
    title: "Kiểm duyệt viên",
    scope: "Thẩm định hồ sơ & nội dung",
    icon: ShieldCheck,
    iconBg: "bg-sky-600 text-white",
    badgeBg: "bg-sky-50 text-sky-800 border-sky-200",
    redirectPath: "/moderator",
    sampleEmail: "moderator@journeygo.com",
    samplePassword: "Password123@",
    desc: "Kiểm định chất lượng điểm di tích, giải quyết vi phạm",
  },
  {
    id: "provider",
    roleEnum: "PROVIDER",
    title: "Đối tác Điểm đến",
    scope: "Quản lý di tích & tour",
    icon: Landmark,
    iconBg: "bg-emerald-600 text-white",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    redirectPath: "/provider",
    sampleEmail: "provider@journeygo.com",
    samplePassword: "Password123@",
    desc: "Cập nhật thông tin điểm di sản, phát hành tour & vé",
  },
];

export default function AuthScreen({ initialTab = "login" }) {
  const router = useRouter();

  // Tab chuyển đổi: "login" (Đăng nhập) | "register" (Đăng ký tài khoản)
  const [activeTab, setActiveTab] = useState(initialTab);

  // Cơ chế trình chiếu Slideshow tự động & Pause-on-Hover
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const currentLandmark = SLIDE_ITEMS[currentSlide];

  // Tự động chuyển slide sau mỗi 6 giây, tạm dừng khi hover chuột vào cột trái
  useEffect(() => {
    if (isHovered) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDE_ITEMS.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [isHovered]);

  // Vai trò truy cập được chọn (Mặc định: Quản trị viên)
  const [selectedRoleId, setSelectedRoleId] = useState("admin");
  const selectedRole = ROLES.find((r) => r.id === selectedRoleId) || ROLES[0];

  // Trạng thái ẩn/hiện mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Trạng thái menu xổ xuống vai trò
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Form Đăng nhập (Mặc định điền tài khoản role Admin theo yêu cầu)
  const [loginForm, setLoginForm] = useState({
    identifier: "user@journeygo.com",
    password: "Password123@",
    rememberMe: true,
  });

  // Form Đăng ký tài khoản
  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  // Trạng thái tải & Toast thông báo nhanh (cho lỗi / cảnh báo)
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // ============================================================================
  // HỘP THÔNG BÁO PHẢN HỒI (FEEDBACK MODAL / PROGRESS BAR REDIRECT)
  // Thay thế hoàn toàn alert() mặc định của trình duyệt
  // ============================================================================
  const [feedbackModal, setFeedbackModal] = useState({
    isOpen: false,
    type: "login", // "login" | "register"
    title: "",
    subtitle: "",
    roleBadge: "",
    targetLabel: "",
    redirectPath: "/",
  });

  // Đảm bảo khi mở trang đăng nhập/đăng ký, modal phản hồi luôn đóng
  useEffect(() => {
    setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Chọn vai trò & tự động điền tài khoản mẫu tương ứng
  const handleSelectRole = (roleId) => {
    setSelectedRoleId(roleId);
    setIsRoleDropdownOpen(false);
    const targetRole = ROLES.find((r) => r.id === roleId);
    if (targetRole) {
      setLoginForm((prev) => ({
        ...prev,
        identifier: targetRole.sampleEmail,
        password: targetRole.samplePassword,
      }));
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  // ============================================================================
  // XỬ LÝ ĐĂNG NHẬP THÀNH CÔNG VÀ KÍCH HOẠT FEEDBACK MODAL
  // ============================================================================
  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    const email = loginForm.identifier.trim();
    const password = loginForm.password;

    if (!email) {
      showToast("error", "Vui lòng nhập Email hoặc Tên tài khoản.");
      return;
    }
    if (!password) {
      showToast("error", "Vui lòng nhập Mật khẩu bảo mật.");
      return;
    }

    setLoading(true);

    try {
      // 1. Gọi API Backend Spring Boot: POST /api/v1/auth/login
      const result = await authService.login({
        email,
        password,
      });

      const payload = result?.data || result;
      const user = payload?.user;
      const accessToken = payload?.accessToken || payload?.token;
      const refreshToken = payload?.refreshToken;

      if (!user) {
        throw new Error(result?.message || "Không nhận được dữ liệu người dùng từ máy chủ.");
      }

      // 2. Phân loại trang chuyển hướng theo Role thực tế trả về từ Backend
      const roleStr = String(user.role || "").toUpperCase();
      let targetPath = "/";
      let roleTitle = "Du khách khám phá";
      let roleScope = "Khám phá danh lam thắng cảnh & di sản";

      if (roleStr === "ADMIN") {
        targetPath = ROUTES.ADMIN || "/admin";
        roleTitle = "Quản trị viên";
        roleScope = "Quản trị hệ thống & vận hành";
      } else if (roleStr === "MODERATOR") {
        targetPath = ROUTES.MODERATOR || "/moderator";
        roleTitle = "Kiểm duyệt viên";
        roleScope = "Thẩm định hồ sơ & nội dung";
      } else if (roleStr === "PROVIDER") {
        targetPath = ROUTES.PROVIDER || "/provider";
        roleTitle = "Đối tác Điểm đến";
        roleScope = "Quản lý di tích & tour";
      } else {
        targetPath = ROUTES.HOME || "/";
        roleTitle = "Du khách khám phá";
        roleScope = "Khám phá di sản";
      }

      // 3. Lưu trữ đầy đủ session vào localStorage
      const authSession = {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName || user.email,
          name: user.fullName || user.email,
          phone: user.phone || "",
          role: roleStr.toLowerCase(),
          roleRaw: roleStr,
          roleTitle,
          roleScope,
          active: user.active,
        },
        token: accessToken,
        accessToken,
        refreshToken,
        role: roleStr.toLowerCase(),
        rolePath: targetPath,
        loginAt: new Date().toISOString(),
        rememberMe: loginForm.rememberMe,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("journey_go_auth", JSON.stringify(authSession));
        if (accessToken) {
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN || "jg_access_token", accessToken);
        }
        if (refreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN || "jg_refresh_token", refreshToken);
        }
        localStorage.setItem(STORAGE_KEYS.USER_INFO || "jg_user_info", JSON.stringify(user));
        window.dispatchEvent(new Event("storage"));
      }

      setLoading(false);

      // 4. Kích hoạt Feedback Modal Chuyển Hướng Cao Cấp (thay thế alert)
      setFeedbackModal({
        isOpen: true,
        type: "login",
        title: "Đăng nhập thành công!",
        subtitle: `Chào mừng bạn quay trở lại. Đang kết nối phiên làm việc cho ${roleTitle}...`,
        roleBadge: roleTitle,
        targetLabel: targetPath === "/" ? "Trang chủ (Tourist)" : targetPath,
        redirectPath: targetPath,
      });

      // 5. Tự động điều hướng sau khi thanh tiến trình (1.2 giây) chạy hoàn tất 100%
      setTimeout(() => {
        setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
        router.push(targetPath);
      }, 1250);
    } catch (err) {
      console.error("[Login Error]", err);
      const errMsg = err?.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại Email và Mật khẩu.";
      showToast("error", errMsg);
      setLoading(false);
    }
  };

  // ============================================================================
  // XỬ LÝ ĐĂNG KÝ THÀNH CÔNG VÀ KÍCH HOẠT FEEDBACK MODAL CÓ QUÀ TẶNG
  // ============================================================================
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!registerForm.fullName.trim()) {
      showToast("error", "Vui lòng điền Họ và tên người đại diện.");
      return;
    }
    if (!registerForm.phone.trim()) {
      showToast("error", "Vui lòng cung cấp Số điện thoại liên hệ.");
      return;
    }
    if (!registerForm.email.trim()) {
      showToast("error", "Vui lòng nhập Email hợp lệ.");
      return;
    }
    if (registerForm.password.length < 6) {
      showToast("error", "Mật khẩu cần tối thiểu 6 ký tự.");
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      showToast("error", "Mật khẩu xác nhận không trùng khớp.");
      return;
    }
    if (!registerForm.agreeTerms) {
      showToast("error", "Vui lòng đồng ý với Điều khoản & Quy chế hoạt động.");
      return;
    }

    setLoading(true);

    try {
      const targetRoleEnum = selectedRole.roleEnum || (selectedRoleId === "provider" ? "PROVIDER" : "USER");

      const result = await authService.register({
        fullName: registerForm.fullName.trim(),
        phone: registerForm.phone.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        role: targetRoleEnum,
      });

      const payload = result?.data || result;
      const user = payload?.user;
      const accessToken = payload?.accessToken || payload?.token;
      const refreshToken = payload?.refreshToken;

      const roleStr = String(user?.role || targetRoleEnum).toUpperCase();
      let targetPath = ROUTES.HOME || "/";
      let roleTitle = "Du khách khám phá";

      if (roleStr === "ADMIN") {
        targetPath = ROUTES.ADMIN || "/admin";
        roleTitle = "Quản trị viên";
      } else if (roleStr === "MODERATOR") {
        targetPath = ROUTES.MODERATOR || "/moderator";
        roleTitle = "Kiểm duyệt viên";
      } else if (roleStr === "PROVIDER") {
        targetPath = ROUTES.PROVIDER || "/provider";
        roleTitle = "Đối tác Điểm đến";
      } else {
        targetPath = ROUTES.HOME || "/";
        roleTitle = "Du khách khám phá";
      }

      const authSession = {
        user: {
          id: user?.id,
          name: registerForm.fullName,
          fullName: registerForm.fullName,
          email: registerForm.email,
          phone: registerForm.phone,
          role: roleStr.toLowerCase(),
          roleRaw: roleStr,
          roleTitle,
          roleScope: selectedRole.scope,
        },
        token: accessToken,
        accessToken,
        refreshToken,
        role: roleStr.toLowerCase(),
        rolePath: targetPath,
        loginAt: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("journey_go_auth", JSON.stringify(authSession));
        if (accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN || "jg_access_token", accessToken);
        if (refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN || "jg_refresh_token", refreshToken);
        if (user) localStorage.setItem(STORAGE_KEYS.USER_INFO || "jg_user_info", JSON.stringify(user));
        window.dispatchEvent(new Event("storage"));
      }

      setLoading(false);

      // Kích hoạt Feedback Modal Đăng ký thành công kèm Quà tặng +100 điểm thưởng
      setFeedbackModal({
        isOpen: true,
        type: "register",
        title: "Chào mừng thành viên mới!",
        subtitle: "Đang tự động đăng nhập và đưa bạn tới cổng khám phá...",
        roleBadge: roleTitle,
        targetLabel: targetPath === "/" ? "Cổng khám phá (Tourist)" : targetPath,
        redirectPath: targetPath,
      });

      // Tự động điều hướng sau khi thanh tiến trình (1.2 giây) chạy hoàn tất 100%
      setTimeout(() => {
        setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
        router.push(targetPath);
      }, 1250);
    } catch (err) {
      console.error("[Register Error]", err);
      showToast("error", err?.message || "Đăng ký không thành công. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  // Đăng nhập nhanh SSO / Doanh nghiệp
  const handleSocialLogin = (providerName) => {
    setLoading(true);
    showToast("info", `Đang kết nối xác thực ${providerName}...`);

    setTimeout(() => {
      const authSession = {
        user: {
          email: `${providerName.toLowerCase().replace(/\s+/g, "")}@journeygo.vn`,
          name: `Người dùng ${providerName}`,
          role: selectedRole.id,
          roleTitle: selectedRole.title,
          roleScope: selectedRole.scope,
        },
        token: `jg_sso_${Math.random().toString(36).substring(2)}_${Date.now()}`,
        role: selectedRole.id,
        rolePath: selectedRole.redirectPath,
        loginAt: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("journey_go_auth", JSON.stringify(authSession));
        localStorage.setItem("jg_access_token", authSession.token);
        window.dispatchEvent(new Event("storage"));
      }

      setLoading(false);

      setFeedbackModal({
        isOpen: true,
        type: "login",
        title: `Đăng nhập ${providerName} thành công!`,
        subtitle: "Đang xác thực thông tin và chuyển tiếp tới hệ thống...",
        roleBadge: selectedRole.title,
        targetLabel: selectedRole.redirectPath,
        redirectPath: selectedRole.redirectPath,
      });

      setTimeout(() => {
        setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
        router.push(selectedRole.redirectPath);
      }, 1250);
    }, 700);
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-900/10 flex items-center justify-center p-3 sm:p-5">
      {/* ====================================================================
          MODAL PHẢN HỒI XÁC THỰC & CHUYỂN HƯỚNG CAO CẤP
          Thay thế toàn bộ alert(), có hiệu ứng nảy icon và Progress Bar 1.2s
         ==================================================================== */}
      <AnimatePresence>
        {feedbackModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/40 select-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center relative overflow-hidden select-none"
            >
              {/* Vòng sáng phản chiếu mềm mại trên nền thẻ */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-sky-100/50 rounded-full blur-2xl pointer-events-none" />

              {/* Icon chuyển động: Vòng tròn xanh ngọc lục bảo nảy nhẹ (motion scale: 0.8 -> 1.05 -> 1) */}
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.05, 1] }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 mx-auto flex items-center justify-center text-emerald-600 mb-3.5 shadow-sm"
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-600 drop-shadow-xs" />
              </motion.div>

              {/* Nội dung thông báo theo từng ngữ cảnh */}
              <div className="space-y-1 relative z-10">
                {/* Tiêu đề thông báo */}
                <h3 className="text-base font-black text-slate-800">
                  {feedbackModal.title}
                </h3>

                {/* Huy hiệu vai trò cho Đăng nhập thành công */}
                {feedbackModal.type === "login" && feedbackModal.roleBadge && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 my-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>{feedbackModal.roleBadge}</span>
                  </div>
                )}

                {/* Tag quà tặng cho ĐĂNG KÝ THÀNH CÔNG */}
                {feedbackModal.type === "register" && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold py-1.5 px-3 rounded-xl my-2.5 inline-block shadow-2xs"
                  >
                    🎉 Đã cộng +100 điểm thưởng khám phá vào ví di sản của bạn!
                  </motion.div>
                )}

                {/* Phụ đề */}
                <p className="text-xs text-slate-500 leading-relaxed pt-0.5">
                  {feedbackModal.subtitle}
                </p>
              </div>

              {/* Thanh tiến trình thời gian thực (Progress Bar): 0% -> 100% trong 1.2s */}
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-4">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full"
                />
              </div>

              {/* Trạng thái tiến trình */}
              <div className="flex items-center justify-center text-[10px] text-slate-400 mt-2 font-medium">
                <span>Đang điều hướng, vui lòng chờ giây lát...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card chính: Split-screen chuẩn 5/12 và 7/12 vừa khít khung nhìn 100vh */}
      <div className="relative w-full max-w-5xl h-[88vh] max-h-[780px] bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Toast Notification cho Lỗi / Cảnh báo */}
        {toast && (
          <div
            className={`absolute top-4 right-4 z-40 flex items-center gap-2.5 px-3.5 py-2 rounded-xl shadow-lg text-xs font-semibold border animate-in fade-in slide-in-from-top-2 duration-200 ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : toast.type === "error"
                ? "bg-rose-50 text-rose-900 border-rose-200"
                : "bg-sky-50 text-sky-900 border-sky-200"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {toast.type === "info" && <Info className="w-4 h-4 text-sky-600 shrink-0" />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-1 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ====================================================================
            CỘT TRÁI (HERO BANNER DI SẢN - 5/12)
            Hiệu ứng Smooth Crossfade Slideshow + Ken Burns Cinematic + Pause on Hover
           ==================================================================== */}
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative lg:col-span-5 hidden lg:flex flex-col justify-between overflow-hidden text-white p-7 select-none h-full"
        >
          {/* Nền ảnh chuyển động điện ảnh với AnimatePresence & Ken Burns Effect */}
          <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={currentLandmark.id}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 1.2, ease: "easeInOut" },
                  scale: { duration: 6, ease: "easeOut" },
                }}
                className="absolute inset-0 w-full h-full"
              >
                <Image
                  src={currentLandmark.image}
                  alt={currentLandmark.name}
                  fill
                  priority
                  sizes="42vw"
                  className="object-cover object-center"
                />
              </motion.div>
            </AnimatePresence>

            {/* Lớp phủ gradient tối màu sang trọng */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/70 z-10 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-teal-950/40 via-transparent to-amber-950/25 z-10 pointer-events-none" />
          </div>

          {/* Top Header Cột Trái: Logo Thương Hiệu & 3 Chip chuyển danh thắng */}
          <div className="relative z-20 flex items-center justify-between gap-2">
            <Link href={ROUTES.HOME} className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md group-hover:bg-white/30 transition-all">
                <Compass className="w-4 h-4 text-amber-300 transition-transform group-hover:rotate-45 duration-500" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-black text-base tracking-tight text-white drop-shadow-xs">
                    Journey<span className="text-amber-300">Go</span>
                  </span>
                  <span className="text-[9px] font-bold tracking-wider uppercase px-1 py-0.2 rounded bg-amber-400/20 border border-amber-300/30 text-amber-200">
                    Heritage
                  </span>
                </div>
                <p className="text-[10px] text-white/70 font-medium leading-none">
                  Quản Trị Du Lịch &amp; Di Sản
                </p>
              </div>
            </Link>

            {/* Các nút chip chuyển đổi nhanh danh thắng */}
            <div className="flex items-center bg-black/40 backdrop-blur-md rounded-full p-0.5 border border-white/20 shadow-xs gap-0.5">
              {SLIDE_ITEMS.map((landmark, idx) => {
                const isSelected = currentSlide === idx;
                return (
                  <button
                    key={landmark.id}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white text-slate-900 shadow-sm font-bold"
                        : "bg-black/30 text-white/80 hover:bg-black/40"
                    }`}
                  >
                    {landmark.shortName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Khối truyền cảm hứng di sản: Fade-in & trượt nhẹ từ dưới lên */}
          <div className="relative z-20 my-auto py-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentLandmark.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="space-y-3"
              >
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur-md border border-white/20 shadow-xs bg-white/15 text-emerald-100">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>{currentLandmark.tag}</span>
                </div>

                <h2 className="text-2xl xl:text-3xl font-black tracking-tight text-white leading-tight drop-shadow-sm">
                  {currentLandmark.slogan}
                </h2>

                <p className="text-xs text-white/85 leading-relaxed font-normal">
                  {currentLandmark.subSlogan}
                </p>

                {/* Thẻ trích dẫn ở đáy bo góc tròn mềm mại, kính mờ */}
                <div className="rounded-xl p-3.5 backdrop-blur-md bg-white/10 border border-white/15 shadow-md space-y-2">
                  <p className="text-[11px] text-white/95 leading-relaxed italic">
                    &ldquo;{currentLandmark.quote}&rdquo;
                  </p>
                  <div className="pt-1.5 flex items-center justify-between text-[10px] text-white/70 border-t border-white/10">
                    <span>{currentLandmark.statLabel}</span>
                    <span className="font-bold text-amber-300 text-xs">
                      {currentLandmark.statNumber}
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Cột Trái: Hotline 24/7 & Domain Website */}
          <div className="relative z-20 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-white/80">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-amber-300">
                <PhoneCall className="w-3 h-3" />
              </div>
              <div>
                <span className="text-[9px] text-white/60 block leading-tight">Hotline 24/7</span>
                <span className="font-bold text-white tracking-wide text-xs">1900 6888</span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white/80 hover:text-white transition-colors">
              <Globe className="w-3.5 h-3.5 text-teal-300" />
              <span className="font-semibold text-xs">journeygo.vn</span>
            </div>
          </div>
        </div>

        {/* ====================================================================
            CỘT PHẢI (FORM ĐĂNG NHẬP / ĐĂNG KÝ - 7/12)
            Bố cục vừa khít Viewport, padding p-7 xl:p-8, không có thanh cuộn
           ==================================================================== */}
        <div className="relative lg:col-span-7 col-span-12 flex flex-col justify-between overflow-hidden h-full bg-white p-7 xl:p-8">
          <div className="w-full flex flex-col justify-between h-full space-y-3">
            {/* Header & Segmented Switcher mềm mại */}
            <div className="space-y-2.5">
              {/* Thanh chuyển đổi tab dạng trượt mềm mại */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1 w-fit border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setActiveTab("login")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "login"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "register"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Đăng ký tài khoản
                </button>
              </div>

              {/* Tiêu đề & Phụ đề */}
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {activeTab === "login" ? "Đăng Nhập Hệ Thống" : "Đăng Ký Thành Viên"}
                </h1>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cổng kết nối đối tác điểm đến, kiểm duyệt viên và ban quản trị
                </p>
              </div>
            </div>

            {/* Ô chọn Vai trò truy cập (Role Dropdown) */}
            <div className="relative z-30">
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`rounded-lg p-1.5 shrink-0 ${selectedRole.iconBg}`}>
                    {React.createElement(selectedRole.icon, {
                      className: "w-4 h-4",
                    })}
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-900">
                      {selectedRole.title}
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal ml-1.5">
                      • {selectedRole.scope}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                    isRoleDropdownOpen ? "rotate-180 text-teal-700" : ""
                  }`}
                />
              </button>

              {/* Menu xổ xuống */}
              {isRoleDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsRoleDropdownOpen(false)}
                  />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-30 animate-in fade-in slide-in-from-top-1 duration-150 space-y-1">
                    {ROLES.map((role) => {
                      const IconComponent = role.icon;
                      const isSelected = selectedRoleId === role.id;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => handleSelectRole(role.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-teal-50 text-teal-900 font-semibold ring-1 ring-teal-500/30"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`rounded-lg p-1.5 shrink-0 ${
                                isSelected
                                  ? role.iconBg
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900">
                                {role.title}
                              </span>
                              <span className="text-[11px] text-slate-500 font-normal ml-1.5">
                                • {role.scope}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Nút chọn nhanh tài khoản mẫu (Admin, Moderator, Provider) */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Mẫu nhanh:</span>
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectRole(r.id)}
                  className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold border transition-all cursor-pointer ${
                    selectedRoleId === r.id
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {r.title}
                </button>
              ))}
            </div>

            {/* ====================================================
                FORM ĐĂNG NHẬP (space-y-2.5, h-10, label text-[10px])
               ==================================================== */}
            {activeTab === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-2.5">
                {/* Trường Email / Tên tài khoản */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Tài khoản / Email đăng nhập
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={loginForm.identifier}
                      onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                      placeholder="email@journeygo.com"
                      className="w-full h-10 pl-9 pr-3 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Trường Mật khẩu */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Mật khẩu
                    </label>
                    <button
                      type="button"
                      onClick={() => showToast("info", "Vui lòng liên hệ quản trị viên để khôi phục mật khẩu.")}
                      className="text-[11px] font-medium text-teal-700 hover:text-teal-800 transition-colors cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full h-10 pl-9 pr-9 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Ghi nhớ đăng nhập */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={loginForm.rememberMe}
                      onChange={(e) => setLoginForm({ ...loginForm, rememberMe: e.target.checked })}
                      className="w-3.5 h-3.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                    />
                    <span>Ghi nhớ phiên đăng nhập trên thiết bị này</span>
                  </label>
                </div>

                {/* Nút Đăng nhập chính */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 py-2.5 rounded-xl font-bold text-xs shadow-md bg-teal-700 hover:bg-teal-800 text-white active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Đang đăng nhập...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng nhập</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ====================================================
                FORM ĐĂNG KÝ TÀI KHOẢN (Được co gọn vừa khít)
               ==================================================== */}
            {activeTab === "register" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-2">
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Họ và tên */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Họ và tên
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={registerForm.fullName}
                        onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
                        placeholder="Nguyễn Văn A"
                        className="w-full h-9 pl-8 pr-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* Số điện thoại */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Số điện thoại
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                        placeholder="0912 345 678"
                        className="w-full h-9 pl-8 pr-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Email đăng ký
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      placeholder="email@journeygo.com"
                      className="w-full h-9 pl-8 pr-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Mật khẩu & Xác nhận */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        placeholder="Tối thiểu 6 ký tự"
                        className="w-full h-9 px-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Xác nhận mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                        placeholder="Nhập lại mật khẩu"
                        className="w-full h-9 px-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Đồng ý điều khoản */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={registerForm.agreeTerms}
                      onChange={(e) => setRegisterForm({ ...registerForm, agreeTerms: e.target.checked })}
                      className="w-3.5 h-3.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                    />
                    <span>
                      Tôi đồng ý với{" "}
                      <span className="text-teal-700 font-semibold underline">
                        Điều khoản dịch vụ &amp; Quy chế di sản
                      </span>
                    </span>
                  </label>
                </div>

                {/* Nút gửi Đăng ký */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 py-2 rounded-xl font-bold text-xs shadow-md bg-teal-700 hover:bg-teal-800 text-white active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Đang khởi tạo tài khoản...</span>
                    </>
                  ) : (
                    <>
                      <span>Hoàn tất đăng ký</span>
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Phân cách Hoặc tiếp tục với */}
            <div className="relative my-0.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                <span className="bg-white px-2 text-slate-400">Hoặc tiếp tục với</span>
              </div>
            </div>

            {/* Các nút Đăng nhập nhanh SSO / Doanh nghiệp */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSocialLogin("Google")}
                className="h-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin("Doanh nghiệp")}
                className="h-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs"
              >
                <Globe className="w-4 h-4 text-teal-600" />
                <span>SSO Đối tác</span>
              </button>
            </div>

            {/* Footer bản quyền */}
            <div className="text-center pt-0.5">
              <p className="text-[10px] text-slate-400">
                Bảo hộ bởi JourneyGo Identity Service • Phiên bản 2.5
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
