import { apiClient } from "@/services/apiClient";

export const authService = {
  login: async (credentials) => {
    return apiClient.post("/auth/login", credentials);
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
};
