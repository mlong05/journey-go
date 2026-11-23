"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, MessageSquare, Sparkles, Headset, Clock, Bot } from "lucide-react";
import AccountLayout from "@/features/tourist/components/AccountLayout";
import { aiGuideService } from "../services/aiGuideService";
import AiChatThread from "./AiChatThread";

function formatShortDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function getSessionStatusBadge(handoffStatus) {
  const status = String(handoffStatus || "AI_ACTIVE").toUpperCase();
  if (status === "WAITING_HUMAN") {
    return {
      label: "Đang chờ hỗ trợ",
      icon: Clock,
      className: "bg-amber-100 text-amber-800",
    };
  }
  if (status === "HUMAN_ACTIVE") {
    return {
      label: "Chat trực tiếp",
      icon: Headset,
      className: "bg-indigo-100 text-indigo-800",
    };
  }
  return {
    label: "AI Hướng dẫn viên",
    icon: Bot,
    className: "bg-teal-100/80 text-teal-800",
  };
}

/**
 * Trang Hướng dẫn viên ảo AI toàn phần dành cho Du khách (/account/ai-guide).
 */
export default function AiGuidePage() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [error, setError] = useState("");

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const activeHandoffStatus = activeSession?.handoffStatus || "AI_ACTIVE";

  const loadSessionMessages = useCallback(async (sid) => {
    if (!sid) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    setError("");
    try {
      const list = await aiGuideService.getSessionMessages(sid);
      setMessages(list);
    } catch (err) {
      setError(err?.message || "Không tải được lịch sử tin nhắn.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const refreshSessions = useCallback(
    async (selectId = null, reloadMessages = false) => {
      try {
        const pageData = await aiGuideService.getSessions(0, 30);
        const list = Array.isArray(pageData?.content) ? pageData.content : [];
        setSessions(list);
        const targetId = selectId || (list[0]?.id ?? null);
        if (targetId && (targetId !== activeSessionId || reloadMessages)) {
          setActiveSessionId(targetId);
          await loadSessionMessages(targetId);
        }
      } catch {
        // Giữ danh sách hiện tại nếu lỗi tạm thời
      } finally {
        setLoadingSessions(false);
      }
    },
    [activeSessionId, loadSessionMessages],
  );

  useEffect(() => {
    let active = true;

    aiGuideService
      .getSessions(0, 30)
      .then((pageData) => {
        if (!active) return;
        const list = Array.isArray(pageData?.content) ? pageData.content : [];
        setSessions(list);
        if (list.length > 0) {
          const first = list[0];
          setActiveSessionId(first.id);
          loadSessionMessages(first.id);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingSessions(false);
      });

    return () => {
      active = false;
    };
  }, [loadSessionMessages]);

  useEffect(() => {
    if (
      !activeSessionId ||
      (activeHandoffStatus !== "WAITING_HUMAN" && activeHandoffStatus !== "HUMAN_ACTIVE")
    ) {
      return undefined;
    }

    const timer = setInterval(async () => {
      try {
        const [sessionRes, msgRes] = await Promise.all([
          aiGuideService.getSession(activeSessionId),
          aiGuideService.getSessionMessages(activeSessionId),
        ]);
        if (sessionRes) {
          setSessions((prev) =>
            prev.map((s) => (s.id === activeSessionId ? { ...s, ...sessionRes } : s)),
          );
        }
        if (Array.isArray(msgRes)) {
          setMessages(msgRes);
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời khi polling
      }
    }, 3500);

    return () => clearInterval(timer);
  }, [activeSessionId, activeHandoffStatus]);

  const handleSelectSession = async (session) => {
    setActiveSessionId(session.id);
    await loadSessionMessages(session.id);
  };

  const handleCreateSession = async () => {
    setError("");
    setLoadingMessages(true);
    try {
      const created = await aiGuideService.createSession(null, true);
      if (created?.id) {
        setActiveSessionId(created.id);
        setMessages([]);
        const pageData = await aiGuideService.getSessions(0, 30);
        setSessions(Array.isArray(pageData?.content) ? pageData.content : []);
      }
    } catch (err) {
      setError(err?.message || "Không thể tạo phiên trò chuyện mới.");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleDeleteSession = async (e, sid) => {
    e.stopPropagation();
    try {
      await aiGuideService.deleteSession(sid);
      const nextList = sessions.filter((s) => s.id !== sid);
      setSessions(nextList);
      if (activeSessionId === sid) {
        if (nextList.length > 0) {
          await handleSelectSession(nextList[0]);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      setError(err?.message || "Không thể xóa phiên trò chuyện.");
    }
  };

  const handleRequestHumanSupport = async (reason = "") => {
    if (handoffLoading) return;
    setError("");
    setHandoffLoading(true);
    try {
      let targetSessionId = activeSessionId;
      if (!targetSessionId) {
        const created = await aiGuideService.createSession(null, false);
        targetSessionId = created?.id || null;
        if (targetSessionId) {
          setActiveSessionId(targetSessionId);
        }
      }
      if (!targetSessionId) return;

      const updated = await aiGuideService.requestHumanSupport(targetSessionId, reason);
      setSessions((prev) => {
        const exists = prev.some((s) => s.id === targetSessionId);
        if (!exists && updated) return [updated, ...prev];
        return prev.map((s) => (s.id === targetSessionId ? { ...s, ...updated } : s));
      });
      const list = await aiGuideService.getSessionMessages(targetSessionId);
      setMessages(list);
    } catch (err) {
      setError(err?.message || "Không thể gửi yêu cầu gặp Admin / Moderator.");
    } finally {
      setHandoffLoading(false);
    }
  };

  const handleReturnToAi = async () => {
    if (!activeSessionId || handoffLoading) return;
    setError("");
    setHandoffLoading(true);
    try {
      const updated = await aiGuideService.returnToAi(activeSessionId);
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, ...updated } : s)),
      );
      const list = await aiGuideService.getSessionMessages(activeSessionId);
      setMessages(list);
    } catch (err) {
      setError(err?.message || "Không thể quay lại AI Hướng dẫn viên.");
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
        sessionId: activeSessionId,
        question: text,
      });

      const resolvedSessionId = reply?.sessionId || activeSessionId;
      if (reply?.sessionId) {
        setActiveSessionId(reply.sessionId);
      }

      if (reply?.answer) {
        setMessages((prev) => [
          ...prev,
          {
            id: reply?.messageId || `ai-${Date.now()}`,
            role: "ASSISTANT",
            senderName: "AI Hướng dẫn viên",
            senderRole: "AI",
            content: reply.answer,
            mode: reply?.mode,
            citations: reply?.citations || [],
            createdAt: reply?.createdAt || new Date().toISOString(),
          },
        ]);
      }

      await refreshSessions(resolvedSessionId);
    } catch (err) {
      setError(err?.message || "Không thể gửi tin nhắn.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AccountLayout
      wide
      title="Hướng dẫn viên ảo AI"
      actions={
        <button
          type="button"
          onClick={handleCreateSession}
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-teal-800 cursor-pointer"
        >
          <Plus size={15} />
          Cuộc trò chuyện mới
        </button>
      }
    >
      <div className="grid h-[640px] max-h-[calc(100vh-14rem)] min-h-[500px] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs md:grid-cols-[260px_minmax(0,1fr)]">
        {/* Danh sách phiên */}
        <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50/70 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b border-slate-200 px-3.5 py-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              <Sparkles size={13} className="text-teal-700" />
              Lịch sử hội thoại
            </span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10.5px] font-bold text-slate-600">
              {sessions.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 [scrollbar-width:thin]">
            {loadingSessions ? (
              <p className="px-2 py-4 text-center text-xs text-slate-400">
                Đang tải phiên trò chuyện...
              </p>
            ) : sessions.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-slate-500">
                <MessageSquare size={22} className="mx-auto mb-2 text-slate-300" />
                Chưa có cuộc trò chuyện nào. Hãy đặt câu hỏi để bắt đầu!
              </div>
            ) : (
              sessions.map((s) => {
                const active = s.id === activeSessionId;
                const badge = getSessionStatusBadge(s.handoffStatus);
                const BadgeIcon = badge.icon;
                return (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectSession(s)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectSession(s);
                      }
                    }}
                    className={`group flex items-start justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition cursor-pointer ${
                      active
                        ? "bg-teal-50 text-teal-900 ring-1 ring-teal-200"
                        : "hover:bg-white text-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.className}`}
                      >
                        <BadgeIcon size={10} />
                        {badge.label}
                      </span>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                        {s.lastMessagePreview || "Cuộc trò chuyện mới"}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                        {formatShortDate(s.updatedAt)} · {s.messageCount || 0} tin
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      aria-label="Xóa phiên trò chuyện"
                      title="Xóa phiên trò chuyện"
                      className="rounded-lg p-1 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Vùng chat chính */}
        <AiChatThread
          messages={messages}
          loadingMessages={loadingMessages}
          sending={sending}
          error={error}
          question={question}
          onQuestionChange={setQuestion}
          onSend={handleSend}
          handoffStatus={activeHandoffStatus}
          assignedStaffName={activeSession?.assignedStaffName || ""}
          assignedStaffRole={activeSession?.assignedStaffRole || ""}
          handoffLoading={handoffLoading}
          onRequestHumanSupport={handleRequestHumanSupport}
          onReturnToAi={handleReturnToAi}
        />
      </div>
    </AccountLayout>
  );
}
