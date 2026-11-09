"use client";

import React from "react";
import { ExternalLink } from "lucide-react";

/** Mã video YouTube (11 ký tự) từ các dạng link: watch?v=, youtu.be/, shorts/, embed/, live/. */
export function youTubeId(url) {
  if (!url) return null;
  const m = String(url).match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?(?:.*&)?v=))([\w-]{11})/,
  );
  return m ? m[1] : null;
}

/**
 * Khung xem trước video nhỏ: YouTube nhúng qua youtube-nocookie, link MP4 / video đã tải lên dùng thẻ <video>.
 * Link chưa hợp lệ thì báo một dòng thay vì khung trống.
 */
export default function VideoPreview({ url, source, className = "" }) {
  const value = (url || "").trim();
  if (!value) return null;

  const id = youTubeId(value);
  const isYouTube = source === "YOUTUBE" || (!source && id);

  if (isYouTube) {
    if (!id) {
      return <p className="text-[11px] font-bold text-amber-700">Link YouTube chưa đúng, chưa xem trước được. Dán link dạng youtube.com/watch?v=… hoặc youtu.be/…</p>;
    }
    return (
      <div className={`w-full max-w-md ${className}`}>
        <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
            title="Xem trước video YouTube"
            className="absolute inset-0 w-full h-full"
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  if (!/^https?:\/\//i.test(value)) {
    return <p className="text-[11px] font-bold text-amber-700">Link video phải bắt đầu bằng https://</p>;
  }

  return (
    <div className={`w-full max-w-md space-y-1 ${className}`}>
      <video src={value} controls preload="metadata" playsInline
        className="w-full aspect-video rounded-xl border border-slate-200 bg-black object-contain">
        Trình duyệt không phát được video này.
      </video>
      <a href={value} target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline">
        <ExternalLink size={11} /> Mở video trong tab mới
      </a>
    </div>
  );
}
