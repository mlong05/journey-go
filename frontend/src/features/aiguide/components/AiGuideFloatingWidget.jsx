"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X, Plus, Maximize2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/i18n";
import { useTouristSession } from "@/features/tourist/hooks/useTouristSession";
import { aiGuideService } from "../services/aiGuideService";
import AiChatThread from "./AiChatThread";

const HINT_SEEN_KEY = "jg.aiGuideHintSeen";

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
  const [showHint, setShowHint] = useState(false);

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

  // Bong bóng gợi ý lần đầu: hiện sau 1,5s nếu du khách chưa từng thấy / chưa mở chat.
  useEffect(() => {
    if (!isTourist) return undefined;
    try {
      if (localStorage.getItem(HINT_SEEN_KEY)) return undefined;
    } catch {
      return undefined;
    }
    const timer = setTimeout(() => setShowHint(true), 1500);
    return () => clearTimeout(timer);
  }, [isTourist]);

  const dismissHint = () => {
    setShowHint(false);
    try {
      localStorage.setItem(HINT_SEEN_KEY, "1");
    } catch {
      // Trình duyệt chặn localStorage: chỉ ẩn trong phiên hiện tại
    }
  };

  if (!isTourist || pathname.startsWith(ROUTES.ACCOUNT_AI_GUIDE)) {
    return null;
  }

  const handleToggleOpen = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (showHint) dismissHint();
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

      {/* Bong bóng gợi ý — chỉ hiện lần đầu, tắt hẳn sau khi bấm mở hoặc đóng */}
      {showHint && !open && (
        <div
          role="status"
          className="jg-hint-pop fixed bottom-[5.5rem] right-5 z-40 w-60 rounded-2xl rounded-br-md border border-teal-100 bg-white p-3 pr-8 shadow-xl shadow-teal-900/10"
        >
          <button
            type="button"
            onClick={dismissHint}
            aria-label={t("aiguide.widget.hintDismiss")}
            className="absolute right-1.5 top-1.5 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X size={14} />
          </button>
          <button type="button" onClick={handleToggleOpen} className="text-left cursor-pointer">
            <p className="text-sm font-bold text-slate-800">{t("aiguide.widget.hintTitle")}</p>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">{t("aiguide.widget.hintBody")}</p>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleToggleOpen}
        aria-expanded={open}
        aria-label={t("aiguide.widget.openAria")}
        title={t("aiguide.widget.buttonTitle")}
        className="group fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-lg shadow-teal-900/25 transition hover:scale-110 active:scale-95 cursor-pointer"
      >
        {showHint && !open && (
          <span aria-hidden className="absolute inset-0 rounded-full bg-teal-400/60 animate-ping" />
        )}
        {open ? (
          <X size={22} className="relative" />
        ) : (
          <span className={`relative ${showHint ? "" : "jg-bob"}`}>
            <GuideMascot />
          </span>
        )}
      </button>
    </>
  );
}

/** Linh vật robot nhỏ: mặt tròn, mắt chớp, má hồng, ăng-ten đèn cam. */
function GuideMascot() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" aria-hidden>
      {/* ăng-ten */}
      <line x1="18" y1="4.5" x2="18" y2="9" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="18" cy="4" r="2.4" fill="#fb923c" className="jg-antenna" />
      {/* tai */}
      <rect x="3" y="16" width="3.5" height="8" rx="1.75" fill="#ccfbf1" />
      <rect x="29.5" y="16" width="3.5" height="8" rx="1.75" fill="#ccfbf1" />
      {/* đầu */}
      <rect x="6" y="9" width="24" height="21" rx="9" fill="#fff" />
      {/* mắt */}
      <g className="jg-blink" style={{ transformOrigin: "18px 18.5px" }}>
        <ellipse cx="13.5" cy="18.5" rx="2" ry="2.6" fill="#134e4a" />
        <ellipse cx="22.5" cy="18.5" rx="2" ry="2.6" fill="#134e4a" />
        <circle cx="14.2" cy="17.6" r="0.7" fill="#fff" />
        <circle cx="23.2" cy="17.6" r="0.7" fill="#fff" />
      </g>
      {/* má hồng */}
      <ellipse cx="10.5" cy="23" rx="2" ry="1.2" fill="#fda4af" opacity="0.85" />
      <ellipse cx="25.5" cy="23" rx="2" ry="1.2" fill="#fda4af" opacity="0.85" />
      {/* miệng cười */}
      <path d="M15.5 23.5 Q18 26 20.5 23.5" fill="none" stroke="#134e4a" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
