"use client";

import { useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  BookOpen,
  Compass,
  MapPin,
  Loader2,
  AlertCircle,
} from "lucide-react";

const STARTER_PROMPTS = [
  "Lịch sử điểm đến nổi bật tại Việt Nam",
  "Lưu ý trang phục & ứng xử khi tham quan di tích",
  "Gợi ý điểm đến văn hóa giàu bản sắc",
];

/**
 * Định dạng thời gian ngắn HH:mm theo locale tiếng Việt.
 */
function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Luồng hội thoại dùng chung cho cả Widget nổi và trang toàn màn hình AI Virtual Guide.
 */
export default function AiChatThread({
  messages = [],
  loadingMessages = false,
  sending = false,
  error = "",
  question = "",
  onQuestionChange,
  onSend,
  destinations = [],
  destinationId = "",
  onDestinationChange,
  maxLength = 1000,
  compact = false,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending && question.trim()) {
        onSend(question);
      }
    }
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-slate-50/60">
      {/* Thanh chọn ngữ cảnh điểm đến */}
      <div
        className={`flex items-center gap-2 border-b border-slate-200 bg-white ${
          compact ? "px-3 py-2" : "px-4 py-2.5"
        }`}
      >
        <MapPin size={15} className="shrink-0 text-teal-700" />
        <label htmlFor={compact ? "ai-widget-dest" : "ai-page-dest"} className="sr-only">
          Chọn điểm đến ngữ cảnh
        </label>
        <select
          id={compact ? "ai-widget-dest" : "ai-page-dest"}
          value={destinationId}
          onChange={(e) => onDestinationChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-teal-600 focus:bg-white"
        >
          <option value="">Hỏi đáp chung (toàn bộ điểm đến)</option>
          {destinations.map((d) => (
            <option key={d.id} value={String(d.id)}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Khu vực tin nhắn */}
      <div
        className={`flex-1 overflow-y-auto space-y-3 [scrollbar-width:thin] ${
          compact ? "p-3" : "p-4 sm:p-5"
        }`}
      >
        {loadingMessages ? (
          <div className="flex h-full min-h-[160px] items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 size={16} className="animate-spin text-teal-700" />
            <span>Đang tải lịch sử hội thoại...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-200/70">
              <Sparkles size={20} />
            </div>
            <p className="text-sm font-bold text-slate-800">
              Xin chào! Tôi là Hướng dẫn viên ảo JourneyGo
            </p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
              Hãy hỏi tôi về lịch sử, kiến trúc, văn hóa hoặc chọn một điểm đến phía trên để được giải đáp sát ngữ cảnh thực tế.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSend(prompt)}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-2xs transition hover:border-teal-400 hover:bg-teal-50 disabled:opacity-50 cursor-pointer"
                >
                  <Compass size={12} className="shrink-0 text-teal-600" />
                  <span className="text-left">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = String(msg.role || "").toUpperCase() === "USER";
            return (
              <div
                key={msg.id || `${idx}-${msg.role}`}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-2xs ${
                    isUser
                      ? "rounded-br-md bg-teal-700 text-white"
                      : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  {!isUser && msg.mode && (
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          msg.mode === "TASK_HINT"
                            ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                            : "bg-teal-50 text-teal-800 ring-1 ring-teal-200"
                        }`}
                      >
                        <Sparkles size={10} />
                        {msg.mode === "TASK_HINT" ? "Gợi ý nhiệm vụ" : "Thuyết minh"}
                      </span>
                    </div>
                  )}

                  <p className="whitespace-pre-wrap break-words text-[13.5px]">
                    {msg.content}
                  </p>

                  {!isUser && Array.isArray(msg.citations) && msg.citations.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2">
                      <BookOpen size={11} className="shrink-0 text-slate-400" />
                      <span className="text-[10.5px] font-semibold text-slate-400">
                        Nguồn:
                      </span>
                      {msg.citations.map((cite) => (
                        <span
                          key={cite}
                          className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-600"
                        >
                          {cite}
                        </span>
                      ))}
                    </div>
                  )}

                  {msg.createdAt && (
                    <p
                      className={`mt-1 text-right text-[10px] ${
                        isUser ? "text-teal-100" : "text-slate-400"
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 shadow-2xs">
              <Loader2 size={14} className="animate-spin text-teal-700" />
              <span>AI đang tra cứu tri thức di sản...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Thông báo lỗi */}
      {error && (
        <div className="mx-3 mb-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Khung nhập câu hỏi */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!sending && question.trim()) {
            onSend(question);
          }
        }}
        className={`border-t border-slate-200 bg-white ${
          compact ? "p-2.5" : "p-3 sm:p-4"
        }`}
      >
        <div className="flex items-end gap-2">
          <textarea
            rows={compact ? 1 : 2}
            maxLength={maxLength}
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi về địa điểm, lịch sử, văn hóa..."
            className="max-h-28 min-h-[38px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-teal-600 focus:bg-white"
          />
          <button
            type="submit"
            disabled={sending || !question.trim()}
            aria-label="Gửi câu hỏi"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-700 text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 cursor-pointer"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        {question.length >= maxLength - 150 && (
          <p className="mt-1 text-right text-[10.5px] font-semibold text-slate-400">
            {question.length}/{maxLength} ký tự
          </p>
        )}
      </form>
    </div>
  );
}
