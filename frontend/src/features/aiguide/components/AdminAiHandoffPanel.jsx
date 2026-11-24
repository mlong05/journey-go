"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Headset,
  Clock,
  RefreshCw,
  Send,
  Loader2,
  UserCheck,
  RotateCcw,
  ShieldCheck,
  Bot,
  MessageSquare,
  User,
  AlertTriangle,
} from "lucide-react";
import { Panel, EmptyBlock } from "@/components/dashboard/DashboardUI";
import { aiGuideService } from "../services/aiGuideService";
import AiMessageContent from "./AiMessageContent";
import { formatMessageTime, resolveSenderMeta } from "./AiChatThread";

const STATUS_FILTERS = [
  { value: "WAITING_HUMAN", label: "Đang chờ xử lý" },
  { value: "HUMAN_ACTIVE", label: "Đang hỗ trợ" },
  { value: "PENDING", label: "Tất cả cần xử lý" },
  { value: "ALL", label: "Mọi phiên" },
];

function formatDateTimeShort(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getHandoffStatusChip(status) {
  const s = String(status || "AI_ACTIVE").toUpperCase();
  if (s === "WAITING_HUMAN") {
    return {
      label: "Chờ tiếp nhận",
      className: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    };
  }
  if (s === "HUMAN_ACTIVE") {
    return {
      label: "Đang hỗ trợ",
      className: "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200",
    };
  }
  return {
    label: "AI tự động",
    className: "bg-slate-100 text-slate-600",
  };
}

/**
 * Bảng quản lý & trả lời trực tiếp các phiên hội thoại du khách đang chờ Admin / Moderator.
 */
export default function AdminAiHandoffPanel({ onStatsChanged = null }) {
  const [statusFilter, setStatusFilter] = useState("WAITING_HUMAN");
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || null;

  const fetchSessions = useCallback(async (filter = statusFilter, preserveSelection = true) => {
    try {
      const pageData = await aiGuideService.getAdminHandoffSessions({
        status: filter,
        page: 0,
        size: 30,
      });
      const list = Array.isArray(pageData?.content) ? pageData.content : [];
      setSessions(list);
      setSelectedSessionId((prev) => {
        if (preserveSelection && prev && list.some((item) => item.id === prev)) {
          return prev;
        }
        return list[0]?.id ?? null;
      });
    } catch (err) {
      setError(err?.message || "Không thể tải danh sách phiên chat chờ xử lý.");
    } finally {
      setLoadingSessions(false);
    }
  }, [statusFilter]);

  const fetchMessages = useCallback(async (sid) => {
    if (!sid) {
      setMessages([]);
      return;
    }
    try {
      const list = await aiGuideService.getAdminHandoffMessages(sid);
      setMessages(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || "Không thể tải lịch sử tin nhắn phiên chat.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const visibleMessages = selectedSessionId ? messages : [];

  const handleChangeFilter = (nextFilter) => {
    if (nextFilter === statusFilter) return;
    setLoadingSessions(true);
    setStatusFilter(nextFilter);
  };

  const handleSelectSession = (sid) => {
    if (sid === selectedSessionId) return;
    setLoadingMessages(true);
    setSelectedSessionId(sid);
  };

  useEffect(() => {
    let active = true;
    aiGuideService
      .getAdminHandoffSessions({ status: statusFilter, page: 0, size: 30 })
      .then((pageData) => {
        if (!active) return;
        const list = Array.isArray(pageData?.content) ? pageData.content : [];
        setSessions(list);
        setSelectedSessionId((prev) =>
          prev && list.some((item) => item.id === prev) ? prev : (list[0]?.id ?? null),
        );
      })
      .catch((err) => {
        if (active) setError(err?.message || "Không thể tải danh sách phiên chat chờ xử lý.");
      })
      .finally(() => {
        if (active) setLoadingSessions(false);
      });

    return () => {
      active = false;
    };
  }, [statusFilter]);

  useEffect(() => {
    if (!selectedSessionId) {
      return undefined;
    }
    let active = true;
    aiGuideService
      .getAdminHandoffMessages(selectedSessionId)
      .then((list) => {
        if (active) setMessages(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (active) setError(err?.message || "Không thể tải lịch sử tin nhắn.");
      })
      .finally(() => {
        if (active) setLoadingMessages(false);
      });

    return () => {
      active = false;
    };
  }, [selectedSessionId]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchSessions(statusFilter, true);
      if (selectedSessionId) {
        fetchMessages(selectedSessionId);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [statusFilter, selectedSessionId, fetchSessions, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages.length, selectedSessionId]);

  const handleClaim = async () => {
    if (!selectedSessionId || actionLoading) return;
    setError("");
    setActionLoading(true);
    try {
      const updated = await aiGuideService.claimHandoffSession(selectedSessionId);
      setSessions((prev) =>
        prev.map((s) => (s.id === selectedSessionId ? { ...s, ...updated } : s)),
      );
      await fetchMessages(selectedSessionId);
      await fetchSessions(statusFilter, true);
      onStatsChanged?.();
    } catch (err) {
      setError(err?.message || "Không thể tiếp nhận phiên chat.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedSessionId || actionLoading) return;
    setError("");
    setActionLoading(true);
    try {
      await aiGuideService.resolveHandoffSession(selectedSessionId);
      await fetchSessions(statusFilter, false);
      if (selectedSessionId) {
        await fetchMessages(selectedSessionId);
      }
      onStatsChanged?.();
    } catch (err) {
      setError(err?.message || "Không thể kết thúc phiên hỗ trợ.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!selectedSessionId || !text || sendingReply) return;

    setError("");
    setSendingReply(true);
    try {
      await aiGuideService.replyHandoffSession(selectedSessionId, text);
      setReplyText("");
      await fetchMessages(selectedSessionId);
      await fetchSessions(statusFilter, true);
      onStatsChanged?.();
    } catch (err) {
      setError(err?.message || "Không thể gửi tin nhắn phản hồi.");
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          <AlertTriangle size={15} className="shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      <Panel
        title="Các phiên chat đang chờ xử lý & Hỗ trợ trực tiếp"
        description="Tiếp nhận yêu cầu gặp Admin / Moderator từ du khách và nhắn tin phản hồi trực tiếp theo thời gian thực."
        icon={Headset}
        tone="amber"
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => handleChangeFilter(f.value)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  statusFilter === f.value
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                fetchSessions(statusFilter, true);
                if (selectedSessionId) fetchMessages(selectedSessionId);
                onStatsChanged?.();
              }}
              title="Làm mới danh sách"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw size={13} />
              Làm mới
            </button>
          </div>
        }
      >
        <div className="grid h-[620px] grid-cols-1 divide-y divide-slate-200 lg:grid-cols-[340px_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
          {/* Cột trái: Danh sách phiên chờ */}
          <div className="flex min-h-0 flex-col bg-slate-50/60">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">
              <span>Danh sách phiên ({sessions.length})</span>
              <span className="text-[11px] font-medium text-slate-400">
                Tự làm mới mỗi 4s
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 [scrollbar-width:thin]">
              {loadingSessions ? (
                <div className="flex items-center justify-center gap-2 py-12 text-xs font-semibold text-slate-500">
                  <Loader2 size={15} className="animate-spin text-amber-600" />
                  <span>Đang tải phiên chờ xử lý...</span>
                </div>
              ) : sessions.length === 0 ? (
                <EmptyBlock
                  icon={Clock}
                  title="Không có phiên chat phù hợp"
                  description="Khi du khách bấm 'Chat với Moderator/Admin' trong khung chat, phiên hội thoại sẽ xuất hiện tại đây."
                />
              ) : (
                sessions.map((s) => {
                  const active = s.id === selectedSessionId;
                  const chip = getHandoffStatusChip(s.handoffStatus);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSession(s.id)}
                      className={`w-full rounded-xl border p-3 text-left transition cursor-pointer ${
                        active
                          ? "border-amber-300 bg-amber-50/70 shadow-2xs"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-slate-900">
                          {s.userFullName || `Du khách #${s.userId}`}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${chip.className}`}
                        >
                          {chip.label}
                        </span>
                      </div>
                      {s.userEmail && (
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                          {s.userEmail}
                        </p>
                      )}
                      <p className="mt-1.5 line-clamp-2 text-xs text-slate-600">
                        {s.lastMessagePreview || "Chưa có tin nhắn"}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[10.5px] font-medium text-slate-400">
                        <span>
                          {s.assignedStaffName
                            ? `Phụ trách: ${s.assignedStaffName}`
                            : "Chưa có người nhận"}
                        </span>
                        <span>{formatDateTimeShort(s.updatedAt)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Cột phải: Nội dung chi tiết & Trả lời */}
          {!selectedSession ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare size={28} className="mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">
                Chọn một phiên hội thoại ở bên trái
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Bạn có thể xem lại câu hỏi của du khách với AI trước đó, tiếp nhận hỗ trợ và nhắn tin trực tiếp tại đây.
              </p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-col bg-white">
              {/* Header phiên đang xem */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-bold text-slate-900">
                      {selectedSession.userFullName || `Du khách #${selectedSession.userId}`}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                        getHandoffStatusChip(selectedSession.handoffStatus).className
                      }`}
                    >
                      {getHandoffStatusChip(selectedSession.handoffStatus).label}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {selectedSession.userEmail || `User ID: ${selectedSession.userId}`}
                    {selectedSession.assignedStaffName
                      ? ` · Đang phụ trách: ${selectedSession.assignedStaffName}`
                      : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedSession.handoffStatus === "WAITING_HUMAN" && (
                    <button
                      type="button"
                      onClick={handleClaim}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <UserCheck size={14} />
                      )}
                      Tiếp nhận xử lý
                    </button>
                  )}

                  {(selectedSession.handoffStatus === "WAITING_HUMAN" ||
                    selectedSession.handoffStatus === "HUMAN_ACTIVE") && (
                    <button
                      type="button"
                      onClick={handleResolve}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      <RotateCcw size={14} />
                      Kết thúc & trả về AI
                    </button>
                  )}
                </div>
              </div>

              {/* Luồng tin nhắn */}
              <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 space-y-3 [scrollbar-width:thin]">
                {loadingMessages ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-xs font-semibold text-slate-500">
                    <Loader2 size={15} className="animate-spin text-indigo-600" />
                    <span>Đang tải tin nhắn...</span>
                  </div>
                ) : visibleMessages.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">
                    Phiên hội thoại chưa có tin nhắn nào.
                  </p>
                ) : (
                  visibleMessages.map((msg, idx) => {
                    const role = String(msg.role || "").toUpperCase();
                    if (role === "SYSTEM") {
                      return (
                        <div key={msg.id || `${idx}-sys`} className="flex justify-center">
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {msg.content}
                          </span>
                        </div>
                      );
                    }

                    const isTourist = role === "USER";
                    const identity = isTourist ? null : resolveSenderMeta(msg);

                    return (
                      <div
                        key={msg.id || `${idx}-${role}`}
                        className={`flex ${isTourist ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-2xs ${
                            isTourist
                              ? "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                              : identity.isHuman
                                ? `rounded-br-md ${identity.bubbleClass}`
                                : "rounded-br-md border border-teal-200 bg-teal-50/70 text-slate-800"
                          }`}
                        >
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            {isTourist ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                <User size={10} />
                                {selectedSession.userFullName || "Du khách"}
                              </span>
                            ) : (
                              <>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${identity.badgeClass}`}
                                >
                                  {identity.isHuman ? (
                                    identity.isAdmin ? (
                                      <ShieldCheck size={11} />
                                    ) : (
                                      <Headset size={11} />
                                    )
                                  ) : (
                                    <Bot size={11} />
                                  )}
                                  {identity.displayName}
                                </span>
                                {identity.humanBadgeText && (
                                  <span
                                    className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase ${identity.humanTagClass}`}
                                  >
                                    {identity.humanBadgeText}
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          <AiMessageContent content={msg.content} />

                          {msg.createdAt && (
                            <p className="mt-1 text-right text-[10px] text-slate-400">
                              {formatMessageTime(msg.createdAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Ô nhập phản hồi trực tiếp của Admin / Moderator */}
              <form
                onSubmit={handleSendReply}
                className="border-t border-slate-200 bg-white p-3"
              >
                <div className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (!sendingReply && replyText.trim()) {
                          handleSendReply(e);
                        }
                      }
                    }}
                    placeholder="Nhập tin nhắn phản hồi trực tiếp tới du khách (nhấn Enter để gửi)..."
                    className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                  >
                    {sendingReply ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    Gửi phản hồi
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
