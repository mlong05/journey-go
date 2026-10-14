/**
 * Base API Client wrapper dùng Fetch API
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8088/api/v1";

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.isRefreshing = false;
    this.refreshSubscribers = [];
  }

  onRefreshed(token) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  addRefreshSubscriber(callback) {
    this.refreshSubscribers.push(callback);
  }

  async refreshToken() {
    if (typeof window === "undefined") return null;
    const refreshToken =
      localStorage.getItem("jg_refresh_token") ||
      JSON.parse(localStorage.getItem("journey_go_auth") || "{}")?.refreshToken;

    if (!refreshToken) return null;

    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.data?.accessToken) {
        const newAccessToken = data.data.accessToken;
        localStorage.setItem("jg_access_token", newAccessToken);
        const currentAuth = JSON.parse(localStorage.getItem("journey_go_auth") || "{}");
        if (currentAuth && typeof currentAuth === "object") {
          currentAuth.token = newAccessToken;
          currentAuth.accessToken = newAccessToken;
          if (data.data.refreshToken) {
            currentAuth.refreshToken = data.data.refreshToken;
            localStorage.setItem("jg_refresh_token", data.data.refreshToken);
          }
          localStorage.setItem("journey_go_auth", JSON.stringify(currentAuth));
        }
        window.dispatchEvent(new Event("storage"));
        return newAccessToken;
      }
    } catch (e) {
      console.warn("[Auto Refresh Error]", e);
    }
    return null;
  }

  async request(endpoint, options = {}, isRetry = false) {
    const url = `${this.baseUrl}${endpoint}`;
    let token = null;
    if (typeof window !== "undefined") {
      token = localStorage.getItem("jg_access_token");
      if (!token) {
        try {
          const authObj = JSON.parse(localStorage.getItem("journey_go_auth") || "{}");
          token = authObj?.token || authObj?.accessToken || null;
        } catch {
          token = null;
        }
      }
    }

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => null);

      // Nếu gặp lỗi 401 và không phải các API auth cơ bản -> Tự động refresh token
      if (
        response.status === 401 &&
        !isRetry &&
        !endpoint.includes("/auth/login") &&
        !endpoint.includes("/auth/refresh") &&
        !endpoint.includes("/auth/logout")
      ) {
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          const newToken = await this.refreshToken();
          this.isRefreshing = false;
          if (newToken) {
            this.onRefreshed(newToken);
            return this.request(endpoint, options, true);
          }
        } else {
          return new Promise((resolve, reject) => {
            this.addRefreshSubscriber((newToken) => {
              if (newToken) {
                resolve(this.request(endpoint, options, true));
              } else {
                reject(new Error(data?.message || "Phiên làm việc đã hết hạn"));
              }
            });
          });
        }
      }

      if (!response.ok) {
        throw new Error(data?.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`[API Error] ${options.method || "GET"} ${endpoint}:`, error.message);
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "GET" });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient(BASE_URL);
