"use client";
/* eslint-disable @next/next/no-img-element -- ảnh huy hiệu lấy từ URL ngoài (Unsplash / Cloudinary) */

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Award, CheckCircle2, Sparkles, Star, Trophy, X } from "lucide-react";
import BronzeDrumMotif from "@/components/ui/BronzeDrumMotif";
import { useI18n, INTL_LOCALE } from "@/i18n";

/**
 * Popup chúc mừng nhận thưởng thành tựu theo phong cách vinh danh Genshin Impact × Di sản Việt Nam.
 */
export default function ClaimRewardModal({ open, reward, achievement, onClose }) {
  const prefersReduced = useReducedMotion();
  const { t, locale } = useI18n();
  const numberLocale = INTL_LOCALE[locale] || "vi-VN";
  const [failedSrc, setFailedSrc] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const title = reward?.achievementName || achievement?.name || t("claim.newAchievement");
  const badgeName = reward?.badgeName || achievement?.badgeName;
  const badgeIcon = reward?.badgeIcon || achievement?.badgeIcon;
  const pointsAwarded = Number(reward?.pointsAwarded ?? achievement?.pointsReward ?? 0);
  const newBalance = reward?.newPointBalance;
  const showImage = Boolean(badgeIcon) && failedSrc !== badgeIcon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="claim-reward-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="claim-reward-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReduced ? 0 : 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md"
        >
          <motion.div
            key="claim-reward-card"
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.88, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-300/60 bg-[linear-gradient(160deg,#093b37,#0f524c,#132a2e)] p-6 text-center text-white shadow-[0_24px_80px_-12px_rgba(251,191,36,0.4)] sm:p-8"
          >
            {/* Vầng hào quang phía trên */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-amber-300/25 blur-3xl"
            />

            {/* Nút đóng */}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("claim.closeLabel")}
              className="absolute right-4 top-4 z-20 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-teal-100 transition hover:bg-white/20 hover:text-white cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Khung vinh danh huy hiệu + Họa tiết Trống Đồng xoay chậm */}
            <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
              <motion.div
                aria-hidden="true"
                animate={prefersReduced ? undefined : { rotate: 360 }}
                transition={prefersReduced ? undefined : { duration: 28, repeat: Infinity, ease: "linear" }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <BronzeDrumMotif className="h-44 w-44 text-amber-300/25" />
              </motion.div>

              <motion.div
                aria-hidden="true"
                initial={prefersReduced ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08, duration: 0.4 }}
                className="pointer-events-none absolute h-28 w-28 rounded-full bg-amber-400/20 blur-xl"
              />

              <motion.div
                initial={prefersReduced ? false : { scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.05 }}
                className="relative z-10 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-amber-200 bg-[linear-gradient(145deg,#fef3c7,#f59e0b)] p-1 shadow-[0_0_32px_rgba(251,191,36,0.55)] ring-4 ring-amber-300/30"
              >
                {showImage ? (
                  <img
                    src={badgeIcon}
                    alt={badgeName || title}
                    onError={() => setFailedSrc(badgeIcon)}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <Trophy size={40} className="text-amber-950" />
                )}
              </motion.div>

              {/* Sao trang trí */}
              <Star
                size={14}
                className="pointer-events-none absolute left-5 top-6 fill-amber-200 text-amber-200 animate-pulse"
              />
              <Sparkles
                size={16}
                className="pointer-events-none absolute bottom-6 right-5 text-amber-200 animate-pulse"
              />
            </div>

            {/* Nhãn nghi lễ */}
            <div className="relative z-10 mt-1 flex items-center justify-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-300">
              <span className="h-px w-6 bg-amber-300/50" />
              <span>{t("claim.unlocked")}</span>
              <span className="h-px w-6 bg-amber-300/50" />
            </div>

            <h2 id="claim-reward-title" className="relative z-10 mt-2 text-2xl font-extrabold tracking-tight text-white">
              {title}
            </h2>

            {badgeName && (
              <div className="relative z-10 mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-100">
                <Award size={14} className="text-amber-300" />
                <span>{t("claim.badge", { name: badgeName })}</span>
              </div>
            )}

            {/* Hộp phần thưởng */}
            <div className="relative z-10 mt-5 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-100/80">
                {t("claim.rewardReceived")}
              </p>
              <div className="mt-1.5 flex items-baseline justify-center gap-1.5">
                <span className="text-3xl font-black tabular-nums text-amber-300">
                  +{pointsAwarded.toLocaleString(numberLocale)}
                </span>
                <span className="text-sm font-bold text-amber-200">Journey Points</span>
              </div>
              {typeof newBalance === "number" && (
                <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-teal-100/90">
                  <CheckCircle2 size={14} className="text-emerald-300" />
                  <span>
                    {t("claim.balance")}{" "}
                    <strong className="font-extrabold tabular-nums text-white">
                      {newBalance.toLocaleString(numberLocale)} JP
                    </strong>
                  </span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="relative z-10 mt-6 w-full rounded-2xl bg-[linear-gradient(135deg,#fcd34d,#f59e0b)] px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:brightness-105 active:scale-[0.98] cursor-pointer"
            >
              {t("claim.continue")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
