"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, History, Search } from "lucide-react";
import { PageHeader, KpiTile } from "@/components/dashboard/DashboardUI";
import { moderationService } from "@/features/destination";

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
    byStatus: (status) => moderationService.getDestinationsByStatus(status, { page: 0, size: 200 }),
    history: (id) => moderationService.getDestinationHistory(id),
    id: (r) => r.destinationId,
    name: (r) => r.destinationName,
  },
  tour: {
    label: "Tour",
    byStatus: (status) => moderationService.getToursByModerationStatus(status, { page: 0, size: 200 }),
    history: (id) => moderationService.getTourHistory(id),
    id: (r) => r.tourId,
    name: (r) => r.tourTitle,
  },
};

const DECISIONS = {
  ALL: "Tất cả quyết định",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
};

const STATUS_BADGE = {
  APPROVED: { label: "Đã duyệt", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Từ chối", cls: "bg-red-50 text-red-700 border-red-200" },
  PENDING: { label: "Chờ duyệt", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  DRAFT: { label: "Bản nháp", cls: "bg-slate-50 text-slate-600 border-slate-200" },
};

const ACTION_LABEL = { SUBMITTED: "Gửi duyệt", APPROVED: "Duyệt", REJECTED: "Từ chối" };

function contentOf(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.content) ? data.content : [];
}

function formatTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("vi-VN", { hour12: false });
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
    Promise.all([cfg.byStatus("APPROVED"), cfg.byStatus("REJECTED")])
      .then(([approved, rejected]) => {
        if (!active) return;
        const list = [...contentOf(approved), ...contentOf(rejected)].sort(
          (a, b) => new Date(b.reviewedAt ?? 0) - new Date(a.reviewedAt ?? 0),
        );
        setRecords(list);
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
        (decision === "ALL" || r.status === decision) &&
        (!q || (cfg.name(r) ?? "").toLowerCase().includes(q) || (r.reviewerName ?? "").toLowerCase().includes(q)),
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
      setTimeline((data?.data ?? data)?.history ?? []);
    } catch {
      setTimeline([]);
    }
  }

  const cfg = KINDS[kind];
  const approvedCount = records.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = records.filter((r) => r.status === "REJECTED").length;

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
          {Object.entries(DECISIONS).map(([key, label]) => (
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
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">{cfg.label}</th>
                <th className="px-4 py-3">Quyết định</th>
                <th className="px-4 py-3">Người duyệt</th>
                <th className="px-4 py-3">Thời điểm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((r) => {
                const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.DRAFT;
                return (
                  <tr
                    key={r.reviewId ?? cfg.id(r)}
                    onClick={() => open(r)}
                    className={`cursor-pointer hover:bg-slate-50 ${selected === r ? "bg-blue-50" : ""}`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">{cfg.name(r) || `#${cfg.id(r)}`}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.reviewerName || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{formatTime(r.reviewedAt)}</td>
                  </tr>
                );
              })}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
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
              <h3 className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Dòng thời gian</h3>
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
            <p className="text-slate-500">Chọn một hồ sơ để xem dòng thời gian duyệt.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
