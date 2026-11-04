"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";
import Script from "next/script";
import { ROUTES } from "@/constants/routes";
import { STORAGE_KEYS } from "@/constants";
import { authService } from "../services/authService";
import { useAuth } from "../hooks/useAuth";

import AuthHeroCarousel from "./AuthHeroCarousel";
import AuthFeedbackModal from "./AuthFeedbackModal";
import AuthToast from "./AuthToast";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import ForgotPasswordFlow from "./ForgotPasswordFlow";
import SocialLoginButtons from "./SocialLoginButtons";
import HeritageLandmarksArt from "./HeritageLandmarksArt";
import { translateAuthError } from "@/services/errorMessage";

export default function AuthScreen({ initialTab = "login" }) {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();

  // Tab chuyển đổi: "login" (Đăng nhập) | "register" (Đăng ký tài khoản)
  const [activeTab, setActiveTab] = useState(initialTab);

  // Trạng thái ẩn/hiện mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form Đăng nhập (để trống — người dùng tự nhập)
  const [loginForm, setLoginForm] = useState({
    identifier: "",
    password: "",
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

  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Modal thông báo chuyển hướng kèm Progress bar
  const [feedbackModal, setFeedbackModal] = useState({
    isOpen: false,
    type: "login",
    title: "",
    subtitle: "",
    roleBadge: "",
    targetLabel: "",
    redirectPath: "/",
  });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 3800);
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
      const result = await authService.login({ email, password });
      const payload = result?.data || result;
      const user = payload?.user;
      const accessToken = payload?.accessToken || payload?.token;
      const refreshToken = payload?.refreshToken;

      if (!user) {
        throw new Error(result?.message || "Không nhận được dữ liệu người dùng từ máy chủ.");
      }

      // ==========================================================================
      // KIỂM TRA TRẠNG THÁI HOẠT ĐỘNG CỦA TÀI KHOẢN
      // Tài khoản bị vô hiệu hóa (active = false) phải bị chặn ngay từ bước
      // đăng nhập, không cho phép vào hệ thống. Thông báo rõ ràng hướng dẫn
      // người dùng liên hệ quản trị viên để được khôi phục.
      // ==========================================================================
      if (user.active === false) {
        setLoading(false);
        showToast(
          "error",
          "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hướng dẫn khôi phục."
        );
        return;
      }

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
      } else if (roleStr === "PARTNER") {
        // Đối tác tài chính — theo dõi doanh thu, ví, tất toán.
        targetPath = ROUTES.PARTNER || "/partner";
        roleTitle = "Đối tác tài chính";
        roleScope = "Doanh thu, ví & tất toán";
      } else {
        targetPath = ROUTES.HOME || "/";
        roleTitle = "Du khách khám phá";
        roleScope = "Khám phá di sản";
      }

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

      setFeedbackModal({
        isOpen: true,
        type: "login",
        title: "Xác thực hành trình thành công!",
        subtitle: `Chào mừng bạn quay trở lại. Đang mở ${roleTitle} trên nền tảng JourneyGo...`,
        roleBadge: roleTitle,
        targetLabel: targetPath === "/" ? "Cổng Khám Phá" : targetPath,
        redirectPath: targetPath,
      });

      setTimeout(() => {
        setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
        router.push(targetPath);
      }, 1250);
    } catch (err) {
      console.error("[Login Error]", err);
      const errMsg = translateAuthError(
        err,
        "Đăng nhập thất bại. Vui lòng kiểm tra lại Email và Mật khẩu."
      );
      showToast("error", errMsg);
      setLoading(false);
    }
  };

  // ============================================================================
  // XỬ LÝ ĐĂNG KÝ
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
      const targetRoleEnum = "TOURIST";

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
      } else if (roleStr === "PARTNER") {
        targetPath = ROUTES.PARTNER || "/partner";
        roleTitle = "Đối tác tài chính";
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
          roleScope: "Khám phá di sản",
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

      setFeedbackModal({
        isOpen: true,
        type: "register",
        title: "Chào mừng thành viên mới!",
        subtitle: "Đang tự động đăng nhập và đưa bạn tới cổng khám phá...",
        roleBadge: roleTitle,
        targetLabel: targetPath === "/" ? "Cổng khám phá (Tourist)" : targetPath,
        redirectPath: targetPath,
      });

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

  // ============================================================================
  // XỬ LÝ ĐĂNG NHẬP GOOGLE OAUTH2 (ID TOKEN POPUP FLOW)
  // ============================================================================
  const googleInitializedRef = useRef(false);

  const handleGoogleCredentialResponse = async (response) => {
    // response.credential chính là chuỗi Google ID Token từ Google SDK
    if (!response?.credential) {
      showToast("error", "Không nhận được ID Token từ Google.");
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithGoogle(response.credential, "TOURIST", {
        redirect: false,
      });

      if (res?.success) {
        const user = res.user;

        // ==========================================================================
        // KIỂM TRA TRẠNG THÁI HOẠT ĐỘNG CỦA TÀI KHOẢN (Google OAuth)
        // Tài khoản bị vô hiệu hóa phải bị chặn ngay từ bước đăng nhập.
        // ==========================================================================
        if (user?.active === false) {
          setLoading(false);
          showToast(
            "error",
            "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hướng dẫn khôi phục."
          );
          return;
        }

        const roleTitle = res.roleTitle || "Người dùng";
        const targetPath = res.targetPath || ROUTES.HOME || "/";

        setFeedbackModal({
          isOpen: true,
          type: "login",
          title: "Đăng nhập Google thành công!",
          subtitle: `Chào mừng ${user?.fullName || user?.email || "bạn"}. Đang kết nối phiên làm việc...`,
          roleBadge: roleTitle,
          targetLabel: targetPath === "/" ? "Trang chủ" : targetPath,
          redirectPath: targetPath,
        });

        setTimeout(() => {
          setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
          router.push(targetPath);
        }, 1250);
      } else {
        showToast("error", res?.error || "Đăng nhập Google thất bại.");
      }
    } catch (err) {
      console.error("[Google Login Error]", err);
      showToast("error", translateAuthError(err, "Đăng nhập Google thất bại."));
    } finally {
      setLoading(false);
    }
  };

  // Khởi tạo Google Identity Services MỘT LẦN và render nút đăng nhập chính thức của Google
  // vào một vùng ẩn. Nút tùy chỉnh của giao diện sẽ kích hoạt nút ẩn này (popup chuẩn).
  // Không dùng One Tap (prompt) làm luồng chính vì bị FedCM hủy / Google tạm khóa sau khi
  // người dùng đóng, và gọi initialize() nhiều lần sẽ hủy yêu cầu đang chạy.
  const googleButtonRef = useRef(null);
  const googleCallbackRef = useRef(handleGoogleCredentialResponse);
  useEffect(() => {
    // Luôn gọi bản handler mới nhất (handler đọc state của component).
    googleCallbackRef.current = handleGoogleCredentialResponse;
  });

  useEffect(() => {
    let attempts = 0;
    let timer;
    const tryInit = () => {
      if (typeof window === "undefined" || !window.google?.accounts?.id) {
        return false;
      }
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId || clientId.includes("your-google-client-id")) {
        return true; // không có clientId thì khỏi retry
      }
      try {
        if (!googleInitializedRef.current) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => googleCallbackRef.current(response),
            auto_select: false,
          });
          googleInitializedRef.current = true;
        }
        if (googleButtonRef.current) {
          googleButtonRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            width: 240,
          });
        }
        return true;
      } catch (e) {
        console.warn("[Google GIS Init Error]", e);
        return false;
      }
    };

    if (!tryInit()) {
      timer = setInterval(() => {
        attempts++;
        if (tryInit() || attempts > 25) {
          clearInterval(timer);
        }
      }, 200);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const handleGoogleClick = () => {
    if (typeof window === "undefined" || !window.google?.accounts?.id) {
      showToast("error", "Google SDK chưa sẵn sàng, vui lòng thử lại sau giây lát.");
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || clientId.includes("your-google-client-id")) {
      showToast("info", "Vui lòng cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID hợp lệ trong .env.local.");
      return;
    }

    // Kích hoạt nút chính thức của Google đã render ẩn (popup đăng nhập chuẩn).
    const nativeButton =
      googleButtonRef.current?.querySelector('div[role="button"]') ||
      googleButtonRef.current?.querySelector("iframe");
    if (nativeButton && typeof nativeButton.click === "function") {
      nativeButton.click();
      return;
    }

    // Dự phòng: One Tap, KHÔNG gọi lại initialize().
    try {
      window.google.accounts.id.prompt();
    } catch (err) {
      console.error("[Google OAuth Prompt Error]", err);
      showToast("error", "Không mở được cửa sổ đăng nhập Google. Vui lòng thử lại.");
    }
  };

  // ============================================================================
  // ĐĂNG NHẬP NHANH SSO / DOANH NGHIỆP
  // ============================================================================
  const handleSocialLogin = (providerName) => {
    if (providerName === "Google") {
      handleGoogleClick();
      return;
    }

    // Chỉ Google hiện có luồng xác thực thật; các nhà cung cấp khác chưa hỗ trợ.
    showToast("info", `Đăng nhập bằng ${providerName} hiện chưa được hỗ trợ.`);
  };

  return (
    <div
      suppressHydrationWarning
      className="relative h-screen w-screen max-h-screen overflow-hidden bg-[#eef6fc] flex items-center justify-center p-3 sm:p-4 xl:p-8"
    >
      {/* Vòng sáng nền mờ tạo độ sâu */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Nút quay về xem Trang chủ nổi ở góc trên bên trái */}
      <Link
        href="/"
        className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50 inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-white/95 hover:bg-white text-slate-700 hover:text-emerald-600 shadow-md hover:shadow-lg border border-sky-100 backdrop-blur-md transition-all duration-200 font-semibold text-xs sm:text-sm group"
        title="Quay lại Trang chủ Journey Go"
      >
        <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
        <Home className="w-4 h-4 text-emerald-600" />
        <span>Xem trang chủ</span>
      </Link>

      {/* Modal phản hồi xác thực & chuyển hướng */}
      <AuthFeedbackModal feedbackModal={feedbackModal} />

      {/* Card chính Split-screen 5/12 và 7/12 bo góc mềm mại như Hình 2 */}
      <div
        suppressHydrationWarning
        className="relative w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1360px] h-[96vh] max-h-[920px] min-h-[580px] bg-white rounded-3xl xl:rounded-[36px] shadow-[0_20px_60px_-15px_rgba(0,159,227,0.18),0_10px_25px_-5px_rgba(0,0,0,0.04)] border border-sky-100/70 overflow-hidden grid grid-cols-1 lg:grid-cols-12 z-10"
      >
        {/* Toast thông báo */}
        <AuthToast toast={toast} onClose={() => setToast(null)} />

        {/* Cột trái Hero Banner Di sản & Du lịch văn hóa (5/12) */}
        <AuthHeroCarousel />

        {/* Cột phải Form Xác thực phỏng theo Hình 2 (7/12) */}
        <div className="relative lg:col-span-7 col-span-12 flex flex-col justify-between overflow-hidden h-full bg-white p-6 sm:p-8 xl:p-12">
          {/* Họa tiết máy bay lượn trên góc phải chuẩn xác theo Hình 2 */}
          <div
            aria-hidden="true"
            className="absolute top-4 right-6 pointer-events-none select-none z-10 hidden sm:block"
          >
            <svg
              className="w-32 h-20 text-[#009fe3]"
              viewBox="0 0 120 70"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Đường bay cong chấm gạch mềm mại */}
              <path
                d="M 5 62 C 45 50, 78 22, 102 18"
                stroke="#009fe3"
                strokeWidth="1.6"
                strokeDasharray="3.5 3.5"
                strokeLinecap="round"
              />
              {/* Biểu tượng máy bay phản lực bay hướng góc phải */}
              <g transform="translate(104, 18) rotate(48)">
                <path
                  d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                  fill="#009fe3"
                  transform="scale(0.85) translate(-11, -11)"
                />
              </g>
            </svg>
          </div>

          <div className="w-full flex flex-col justify-between h-full space-y-3 z-10">
            {/* Chế độ Quên mật khẩu & Khôi phục bằng OTP */}
            {activeTab === "forgot_password" ? (
              <ForgotPasswordFlow
                initialEmail={loginForm.identifier}
                onBackToLogin={() => setActiveTab("login")}
                onResetSuccess={(resetEmail) => {
                  setLoginForm((prev) => ({
                    ...prev,
                    identifier: resetEmail,
                    password: "",
                  }));
                  setActiveTab("login");
                  showToast(
                    "success",
                    "Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới."
                  );
                }}
              />
            ) : (
              <>
                {/* Tiêu đề Chào mừng bạn quay trở lại */}
                <div className="space-y-1 pt-1 sm:pt-2">
                  <div className="flex items-center justify-between pb-1">
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors group"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
                      <span>Xem trang chủ Journey Go</span>
                    </Link>
                  </div>
                  <h1 className="font-jakarta text-2xl sm:text-[26px] xl:text-[28px] font-bold text-[#009fe3] tracking-tight leading-snug">
                    {activeTab === "login"
                      ? "Chào mừng bạn quay trở lại"
                      : "Đăng Ký Tài Khoản"}
                  </h1>
                  <p className="text-xs sm:text-sm font-medium text-slate-400 mt-0.5">
                    {activeTab === "login"
                      ? "Đăng nhập bằng Email & Mật khẩu"
                      : "Khởi tạo tài khoản quản trị & đối tác"}
                  </p>
                </div>

                {/* Form Đăng nhập hoặc Form Đăng ký */}
                {activeTab === "login" ? (
                  <LoginForm
                    loginForm={loginForm}
                    setLoginForm={setLoginForm}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    loading={loading}
                    onSubmit={handleLoginSubmit}
                    onShowToast={showToast}
                    onForgotPassword={() => setActiveTab("forgot_password")}
                  />
                ) : (
                  <RegisterForm
                    registerForm={registerForm}
                    setRegisterForm={setRegisterForm}
                    showPassword={showPassword}
                    showConfirmPassword={showConfirmPassword}
                    setShowPassword={setShowPassword}
                    setShowConfirmPassword={setShowConfirmPassword}
                    loading={loading}
                    onSubmit={handleRegisterSubmit}
                  />
                )}

                {/* Các nút Đăng nhập nhanh Google / SSO / Apple chuẩn Hình 2 */}
                <SocialLoginButtons
                  onSocialLogin={handleSocialLogin}
                  onGoogleLogin={handleGoogleClick}
                  loading={loading}
                />

                {/* Dòng liên kết chuyển đổi Đăng ký / Đăng nhập */}
                <div className="text-center pt-1 w-full">
                  {activeTab === "login" ? (
                    <p className="text-xs text-slate-600">
                      Chưa có tài khoản?{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("register")}
                        className="font-bold text-slate-900 hover:text-[#009fe3] transition-colors cursor-pointer"
                      >
                        Đăng ký ngay
                      </button>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600">
                      Đã có tài khoản?{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("login")}
                        className="font-bold text-slate-900 hover:text-[#009fe3] transition-colors cursor-pointer"
                      >
                        Đăng nhập ngay
                      </button>
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Footer bản quyền */}
            <div className="text-center pt-0.5 w-full">
              <p className="text-[10px] text-slate-400">
                Bảo hộ bởi JourneyGo Identity Service • Phiên bản 2.5
              </p>
            </div>
          </div>

          {/* Đồ họa danh thắng chân trang vector xanh ngọc chuẩn Hình 2 */}
          <HeritageLandmarksArt />
        </div>
      </div>

      {/* Nút Google chính thức (ẩn): nút tùy chỉnh bên trên sẽ kích hoạt nó */}
      <div
        ref={googleButtonRef}
        aria-hidden="true"
        style={{ position: "fixed", left: -9999, top: 0, width: 240, height: 44, opacity: 0 }}
      />

      {/* Tải thư viện Google Identity Services (GSI) */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />
    </div>
  );
}
