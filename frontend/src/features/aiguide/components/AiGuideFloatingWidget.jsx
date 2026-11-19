"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X, Plus, Maximize2, MessageSquareText } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useTouristSession } from "@/features/tourist/hooks/useTouristSession";
import { aiGuideService } from "../services/aiGuideService";
import AiChatThread from "./AiChatThread";

/**
 * Nút & khung chat nổi Hướng dẫn viên AI ở góc phải màn hình dành cho Du khách đã đăng nhập.
 * Tự ẩn trên trang toàn màn hình /account/ai-guide.
 */
export default function AiGuideFloatingWidget() {
  const pathname = usePathname() || "";
  const { isTourist } = useTouristSession();

  const [open, setOpen] = useState(false);
  const [destinations, setDestinations] = useState([]);
  const [destinationId, setDestinationId] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !isTourist) return undefined;
    let active = true;

    aiGuideService
      .getDestinations()
      .then((list) => {
        if (active) setDestinations(list);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [open, isTourist]);

  if (!isTourist || pathname.startsWith(ROUTES.ACCOUNT_AI_GUIDE)) {
    return null;
  }

  const handleToggleOpen = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || sessionId) return;

    setLoadingMessages(true);
    setError("");
    try {
      const session = await aiGuideService.createSession(
        destinationId ? Number(destinationId) : null,
        false,
      );
      if (session?.id) {
        setSessionId(session.id);
        const list = await aiGuideService.getSessionMessages(session.id);
        setMessages(list);
      }
    } catch (err) {
      setError(err?.message || "Không thể khởi tạo phiên trò chuyện AI.");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleNewSession = async (nextDestId = destinationId) => {
    setError("");
    setLoadingMessages(true);
    try {
      const created = await aiGuideService.createSession(
        nextDestId ? Number(nextDestId) : null,
        true,
      );
      setSessionId(created?.id || null);
      setMessages([]);
    } catch (err) {
      setError(err?.message || "Không thể tạo phiên mới.");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async (rawText) => {
    const text = String(rawText || "").trim();
    if (!text || sending) return;

    setError("");
    setQuestion("");
    setSending(true);

    const optimisticId = `tmp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        role: "USER",
        content: text,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const reply = await aiGuideService.chat({
        sessionId,
        destinationId: destinationId ? Number(destinationId) : null,
        question: text,
      });

      if (reply?.sessionId) {
        setSessionId(reply.sessionId);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: reply?.messageId || `ai-${Date.now()}`,
          role: "ASSISTANT",
          content: reply?.answer || "",
          mode: reply?.mode,
          citations: reply?.citations || [],
          createdAt: reply?.createdAt || new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError(err?.message || "Không thể nhận phản hồi từ AI.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <section
          aria-label="Khung chat Hướng dẫn viên ảo AI"
          className="fixed bottom-20 right-4 z-50 flex h-[540px] max-h-[78vh] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 bg-teal-700 px-3.5 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15">
                <Sparkles size={16} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-tight">
                  Hướng dẫn viên ảo AI
                </p>
                <p className="truncate text-[11px] text-teal-100">
                  Giải đáp văn hóa & di sản JourneyGo
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => handleNewSession(destinationId)}
                title="Phiên trò chuyện mới"
                aria-label="Phiên trò chuyện mới"
                className="rounded-lg p-1.5 text-teal-50 transition hover:bg-white/15 cursor-pointer"
              >
                <Plus size={16} />
              </button>
              <Link
                href={ROUTES.ACCOUNT_AI_GUIDE}
                onClick={() => setOpen(false)}
                title="Mở toàn màn hình"
                aria-label="Mở toàn màn hình Hướng dẫn viên AI"
                className="rounded-lg p-1.5 text-teal-50 transition hover:bg-white/15"
              >
                <Maximize2 size={15} />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Thu gọn"
                aria-label="Đóng khung chat AI"
                className="rounded-lg p-1.5 text-teal-50 transition hover:bg-white/15 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <AiChatThread
            messages={messages}
            loadingMessages={loadingMessages}
            sending={sending}
            error={error}
            question={question}
            onQuestionChange={setQuestion}
            onSend={handleSend}
            destinations={destinations}
            destinationId={destinationId}
            onDestinationChange={(val) => {
              setDestinationId(val);
              handleNewSession(val);
            }}
            compact
          />
        </section>
      )}

      <button
        type="button"
        onClick={handleToggleOpen}
        aria-expanded={open}
        aria-label="Mở Hướng dẫn viên AI"
        title="Hướng dẫn viên AI"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-teal-900/20 transition hover:scale-[1.03] hover:bg-teal-800 active:scale-[0.98] cursor-pointer"
      >
        {open ? <X size={18} /> : <MessageSquareText size={18} />}
        <span className="hidden sm:inline">Hỏi AI Guide</span>
      </button>
    </>
  );
}
