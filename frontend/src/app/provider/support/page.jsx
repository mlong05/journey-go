"use client";

/**
 * ProviderSupportPage — tab "Hỗ trợ khách hàng" của Đối tác (CONTENT_PROVIDER).
 *
 * Du khách có thể nhắn cho nhà tour NGAY TỪ TRANG CHI TIẾT TOUR (nút
 * "Chat với bên <Tên đối tác>") mà chưa cần đặt vé. Đối tác xem & phản hồi
 * các tin nhắn đó tại đây.
 *
 * Backend (/api/v1/provider-chat):
 *  - GET  /provider-chat/provider/conversations     : danh sách hội thoại gửi tới tôi
 *  - GET  /provider-chat/conversations/{id}/messages : nội dung hội thoại
 *  - POST /provider-chat/conversations/{id}/messages : gửi tin nhắn trả lời
 */
import { ProviderSupportChat } from "@/features/providerchat";
import { useAuthSession } from "@/hooks";

export default function ProviderSupportPage() {
  const auth = useAuthSession();
  const currentUserId = auth?.user?.id ?? null;

  return <ProviderSupportChat currentUserId={currentUserId} />;
}
