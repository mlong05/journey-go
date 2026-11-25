"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  BookOpen,
  Compass,
  Loader2,
  AlertCircle,
  Headset,
  ShieldCheck,
  Bot,
  Clock,
  RotateCcw,
} from "lucide-react";
import { INTL_LOCALE, translate, useI18n } from "@/i18n";
import AiMessageContent from "./AiMessageContent";

const STARTER_PROMPT_KEYS = [
  "aiguide.starter.history",
  "aiguide.starter.etiquette",
  "aiguide.starter.culture",
  "aiguide.starter.tours",
];

/**
 * Định dạng thời gian ngắn HH:mm theo locale hiện tại.
 */
export function formatMessageTime(iso, locale = "vi") {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString(INTL_LOCALE[locale] || "vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Phân biệt rõ nguồn tin nhắn: AI Hướng dẫn viên vs Nhân sự thật (Admin / Moderator).
 */
export function resolveSenderMeta(msg, t = null) {
  const tr = t || ((key) => translate("vi", key));
  const role = String(msg?.role || "").toUpperCase();
  const senderRole = String(msg?.senderRole || "").toUpperCase();

  if (role === "HUMAN_AGENT" || senderRole === "ADMIN" || senderRole === "CONTENT_MODERATOR") {
    const isAdmin = senderRole === "ADMIN";
    const roleLabel = isAdmin ? tr("aiguide.role.admin") : tr("aiguide.role.moderator");
    const displayName = msg?.senderName
      ? `${roleLabel} · ${msg.senderName}`
      : roleLabel;

    return {
      isHuman: true,
      isAdmin,
      roleLabel,
      displayName,
      humanBadgeText: tr("aiguide.badge.human"),
      bubbleClass: isAdmin
        ? "border border-rose-200 bg-rose-50/75 text-slate-800"
        : "border border-indigo-200 bg-indigo-50/80 text-slate-800",
      badgeClass: isAdmin
        ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
        : "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200",
      humanTagClass: isAdmin
        ? "bg-white text-rose-700 ring-1 ring-rose-200"
        : "bg-white text-indigo-700 ring-1 ring-indigo-200",
    };
  }

  return {
    isHuman: false,
    isAdmin: false,
    roleLabel: "AI",
    displayName: msg?.senderName || tr("aiguide.role.aiGuide"),
    humanBadgeText: null,
    bubbleClass: "border border-slate-200 bg-white text-slate-800",
    badgeClass: "bg-teal-50 text-teal-800 ring-1 ring-teal-200",
    humanTagClass: "",
  };
}

/**
 * Luồng hội thoại dùng chung cho cả Widget nổi và trang toàn màn hình AI Virtual Guide.
 * Hỗ trợ chuyển đổi liền mạch giữa AI Hướng dẫn viên và trò chuyện trực tiếp với Admin / Moderator.
 */
export default function AiChatThread({
  messages = [],
  loadingMessages = false,
  sending = false,
  error = "",
  question = "",
  onQuestionChange,
  onSend,
  onTourLinkClick = null,
  handoffStatus = "AI_ACTIVE",
  assignedStaffName = "",
  assignedStaffRole = "",
  handoffLoading = false,
  onRequestHumanSupport = null,
  onReturnToAi = null,
  maxLength = 1000,
  compact = false,
}) {
  const { t, locale } = useI18n();
  const listRef = useRef(null);
  const [showReturnAiModal, setShowReturnAiModal] = useState(false);

  // ⚠️ Chỉ cuộn KHUNG TIN NHẮN xuống cuối. Không dùng `scrollIntoView`: nó cuộn cả các khung cha
  // (kể cả trang) ⇒ mở trang Hướng dẫn viên AI là trang bị kéo tụt xuống.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: messages.length ? "smooth" : "auto" });
  }, [messages.length, sending, handoffStatus]);

  useEffect(() => {
    if (!showReturnAiModal) return undefined;
    const handleEsc = (e) => {
      if (e.key === "Escape" && !handoffLoading) {
        setShowReturnAiModal(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showReturnAiModal, handoffLoading]);

  const normalizedHandoff = String(handoffStatus || "AI_ACTIVE").toUpperCase();
  const isWaitingHuman = normalizedHandoff === "WAITING_HUMAN";
  const isHumanActive = normalizedHandoff === "HUMAN_ACTIVE";
  const isLiveQueue = isWaitingHuman || isHumanActive;
  const staffRoleLabel = String(assignedStaffRole || "").toUpperCase() === "ADMIN"
    ? t("aiguide.role.admin")
    : t("aiguide.role.moderator");

  const returnModalCopy = isHumanActive
    ? {
        title: t("aiguide.returnModal.activeTitle"),
        description: t("aiguide.returnModal.activeDesc"),
        primaryLabel: t("aiguide.returnModal.activePrimary"),
        confirmLabel: t("aiguide.returnModal.activeConfirm"),
        iconClass: "bg-indigo-100 text-indigo-700",
      }
    : {
        title: t("aiguide.returnModal.waitingTitle"),
        description: t("aiguide.returnModal.waitingDesc"),
        primaryLabel: t("aiguide.returnModal.waitingPrimary"),
        confirmLabel: t("aiguide.returnModal.waitingConfirm"),
        iconClass: "bg-amber-100 text-amber-700",
      };

  const handleReturnToAiClick = () => {
    if (!isLiveQueue) return;
    setShowReturnAiModal(true);
  };

  const handleConfirmReturnToAi = async () => {
    try {
      await onReturnToAi?.();
    } finally {
      setShowReturnAiModal(false);
    }
  };

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
      {/* Thanh trạng thái hỗ trợ AI / Chuyển tiếp Admin & Moderator */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b ${
          isHumanActive
            ? "border-indigo-200 bg-indigo-50/90"
            : isWaitingHuman
              ? "border-amber-200 bg-amber-50/90"
              : "border-slate-200 bg-white"
        } ${compact ? "px-3 py-2" : "px-4 py-2.5"}`}
      >
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold">
          {isHumanActive ? (
            <>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white">
                <Headset size={13} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-indigo-950">
                  {assignedStaffName
                    ? t("aiguide.status.chattingWithName", {
                        role: staffRoleLabel,
                        name: assignedStaffName,
                      })
                    : t("aiguide.status.chattingWith", { role: staffRoleLabel })}
                </p>
                <p className="truncate text-[10.5px] font-medium text-indigo-700">
                  {t("aiguide.status.humanReplying")}
                </p>
              </div>
            </>
          ) : isWaitingHuman ? (
            <>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-amber-500 text-white">
                <Clock size={13} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-amber-950">
                  {t("aiguide.status.waitingStaff")}
                </p>
                <p className="truncate text-[10.5px] font-medium text-amber-700">
                  {t("aiguide.status.waitingHint")}
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-200/80">
                <Bot size={13} />
              </span>
              <span className="truncate text-slate-600">
                {t("aiguide.status.aiActive")}
              </span>
            </>
          )}
        </div>

        {isLiveQueue
          ? onReturnToAi && (
              <button
                type="button"
                onClick={handleReturnToAiClick}
                disabled={handoffLoading}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                {handoffLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RotateCcw size={12} />
                )}
                {t("aiguide.action.returnToAi")}
              </button>
            )
          : onRequestHumanSupport && (
              <button
                type="button"
                onClick={() => onRequestHumanSupport("")}
                disabled={handoffLoading}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50 cursor-pointer"
              >
                {handoffLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Headset size={12} />
                )}
                {t("aiguide.action.chatWithStaff")}
              </button>
            )}
      </div>

      {/* Khu vực tin nhắn */}
      <div
        ref={listRef}
        className={`flex-1 overflow-y-auto space-y-3 [scrollbar-width:thin] ${
          compact ? "p-3" : "p-4 sm:p-5"
        }`}
      >
        {loadingMessages ? (
          <div className="flex h-full min-h-[160px] items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 size={16} className="animate-spin text-teal-700" />
            <span>{t("aiguide.loading.history")}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-200/70">
              <Sparkles size={20} />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {t("aiguide.welcome.title")}
            </p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
              {t("aiguide.welcome.subtitle")}
            </p>
            {!isLiveQueue && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {STARTER_PROMPT_KEYS.map((key) => {
                  const prompt = t(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onSend(prompt)}
                      disabled={sending}
                      className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-2xs transition hover:border-teal-400 hover:bg-teal-50 disabled:opacity-50 cursor-pointer"
                    >
                      <Compass size={12} className="shrink-0 text-teal-600" />
                      <span className="text-left">{prompt}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, idx) => {
            const role = String(msg.role || "").toUpperCase();
            if (role === "SYSTEM") {
              return (
                <div
                  key={msg.id || `${idx}-system`}
                  className="flex justify-center py-0.5"
                >
                  <span className="max-w-[92%] rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-center text-[11px] font-semibold text-slate-600">
                    {msg.content}
                  </span>
                </div>
              );
            }

            const isUser = role === "USER";
            const identity = isUser ? null : resolveSenderMeta(msg, t);

            return (
              <div
                key={msg.id || `${idx}-${role}`}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-2xs ${
                    isUser
                      ? "rounded-br-md bg-teal-700 text-white"
                      : `rounded-bl-md ${identity.bubbleClass}`
                  }`}
                >
                  {!isUser && (
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
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
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${identity.humanTagClass}`}
                        >
                          {identity.humanBadgeText}
                        </span>
                      )}

                      {!identity.isHuman && msg.mode && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            msg.mode === "TASK_HINT"
                              ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Sparkles size={10} />
                          {msg.mode === "TASK_HINT"
                            ? t("aiguide.mode.taskHint")
                            : t("aiguide.mode.guide")}
                        </span>
                      )}
                    </div>
                  )}

                  <AiMessageContent
                    content={msg.content}
                    isUser={isUser}
                    onTourLinkClick={onTourLinkClick}
                  />

                  {!isUser &&
                    !identity.isHuman &&
                    Array.isArray(msg.citations) &&
                    msg.citations.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2">
                        <BookOpen size={11} className="shrink-0 text-slate-400" />
                        <span className="text-[10.5px] font-semibold text-slate-400">
                          {t("aiguide.message.sources")}
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
                      {formatMessageTime(msg.createdAt, locale)}
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
              <span>
                {isLiveQueue
                  ? t("aiguide.sending.toStaff")
                  : t("aiguide.sending.aiSearching")}
              </span>
            </div>
          </div>
        )}

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
            placeholder={
              isLiveQueue
                ? t("aiguide.input.placeholderStaff")
                : t("aiguide.input.placeholderAi")
            }
            className="max-h-28 min-h-[38px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-teal-600 focus:bg-white"
          />
          <button
            type="submit"
            disabled={sending || !question.trim()}
            aria-label={t("aiguide.action.sendMessage")}
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
            {t("aiguide.input.charCount", { current: question.length, max: maxLength })}
          </p>
        )}
      </form>

      {/* Hộp thoại xác nhận khi hủy hàng chờ hoặc kết thúc chat với nhân viên */}
      {showReturnAiModal && isLiveQueue && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-ai-modal-title"
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          onClick={() => {
            if (!handoffLoading) setShowReturnAiModal(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${returnModalCopy.iconClass}`}
              >
                {isHumanActive ? <Headset size={18} /> : <Clock size={18} />}
              </span>
              <div className="min-w-0">
                <h3
                  id="return-ai-modal-title"
                  className="text-sm font-bold text-slate-900"
                >
                  {returnModalCopy.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {returnModalCopy.description}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={handoffLoading}
                onClick={handleConfirmReturnToAi}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
              >
                {handoffLoading && <Loader2 size={13} className="animate-spin" />}
                {returnModalCopy.confirmLabel}
              </button>
              <button
                type="button"
                disabled={handoffLoading}
                onClick={() => setShowReturnAiModal(false)}
                className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-teal-800 disabled:opacity-50 cursor-pointer"
              >
                {returnModalCopy.primaryLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
