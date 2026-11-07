"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  MapPin,
  Compass,
  Trophy,
  Coins,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  ChevronRight,
  Inbox,
  FileCheck,
  PhoneCall,
  Navigation,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import { tourService, TOUR_STATUS_META } from "@/features/tour";
import { dashboardService, percentChange } from "@/features/dashboard";
import { useQueueRefresh } from "@/context/NotificationContext";
import {
  PageHeader,
  StatusChip,
  StatCard,
  Panel,
  StackedBar,
  EmptyBlock,
} from "@/components/dashboard/DashboardUI";

const RANGE_OPTIONS = [
  { id: "today", label: "Hôm nay", previous: "hôm qua" },
  { id: "week", label: "7 ngày", previous: "7 ngày trước" },
  { id: "month", label: "Tháng này", previous: "cùng kỳ tháng trước" },
];

const DEST_STATUS = {
  PUBLISHED: { label: "Đang hoạt động", cls: "bg-emerald-50 text-emerald-700 border-emerald-200/80", dot: "bg-emerald-500" },
  PENDING: { label: "Chờ phê duyệt", cls: "bg-amber-50 text-amber-700 border-amber-200/80", dot: "bg-amber-500" },
  REJECTED: { label: "Cần chỉnh sửa", cls: "bg-rose-50 text-rose-700 border-rose-200/80", dot: "bg-rose-500" },
  DRAFT: { label: "Bản nháp", cls: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
};

const REVIEW_ACTION = {
  SUBMITTED: { label: "Đã gửi thẩm định", icon: Send, cls: "bg-amber-50/70 border-amber-200/80", iconCls: "text-amber-600" },
  APPROVED: { label: "Đã được phê duyệt", icon: CheckCircle2, cls: "bg-emerald-50/70 border-emerald-200/80", iconCls: "text-emerald-600" },
  REJECTED: { label: "Bị yêu cầu chỉnh sửa", icon: XCircle, cls: "bg-rose-50/70 border-rose-200/80", iconCls: "text-rose-600" },
};

const fmtNumber = (n) => Number(n || 0).toLocaleString("vi-VN");

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      })
    : "";

/** Badge % so với kỳ trước; không hiển thị khi kỳ trước chưa có số liệu để so. */
function changeBadge(current, previous) {
  const pct = percentChange(current, previous);
  if (pct === null) return undefined;
  return {
    text: `${pct >= 0 ? "+" : ""}${pct.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`,
    positive: pct >= 0,
  };
}

/**
 * Trang Tổng Quan Đối Tác Điểm Đến - JourneyGo
 * Đường dẫn: /provider
 * Số liệu lấy từ GET /api/v1/dashboard/provider và GET /api/v1/tours/my
 */
export default function ProviderOverviewPage() {
  const authData = useAuthSession();

  // Bộ lọc thời gian: 'today' | 'week' | 'month'
  const [timeRange, setTimeRange] = useState("month");

  // Tab lọc danh sách điểm đến: 'all' | 'published' | 'pending'
  const [destinationFilter, setDestinationFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);

  // Tour do đối tác tạo (GET /tours/my)
  const [myTours, setMyTours] = useState([]);

  // Thời gian thực: booking mới, đối soát, kết quả duyệt → tải ngầm lại số liệu
  const [reloadKey, setReloadKey] = useState(0);
  const lastRange = React.useRef(timeRange);
  useQueueRefresh(["bookings", "settlements", "my-content"], () => setReloadKey((k) => k + 1));

  useEffect(() => {
    let isSubscribed = true;
    // Chỉ hiện trạng thái đang tải khi đổi khoảng thời gian, không hiện khi tải ngầm
    const silent = lastRange.current === timeRange && reloadKey > 0;
    lastRange.current = timeRange;
    queueMicrotask(() => {
      if (isSubscribed && !silent) setIsLoading(true);
    });

    async function loadData() {
      try {
        const [dashboard, tours] = await Promise.all([
          dashboardService.getProvider(timeRange),
          tourService.getMy().catch(() => []),
        ]);
        if (!isSubscribed) return;
        setStats(dashboard);
        setMyTours(Array.isArray(tours) ? tours : []);
        setError("");
      } catch (err) {
        console.error("[Provider Overview] Load error:", err);
        if (isSubscribed) setError(err?.message || "Không tải được số liệu tổng quan.");
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isSubscribed = false;
    };
  }, [timeRange, reloadKey]);

  const providerName = authData?.user?.fullName || authData?.user?.name || "Đối tác cung cấp nội dung";
  const range = RANGE_OPTIONS.find((r) => r.id === timeRange) ?? RANGE_OPTIONS[2];

  const destStats = stats?.destinations ?? { total: 0, published: 0, pending: 0, rejected: 0, draft: 0 };
  const checkIns = stats?.checkIns ?? { current: 0, previous: 0, allTime: 0 };
  const revenue = stats?.revenue ?? { current: 0, previous: 0, allTime: 0, currentBookings: 0 };
  const missions = stats?.missions ?? { tasks: 0, answered: 0, correct: 0 };
  const managedDestinations = stats?.destinationRows ?? [];
  const moderationUpdates = stats?.moderationUpdates ?? [];

  const withCoordinates = managedDestinations.filter((d) => d.latitude != null && d.longitude != null).length;
  const correctRate = missions.answered > 0 ? (missions.correct / missions.answered) * 100 : null;
  const loadingValue = isLoading && !stats;

  const kpiStats = [
    {
      id: "visitors",
      title: `Lượt khách check-in · ${range.label}`,
      value: loadingValue ? "…" : fmtNumber(checkIns.current),
      subValue: `Tổng từ trước tới nay: ${fmtNumber(checkIns.allTime)} lượt`,
      badge: changeBadge(checkIns.current, checkIns.previous),
      icon: Users,
      accent: "emerald",
    },
    {
      id: "destinations",
      title: "Điểm đến di tích quản lý",
      value: loadingValue ? "…" : `${destStats.published} / ${destStats.total}`,
      subValue: `${destStats.published} hoạt động • ${destStats.pending} chờ duyệt • ${destStats.rejected} cần sửa`,
      badge: destStats.total > 0 ? { text: `${withCoordinates}/${destStats.total} có tọa độ` } : undefined,
      icon: MapPin,
      accent: "indigo",
    },
    {
      id: "revenue",
      title: `Doanh thu tour · ${range.label}`,
      value: loadingValue ? "…" : `${fmtNumber(revenue.current)} ₫`,
      subValue: `${fmtNumber(revenue.currentBookings)} đơn đã thanh toán • Tổng: ${fmtNumber(revenue.allTime)} ₫`,
      badge: changeBadge(revenue.current, revenue.previous),
      icon: Coins,
      accent: "amber",
    },
    {
      id: "missions",
      title: "Nhiệm vụ & đố vui di sản",
      value: loadingValue ? "…" : fmtNumber(missions.tasks),
      subValue:
        correctRate === null
          ? "Chưa có lượt trả lời đố vui"
          : `Tỷ lệ trả lời đúng: ${correctRate.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% (${fmtNumber(missions.answered)} lượt)`,
      icon: Trophy,
      accent: "violet",
    },
  ];

  // Lọc điểm đến theo tab
  const filteredDestinations = managedDestinations.filter((dest) => {
    if (destinationFilter === "published") return dest.status === "PUBLISHED";
    if (destinationFilter === "pending") return dest.status === "PENDING";
    if (destinationFilter === "rejected") return dest.status === "REJECTED";
    return true;
  });

  const rangeTabs = (
    <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-lg">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setTimeRange(opt.id)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
            timeRange === opt.id
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const filterTabs = [
    { id: "all", label: "Tất cả", count: destStats.total },
    { id: "published", label: "Hoạt động", count: destStats.published },
    { id: "pending", label: "Chờ duyệt", count: destStats.pending },
    { id: "rejected", label: "Cần sửa", count: destStats.rejected },
  ];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <PageHeader
        eyebrow="Đối tác điểm đến"
        title={providerName}
        description="Theo dõi lượt check-in, quản lý tọa độ di tích và đồng hành cùng Hội đồng Thẩm định văn hóa."
        meta={
          <>
            <StatusChip tone={destStats.published > 0 ? "emerald" : "slate"}>
              {destStats.published > 0
                ? `${destStats.published} điểm đang đón khách`
                : "Chưa có điểm đến được xuất bản"}
            </StatusChip>
            {destStats.pending > 0 && (
              <StatusChip tone="amber">{destStats.pending} hồ sơ chờ thẩm định</StatusChip>
            )}
          </>
        }
      >
        {rangeTabs}
      </PageHeader>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section aria-label="Thống kê chỉ số KPI" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiStats.map((kpi) => (
          <StatCard
            key={kpi.id}
            title={kpi.title}
            value={kpi.value}
            hint={kpi.subValue}
            icon={kpi.icon}
            tone={kpi.accent}
            badge={kpi.badge}
          />
        ))}
      </section>
      <p className="-mt-3 text-[11px] text-slate-400">
        Phần trăm tăng/giảm so với {range.previous}; không hiển thị khi kỳ trước chưa có số liệu.
      </p>

      <Panel
        id="destinations"
        title="Điểm đến di tích trực thuộc"
        description="Tọa độ thực địa, lượt check-in và trạng thái thẩm định"
        icon={MapPin}
        tone="emerald"
        action={
          <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-lg">
            {filterTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDestinationFilter(t.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  destinationFilter === t.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
        }
        footer={
          <div className="flex items-center justify-between">
            <span>Hiển thị {filteredDestinations.length} / {managedDestinations.length} điểm đến</span>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-5">Điểm đến</th>
                <th className="py-3 px-4">Tọa độ GPS</th>
                <th className="py-3 px-4">Lượt check-in</th>
                <th className="py-3 px-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDestinations.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyBlock
                      icon={Inbox}
                      title={isLoading ? "Đang tải điểm đến…" : "Chưa có điểm đến di tích nào trong danh sách."}
                    />
                  </td>
                </tr>
              ) : (
                filteredDestinations.map((dest) => {
                  const status = DEST_STATUS[dest.status] ?? DEST_STATUS.DRAFT;
                  return (
                    <tr key={dest.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 font-mono font-bold text-[11px]">
                            #{dest.id}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{dest.name || "Điểm đến chưa đặt tên"}</p>
                            <p className="text-xs text-slate-600 line-clamp-1 max-w-xs mt-0.5">
                              {dest.address || "Chưa cập nhật địa chỉ"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-600">
                          <Navigation size={12} className="text-slate-400 shrink-0" />
                          {dest.latitude ?? "—"}, {dest.longitude ?? "—"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 tabular-nums">
                        {fmtNumber(dest.checkIns)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md border ${status.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-6">
        <Panel
          id="tours"
          className="lg:col-span-7"
          title="Tour của bạn"
          description="Hành trình nối các điểm di tích, du khách đặt và trải nghiệm"
          icon={Compass}
          tone="indigo"
          action={
            <Link
              href="/provider/tours"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              Quản lý tour <ChevronRight size={13} />
            </Link>
          }
          footer={
            <div className="flex items-center justify-between">
              <span>Hiển thị {Math.min(myTours.length, 6)} / {myTours.length} tour</span>
              <span className="font-semibold text-slate-600">
                {myTours.filter((t) => t.status === "PUBLISHED").length} tour đang mở bán
              </span>
            </div>
          }
        >
          {myTours.length === 0 ? (
            <EmptyBlock
              icon={Compass}
              title="Bạn chưa có tour nào."
              description="Vào Quản lý tour để nối các điểm đến thành hành trình và gửi duyệt."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {myTours.slice(0, 6).map((t) => {
                const meta = TOUR_STATUS_META[t.status] ?? TOUR_STATUS_META.DRAFT;
                return (
                  <li key={t.tourId ?? t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">{t.title || "Tour chưa đặt tên"}</p>
                      <p className="text-xs text-slate-500">
                        {(t.destinations?.length ?? t.destinationCount ?? 0)} điểm đến
                        {t.durationDays ? ` · ${t.durationDays} ngày` : ""}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="lg:col-span-5 flex flex-col gap-5">
          <Panel
            title="Tình trạng điểm đến"
            description="Theo trạng thái thẩm định"
            icon={Layers}
            tone="emerald"
            bodyClassName="p-5"
          >
            <StackedBar
              segments={[
                { label: "Hoạt động", value: destStats.published, tone: "emerald" },
                { label: "Chờ duyệt", value: destStats.pending, tone: "amber" },
                { label: "Cần sửa", value: destStats.rejected, tone: "rose" },
                { label: "Bản nháp", value: destStats.draft, tone: "slate" },
              ]}
              emptyText="Chưa có điểm đến nào để thống kê."
            />
          </Panel>

          <Panel
            id="reviews"
            title="Tiến độ thẩm định nội dung"
            description="Hoạt động gần nhất của Hội đồng thẩm định"
            icon={FileCheck}
            tone="amber"
            bodyClassName="p-4 space-y-3"
            footer={
              <div className="flex items-center justify-between gap-3">
                <span>Cần hỗ trợ số hóa di tích? Hỗ trợ 24/7</span>
                <a
                  href="tel:19006888"
                  className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800"
                >
                  <PhoneCall size={12} /> 1900 6888
                </a>
              </div>
            }
          >
            {moderationUpdates.length === 0 ? (
              <EmptyBlock
                icon={FileCheck}
                title="Chưa có hoạt động thẩm định"
                description="Khi bạn gửi điểm đến hoặc tour đi duyệt, tiến độ sẽ cập nhật tại đây."
              />
            ) : (
              moderationUpdates.map((item) => {
                const action = REVIEW_ACTION[item.action] ?? REVIEW_ACTION.SUBMITTED;
                const ActionIcon = action.icon ?? Clock;
                return (
                  <div
                    key={`${item.type}-${item.targetId}-${item.createdAt}`}
                    className={`p-3.5 rounded-lg border flex items-start gap-3 ${action.cls}`}
                  >
                    <ActionIcon size={16} className={`mt-0.5 shrink-0 ${action.iconCls}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">
                        {item.type === "TOUR" ? "Tour" : "Điểm đến"} {item.targetName}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {action.label}
                        {item.note || item.reason ? ` — ${item.note || item.reason}` : ""}
                      </p>
                      <span className="text-[11px] text-slate-500 font-semibold mt-1 inline-block">
                        {fmtDateTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </Panel>
        </div>
      </section>
    </div>
  );
}
