"use client";
/* eslint-disable @next/next/no-img-element -- ảnh huy hiệu lấy từ URL ngoài (Unsplash / Cloudinary) */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Compass,
  Crown,
  Flame,
  Gift,
  Loader2,
  Lock,
  MapPin,
  RefreshCw,
  Sparkles,
  Trophy,
} from "lucide-react";
import BronzeDrumMotif from "@/components/ui/BronzeDrumMotif";
import AccountLayout, { refreshAccountSummary } from "./AccountLayout";
import ClaimRewardModal from "./ClaimRewardModal";
import { touristService } from "../services/touristService";
import { shortDate } from "../utils";
import { useT, useI18n, translate, getLocale, INTL_LOCALE } from "@/i18n";

const CATEGORIES = [
  {
    key: "TOUR",
    labelKey: "account.ach.cat.TOUR.label",
    shortLabelKey: "account.ach.cat.TOUR.short",
    descriptionKey: "account.ach.cat.TOUR.desc",
    unitKey: "account.ach.cat.TOUR.unit",
    Icon: Compass,
  },
  {
    key: "CHECKIN",
    labelKey: "account.ach.cat.CHECKIN.label",
    shortLabelKey: "account.ach.cat.CHECKIN.short",
    descriptionKey: "account.ach.cat.CHECKIN.desc",
    unitKey: "account.ach.cat.CHECKIN.unit",
    Icon: MapPin,
  },
  {
    key: "CULTURE_QUIZ",
    labelKey: "account.ach.cat.CULTURE_QUIZ.label",
    shortLabelKey: "account.ach.cat.CULTURE_QUIZ.short",
    descriptionKey: "account.ach.cat.CULTURE_QUIZ.desc",
    unitKey: "account.ach.cat.CULTURE_QUIZ.unit",
    Icon: BookOpen,
  },
  {
    key: "EXPERIENCE",
    labelKey: "account.ach.cat.EXPERIENCE.label",
    shortLabelKey: "account.ach.cat.EXPERIENCE.short",
    descriptionKey: "account.ach.cat.EXPERIENCE.desc",
    unitKey: "account.ach.cat.EXPERIENCE.unit",
    Icon: Sparkles,
  },
  {
    key: "STREAK_LOYALTY",
    labelKey: "account.ach.cat.STREAK_LOYALTY.label",
    shortLabelKey: "account.ach.cat.STREAK_LOYALTY.short",
    descriptionKey: "account.ach.cat.STREAK_LOYALTY.desc",
    unitKey: "account.ach.cat.STREAK_LOYALTY.unit",
    Icon: Flame,
  },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

const TIER_META = {
  BRONZE: {
    labelKey: "account.ach.tier.BRONZE",
    pillCls: "border-orange-200 bg-orange-50 text-orange-800",
    ringCls: "border-orange-300 bg-[linear-gradient(145deg,#fff7ed,#fed7aa)]",
    iconCls: "text-orange-700",
  },
  SILVER: {
    labelKey: "account.ach.tier.SILVER",
    pillCls: "border-slate-300 bg-slate-100 text-slate-700",
    ringCls: "border-slate-300 bg-[linear-gradient(145deg,#f8fafc,#e2e8f0)]",
    iconCls: "text-slate-700",
  },
  GOLD: {
    labelKey: "account.ach.tier.GOLD",
    pillCls: "border-amber-300 bg-amber-50 text-amber-800",
    ringCls: "border-amber-400 bg-[linear-gradient(145deg,#fef9c3,#fcd34d)]",
    iconCls: "text-amber-900",
  },
  LEGENDARY: {
    labelKey: "account.ach.tier.LEGENDARY",
    pillCls: "border-purple-300 bg-[linear-gradient(135deg,#faf5ff,#fef3c7)] text-purple-900",
    ringCls: "border-amber-400 bg-[linear-gradient(145deg,#f3e8ff,#fde68a)] ring-2 ring-purple-300/60",
    iconCls: "text-purple-800",
  },
};

const STATUS_WEIGHT = {
  CLAIMABLE: 0,
  LOCKED: 1,
  CLAIMED: 2,
};

function sortAchievements(items) {
  return [...items].sort((a, b) => {
    const wa = STATUS_WEIGHT[a.status] ?? 9;
    const wb = STATUS_WEIGHT[b.status] ?? 9;
    if (wa !== wb) return wa - wb;
    if (a.status === "LOCKED" && b.status === "LOCKED") {
      const pa = (Number(a.currentProgress) || 0) / Math.max(1, Number(a.targetValue) || 1);
      const pb = (Number(b.currentProgress) || 0) / Math.max(1, Number(b.targetValue) || 1);
      if (pb !== pa) return pb - pa;
    }
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });
}

function progressUnitFor(achievement, categoryMeta, t) {
  if (achievement?.code === "TEN_THOUSAND_POINTS_EARNED") return "JP";
  if (achievement?.code?.includes("STREAK")) return t("account.ach.unit.days");
  return categoryMeta?.unitKey ? t(categoryMeta.unitKey) : t("account.ach.unit.items");
}

function BadgeThumb({ achievement, tierMeta }) {
  const t = useT();
  const [failedSrc, setFailedSrc] = useState(null);
  const locked = achievement.status === "LOCKED";
  const src = achievement.badgeIcon;
  const showImage = Boolean(src) && failedSrc !== src;
  const TierIcon = achievement.tier === "LEGENDARY" ? Crown : Trophy;

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <div
        className={`relative grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border-2 p-0.5 transition sm:h-[72px] sm:w-[72px] ${
          locked ? "border-slate-200 bg-slate-100" : tierMeta.ringCls
        }`}
      >
        {showImage ? (
          <img
            src={src}
            alt={achievement.badgeName || achievement.name}
            onError={() => setFailedSrc(src)}
            className={`h-full w-full rounded-[12px] object-cover transition ${
              locked ? "grayscale opacity-65" : ""
            }`}
          />
        ) : (
          <TierIcon size={28} className={locked ? "text-slate-400" : tierMeta.iconCls} />
        )}
        {locked && (
          <span
            aria-hidden="true"
            className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-slate-800/80 text-white shadow-xs"
          >
            <Lock size={10} />
          </span>
        )}
      </div>
      <span
        className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${tierMeta.pillCls}`}
      >
        {t(tierMeta.labelKey)}
      </span>
    </div>
  );
}

function AchievementCard({ item, categoryMeta, claiming, onClaim }) {
  const { t, locale } = useI18n();
  const numLocale = INTL_LOCALE[locale];
  const tierMeta = TIER_META[item.tier] || TIER_META.BRONZE;
  const target = Math.max(1, Number(item.targetValue) || 1);
  const rawProgress = Number(item.currentProgress) || 0;
  const displayProgress = item.status === "LOCKED" ? Math.min(rawProgress, target) : target;
  const pct = Math.min(100, Math.round((displayProgress / target) * 100));
  const unit = progressUnitFor(item, categoryMeta, t);

  const isClaimable = item.status === "CLAIMABLE";
  const isClaimed = item.status === "CLAIMED";
  const isLocked = item.status === "LOCKED";

  return (
    <article
      className={`group relative flex flex-col gap-4 rounded-2xl border p-4 transition-all sm:flex-row sm:items-center sm:p-5 ${
        isClaimable
          ? "border-amber-300 bg-[linear-gradient(135deg,#fffbeb,#ffffff_65%)] shadow-[0_10px_30px_-14px_rgba(245,158,11,0.45)]"
          : isClaimed
            ? "border-emerald-200/80 bg-white/95"
            : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {isClaimable && (
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 flex h-2.5 w-2.5 sm:hidden"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600" />
        </span>
      )}

      {/* Huy hiệu & Cấp bậc */}
      <BadgeThumb achievement={item} tierMeta={tierMeta} />

      {/* Nội dung & Thanh tiến độ */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-extrabold text-slate-900">{item.name}</h3>
          {isClaimable && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
              {t("account.ach.readyToClaim")}
            </span>
          )}
        </div>

        <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>

        {/* Thanh tiến độ trực quan */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold">
            <span className={isClaimable ? "text-amber-800" : isClaimed ? "text-emerald-700" : "text-slate-500"}>
              {t("account.ach.progress")}{" "}
              <strong className="font-extrabold tabular-nums">
                {displayProgress.toLocaleString(numLocale)}/{target.toLocaleString(numLocale)}
              </strong>{" "}
              {unit}
            </span>
            <span className="tabular-nums text-slate-500">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isClaimable
                  ? "bg-[linear-gradient(90deg,#f59e0b,#fbbf24)]"
                  : isClaimed
                    ? "bg-emerald-500"
                    : "bg-teal-600"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Khu vực phần thưởng & Nút trạng thái */}
      <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:w-48 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
        <div className="min-w-0 text-left sm:text-right">
          <p className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-sm font-black tabular-nums text-amber-700">
            <Sparkles size={13} className="shrink-0 text-amber-500" />
            +{(item.pointsReward ?? 0).toLocaleString(numLocale)} JP
          </p>
          {item.badgeName && (
            <p className="mt-1 flex items-center gap-1 truncate text-[11px] font-semibold text-slate-500 sm:justify-end" title={item.badgeName}>
              <Award size={12} className="shrink-0 text-teal-700" />
              <span className="truncate max-w-[160px]">{item.badgeName}</span>
            </p>
          )}
        </div>

        {isClaimable && (
          <button
            type="button"
            disabled={claiming}
            onClick={() => onClaim(item)}
            className="relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(135deg,#f59e0b,#ea580c)] px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-amber-500/30 transition hover:scale-[1.03] hover:brightness-105 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {!claiming && (
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 animate-ping rounded-xl bg-amber-400/35"
              />
            )}
            {claiming ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t("account.ach.claiming")}
              </>
            ) : (
              <>
                <Gift size={14} />
                {t("account.ach.claimReward")}
              </>
            )}
          </button>
        )}

        {isClaimed && (
          <div className="text-right">
            <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
              <CheckCircle2 size={14} />
              {t("account.ach.claimed")}
            </span>
            {item.claimedAt && (
              <p className="mt-1 text-[10px] font-medium text-slate-400">
                {shortDate(item.claimedAt, locale)}
              </p>
            )}
          </div>
        )}

        {isLocked && (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
            <Lock size={12} />
            {displayProgress.toLocaleString(numLocale)}/{target.toLocaleString(numLocale)}
          </span>
        )}
      </div>
    </article>
  );
}

/**
 * Trang Thành tựu & Huy hiệu (/account/achievements) — lấy cảm hứng từ hệ thống Thành tựu Genshin Impact.
 */
export default function AchievementsScreen() {
  const { t, locale } = useI18n();
  const prefersReduced = useReducedMotion();
  const [achievements, setAchievements] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [claimError, setClaimError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].key);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [claimingId, setClaimingId] = useState(null);
  const [rewardModal, setRewardModal] = useState({ open: false, reward: null, achievement: null });

  const fetchAchievements = useCallback(async () => {
    const [items, sum] = await Promise.all([
      touristService.achievements({ page: 0, size: 100 }),
      touristService.achievementSummary().catch(() => null),
    ]);
    return { items, sum };
  }, []);

  const applyLoadedData = useCallback(({ items, sum }) => {
    setAchievements(items);
    setSummary(sum);
    setError("");
    const hasClaimableInDefault = items.some(
      (a) => a.category === CATEGORIES[0].key && a.status === "CLAIMABLE"
    );
    if (!hasClaimableInDefault) {
      const firstClaimable = items.find((a) => a.status === "CLAIMABLE");
      if (firstClaimable?.category && CATEGORY_MAP[firstClaimable.category]) {
        setSelectedCategory(firstClaimable.category);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchAchievements()
      .then((res) => {
        if (active) applyLoadedData(res);
      })
      .catch((err) => {
        if (active) setError(err?.message || translate(getLocale(), "account.ach.loadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchAchievements, applyLoadedData]);

  const handleRetry = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchAchievements();
      applyLoadedData(res);
    } catch (err) {
      setError(err?.message || translate(getLocale(), "account.ach.loadError"));
    } finally {
      setLoading(false);
    }
  }, [fetchAchievements, applyLoadedData]);

  // Tính thống kê tổng thể & theo từng danh mục
  const stats = useMemo(() => {
    const byCategory = Object.fromEntries(
      CATEGORIES.map((c) => [c.key, { total: 0, achieved: 0, claimable: 0, pct: 0 }])
    );

    let totalAchievedCalc = 0;
    let totalClaimableCalc = 0;
    let totalClaimedCalc = 0;
    let totalPointsCalc = 0;

    for (const item of achievements) {
      const catStat = byCategory[item.category];
      const isAchieved = item.status === "CLAIMABLE" || item.status === "CLAIMED";
      if (isAchieved) totalAchievedCalc += 1;
      if (item.status === "CLAIMABLE") totalClaimableCalc += 1;
      if (item.status === "CLAIMED") {
        totalClaimedCalc += 1;
        totalPointsCalc += Number(item.pointsReward) || 0;
      }
      if (catStat) {
        catStat.total += 1;
        if (isAchieved) catStat.achieved += 1;
        if (item.status === "CLAIMABLE") catStat.claimable += 1;
      }
    }

    for (const key of Object.keys(byCategory)) {
      const s = byCategory[key];
      s.pct = s.total > 0 ? Math.round((s.achieved / s.total) * 100) : 0;
    }

    const totalCount = achievements.length;
    const totalAchieved = summary?.totalAchieved ?? totalAchievedCalc;
    const unclaimedCount = summary?.unclaimedCount ?? totalClaimableCalc;
    const totalClaimed = summary?.totalClaimed ?? totalClaimedCalc;
    const totalPointsEarned = summary?.totalPointsEarned ?? totalPointsCalc;
    const overallPct = totalCount > 0 ? Math.round((totalAchieved / totalCount) * 100) : 0;

    return {
      byCategory,
      totalCount,
      totalAchieved,
      unclaimedCount,
      totalClaimed,
      totalPointsEarned,
      overallPct,
    };
  }, [achievements, summary]);

  const activeCategoryMeta = CATEGORY_MAP[selectedCategory] || CATEGORIES[0];
  const activeCategoryStat = stats.byCategory[selectedCategory] || { total: 0, achieved: 0, claimable: 0, pct: 0 };

  const visibleAchievements = useMemo(() => {
    const filtered = achievements.filter((item) => {
      if (item.category !== selectedCategory) return false;
      if (statusFilter === "UNLOCKED") {
        return item.status === "CLAIMABLE" || item.status === "CLAIMED";
      }
      if (statusFilter === "CLAIMABLE") {
        return item.status === "CLAIMABLE";
      }
      return true;
    });
    return sortAchievements(filtered);
  }, [achievements, selectedCategory, statusFilter]);

  async function handleClaim(achievement) {
    if (claimingId) return;
    setClaimError("");
    setClaimingId(achievement.id);
    try {
      const res = await touristService.claimAchievement(achievement.id);
      const awarded = Number(res?.pointsAwarded ?? achievement.pointsReward ?? 0);
      const claimedAt = res?.claimedAt || new Date().toISOString();

      setAchievements((prev) =>
        prev.map((a) =>
          a.id === achievement.id ? { ...a, status: "CLAIMED", claimedAt } : a
        )
      );

      setSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          unclaimedCount: Math.max(0, Number(prev.unclaimedCount || 0) - 1),
          totalClaimed: Number(prev.totalClaimed || 0) + 1,
          totalPointsEarned: Number(prev.totalPointsEarned || 0) + awarded,
        };
      });

      refreshAccountSummary().catch(() => {});
      setRewardModal({ open: true, reward: res, achievement });
    } catch (err) {
      setClaimError(err?.message || translate(getLocale(), "account.ach.claimError"));
    } finally {
      setClaimingId(null);
    }
  }

  const filterPills = [
    { key: "ALL", label: t("common.all"), count: stats.totalCount },
    { key: "UNLOCKED", label: t("account.ach.filterUnlocked"), count: stats.totalAchieved },
    { key: "CLAIMABLE", label: t("account.ach.filterClaimable"), count: stats.unclaimedCount, dot: stats.unclaimedCount > 0 },
  ];

  return (
    <AccountLayout title={t("account.achievements")} wide>
      <ClaimRewardModal
        open={rewardModal.open}
        reward={rewardModal.reward}
        achievement={rewardModal.achievement}
        onClose={() => setRewardModal({ open: false, reward: null, achievement: null })}
      />

      {loading ? (
        <div className="space-y-5" aria-busy="true">
          <div className="jg-shimmer h-40 rounded-3xl" />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[270px_minmax(0,1fr)]">
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="jg-shimmer h-20 rounded-2xl" />
              ))}
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="jg-shimmer h-28 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertCircle size={32} className="mx-auto text-rose-600" />
          <p className="mt-2 text-sm font-bold text-rose-900">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
          >
            <RefreshCw size={14} /> {t("account.ach.retry")}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* 1. Thanh Header / Thống kê phong cách Genshin Impact */}
          <section
            aria-label={t("account.ach.statsAria")}
            className="relative overflow-hidden rounded-3xl border border-teal-800/40 bg-[linear-gradient(140deg,#093b37,#0d5c55,#134e4a)] p-5 text-white shadow-lg sm:p-6"
          >
            <BronzeDrumMotif
              className="pointer-events-none absolute -right-12 -top-14 h-64 w-64 text-amber-300/10"
            />
            <div className="relative z-10 flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Tổng thành tựu đã đạt */}
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-teal-100/85">
                    <span className="flex items-center gap-1.5">
                      <Trophy size={14} className="text-amber-300" />
                      {t("account.ach.achievedTitle")}
                    </span>
                    <span className="tabular-nums font-bold text-amber-200">{stats.overallPct}%</span>
                  </div>
                  <p className="mt-1.5 text-2xl font-black tabular-nums sm:text-3xl">
                    {stats.totalAchieved}
                    <span className="text-base font-bold text-teal-100/75">/{stats.totalCount}</span>
                  </p>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-black/25">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#fcd34d,#f59e0b)] transition-all duration-500"
                      style={{ width: `${stats.overallPct}%` }}
                    />
                  </div>
                </div>

                {/* Tổng Journey Points đã nhận */}
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xs">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-teal-100/85">
                    <Sparkles size={14} className="text-amber-300" />
                    {t("account.ach.pointsFromAch")}
                  </p>
                  <p className="mt-1.5 text-2xl font-black tabular-nums text-amber-300 sm:text-3xl">
                    +{stats.totalPointsEarned.toLocaleString(INTL_LOCALE[locale])}
                    <span className="ml-1 text-sm font-bold text-amber-200/90">JP</span>
                  </p>
                  <p className="mt-2 text-xs text-teal-100/75">
                    {t("account.ach.claimedBadgesCount", { count: stats.totalClaimed })}
                  </p>
                </div>

                {/* Chờ nhận thưởng */}
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xs">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-teal-100/85">
                    <Gift size={14} className="text-amber-300" />
                    {t("account.ach.pendingRewards")}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <p className="text-2xl font-black tabular-nums sm:text-3xl">{stats.unclaimedCount}</p>
                    {stats.unclaimedCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/90 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                        {t("account.ach.pendingBadge")}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-teal-100/75">{t("account.ach.allClaimed")}</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-teal-100/75">
                    {t("account.ach.completeToUnlock")}
                  </p>
                </div>
              </div>

              {/* Bộ lọc nhanh theo trạng thái */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3.5">
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("account.ach.filterByStatusAria")}>
                  {filterPills.map((pill) => {
                    const active = statusFilter === pill.key;
                    return (
                      <button
                        key={pill.key}
                        type="button"
                        onClick={() => setStatusFilter(pill.key)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                          active
                            ? "bg-amber-400 text-slate-950 shadow-sm"
                            : "bg-white/10 text-teal-50 hover:bg-white/20"
                        }`}
                      >
                        {pill.dot && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white/80" />
                        )}
                        <span>{pill.label}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                            active ? "bg-slate-950/15 text-slate-950" : "bg-black/20 text-teal-100"
                          }`}
                        >
                          {pill.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-teal-100/80">
                  {t("account.ach.selectCategoryHint")}
                </p>
              </div>
            </div>
          </section>

          {claimError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800"
            >
              <span className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                {claimError}
              </span>
              <button
                type="button"
                onClick={() => setClaimError("")}
                className="text-xs font-bold text-rose-700 underline cursor-pointer"
              >
                {t("common.close")}
              </button>
            </div>
          )}

          {/* 2. Bố cục 2 cột Master - Detail */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[270px_minmax(0,1fr)] lg:items-start">
            {/* Cột trái (Master): Danh sách 5 danh mục */}
            <aside aria-label={t("account.ach.categoriesAria")}>
              {/* Mobile horizontal strip */}
              <div className="flex gap-2.5 overflow-x-auto pb-1 lg:hidden">
                {CATEGORIES.map((cat) => {
                  const st = stats.byCategory[cat.key];
                  const active = selectedCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`relative flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-left transition cursor-pointer ${
                        active
                          ? "border-amber-400 bg-[linear-gradient(135deg,#0b5d56,#0f766e)] text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <cat.Icon size={16} className={active ? "text-amber-300" : "text-teal-700"} />
                      <div>
                        <p className="whitespace-nowrap text-xs font-extrabold">{t(cat.shortLabelKey)}</p>
                        <p className={`text-[11px] tabular-nums ${active ? "text-teal-100" : "text-slate-400"}`}>
                          {st.achieved}/{st.total} ({st.pct}%)
                        </p>
                      </div>
                      {st.claimable > 0 && (
                        <span
                          aria-label={t("account.ach.claimableShortAria", { count: st.claimable })}
                          className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white"
                        >
                          {st.claimable}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Desktop vertical category list */}
              <div className="hidden space-y-2.5 lg:block">
                {CATEGORIES.map((cat) => {
                  const st = stats.byCategory[cat.key];
                  const active = selectedCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedCategory(cat.key)}
                      aria-current={active ? "true" : undefined}
                      className={`group relative w-full rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                        active
                          ? "border-amber-400/90 bg-[linear-gradient(135deg,#0b5d56,#0f766e)] text-white shadow-md shadow-teal-900/15"
                          : "border-slate-200 bg-white text-slate-800 hover:border-teal-300 hover:bg-teal-50/40"
                      }`}
                    >
                      {/* Red dot badge nếu có thành tựu CLAIMABLE */}
                      {st.claimable > 0 && (
                        <span
                          aria-label={t("account.unclaimed", { count: st.claimable })}
                          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          {st.claimable}
                        </span>
                      )}

                      <div className="flex items-start gap-3">
                        <span
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${
                            active
                              ? "bg-white/15 text-amber-300 ring-1 ring-amber-300/40"
                              : "bg-teal-50 text-teal-700 group-hover:bg-teal-100"
                          }`}
                        >
                          <cat.Icon size={19} />
                        </span>
                        <div className="min-w-0 flex-1 pr-6">
                          <p className="truncate text-sm font-extrabold">{t(cat.labelKey)}</p>
                          <p
                            className={`mt-0.5 text-xs tabular-nums ${
                              active ? "text-teal-100/90" : "text-slate-500"
                            }`}
                          >
                            {t("account.ach.categoryCountPct", { achieved: st.achieved, total: st.total, pct: st.pct })}
                          </p>
                        </div>
                      </div>

                      {/* Thanh tiến độ % của danh mục */}
                      <div className="mt-3 flex items-center gap-2">
                        <div
                          className={`h-1.5 flex-1 overflow-hidden rounded-full ${
                            active ? "bg-black/25" : "bg-slate-100"
                          }`}
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              active
                                ? "bg-[linear-gradient(90deg,#fcd34d,#f59e0b)]"
                                : "bg-teal-600"
                            }`}
                            style={{ width: `${st.pct}%` }}
                          />
                        </div>
                        <ChevronRight
                          size={14}
                          className={`shrink-0 transition-transform ${
                            active ? "translate-x-0.5 text-amber-300" : "text-slate-300 group-hover:text-teal-600"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Cột phải (Detail): Danh sách thẻ thành tựu của danh mục được chọn */}
            <section aria-label={t(activeCategoryMeta.labelKey)} className="min-w-0 space-y-3.5">
              {/* Tiêu đề danh mục */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                    <activeCategoryMeta.Icon size={20} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-extrabold text-slate-900">
                      {t(activeCategoryMeta.labelKey)}
                    </h2>
                    <p className="truncate text-xs text-slate-500">{t(activeCategoryMeta.descriptionKey)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold tabular-nums text-slate-700">
                    {t("account.ach.categoryDonePct", {
                      achieved: activeCategoryStat.achieved,
                      total: activeCategoryStat.total,
                      pct: activeCategoryStat.pct,
                    })}
                  </span>
                </div>
              </div>

              {/* Danh sách thẻ */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${selectedCategory}-${statusFilter}`}
                  initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReduced ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: prefersReduced ? 0 : 0.18 }}
                  className="space-y-3"
                >
                  {visibleAchievements.length > 0 ? (
                    visibleAchievements.map((item) => (
                      <AchievementCard
                        key={item.id}
                        item={item}
                        categoryMeta={activeCategoryMeta}
                        claiming={claimingId === item.id}
                        onClaim={handleClaim}
                      />
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                      <Trophy size={32} className="mx-auto text-slate-300" />
                      <p className="mt-2 text-sm font-bold text-slate-700">
                        {t("account.ach.emptyTitle")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t("account.ach.emptyDesc")}
                      </p>
                      {statusFilter !== "ALL" && (
                        <button
                          type="button"
                          onClick={() => setStatusFilter("ALL")}
                          className="mt-4 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800 cursor-pointer"
                        >
                          {t("account.ach.showAllInCategory")}
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </section>
          </div>
        </div>
      )}
    </AccountLayout>
  );
}
