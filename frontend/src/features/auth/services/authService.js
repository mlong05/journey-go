import { apiClient } from "@/services/apiClient";

export const authService = {
  login: async (credentials) => {
    return apiClient.post("/auth/login", credentials);
  },

  loginWithGoogle: async (idToken, role = "USER") => {
    return apiClient.post("/auth/google", { idToken, role });
  },

  register: async (userData) => {
    return apiClient.post("/auth/register", userData);
  },

  getProfile: async () => {
    return apiClient.get("/auth/me");
  },

  refreshToken: async (refreshToken) => {
    let token = refreshToken;
    if (!token && typeof window !== "undefined") {
      token =
        localStorage.getItem("jg_refresh_token") ||
        JSON.parse(localStorage.getItem("journey_go_auth") || "{}")?.refreshToken;
    }
    return apiClient.post("/auth/refresh", { refreshToken: token });
  },

  logout: async (refreshToken) => {
    let token = refreshToken;
    if (!token && typeof window !== "undefined") {
      token =
        localStorage.getItem("jg_refresh_token") ||
        JSON.parse(localStorage.getItem("journey_go_auth") || "{}")?.refreshToken;
    }
    return apiClient.post("/auth/logout", token ? { refreshToken: token } : {});
  },

  // Gửi mã OTP khôi phục mật khẩu
  forgotPassword: async (email) => {
    return apiClient.post("/auth/forgot-password", { email });
  },

  // Xác thực mã OTP 6 chữ số
  verifyOtp: async (email, otp) => {
    return apiClient.post("/auth/verify-otp", { email, otp });
  },

  // Đặt lại mật khẩu mới bằng mã OTP
  resetPassword: async ({ email, otp, newPassword, confirmPassword }) => {
    return apiClient.post("/auth/reset-password", {
      email,
      otp,
      newPassword,
      confirmPassword,
    });
  },

  // Đổi mật khẩu tài khoản khi đã đăng nhập
  changePassword: async ({ currentPassword, newPassword, confirmPassword }) => {
    return apiClient.post("/auth/change-password", {
      currentPassword,
      newPassword,
      confirmPassword,
    });
  },
};

