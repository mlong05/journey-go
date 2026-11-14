"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flag,
  Gauge,
  Inbox,
  MessageSquare,
  PieChart,
  RefreshCw,
} from "lucide-react";
import { SURFACE } from "../admin/dashboard.tokens";
import { PageHeader, Panel } from "@/components/dashboard/DashboardUI";
import { moderationService } from "@/features/destination";
import { dashboardService } from "@/features/dashboard";
import { communityModerationService } from "@/features/community/services/communityModerationService";
import { useQueueRefresh } from "@/context/NotificationContext";

/**
 * Bàn làm việc tổng quan của Kiểm duyệt viên — /moderator
 *
 * Nguồn dữ liệu (đều là API sẵn có):
 *  • `GET /dashboard/moderator`               → số đếm toàn hệ thống + hiệu suất 30 ngày
 *  • `GET /moderation/tours/queue`            → hàng chờ tour (tourTitle, tourVersion, submittedAt)
 *  • `GET /community/moderation/pending`      → bài cộng đồng chờ duyệt
 *  • `GET /community/moderation/reports`      → báo cáo bài viết chờ xử lý
 *  • `GET /community/moderation/comment-reports` → báo cáo bình luận chờ xử lý
 *
 * Bố cục khóa khung (không cuộn trang): dải 4 ô số liệu → [Hàng chờ cần xử lý | Hiệu suất + Cơ cấu].
 * Chỉ danh sách trong "Hàng chờ cần xử lý" có thanh cuộn.
 * Mọi chữ dài đều `truncate` + `title` để không tràn khung.
 */

/** Số bài / báo cáo tải về cho mỗi tab (danh sách tự cuộn bên trong). */
const ROWS_PER_TAB = 30;

/** Ngưỡng hạn xử lý (giờ) tính từ lúc gửi duyệt. */
const SLA_WARN_HOURS = 24;
const SLA_OVERDUE_HOURS = 48;

const REPORT_REASONS = {
  SPAM: "Spam hoặc quảng cáo",
  INAPPROPRIATE_CONTENT: "Nội dung không phù hợp",
  HATE_SPEECH: "Ngôn từ thù ghét",
  FALSE_INFORMATION: "Thông tin sai sự thật",
  COPYRIGHT_VIOLATION: "Vi phạm bản quyền",
  OTHER: "Lý do khác",
};

const TONE_TEXT = {
  amber: "text-amber-600",
  rose: "text-rose-600",
  emerald: "text-emerald-600",
  sky: "text-sky-600",
};
const TONE_CHIP = {
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  emerald: "bg-emerald-50 text-emerald-600",
  sky: "bg-sky-50 text-sky-600",
};

/* ───────────────────────────── Helpers ───────────────────────────── */

function extractArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

function hoursSince(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, (Date.now() - t) / 3_600_000);
}

/** "vừa xong" · "15 phút trước" · "3 giờ trước" · "2 ngày trước" */
function timeAgo(iso) {
  const h = hoursSince(iso);
  if (h == null) return "—";
  const minutes = Math.floor(h * 60);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (h < 24) return `${Math.floor(h)} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("vi-VN");
}

/** Hạn xử lý theo tuổi hồ sơ. */
function slaOf(iso) {
  const h = hoursSince(iso);
  if (h == null) return { label: "—", cls: "bg-slate-100 text-slate-500" };
  if (h >= SLA_OVERDUE_HOURS) return { label: "Quá hạn", cls: "bg-rose-50 text-rose-700" };
  if (h >= SLA_WARN_HOURS) return { label: "Cần ưu tiên", cls: "bg-amber-50 text-amber-700" };
  return { label: "Mới", cls: "bg-emerald-50 text-emerald-700" };
}

function byOldest(field) {
  return (a, b) => new Date(a?.[field] ?? 0).getTime() - new Date(b?.[field] ?? 0).getTime();
}

function formatAvgReview(hours) {
  if (hours == null) return "—";
  const h = Number(hours);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} phút`;
  return `${h.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} giờ`;
}

/* ───────────────────────────── Trang ───────────────────────────── */

export default function ModeratorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [tours, setTours] = useState([]);
  const [posts, setPosts] = useState({ items: [], total: 0 });
  const [postReports, setPostReports] = useState({ items: [], total: 0 });
  const [commentReports, setCommentReports] = useState({ items: [], total: 0 });
  const [updatedAt, setUpdatedAt] = useState(null);
  const [tab, setTab] = useState("tours");

  // Thời gian thực: hồ sơ mới gửi duyệt hoặc moderator khác vừa xử lý → tải ngầm lại
  const [reloadKey, setReloadKey] = useState(0);
  useQueueRefresh(["tour-review", "post-review", "post-report"], () =>
    setReloadKey((k) => k + 1),
  );

  useEffect(() => {
    let alive = true;
    async function load() {
      if (reloadKey > 0) setRefreshing(true);
      const empty = { items: [], total: 0 };
      const [tourRes, statsRes, postRes, reportRes, commentRes] = await Promise.allSettled([
        moderationService.getTourQueue({ size: 100 }),
        dashboardService.getModerator(),
        communityModerationService.getPendingPosts({ size: ROWS_PER_TAB }),
        communityModerationService.getReports({ status: "PENDING", size: ROWS_PER_TAB }),
        communityModerationService.getCommentReports({ status: "PENDING", size: ROWS_PER_TAB }),
      ]);
      if (!alive) return;

      setTours(tourRes.status === "fulfilled" ? extractArray(tourRes.value) : []);
      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value);
        setStatsError(false);
      } else {
        console.error("[Moderator Dashboard] Stats error:", statsRes.reason);
        setStatsError(true);
      }
      setPosts(postRes.status === "fulfilled" ? postRes.value : empty);
      setPostReports(reportRes.status === "fulfilled" ? reportRes.value : empty);
      setCommentReports(commentRes.status === "fulfilled" ? commentRes.value : empty);
      setUpdatedAt(new Date());
      setLoading(false);
      setRefreshing(false);
    }
    load();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  /* ── Số liệu tổng hợp ─────────────────────────────────────────────── */
  const sortedTours = useMemo(() => [...tours].sort(byOldest("submittedAt")), [tours]);
  const overdueTours = useMemo(
    () => tours.filter((t) => (hoursSince(t?.submittedAt) ?? 0) >= SLA_OVERDUE_HOURS).length,
    [tours],
  );

  const tourCount = stats?.pending?.tours ?? tours.length;
  const postCount = stats?.pendingPosts ?? posts.total;
  const postReportCount = stats?.pendingReports ?? postReports.total;
  const commentReportCount = commentReports.total;
  const reportCount = postReportCount + commentReportCount;
  const decidedToday = stats?.decidedToday ?? 0;
  const approvedToday = stats?.approvedToday ?? 0;
  const rejectedToday = Math.max(0, decidedToday - approvedToday);

  const reportRows = useMemo(
    () =>
      [
        ...postReports.items.map((r) => ({ ...r, kind: "post" })),
        ...commentReports.items.map((r) => ({ ...r, kind: "comment" })),
      ]
        .sort(byOldest("createdAt"))
        .slice(0, ROWS_PER_TAB),
    [postReports.items, commentReports.items],
  );

  const kpis = [
    {
      id: "tours",
      label: "Tour chờ duyệt",
      value: tourCount,
      icon: Clock,
      tone: "amber",
      href: "/moderator/tours",
      hint: overdueTours > 0 ? `${overdueTours} quá ${SLA_OVERDUE_HOURS}h` : null,
      hintCls: "text-rose-600 font-semibold",
    },
    {
      id: "posts",
      label: "Bài chờ duyệt",
      value: postCount,
      icon: MessageSquare,
      tone: "sky",
      href: "/moderator/community",
      hint: null,
    },
    {
      id: "reports",
      label: "Báo cáo chờ xử lý",
      value: reportCount,
      icon: Flag,
      tone: "rose",
      href: "/moderator/community",
      hint: reportCount > 0 ? `${postReportCount} bài · ${commentReportCount} b.luận` : null,
      hintCls: "text-slate-500",
    },
    {
      id: "today",
      label: "Đã xử lý hôm nay",
      value: decidedToday,
      icon: CheckCircle2,
      tone: "emerald",
      href: "/moderator/history",
      hint: decidedToday > 0 ? `${approvedToday} duyệt · ${rejectedToday} từ chối` : null,
      hintCls: "text-slate-500",
    },
  ];

  const segments = [
    { label: "Tour", value: tourCount, bar: "bg-amber-500" },
    { label: "Bài viết", value: postCount, bar: "bg-sky-500" },
    { label: "Báo cáo bài viết", value: postReportCount, bar: "bg-rose-500" },
    { label: "Báo cáo bình luận", value: commentReportCount, bar: "bg-violet-500" },
  ];
  const segmentTotal = segments.reduce((s, x) => s + x.value, 0);

  const tabs = [
    { id: "tours", label: "Tour", count: tourCount },
    { id: "posts", label: "Bài viết", count: postCount },
    { id: "reports", label: "Báo cáo", count: reportCount },
  ];

  const tabMeta = {
    tours: { shown: sortedTours.length, total: tourCount, href: "/moderator/tours", link: "Đến trang thẩm định tour" },
    posts: { shown: posts.items.length, total: postCount, href: "/moderator/community", link: "Đến trang duyệt bài" },
    reports: { shown: reportRows.length, total: reportCount, href: "/moderator/community", link: "Đến trang xử lý báo cáo" },
  }[tab];

  return (
    // Màn xl+: vừa khít khung, chỉ danh sách hàng chờ cuộn. Màn nhỏ: các khối xếp dọc, cho cuộn.
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto xl:overflow-hidden">
      <div className="shrink-0">
      <PageHeader
        title="Bàn làm việc tổng quan"
        description="Theo dõi hàng chờ thẩm định tour, bài cộng đồng và báo cáo vi phạm."
      >
        {updatedAt && (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            Cập nhật lúc{" "}
            {updatedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Làm mới
        </button>
      </PageHeader>
      </div>

      {statsError && (
        <p className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Không tải được số liệu thống kê — các con số đang lấy tạm từ hàng chờ.
        </p>
      )}

      {/* ── 1. Dải số liệu gọn: 1 thẻ chia 4 ô (2×2 trên màn nhỏ) ──────────── */}
      <section className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 shadow-xs">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link
              key={k.id}
              href={k.href}
              className="group flex min-w-0 items-center gap-3 bg-white px-4 py-3 transition-colors hover:bg-slate-50"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_CHIP[k.tone]}`}
              >
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-500" title={k.label}>
                  {k.label}
                </p>
                <div className="flex min-w-0 items-baseline gap-2">
                  <span
                    className={`shrink-0 text-xl font-bold tabular-nums ${
                      loading ? "text-slate-300" : k.value > 0 ? TONE_TEXT[k.tone] : "text-slate-900"
                    }`}
                  >
                    {loading ? "…" : k.value}
                  </span>
                  {!loading && k.hint && (
                    <span className={`min-w-0 truncate text-[11px] ${k.hintCls}`} title={k.hint}>
                      {k.hint}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {/* ── 2. Hàng chờ | Cột phụ ─────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-4 xl:flex-1 xl:min-h-0 xl:grid-cols-12 xl:grid-rows-[minmax(0,1fr)]">
        {/* Hàng chờ cần xử lý */}
        <div className={`${SURFACE.card} flex h-[560px] min-w-0 flex-col overflow-hidden xl:col-span-8 xl:h-auto xl:min-h-0`}>
          <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Inbox size={16} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-slate-900">Hàng chờ cần xử lý</h2>
                <p className="truncate text-xs text-slate-600">
                  Hồ sơ cũ nhất lên đầu — ưu tiên mục quá hạn
                </p>
              </div>
            </div>
            <div className="flex w-fit shrink-0 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                    tab === t.id
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {t.label}
                  <span
                    className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                      t.count > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {loading ? "…" : t.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Vùng DUY NHẤT có thanh cuộn của trang */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
            {loading ? (
              <div className="flex h-60 items-center justify-center text-xs text-slate-400">
                <RefreshCw size={14} className="mr-2 animate-spin" />
                Đang tải hàng chờ...
              </div>
            ) : tab === "tours" ? (
              <QueueList
                rows={sortedTours}
                empty="Không có tour nào chờ thẩm định."
                render={(t) => {
                  const id = t?.tourId ?? t?.id;
                  const version = Number(t?.tourVersion ?? 1);
                  return (
                    <QueueRow
                      key={t?.reviewId ?? id}
                      title={t?.tourTitle || t?.tour?.title || `Tour #${id}`}
                      meta={[
                        `TOUR-${id}`,
                        version > 1 ? `Gửi lại · v${version}` : "Lần gửi đầu",
                      ]}
                      time={t?.submittedAt}
                      href={`/moderator/tours/${id}`}
                      action="Thẩm định"
                    />
                  );
                }}
              />
            ) : tab === "posts" ? (
              <QueueList
                rows={posts.items}
                empty="Không có bài cộng đồng nào chờ duyệt."
                render={(p) => (
                  <QueueRow
                    key={p?.id}
                    title={p?.title || p?.content || `Bài viết #${p?.id}`}
                    meta={[
                      p?.authorName || "Ẩn danh",
                      p?.tourTitle ? `Tour: ${p.tourTitle}` : null,
                    ]}
                    time={p?.createdAt}
                    href="/moderator/community"
                    action="Duyệt bài"
                  />
                )}
              />
            ) : (
              <QueueList
                rows={reportRows}
                empty="Không có báo cáo vi phạm nào chờ xử lý."
                render={(r) => (
                  <QueueRow
                    key={`${r.kind}-${r?.id}`}
                    badge={r.kind === "post" ? "Bài viết" : "Bình luận"}
                    title={
                      r.kind === "post"
                        ? r?.postTitle || `Bài viết #${r?.postId}`
                        : r?.commentContent || `Bình luận #${r?.commentId}`
                    }
                    meta={[
                      REPORT_REASONS[r?.reason] || r?.reason || "Không rõ lý do",
                      r.kind === "comment" && r?.postTitle ? `Trong bài: ${r.postTitle}` : null,
                    ]}
                    time={r?.createdAt}
                    href="/moderator/community"
                    action="Xử lý"
                  />
                )}
              />
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-600">
            <span className="min-w-0 truncate">
              Hiển thị {tabMeta.shown} / {tabMeta.total} mục
            </span>
            <Link
              href={tabMeta.href}
              className="inline-flex shrink-0 items-center gap-1 font-bold text-slate-600 transition-colors hover:text-slate-900"
            >
              {tabMeta.link}
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Cột phụ */}
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-4 xl:min-h-0">
          <Panel title="Hiệu suất 30 ngày" icon={Gauge} tone="emerald" bodyClassName="px-5 py-2">
            <dl className="divide-y divide-slate-100">
              <StatRow label="Thời gian duyệt trung bình" value={formatAvgReview(stats?.avgReviewHours)} />
              <StatRow label="Hồ sơ đã xử lý" value={`${stats?.reviewedLast30Days ?? 0} hồ sơ`} />
              <StatRow label="Tổng hồ sơ bị từ chối" value={`${stats?.rejectedTotal ?? 0} hồ sơ`} />
            </dl>
          </Panel>

          <Panel title="Cơ cấu hàng chờ" icon={PieChart} tone="indigo" bodyClassName="p-5">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              {segmentTotal > 0 &&
                segments
                  .filter((s) => s.value > 0)
                  .map((s) => (
                    <div
                      key={s.label}
                      className={`${s.bar} h-full`}
                      style={{ width: `${(s.value / segmentTotal) * 100}%` }}
                      title={`${s.label}: ${s.value}`}
                    />
                  ))}
            </div>
            {segmentTotal === 0 && (
              <p className="mt-3 text-xs text-slate-400">Hàng chờ đang trống.</p>
            )}
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              {segments.map((s) => (
                <li key={s.label} className="flex min-w-0 items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.bar}`} />
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-600" title={s.label}>
                    {s.label}
                  </span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-slate-900">
                    {s.value}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

        </div>
      </section>
    </div>
  );
}

/* ───────────────────────────── Thành phần con ───────────────────────────── */

function QueueList({ rows, empty, render }) {
  if (!rows.length) {
    return (
      <div className="flex h-60 flex-col items-center justify-center gap-2 px-6 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
          <Inbox size={20} />
        </span>
        <p className="text-sm font-semibold text-slate-600">{empty}</p>
      </div>
    );
  }
  return <ul className="divide-y divide-slate-100">{rows.map(render)}</ul>;
}

/**
 * Một dòng hàng chờ: [nhãn loại] Tiêu đề / dòng phụ | thời gian · hạn | nút.
 * Tiêu đề và dòng phụ luôn `truncate` (rê chuột để xem đầy đủ); trên màn hẹp
 * cụm thời gian + nút tự xuống hàng thay vì đè lên chữ.
 */
function QueueRow({ badge, title, meta = [], time, href, action }) {
  const sla = slaOf(time);
  const metaText = meta.filter(Boolean).join(" · ");
  return (
    <li className="flex flex-col gap-2 px-5 py-3 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          {badge && (
            <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              {badge}
            </span>
          )}
          <p className="min-w-0 truncate text-sm font-semibold text-slate-900" title={title}>
            {title}
          </p>
        </div>
        {metaText && (
          <p className="mt-0.5 truncate text-[11px] text-slate-500" title={metaText}>
            {metaText}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <span
          className="whitespace-nowrap text-[11px] text-slate-500"
          title={formatDateTime(time)}
        >
          {timeAgo(time)}
        </span>
        <span
          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${sla.cls}`}
        >
          {sla.label}
        </span>
        <Link
          href={href}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-rose-700"
        >
          {action}
          <ArrowUpRight size={12} />
        </Link>
      </div>
    </li>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="min-w-0 truncate text-xs text-slate-600" title={label}>
        {label}
      </dt>
      <dd className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}
