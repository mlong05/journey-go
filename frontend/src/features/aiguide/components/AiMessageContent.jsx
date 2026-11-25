"use client";

import Link from "next/link";
import { Compass, ArrowUpRight } from "lucide-react";
import { useT } from "@/i18n";

const TOUR_LINK_TOKEN_REGEX = /(\[[^\]]+\]\(\/tours\/\d+\)|\/tours\/\d+)/g;
const MARKDOWN_LINK_REGEX = /^\[([^\]]+)\]\((\/tours\/(\d+))\)$/;
const BARE_TOUR_PATH_REGEX = /^\/tours\/(\d+)$/;

function cleanMarkdownDecorations(text) {
  return String(text || "")
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/__([\s\S]+?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^(\s*)\*\s+/gm, "$1- ")
    .replace(/\*\*/g, "");
}

/**
 * Hiển thị nội dung tin nhắn AI sạch Markdown thừa (** **, ###) và biến các đường dẫn
 * `/tours/{id}` hoặc `[Xem tour: ...](/tours/{id})` thành nút liên kết bấm được.
 */
export default function AiMessageContent({
  content = "",
  isUser = false,
  onTourLinkClick = null,
}) {
  const t = useT();

  if (isUser) {
    return (
      <p className="whitespace-pre-wrap break-words text-[13.5px]">
        {content}
      </p>
    );
  }

  const cleaned = cleanMarkdownDecorations(content);
  const parts = cleaned.split(TOUR_LINK_TOKEN_REGEX);

  return (
    <div className="whitespace-pre-wrap break-words text-[13.5px]">
      {parts.map((part, idx) => {
        if (!part) return null;

        const mdMatch = part.match(MARKDOWN_LINK_REGEX);
        if (mdMatch) {
          const [, label, href, tourId] = mdMatch;
          return (
            <Link
              key={`tour-md-${tourId}-${idx}`}
              href={href}
              onClick={() => onTourLinkClick?.(Number(tourId))}
              className="mx-0.5 inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-800 transition hover:border-teal-400 hover:bg-teal-100 align-baseline"
            >
              <Compass size={11} className="shrink-0 text-teal-600" />
              <span>{label}</span>
              <ArrowUpRight size={11} className="shrink-0 text-teal-600" />
            </Link>
          );
        }

        const bareMatch = part.match(BARE_TOUR_PATH_REGEX);
        if (bareMatch) {
          const [, tourId] = bareMatch;
          return (
            <Link
              key={`tour-bare-${tourId}-${idx}`}
              href={`/tours/${tourId}`}
              onClick={() => onTourLinkClick?.(Number(tourId))}
              className="mx-0.5 inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-800 transition hover:border-teal-400 hover:bg-teal-100 align-baseline"
            >
              <Compass size={11} className="shrink-0 text-teal-600" />
              <span>{t("aiguide.message.viewTour", { id: tourId })}</span>
              <ArrowUpRight size={11} className="shrink-0 text-teal-600" />
            </Link>
          );
        }

        return <span key={`txt-${idx}`}>{part}</span>;
      })}
    </div>
  );
}
