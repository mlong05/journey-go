"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2, Sparkles, Ticket, Smartphone, TrendingUp, TrendingDown, Award,
  CheckCircle2, AlertTriangle, Trophy, ArrowRight, History, ChevronLeft, ChevronRight,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import AccountLayout from "./AccountLayout";
import { touristService } from "../services/touristService";
import { dateTime, longDate, vnd } from "../utils";
import { useI18n, translate, getLocale, INTL_LOCALE } from "@/i18n";

const VOUCHER_STATUS = {
  AVAILABLE: { labelKey: "account.rewards.voucherStatus.AVAILABLE", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  USED: { labelKey: "account.rewards.voucherStatus.USED", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  EXPIRED: { labelKey: "account.rewards.voucherStatus.EXPIRED", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

const VOUCHER_PAGE_SIZE = 6;
const BADGE_PAGE_SIZE = 9;
const HISTORY_PAGE_SIZE = 10;

const discountLabel = (v, t) => (v.discountType === "PERCENTAGE"
  ? t("account.rewards.discountPercent", { value: Number(v.discountValue) })
  : t("account.rewards.discountAmount", { amount: vnd(v.discountValue) }));

function Pager({ page, totalPages, onChange, t }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
      >
        <ChevronLeft size={14} />{t("account.rewards.prevPage")}
      </button>
      <span className="text-xs font-semibold tabular-nums text-slate-500">
        {t("account.rewards.pageInfo", { page, total: totalPages })}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
      >
        {t("account.rewards.nextPage")}<ChevronRight size={14} />
      </button>
    </div>
  );
}

/**
 * Trang /account/rewards — số dư điểm, tách 3 tab (Voucher · Huy hiệu · Lịch sử điểm)
 * kèm bộ lọc & phân trang gọn để không bị kéo dài xuống dưới.
 */
export default function RewardsScreen() {
  const { t, locale } = useI18n();
  const numLocale = INTL_LOCALE[locale];
  const [data, setData] = useState({
    loading: true, points: null, history: [], mine: [], shop: [], badges: [], myBadges: [],
  });
  const [redeeming, setRedeeming] = useState(null);
  const [notice, setNotice] = useState({ ok: "", err: "" });

  const [tab, setTab] = useState("vouchers"); // "vouchers" | "badges" | "history"
  const [voucherFilter, setVoucherFilter] = useState("ALL"); // ALL | AVAILABLE | USED | EXPIRED
  const [minePage, setMinePage] = useState(1);
  const [shopPage, setShopPage] = useState(1);
  const [badgeFilter, setBadgeFilter] = useState("ALL"); // ALL | EARNED | UNEARNED
  const [badgePage, setBadgePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const load = useCallback(() => {
    Promise.all([
      touristService.myPoints().catch(() => null),
      touristService.pointHistory().catch(() => []),
      touristService.myVouchers().catch(() => []),
      touristService.vouchers().catch(() => []),
      touristService.allBadges().catch(() => []),
      touristService.myBadges().catch(() => []),
    ]).then(([points, history, mine, shop, badges, myBadges]) => {
      setData({ loading: false, points, history, mine, shop, badges, myBadges });
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const { loading, points, history, mine, shop, badges, myBadges } = data;
  const balance = Number(points?.currentBalance ?? 0);

  // Gộp huy hiệu đã nhận & danh mục huy hiệu thành 1 danh sách duy nhất (ưu tiên hiển thị đã nhận trước)
  const mergedBadges = useMemo(() => {
    const earnedByCode = new Map(myBadges.map((b) => [b.badgeCode, b]));
    const list = badges.map((b) => {
      const earned = earnedByCode.get(b.code);
      return {
        id: b.id,
        code: b.code,
        name: earned?.badgeName || b.name,
        description: earned?.badgeDescription || b.description,
        iconUrl: earned?.badgeIconUrl || b.iconUrl,
        bonusPoints: b.bonusPoints || 0,
        earned: Boolean(earned),
        earnedAt: earned?.earnedAt || null,
      };
    });
    // Thêm huy hiệu đã nhận nhưng không còn trong danh mục hiện hành (nếu có)
    const knownCodes = new Set(badges.map((b) => b.code));
    for (const mb of myBadges) {
      if (!knownCodes.has(mb.badgeCode)) {
        list.push({
          id: `mine-${mb.id}`,
          code: mb.badgeCode,
          name: mb.badgeName,
          description: mb.badgeDescription,
          iconUrl: mb.badgeIconUrl,
          bonusPoints: 0,
          earned: true,
          earnedAt: mb.earnedAt,
        });
      }
    }
    return list.sort((a, b) => Number(b.earned) - Number(a.earned));
  }, [badges, myBadges]);

  const filteredMine = useMemo(
    () => (voucherFilter === "ALL" ? mine : mine.filter((v) => v.status === voucherFilter)),
    [mine, voucherFilter],
  );
  const mineTotalPages = Math.max(1, Math.ceil(filteredMine.length / VOUCHER_PAGE_SIZE));
  const safeMinePage = Math.min(minePage, mineTotalPages);
  const visibleMine = filteredMine.slice((safeMinePage - 1) * VOUCHER_PAGE_SIZE, safeMinePage * VOUCHER_PAGE_SIZE);

  const shopTotalPages = Math.max(1, Math.ceil(shop.length / VOUCHER_PAGE_SIZE));
  const safeShopPage = Math.min(shopPage, shopTotalPages);
  const visibleShop = shop.slice((safeShopPage - 1) * VOUCHER_PAGE_SIZE, safeShopPage * VOUCHER_PAGE_SIZE);

  const filteredBadges = useMemo(() => {
    if (badgeFilter === "EARNED") return mergedBadges.filter((b) => b.earned);
    if (badgeFilter === "UNEARNED") return mergedBadges.filter((b) => !b.earned);
    return mergedBadges;
  }, [mergedBadges, badgeFilter]);
  const badgeTotalPages = Math.max(1, Math.ceil(filteredBadges.length / BADGE_PAGE_SIZE));
  const safeBadgePage = Math.min(badgePage, badgeTotalPages);
  const visibleBadges = filteredBadges.slice((safeBadgePage - 1) * BADGE_PAGE_SIZE, safeBadgePage * BADGE_PAGE_SIZE);

  const historyTotalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const safeHistoryPage = Math.min(historyPage, historyTotalPages);
  const visibleHistory = history.slice((safeHistoryPage - 1) * HISTORY_PAGE_SIZE, safeHistoryPage * HISTORY_PAGE_SIZE);

  const redeem = async (voucher) => {
    setRedeeming(voucher.id); setNotice({ ok: "", err: "" });
    try {
      const res = await touristService.redeemVoucher(voucher.id);
      const loc = getLocale();
      setNotice({
        ok: translate(loc, "account.rewards.redeemSuccess", {
          title: voucher.title,
          code: res?.userVoucherCode || translate(loc, "account.rewards.viewInWallet"),
        }),
        err: "",
      });
      load();
    } catch (err) {
      setNotice({ ok: "", err: err?.message || translate(getLocale(), "account.rewards.redeemError") });
    } finally {
      setRedeeming(null);
    }
  };

  const TABS = [
    { key: "vouchers", label: t("account.rewards.tabVouchers"), count: mine.length + shop.length, Icon: Ticket },
    { key: "badges", label: t("account.rewards.tabBadges"), count: `${myBadges.length}/${mergedBadges.length}`, Icon: Award },
    { key: "history", label: t("account.rewards.tabHistory"), count: history.length, Icon: History },
  ];

  return (
    <AccountLayout title={t("nav.rewards")}>
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-busy="true">
          <div className="jg-shimmer h-28 rounded-3xl" />
          <div className="jg-shimmer h-28 rounded-3xl" />
          <div className="jg-shimmer h-28 rounded-3xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── 3 thẻ thống kê điểm ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-[linear-gradient(150deg,#0b5d56,#0f766e)] p-5 text-white sm:col-span-1">
              <p className="flex items-center gap-1.5 text-sm text-teal-50/85"><Sparkles size={15} />{t("account.rewards.availablePoints")}</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums">{balance.toLocaleString(numLocale)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">{t("account.rewards.lifetimeEarned")}</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{(points?.lifetimeEarned ?? 0).toLocaleString(numLocale)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">{t("account.rewards.lifetimeSpent")}</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{(points?.lifetimeSpent ?? 0).toLocaleString(numLocale)}</p>
            </div>
          </div>

          {/* ── Banner thành tựu + gợi ý app ── */}
          <Link
            href={ROUTES.ACCOUNT_ACHIEVEMENTS}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,#fffbeb,#fef3c7)] p-4 text-amber-950 transition hover:border-amber-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-sm">
                <Trophy size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-amber-950">{t("account.rewards.achievementsBannerTitle")}</p>
                <p className="truncate text-xs text-amber-800/85">{t("account.rewards.achievementsBannerDesc")}</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-xs transition group-hover:bg-white">
              {t("account.rewards.openNow")} <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          <p className="flex items-start gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-xs sm:text-sm text-teal-900">
            <Smartphone size={16} className="mt-0.5 shrink-0" />
            {t("account.rewards.appTip")}
          </p>

          {notice.ok && (
            <p role="status" className="flex items-start gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />{notice.ok}
            </p>
          )}
          {notice.err && (
            <p role="alert" className="flex items-start gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />{notice.err}
            </p>
          )}

          {/* ── Thanh 3 tab con ── */}
          <div role="tablist" className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
            {TABS.map(({ key, label, count, Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(key)}
                  className={`flex flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition cursor-pointer ${
                    active ? "bg-white text-teal-800 shadow-xs ring-1 ring-slate-200/80" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                    active ? "bg-teal-50 text-teal-700" : "bg-slate-200/70 text-slate-600"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Tab 1: Voucher của tôi & Đổi voucher ── */}
          {tab === "vouchers" && (
            <div className="space-y-4">
              <section className="rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="my-vouchers">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 id="my-vouchers" className="flex items-center gap-2 font-extrabold text-slate-900">
                    <Ticket size={17} className="text-teal-700" />{t("account.rewards.myVouchersHeading", { count: mine.length })}
                  </h2>
                  {mine.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {["ALL", "AVAILABLE", "USED", "EXPIRED"].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => { setVoucherFilter(st); setMinePage(1); }}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                            voucherFilter === st ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {st === "ALL" ? t("common.all") : t(VOUCHER_STATUS[st].labelKey)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {visibleMine.length ? (
                  <>
                    <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {visibleMine.map((v) => {
                        const st = VOUCHER_STATUS[v.status] || VOUCHER_STATUS.EXPIRED;
                        return (
                          <li key={v.id} className="min-w-0 rounded-2xl border border-dashed border-slate-300 p-3.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className="min-w-0 font-bold text-slate-900">{v.voucherTitle}</p>
                              <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{t(st.labelKey)}</span>
                            </div>
                            <p className="mt-1 break-all font-mono text-sm text-teal-800">{v.userVoucherCode}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {v.expiryDate ? t("account.rewards.expiryDate", { date: longDate(v.expiryDate.slice(0, 10), locale) }) : ""}
                              {v.pointsSpent ? ` · ${t("account.rewards.redeemedWithPoints", { count: v.pointsSpent })}` : ""}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                    <Pager page={safeMinePage} totalPages={mineTotalPages} onChange={setMinePage} t={t} />
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    {mine.length ? t("account.rewards.vouchersEmptyFilter") : t("account.rewards.myVouchersEmpty")}
                  </p>
                )}
              </section>

              {shop.length > 0 && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="shop-vouchers">
                  <h2 id="shop-vouchers" className="font-extrabold text-slate-900">{t("account.rewards.redeemHeading")}</h2>
                  <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {visibleShop.map((v) => {
                      const need = Number(v.pointsRequired || 0);
                      const can = balance >= need && v.active !== false && (v.remainingQuantity == null || v.remainingQuantity > 0);
                      return (
                        <li key={v.id} className="min-w-0 rounded-2xl bg-slate-50 p-3.5 flex flex-col">
                          <p className="font-bold text-slate-900">{v.title}</p>
                          {v.description && <p className="mt-0.5 text-xs text-slate-600">{v.description}</p>}
                          <p className="mt-1 text-sm font-semibold text-orange-700">
                            {discountLabel(v, t)}{v.maxDiscountAmount ? ` ${t("account.rewards.maxDiscount", { amount: vnd(v.maxDiscountAmount) })}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {need.toLocaleString(numLocale)} {t("account.points")}
                            {v.minOrderAmount ? ` · ${t("account.rewards.minOrder", { amount: vnd(v.minOrderAmount) })}` : ""}
                            {v.validDays ? ` · ${t("account.rewards.validDays", { count: v.validDays })}` : ""}
                          </p>
                          <button
                            type="button"
                            onClick={() => redeem(v)}
                            disabled={!can || redeeming === v.id}
                            className="mt-auto pt-2.5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                          >
                            {redeeming === v.id && <Loader2 size={14} className="animate-spin" />}
                            {can
                              ? t("account.rewards.redeemBtn")
                              : balance < need
                                ? t("account.rewards.needMorePoints", { count: (need - balance).toLocaleString(numLocale) })
                                : t("account.rewards.outOfVouchers")}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <Pager page={safeShopPage} totalPages={shopTotalPages} onChange={setShopPage} t={t} />
                </section>
              )}
            </div>
          )}

          {/* ── Tab 2: Huy hiệu (gộp 1 danh sách + lọc Đã nhận / Chưa nhận + phân trang) ── */}
          {tab === "badges" && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="all-badges">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="all-badges" className="flex items-center gap-2 font-extrabold text-slate-900">
                  <Award size={17} className="text-teal-700" />
                  {t("account.rewards.allBadgesHeading", { count: mergedBadges.length })}
                </h2>
                <div className="flex flex-wrap gap-1">
                  {[
                    ["ALL", t("common.all")],
                    ["EARNED", `${t("account.rewards.filterEarned")} (${myBadges.length})`],
                    ["UNEARNED", t("account.rewards.filterUnearned")],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setBadgeFilter(key); setBadgePage(1); }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                        badgeFilter === key ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {visibleBadges.length ? (
                <>
                  <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {visibleBadges.map((b) => (
                      <li key={b.id} className={`min-w-0 rounded-2xl border p-3.5 ${b.earned ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50"}`}>
                        <div className="flex items-center gap-2.5">
                          {b.iconUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={b.iconUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                          ) : (
                            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${b.earned ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                              <Award size={18} />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{b.name}</p>
                            {b.bonusPoints > 0 && (
                              <p className="text-[11px] font-semibold text-amber-700">{t("account.rewards.bonusPoints", { count: b.bonusPoints })}</p>
                            )}
                          </div>
                        </div>
                        {b.description && <p className="mt-2 text-xs leading-relaxed text-slate-600">{b.description}</p>}
                        {b.earned && (
                          <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 size={12} />
                            {b.earnedAt ? t("account.rewards.earnedAt", { time: dateTime(b.earnedAt) }) : t("account.rewards.earned")}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                  <Pager page={safeBadgePage} totalPages={badgeTotalPages} onChange={setBadgePage} t={t} />
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  {mergedBadges.length ? t("account.rewards.badgesEmptyFilter") : t("account.rewards.myBadgesEmpty")}
                </p>
              )}
            </section>
          )}

          {/* ── Tab 3: Lịch sử điểm (phân trang 10 giao dịch/trang) ── */}
          {tab === "history" && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="point-history">
              <h2 id="point-history" className="font-extrabold text-slate-900">{t("account.rewards.pointHistoryHeading")}</h2>
              {visibleHistory.length ? (
                <>
                  <ul className="mt-3 divide-y divide-slate-100">
                    {visibleHistory.map((h) => {
                      const plus = Number(h.amount) >= 0;
                      return (
                        <li key={h.id} className="flex items-center gap-3 py-2.5 text-sm">
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${plus ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                            {plus ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-slate-800">{h.description || h.transactionType}</span>
                            <span className="text-xs text-slate-400">{dateTime(h.createdAt)}</span>
                          </span>
                          <span className={`shrink-0 font-bold tabular-nums ${plus ? "text-emerald-700" : "text-rose-600"}`}>
                            {plus ? "+" : ""}{h.amount}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <Pager page={safeHistoryPage} totalPages={historyTotalPages} onChange={setHistoryPage} t={t} />
                </>
              ) : <p className="mt-2 text-sm text-slate-500">{t("account.rewards.pointHistoryEmpty")}</p>}
            </section>
          )}
        </div>
      )}
    </AccountLayout>
  );
}
