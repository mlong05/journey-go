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
  Bot,
  Building2,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { SURFACE, HERO, KPI, TABLE, BADGE, BUTTON, INPUT } from "../admin/dashboard.tokens";

/**
 * Trang Bảng Điều Khiển Ban Kiểm Định & Chuẩn Hóa Di Sản - JourneyGo
 * Đường dẫn: /moderator
 * - Redesign theo phong cách Metis: sạch, phẳng, ít gradient
 * - Giữ nguyên 100% state, props, hàm xử lý và API placeholders
 */
export default function ModeratorDashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic KPI Stats
  const [kpiMetrics, setKpiMetrics] = useState({
    pendingCount: 0,
    pendingTrend: "Chưa có hồ sơ mới sáng nay",
    publishedCount: 0,
    publishedTrend: "Chuẩn hóa dữ liệu 100%",
    revisionCount: 0,
    revisionTrend: "Đính chính niên đại và tọa độ",
    alertsCount: 0,
    alertsTrend: "Cần thẩm định khẩn cấp",
  });

  // Dynamic Priority Queue Data
  const [queueData, setQueueData] = useState([]);

  useEffect(() => {
    // [API INTEGRATION] Gắn hàm gọi API tại đây
    // async function fetchDashboardData() {
    //   setIsLoading(true);
    //   try {
    //     const [metricsRes, queueRes] = await Promise.all([
    //       api.get("/moderator/dashboard-metrics"),
    //       api.get("/moderator/priority-queue"),
    //     ]);
    //     setKpiMetrics(metricsRes.data);
    //     setQueueData(queueRes.data);
    //   } catch (err) {
    //     console.error("Lỗi tải dữ liệu kiểm duyệt:", err);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // }
    // fetchDashboardData();
  }, []);

  const kpiStats = [
    {
      id: "pending",
      title: "Hồ sơ chờ phê duyệt",
      count: kpiMetrics.pendingCount,
      unit: "mục",
      trend: kpiMetrics.pendingTrend,
      icon: Clock,
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
      linkText: "Chi tiết →",
      linkHref: "/moderator/ai-auditing",
    },
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
      {/* ────────────────────────────────────────────────────────
          1. HERO BANNER BAN KIỂM ĐỊNH
      ──────────────────────────────────────────────────────── */}
      <section className={HERO.shell}>
        <div className="relative z-10">
          <div className={HERO.eyebrow}>
            <span>Ban kiểm định &amp; chuẩn hóa di sản</span>
          </div>

          <h1 className={`${HERO.title} mt-3`}>
            Trung tâm thẩm định &amp; chuẩn hóa dữ liệu văn hóa
          </h1>

          <p className={HERO.subtitle}>
            Đảm bảo 100% dữ liệu lịch sử, tọa độ thực địa và nội dung trí tuệ nhân tạo đạt chuẩn mực văn hóa Việt Nam trước khi tiếp cận du khách.
          </p>

          <div className={`${HERO.rule} ${HERO.statusRow}`}>
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
              <span className={HERO.statusDot} />
              Hệ thống giám sát thẩm định: Sẵn sàng
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
              <span>⏱</span>
              Thời gian xử lý trung bình: &lt; 2 giờ
            </span>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          2. HÀNG 4 THẺ KPI KIỂM DUYỆT
      ──────────────────────────────────────────────────────── */}
      <section className={KPI.grid}>
        {kpiStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.id} className={KPI.card}>
              <div className={KPI.headerRow}>
                <p className={KPI.title}>{stat.title}</p>
                <div className={KPI.iconBox}>
                  <Icon size={18} strokeWidth={1.75} />
                </div>
              </div>

              <div>
                <div className="flex items-baseline">
                  <span className={KPI.value}>{stat.count}</span>
                  <span className={KPI.unit}>{stat.unit}</span>
                </div>
              </div>

              <div className={KPI.footerRow}>
                <span className="text-xs text-slate-500 truncate">{stat.trend}</span>
                <Link
                  href={stat.linkHref}
                  className={KPI.link}
                >
                  {stat.linkText}
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      {/* ────────────────────────────────────────────────────────
          3. KHỐI DANH SÁCH HÀNG CHỜ ƯU TIÊN
      ──────────────────────────────────────────────────────── */}
      <section id="queue" className={`${SURFACE.card} overflow-hidden`}>
        {/* Header khối */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Danh sách hàng chờ ưu tiên
              </h2>
              <span className={`${BADGE.base} ${BADGE.warning}`}>
                {filteredQueue.length} hồ sơ cần duyệt
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
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
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-400"
            >
              <option value="all">Tất cả loại hình</option>
              <option value="destination">Điểm đến và tọa độ</option>
              <option value="route">Lộ trình và vé</option>
              <option value="quiz">Thử thách đố vui</option>
              <option value="ai">Kiểm tra trí tuệ nhân tạo</option>
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
                      <p className="text-sm font-semibold text-slate-600">
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
                      <p className="font-semibold text-slate-900">
                        {item.title}
                      </p>
                    </td>
                    <td className={TABLE.td}>
                      <span
                        className={`${BADGE.base} ${
                          item.type === "destination"
                            ? BADGE.info
                            : item.type === "route"
                            ? BADGE.success
                            : item.type === "quiz"
                            ? BADGE.warning
                            : BADGE.purple
                        }`}
                      >
                        {item.type === "destination" && <MapPin size={11} />}
                        {item.type === "route" && <Compass size={11} />}
                        {item.type === "quiz" && <HelpCircle size={11} />}
                        {item.type === "ai" && <Bot size={11} />}
                        <span>{item.typeLabel || item.type}</span>
                      </span>
                    </td>
                    <td className={TABLE.td}>
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
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
            className="font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 transition-colors"
          >
            <span>Đến trang duyệt điểm đến và lộ trình</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
