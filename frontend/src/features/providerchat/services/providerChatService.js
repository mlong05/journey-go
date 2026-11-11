/**
 * Service cho API chat với nhà tour (module `provider-chat` ở backend).
 *
 * ── Contract ──
 *  • GET  /provider-chat/provider/conversations        → ProviderConversation[]
 *      (CONTENT_PROVIDER / ADMIN) — danh sách hội thoại khách gửi tới tôi.
 *  • GET  /provider-chat/conversations/{id}/messages   → ProviderMessage[]
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

  /** Gửi tin nhắn tới khách (đối tác trả lời). */
  async sendMessage(conversationId, body) {
    const res = await apiClient.post(`${ROOT}/conversations/${conversationId}/messages`, { body });
    return data(res);
  },
};

export default providerChatService;
