"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Search,
  ArrowUpRight,
  MapPin,
  Compass,
  HelpCircle,
  BookOpen,
  ScrollText,
  Building2,
  ChevronRight,
  Inbox,
  MessageSquare,
  History,
} from "lucide-react";
import { SURFACE, TABLE, BADGE, BUTTON, INPUT } from "../admin/dashboard.tokens";
import {
  PageHeader,
  StatCard,
  Panel,
  StackedBar,
} from "@/components/dashboard/DashboardUI";
import { moderationService } from "@/features/destination";
import { dashboardService } from "@/features/dashboard";
import { useQueueRefresh } from "@/context/NotificationContext";

/**
 * Trang Bảng Điều Khiển Ban Kiểm Định & Chuẩn Hóa Di Sản - JourneyGo
 * Đường dẫn: /moderator
 * - Redesign theo phong cách Metis: sạch, phẳng, trang nhã cho website du lịch & di sản
 * - Tích hợp trực tiếp dữ liệu hàng chờ từ moderationService
 */
const QUICK_LINKS = [
  { href: "/moderator/tours", label: "Thẩm định tour", icon: Compass },
  { href: "/moderator/destinations", label: "Duyệt điểm đến & lộ trình", icon: MapPin },
  { href: "/moderator/destinations", label: "Duyệt thuyết minh di sản", icon: BookOpen },
  { href: "/moderator/community", label: "Duyệt bài cộng đồng", icon: MessageSquare },
  { href: "/moderator/history", label: "Nhật ký & lịch sử duyệt", icon: History },
];

export default function ModeratorDashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic KPI Stats
  const [kpiMetrics, setKpiMetrics] = useState({
    pendingCount: 0,
    pendingTrend: "Đang tải dữ liệu hàng chờ...",
    publishedCount: 0,
    publishedTrend: "Đang kiểm tra...",
    revisionCount: 0,
    revisionTrend: "Đang kiểm tra...",
    alertsCount: 0,
    alertsTrend: "Đang kiểm tra...",
  });

  // Dynamic Priority Queue Data
  const [queueData, setQueueData] = useState([]);

  // Thời gian thực: hồ sơ mới gửi duyệt hoặc moderator khác vừa xử lý → tải ngầm lại hàng chờ
  const [reloadKey, setReloadKey] = useState(0);
  useQueueRefresh(
    ["destination-review", "tour-review", "content-review", "experience-review", "post-review", "post-report"],
    () => setReloadKey((k) => k + 1),
  );

  useEffect(() => {
    let isMounted = true;
    async function fetchDashboardData() {
      if (reloadKey === 0) setIsLoading(true);
      try {
        const [destQueueRes, contentQueueRes, tourQueueRes, statsRes] =
          await Promise.allSettled([
            moderationService.getDestinationQueue({ size: 500 }),
            moderationService.getContentQueue({ size: 500 }),
            moderationService.getTourQueue({ size: 500 }),
            dashboardService.getModerator(),
          ]);

        if (!isMounted) return;

        const extractQueueArray = (res) => {
          if (res.status !== "fulfilled") return [];
          const val = res.value;
          if (Array.isArray(val)) return val;
          if (Array.isArray(val?.content)) return val.content;
          return [];
        };

        const destQueue = extractQueueArray(destQueueRes);
        const contentQueue = extractQueueArray(contentQueueRes);
        const tourQueue = extractQueueArray(tourQueueRes);
        const stats = statsRes.status === "fulfilled" ? statsRes.value : null;
        if (!stats) console.error("[Moderator Dashboard] Stats error:", statsRes.reason);

        // Số đếm lấy từ API thống kê (không bị giới hạn kích thước trang); hàng chờ chỉ dùng làm dự phòng
        const pending = stats?.pending ?? {
          destinations: destQueue.length,
          tours: tourQueue.length,
          contents: contentQueue.length,
        };
        const totalPending = pending.destinations + pending.tours + pending.contents;

        setKpiMetrics({
          pendingCount: totalPending,
          pendingTrend:
            totalPending > 0
              ? `${pending.destinations} điểm đến, ${pending.tours} tour, ${pending.contents} thuyết minh`
              : "Hàng chờ hiện đang trống",
          publishedCount: stats?.approvedToday ?? 0,
          publishedTrend: stats
            ? `Đã ra ${stats.decidedToday} quyết định trong hôm nay`
            : "Không tải được số liệu",
          revisionCount: stats?.rejectedTotal ?? 0,
          revisionTrend: "Hồ sơ đang chờ đối tác hiệu đính",
          alertsCount: stats?.pendingReports ?? 0,
          alertsTrend: stats
            ? `Báo cáo vi phạm chờ xử lý • ${stats.pendingPosts} bài cộng đồng chờ duyệt`
            : "Không tải được số liệu",
        });

        // Xây dựng danh sách hàng chờ ưu tiên từ API thực tế
        const mappedDestItems = destQueue.map((d) => ({
          id: d.id,
          code: `DEST-${d.id}`,
          title: d.name,
          type: "destination",
          typeLabel: "Điểm đến & Di tích",
          sender: d.createdBy || "Đối tác du lịch",
          submittedTime: d.updatedAt
            ? new Date(d.updatedAt).toLocaleDateString("vi-VN")
            : "Mới cập nhật",
          urgency: "urgent",
          urgencyLabel: "Cần thẩm định",
          actionHref: `/moderator/destinations`,
          actionText: "Thẩm định ngay",
        }));

        const mappedTourItems = tourQueue.map((t) => {
          const tId = t.tourId || t.id;
          return {
            id: tId,
            code: `TOUR-${tId}`,
            title: t.title || `Hành trình #${tId}`,
            type: "tour",
            typeLabel: "Tuyến hành trình",
            sender: t.createdBy || "Đối tác lữ hành",
            submittedTime: t.updatedAt
              ? new Date(t.updatedAt).toLocaleDateString("vi-VN")
              : "Mới cập nhật",
            urgency: "urgent",
            urgencyLabel: "Cần thẩm định",
            actionHref: `/moderator/tours`,
            actionText: "Thẩm định tour",
          };
        });

        const mappedContentItems = contentQueue.map((c) => ({
          id: c.contentId,
          code: `DOC-${c.contentId}`,
          title: c.title || `Thuyết minh văn hóa #${c.contentId}`,
          type: "cultural",
          typeLabel: "Thuyết minh & Văn hóa",
          sender: c.destinationName || "Biên tập viên",
          submittedTime: c.submittedAt
            ? new Date(c.submittedAt).toLocaleDateString("vi-VN")
            : "Mới cập nhật",
          urgency: "warning",
          urgencyLabel: "Chờ phê duyệt",
          actionHref: `/moderator/destinations`,
          actionText: "Kiểm tra nội dung",
        }));

        setQueueData([...mappedDestItems, ...mappedTourItems, ...mappedContentItems]);

      } catch (err) {
        console.error("[Moderator Dashboard] Fetch error:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const kpiStats = [
    {
      id: "pending",
      title: "Hồ sơ chờ phê duyệt",
      count: kpiMetrics.pendingCount,
      unit: "mục",
      trend: kpiMetrics.pendingTrend,
      icon: Clock,
      tone: "amber",
      linkText: "Chi tiết →",
      linkHref: "/moderator#queue",
    },
    {
      id: "published",
      title: "Đã xuất bản hôm nay",
      count: kpiMetrics.publishedCount,
      unit: "mục",
      trend: kpiMetrics.publishedTrend,
      icon: CheckCircle2,
      tone: "emerald",
      linkText: "Chi tiết →",
      linkHref: "/moderator/history",
    },
    {
      id: "revision",
      title: "Yêu cầu hiệu đính / Từ chối",
      count: kpiMetrics.revisionCount,
      unit: "mục",
      trend: kpiMetrics.revisionTrend,
      icon: AlertTriangle,
      tone: "indigo",
      linkText: "Chi tiết →",
      linkHref: "/moderator#queue",
    },
    {
      id: "alerts",
      title: "Cảnh báo phản cảm / Sai sự thật",
      count: kpiMetrics.alertsCount,
      unit: "cảnh báo",
      trend: kpiMetrics.alertsTrend,
      icon: ShieldAlert,
      tone: "rose",
      linkText: "Chi tiết →",
      linkHref: "/moderator/community",
    },
  ];

  // Cơ cấu hàng chờ theo loại (tính từ dữ liệu API thật)
  const queueSegments = [
    { label: "Điểm đến & di tích", value: queueData.filter((i) => i.type === "destination").length, tone: "sky" },
    { label: "Tuyến hành trình", value: queueData.filter((i) => i.type === "tour").length, tone: "amber" },
    { label: "Thuyết minh & văn hóa", value: queueData.filter((i) => i.type === "cultural").length, tone: "violet" },
  ];

  // Lọc dữ liệu theo từ khóa tìm kiếm và loại hình
  const filteredQueue = queueData.filter((item) => {
    const matchesSearch =
      (item.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sender || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.code || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      categoryFilter === "all" || item.type === categoryFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className={SURFACE.page}>
      <PageHeader
        eyebrow="Thẩm định"
        title="Bàn làm việc tổng quan"
        description="Đảm bảo dữ liệu lịch sử, tọa độ thực địa và bài thuyết minh đạt chuẩn di sản Việt Nam trước khi tiếp cận du khách."
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiStats.map((stat) => (
          <StatCard
            key={stat.id}
            title={stat.title}
            value={stat.count}
            unit={stat.unit}
            icon={stat.icon}
            tone={stat.tone}
            href={stat.linkHref}
          />
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Panel
          className="lg:col-span-8"
          title="Cơ cấu hàng chờ"
          description="Phân bổ hồ sơ đang chờ theo loại nội dung"
          icon={Inbox}
          tone="indigo"
          bodyClassName="p-5"
        >
          <StackedBar
            segments={queueSegments}
            emptyText="Hàng chờ đang trống — chưa có hồ sơ cần thẩm định."
          />
        </Panel>

        <Panel
          className="lg:col-span-4"
          title="Lối tắt nghiệp vụ"
          description="Đi nhanh tới các khu vực duyệt"
          icon={Compass}
          tone="amber"
          bodyClassName="p-2"
        >
          <ul>
            {QUICK_LINKS.map(({ href, label, icon: LinkIcon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <LinkIcon size={16} className="text-slate-400" />
                  <span className="flex-1">{label}</span>
                  <ChevronRight size={14} className="text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      {/* ────────────────────────────────────────────────────────
          3. KHỐI DANH SÁCH HÀNG CHỜ ƯU TIÊN
      ──────────────────────────────────────────────────────── */}
      <section id="queue" className={`${SURFACE.card} overflow-hidden`}>
        {/* Header khối */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Danh sách hàng chờ ưu tiên
              </h2>
              <span className={`${BADGE.base} ${BADGE.warning}`}>
                {filteredQueue.length} hồ sơ cần duyệt
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Các hồ sơ quan trọng cần thẩm định gấp để đồng bộ lên ứng dụng di tích
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên nội dung, đơn vị gửi..."
                className={INPUT.search}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-400"
            >
              <option value="all">Tất cả loại hình</option>
              <option value="destination">Điểm đến và di tích</option>
              <option value="tour">Tuyến hành trình &amp; Tour</option>
              <option value="cultural">Thuyết minh &amp; Di sản</option>
            </select>

          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div className={SURFACE.cardTable}>
          <table className={TABLE.base}>
            <thead>
              <tr className={TABLE.theadRow}>
                <th className={TABLE.th}>Mã hồ sơ</th>
                <th className={TABLE.th}>Tên nội dung</th>
                <th className={TABLE.th}>Loại nội dung</th>
                <th className={TABLE.th}>Người gửi / Đơn vị</th>
                <th className={TABLE.th}>Thời gian gửi</th>
                <th className={TABLE.th}>Mức độ</th>
                <th className={`${TABLE.th} text-right`}>Thao tác</th>
              </tr>
            </thead>
            <tbody className={TABLE.tbody}>
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className={TABLE.emptyCell}>
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                        <Inbox size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-600">
                        {searchQuery
                          ? "Không tìm thấy hồ sơ phù hợp với từ khóa."
                          : "Hàng chờ ưu tiên hiện đang trống."}
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        {searchQuery
                          ? "Vui lòng thử xóa từ khóa tìm kiếm hoặc chọn lại bộ lọc loại hình."
                          : "Hiện chưa có hồ sơ nào cần phê duyệt gấp. Dữ liệu sẽ hiển thị khi kết nối máy chủ."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item) => (
                  <tr key={item.id} className={TABLE.tr}>
                    <td className={TABLE.td}>
                      <span className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200 font-mono text-xs">
                        {item.code || item.id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs sm:max-w-sm">
                      <p className="font-bold text-slate-900">
                        {item.title}
                      </p>
                    </td>
                    <td className={TABLE.td}>
                      <span
                        className={`${BADGE.base} ${
                          item.type === "destination"
                            ? BADGE.info
                            : item.type === "cultural"
                            ? BADGE.purple
                            : item.type === "route"
                            ? BADGE.success
                            : BADGE.warning
                        }`}
                      >
                        {item.type === "destination" && <MapPin size={11} />}
                        {item.type === "cultural" && <BookOpen size={11} />}
                        {item.type === "route" && <Compass size={11} />}
                        {item.type === "quiz" && <HelpCircle size={11} />}
                        <span>{item.typeLabel || item.type}</span>
                      </span>
                    </td>
                    <td className={TABLE.td}>
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <Building2 size={13} className="text-slate-400 flex-shrink-0" />
                        <span>{item.sender}</span>
                      </div>
                    </td>
                    <td className={TABLE.tdMuted}>
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-slate-400 flex-shrink-0" />
                        <span>{item.submittedTime}</span>
                      </div>
                    </td>
                    <td className={TABLE.td}>
                      {item.urgency === "urgent" ? (
                        <span className={`${BADGE.base} ${BADGE.danger}`}>
                          <span>{item.urgencyLabel || "Khẩn cấp"}</span>
                        </span>
                      ) : item.urgency === "warning" ? (
                        <span className={`${BADGE.base} ${BADGE.purple}`}>
                          <span>{item.urgencyLabel || "Cảnh báo sai lệch"}</span>
                        </span>
                      ) : (
                        <span className={`${BADGE.base} ${BADGE.neutral}`}>
                          <span>{item.urgencyLabel || "Tiêu chuẩn"}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={item.actionHref || `/moderator/destinations/${item.id}`}
                        className={BUTTON.primary}
                      >
                        <span>{item.actionText || "Thẩm định ngay"}</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Chân bảng */}
        <div className={`${SURFACE.cardFooter} flex items-center justify-between`}>
          <span>Đang hiển thị {filteredQueue.length} hồ sơ trong hàng chờ</span>
          <Link
            href="/moderator/destinations"
            className="font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 transition-colors"
          >
            <span>Đến trang duyệt điểm đến và lộ trình</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
