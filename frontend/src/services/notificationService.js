import { apiClient } from "./apiClient";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8088/api/v1";

/** API thông báo trong ứng dụng (cái chuông). */
export const notificationService = {
  list: ({ page = 0, size = 20, unreadOnly = false } = {}) =>
    apiClient.get(`/notifications?page=${page}&size=${size}&unreadOnly=${unreadOnly}`),
  unreadCount: () => apiClient.get("/notifications/unread-count"),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch("/notifications/read-all"),
};

function readToken() {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("jg_access_token");
  if (token) return token;
  try {
    const auth = JSON.parse(localStorage.getItem("journey_go_auth") || "{}");
    return auth?.token || auth?.accessToken || null;
  } catch {
    return null;
  }
}

/**
 * Mở luồng SSE `/notifications/stream`.
 *
 * Dùng fetch (không dùng EventSource) để gửi được header Authorization. Hàm chạy tới khi luồng
 * đóng hoặc `signal` bị hủy; mỗi sự kiện gọi `onEvent(name, data)`. Ném lỗi có `status` khi
 * máy chủ từ chối (401 → người gọi làm mới token rồi kết nối lại).
 */
export async function streamNotifications({ signal, onEvent, onOpen }) {
  const token = readToken();
  if (!token) {
    const err = new Error("Chưa đăng nhập");
    err.status = 401;
    throw err;
  }

  const res = await fetch(`${BASE_URL}/notifications/stream`, {
    headers: { Accept: "text/event-stream", Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal,
  });
  if (!res.ok || !res.body) {
    const err = new Error(`Không mở được luồng thông báo (${res.status})`);
    err.status = res.status;
    throw err;
  }
  onOpen?.();

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    // Mỗi sự kiện SSE kết thúc bằng một dòng trống
    let sep;
    while ((sep = buffer.search(/\r?\n\r?\n/)) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep).replace(/^\r?\n\r?\n/, "");
      dispatchBlock(block, onEvent);
    }
  }
}

function dispatchBlock(block, onEvent) {
  let name = "message";
  const dataLines = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue; // dòng chú thích (ping)
    const idx = line.indexOf(":");
    const field = idx === -1 ? line : line.slice(0, idx);
    const value = idx === -1 ? "" : line.slice(idx + 1).replace(/^ /, "");
    if (field === "event") name = value;
    else if (field === "data") dataLines.push(value);
  }
  if (!dataLines.length) return;
  const raw = dataLines.join("\n");
  let data = raw;
  try {
    data = JSON.parse(raw);
  } catch {
    /* dữ liệu dạng chữ */
  }
  onEvent(name, data);
}

/** Làm mới access token (dùng lại logic của apiClient) — trả về token mới hoặc null. */
export const refreshAccessToken = () => apiClient.refreshToken();
