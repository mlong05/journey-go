"use client";

import { Award, Trophy } from "lucide-react";

/** Hộp thoại chúc mừng khi nhận huy hiệu hoặc hoàn thành hành trình. */
export default function RewardModal({
  title,
  subtitle,
  badgeName,
  badgeIconUrl,
  points,
  trophy = false,
  buttonLabel = "Tuyệt vời",
  onClose,
}) {
  const Icon = trophy ? Trophy : Award;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xs animate-in zoom-in-95 rounded-3xl bg-white p-6 text-center shadow-xl duration-300 dark:bg-gray-900">
        <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-100 to-amber-200">
          {badgeIconUrl && badgeIconUrl.startsWith("http") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={badgeIconUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon className="h-12 w-12 text-amber-500" />
          )}
        </div>
        <h2 className="mt-4 text-xl font-extrabold text-gray-900 dark:text-white">{title}</h2>
        {badgeName && <p className="mt-1 font-bold text-amber-700">{badgeName}</p>}
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{subtitle}</p>
        {points > 0 && (
          <span className="mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
            +{points} điểm
          </span>
        )}
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
