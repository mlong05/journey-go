"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X, Plus, Maximize2, MessageSquareText } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/i18n";
import { useTouristSession } from "@/features/tourist/hooks/useTouristSession";
import { aiGuideService } from "../services/aiGuideService";
import AiChatThread from "./AiChatThread";

/**
 * Nút & khung chat nổi Hướng dẫn viên AI ở góc phải màn hình dành cho Du khách đã đăng nhập.
 * Tự ẩn trên trang toàn màn hình /account/ai-guide.
 */
export default function AiGuideFloatingWidget() {
  const t = useT();
  const pathname = usePathname() || "";
  const { isTourist } = useTouristSession();

  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [error, setError] = useState("");

  const handoffStatus = sessionInfo?.handoffStatus || "AI_ACTIVE";

  const refreshActiveSession = useCallback(async (sid) => {
    if (!sid) return;
    try {
      const [sessionRes, msgRes] = await Promise.all([
        aiGuideService.getSession(sid),
        aiGuideService.getSessionMessages(sid),
      ]);
      if (sessionRes) setSessionInfo(sessionRes);
      if (Array.isArray(msgRes)) setMessages(msgRes);
    } catch {
      // Giữ trạng thái hiện tại nếu lỗi mạng tạm thời
    }
  }, []);

  useEffect(() => {
    if (
      !open ||
      !isTourist ||
      !sessionId ||
      (handoffStatus !== "WAITING_HUMAN" && handoffStatus !== "HUMAN_ACTIVE")
    ) {
      return undefined;
    }

    const timer = setInterval(() => {
      refreshActiveSession(sessionId);
    }, 3500);

    return () => clearInterval(timer);
  }, [open, isTourist, sessionId, handoffStatus, refreshActiveSession]);

  if (!isTourist || pathname.startsWith(ROUTES.ACCOUNT_AI_GUIDE)) {
    return null;
  }

  const handleToggleOpen = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen) return;

    if (sessionId) {
      await refreshActiveSession(sessionId);
      return;
    }

    setLoadingMessages(true);
    setError("");
    try {
      const session = await aiGuideService.createSession(null, false);
      if (session?.id) {
        setSessionId(session.id);
        setSessionInfo(session);
        const list = await aiGuideService.getSessionMessages(session.id);
        setMessages(list);
      }
    } catch (err) {
      setError(err?.message || t("aiguide.error.initSession"));
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleNewSession = async () => {
    setError("");
    setLoadingMessages(true);
    try {
      const created = await aiGuideService.createSession(null, true);
      setSessionId(created?.id || null);
      setSessionInfo(created || null);
      setMessages([]);
    } catch (err) {
      setError(err?.message || t("aiguide.error.newSession"));
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleRequestHumanSupport = async (reason = "") => {
    if (handoffLoading) return;
    setError("");
    setHandoffLoading(true);
    try {
      let targetSessionId = sessionId;
      if (!targetSessionId) {
        const created = await aiGuideService.createSession(null, false);
        targetSessionId = created?.id || null;
        if (targetSessionId) {
          setSessionId(targetSessionId);
          setSessionInfo(created);
        }
      }
      if (!targetSessionId) return;

      const updated = await aiGuideService.requestHumanSupport(targetSessionId, reason);
      setSessionInfo(updated);
      const list = await aiGuideService.getSessionMessages(targetSessionId);
      setMessages(list);
    } catch (err) {
      setError(err?.message || t("aiguide.error.requestHuman"));
    } finally {
      setHandoffLoading(false);
    }
  };

  const handleReturnToAi = async () => {
    if (!sessionId || handoffLoading) return;
    setError("");
    setHandoffLoading(true);
    try {
      const updated = await aiGuideService.returnToAi(sessionId);
      setSessionInfo(updated);
      const list = await aiGuideService.getSessionMessages(sessionId);
      setMessages(list);
    } catch (err) {
      setError(err?.message || t("aiguide.error.returnToAi"));
    } finally {
      setHandoffLoading(false);
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
        question: text,
      });

      const resolvedSid = reply?.sessionId || sessionId;
      if (reply?.sessionId) {
        setSessionId(reply.sessionId);
      }

      if (reply?.handoffStatus) {
        setSessionInfo((prev) =>
          prev
            ? { ...prev, handoffStatus: reply.handoffStatus }
            : { id: resolvedSid, handoffStatus: reply.handoffStatus },
        );
      }

      if (reply?.answer) {
        setMessages((prev) => [
          ...prev,
          {
            id: reply?.messageId || `ai-${Date.now()}`,
            role: "ASSISTANT",
            senderName: t("aiguide.role.aiGuide"),
            senderRole: "AI",
            content: reply.answer,
            mode: reply?.mode,
            citations: reply?.citations || [],
            createdAt: reply?.createdAt || new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      setError(err?.message || t("aiguide.error.sendMessage"));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <section
          aria-label={t("aiguide.widget.panelAria")}
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
                  {t("aiguide.title")}
                </p>
                <p className="truncate text-[11px] text-teal-100">
                  {t("aiguide.widget.subtitle")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={handleNewSession}
                title={t("aiguide.widget.newSession")}
                aria-label={t("aiguide.widget.newSession")}
                className="rounded-lg p-1.5 text-teal-50 transition hover:bg-white/15 cursor-pointer"
              >
                <Plus size={16} />
              </button>
              <Link
                href={ROUTES.ACCOUNT_AI_GUIDE}
                onClick={() => setOpen(false)}
                title={t("aiguide.widget.fullscreen")}
                aria-label={t("aiguide.widget.fullscreenAria")}
                className="rounded-lg p-1.5 text-teal-50 transition hover:bg-white/15"
              >
                <Maximize2 size={15} />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title={t("aiguide.widget.collapse")}
                aria-label={t("aiguide.widget.closeAria")}
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
            handoffStatus={sessionInfo?.handoffStatus || "AI_ACTIVE"}
            assignedStaffName={sessionInfo?.assignedStaffName || ""}
            assignedStaffRole={sessionInfo?.assignedStaffRole || ""}
            handoffLoading={handoffLoading}
            onRequestHumanSupport={handleRequestHumanSupport}
            onReturnToAi={handleReturnToAi}
            onTourLinkClick={() => setOpen(false)}
            compact
          />
        </section>
      )}

      <button
        type="button"
        onClick={handleToggleOpen}
        aria-expanded={open}
        aria-label={t("aiguide.widget.openAria")}
        title={t("aiguide.widget.buttonTitle")}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-teal-900/20 transition hover:scale-[1.03] hover:bg-teal-800 active:scale-[0.98] cursor-pointer"
      >
        {open ? <X size={18} /> : <MessageSquareText size={18} />}
        <span className="hidden sm:inline">{t("aiguide.widget.fabLabel")}</span>
      </button>
    </>
  );
}
