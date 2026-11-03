"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

const TONES = {
  success: { cls: "bg-emerald-50 border-emerald-200 text-emerald-800", Icon: CheckCircle2 },
  warning: { cls: "bg-amber-50 border-amber-200 text-amber-800", Icon: AlertTriangle },
  error: { cls: "bg-rose-50 border-rose-200 text-rose-700", Icon: AlertCircle },
};

/**
 * Dòng thông báo kết quả lấy tọa độ GPS, đặt ngay dưới ô Vĩ độ / Kinh độ.
 * notice: { tone: "success" | "warning" | "error", text } hoặc null để ẩn.
 */
export default function GpsNotice({ notice }) {
  if (!notice?.text) return null;
  const { cls, Icon } = TONES[notice.tone] || TONES.error;
  return (
    <div
      role={notice.tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-[11.5px] font-semibold leading-relaxed ${cls}`}
    >
      <Icon size={14} className="shrink-0 mt-0.5" />
      <span>{notice.text}</span>
    </div>
  );
}
