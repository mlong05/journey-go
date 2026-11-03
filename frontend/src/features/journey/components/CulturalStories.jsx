"use client";

import { useEffect, useState } from "react";
import { BookOpen, FileText, Globe, Headphones, Image as ImageIcon, Lock, Video, X } from "lucide-react";
import { culturalContentService } from "@/features/destination";

/** Nhãn và biểu tượng theo loại nội dung (khớp CulturalContentManagerModal của provider). */
const TYPES = {
  AUDIO: { label: "Thuyết minh", icon: Headphones, tone: "bg-indigo-50 text-indigo-700" },
  VIDEO: { label: "Video tư liệu", icon: Video, tone: "bg-rose-50 text-rose-700" },
  STORY: { label: "Truyền thuyết", icon: BookOpen, tone: "bg-amber-50 text-amber-800" },
  ARTICLE: { label: "Bài viết di sản", icon: FileText, tone: "bg-emerald-50 text-emerald-700" },
  IMAGE: { label: "Hình ảnh", icon: ImageIcon, tone: "bg-sky-50 text-sky-700" },
  "3D_VR": { label: "Mô hình 3D / VR", icon: Globe, tone: "bg-violet-50 text-violet-700" },
};

function youTubeEmbed(url) {
  const m = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0` : null;
}

/** Nhận diện cách phát media từ đường dẫn. */
function mediaKind(url) {
  if (!url) return null;
  if (youTubeEmbed(url)) return "youtube";
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url) || /\/video\/upload\//.test(url)) return "video";
  if (/\.(mp3|wav|m4a|aac|ogg|oga|flac)(\?.*)?$/i.test(url)) return "audio";
  if (/\.(jpe?g|png|gif|webp|avif|svg)(\?.*)?$/i.test(url) || /\/image\/upload\//.test(url)) return "image";
  return "link";
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} phút${s ? ` ${s} giây` : ""}` : `${s} giây`;
}

function ContentViewer({ content, onClose }) {
  const kind = mediaKind(content.mediaUrl);
  const meta = TYPES[content.contentType] ?? TYPES.ARTICLE;
  const Icon = meta.icon;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-3xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-gray-100 bg-white/95 px-5 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${meta.tone}`}>
            <Icon className="h-3.5 w-3.5" /> {meta.label}
          </span>
          <button onClick={onClose} aria-label="Đóng" className="rounded-full p-1.5 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {kind === "youtube" && (
          <div className="aspect-video bg-black">
            <iframe
              src={youTubeEmbed(content.mediaUrl)}
              title={content.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {kind === "video" && (
          <video src={content.mediaUrl} controls className="aspect-video w-full bg-black" />
        )}
        {kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.mediaUrl} alt={content.title} className="max-h-[50vh] w-full object-cover" />
        )}

        <div className="space-y-4 p-5">
          <div>
            <h2 className="text-xl font-extrabold leading-snug text-gray-900 dark:text-white">{content.title}</h2>
            <p className="mt-1 text-xs text-gray-500">
              {content.destinationName}
              {formatDuration(content.duration) ? ` · ${formatDuration(content.duration)}` : ""}
            </p>
          </div>

          {kind === "audio" && <audio src={content.mediaUrl} controls className="w-full" />}

          {/* Thư viện ảnh kèm nội dung: vuốt ngang để xem, bấm để mở ảnh gốc */}
          {Array.isArray(content.imageUrls) && content.imageUrls.length > 0 && (
            <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
              {content.imageUrls.map((url, i) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative h-48 w-72 shrink-0 snap-start overflow-hidden rounded-2xl bg-gray-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`${content.title} - ảnh ${i + 1}`} className="h-full w-full object-cover" />
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
                    {i + 1}/{content.imageUrls.length}
                  </span>
                </a>
              ))}
            </div>
          )}
          {kind === "link" && (
            <a
              href={content.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
            >
              Mở nội dung đa phương tiện
            </a>
          )}

          {content.description && (
            <p className="rounded-2xl bg-amber-50 p-4 text-[15px] font-medium italic leading-relaxed text-amber-900">
              {content.description}
            </p>
          )}
          {content.contentText && (
            <div className="whitespace-pre-line text-[15px] leading-7 text-gray-700 dark:text-gray-300">
              {content.contentText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Câu chuyện & thuyết minh văn hóa đã duyệt của một điểm đến (GET /destinations/{id}/contents).
 *
 * `unlocked = false`: chỉ hiện tiêu đề / mô tả kèm khóa (mở khóa khi check-in tại điểm đến).
 * `unlocked = true`: bấm để xem toàn văn và phát media (gọi /play để tính lượt xem).
 */
export default function CulturalStories({ destinationId, unlocked = false, compact = false }) {
  const [contents, setContents] = useState(null);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState(null);
  const [opening, setOpening] = useState(null);

  useEffect(() => {
    let active = true;
    culturalContentService
      .getByDestination(destinationId)
      .then((list) => active && setContents([...list].sort((a, b) => a.sequenceOrder - b.sequenceOrder)))
      .catch((err) => active && setError(err?.message || "Không tải được nội dung văn hóa."));
    return () => {
      active = false;
    };
  }, [destinationId]);

  async function open(content) {
    if (!unlocked) return;
    setOpening(content.id);
    try {
      setViewing(await culturalContentService.play(content.id));
    } catch {
      // Không ghi nhận được lượt xem vẫn cho đọc nội dung đang có.
      setViewing(content);
    } finally {
      setOpening(null);
    }
  }

  if (error) return <p className="text-xs text-red-600">{error}</p>;
  if (contents === null) return <div className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />;
  if (contents.length === 0) {
    return compact ? null : (
      <p className="text-sm text-gray-500">Điểm đến này chưa có câu chuyện văn hóa được duyệt.</p>
    );
  }

  return (
    <div className="space-y-2">
      {!unlocked && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
          <Lock className="h-3.5 w-3.5" /> Mở khóa toàn bộ {contents.length} nội dung khi check-in tại điểm đến
        </p>
      )}
      {contents.map((c) => {
        const meta = TYPES[c.contentType] ?? TYPES.ARTICLE;
        const Icon = meta.icon;
        return (
          <button
            key={c.id}
            onClick={() => open(c)}
            disabled={!unlocked || opening === c.id}
            className={`flex w-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors dark:border-gray-800 dark:bg-gray-900 ${
              unlocked ? "hover:border-emerald-300 hover:bg-emerald-50/40" : "cursor-default"
            }`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-gray-900 dark:text-white">{c.title}</span>
              <span className="mt-0.5 block text-xs text-gray-500">
                {meta.label}
                {formatDuration(c.duration) ? ` · ${formatDuration(c.duration)}` : ""}
              </span>
              {c.description && !compact && (
                <span className="mt-1 line-clamp-2 block text-sm text-gray-600">{c.description}</span>
              )}
            </span>
            {unlocked ? (
              <span className="self-center text-sm font-bold text-emerald-700">
                {opening === c.id ? "..." : "Xem"}
              </span>
            ) : (
              <Lock className="h-4 w-4 shrink-0 self-center text-gray-400" />
            )}
          </button>
        );
      })}
      {viewing && <ContentViewer content={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
