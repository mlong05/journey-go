"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import Script from "next/script";
import { ROUTES } from "@/constants/routes";
import { STORAGE_KEYS } from "@/constants";
import { authService } from "../services/authService";
import { useAuth } from "../hooks/useAuth";

import AuthHeroCarousel from "./AuthHeroCarousel";
import AuthFeedbackModal from "./AuthFeedbackModal";
import AuthToast from "./AuthToast";
import LoginForm from "./LoginForm";
import RegisterForm, { validateRegister } from "./RegisterForm";
import ForgotPasswordFlow from "./ForgotPasswordFlow";
import SocialLoginButtons from "./SocialLoginButtons";
import HeritageLandmarksArt from "./HeritageLandmarksArt";
import BronzeDrumMotif from "@/components/ui/BronzeDrumMotif";
import { translateAuthError } from "@/services/errorMessage";

import { resolvePostLoginPath, readLoginReasonMessage } from "@/services/authRedirect";
import { getLocale, translate, useT } from "@/i18n";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

export default function AuthScreen({ initialTab = "login" }) {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const t = useT();

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

  // Bị chuyển tới đây vì hết phiên / chưa đăng nhập (?reason=expired|required) ⇒ báo rõ lý do.
  useEffect(() => {
    const reason = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("reason")
      : null;
    const msg = reason === "expired"
      ? translate(getLocale(), "misc.auth.reasonExpired")
      : reason === "required"
        ? translate(getLocale(), "misc.auth.reasonRequired")
        : readLoginReasonMessage();
    if (!msg) return undefined;
    const timer = setTimeout(() => {
      setToast({ type: "info", message: msg });
      setTimeout(() => setToast(null), 6000);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // ============================================================================
  // XỬ LÝ ĐĂNG NHẬP
  // ============================================================================
  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    const email = loginForm.identifier.trim();
    const password = loginForm.password;

    if (!email) {
      showToast("error", t("misc.auth.errEmptyEmail"));
      return;
    }
    if (!password) {
      showToast("error", t("misc.auth.errEmptyPassword"));
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
        throw new Error(result?.message || t("misc.auth.errNoUserData"));
      }

      // ==========================================================================
      // KIỂM TRA TRẠNG THÁI HOẠT ĐỘNG CỦA TÀI KHOẢN
      // Tài khoản bị vô hiệu hóa (active = false) phải bị chặn ngay từ bước
      // đăng nhập, không cho phép vào hệ thống. Thông báo rõ ràng hướng dẫn
      // người dùng liên hệ quản trị viên để được khôi phục.
      // ==========================================================================
      if (user.active === false) {
        setLoading(false);
        showToast("error", t("misc.auth.errAccountDisabled"));
        return;
      }

      const roleStr = String(user.role || "").toUpperCase();

      let targetPath = "/";
      let roleTitle = t("misc.role.tourist.titleExplorer");
      let roleScope = t("misc.role.tourist.scopeFull");

      if (roleStr === "ADMIN") {
        targetPath = ROUTES.ADMIN || "/admin";
        roleTitle = t("misc.role.admin.title");
        roleScope = t("misc.role.admin.scope");
      } else if (roleStr === "CONTENT_MODERATOR") {
        targetPath = ROUTES.MODERATOR || "/moderator";
        roleTitle = t("misc.role.moderator.title");
        roleScope = t("misc.role.moderator.scope");
      } else if (roleStr === "CONTENT_PROVIDER") {
        targetPath = ROUTES.PROVIDER || "/provider";
        roleTitle = t("misc.role.provider.title");
        roleScope = t("misc.role.provider.scopeFull");
      } else {
        targetPath = ROUTES.HOME || "/";
        roleTitle = t("misc.role.tourist.titleExplorer");
        roleScope = t("misc.role.tourist.scope");
      }
      // Quay lại đúng trang đang mở trước khi đăng nhập (callbackUrl), nếu thuộc khu vực của vai trò.
      const rolePath = targetPath;
      targetPath = resolvePostLoginPath(roleStr);

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
        rolePath,
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
        title: t("misc.auth.loginSuccessTitle"),
        subtitle: t("misc.auth.loginSuccessSubtitle", { roleTitle }),
        roleBadge: roleTitle,
        targetLabel: targetPath === "/" ? t("misc.auth.explorePortal") : targetPath,
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
        t("misc.auth.loginFailedCheck")
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

    // Cùng bộ kiểm tra với RegisterForm (lỗi chi tiết đã hiện dưới từng ô) — báo lỗi đầu tiên.
    const firstError = Object.values(validateRegister(registerForm, t))[0];
    if (firstError) {
      showToast("error", `${firstError}.`);
      return;
    }
    if (!registerForm.agreeTerms) {
      showToast("error", t("misc.auth.errAgreeTerms"));
      return;
    }

    setLoading(true);

    try {
      const targetRoleEnum = "TOURIST";

      const result = await authService.register({
        fullName: registerForm.fullName.trim().replace(/\s+/g, " "),
        phone: registerForm.phone.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        role: targetRoleEnum,
      });

      if (result?.success === false) {
        throw new Error(result?.message || t("misc.auth.registerFailedRetry"));
      }

      // Đăng ký xong KHÔNG tự đăng nhập/chuyển trang: ở lại trang xác thực, chuyển sang tab
      // Đăng nhập với email vừa tạo để người dùng tự đăng nhập.
      setLoading(false);
      setLoginForm((prev) => ({ ...prev, identifier: registerForm.email.trim(), password: "" }));
      setActiveTab("login");
      showToast("success", t("misc.auth.registerSuccessToast"));
    } catch (err) {
      console.error("[Register Error]", err);
      showToast("error", err?.message || t("misc.auth.registerFailedRetry"));
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
      showToast("error", t("misc.auth.errNoGoogleToken"));
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
          showToast("error", t("misc.auth.errAccountDisabled"));
          return;
        }

        const roleTitle = res.roleTitle || t("misc.role.user");
        // Quay lại đúng trang đang xem trước khi đăng nhập (callbackUrl), nếu thuộc khu vực của vai trò.
        const targetPath = resolvePostLoginPath(user?.role);

        setFeedbackModal({
          isOpen: true,
          type: "login",
          title: t("misc.auth.googleSuccessTitle"),
          subtitle: t("misc.auth.googleSuccessSubtitle", {
            name: user?.fullName || user?.email || t("misc.auth.defaultUserName"),
          }),
          roleBadge: roleTitle,
          targetLabel: targetPath === "/" ? t("misc.auth.homeLabel") : targetPath,
          redirectPath: targetPath,
        });

        setTimeout(() => {
          setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
          router.push(targetPath);
        }, 1250);
      } else {
        showToast("error", res?.error || t("misc.auth.googleFailedDot"));
      }
    } catch (err) {
      console.error("[Google Login Error]", err);
      showToast("error", translateAuthError(err, t("misc.auth.googleFailedDot")));
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
      showToast("error", t("misc.auth.googleSdkNotReady"));
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || clientId.includes("your-google-client-id")) {
      showToast("info", t("misc.auth.googleClientIdMissing"));
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
      showToast("error", t("misc.auth.googlePopupFailed"));
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
    showToast("info", t("misc.auth.socialUnsupported", { provider: providerName }));
  };

  return (
    <div
      suppressHydrationWarning
      className="jg-auth relative h-screen w-screen overflow-hidden bg-white grid grid-cols-1 lg:grid-cols-12"
    >
      {/* Modal phản hồi xác thực & chuyển hướng */}
      <AuthFeedbackModal feedbackModal={feedbackModal} />

      {/* Toast thông báo */}
      <AuthToast toast={toast} onClose={() => setToast(null)} />

      {/* Cột trái: ảnh điểm đến văn hoá toàn chiều cao (ẩn trên mobile) */}
      <AuthHeroCarousel />

      {/* Cột phải: logo + form, nội dung căn giữa */}
      <div className="relative isolate lg:col-span-6 xl:col-span-7 col-span-12 h-screen overflow-hidden flex flex-col bg-white">
        {/* Trống đồng Đông Sơn mờ ở góc dưới phải: nằm dưới mọi nội dung (-z-10), không bắt sự kiện chuột */}
        <BronzeDrumMotif className="pointer-events-none absolute -z-10 -right-44 -bottom-44 w-[520px] h-[520px] text-amber-800/[0.07] motion-safe:animate-[spin_180s_linear_infinite]" />

          {/* Dây đèn lồng Hội An đung đưa nhẹ ở góc phải */}
          <div
            aria-hidden="true"
            className="absolute top-0 right-8 xl:right-12 pointer-events-none select-none z-10 hidden sm:flex items-start gap-4"
          >
            {[
              { h: 34, color: "#c2410c", delay: "0s", size: 1 },
              { h: 58, color: "#b91c1c", delay: "0.6s", size: 1.15 },
              { h: 22, color: "#d97706", delay: "1.2s", size: 0.9 },
            ].map((l, i) => (
              <span
                key={i}
                className="jg-lantern flex flex-col items-center origin-top"
                style={{ animationDelay: l.delay }}
              >
                <span className="w-px bg-amber-900/40" style={{ height: l.h }} />
                <svg width={26 * l.size} height={38 * l.size} viewBox="0 0 26 38">
                  <rect x="9" y="0" width="8" height="3" rx="1" fill="#78350f" />
                  <ellipse cx="13" cy="18" rx="12" ry="14" fill={l.color} />
                  <path d="M13 4 Q5 18 13 32 M13 4 Q21 18 13 32" stroke="#fde68a" strokeOpacity="0.55" strokeWidth="1" fill="none" />
                  <ellipse cx="13" cy="18" rx="12" ry="14" fill="url(#jg-lantern-glow)" />
                  <rect x="9" y="31" width="8" height="3" rx="1" fill="#78350f" />
                  <path d="M11 34 L10 38 M13 34 L13 38 M15 34 L16 38" stroke="#f59e0b" strokeWidth="1" />
                  <defs>
                    <radialGradient id="jg-lantern-glow" cx="0.4" cy="0.35" r="0.7">
                      <stop offset="0" stopColor="#fef3c7" stopOpacity="0.55" />
                      <stop offset="1" stopColor="#fef3c7" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                </svg>
              </span>
            ))}
          </div>


        {/* Logo thương hiệu (giống thanh bên trang quản trị) */}
        <header className="relative z-20 shrink-0 px-6 sm:px-10 xl:px-14 pt-5 [@media(max-height:760px)]:pt-3 flex items-center justify-between gap-4">
          <Link href={ROUTES.HOME} className="flex items-center gap-1.5 min-w-0" title={t("misc.auth.homeTitle")}>
            <Image
              src="/image/logo-emblem.png"
              alt="JourneyGo"
              width={372}
              height={380}
              priority
              className="h-12 w-auto shrink-0"
            />
            <Image
              src="/image/logo-wordmark.png"
              alt={t("misc.auth.logoWordmarkAlt")}
              width={424}
              height={104}
              priority
              className="h-9 w-auto min-w-0"
            />
          </Link>

          <div className="flex items-center gap-2 shrink-0 sm:mr-28">
            <LanguageSwitcher />
            {/* Trên mobile không có cột ảnh nên nút về trang chủ nằm ở đây */}
            <Link
              href={ROUTES.HOME}
              className="lg:hidden inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-stone-200 text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:border-emerald-200 transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t("misc.auth.homeLabel")}
            </Link>
          </div>
        </header>

        {/* Vùng form chiếm phần còn lại của màn hình, căn giữa; không hiện thanh cuộn
            (chỉ cuộn ngầm khi màn hình quá thấp để không mất nội dung) */}
        <main className="relative z-10 flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col px-6 sm:px-10 xl:px-14 py-4">
          <div className="m-auto w-full max-w-[440px] space-y-5 [@media(max-height:760px)]:space-y-3.5">
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
                    t("misc.auth.resetSuccessToast")
                  );
                }}
              />
            ) : (
              <>
                <div className="space-y-1.5">
                  {activeTab !== "login" && (
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 leading-normal">
                      <span className="w-5 h-px bg-amber-600/60" />
                      {t("misc.auth.joinJourney")}
                    </p>
                  )}
                  <h1 className="font-jakarta text-[26px] xl:text-[30px] font-bold text-emerald-900 tracking-tight leading-[1.3]">
                    {activeTab === "login" ? t("misc.auth.welcomeBack") : t("misc.auth.registerAccount")}
                  </h1>
                  {activeTab !== "login" && (
                    <p className="text-sm font-medium text-stone-500 leading-normal">
                      {t("misc.auth.registerSubtitle")}
                    </p>
                  )}
                </div>

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

                <SocialLoginButtons
                  onSocialLogin={handleSocialLogin}
                  onGoogleLogin={handleGoogleClick}
                  loading={loading}
                />

                <p className="text-center text-sm text-slate-600 leading-normal">
                  {activeTab === "login" ? t("misc.auth.noAccount") : t("misc.auth.haveAccount")}
                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab === "login" ? "register" : "login")}
                    className="font-bold text-emerald-800 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    {activeTab === "login" ? t("misc.auth.registerNow") : t("misc.auth.loginNow")}
                  </button>
                </p>
              </>
            )}
          </div>
        </main>

        {/* Hình bóng di sản Việt: trang trí mờ phía sau, sát đáy cột, không chiếm chỗ của form */}
        <HeritageLandmarksArt />

        {/* Chân trang: dòng bản quyền gọn, nằm trong luồng */}
        <footer className="relative z-10 shrink-0 pb-4 pt-1">
          <p className="text-center text-[11px] text-slate-400 leading-normal">
            {t("misc.auth.footerCopyright")}
          </p>
        </footer>
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
