/**
 * ChatBubble — một tin nhắn trong khung chat.
 *
 * ⚠️ PHÂN BIỆT BÊN PHẢI / BÊN TRÁI:
 *  • Tin của MÌNH (người đang đăng nhập)  → bên PHẢI, nền xanh (emerald).
 *  • Tin của KHÁCH / đối tác              → bên TRÁI,  nền trắng có viền.
 *
 * Dùng chung cho cả 2 khung chat:
 *  • "Hỗ trợ khách hàng" (tab của đối tác) — `mine` = tin của đối tác.
 *  • "Hỗ trợ trong đơn này" (chi tiết booking).
 */
import { formatDateTimeVN } from "@/lib/money";

/**
 * @param {Object}  props
 * @param {boolean} props.mine      tin này do NGƯỜI ĐANG ĐĂNG NHẬP gửi hay không.
 * @param {string}  props.body      nội dung tin nhắn.
 * @param {string}  props.createdAt thời điểm gửi (ISO).
 * @param {string}  props.author    tên người gửi (hiện dưới tin của đối tác).
 */
export default function ChatBubble({ mine = false, body, createdAt, author }) {
  return (
    <li className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
          mine
            ? "rounded-br-sm bg-emerald-600 text-white"
            : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
        }`}
      >
        {body}
      </div>
      <p className="mt-0.5 px-1 text-[10px] text-slate-400">
        {mine ? "Bạn" : author || "Khách hàng"} · {formatDateTimeVN(createdAt)}
      </p>
    </li>
  );
}
