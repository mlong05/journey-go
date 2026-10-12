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

  logout: async () => {
    return apiClient.post("/auth/logout");
  },
};
