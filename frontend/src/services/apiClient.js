/**
 * Base API Client wrapper dùng Fetch API.
 *
 * ── Hành vi chuẩn hoá ──
 *  • Mọi response đều là envelope `{ code, message, data, timestamp }`.
 *    - Thành công (2xx): trả nguyên envelope, caller tự lấy `.data`.
 *    - Lỗi: ném `Error` với `message` = message tiếng Việt của backend (đã viết sẵn theo
 *      ngữ cảnh nghiệp vụ — KHÔNG tự viết lại), kèm `code` (mã lỗi nghiệp vụ) và
 *      `status` (HTTP status) để UI xử lý riêng các mã đặc biệt.
 *  • 401 → tự refresh token rồi retry đúng 1 lần. Nếu refresh thất bại, mọi request đang
 *    chờ phải được reject (không được treo vô hạn).
 */

/** Lỗi API chuẩn hoá — `message` đã là tiếng Việt để hiển thị trực tiếp. */
export class ApiError extends Error {
  constructor(message, { code = null, status = null, payload = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.payload = payload;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8088/api/v1";

const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.isRefreshing = false;
    this.refreshSubscribers = [];
  }

  onRefreshed(token) {
    const subscribers = this.refreshSubscribers;
    this.refreshSubscribers = [];
    subscribers.forEach((callback) => callback(token));
  }

  onRefreshFailed(error) {
    const subscribers = this.refreshSubscribers;
    this.refreshSubscribers = [];
    subscribers.forEach((callback) => callback(null, error));
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

  /** Đọc access token hiện tại từ localStorage. */
  getAccessToken() {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem("jg_access_token");
    if (token) return token;
    try {
      const authObj = JSON.parse(localStorage.getItem("journey_go_auth") || "{}");
      return authObj?.token || authObj?.accessToken || null;
    } catch {
      return null;
    }
  }

  /** Xóa phiên đăng nhập cục bộ khi refresh token không còn dùng được. */
  clearSession() {
    if (typeof window === "undefined") return;
    [
      "jg_access_token",
      "jg_refresh_token",
      "jg_user_info",
      "journey_go_auth",
    ].forEach((key) => localStorage.removeItem(key));
    window.dispatchEvent(new Event("storage"));
  }

  async request(endpoint, options = {}, isRetry = false) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getAccessToken();

    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const config = {
      ...options,
      headers,
    };

    let response;
    let data = null;

    try {
      response = await fetch(url, config);
      data = await response.json().catch(() => null);
    } catch (networkError) {
      console.error(`[API Error] ${options.method || "GET"} ${endpoint}:`, networkError?.message);
      throw new ApiError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.", {
        status: 0,
      });
    }

    // 401 → refresh token rồi retry đúng 1 lần.
    if (response.status === 401 && !isRetry && !AUTH_ENDPOINTS.some((a) => endpoint.includes(a))) {
      const newToken = await this.ensureFreshToken();
      if (newToken) {
        return this.request(endpoint, options, true);
      }
      this.clearSession();
      throw new ApiError(data?.message || "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.", {
        code: data?.code ?? null,
        status: 401,
        payload: data,
      });
    }

    if (!response.ok) {
      throw new ApiError(
        data?.message || `Không thể xử lý yêu cầu (mã ${response.status}).`,
        { code: data?.code ?? null, status: response.status, payload: data },
      );
    }

    return data;
  }

  /**
   * Đảm bảo có access token mới.
   * - Chưa có request refresh nào chạy → chạy refresh, rồi báo cho mọi request đang chờ.
   * - Đang có refresh chạy → chờ và nhận kết quả.
   * Nếu refresh thất bại → resolve `null` cho TẤT CẢ subscriber (tránh request treo).
   */
  ensureFreshToken() {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.addRefreshSubscriber((newToken) => resolve(newToken || null));
      });
    }

    this.isRefreshing = true;
    return this.refreshToken()
      .then((newToken) => {
        this.isRefreshing = false;
        if (newToken) {
          this.onRefreshed(newToken);
        } else {
          this.onRefreshFailed(new Error("Refresh token không hợp lệ"));
        }
        return newToken || null;
      })
      .catch(() => {
        this.isRefreshing = false;
        this.onRefreshFailed(new Error("Refresh token không hợp lệ"));
        return null;
      });
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

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "PATCH",
      body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
    });
  }

  upload(endpoint, formData, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "POST",
      body: formData,
    });
  }
}

export const apiClient = new ApiClient(BASE_URL);
