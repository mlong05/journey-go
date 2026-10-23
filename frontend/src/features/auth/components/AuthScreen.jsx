"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { ROUTES } from "@/constants/routes";
import { STORAGE_KEYS } from "@/constants";
import { authService } from "../services/authService";
import { useAuth } from "../hooks/useAuth";
import { ROLES } from "../constants/authData";

import AuthHeroCarousel from "./AuthHeroCarousel";
import AuthFeedbackModal from "./AuthFeedbackModal";
import AuthToast from "./AuthToast";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import ForgotPasswordFlow from "./ForgotPasswordFlow";
import SocialLoginButtons from "./SocialLoginButtons";
import { translateAuthError } from "@/services/errorMessage";

export default function AuthScreen({ initialTab = "login" }) {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();

  // Tab chuyển đổi: "login" (Đăng nhập) | "register" (Đăng ký tài khoản)
  const [activeTab, setActiveTab] = useState(initialTab);

  // Vai trò truy cập được chọn (Mặc định: Quản trị viên)
  const [selectedRoleId, setSelectedRoleId] = useState("admin");
  const selectedRole = ROLES.find((r) => r.id === selectedRoleId) || ROLES[0];

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

  
  const handleSelectRole = (roleId) => {
    // Chỉ đổi pill vai trò — KHÔNG tự động điền tài khoản/mật khẩu mẫu.
    // Người dùng phải tự nhập email và mật khẩu.
    setSelectedRoleId(roleId);
  };

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

      // ==========================================================================
      // KIỂM TRA KHỚP VAI TRÒ: Tài khoản phải thuộc đúng role đã chọn ở UI
      // Ví dụ: chọn "Quản trị viên" thì chỉ user.role = ADMIN mới được vào.
      // Lưu ý: Thông báo lỗi chỉ nêu chung "tài khoản/mật khẩu không đúng"
      // để không lộ thông tin role thật của tài khoản.
      // ==========================================================================
      const expectedRole = String(selectedRole?.roleEnum || "").toUpperCase();
      if (expectedRole && roleStr !== expectedRole) {
        setLoading(false);
        showToast(
          "error",
          "Tài khoản hoặc mật khẩu không đúng. Vui lòng kiểm tra lại hoặc chọn đúng vai trò tương ứng."
        );
        return;
      }

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
        title: "Đăng nhập thành công!",
        subtitle: `Chào mừng bạn quay trở lại. Đang kết nối phiên làm việc cho ${roleTitle}...`,
        roleBadge: roleTitle,
        targetLabel: targetPath === "/" ? "Trang chủ (Tourist)" : targetPath,
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
      const targetRoleEnum = selectedRole.roleEnum || (selectedRoleId === "provider" ? "PROVIDER" : "TOURIST");

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
      const targetRoleEnum =
        selectedRole?.roleEnum ||
        (selectedRoleId === "provider" ? "PROVIDER" : "TOURIST");

      const res = await loginWithGoogle(response.credential, targetRoleEnum, {
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

        // ==========================================================================
        // KIỂM TRA KHỚP VAI TRÒ cho luồng Google OAuth.
        // Thông báo lỗi chung chung, không lộ role thật của tài khoản.
        // ==========================================================================
        const actualRole = String(user?.role || "").toUpperCase();
        const expectedRole = String(
          selectedRole?.roleEnum || targetRoleEnum || ""
        ).toUpperCase();
        if (expectedRole && actualRole && actualRole !== expectedRole) {
          setLoading(false);
          showToast(
            "error",
            "Tài khoản hoặc mật khẩu không đúng. Vui lòng kiểm tra lại hoặc chọn đúng vai trò tương ứng."
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

  // Khởi tạo Google Identity Services: chỉ gọi initialize() để có thể dùng
  // prompt() khi người dùng bấm nút. KHÔNG dùng renderButton() vì nút chính
  // thức của Google sẽ render lại mỗi lần đổi role gây nhấp nháy text
  // (đổi qua lại giữa "Sign in with Google" và "Đăng nhập với Google").
  // Thay vào đó, dùng nút custom "Đăng nhập với Google" trong SocialLoginButtons.
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
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
        });
        googleInitializedRef.current = true;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleId, selectedRole]);

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

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
      });
      window.google.accounts.id.prompt();
    } catch (err) {
      console.error("[Google OAuth Prompt Error]", err);
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

    setLoading(true);
    showToast("info", `Đang kết nối xác thực ${providerName}...`);

    setTimeout(() => {
      // ==========================================================================
      // KIỂM TRA KHỚP VAI TRÒ cho luồng SSO mô phỏng:
      // Account SSO mặc định thuộc role của providerName đó (mỗi nhà cung cấp
      // gắn với 1 role cố định). Nếu role đó khác pill đã chọn → chặn.
      // Thông báo lỗi chung chung, không lộ role thật của tài khoản.
      // ==========================================================================
      const ssoRoleMap = {
        "Doanh nghiệp": "PROVIDER",
      };
      const ssoAccountRole = ssoRoleMap[providerName] || "TOURIST";
      const expectedRole = String(selectedRole?.roleEnum || "").toUpperCase();
      if (expectedRole && ssoAccountRole !== expectedRole) {
        setLoading(false);
        showToast(
          "error",
          "Tài khoản hoặc mật khẩu không đúng. Vui lòng kiểm tra lại hoặc chọn đúng vai trò tương ứng."
        );
        return;
      }

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
    <div
      suppressHydrationWarning
      className="relative h-screen w-screen max-h-screen overflow-hidden bg-slate-100 flex items-center justify-center p-4 xl:p-8"
    >
      {/* Modal phản hồi xác thực & chuyển hướng */}
      <AuthFeedbackModal feedbackModal={feedbackModal} />

      {/* Card chính Split-screen 5/12 và 7/12 */}
      <div
        suppressHydrationWarning
        className="relative w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1380px] h-[98vh] max-h-[950px] min-h-[580px] bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12"
      >
        {/* Toast thông báo */}
        <AuthToast toast={toast} onClose={() => setToast(null)} />

        {/* Cột trái Hero Banner Di sản (5/12) */}
        <AuthHeroCarousel />

        {/* Cột phải Form Xác thực (7/12) */}
        <div className="relative lg:col-span-7 col-span-12 flex flex-col justify-between overflow-hidden h-full bg-white p-8 xl:p-12">
          <div className="w-full flex flex-col justify-between h-full space-y-4">
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
                {/* Header & Chuyển đổi Tab Đăng nhập / Đăng ký */}
                <div className="space-y-3">
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1 w-fit border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setActiveTab("login")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === "register"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Đăng ký tài khoản
                    </button>
                  </div>

                  <div>
                    <h1 className="text-2xl xl:text-3xl font-black text-slate-900 tracking-tight">
                      {activeTab === "login"
                        ? "Đăng Nhập Hệ Thống"
                        : "Đăng Ký Thành Viên"}
                    </h1>
                  </div>
                </div>

                {/* Form Đăng nhập hoặc Form Đăng ký */}
                {activeTab === "login" ? (
                  <LoginForm
                    loginForm={loginForm}
                    setLoginForm={setLoginForm}
                    roles={ROLES}
                    selectedRoleId={selectedRoleId}
                    onSelectRole={handleSelectRole}
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

                {/* Các nút Đăng nhập nhanh SSO / Doanh nghiệp */}
                <SocialLoginButtons
                  onSocialLogin={handleSocialLogin}
                  onGoogleLogin={handleGoogleClick}
                  loading={loading}
                />
              </>
            )}

            {/* Footer bản quyền */}
            <div className="text-center pt-1 w-full">
              <p className="text-[11px] text-slate-400">
                Bảo hộ bởi JourneyGo Identity Service • Phiên bản 2.5
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tải thư viện Google Identity Services (GSI) */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />
    </div>
  );
}
