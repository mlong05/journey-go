/**
 * Service cho API chat với nhà tour (module `provider-chat` ở backend).
 *
 * ── Contract ──
 *  • GET  /provider-chat/provider/conversations        → ProviderConversation[]
 *      (CONTENT_PROVIDER / ADMIN) — danh sách hội thoại khách gửi tới tôi.
 *  • GET  /provider-chat/conversations/{id}/messages   → ProviderMessage[]
 *  • GET  /provider-chat/conversations/{id}/messages/page
 *      ?limit=10&before=<ISO> → { items, hasMore, nextCursor, totalCount }
 *  • POST /provider-chat/conversations/{id}/messages   body: { body } → ProviderMessage
 *
 * ── Vì sao tách khỏi chat trong booking? ──
 *  Chat gắn với Booking chỉ dùng được SAU khi khách đặt tour. Ở đây khách hỏi
 *  ngay khi đang xem chi tiết tour ⇒ hội thoại gom theo cặp (du khách, nhà tour)
 *  nên lịch sử không bị vỡ khi khách hỏi về nhiều tour của cùng một nhà tour.
 */
import { apiClient } from "@/services/apiClient";

const ROOT = "/provider-chat";

const data = (res) => (res && Object.prototype.hasOwnProperty.call(res, "data") ? res.data : res);

export const providerChatService = {
  /** Danh sách cuộc trò chuyện khách hàng gửi tới tôi (đối tác). */
  async listProviderConversations() {
    const res = await apiClient.get(`${ROOT}/provider/conversations`);
    const payload = data(res);
    return Array.isArray(payload) ? payload : (payload?.content ?? []);
  },

  /** Tin nhắn của một cuộc trò chuyện (cũ nhất trước). */
  async listMessages(conversationId) {
    const res = await apiClient.get(`${ROOT}/conversations/${conversationId}/messages`);
    const payload = data(res);
    return Array.isArray(payload) ? payload : (payload?.content ?? []);
  },

  /**
   * Trang tin nhắn MỚI NHẤT — dùng cho phân trang "cuộn lên để load thêm".
   *
   * @param {number} conversationId
   * @param {number} limit         số tin mỗi trang (mặc định 10)
   * @param {number|null} cursor   id tin cũ nhất đã tải — lấy tin có id nhỏ hơn
   *                              (null = lấy mới nhất)
   * @returns {Promise<{items: Array, hasMore: boolean, nextCursor: number|null, totalCount: number}>}
   */
  async listMessagesPage(conversationId, limit = 10, cursor = null) {
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor != null) query.set("beforeId", String(cursor));
    const res = await apiClient.get(
      `${ROOT}/conversations/${conversationId}/messages/page?${query.toString()}`,
    );
    const payload = data(res);
    return {
      items: Array.isArray(payload?.items) ? payload.items : (payload?.items?.content ?? []),
      hasMore: Boolean(payload?.hasMore),
      nextCursor: payload?.nextCursor ?? null,
      totalCount: Number(payload?.totalCount ?? 0),
    };
  },

  /** Gửi tin nhắn tới khách (đối tác trả lời). */
  async sendMessage(conversationId, body) {
    const res = await apiClient.post(`${ROOT}/conversations/${conversationId}/messages`, { body });
    return data(res);
  },
};

export default providerChatService;
