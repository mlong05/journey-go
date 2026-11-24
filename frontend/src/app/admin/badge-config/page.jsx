"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  CircleSlash,
  Filter,
  Loader2,
  Medal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Trophy,
  X,
} from "lucide-react";
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_TIERS,
  AchievementFormModal,
  BADGE_TYPE_LABEL,
  BadgeEditModal,
  BadgeThumbnail,
  deactivateAdminAchievement,
  getAdminBadges,
  listAdminAchievements,
  updateAdminAchievement,
  updateBadge,
} from "@/features/gamification";
import PaginationBar from "@/components/ui/PaginationBar";
import { PAGE_SIZE } from "@/lib/pagination";

const TABS = [
  { id: "achievements", label: "Thành tựu", Icon: Trophy },
  { id: "badges", label: "Kho huy hiệu", Icon: Medal },
];

const ACTIVE_FILTER_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "true", label: "Đang hoạt động" },
  { value: "false", label: "Đã tắt" },
];

function fmt(n) {
  return n == null ? "0" : Number(n).toLocaleString("vi-VN");
}

function ActiveBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
      <CheckCircle2 size={10} />
      Hoạt động
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
      <CircleSlash size={10} />
      Tắt
    </span>
  );
}

function CategoryBadge({ category }) {
  const meta = ACHIEVEMENT_CATEGORIES[category] ?? {
    shortLabel: category,
    badgeCls: "border-slate-200 bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badgeCls}`}
    >
      {meta.shortLabel}
    </span>
  );
}

function TierBadge({ tier }) {
  const meta = ACHIEVEMENT_TIERS[tier] ?? {
    label: tier,
    badgeCls: "border-slate-200 bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badgeCls}`}
    >
      {meta.label}
    </span>
  );
}

export default function AdminBadgeConfigPage() {
  const [tab, setTab] = useState("achievements");
  const [achievements, setAchievements] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingKey, setTogglingKey] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [badgeTypeFilter, setBadgeTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(0);

  const [achievementModal, setAchievementModal] = useState(null);
  const [badgeModal, setBadgeModal] = useState(null);
  const [toast, setToast] = useState({ msg: "", type: "success" });
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast({ msg: "", type: "success" });
    }, 4000);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [achPage, badgeList] = await Promise.all([
        listAdminAchievements({ page: 0, size: 200 }),
        getAdminBadges(),
      ]);
      const achItems = Array.isArray(achPage?.content)
        ? achPage.content
        : Array.isArray(achPage)
          ? achPage
          : [];
      setAchievements(achItems);
      setBadges(Array.isArray(badgeList) ? badgeList : []);
    } catch (err) {
      setError(err?.message || "Không thể tải dữ liệu thành tựu và huy hiệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, [loadData]);

  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    setPage(0);
  };

  const handleToggleAchievement = async (item) => {
    const key = `ach-${item.id}`;
    setTogglingKey(key);
    try {
      if (item.active) {
        await deactivateAdminAchievement(item.id);
        showToast(`Đã tạm tắt thành tựu "${item.name}".`, "success");
      } else {
        await updateAdminAchievement(item.id, {
          code: item.code,
          name: item.name,
          description: item.description,
          category: item.category,
          tier: item.tier,
          targetValue: item.targetValue,
          pointsReward: item.pointsReward,
          badgeName: item.badgeName ?? null,
          badgeIcon: item.badgeIcon ?? null,
          badgeId: item.badgeId ?? null,
          active: true,
        });
        showToast(`Đã kích hoạt lại thành tựu "${item.name}".`, "success");
      }
      await loadData();
    } catch (err) {
      showToast(err?.message || "Không thể cập nhật trạng thái thành tựu.", "error");
    } finally {
      setTogglingKey(null);
    }
  };

  const handleToggleBadge = async (badge) => {
    const key = `badge-${badge.id}`;
    setTogglingKey(key);
    try {
      await updateBadge(badge.id, {
        name: badge.name,
        description: badge.description ?? "",
        iconUrl: badge.iconUrl ?? "",
        bonusPoints: badge.bonusPoints ?? 0,
        active: !badge.active,
      });
      showToast(
        badge.active
          ? `Đã tắt huy hiệu "${badge.name}".`
          : `Đã kích hoạt huy hiệu "${badge.name}".`,
        "success",
      );
      await loadData();
    } catch (err) {
      showToast(err?.message || "Không thể cập nhật trạng thái huy hiệu.", "error");
    } finally {
      setTogglingKey(null);
    }
  };

  const filteredAchievements = useMemo(() => {
    const q = search.trim().toLowerCase();
    return achievements.filter((a) => {
      if (categoryFilter && a.category !== categoryFilter) return false;
      if (tierFilter && a.tier !== tierFilter) return false;
      if (activeFilter !== "" && String(Boolean(a.active)) !== activeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        a.code?.toLowerCase().includes(q) ||
        a.name?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.badgeName?.toLowerCase().includes(q)
      );
    });
  }, [achievements, search, categoryFilter, tierFilter, activeFilter]);

  const filteredBadges = useMemo(() => {
    const q = search.trim().toLowerCase();
    return badges.filter((b) => {
      if (badgeTypeFilter && b.badgeType !== badgeTypeFilter) return false;
      if (activeFilter !== "" && String(Boolean(b.active)) !== activeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        b.code?.toLowerCase().includes(q) ||
        b.name?.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q)
      );
    });
  }, [badges, search, badgeTypeFilter, activeFilter]);

  const activeList = tab === "achievements" ? filteredAchievements : filteredBadges;
  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedItems = activeList.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const summaryCards = useMemo(() => {
    if (tab === "achievements") {
      const activeCount = achievements.filter((a) => a.active).length;
      const totalAchieved = achievements.reduce(
        (sum, a) => sum + (Number(a.achievedCount) || 0),
        0,
      );
      const totalClaimed = achievements.reduce(
        (sum, a) => sum + (Number(a.claimedCount) || 0),
        0,
      );
      return [
        { label: "Tổng thành tựu", value: fmt(achievements.length), color: "text-sky-600" },
        { label: "Đang hoạt động", value: fmt(activeCount), color: "text-emerald-600" },
        { label: "Chờ nhận thưởng", value: fmt(totalAchieved), color: "text-amber-600" },
        { label: "Đã nhận thưởng", value: fmt(totalClaimed), color: "text-violet-600" },
      ];
    }

    const activeCount = badges.filter((b) => b.active).length;
    const checkinCount = badges.filter((b) => b.badgeType === "DESTINATION_CHECKIN").length;
    const totalEarned = badges.reduce(
      (sum, b) => sum + (Number(b.earnedCount) || 0),
      0,
    );
    return [
      { label: "Tổng huy hiệu", value: fmt(badges.length), color: "text-sky-600" },
      { label: "Đang hoạt động", value: fmt(activeCount), color: "text-emerald-600" },
      { label: "Huy hiệu điểm đến", value: fmt(checkinCount), color: "text-amber-600" },
      { label: "Tổng lượt đạt", value: fmt(totalEarned), color: "text-violet-600" },
    ];
  }, [tab, achievements, badges]);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      {/* ── Header + Tabs + KPI ── */}
      <div className="shrink-0 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
              Cấu hình Thành tựu &amp; Huy hiệu
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Quản lý các mốc thành tựu, điểm thưởng cho du khách và kho huy hiệu di sản toàn hệ thống.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Chuyển giữa Thành tựu và Kho huy hiệu"
              className="flex w-fit gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"
            >
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => handleTabChange(id)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tab === id
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-white"
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={loadData}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Làm mới
            </button>

            {tab === "achievements" && (
              <button
                type="button"
                onClick={() => setAchievementModal({ mode: "create" })}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-700"
              >
                <Plus size={14} />
                Tạo thành tựu
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
            >
              <p className="text-[11px] font-medium text-slate-400">{card.label}</p>
              <p className={`mt-0.5 text-sm font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Thanh tìm kiếm & lọc ── */}
      <div className="shrink-0 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={
              tab === "achievements"
                ? "Tìm mã, tên thành tựu, huy hiệu..."
                : "Tìm mã, tên huy hiệu..."
            }
            className="w-64 rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-8 text-xs font-medium outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(0);
              }}
              aria-label="Xóa tìm kiếm"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {tab === "achievements" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={13} className="text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400"
            >
              <option value="">Tất cả danh mục</option>
              {Object.entries(ACHIEVEMENT_CATEGORIES).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>

            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPage(0);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400"
            >
              <option value="">Tất cả cấp bậc</option>
              {Object.entries(ACHIEVEMENT_TIERS).map(([key, meta]) => (
                <option key={key} value={key}>
                  Cấp {meta.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-400" />
            <select
              value={badgeTypeFilter}
              onChange={(e) => {
                setBadgeTypeFilter(e.target.value);
                setPage(0);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400"
            >
              <option value="">Tất cả phân loại</option>
              {Object.entries(BADGE_TYPE_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {ACTIVE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setActiveFilter(opt.value);
                setPage(0);
              }}
              className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                activeFilter === opt.value
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bảng danh sách cuộn nội bộ ── */}
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
        {error && (
          <div className="m-4 flex shrink-0 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            <AlertTriangle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
          {loading ? (
            <div className="flex h-full min-h-[280px] items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={20} className="animate-spin" />
              Đang tải dữ liệu...
            </div>
          ) : pagedItems.length === 0 ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-slate-500">
              <Award size={36} className="text-slate-200" />
              <p className="text-sm font-bold text-slate-600">
                {tab === "achievements"
                  ? "Không có thành tựu nào phù hợp"
                  : "Không có huy hiệu nào phù hợp"}
              </p>
              <p className="text-xs text-slate-400">
                Thử đổi bộ lọc hoặc bấm &ldquo;Tạo thành tựu&rdquo; để thêm mới.
              </p>
            </div>
          ) : tab === "achievements" ? (
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Thành tựu &amp; Huy hiệu</th>
                  <th className="px-4 py-3 text-left font-semibold">Danh mục</th>
                  <th className="px-4 py-3 text-left font-semibold">Cấp bậc</th>
                  <th className="px-4 py-3 text-left font-semibold">Mục tiêu</th>
                  <th className="px-4 py-3 text-left font-semibold">Điểm thưởng</th>
                  <th className="px-4 py-3 text-left font-semibold">Tiến độ du khách</th>
                  <th className="px-4 py-3 text-left font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedItems.map((a) => {
                  const unit = ACHIEVEMENT_CATEGORIES[a.category]?.unit || "mốc";
                  const busy = togglingKey === `ach-${a.id}`;
                  return (
                    <tr key={a.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <BadgeThumbnail
                            key={a.badgeIcon || a.id}
                            src={a.badgeIcon}
                            alt={a.badgeName || a.name}
                            className="h-10 w-10 rounded-xl"
                          />
                          <div className="min-w-0 max-w-[300px]">
                            <span className="mb-1 inline-block rounded bg-sky-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-sky-700">
                              {a.code}
                            </span>
                            <p className="truncate text-sm font-semibold text-slate-900" title={a.name}>
                              {a.name}
                            </p>
                            <p className="line-clamp-1 text-xs text-slate-400" title={a.description}>
                              {a.description}
                            </p>
                            {a.badgeName && (
                              <p className="mt-0.5 truncate text-[11px] font-medium text-amber-700">
                                Huy hiệu: {a.badgeName}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <CategoryBadge category={a.category} />
                      </td>
                      <td className="px-4 py-3">
                        <TierBadge tier={a.tier} />
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700 tabular-nums">
                        {fmt(a.targetValue)} {unit}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-amber-700 tabular-nums">
                        +{fmt(a.pointsReward)} JP
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">
                        <span className="font-semibold text-amber-600">{fmt(a.achievedCount)}</span> chờ nhận
                        <span className="mx-1 text-slate-300">·</span>
                        <span className="font-semibold text-emerald-700">{fmt(a.claimedCount)}</span> đã nhận
                      </td>
                      <td className="px-4 py-3">
                        <ActiveBadge active={a.active} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleToggleAchievement(a)}
                            title={a.active ? "Tắt thành tựu" : "Kích hoạt thành tựu"}
                            className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
                              a.active
                                ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            }`}
                          >
                            {busy ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : a.active ? (
                              <ToggleRight size={15} />
                            ) : (
                              <ToggleLeft size={15} />
                            )}
                            <span>{a.active ? "Tắt" : "Bật"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setAchievementModal({ mode: "edit", data: a })}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                          >
                            <Pencil size={13} />
                            <span>Sửa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[920px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Huy hiệu</th>
                  <th className="px-4 py-3 text-left font-semibold">Phân loại</th>
                  <th className="px-4 py-3 text-left font-semibold">Điểm thưởng kèm</th>
                  <th className="px-4 py-3 text-left font-semibold">Lượt du khách đạt</th>
                  <th className="px-4 py-3 text-left font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedItems.map((b) => {
                  const busy = togglingKey === `badge-${b.id}`;
                  return (
                    <tr key={b.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <BadgeThumbnail
                            key={b.iconUrl || b.id}
                            src={b.iconUrl}
                            alt={b.name}
                            className="h-10 w-10 rounded-xl"
                            FallbackIcon={Medal}
                          />
                          <div className="min-w-0 max-w-[340px]">
                            <span className="mb-1 inline-block rounded bg-sky-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-sky-700">
                              {b.code}
                            </span>
                            <p className="truncate text-sm font-semibold text-slate-900" title={b.name}>
                              {b.name}
                            </p>
                            {b.description && (
                              <p className="line-clamp-1 text-xs text-slate-400" title={b.description}>
                                {b.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                          {BADGE_TYPE_LABEL[b.badgeType] || b.badgeType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-amber-700 tabular-nums">
                        +{fmt(b.bonusPoints)} JP
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700 tabular-nums">
                        {fmt(b.earnedCount)} lượt
                      </td>
                      <td className="px-4 py-3">
                        <ActiveBadge active={b.active} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleToggleBadge(b)}
                            title={b.active ? "Tắt huy hiệu" : "Kích hoạt huy hiệu"}
                            className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
                              b.active
                                ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            }`}
                          >
                            {busy ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : b.active ? (
                              <ToggleRight size={15} />
                            ) : (
                              <ToggleLeft size={15} />
                            )}
                            <span>{b.active ? "Tắt" : "Bật"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setBadgeModal(b)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                          >
                            <Pencil size={13} />
                            <span>Sửa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && activeList.length > 0 && (
          <div className="shrink-0">
            <PaginationBar
              page={safePage}
              totalPages={totalPages}
              totalElements={activeList.length}
              unit={tab === "achievements" ? "thành tựu" : "huy hiệu"}
              onChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* ── Toast notification ── */}
      {toast.msg && (
        <div
          className={`fixed bottom-6 right-6 z-[400] max-w-sm rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Modals ── */}
      {achievementModal && (
        <AchievementFormModal
          key={
            achievementModal.mode === "edit"
              ? `edit-${achievementModal.data?.id}`
              : "create"
          }
          mode={achievementModal.mode}
          initialData={achievementModal.data}
          badges={badges}
          onClose={() => setAchievementModal(null)}
          onSaved={async () => {
            setAchievementModal(null);
            await loadData();
          }}
          showToast={showToast}
        />
      )}

      {badgeModal && (
        <BadgeEditModal
          key={`badge-${badgeModal.id}`}
          badge={badgeModal}
          onClose={() => setBadgeModal(null)}
          onSaved={async () => {
            setBadgeModal(null);
            await loadData();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
