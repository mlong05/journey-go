"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { translateAuthError } from "@/services/errorMessage";
import {
  Compass,
  Sparkles,
  PhoneCall,
  Globe,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Check,
  X,
  User,
  Phone,
} from "lucide-react";

/**
 * CẤU HÌNH API BASE URL TỪ BIẾN MÔI TRƯỜNG
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/**
 * Helper xây dựng URL API chuẩn xác (tránh trùng lặp /api/v1)
 */
const buildAuthUrl = (endpoint) => {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (base.endsWith("/api/v1")) {
    return `${base}/auth${cleanEndpoint}`;
  }
  return `${base}/api/v1/auth${cleanEndpoint}`;
};

/**
 * DỮ LIỆU BANNER DI SẢN (Hero Slideshow)
 */
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
    image: "/image/trangan.jpg",
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
    image: "/image/hoian.jpg",
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
    image: "/image/vanmieu.jpg",
  },
];

/**
 * DANH SÁCH VAI TRÒ MẪU (pill chọn nhanh ở form đăng nhập)
 * roleEnum phải khớp với enum Role của backend: TOURIST | PROVIDER | MODERATOR | ADMIN
 */
const SAMPLE_ROLES = [
  {
    id: "admin",
    roleEnum: "ADMIN",
    title: "Quản trị viên",
    redirectPath: "/admin",
  },
  {
    id: "moderator",
    roleEnum: "MODERATOR",
    title: "Kiểm duyệt viên",
    redirectPath: "/moderator",
  },
  {
    id: "provider",
    roleEnum: "PROVIDER",
    title: "Đối tác điểm đến",
    redirectPath: "/provider",
  },
  {
    id: "tourist",
    roleEnum: "TOURIST",
    title: "Khách du lịch",
    redirectPath: "/",
  },
];

export default function AuthPage() {
  const router = useRouter();

  // Tab chính: "login" | "register" | "forgot_password"
  const [activeTab, setActiveTab] = useState("login");

  // Vai trò mẫu đang chọn
  const [selectedRoleId, setSelectedRoleId] = useState("admin");

  // Form Đăng nhập (để trống — người dùng tự nhập)
  const [loginForm, setLoginForm] = useState({
    identifier: "",
    password: "",
    rememberMe: true,
  });

  // Form Đăng ký
  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  // Trạng thái ẩn/hiện mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Slideshow
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSlideHovered, setIsSlideHovered] = useState(false);
  const currentLandmark = SLIDE_ITEMS[currentSlide];

  // Trạng thái tải chung & Toast
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // ============================================================================
  // LUỒNG QUÊN MẬT KHẨU 3 BƯỚC ('forgot_email' -> 'verify_otp' -> 'reset_password')
  // ============================================================================
  const [forgotStep, setForgotStep] = useState("forgot_email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifiedOtp, setVerifiedOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Trạng thái cho luồng OTP
  const [otpError, setOtpError] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [inlineAlert, setInlineAlert] = useState({ type: null, message: "" });
  const [resetSuccessModal, setResetSuccessModal] = useState(false);

  const otpRefs = useRef([]);

  // Tự động chuyển slide mỗi 6s (tạm dừng khi hover)
  useEffect(() => {
    if (isSlideHovered) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDE_ITEMS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isSlideHovered]);

  // Bộ đếm ngược 60s gửi lại OTP
  useEffect(() => {
    let timer;
    if (activeTab === "forgot_password" && forgotStep === "verify_otp" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeTab, forgotStep, countdown]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  const handleSelectRole = (roleId) => {
  
    setSelectedRoleId(roleId);
  };

  // Mở luồng Quên mật khẩu
  const handleOpenForgotPassword = () => {
    setForgotStep("forgot_email");
    setForgotEmail(loginForm.identifier.trim());
    setOtp(["", "", "", "", "", ""]);
    setVerifiedOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
    setInlineAlert({ type: null, message: "" });
    setOtpError(false);
    setActiveTab("forgot_password");
  };

  // Quay lại màn hình đăng nhập
  const handleBackToLogin = () => {
    setActiveTab("login");
    setInlineAlert({ type: null, message: "" });
  };

  // ============================================================================
  // XỬ LÝ ĐĂNG NHẬP
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
      const res = await fetch(buildAuthUrl("/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      }

      const payload = result?.data || result;
      const user = payload?.user;
      const accessToken = payload?.accessToken || payload?.token;
      const refreshToken = payload?.refreshToken;

      const roleStr = String(user?.role || "TOURIST").toUpperCase();
      let targetPath = "/";
      let roleTitle = "Du khách khám phá";

      if (roleStr === "ADMIN") {
        targetPath = "/admin";
        roleTitle = "Quản trị viên";
      } else if (roleStr === "MODERATOR") {
        targetPath = "/moderator";
        roleTitle = "Kiểm duyệt viên";
      } else if (roleStr === "PROVIDER") {
        targetPath = "/provider";
        roleTitle = "Đối tác Điểm đến";
      }

      const authSession = {
        user: {
          id: user?.id,
          email: user?.email || email,
          fullName: user?.fullName || email,
          role: roleStr.toLowerCase(),
          roleTitle,
        },
        token: accessToken,
        accessToken,
        refreshToken,
        role: roleStr.toLowerCase(),
        loginAt: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("journey_go_auth", JSON.stringify(authSession));
        if (accessToken) localStorage.setItem("jg_access_token", accessToken);
        if (refreshToken) localStorage.setItem("jg_refresh_token", refreshToken);
        window.dispatchEvent(new Event("storage"));
      }

      showToast("success", `Đăng nhập thành công với vai trò ${roleTitle}!`);
      setTimeout(() => {
        router.push(targetPath);
      }, 1000);
    } catch (err) {
      console.error("[Login Error]", err);
      showToast(
        "error",
        translateAuthError(err, "Đăng nhập thất bại. Vui lòng kiểm tra lại.")
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // XỬ LÝ ĐĂNG KÝ
  // ============================================================================
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!registerForm.fullName.trim()) {
      showToast("error", "Vui lòng nhập Họ và tên.");
      return;
    }
    if (!registerForm.phone.trim()) {
      showToast("error", "Vui lòng cung cấp Số điện thoại.");
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
      const res = await fetch(buildAuthUrl("/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          fullName: registerForm.fullName.trim(),
          phone: registerForm.phone.trim(),
          email: registerForm.email.trim(),
          password: registerForm.password,
          role:
            SAMPLE_ROLES.find((r) => r.id === selectedRoleId)?.roleEnum ||
            "TOURIST",
        }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message || "Đăng ký không thành công. Vui lòng thử lại.");
      }

      showToast("success", "Đăng ký tài khoản thành công! Vui lòng đăng nhập.");
      setLoginForm((prev) => ({
        ...prev,
        identifier: registerForm.email.trim(),
        password: "",
      }));
      setActiveTab("login");
    } catch (err) {
      console.error("[Register Error]", err);
      showToast("error", err?.message || "Đăng ký không thành công.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // LUỒNG 3 BƯỚC KHÔI PHỤC MẬT KHẨU
  // ============================================================================

  // BƯỚC 1: YÊU CẦU GỬI OTP QUA EMAIL
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    const targetEmail = forgotEmail.trim();

    if (!targetEmail) {
      setInlineAlert({
        type: "error",
        message: "Vui lòng nhập địa chỉ email tài khoản của bạn.",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      setInlineAlert({
        type: "error",
        message: "Định dạng email không hợp lệ. Vui lòng kiểm tra lại.",
      });
      return;
    }

    setLoading(true);
    setInlineAlert({ type: null, message: "" });

    try {
      const res = await fetch(buildAuthUrl("/forgot-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: targetEmail }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 404 || result?.message?.includes("USER_NOT_EXISTED")) {
          throw new Error("Email này chưa được đăng ký trong hệ thống JourneyGo.");
        }
        throw new Error(result?.message || `Yêu cầu thất bại (Mã lỗi: ${res.status})`);
      }

      setInlineAlert({
        type: "success",
        message: "Đã gửi mã OTP 6 chữ số đến email của bạn!",
      });
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      setForgotStep("verify_otp");

      // Auto-focus vào ô OTP đầu tiên
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 150);
    } catch (err) {
      console.error("[Forgot Password Step 1 Error]", err);
      setInlineAlert({
        type: "error",
        message: err.message || "Không thể gửi mã OTP. Vui lòng thử lại sau.",
      });
    } finally {
      setLoading(false);
    }
  };

  // BƯỚC 2: XỬ LÝ NHẬP VÀ XÁC THỰC OTP
  const handleOtpBoxChange = (index, value) => {
    setInlineAlert({ type: null, message: "" });
    setOtpError(false);

    const digit = value.replace(/\D/g, "");
    if (!digit) {
      const nextOtp = [...otp];
      nextOtp[index] = "";
      setOtp(nextOtp);
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = digit[digit.length - 1];
    setOtp(nextOtp);

    // Nhảy tới ô tiếp theo
    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpBoxKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        const nextOtp = [...otp];
        nextOtp[index - 1] = "";
        setOtp(nextOtp);
        otpRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpBoxPaste = (e) => {
    e.preventDefault();
    setInlineAlert({ type: null, message: "" });
    setOtpError(false);

    const pasteData = e.clipboardData.getData("text").trim().replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;

    const nextOtp = [...otp];
    for (let i = 0; i < pasteData.length; i++) {
      nextOtp[i] = pasteData[i];
    }
    setOtp(nextOtp);

    const targetIdx = Math.min(pasteData.length, 5);
    otpRefs.current[targetIdx]?.focus();
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || resendingOtp) return;
    setResendingOtp(true);
    setInlineAlert({ type: null, message: "" });

    try {
      const res = await fetch(buildAuthUrl("/forgot-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message || "Không thể gửi lại mã OTP lúc này.");
      }

      setInlineAlert({
        type: "success",
        message: "Mã OTP mới đã được gửi lại vào email của bạn!",
      });
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setInlineAlert({
        type: "error",
        message: err.message || "Gửi lại mã OTP thất bại.",
      });
    } finally {
      setResendingOtp(false);
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");

    if (otpCode.length !== 6) {
      setInlineAlert({
        type: "error",
        message: "Vui lòng nhập đủ 6 chữ số mã OTP.",
      });
      setOtpError(true);
      return;
    }

    setLoading(true);
    setInlineAlert({ type: null, message: "" });
    setOtpError(false);

    try {
      const res = await fetch(buildAuthUrl("/verify-otp"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          otp: otpCode,
        }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        setOtpError(true);
        throw new Error(
          result?.message || "Mã OTP không chính xác hoặc đã hết hạn (10 phút). Vui lòng thử lại."
        );
      }

      setVerifiedOtp(otpCode);
      setInlineAlert({
        type: "success",
        message: "Xác thực OTP thành công!",
      });
      setForgotStep("reset_password");
    } catch (err) {
      console.error("[Verify OTP Step 2 Error]", err);
      setInlineAlert({
        type: "error",
        message: err.message || "Mã OTP không hợp lệ.",
      });
      setOtpError(true);
    } finally {
      setLoading(false);
    }
  };

  // BƯỚC 3: THIẾT LẬP MẬT KHẨU MỚI
  const isLenValid = newPassword.length >= 8;
  const isCaseValid = /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword);
  const isCharValid = /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);
  const isPwdMatch = confirmNewPassword.length > 0 && newPassword === confirmNewPassword;

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword) {
      setInlineAlert({ type: "error", message: "Vui lòng nhập mật khẩu mới." });
      return;
    }
    if (newPassword.length < 8) {
      setInlineAlert({
        type: "error",
        message: "Mật khẩu mới phải có tối thiểu 8 ký tự.",
      });
      return;
    }
    if (!isCaseValid || !isCharValid) {
      setInlineAlert({
        type: "error",
        message: "Mật khẩu cần bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
      });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setInlineAlert({
        type: "error",
        message: "Mật khẩu xác nhận không trùng khớp hoàn toàn.",
      });
      return;
    }

    setLoading(true);
    setInlineAlert({ type: null, message: "" });

    try {
      const res = await fetch(buildAuthUrl("/reset-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          otp: verifiedOtp || otp.join(""),
          newPassword,
          confirmPassword: confirmNewPassword,
        }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.message || "Đặt lại mật khẩu thất bại. Vui lòng thử lại.");
      }

      setResetSuccessModal(true);

      // Tự động điền email vào form login và chuyển màn hình sau 1.5s
      setTimeout(() => {
        setLoginForm((prev) => ({
          ...prev,
          identifier: forgotEmail.trim(),
          password: "",
        }));
        setResetSuccessModal(false);
        setActiveTab("login");
        showToast("success", "Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.");
      }, 1500);
    } catch (err) {
      console.error("[Reset Password Step 3 Error]", err);
      setInlineAlert({
        type: "error",
        message: err.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      suppressHydrationWarning
      className="relative h-screen w-screen max-h-screen overflow-hidden bg-slate-100 flex items-center justify-center p-3 sm:p-4 xl:p-8 text-slate-800 selection:bg-teal-500 selection:text-white select-none"
    >
      {/* VÙNG SÁNG AMBIENT NỀN */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[450px] w-[450px] rounded-full bg-gradient-to-tr from-teal-200/35 to-emerald-200/25 blur-3xl" />
        <div className="absolute top-1/2 -right-40 h-[400px] w-[400px] rounded-full bg-gradient-to-bl from-amber-200/35 to-orange-200/20 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-[350px] w-[350px] rounded-full bg-gradient-to-t from-sky-200/25 to-teal-200/15 blur-3xl" />
      </div>

      {/* TOAST THÔNG BÁO GÓC TRÊN */}
      {toast && (
        <div
          className={`absolute top-4 right-4 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-xl shadow-lg text-xs font-semibold border animate-in fade-in slide-in-from-top-2 duration-200 ${toast.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : toast.type === "error"
                ? "bg-rose-50 text-rose-900 border-rose-200"
                : "bg-sky-50 text-sky-900 border-sky-200"
            }`}
        >
          {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-1 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KHUNG SPLIT-SCREEN 2 CỘT CHÍNH (FIT 100VH KHÔNG SINH THANH CUỘN) */}
      <div className="relative z-10 w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1380px] h-[98vh] max-h-[920px] min-h-[560px] bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* ============================================================================ */}
        {/* CỘT TRÁI: BANNER SLIDESHOW DI SẢN (5/12) */}
        {/* ============================================================================ */}
        <div
          onMouseEnter={() => setIsSlideHovered(true)}
          onMouseLeave={() => setIsSlideHovered(false)}
          className="relative lg:col-span-5 hidden lg:flex flex-col justify-between overflow-hidden text-white p-7 xl:p-9 select-none h-full bg-slate-950"
        >
          {/* Nền ảnh cinematic crossfade + Ken Burns */}
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
                  sizes="(min-width: 1536px) 580px, (min-width: 1024px) 42vw, 100vw"
                  className="object-cover object-center"
                />
              </motion.div>
            </AnimatePresence>

            {/* Gradient sang trọng che phủ */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/70 z-10 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-teal-950/40 via-transparent to-amber-950/25 z-10 pointer-events-none" />
          </div>

          {/* Logo & 3 Nút chuyển nhanh danh thắng */}
          <div className="relative z-20 flex items-center justify-between gap-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md group-hover:bg-white/30 transition-all">
                <Compass className="w-4 h-4 text-amber-300 transition-transform group-hover:rotate-45 duration-500" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-black text-base tracking-tight text-white drop-shadow-xs">
                    Journey<span className="text-amber-300">Go</span>
                  </span>
                </div>
                <p className="text-[10px] text-white/70 font-medium leading-none">
                  Quản Trị Du Lịch &amp; Di Sản
                </p>
              </div>
            </Link>

            {/* Chip chọn danh thắng */}
            <div className="flex items-center bg-black/40 backdrop-blur-md rounded-full p-0.5 border border-white/20 shadow-xs gap-0.5">
              {SLIDE_ITEMS.map((item, idx) => {
                const isSelected = currentSlide === idx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-all cursor-pointer ${isSelected
                        ? "bg-white text-slate-900 shadow-sm font-bold"
                        : "bg-black/30 text-white/80 hover:bg-black/40"
                      }`}
                  >
                    {item.shortName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nội dung truyền cảm hứng di sản */}
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

                <p className="text-xs xl:text-sm text-white/85 leading-relaxed font-normal">
                  {currentLandmark.subSlogan}
                </p>

                {/* Thẻ trích dẫn danh lam */}
                <div className="rounded-2xl p-4 backdrop-blur-md bg-white/10 border border-white/15 shadow-md space-y-2">
                  <p className="text-[11px] xl:text-xs text-white/95 leading-relaxed italic">
                    &ldquo;{currentLandmark.quote}&rdquo;
                  </p>
                  <div className="pt-2 flex items-center justify-between text-[11px] text-white/70 border-t border-white/10">
                    <span>{currentLandmark.statLabel}</span>
                    <span className="font-bold text-amber-300 text-xs xl:text-sm">
                      {currentLandmark.statNumber}
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Cột Trái */}
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

        {/* ============================================================================ */}
        {/* CỘT PHẢI: KHU VỰC FORM (7/12) */}
        {/* ============================================================================ */}
        <div className="relative lg:col-span-7 col-span-12 flex flex-col justify-between overflow-hidden h-full bg-white p-7 sm:p-9 xl:p-11">
          <div className="w-full flex flex-col justify-between h-full space-y-3.5">
            {/* THÔNG BÁO ĐẶT LẠI MẬT KHẨU THÀNH CÔNG (1.5s MODAL BANNER) */}
            {resetSuccessModal ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-4 animate-in fade-in duration-300 my-auto">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Đặt Lại Mật Khẩu Thành Công!
                  </h3>
                  <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
                    Tài khoản <span className="font-bold text-emerald-800">{forgotEmail}</span> đã
                    được cập nhật mật khẩu mới an toàn. Hệ thống đang chuyển hướng về màn hình Đăng
                    nhập...
                  </p>
                </div>
                <div className="w-full max-w-xs h-2 bg-emerald-200/60 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full animate-[progress_1.5s_linear_forwards]" />
                </div>
              </div>
            ) : activeTab === "forgot_password" ? (
              /* ============================================================================ */
              /* LUỒNG KHÔI PHỤC MẬT KHẨU 3 BƯỚC */
              /* ============================================================================ */
              <div className="flex flex-col justify-between h-full">
                {/* Header thanh tiến trình 3 bước & Nút quay lại */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleBackToLogin}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:-translate-x-0.5 transition-all cursor-pointer select-none"
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-500" />
                      <span>Quay lại đăng nhập</span>
                    </button>

                    <span className="text-[11px] font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {forgotStep === "forgot_email" && "Bước 1/3: Nhập Email"}
                      {forgotStep === "verify_otp" && "Bước 2/3: Xác thực OTP"}
                      {forgotStep === "reset_password" && "Bước 3/3: Mật khẩu mới"}
                    </span>
                  </div>

                  {/* Progress bar thời gian thực */}
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width:
                          forgotStep === "forgot_email"
                            ? "33.3%"
                            : forgotStep === "verify_otp"
                              ? "66.6%"
                              : "100%",
                      }}
                    />
                  </div>
                </div>

                {/* Vùng form chính căn giữa hoàn hảo */}
                <div className="my-auto w-full max-w-md mx-auto space-y-4 py-2">
                  {/* Inline Alert Lỗi / Thành công */}
                  {inlineAlert.message && (
                    <div
                      className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs font-medium animate-in fade-in duration-200 ${inlineAlert.type === "success"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                        }`}
                    >
                      {inlineAlert.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">{inlineAlert.message}</div>
                    </div>
                  )}

                  {/* BƯỚC 1: NHẬP EMAIL */}
                  {forgotStep === "forgot_email" && (
                    <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                      <div className="space-y-1">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          Khôi Phục Mật Khẩu
                        </h2>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Nhập địa chỉ email liên kết với tài khoản của bạn để nhận mã xác thực OTP
                          gồm 6 chữ số.
                        </p>
                      </div>

                      <div className="space-y-1 w-full">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Địa chỉ Email tài khoản
                        </label>
                        <div className="relative w-full">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            type="email"
                            required
                            autoFocus
                            value={forgotEmail}
                            onChange={(e) => {
                              setForgotEmail(e.target.value);
                              setInlineAlert({ type: null, message: "" });
                            }}
                            placeholder="name@journeygo.com"
                            className="w-full h-11 pl-10 pr-3.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md bg-emerald-700 hover:bg-emerald-800 text-white active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Đang gửi mã xác thực OTP...</span>
                          </>
                        ) : (
                          <>
                            <span>Gửi mã xác thực OTP</span>
                            <ArrowRight className="w-4 h-4 text-white" />
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* BƯỚC 2: NHẬP VÀ XÁC THỰC MÃ OTP */}
                  {forgotStep === "verify_otp" && (
                    <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            Xác Thực Mã Bảo Mật OTP
                          </h2>
                          <button
                            type="button"
                            onClick={() => {
                              setInlineAlert({ type: null, message: "" });
                              setForgotStep("forgot_email");
                            }}
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                          >
                            Đổi email
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Vui lòng nhập mã OTP 6 chữ số vừa được gửi tới hộp thư{" "}
                          <span className="font-semibold text-emerald-800">{forgotEmail}</span>.
                        </p>
                      </div>

                      {/* 6 Ô NHẬP OTP CHUYÊN NGHIỆP */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
                          Mã OTP 6 chữ số
                        </label>
                        <div
                          className="flex items-center justify-center gap-2 sm:gap-2.5"
                          onPaste={handleOtpBoxPaste}
                        >
                          {otp.map((digit, index) => (
                            <input
                              key={index}
                              ref={(el) => (otpRefs.current[index] = el)}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleOtpBoxChange(index, e.target.value)}
                              onKeyDown={(e) => handleOtpBoxKeyDown(index, e)}
                              className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-black rounded-xl border transition-all outline-none ${otpError
                                  ? "border-rose-400 bg-rose-50/40 text-rose-700 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                                  : digit
                                    ? "border-emerald-600 bg-white text-slate-900 shadow-xs"
                                    : "border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                                }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Đếm ngược gửi lại mã OTP */}
                      <div className="flex items-center justify-center pt-1 text-xs">
                        {countdown > 0 ? (
                          <span className="text-slate-400 font-medium">
                            Gửi lại mã sau{" "}
                            <span className="font-bold text-slate-600">
                              {countdown < 10 ? `0${countdown}` : countdown}s
                            </span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={resendingOtp}
                            className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer disabled:opacity-60"
                          >
                            {resendingOtp ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Đang gửi lại...</span>
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Gửi lại mã OTP</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={loading || otp.join("").length < 6}
                        className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md bg-emerald-700 hover:bg-emerald-800 text-white active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Đang kiểm tra mã OTP...</span>
                          </>
                        ) : (
                          <>
                            <span>Xác thực mã OTP</span>
                            <ArrowRight className="w-4 h-4 text-white" />
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* BƯỚC 3: ĐẶT LẠI MẬT KHẨU MỚI */}
                  {forgotStep === "reset_password" && (
                    <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                      <div className="space-y-1">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          Thiết Lập Mật Khẩu Mới
                        </h2>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Tạo mật khẩu mới có độ bảo mật cao cho tài khoản{" "}
                          <span className="font-semibold text-emerald-800">{forgotEmail}</span>.
                        </p>
                      </div>

                      {/* Mật khẩu mới */}
                      <div className="space-y-1 w-full">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Mật khẩu mới
                        </label>
                        <div className="relative w-full">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            type={showNewPassword ? "text" : "password"}
                            required
                            autoFocus
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              setInlineAlert({ type: null, message: "" });
                            }}
                            placeholder="••••••••••••"
                            className="w-full h-11 pl-10 pr-10 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Checklist độ bảo mật mật khẩu */}
                      <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600">
                        <div
                          className={`flex items-center gap-1.5 ${isLenValid ? "text-emerald-700 font-bold" : "text-slate-400"
                            }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] ${isLenValid
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-500"
                              }`}
                          >
                            ✓
                          </div>
                          <span>Tối thiểu 8 ký tự</span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 ${isCaseValid ? "text-emerald-700 font-bold" : "text-slate-400"
                            }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] ${isCaseValid
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-500"
                              }`}
                          >
                            ✓
                          </div>
                          <span>Chữ hoa &amp; thường</span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 col-span-2 ${isCharValid ? "text-emerald-700 font-bold" : "text-slate-400"
                            }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] ${isCharValid
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-500"
                              }`}
                          >
                            ✓
                          </div>
                          <span>Có số &amp; ký tự đặc biệt (@, #, $, ...)</span>
                        </div>
                      </div>

                      {/* Xác nhận mật khẩu mới */}
                      <div className="space-y-1 w-full">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Xác nhận mật khẩu mới
                          </label>
                          {confirmNewPassword.length > 0 && (
                            <span
                              className={`text-[10px] font-bold ${isPwdMatch ? "text-emerald-600" : "text-rose-600"
                                }`}
                            >
                              {isPwdMatch ? "✓ Khớp mật khẩu" : "✕ Chưa trùng khớp"}
                            </span>
                          )}
                        </div>
                        <div className="relative w-full">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            type={showConfirmNewPassword ? "text" : "password"}
                            required
                            value={confirmNewPassword}
                            onChange={(e) => {
                              setConfirmNewPassword(e.target.value);
                              setInlineAlert({ type: null, message: "" });
                            }}
                            placeholder="••••••••••••"
                            className={`w-full h-11 pl-10 pr-10 text-xs sm:text-sm rounded-xl bg-slate-50 border text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-colors ${confirmNewPassword && !isPwdMatch
                                ? "border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                                : "border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                              }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showConfirmNewPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md bg-emerald-700 hover:bg-emerald-800 text-white active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Đang đặt lại mật khẩu...</span>
                          </>
                        ) : (
                          <>
                            <span>Hoàn tất đặt lại mật khẩu</span>
                            <Check className="w-4 h-4 text-white" />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
                {/* Spacer giữ chân trang cân bằng */}
                <div className="h-2" />
              </div>
            ) : (
              /* ============================================================================ */
              /* LUỒNG ĐĂNG NHẬP / ĐĂNG KÝ THÔNG THƯỜNG */
              /* ============================================================================ */
              <>
                {/* Header & Tabs */}
                <div className="space-y-2.5">
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1 w-fit border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setActiveTab("login")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "login"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      Đăng nhập
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("register")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "register"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      Đăng ký tài khoản
                    </button>
                  </div>

                  <div>
                    <h1 className="text-2xl xl:text-3xl font-black text-slate-900 tracking-tight">
                      {activeTab === "login" ? "Đăng Nhập Hệ Thống" : "Đăng Ký Thành Viên"}
                    </h1>
                  </div>
                </div>

                {/* FORM ĐĂNG NHẬP */}
                {activeTab === "login" ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-3.5 w-full">
                    {/* BỘ CHỌN MẪU NHANH (Pills) */}
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Vai trò truy cập</span>
                        <span className="text-[10px] font-semibold text-emerald-700 lowercase">
                          (Click để nạp nhanh)
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {SAMPLE_ROLES.map((r) => {
                          const isSelected = selectedRoleId === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => handleSelectRole(r.id)}
                              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${isSelected
                                  ? "bg-emerald-50 border-emerald-600 text-emerald-800 shadow-2xs"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                              {r.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Email / Username */}
                    <div className="space-y-1 w-full">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Tài khoản / Email đăng nhập
                      </label>
                      <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={loginForm.identifier}
                          onChange={(e) =>
                            setLoginForm((prev) => ({
                              ...prev,
                              identifier: e.target.value,
                            }))
                          }
                          placeholder="email@journeygo.com"
                          className="w-full h-11 pl-10 pr-3.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Mật khẩu & NÚT "QUÊN MẬT KHẨU?" */}
                    <div className="space-y-1 w-full">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Mật khẩu
                        </label>
                        <button
                          type="button"
                          onClick={handleOpenForgotPassword}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                        >
                          Quên mật khẩu?
                        </button>
                      </div>
                      <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={loginForm.password}
                          onChange={(e) =>
                            setLoginForm((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          placeholder="••••••••••••"
                          className="w-full h-11 pl-10 pr-10 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Ghi nhớ đăng nhập */}
                    <div className="flex items-center justify-between pt-0.5 w-full">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
                        <input
                          type="checkbox"
                          checked={loginForm.rememberMe}
                          onChange={(e) =>
                            setLoginForm((prev) => ({
                              ...prev,
                              rememberMe: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Ghi nhớ phiên đăng nhập trên thiết bị</span>
                      </label>
                    </div>

                    {/* Nút Đăng nhập chính */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md bg-emerald-700 hover:bg-emerald-800 text-white active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
                ) : (
                  /* FORM ĐĂNG KÝ */
                  <form onSubmit={handleRegisterSubmit} className="space-y-3 w-full">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Họ và tên
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={registerForm.fullName}
                            onChange={(e) =>
                              setRegisterForm((p) => ({ ...p, fullName: e.target.value }))
                            }
                            placeholder="Nguyễn Văn A"
                            className="w-full h-10 pl-9 pr-3 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Số điện thoại
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                          <input
                            type="tel"
                            required
                            value={registerForm.phone}
                            onChange={(e) =>
                              setRegisterForm((p) => ({ ...p, phone: e.target.value }))
                            }
                            placeholder="0912 345 678"
                            className="w-full h-10 pl-9 pr-3 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Email đăng ký
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={registerForm.email}
                          onChange={(e) =>
                            setRegisterForm((p) => ({ ...p, email: e.target.value }))
                          }
                          placeholder="email@domain.com"
                          className="w-full h-10 pl-9 pr-3 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Mật khẩu
                        </label>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={registerForm.password}
                          onChange={(e) =>
                            setRegisterForm((p) => ({ ...p, password: e.target.value }))
                          }
                          placeholder="••••••••"
                          className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Xác nhận MK
                        </label>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={registerForm.confirmPassword}
                          onChange={(e) =>
                            setRegisterForm((p) => ({ ...p, confirmPassword: e.target.value }))
                          }
                          placeholder="••••••••"
                          className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 pt-0.5">
                      <input
                        type="checkbox"
                        checked={registerForm.agreeTerms}
                        onChange={(e) =>
                          setRegisterForm((p) => ({ ...p, agreeTerms: e.target.checked }))
                        }
                        className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 cursor-pointer"
                      />
                      <span>Đồng ý với Điều khoản và Quy chế hoạt động</span>
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md bg-emerald-700 hover:bg-emerald-800 text-white active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Đang đăng ký...</span>
                        </>
                      ) : (
                        <>
                          <span>Tạo tài khoản thành viên</span>
                          <ArrowRight className="w-4 h-4 text-white" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* CÁC NÚT ĐĂNG NHẬP NHANH SSO */}
                <div className="space-y-2 pt-1 w-full">
                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-slate-200 w-full" />
                    <span className="bg-white px-2 text-[10px] uppercase font-bold text-slate-400 shrink-0">
                      Hoặc tiếp tục với
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        showToast("info", "Tính năng Google OAuth đang đồng bộ với Google Console.")
                      }
                      className="flex items-center justify-center gap-2 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
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
                      <span>Google ID</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        showToast(
                          "info",
                          "Tính năng xác thực Định danh VNeID đang kết nối Cổng Dịch vụ công."
                        )
                      }
                      className="flex items-center justify-center gap-2 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>VNeID / SSO</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* BẢN QUYỀN FOOTER */}
            <div className="text-center pt-1 w-full">
              <p className="text-[11px] text-slate-400">
                Bảo hộ bởi JourneyGo Identity Service • Phiên bản 2.5
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
