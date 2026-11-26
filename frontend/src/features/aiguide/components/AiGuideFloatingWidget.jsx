"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChevronRight,
  Compass,
  Maximize2,
  MessageSquare,
  Plus,
  X,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/i18n";
import { useTouristSession } from "@/features/tourist/hooks/useTouristSession";
import { aiGuideService } from "../services/aiGuideService";
import AiChatThread from "./AiChatThread";

const HINT_SEEN_KEY = "jg.aiGuideHintSeen";

/**
 * Nút & khung chat nổi Hướng dẫn viên AI ở góc phải màn hình dành cho Du khách đã đăng nhập.
 * Sử dụng linh vật Robot toàn thân chuyển động (vẫy tay, nhìn quanh, chớp mắt) + thẻ chào cá nhân hóa.
 * Tự ẩn trên trang toàn màn hình /account/ai-guide.
 */
export default function AiGuideFloatingWidget() {
  const t = useT();
  const pathname = usePathname() || "";
  const { isTourist, user } = useTouristSession();

  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [error, setError] = useState("");

  const handoffStatus = sessionInfo?.handoffStatus || "AI_ACTIVE";
  const userName = (user?.fullName || user?.name || "").trim() || t("aiguide.guestFallback");

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

  // Thẻ chào lần đầu: hiện sau 1,2s nếu du khách chưa từng thấy / chưa mở chat.
  useEffect(() => {
    if (!isTourist) return undefined;
    try {
      if (localStorage.getItem(HINT_SEEN_KEY)) return undefined;
    } catch {
      return undefined;
    }
    const timer = setTimeout(() => setMenuOpen(true), 1200);
    return () => clearTimeout(timer);
  }, [isTourist]);

  const markHintSeen = () => {
    try {
      localStorage.setItem(HINT_SEEN_KEY, "1");
    } catch {
      // Trình duyệt chặn localStorage: chỉ ẩn trong phiên hiện tại
    }
  };

  const dismissMenu = () => {
    setMenuOpen(false);
    markHintSeen();
  };

  if (!isTourist || pathname.startsWith(ROUTES.ACCOUNT_AI_GUIDE)) {
    return null;
  }

  const ensureSessionAndOpenChat = async () => {
    setMenuOpen(false);
    markHintSeen();
    setOpen(true);

    if (sessionId) {
      await refreshActiveSession(sessionId);
      return sessionId;
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
        return session.id;
      }
    } catch (err) {
      setError(err?.message || t("aiguide.error.initSession"));
    } finally {
      setLoadingMessages(false);
    }
    return null;
  };

  const handleRobotClick = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    // Bấm lần đầu khi chưa hiện thẻ -> mở thẻ chào & 3 nút chọn nhanh; bấm tiếp khi thẻ đang mở -> vào thẳng khung chat
    if (!menuOpen) {
      setMenuOpen(true);
      return;
    }
    await ensureSessionAndOpenChat();
  };

  const handleQuickPrompt = async (promptText) => {
    const sid = await ensureSessionAndOpenChat();
    if (promptText) {
      await handleSend(promptText, sid);
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

  const handleSend = async (rawText, overrideSessionId = null) => {
    const text = String(rawText || "").trim();
    if (!text || sending) return;

    const targetSid = overrideSessionId ?? sessionId;
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
        sessionId: targetSid,
        question: text,
      });

      const resolvedSid = reply?.sessionId || targetSid;
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
          className="fixed bottom-24 right-4 z-50 flex h-[540px] max-h-[78vh] w-[385px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 bg-teal-700 px-3.5 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15">
                <Bot size={17} />
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
                className="cursor-pointer rounded-lg p-1.5 text-teal-50 transition hover:bg-white/15"
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
                className="cursor-pointer rounded-lg p-1.5 text-teal-50 transition hover:bg-white/15"
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
            userName={userName}
            compact
          />
        </section>
      )}

      {/* Khu vực Robot góc phải dưới + Thẻ chào cá nhân hóa */}
      <div
        className="fixed bottom-4 right-4 z-40 flex flex-col items-end"
        onMouseEnter={() => {
          if (!open) setMenuOpen(true);
        }}
        onMouseLeave={() => {
          if (!open) setMenuOpen(false);
        }}
      >
        {/* Thẻ chào & 3 nút thao tác nhanh */}
        {menuOpen && !open && (
          <div
            role="dialog"
            aria-label={t("aiguide.widget.panelAria")}
            className="jg-hint-pop mb-2 w-[332px] max-w-[calc(100vw-2rem)] rounded-2xl rounded-br-md border border-teal-100 bg-white p-3.5 shadow-2xl shadow-teal-900/10"
          >
            <div className="flex items-start justify-between gap-2 pr-1">
              <div>
                <p className="text-[13.5px] font-bold leading-snug text-slate-900">
                  {t("aiguide.widget.hintTitle", { name: userName })}
                </p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">
                  {t("aiguide.widget.hintSubtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={dismissMenu}
                aria-label={t("aiguide.widget.hintDismiss")}
                className="shrink-0 cursor-pointer rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-2.5 space-y-1">
              <button
                type="button"
                onClick={ensureSessionAndOpenChat}
                className="group flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-teal-50/80"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-200/70">
                  <MessageSquare size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-snug text-slate-800 group-hover:text-teal-800">
                    {t("aiguide.widget.quickChatTitle")}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                    {t("aiguide.widget.quickChatDesc")}
                  </p>
                </div>
                <ChevronRight size={14} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-700" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickPrompt(t("aiguide.starter.tours"))}
                className="group flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-teal-50/80"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-200/70">
                  <Compass size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-snug text-slate-800 group-hover:text-teal-800">
                    {t("aiguide.widget.quickToursTitle")}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                    {t("aiguide.widget.quickToursDesc")}
                  </p>
                </div>
                <ChevronRight size={14} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-700" />
              </button>

              <Link
                href={ROUTES.ACCOUNT_AI_GUIDE}
                onClick={dismissMenu}
                className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-teal-50/80"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                  <Maximize2 size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-snug text-slate-800 group-hover:text-teal-800">
                    {t("aiguide.widget.quickFullTitle")}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                    {t("aiguide.widget.quickFullDesc")}
                  </p>
                </div>
                <ChevronRight size={14} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-700" />
              </Link>
            </div>
          </div>
        )}

        {/* Linh vật Robot toàn thân (không nền tròn bao quanh) hoặc nút đóng gọn khi chat đang mở */}
        {open ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-expanded={open}
            aria-label={t("aiguide.widget.closeAria")}
            title={t("aiguide.widget.collapse")}
            className="inline-flex h-12 items-center gap-2 rounded-full border border-teal-800/20 bg-teal-700 px-4 text-xs font-bold text-white shadow-lg shadow-teal-900/25 transition hover:bg-teal-800 active:scale-95 cursor-pointer"
          >
            <X size={16} />
            <span>{t("aiguide.widget.collapse")}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRobotClick}
            aria-expanded={menuOpen}
            aria-label={t("aiguide.widget.openAria")}
            title={t("aiguide.widget.buttonTitle")}
            className="group relative flex cursor-pointer flex-col items-center focus:outline-none"
          >
            <AnimatedGuideRobot />
          </button>
        )}
      </div>
    </>
  );
}

/**
 * Linh vật Robot Hướng dẫn viên JourneyGo toàn thân có chuyển động:
 * - Nhún nhẹ (jg-robot-float) + bóng đổ co giãn (jg-robot-shadow)
 * - Nghiêng đầu nhìn quanh (jg-robot-head)
 * - Vẫy tay phải chào thân thiện (jg-robot-wave)
 * - Chớp mắt tự nhiên (jg-blink) + đèn ăng-ten nhịp nhẹ (jg-antenna)
 */
export function AnimatedGuideRobot({ size = 90 }) {
  const height = Math.round((size * 116) / 96);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 -6 96 116"
      aria-hidden="true"
      className="drop-shadow-[0_8px_14px_rgba(15,23,42,0.16)] transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
    >
      <defs>
        <linearGradient id="jgBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
        <linearGradient id="jgTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="jgFaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
        <linearGradient id="jgNonLaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="55%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
      </defs>

      {/* Bóng đổ dưới chân */}
      <ellipse cx="48" cy="102" rx="22" ry="5" fill="#0f172a" className="jg-robot-shadow" />

      {/* Thân robot chuyển động nhún nhẹ */}
      <g className="jg-robot-float">
        {/* Chân tròn dễ thương */}
        <rect x="34" y="83" width="10" height="12" rx="5" fill="url(#jgTealGrad)" />
        <rect x="52" y="83" width="10" height="12" rx="5" fill="url(#jgTealGrad)" />
        <ellipse cx="39" cy="95" rx="7" ry="3.6" fill="#0f766e" />
        <ellipse cx="57" cy="95" rx="7" ry="3.6" fill="#0f766e" />

        {/* Cánh tay trái */}
        <g>
          <rect x="19" y="59" width="9" height="20" rx="4.5" fill="url(#jgBodyGrad)" stroke="#cbd5e1" strokeWidth="1.3" />
          <circle cx="23.5" cy="79" r="4.8" fill="url(#jgTealGrad)" />
        </g>

        {/* Cánh tay phải vẫy chào */}
        <g className="jg-robot-wave" style={{ transformOrigin: "71px 61px" }}>
          <rect x="67" y="45" width="9" height="20" rx="4.5" transform="rotate(24 71.5 55)" fill="url(#jgBodyGrad)" stroke="#cbd5e1" strokeWidth="1.3" />
          <circle cx="76" cy="46" r="5" fill="url(#jgTealGrad)" />
        </g>

        {/* Thân áo trắng - xanh ngọc bo tròn chibi */}
        <rect x="28" y="55" width="40" height="31" rx="14" fill="url(#jgBodyGrad)" stroke="#cbd5e1" strokeWidth="1.5" />
        <path d="M30 69 H66 V74 C66 80 61 85 54 85 H42 C35 85 30 80 30 74 Z" fill="url(#jgTealGrad)" />
        {/* Khăn cổ nhỏ màu cam ấm */}
        <path d="M37 56 Q48 61 59 56" fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="48" cy="61" r="2.6" fill="#fbbf24" />

        {/* Đầu robot + Nón lá nghiêng nhẹ nhìn quanh */}
        <g className="jg-robot-head" style={{ transformOrigin: "48px 38px" }}>
          {/* Tai nghe tròn 2 bên */}
          <rect x="16.5" y="30" width="6.5" height="14" rx="3.2" fill="url(#jgTealGrad)" />
          <rect x="73" y="30" width="6.5" height="14" rx="3.2" fill="url(#jgTealGrad)" />

          {/* Đầu tròn trắng sáng, thân thiện */}
          <rect x="21" y="18" width="54" height="39" rx="19" fill="url(#jgBodyGrad)" stroke="#cbd5e1" strokeWidth="1.6" />

          {/* Khuôn mặt sáng dịu với viền xanh ngọc nhạt */}
          <rect x="26" y="23.5" width="44" height="28" rx="14" fill="url(#jgFaceGrad)" stroke="#ccfbf1" strokeWidth="1.5" />

          {/* Đôi mắt to tròn lấp lánh (không còn mắt xanh trên nền đen) */}
          <g className="jg-blink" style={{ transformOrigin: "48px 35px" }}>
            <ellipse cx="39" cy="35" rx="4.2" ry="4.9" fill="#0f172a" />
            <ellipse cx="57" cy="35" rx="4.2" ry="4.9" fill="#0f172a" />
            {/* Điểm sáng lấp lánh trong mắt */}
            <circle cx="37.6" cy="33.3" r="1.7" fill="#ffffff" />
            <circle cx="55.6" cy="33.3" r="1.7" fill="#ffffff" />
            <circle cx="40.5" cy="36.8" r="0.85" fill="#ffffff" opacity="0.85" />
            <circle cx="58.5" cy="36.8" r="0.85" fill="#ffffff" opacity="0.85" />
          </g>

          {/* Má hồng bầu bĩnh */}
          <ellipse cx="31.5" cy="41.5" rx="3.4" ry="2" fill="#fda4af" opacity="0.85" />
          <ellipse cx="64.5" cy="41.5" rx="3.4" ry="2" fill="#fda4af" opacity="0.85" />

          {/* Miệng cười tươi */}
          <path d="M43.5 41 Q48 45.5 52.5 41" fill="none" stroke="#0f766e" strokeWidth="2.1" strokeLinecap="round" />

          {/* Nón lá Việt Nam đội trên đầu robot */}
          <g>
            <ellipse cx="48" cy="21" rx="35" ry="5.5" fill="#a16207" opacity="0.28" />
            <path
              d="M13 20 Q48 24.5 83 20 L49.6 0.6 Q48 -0.5 46.4 0.6 Z"
              fill="url(#jgNonLaGrad)"
              stroke="#b45309"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <line x1="48" y1="1.2" x2="29" y2="21.2" stroke="#b45309" strokeWidth="0.9" opacity="0.4" />
            <line x1="48" y1="1.2" x2="48" y2="22" stroke="#b45309" strokeWidth="0.9" opacity="0.4" />
            <line x1="48" y1="1.2" x2="67" y2="21.2" stroke="#b45309" strokeWidth="0.9" opacity="0.4" />
            <path d="M26 14 Q48 17 70 14" fill="none" stroke="#b45309" strokeWidth="0.9" opacity="0.35" />
            <path d="M35 8.5 Q48 10.5 61 8.5" fill="none" stroke="#b45309" strokeWidth="0.9" opacity="0.35" />
            <path d="M21.5 18.6 Q48 22.6 74.5 18.6" fill="none" stroke="#0f766e" strokeWidth="2.2" strokeLinecap="round" opacity="0.88" />
            {/* Nút đèn nhỏ trên chóp nón */}
            <circle cx="48" cy="0.5" r="2.6" fill="#f59e0b" className="jg-antenna" />
          </g>
        </g>
      </g>
    </svg>
  );
}
