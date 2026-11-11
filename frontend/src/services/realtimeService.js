import { Client } from "@stomp/stompjs";
import { apiClient } from "./apiClient";

/**
 * Kết nối WebSocket/STOMP cho chat & thông báo tức thời.
 *
 * ── Backend ──
 *  • Endpoint: `ws(s)://<host>/ws`
 *  • Xác thực: header `Authorization: Bearer <token>` trong frame STOMP CONNECT.
 *  • Kênh nhận:
 *      `/user/queue/messages`     → tin nhắn chat mới
 *      `/user/queue/notifications` → thông báo mới
 *
 * ── Vì sao không dùng SSE cho chat? ──
 * SSE chỉ một chiều (server → client). Chat cần gửi tin nhắn lên server và nhận
 * phản hồi tức thì ⇒ WebSocket/STOMP.
 *
 * ── Vì sao dùng MỘT kết nối cho toàn app? ──
 * Mỗi màn chat, chuông thông báo... đều cần tin tức thời. Mở nhiều WebSocket
 * sẽ tốn băng thông và bị máy chủ giới hạn. ⇒ Dùng một client STOMP dùng chung,
 * các nơi khác chỉ đăng ký callback.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8088/api/v1";

/** Chuyển URL REST của API thành URL WebSocket (http → ws, https → wss). */
export function websocketUrl() {
  const base = API_URL.replace(/\/api\/v1\/?$/, "");
  return `${base.replace(/^http/, "ws")}/ws`;
}

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

// ── Client dùng chung ────────────────────────────────────────────────────────

let sharedClient = null;
let sharedHandlers = { onMessage: [], onNotification: [], onStateChange: [] };

/**
 * Header gửi kèm frame STOMP CONNECT.
 *
 * ⚠️ PHẢI trả về OBJECT (không phải hàm) — stompjs v7 copy bằng
 * `Object.assign({}, this.connectHeaders)`; truyền hàm sẽ bị mất toàn bộ header
 * ⇒ backend từ chối CONNECT ⇒ web không nhận được tin nhắn chat.
 */
function buildConnectHeaders() {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function dispatch(kind, payload) {
  (sharedHandlers[kind] || []).forEach((fn) => {
    try {
      fn(payload);
    } catch {
      /* handler lỗi không được làm hỏng các handler khác */
    }
  });
}

function ensureClient() {
  if (typeof window === "undefined") return null;
  // Đã có client nhưng đang bị deactivate (token hết hạn / đăng xuất) ⇒ kích hoạt lại.
  if (sharedClient) {
    if (!sharedClient.active) sharedClient.activate();
    return sharedClient;
  }

  const client = new Client({
    brokerURL: websocketUrl(),
    // ⚠️ `connectHeaders` PHẢI là object, không phải hàm.
    // stompjs v7 làm `Object.assign({}, this.connectHeaders)` khi mở socket ⇒ nếu truyền
    // hàm thì header bị mất sạch ⇒ backend từ chối CONNECT ("Access token không hợp lệ")
    // ⇒ web KHÔNG nhận được tin nhắn chat (chỉ nhận được thông báo qua SSE).
    // Token được đọc lại ở mỗi lần kết nối (kể cả reconnect) nên vẫn luôn mới nhất.
    connectHeaders: buildConnectHeaders(),
    // Tự kết nối lại sau khi rớt mạng, giới hạn độ trễ tăng dần.
    reconnectDelay: 2000,
    maxReconnectDelay: 30000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    // Mỗi lần (re)connect ⇒ gắn lại header token mới nhất.
    beforeConnect: () => {
      client.connectHeaders = buildConnectHeaders();
    },

    onConnect: () => {
      dispatch("onStateChange", "CONNECTED");
      client.subscribe("/user/queue/messages", (frame) => {
        const payload = safeParse(frame.body);
        if (payload) dispatch("onMessage", payload);
      });
      client.subscribe("/user/queue/notifications", (frame) => {
        const payload = safeParse(frame.body);
        if (payload) dispatch("onNotification", payload);
      });
    },

    onWebSocketClose: () => dispatch("onStateChange", "DISCONNECTED"),
    onStompError: (frame) => {
      // Token sai/hết hạn ⇒ làm mới token rồi kết nối lại (nếu làm mới được).
      // Nếu không làm mới được ⇒ ngừng thử để tránh spam.
      const message = frame?.headers?.message || "";
      if (message.includes("Access token")) {
        dispatch("onStateChange", "DISCONNECTED");
        apiClient
          .refreshToken()
          .then((token) => {
            if (!token) {
              client.deactivate();
              return;
            }
            client.connectHeaders = buildConnectHeaders();
            client.activate();
          })
          .catch(() => client.deactivate());
      }
    },
  });

  client.activate();
  sharedClient = client;
  return client;
}

/**
 * Đăng ký lắng nghe sự kiện tức thời. Trả về hàm để hủy đăng ký.
 *
 * @param {object}   handlers
 * @param {Function} [handlers.onMessage]        nhận payload tin nhắn chat
 * @param {Function} [handlers.onNotification]   nhận payload thông báo
 * @param {Function} [handlers.onStateChange]    nhận 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'
 */
export function subscribeRealtime({ onMessage, onNotification, onStateChange }) {
  if (onMessage) sharedHandlers.onMessage.push(onMessage);
  if (onNotification) sharedHandlers.onNotification.push(onNotification);
  if (onStateChange) sharedHandlers.onStateChange.push(onStateChange);

  ensureClient();

  return () => {
    if (onMessage) sharedHandlers.onMessage = sharedHandlers.onMessage.filter((fn) => fn !== onMessage);
    if (onNotification) {
      sharedHandlers.onNotification = sharedHandlers.onNotification.filter((fn) => fn !== onNotification);
    }
    if (onStateChange) {
      sharedHandlers.onStateChange = sharedHandlers.onStateChange.filter((fn) => fn !== onStateChange);
    }
    // Không đóng client khi còn người dùng ⇒ giữ kết nối dùng chung.
  };
}

/** Ngắt kết nối dùng chung (khi đăng xuất). */
export function disconnectRealtime() {
  try {
    sharedClient?.deactivate();
  } catch {
    /* đã đóng */
  }
  sharedClient = null;
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
