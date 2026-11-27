"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, Eye, History, Search, Star } from "lucide-react";
import { PageHeader, KpiTile } from "@/components/dashboard/DashboardUI";
import { moderationService } from "@/features/destination";
import { tourReviewService } from "@/features/tourreviews";
import { formatDateTimeVN } from "@/lib/money";

/**
 * Nhật ký & lịch sử duyệt (MODERATOR / ADMIN).
 *
 * Nguồn dữ liệu:
 *  - GET /api/v1/moderation/destinations/status/{APPROVED|REJECTED}
 *  - GET /api/v1/moderation/tours/status/{APPROVED|REJECTED}
 *  - GET /api/v1/moderation/{destinations|tours}/{id}/history  (dòng thời gian chi tiết)
 */

const KINDS = {
  destination: {
    label: "Điểm đến",
    decisions: ["APPROVED", "REJECTED"],
    statusOf: (r) => r.status,
    load: () =>
      Promise.all([
        moderationService.getDestinationsByStatus("APPROVED", { page: 0, size: 200 }),
        moderationService.getDestinationsByStatus("REJECTED", { page: 0, size: 200 }),
      ]).then(([approved, rejected]) => [...contentOf(approved), ...contentOf(rejected)]),
    history: (id) => moderationService.getDestinationHistory(id),
    id: (r) => r.destinationId,
    name: (r) => r.destinationName,
  },
  tour: {
    label: "Tour",
    decisions: ["APPROVED", "REJECTED"],
    statusOf: (r) => r.status,
    load: () =>
      Promise.all([
        moderationService.getToursByModerationStatus("APPROVED", { page: 0, size: 200 }),
        moderationService.getToursByModerationStatus("REJECTED", { page: 0, size: 200 }),
      ]).then(([approved, rejected]) => [...contentOf(approved), ...contentOf(rejected)]),
    history: (id) => moderationService.getTourHistory(id),
    id: (r) => r.tourId,
    name: (r) => r.tourTitle,
  },
  // ── Lịch sử kiểm duyệt đánh giá tour (C4) ──────────────────────────────
  review: {
    label: "Đánh giá tour",
    decisions: ["HIDDEN", "RESTORED"],
    statusOf: (r) => r.action,
    load: () =>
      tourReviewService
        .listAllReviewHistory({ page: 0, size: 200 })
        .then((res) => contentOf(res)),
    history: (id) => tourReviewService.getReviewHistory(id),
    id: (r) => r.reviewId,
    name: (r) => r.tourTitle,
  },
};

const DECISIONS = {
  ALL: "Tất cả quyết định",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  HIDDEN: "Đã ẩn đánh giá",
  RESTORED: "Đã khôi phục đánh giá",
};

const STATUS_BADGE = {
  APPROVED: { label: "Đã duyệt", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Từ chối", cls: "bg-red-50 text-red-700 border-red-200" },
  PENDING: { label: "Chờ duyệt", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  DRAFT: { label: "Bản nháp", cls: "bg-slate-50 text-slate-600 border-slate-200" },
  HIDDEN: { label: "Đã ẩn đánh giá", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  RESTORED: { label: "Đã khôi phục", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const ACTION_LABEL = {
  SUBMITTED: "Gửi duyệt",
  APPROVED: "Duyệt",
  REJECTED: "Từ chối",
  HIDDEN: "Ẩn đánh giá",
  RESTORED: "Khôi phục đánh giá",
};

function contentOf(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.content) ? data.content : [];
}

function formatTime(value) {
  if (!value) return "—";
  return formatDateTimeVN(value) || "—";
}

export default function ModeratorHistoryPage() {
  const [kind, setKind] = useState("destination");
  const [decision, setDecision] = useState("ALL");
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [timeline, setTimeline] = useState(null);

  useEffect(() => {
    let active = true;
    const cfg = KINDS[kind];
    cfg.load()
      .then((list) => {
        if (!active) return;
        const sorted = [...list].sort(
          (a, b) => new Date(b.reviewedAt ?? b.createdAt ?? 0) - new Date(a.reviewedAt ?? a.createdAt ?? 0),
        );
        setRecords(sorted);
        setError("");
      })
      .catch((err) => active && setError(err?.message || "Không tải được lịch sử duyệt."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [kind]);

  const visible = useMemo(() => {
    const cfg = KINDS[kind];
    const q = search.trim().toLowerCase();
    return records.filter(
      (r) =>
        (decision === "ALL" || cfg.statusOf(r) === decision) &&
        (!q ||
          (cfg.name(r) ?? "").toLowerCase().includes(q) ||
          (r.reviewerName ?? r.actorName ?? "").toLowerCase().includes(q)),
    );
  }, [records, decision, search, kind]);

  function switchKind(next) {
    if (next === kind) return;
    setLoading(true);
    setSelected(null);
    setTimeline(null);
    setKind(next);
  }

  async function open(record) {
    setSelected(record);
    setTimeline(record.history ?? null);
    if (record.history) return;
    try {
      const data = await KINDS[kind].history(KINDS[kind].id(record));
      const raw = data?.data ?? data;
      setTimeline(Array.isArray(raw) ? raw : (raw?.history ?? []));
    } catch {
      setTimeline([]);
    }
  }

  const cfg = KINDS[kind];
  const approvedCount = records.filter((r) => cfg.statusOf(r) === "APPROVED").length;
  const rejectedCount = records.filter((r) => cfg.statusOf(r) === "REJECTED").length;
  const hiddenCount = records.filter((r) => cfg.statusOf(r) === "HIDDEN").length;

  const decisionOptions = [
    { key: "ALL", label: DECISIONS.ALL },
    ...cfg.decisions.map((d) => ({ key: d, label: DECISIONS[d] })),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nhật ký & lịch sử duyệt"
        description="Các quyết định duyệt / từ chối điểm đến và tour, kèm dòng thời gian của từng hồ sơ."
      />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiTile
          icon={History}
          label={`Quyết định về ${cfg.label.toLowerCase()}`}
          value={records.length}
          unit="hồ sơ"
          tone="slate"
        />
        <KpiTile icon={CheckCircle2} label="Đã duyệt" value={approvedCount} unit="hồ sơ" tone="emerald" />
        <KpiTile icon={Ban} label="Bị từ chối" value={rejectedCount} unit="hồ sơ" tone="rose" />
        {kind === "review" && (
          <KpiTile icon={Star} label="Đánh giá đã bị ẩn" value={hiddenCount} unit="đánh giá" tone="rose" />
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {Object.entries(KINDS).map(([key, value]) => (
            <button
              key={key}
              onClick={() => switchKind(key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${
                kind === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {value.label}
            </button>
          ))}
        </div>
        <select
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {decisionOptions.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <label className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Tìm theo tên ${cfg.label.toLowerCase()} hoặc người duyệt`}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className={`overflow-x-auto rounded-2xl border border-slate-200 bg-white ${loading ? "opacity-60" : ""}`}>
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">{cfg.label}</th>
                <th className="px-4 py-3">Quyết định</th>
                <th className="px-4 py-3">Người duyệt</th>
                <th className="px-4 py-3">Thời điểm</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((r) => {
                const status = cfg.statusOf(r);
                const badge = STATUS_BADGE[status] ?? STATUS_BADGE.DRAFT;
                const isSelected = selected === r;
                return (
                  <tr
                    key={r.reviewId ?? cfg.id(r)}
                    onClick={() => open(r)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-teal-50/60" : "hover:bg-slate-50/70"
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">{cfg.name(r) || `#${cfg.id(r)}`}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.reviewerName || r.actorName || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 tabular-nums">{formatTime(r.reviewedAt ?? r.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          open(r);
                        }}
                        className={`group/btn inline-flex h-8 min-w-[118px] items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "border-teal-600 bg-teal-600 text-white shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-teal-300 hover:bg-teal-50/70 hover:text-teal-800"
                        }`}
                      >
                        <Eye
                          size={14}
                          className={`shrink-0 transition-colors ${
                            isSelected ? "text-white" : "text-slate-400 group-hover/btn:text-teal-700"
                          }`}
                        />
                        <span>{isSelected ? "Đang xem" : "Xem lịch sử"}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    Chưa có quyết định nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 text-sm">
          {selected ? (
            <>
              <h2 className="font-bold text-slate-900">{cfg.name(selected)}</h2>
              <p className="mt-1 text-xs text-slate-500">
                Gửi duyệt: {formatTime(selected.submittedAt)} · Quyết định: {formatTime(selected.reviewedAt)}
              </p>
              {(selected.reason || selected.otherReason || selected.decisionNote) && (
                <div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3 text-slate-700">
                  {selected.reason && <p>Lý do: {selected.reason}</p>}
                  {selected.otherReason && <p>Lý do khác: {selected.otherReason}</p>}
                  {selected.decisionNote && <p>Ghi chú: {selected.decisionNote}</p>}
                </div>
              )}
              <h3 className="mt-4 text-xs font-bold text-slate-500">Dòng thời gian</h3>
              {timeline === null ? (
                <p className="mt-2 text-slate-500">Đang tải...</p>
              ) : timeline.length === 0 ? (
                <p className="mt-2 text-slate-500">Không có bản ghi lịch sử.</p>
              ) : (
                <ol className="mt-3 space-y-3 border-l-2 border-slate-200 pl-4">
                  {[...timeline]
                    .sort((a, b) => new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0))
                    .map((h, i) => (
                      <li key={i} className="relative">
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-slate-400" />
                        <p className="font-semibold text-slate-800">
                          {ACTION_LABEL[h.action] ?? h.action}
                          {h.actorName ? ` · ${h.actorName}` : ""}
                        </p>
                        <p className="text-xs text-slate-500">{formatTime(h.createdAt)}</p>
                        {(h.reason || h.otherReason || h.note) && (
                          <p className="mt-1 text-xs text-slate-600">
                            {[h.reason, h.otherReason, h.note].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </li>
                    ))}
                </ol>
              )}
            </>
          ) : (
            <div className="py-6 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <History size={18} />
              </div>
              <p className="font-semibold text-slate-700">Chưa chọn hồ sơ</p>
              <p className="text-xs text-slate-500">Bấm nút &ldquo;Xem lịch sử&rdquo; ở bảng bên trái để xem chi tiết dòng thời gian duyệt.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
